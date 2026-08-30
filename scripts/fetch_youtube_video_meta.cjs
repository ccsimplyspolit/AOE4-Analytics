/**
 * Decrypt the saved YouTube Data API key via Electron safeStorage
 * and fetch video metadata (snippet/chapters). Does not print the key.
 */
const { app, safeStorage } = require('electron')
const fs = require('node:fs')
const path = require('node:path')

const USER_DATA = 'C:\\Users\\sshunko\\AppData\\Roaming\\rtslytics'
const VIDEO_IDS = ['GIErhV3Eeys', 'PeZYWFhGr3w', 'vrH85EESrSY', 'FdJFDsXr4ws']
const OUT_DIR = path.join(__dirname, '..', 'data', 'research', 'video-align')

app.setName('rtslytics')
app.setPath('userData', USER_DATA)

function parseChapters(description) {
  const chapters = []
  const re = /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s+(.+)$/gm
  let m
  while ((m = re.exec(description || ''))) {
    const hasHours = m[3] != null
    const h = hasHours ? Number(m[1]) : 0
    const min = hasHours ? Number(m[2]) : Number(m[1])
    const sec = hasHours ? Number(m[3]) : Number(m[2])
    chapters.push({
      timeSec: h * 3600 + min * 60 + sec,
      title: m[4].trim(),
    })
  }
  return chapters
}

app.whenReady().then(async () => {
  try {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('safeStorage unavailable')
    }
    const cfgPath = path.join(USER_DATA, 'external-api-config.json')
    let cfg = { encryptedTwitchClientId: null, encryptedTwitchClientSecret: null, encryptedYoutubeApiKey: null }
    try {
      cfg = { ...cfg, ...JSON.parse(fs.readFileSync(cfgPath, 'utf8')) }
    } catch {
      /* first run */
    }
    const incoming = (process.env.RTSLYTICS_YOUTUBE_API_KEY || process.env.YOUTUBE_API_KEY || '').trim()
    if (incoming) {
      cfg.encryptedYoutubeApiKey = safeStorage.encryptString(incoming).toString('base64')
      fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2), 'utf8')
    }
    if (!cfg.encryptedYoutubeApiKey) throw new Error('No YouTube API key in settings or environment')
    const apiKey = safeStorage.decryptString(Buffer.from(cfg.encryptedYoutubeApiKey, 'base64'))
    if (!apiKey) throw new Error('YouTube API key decrypt returned empty')

    fs.mkdirSync(OUT_DIR, { recursive: true })

    const key = apiKey
    async function callYoutube(pathname, params, headers) {
      const qs = new URLSearchParams({ ...params, key })
      const res = await fetch(`https://www.googleapis.com/youtube/v3/${pathname}?${qs}`, {
        headers: { Accept: 'application/json', ...(headers || {}) },
      })
      const json = await res.json()
      if (json.error) {
        return {
          ok: false,
          http: res.status,
          code: json.error.code,
          message: json.error.message,
          reasons: (json.error.errors || []).map((e) => e.reason),
        }
      }
      return { ok: true, http: res.status, itemCount: (json.items || []).length, json }
    }

    const probes = {}
    probes.videos = await callYoutube('videos', {
      part: 'snippet,contentDetails,statistics',
      id: VIDEO_IDS.join(','),
    })
    probes.channels = await callYoutube('channels', {
      part: 'snippet,contentDetails',
      forHandle: '@BeastyqtSC2',
    })
    probes.captions = await callYoutube('captions', {
      part: 'snippet',
      videoId: VIDEO_IDS[0],
    })

    const probePath = path.join(OUT_DIR, 'youtube-api-probe.json')
    fs.writeFileSync(
      probePath,
      JSON.stringify(
        Object.fromEntries(
          Object.entries(probes).map(([name, result]) => [
            name,
            result.ok
              ? { ok: true, http: result.http, itemCount: result.itemCount }
              : { ok: false, http: result.http, code: result.code, message: result.message, reasons: result.reasons },
          ]),
        ),
        null,
        2,
      ),
      'utf8',
    )

    const videosJson = probes.videos.ok ? probes.videos.json : { items: [] }
    if (!probes.videos.ok) {
      throw new Error(
        `YouTube Data API blocked. Probe saved to ${probePath}: ${JSON.stringify(JSON.parse(fs.readFileSync(probePath, 'utf8')))}`,
      )
    }

    const items = videosJson.items || []
    const summarized = items.map((item) => {
      const snippet = item.snippet || {}
      const stats = item.statistics || {}
      const details = item.contentDetails || {}
      return {
        id: item.id,
        title: snippet.title,
        channelTitle: snippet.channelTitle,
        publishedAt: snippet.publishedAt,
        duration: details.duration,
        viewCount: stats.viewCount ? Number(stats.viewCount) : null,
        likeCount: stats.likeCount ? Number(stats.likeCount) : null,
        commentCount: stats.commentCount ? Number(stats.commentCount) : null,
        description: snippet.description || '',
        chapters: parseChapters(snippet.description || ''),
        tags: snippet.tags || [],
      }
    })

    const captions = {}
    for (const id of VIDEO_IDS) {
      const capParams = new URLSearchParams({
        part: 'snippet',
        videoId: id,
        key: apiKey,
      })
      const capRes = await fetch(`https://www.googleapis.com/youtube/v3/captions?${capParams}`)
      const capJson = await capRes.json()
      captions[id] = capJson.error
        ? { ok: false, code: capJson.error.code, message: capJson.error.message }
        : { ok: true, items: capJson.items || [] }
    }

    const out = {
      fetchedAt: new Date().toISOString(),
      source: 'youtube.data.v3',
      videoCount: summarized.length,
      videos: summarized,
      captions,
      note:
        'Caption download requires OAuth (captions.download). API key can list tracks only if the request is authorized; metadata/chapters come from videos.list snippet.',
    }
    const outPath = path.join(OUT_DIR, 'youtube-api-videos.json')
    fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8')
    process.stdout.write(
      JSON.stringify(
        {
          ok: true,
          outPath,
          videos: summarized.map((v) => ({
            id: v.id,
            title: v.title,
            channelTitle: v.channelTitle,
            duration: v.duration,
            viewCount: v.viewCount,
            chapterCount: v.chapters.length,
            descriptionChars: v.description.length,
          })),
          captions: Object.fromEntries(
            Object.entries(captions).map(([id, c]) => [
              id,
              c.ok ? { ok: true, trackCount: c.items.length } : { ok: false, code: c.code, message: c.message },
            ]),
          ),
        },
        null,
        2,
      ),
    )
  } catch (err) {
    process.stderr.write(String(err && err.stack ? err.stack : err))
    process.exitCode = 1
  } finally {
    app.quit()
  }
})
