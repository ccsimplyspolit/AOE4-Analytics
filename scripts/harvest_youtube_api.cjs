/**
 * Refresh civ video evidence via YouTube Data API v3 (encrypted RTSLytics key).
 * Discovers guides + ranked/demo VODs, tries public timedtext captions, writes
 * src/data/videoEvidence.generated.ts and fills empty build.video fields.
 */
const { app, safeStorage } = require('electron')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const { spawnSync } = require('node:child_process')
const { resolveNeoDlpHome, ytdlpArgs, ensurePotServer } = require('./neodlpToolchain.cjs')

const ROOT = path.join(__dirname, '..')
const USER_DATA = 'C:\\Users\\sshunko\\AppData\\Roaming\\rtslytics'
const GENERATED = path.join(ROOT, 'src', 'data', 'videoEvidence.generated.ts')
const RESEARCH = path.join(ROOT, 'data', 'research', 'aoe4-video-evidence.json')
const RAW_DIR = path.join(ROOT, 'data', 'research', 'raw-transcripts')
const ACTIVE_DIR = path.join(ROOT, 'src', 'data', 'activeBuildOrders')

const CIVS = [
  { slug: 'abbasid_dynasty', compact: 'abbasiddynasty', alias: 'Abbasid Dynasty', code: 'abb' },
  { slug: 'ayyubids', compact: 'ayyubids', alias: 'Ayyubids', code: 'ayy' },
  { slug: 'byzantines', compact: 'byzantines', alias: 'Byzantines', code: 'byz' },
  { slug: 'chinese', compact: 'chinese', alias: 'Chinese', code: 'chi' },
  { slug: 'delhi_sultanate', compact: 'delhisultanate', alias: 'Delhi Sultanate', code: 'del' },
  { slug: 'english', compact: 'english', alias: 'English', code: 'eng' },
  { slug: 'french', compact: 'french', alias: 'French', code: 'fre' },
  { slug: 'golden_horde', compact: 'goldenhorde', alias: 'Golden Horde', code: 'goh' },
  { slug: 'house_of_lancaster', compact: 'houseoflancaster', alias: 'House of Lancaster', code: 'hol' },
  { slug: 'holy_roman_empire', compact: 'holyromanempire', alias: 'Holy Roman Empire', code: 'hre' },
  { slug: 'japanese', compact: 'japanese', alias: 'Japanese', code: 'jap' },
  { slug: 'jeanne_darc', compact: 'jeannedarc', alias: "Jeanne d'Arc", code: 'jea' },
  { slug: 'jin_dynasty', compact: 'jindynasty', alias: 'Jin Dynasty', code: 'jin' },
  { slug: 'knights_templar', compact: 'knightstemplar', alias: 'Knights Templar', code: 'kte' },
  { slug: 'malians', compact: 'malians', alias: 'Malians', code: 'mal' },
  { slug: 'macedonian_dynasty', compact: 'macedoniandynasty', alias: 'Macedonian Dynasty', code: 'mac' },
  { slug: 'mongols', compact: 'mongols', alias: 'Mongols', code: 'mon' },
  { slug: 'order_of_the_dragon', compact: 'orderofthedragon', alias: 'Order of the Dragon', code: 'otd' },
  { slug: 'ottomans', compact: 'ottomans', alias: 'Ottomans', code: 'ott' },
  { slug: 'rus', compact: 'rus', alias: 'Rus', code: 'rus' },
  { slug: 'sengoku_daimyo', compact: 'sengokudaimyo', alias: 'Sengoku Daimyo', code: 'sen' },
  { slug: 'tughlaq_dynasty', compact: 'tughlaqdynasty', alias: 'Tughlaq Dynasty', code: 'tug' },
  { slug: 'zhu_xis_legacy', compact: 'zhuxislegacy', alias: "Zhu Xi's Legacy", code: 'zxl' },
]

