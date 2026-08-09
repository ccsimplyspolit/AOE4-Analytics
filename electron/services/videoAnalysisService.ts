import { spawn } from 'node:child_process'
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { REQUEST_TIMEOUT_MS, USER_AGENT } from '@api/client'
import { fetchWithTimeout } from '@api/fetchWithTimeout'
import type { BuildOrder, BuildStep } from '@domain/buildOrderSchema'
import type {
  VideoAnalysisInput,
  VideoAnalysisRecord,
  VideoProvider,
  VideoTranscriptProvider,
} from '@domain/videoAnalysis'
import type {
  VideoAnalysisSignals,
  VideoTactic,
  VideoTimingSignal,
  VideoTranscriptSegment,
} from '@domain/videoEvidence'
import type { IpcResult } from '@ipc/contract'
import { err, ok } from './result'
import { saveVideoAnalysis } from './videoAnalysisStore'
import { getTwitchApiHeaders, getYouTubeApiKey } from './externalApiService'

type CaptionTrack = {
  baseUrl: string
  languageCode?: string
  kind?: string
}

type VideoMeta = {
  provider: VideoProvider
  id: string
  url: string
  title: string
  channel: string | null
  description: string
  publishedAt: string | null
  transcriptLanguage: string | null
  viewCount: number | null
}

type CaptionResult = {
  segments: VideoTranscriptSegment[]
  language: string | null
  provider: VideoTranscriptProvider
  status: VideoAnalysisRecord['transcriptStatus']
}

const MAX_TRANSCRIPT_CHARS = 160_000
const MAX_STEPS = 28
const MAX_TACTICS = 12

const ACTIONS: {
  id: string
  title: string
  category: VideoTactic['category']
  pattern: RegExp
}[] = [
  {
    id: 'age-up',
    title: 'Age-up timing',
    category: 'transition',
    pattern: /age\s*up|feudal|castle age|imperial age|тёмн\w* век|феодал|замок/i,
  },
  {
    id: 'house',
    title: 'House / population room',
    category: 'opening',
    pattern: /\bhouse\b|population room|жиль[ёе]|домик/i,
  },
  {
    id: 'town-center',
    title: 'Town Center',
    category: 'economy',
    pattern: /town\s*center|second tc|2\s*tc|two tc|два тц|центр города/i,
  },
  {
    id: 'gold',
    title: 'Gold allocation',
    category: 'economy',
    pattern: /\bgold\b|на золото|золото/i,
  },
  {
    id: 'wood',
    title: 'Wood allocation',
    category: 'economy',
    pattern: /\bwood\b|на дерево|древесин/i,
  },
  {
    id: 'food',
    title: 'Food allocation',
    category: 'economy',
    pattern: /\bfood\b|sheep|berries|deer|на еду|овц|ягод|олен/i,
  },
  {
    id: 'stone',
    title: 'Stone allocation',
    category: 'economy',
    pattern: /\bstone\b|на камень|камн/i,
  },
  {
    id: 'scout',
    title: 'Scout information',
    category: 'opening',
    pattern: /\bscout\w*\b|разведчик|скаут/i,
  },
  {
    id: 'military',
    title: 'Opening military',
    category: 'military',
    pattern:
      /archer|spearman|horseman|knight|man[- ]at[- ]arms|longbow|military school|войск|лучник|копейщик|рыц/i,
  },
  {
    id: 'attack',
    title: 'Pressure / attack timing',
    category: 'military',
    pattern: /attack|pressure|push|raid|rush|агресс|атака|давлен|рейд/i,
  },
  {
    id: 'tech',
    title: 'Technology timing',
    category: 'transition',
    pattern: /wheelbarrow|technology|upgrade|технолог|улучшен/i,
  },
  {
    id: 'reaction',
    title: 'Opponent reaction',
    category: 'reaction',
    pattern: /against|versus|when they|if they|counter|против|если он|контр/i,
  },
]

const CIV_ALIASES: Record<string, string[]> = {
  English: ['english', 'англичан'],
  French: ['french', 'француз'],
  Rus: ['rus', 'рус'],
  Mongols: ['mongol', 'монгол'],
  Japanese: ['japanese', 'япон'],
  Chinese: ['chinese', 'китай'],
  'Holy Roman Empire': ['holy roman', 'hre', 'священноримск', 'импер'],
  Delhi: ['delhi', 'дели'],
  Ottomans: ['ottoman', 'осман'],
  Malians: ['malian', 'малий'],
  Byzantines: ['byzantine', 'визант'],
  'Abbasid Dynasty': ['abbasid', 'аббасид'],
  Ayyubids: ['ayyubid', 'айюбид'],
  "Jeanne d'Arc": ['jeanne', 'джоанн'],
}

function cleanText(value: string): string {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

function truncate(value: string, max: number): string {
  const text = cleanText(value)
  return text.length <= max ? text : `${text.slice(0, Math.max(0, max - 1)).trimEnd()}…`
}

function timestampLabel(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = total % 60
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    : `${minutes}:${String(secs).padStart(2, '0')}`
}

function videoIdFromUrl(url: URL): { provider: VideoProvider; id: string } | null {
  const host = url.hostname.toLocaleLowerCase().replace(/^www\./, '')
  if (host === 'youtu.be') {
    const id = url.pathname.split('/').filter(Boolean)[0]
    return id ? { provider: 'youtube', id } : null
  }
  if (['youtube.com', 'm.youtube.com', 'music.youtube.com'].includes(host)) {
    const parts = url.pathname.split('/').filter(Boolean)
    const id = url.pathname === '/watch' ? url.searchParams.get('v') : parts[1]
    if (id && ['live', 'shorts', 'embed', 'watch'].includes(parts[0] ?? 'watch')) {
      return { provider: 'youtube', id }
    }
  }
  if (host === 'twitch.tv' || host === 'm.twitch.tv') {
    const parts = url.pathname.split('/').filter(Boolean)
    const videoIndex = parts.findIndex((part) => part === 'videos')
    const id = videoIndex >= 0 ? parts[videoIndex + 1] : null
    return id && /^\d+$/.test(id) ? { provider: 'twitch', id } : null
  }
  return null
}

function metaContent(html: string, key: string): string | null {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']*)`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${escaped}["']`, 'i'),
  ]
  for (const pattern of patterns) {
    const match = pattern.exec(html)?.[1]
    if (match) return cleanText(match)
  }
  return null
}

function playerJsonValue(html: string, key: string): string | null {
  const match = new RegExp(`"${key}":"((?:\\\\.|[^"\\\\])*)"`).exec(html)
  if (!match?.[1]) return null
  try {
    return JSON.parse(`"${match[1]}"`) as string
  } catch {
    return cleanText(match[1])
  }
}

async function fetchText(url: string, accept = 'text/html,application/xhtml+xml'): Promise<string> {
  const response = await fetchWithTimeout(
    globalThis.fetch.bind(globalThis),
    url,
    { headers: { 'User-Agent': USER_AGENT, Accept: accept } },
    REQUEST_TIMEOUT_MS,
  )
  if (!response.ok) throw new Error(`Video provider returned ${response.status}`)
  return response.text()
}