const ACTION_PATTERNS = [
  ['2TC', /\b2\s*tc\b|second town center|second tc/i],
  ['Fast Castle', /fast castle|quick castle|age up to castle/i],
  ['Feudal aggression', /feudal (?:rush|aggression|pressure)|early pressure/i],
  ['Knight/Raid', /knight rush|cavalry rush|raiding|\braid\b/i],
  ['Trade', /\btrade\b|market boom/i],
  ['Defensive', /defensive|tower rush|\bwall/i],
  ['Boom', /\bboom\b|economic boom|eco build/i],
  ['All-in', /all[- ]in|one base/i],
]
const RESOURCE_PATTERNS = [
  ['food', /\bfood\b|sheep|farms?|berries/i],
  ['wood', /\bwood\b|lumber/i],
  ['gold', /\bgold\b|mining camp/i],
  ['stone', /\bstone\b/i],
]
const TOPIC_PATTERNS = [
  ['Age-up', /age ?up|feudal|castle age|imperial age/i],
  ['Opening military', /opening|barracks?|stable|archery range|horsemen?|spearmen?/i],
  ['Economy', /eco(?:nomy)?|villagers?|boom|2\s*tc|farms?/i],
  ['Scouting', /scout(?:ing)?/i],
  ['Map control', /map control|outpost|sacred site|relic/i],
  ['Technology', /blacksmith|upgrade|wheelbarrow/i],
  ['Counterplay', /counter|vs\.?|matchup/i],
]
const MILITARY_PATTERNS = [
  ['Archer', /\barchers?\b|\blongbow/i],
  ['Spearman', /\bspearmen?\b/i],
  ['Horseman', /\bhorsemen?\b|\bcavalry\b/i],
  ['Knight', /\bknights?\b/i],
  ['Man-at-Arms', /man[- ]at[- ]arms/i],
  ['Siege', /\bsiege\b|mangonel|trebuchet|springald/i],
]

app.setName('rtslytics')
app.setPath('userData', USER_DATA)

function compact(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
}

function sourceKind(title) {
  if (/\b(how to play|build order|masterclass|guide)\b/i.test(title)) return 'guide'
  if (/\b(ranked|gameplay|replay|cast|vs\.?|demo)\b/i.test(title)) return 'demo'
  return 'other'
}

function titleBelongs(title, civ) {
  const how = /how to play(?: the)?\s+(.+?)(?:\s+like a pro|\s+[-–—]|\s+masterclass|\s+build|\s+guide|\s+in\b|$)/i.exec(
    title,
  )
  const hay = how?.[1] || title
  const hit = CIVS.find((item) => compact(hay).includes(item.compact) || new RegExp(`(?<![a-z0-9])${item.alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![a-z0-9])`, 'i').test(hay))
  if (hit) return hit.slug === civ.slug
  return new RegExp(`(?<![a-z0-9])${civ.alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![a-z0-9])`, 'i').test(title)
}

function hits(patterns, text) {
  return patterns.filter(([, re]) => re.test(text)).map(([label]) => label)
}

function extractTimestamps(text) {
  const counts = new Map()
  const re = /(?<!\d)(?:(\d{1,2}):)?(\d{1,2}):(\d{2})(?!\d)/g
  let match
  while ((match = re.exec(text))) {
    const sec = (match[1] ? Number(match[1]) : 0) * 3600 + Number(match[2]) * 60 + Number(match[3])
    counts.set(sec, (counts.get(sec) || 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => a[0] - b[0])
    .slice(0, 10)
    .map(([timeSec, mentions]) => ({
      label: `${Math.floor(timeSec / 60)}:${String(timeSec % 60).padStart(2, '0')}`,
      timeSec,
      mentions,
    }))
}

function deriveSignals(title, description, transcript, civ) {
  const text = `${title}\n${description}\n${transcript}`.toLowerCase()
  const actions = hits(ACTION_PATTERNS, text)
  const opponentCivs = CIVS.filter(
    (item) => item.slug !== civ.slug && new RegExp(`(?<![a-z0-9])${item.alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![a-z0-9])`, 'i').test(text),
  ).map((item) => item.alias)
  const transcriptBonus = transcript ? Math.min(0.35, transcript.split(/\s+/).length / 4000) : 0
  return {
    archetype: actions[0] || null,
    actions: actions.slice(0, 5),
    resources: hits(RESOURCE_PATTERNS, text).slice(0, 4),
    topics: hits(TOPIC_PATTERNS, text).slice(0, 6),
    opponentCivs: opponentCivs.slice(0, 6),
    militaryMentions: hits(MILITARY_PATTERNS, text).slice(0, 8),
    timings: extractTimestamps(`${description}\n${transcript}`),
    confidence: Math.round(Math.min(0.95, 0.35 + (title ? 0.12 : 0) + (description ? 0.18 : 0) + transcriptBonus) * 100) / 100,
  }
}

function parseVtt(raw) {
  const cues = []
  const blocks = raw.replace(/\r/g, '').split('\n\n')
  for (const block of blocks) {
    const time = /(\d{2}):(\d{2}):(\d{2})\.(\d{3})\s+-->/.exec(block)
    if (!time) continue
    const timeSec = Number(time[1]) * 3600 + Number(time[2]) * 60 + Number(time[3])
    const text = block
      .split('\n')
      .filter((line) => line && !line.includes('-->') && !/^\d+$/.test(line) && line !== 'WEBVTT')
      .join(' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    if (text) cues.push({ timeSec, text })
  }
  return cues
}

function checkpointsFromCues(cues) {
  const marks = [0, 240, 270, 330, 390, 480, 600]
  return marks.flatMap((mark) => {
    const cue = cues.find((item) => item.timeSec >= mark && item.timeSec <= mark + 25)
    return cue ? [{ timeSec: cue.timeSec, label: `${Math.floor(mark / 60)}:${String(mark % 60).padStart(2, '0')}`, quote: cue.text.slice(0, 180) }] : []
  })
}

async function timedtext(id) {
  const urls = [
    `https://www.youtube.com/api/timedtext?v=${id}&lang=en&fmt=vtt`,
    `https://www.youtube.com/api/timedtext?v=${id}&lang=en&kind=asr&fmt=vtt`,
  ]
  for (const url of urls) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 RTSLyticsHarvest' } })
      if (!res.ok) continue
      const body = await res.text()
      if (body.includes('-->')) return parseVtt(body)
    } catch {
      /* next */
    }
  }
  return neodlpCaptions(id)
}

async function neodlpCaptions(id) {
  const home = resolveNeoDlpHome()
  if (!home) return []
  await ensurePotServer(home)
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'neodlp-subs-'))
  spawnSync(
    path.join(home, 'yt-dlp.exe'),
    [
      ...ytdlpArgs(home),
      '--skip-download',
      '--write-subs',
      '--write-auto-subs',
      '--sub-langs',
      'en.*,ru.*',
      '--sub-format',
      'vtt',
      '--no-warnings',
      '--output',
      path.join(dir, '%(id)s.%(ext)s'),
      `https://www.youtube.com/watch?v=${id}`,
    ],
    { timeout: 45_000, windowsHide: true, cwd: home },
  )
  const captionFile = fs.readdirSync(dir).find((file) => /\.vtt$/i.test(file))
  if (!captionFile) return []
  return parseVtt(fs.readFileSync(path.join(dir, captionFile), 'utf8'))
}

function loadApiKey() {
  const cfg = JSON.parse(fs.readFileSync(path.join(USER_DATA, 'external-api-config.json'), 'utf8'))
  return safeStorage.decryptString(Buffer.from(cfg.encryptedYoutubeApiKey, 'base64'))
}

async function youtube(pathname, params, key) {
  const qs = new URLSearchParams({ ...params, key })
  const res = await fetch(`https://www.googleapis.com/youtube/v3/${pathname}?${qs}`)
  const json = await res.json()
  if (json.error) throw new Error(`${pathname} ${json.error.code}: ${json.error.message}`)
  return json
}