async function fetchVideoMeta(
  url: URL,
  parsed: { provider: VideoProvider; id: string },
): Promise<VideoMeta> {
  if (parsed.provider === 'youtube') {
    const apiKey = getYouTubeApiKey()
    if (apiKey) {
      try {
        const params = new URLSearchParams({
          part: 'snippet,statistics',
          id: parsed.id,
          key: apiKey,
        })
        const response = await fetchWithTimeout(
          globalThis.fetch.bind(globalThis),
          `https://www.googleapis.com/youtube/v3/videos?${params.toString()}`,
          { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' } },
          REQUEST_TIMEOUT_MS,
        )
        if (response.ok) {
          const payload = (await response.json()) as {
            items?: Array<{
              snippet?: {
                title?: string
                channelTitle?: string
                description?: string
                publishedAt?: string
              }
              statistics?: { viewCount?: string }
            }>
          }
          const item = payload.items?.[0]
          if (item?.snippet) {
            return {
              provider: 'youtube',
              id: parsed.id,
              url: url.toString(),
              title: item.snippet.title || `YouTube video ${parsed.id}`,
              channel: item.snippet.channelTitle || null,
              description: item.snippet.description || '',
              publishedAt: item.snippet.publishedAt || null,
              transcriptLanguage: null,
              viewCount: item.statistics?.viewCount ? Number(item.statistics.viewCount) : null,
            }
          }
        }
      } catch {
        // Public page metadata remains a useful fallback when the API key is
        // missing, rate-limited, or the video is no longer available.
      }
    }
    const html = await fetchText(url.toString())
    const title =
      playerJsonValue(html, 'title') ??
      metaContent(html, 'og:title') ??
      metaContent(html, 'title') ??
      `YouTube video ${parsed.id}`
    const channel = playerJsonValue(html, 'author') ?? metaContent(html, 'og:site_name') ?? null
    const description = metaContent(html, 'og:description') ?? ''
    const publishedAt = metaContent(html, 'article:published_time')
    return {
      provider: 'youtube',
      id: parsed.id,
      url: url.toString(),
      title,
      channel,
      description,
      publishedAt,
      transcriptLanguage: null,
      viewCount: null,
    }
  }

  const twitchHeaders = await getTwitchApiHeaders()
  if (twitchHeaders) {
    try {
      const response = await fetchWithTimeout(
        globalThis.fetch.bind(globalThis),
        `https://api.twitch.tv/helix/videos?id=${encodeURIComponent(parsed.id)}`,
        {
          headers: { ...twitchHeaders, 'User-Agent': USER_AGENT, Accept: 'application/json' },
        },
        REQUEST_TIMEOUT_MS,
      )
      if (response.ok) {
        const payload = (await response.json()) as {
          data?: Array<{
            title?: string
            user_name?: string
            created_at?: string
            description?: string
            view_count?: number
          }>
        }
        const item = payload.data?.[0]
        if (item) {
          return {
            provider: 'twitch',
            id: parsed.id,
            url: url.toString(),
            title: item.title || `Twitch VOD ${parsed.id}`,
            channel: item.user_name || null,
            description: item.description || '',
            publishedAt: item.created_at || null,
            transcriptLanguage: null,
            viewCount: typeof item.view_count === 'number' ? item.view_count : null,
          }
        }
      }
    } catch {
      // Fall back to public OpenGraph metadata below.
    }
  }

  let html = ''
  try {
    html = await fetchText(url.toString())
  } catch {
    // Twitch may require a browser session; metadata can still be inferred from the URL.
  }
  return {
    provider: 'twitch',
    id: parsed.id,
    url: url.toString(),
    title: metaContent(html, 'og:title') ?? `Twitch VOD ${parsed.id}`,
    channel: metaContent(html, 'og:video:tag') ?? null,
    description: metaContent(html, 'og:description') ?? '',
    publishedAt: metaContent(html, 'article:published_time'),
    transcriptLanguage: null,
    viewCount: null,
  }
}

function captionTrackFromPage(html: string): CaptionTrack | null {
  const match = /"captionTracks":(\[.*?\]),"audioTracks"/s.exec(html)
  if (!match?.[1]) return null
  try {
    const tracks = JSON.parse(match[1].replace(/\\u0026/g, '&')) as CaptionTrack[]
    return (
      tracks.find((track) => /^(en|en-US|en-GB|ru|uk)$/i.test(track.languageCode ?? '')) ??
      tracks[0] ??
      null
    )
  } catch {
    return null
  }
}

function parseCaptionJson(payload: unknown): VideoTranscriptSegment[] {
  if (!payload || typeof payload !== 'object') return []
  const events = (payload as { events?: unknown[] }).events
  if (!Array.isArray(events)) return []
  const segments: VideoTranscriptSegment[] = []
  for (const event of events) {
    if (!event || typeof event !== 'object') continue
    const value = event as { tStartMs?: number; dDurationMs?: number; segs?: unknown[] }
    const text = Array.isArray(value.segs)
      ? value.segs
          .map((item) =>
            item && typeof item === 'object' ? ((item as { utf8?: string }).utf8 ?? '') : '',
          )
          .join('')
      : ''
    const clean = cleanText(text)
    if (!clean || typeof value.tStartMs !== 'number') continue
    const previous = segments[segments.length - 1]
    if (
      previous &&
      previous.text === clean &&
      Math.abs(previous.startSec - value.tStartMs / 1000) < 1
    )
      continue
    segments.push({
      startSec: Math.max(0, value.tStartMs / 1000),
      durationSec: typeof value.dDurationMs === 'number' ? value.dDurationMs / 1000 : undefined,
      text: clean,
    })
  }
  return segments
}

async function fetchYoutubeCaptions(html: string): Promise<CaptionResult> {
  const track = captionTrackFromPage(html)
  if (!track) {
    return { segments: [], language: null, provider: 'none', status: 'unavailable' }
  }
  try {
    const captionUrl = new URL(track.baseUrl)
    captionUrl.searchParams.set('fmt', 'json3')
    const response = await fetchWithTimeout(
      globalThis.fetch.bind(globalThis),
      captionUrl.toString(),
      { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' } },
      REQUEST_TIMEOUT_MS,
    )
    if (!response.ok) {
      return {
        segments: [],
        language: track.languageCode ?? null,
        provider: 'youtube-captions',
        status: response.status === 429 ? 'rate-limited' : 'unavailable',
      }
    }
    const segments = parseCaptionJson(await response.json())
    return {
      segments,
      language: track.languageCode ?? null,
      provider: 'youtube-captions',
      status: segments.length > 0 ? 'available' : 'unavailable',
    }
  } catch {
    return {
      segments: [],
      language: track.languageCode ?? null,
      provider: 'youtube-captions',
      status: 'unavailable',
    }
  }
}

function parseVtt(raw: string): VideoTranscriptSegment[] {
  const segments: VideoTranscriptSegment[] = []
  const blocks = raw.replace(/\r/g, '').split(/\n\s*\n/)
  for (const block of blocks) {
    const time = /(?:(\d{2}:)?\d{2}:\d{2}[.,]\d{3})\s*-->\s*((?:\d{2}:)?\d{2}:\d{2}[.,]\d{3})/.exec(
      block,
    )
    if (!time) continue
    const toSeconds = (value: string) => {
      const parts = value.replace(',', '.').split(':').map(Number)
      if (parts.length === 3) return parts[0]! * 3600 + parts[1]! * 60 + parts[2]!
      return parts[0]! * 60 + parts[1]!
    }
    const text = cleanText(
      block
        .split('\n')
        .slice(1)
        .filter((line) => !/^\d+$/.test(line.trim()))
        .join(' '),
    )
    if (text)
      segments.push({
        startSec: toSeconds(time[1]!),
        durationSec: toSeconds(time[2]!) - toSeconds(time[1]!),
        text,
      })
  }
  return segments
}

async function ytdlpCaptions(url: string): Promise<CaptionResult> {
  const dir = await mkdtemp(join(tmpdir(), 'rtslytics-video-'))
  const output = join(dir, '%(id)s.%(ext)s')
  const executable = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'
  try {
    const args = [
      '--skip-download',
      '--write-subs',
      '--write-auto-subs',
      '--sub-langs',
      'en.*,ru.*,uk.*',
      '--sub-format',
      'vtt',
      '--no-warnings',
      '--output',
      output,
      url,
    ]
    const commands: Array<{ command: string; prefix: string[] }> = [
      { command: executable, prefix: [] },
      {
        command: process.platform === 'win32' ? 'python.exe' : 'python3',
        prefix: ['-m', 'yt_dlp'],
      },
    ]
    for (const candidate of commands) {
      await new Promise<void>((resolve) => {
        const child = spawn(candidate.command, [...candidate.prefix, ...args], {
          windowsHide: true,
          stdio: 'ignore',
        })
        const timer = setTimeout(() => {
          child.kill()
          resolve()
        }, 45_000)
        child.once('close', () => {
          clearTimeout(timer)
          resolve()
        })
        child.once('error', () => {
          clearTimeout(timer)
          resolve()
        })
      })
      const files = await readdir(dir)
      if (files.some((file) => /\.(vtt|srt)$/i.test(file))) break
    }
    const files = await readdir(dir)
    const captionFile = files.find((file) => /\.(vtt|srt)$/i.test(file))
    if (!captionFile)
      return { segments: [], language: null, provider: 'yt-dlp', status: 'unavailable' }
    const segments = parseVtt(await readFile(join(dir, captionFile), 'utf8'))
    const language = captionFile.split('.').slice(-2, -1)[0] ?? null
    return {
      segments,
      language,
      provider: 'yt-dlp',
      status: segments.length > 0 ? 'available' : 'unavailable',
    }
  } catch {
    return { segments: [], language: null, provider: 'yt-dlp', status: 'unavailable' }
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {})
  }
}

function inferCivilization(text: string, requested: string | null | undefined): string {
  if (requested?.trim()) return requested.trim()
  for (const [label, aliases] of Object.entries(CIV_ALIASES)) {
    if (aliases.some((alias) => text.toLocaleLowerCase().includes(alias))) return label
  }
  return 'English'
}

function parseAllocation(text: string): {
  villagerCount: number
  resources: BuildStep['resources']
} {
  const resources: BuildStep['resources'] = { food: 0, wood: 0, gold: 0, stone: 0, builder: 0 }
  const resourceAliases: Record<string, keyof BuildStep['resources']> = {
    food: 'food',
    wood: 'wood',
    gold: 'gold',
    stone: 'stone',
    еду: 'food',
    дерево: 'wood',
    золото: 'gold',
    камень: 'stone',
  }
  let villagerCount = 0
  const patterns =
    /(\d+)\s+(?:villagers?|vills?|рабоч(?:их|их)?|крестьян?)\s+(?:to|on|на|в)\s+(food|wood|gold|stone|еду|дерево|золото|камень)/gi
  for (const match of text.matchAll(patterns)) {
    const count = Number(match[1])
    const key = resourceAliases[match[2]!.toLocaleLowerCase()]
    if (!key) continue
    resources[key] = Math.max(resources[key] ?? 0, count)
    villagerCount += count
  }
  const villager =
    /(?:pop(?:ulation)?|населени[ея]|vills?|villagers?|крестьян)\s*[:=]?\s*(\d+)/i.exec(text)?.[1]
  if (villager) villagerCount = Math.max(villagerCount, Number(villager))
  return { villagerCount, resources }
}

function ageForText(text: string, fallback: number): number {
  if (/imperial|имперск/i.test(text)) return 4
  if (/castle age|age 3|трет(?:ий|ья)|замок/i.test(text)) return 3
  if (/feudal|age 2|втор(?:ой|ая)|феодал/i.test(text)) return 2
  return fallback
}

function signalForText(text: string): {
  actions: string[]
  topics: string[]
  resources: string[]
  military: string[]
  archetype: string | null
} {
  const actions = ACTIONS.filter((item) => item.pattern.test(text)).map((item) => item.title)
  const resources = ACTIONS.filter(
    (item) => item.category === 'economy' && item.pattern.test(text),
  ).map((item) => item.title.replace(' allocation', ''))
  const military = ACTIONS.filter(
    (item) => item.category === 'military' && item.pattern.test(text),
  ).map((item) => item.title)
  const topics = [
    ...new Set(ACTIONS.filter((item) => item.pattern.test(text)).map((item) => item.category)),
  ]
  return {
    actions: actions.slice(0, 8),
    topics,
    resources: resources.slice(0, 5),
    military: military.slice(0, 8),
    archetype: actions[0] ?? null,
  }
}

function timingSignals(segments: VideoTranscriptSegment[]): VideoTimingSignal[] {
  return segments
    .filter((segment) => ACTIONS.some((item) => item.pattern.test(segment.text)))
    .slice(0, 12)
    .map((segment) => ({
      label: timestampLabel(segment.startSec),
      timeSec: Math.round(segment.startSec),
      mentions: 1,
    }))
}

function deriveTactics(segments: VideoTranscriptSegment[], text: string): VideoTactic[] {
  const result: VideoTactic[] = []
  const seen = new Set<string>()
  for (const segment of segments) {
    const action = ACTIONS.find((item) => item.pattern.test(segment.text))
    if (!action || seen.has(action.id)) continue
    seen.add(action.id)
    result.push({
      id: action.id,
      category: action.category,
      title: action.title,
      detail: truncate(segment.text, 220),
      timeSec: Math.round(segment.startSec),
      confidence: text.length > 500 ? 0.72 : 0.48,
    })
    if (result.length >= MAX_TACTICS) break
  }
  return result
}

function buildFromSegments(
  meta: VideoMeta,
  segments: VideoTranscriptSegment[],
  requestedCiv: string | null | undefined,
  tactics: VideoTactic[],
  transcript: string,
): { build: BuildOrder; signals: VideoAnalysisSignals } {
  const fullText = `${meta.title}\n${meta.description}\n${transcript}`
  const detectedCiv = inferCivilization(fullText, requestedCiv)
  const signal = signalForText(fullText)
  const steps: BuildStep[] = []
  const seen = new Set<string>()
  let currentAge = 1
  for (const segment of segments) {
    if (!ACTIONS.some((item) => item.pattern.test(segment.text))) continue
    const action = ACTIONS.find((item) => item.pattern.test(segment.text))
    const bucket = Math.floor(segment.startSec / 20)
    const key = `${bucket}:${action?.id ?? 'general'}`
    if (seen.has(key)) continue
    seen.add(key)
    currentAge = Math.max(currentAge, ageForText(segment.text, currentAge))
    const allocation = parseAllocation(segment.text)
    steps.push({
      time: timestampLabel(segment.startSec),
      population_count: allocation.villagerCount,
      villager_count: allocation.villagerCount,
      age: currentAge,
      resources: allocation.resources,
      notes: [truncate(segment.text, 300)],
    })
    if (steps.length >= MAX_STEPS) break
  }
  if (steps.length === 0) {
    steps.push({
      time: '0:00',
      population_count: 0,
      villager_count: 0,
      age: 1,
      resources: { food: 0, wood: 0, gold: 0, stone: 0, builder: 0 },
      notes: [
        transcript
          ? 'Transcript captured; no explicit build timing detected.'
          : 'Metadata captured; add captions or notes to build the order.',
      ],
    })
  }
  const confidence = Math.min(
    0.95,
    Math.max(
      0.25,
      (transcript ? 0.52 : 0.28) +
        Math.min(0.32, steps.length / 40) +
        (meta.description ? 0.06 : 0),
    ),
  )
  const signals: VideoAnalysisSignals = {
    archetype: signal.archetype,
    actions: signal.actions,
    resources: signal.resources,
    topics: signal.topics,
    opponentCivs: [],
    militaryMentions: signal.military,
    timings: timingSignals(segments),
    confidence: Number(confidence.toFixed(2)),
  }
  const build: BuildOrder = {
    schemaVersion: 1,
    name: `${meta.title} · extracted build`,
    civilization: detectedCiv,
    author: meta.channel ?? (meta.provider === 'twitch' ? 'Twitch VOD' : 'YouTube'),
    source: meta.url,
    video: meta.url,
    description: `Automatically extracted from ${meta.provider === 'twitch' ? 'a Twitch VOD' : 'a YouTube video'}. Review timings and confirm in-game before using it as a reference.`,
    strategy: tactics[0]?.title ?? signal.archetype ?? 'Transcript-derived tactic',
    provider: meta.provider,
    providerId: meta.id,
    origin: 'video',
    capturedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    confidence: signals.confidence,
    sampleSize: 1,
    archetype: signal.archetype ?? undefined,
    tactics,
    transcriptText: transcript.slice(0, MAX_TRANSCRIPT_CHARS),
    build_order: steps,
  }
  return { build, signals }
}

function hashId(value: string): string {
  let hash = 2166136261
  for (const char of value) {
    hash ^= char.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36)
}

/** Extract captions (when public), build timings and tactical signals from a YouTube/Twitch URL. */
export async function extractVideoAnalysis(
  input: unknown,
): Promise<IpcResult<VideoAnalysisRecord>> {
  if (!input || typeof input !== 'object') return err('validation', 'A video URL is required.')
  const value = input as Partial<VideoAnalysisInput>
  if (typeof value.url !== 'string' || value.url.trim().length < 8) {
    return err('validation', 'Paste a YouTube video or Twitch VOD URL.')
  }
  let url: URL
  try {
    url = new URL(value.url.trim())
  } catch {
    return err('validation', 'The video URL is not valid.')
  }
  if (url.protocol !== 'https:') return err('validation', 'Only HTTPS video URLs are supported.')
  const parsed = videoIdFromUrl(url)
  if (!parsed)
    return err('validation', 'Supported sources: youtube.com, youtu.be, and twitch.tv/videos/...')

  try {
    const meta = await fetchVideoMeta(url, parsed)
    let captions: CaptionResult = {
      segments: [],
      language: null,
      provider: 'none',
      status: 'not-requested',
    }
    if (parsed.provider === 'youtube') {
      const html = await fetchText(url.toString())
      captions = await fetchYoutubeCaptions(html)
      if (captions.segments.length === 0) captions = await ytdlpCaptions(url.toString())
    } else {
      captions = await ytdlpCaptions(url.toString())
    }
    const transcript = captions.segments
      .map((segment) => segment.text)
      .join(' ')
      .slice(0, MAX_TRANSCRIPT_CHARS)
    const tactics = deriveTactics(
      captions.segments,
      transcript || `${meta.title} ${meta.description}`,
    )
    const { build, signals } = buildFromSegments(
      meta,
      captions.segments,
      value.civilization,
      tactics,
      transcript,
    )
    build.video_evidence = {
      schemaVersion: 1,
      windowStart: meta.publishedAt ?? new Date().toISOString(),
      windowEnd: new Date().toISOString(),
      sampleSize: 1,
      requestedSampleSize: 1,
      coverageNote:
        captions.segments.length > 0
          ? 'Caption-backed extraction; verify against the video.'
          : 'Metadata-only extraction; public captions were not available.',
      commonActions: signals.actions,
      commonResources: signals.resources,
      commonTopics: signals.topics,
      commonOpponents: signals.opponentCivs,
      commonMilitaryMentions: signals.militaryMentions,
      timingSignals: signals.timings,
      sources: [
        {
          id: meta.id,
          title: meta.title,
          url: meta.url,
          channel: meta.channel,
          publishedAt: meta.publishedAt ?? new Date().toISOString(),
          viewCount: meta.viewCount,
          transcriptLanguage: captions.language ?? meta.transcriptLanguage,
          transcriptSource: captions.segments.length > 0 ? 'auto' : 'none',
          transcriptProvider:
            captions.provider === 'youtube-captions'
              ? 'cache'
              : captions.provider === 'yt-dlp'
                ? 'yt-dlp'
                : 'none',
          transcriptStatus: captions.status === 'unavailable' ? 'missing' : captions.status,
          transcriptWordCount: transcript ? transcript.split(/\s+/).length : 0,
          transcriptExcerpt: transcript.slice(0, 1400),
          tactics,
          signals,
        },
      ],
    }
    const warnings =
      captions.segments.length > 0
        ? [
            'The order is inferred from spoken captions, not replay telemetry. Confirm worker counts and timings in-game.',
          ]
        : [
            parsed.provider === 'twitch'
              ? 'This Twitch VOD did not expose captions. Metadata and title signals were saved; install yt-dlp or provide a local caption file for speech-to-build extraction.'
              : 'This video did not expose public captions. Metadata and title signals were saved; review the source manually.',
          ]
    const record: VideoAnalysisRecord = {
      schemaVersion: 1,
      id: `${parsed.provider}-${parsed.id}-${hashId(meta.url)}`,
      gameId:
        typeof value.gameId === 'string' && value.gameId.trim().length > 0
          ? value.gameId.trim().slice(0, 64)
          : null,
      provider: parsed.provider,
      url: meta.url,
      title: meta.title,
      channel: meta.channel,
      publishedAt: meta.publishedAt,
      capturedAt: new Date().toISOString(),
      transcriptLanguage: captions.language ?? meta.transcriptLanguage,
      transcriptProvider: captions.provider,
      transcriptStatus: captions.status,
      transcriptText: transcript,
      transcriptSegments: captions.segments,
      signals,
      tactics,
      build,
      warnings,
    }
    if (!saveVideoAnalysis(record)) {
      record.warnings.push(
        'The extraction completed, but the local video archive could not be written.',
      )
    }
    return ok(record)
  } catch (error) {
    return err('network', error instanceof Error ? error.message : 'Video analysis failed.')
  }
}