function catalogGuideIds() {
  const text = fs.readFileSync(path.join(ROOT, 'src', 'data', 'beastyCatalog.generated.ts'), 'utf8')
  const ids = new Set()
  const re = /"id": "([^"]+)"[\s\S]*?"title": "([^"]+)"[\s\S]*?"primaryCivs": \[([^\]]*)\]/g
  let match
  while ((match = re.exec(text))) {
    const [, id, title, civs] = match
    if (!/\b(how to play|build order|masterclass)\b/i.test(title)) continue
    if (!civs.replace(/["\s]/g, '')) continue
    ids.add(id)
  }
  return [...ids].slice(0, 80)
}

function top(map, limit) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([label]) => label)
}

function assemble(sources, limit) {
  const actions = new Map()
  const resources = new Map()
  const topics = new Map()
  const opponents = new Map()
  const military = new Map()
  const timings = new Map()
  const bump = (map, values) => {
    for (const value of values) map.set(value, (map.get(value) || 0) + 1)
  }
  for (const source of sources) {
    bump(actions, source.signals.actions)
    bump(resources, source.signals.resources)
    bump(topics, source.signals.topics)
    bump(opponents, source.signals.opponentCivs)
    bump(military, source.signals.militaryMentions)
    for (const timing of source.signals.timings) {
      const current = timings.get(timing.label)
      timings.set(timing.label, {
        label: timing.label,
        timeSec: timing.timeSec,
        mentions: (current?.mentions || 0) + timing.mentions,
      })
    }
  }
  const dates = sources.map((source) => source.publishedAt).sort()
  return {
    schemaVersion: 1,
    windowStart: (dates[0] || '2025-01-01').slice(0, 10),
    windowEnd: (dates.at(-1) || new Date().toISOString()).slice(0, 10),
    sampleSize: sources.length,
    requestedSampleSize: limit,
    coverageNote: `${sources.length} YouTube Data API videos (guides + demos) whose titles teach this civilization`,
    commonActions: top(actions, 5),
    commonResources: top(resources, 4),
    commonTopics: top(topics, 6),
    commonOpponents: top(opponents, 8),
    commonMilitaryMentions: top(military, 8),
    timingSignals: [...timings.values()].sort((a, b) => a.timeSec - b.timeSec).slice(0, 8),
    sources,
  }
}

function fillEmptyBuildVideos(bestUrlByCode) {
  let patched = 0
  for (const file of fs.readdirSync(ACTIVE_DIR).filter((name) => name.endsWith('.json'))) {
    const full = path.join(ACTIVE_DIR, file)
    const build = JSON.parse(fs.readFileSync(full, 'utf8'))
    if (build.video) continue
    const code = file.split('-').find((part) => bestUrlByCode[part])
    const url = code ? bestUrlByCode[code] : null
    if (!url) continue
    build.video = url
    fs.writeFileSync(full, `${JSON.stringify(build, null, 2)}\n`, 'utf8')
    patched += 1
  }
  return patched
}

app.whenReady().then(async () => {
  const summary = { civs: 0, videos: 0, transcripts: 0, patchedBuilds: 0, errors: [] }
  try {
    if (!safeStorage.isEncryptionAvailable()) throw new Error('safeStorage unavailable')
    const key = loadApiKey()
    fs.mkdirSync(RAW_DIR, { recursive: true })

    const found = new Map()
    for (const civ of CIVS) {
      try {
        const search = await youtube(
          'search',
          {
            part: 'snippet',
            type: 'video',
            maxResults: '8',
            q: `Age of Empires 4 ${civ.alias} build order`,
            order: 'relevance',
          },
          key,
        )
        for (const item of search.items || []) {
          const id = item.id?.videoId
          if (!id) continue
          const title = item.snippet?.title || ''
          if (!titleBelongs(title, civ)) continue
          found.set(`${civ.slug}:${id}`, { civ, id, title, kind: 'guide' })
        }
        const demos = await youtube(
          'search',
          {
            part: 'snippet',
            type: 'video',
            maxResults: '5',
            q: `AoE4 ${civ.alias} ranked gameplay`,
            order: 'date',
          },
          key,
        )
        for (const item of demos.items || []) {
          const id = item.id?.videoId
          if (!id) continue
          const title = item.snippet?.title || ''
          if (!titleBelongs(title, civ)) continue
          found.set(`${civ.slug}:${id}`, { civ, id, title, kind: 'demo' })
        }
      } catch (err) {
        summary.errors.push(`${civ.slug}: ${err.message}`)
      }
    }

    for (const id of catalogGuideIds()) {
      found.set(`catalog:${id}`, { civ: null, id, title: '', kind: 'guide' })
    }

    const uniqueIds = [...new Set([...found.values()].map((row) => row.id))]
    const details = new Map()
    for (let i = 0; i < uniqueIds.length; i += 40) {
      const chunk = uniqueIds.slice(i, i + 40)
      const payload = await youtube(
        'videos',
        { part: 'snippet,contentDetails,statistics', id: chunk.join(',') },
        key,
      )
      for (const item of payload.items || []) details.set(item.id, item)
    }

    const byCiv = new Map(CIVS.map((civ) => [civ.slug, []]))
    let captionBudget = 40
    for (const row of found.values()) {
      const item = details.get(row.id)
      if (!item) continue
      const title = item.snippet?.title || row.title
      const description = item.snippet?.description || ''
      const civ =
        row.civ ||
        CIVS.find((candidate) => titleBelongs(title, candidate))
      if (!civ || !titleBelongs(title, civ)) continue
      const cachePath = path.join(RAW_DIR, `${row.id}.txt`)
      let cues = []
      if (fs.existsSync(cachePath) && fs.statSync(cachePath).size > 40) {
        const cached = fs.readFileSync(cachePath, 'utf8')
        cues = cached.split('\n').flatMap((line) => {
          const match = /^\[(\d+)s\]\s+(.*)$/.exec(line)
          return match ? [{ timeSec: Number(match[1]), text: match[2] }] : []
        })
      } else if (captionBudget > 0) {
        captionBudget -= 1
        cues = await timedtext(row.id)
        if (cues.length) {
          fs.writeFileSync(
            cachePath,
            cues.map((cue) => `[${cue.timeSec}s] ${cue.text}`).join('\n'),
            'utf8',
          )
        }
      }
      const transcript = cues.map((cue) => cue.text).join(' ')
      if (transcript) summary.transcripts += 1
      const source = {
        id: row.id,
        title,
        url: `https://www.youtube.com/watch?v=${row.id}`,
        channel: item.snippet?.channelTitle || null,
        publishedAt: item.snippet?.publishedAt || new Date().toISOString(),
        viewCount: item.statistics?.viewCount ? Number(item.statistics.viewCount) : null,
        transcriptLanguage: cues.length ? 'en' : null,
        transcriptSource: cues.length ? 'auto' : 'none',
        transcriptProvider: cues.length ? 'timedtext' : 'none',
        transcriptStatus: cues.length ? 'available' : 'missing',
        transcriptWordCount: transcript ? transcript.split(/\s+/).length : 0,
        transcriptExcerpt: transcript ? transcript.slice(0, 280) : undefined,
        sourceKind: sourceKind(title),
        frameCheckpoints: checkpointsFromCues(cues),
        signals: deriveSignals(title, description.slice(0, 1200), transcript, civ),
      }
      byCiv.get(civ.slug).push(source)
    }

    const evidence = {}
    const bestUrlByCode = {}
    for (const civ of CIVS) {
      const ranked = (byCiv.get(civ.slug) || [])
        .sort((left, right) => {
          const guide = (source) => (source.sourceKind === 'guide' ? 1 : 0)
          return guide(right) - guide(left) || (right.viewCount || 0) - (left.viewCount || 0)
        })
        .filter((source, index, list) => list.findIndex((item) => item.id === source.id) === index)
        .slice(0, 8)
      if (!ranked.length) continue
      evidence[civ.compact] = assemble(ranked, 8)
      const guide = ranked.find((source) => source.sourceKind === 'guide') || ranked[0]
      bestUrlByCode[civ.code] = guide.url
      summary.civs += 1
      summary.videos += ranked.length
    }

    fs.writeFileSync(
      RESEARCH,
      JSON.stringify(
        {
          schemaVersion: 2,
          generatedAt: new Date().toISOString(),
          source: 'youtube.data.v3',
          requestedPerCiv: 8,
          civs: Object.fromEntries(CIVS.filter((civ) => evidence[civ.compact]).map((civ) => [civ.slug, evidence[civ.compact]])),
        },
        null,
        2,
      ),
      'utf8',
    )
    fs.writeFileSync(
      GENERATED,
      `import type { BuildOrderVideoEvidence } from '@domain/videoEvidence'\n\n/** Generated by scripts/harvest_youtube_api.cjs; do not edit by hand. */\nexport const VIDEO_EVIDENCE_BY_CIV: Record<string, BuildOrderVideoEvidence> = ${JSON.stringify(evidence, null, 2)} as Record<string, BuildOrderVideoEvidence>\n`,
      'utf8',
    )
    summary.patchedBuilds = fillEmptyBuildVideos(bestUrlByCode)
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`)
  } catch (err) {
    process.stderr.write(String(err && err.stack ? err.stack : err))
    process.exitCode = 1
  } finally {
    app.quit()
  }
})
