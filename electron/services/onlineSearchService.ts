import { REQUEST_TIMEOUT_MS, USER_AGENT } from '@api/client'
import { fetchWithTimeout } from '@api/fetchWithTimeout'
import type {
  OnlineSearchData,
  OnlineSearchProvider,
  OnlineSearchQuery,
  OnlineSearchResult,
  IpcResult,
} from '@ipc/contract'
import { err, ok } from './result'
import { getClient } from './appContext'
import { getExternalApiStatus, getTwitchApiHeaders, getYouTubeApiKey } from './externalApiService'

const cache = new Map<string, { expiresAt: number; value: OnlineSearchData }>()
const CACHE_TTL_MS = 2 * 60_000

function queryValue(value: unknown): string {
  return typeof value === 'string' ? value.trim().slice(0, 120) : ''
}

function normalizeQuery(input: unknown): OnlineSearchQuery | null {
  if (!input || typeof input !== 'object') return null
  const value = input as Partial<OnlineSearchQuery>
  const query = queryValue(value.query)
  if (query.length < 2) return null
  const provider =
    value.provider === 'twitch' || value.provider === 'youtube' ? value.provider : 'all'
  return {
    query,
    provider,
    liveOnly: value.liveOnly === true,
    limit: Math.max(
      1,
      Math.min(100, Math.floor(typeof value.limit === 'number' ? value.limit : 100)),
    ),
    dateRangeDays: Math.max(
      0,
      Math.min(365, Math.floor(typeof value.dateRangeDays === 'number' ? value.dateRangeDays : 30)),
    ),
    sort: value.sort === 'views' ? 'views' : 'recent',
  }
}

async function jsonFetch<T>(url: string, headers: Record<string, string> = {}): Promise<T> {
  const response = await fetchWithTimeout(
    globalThis.fetch.bind(globalThis),
    url,
    { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json', ...headers } },
    REQUEST_TIMEOUT_MS,
  )
  if (!response.ok) throw new Error(`Online search returned ${response.status}`)
  return (await response.json()) as T
}

function fallbackLinks(
  query: string,
  provider: OnlineSearchQuery['provider'],
): OnlineSearchData['fallbackLinks'] {
  const encoded = encodeURIComponent(query)
  const links: OnlineSearchData['fallbackLinks'] = []
  if (provider === 'all' || provider === 'twitch') {
    links.push({
      provider: 'aoe4world',
      label: 'AoE4World Twitch Video Finder',
      url: 'https://aoe4world.com/tools/twitch-video-finder',
    })
    links.push({
      provider: 'twitch',
      label: 'Twitch search',
      url: `https://www.twitch.tv/search?term=${encoded}`,
    })
  }
  if (provider === 'all' || provider === 'youtube') {
    links.push({
      provider: 'youtube',
      label: 'YouTube search',
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${query} Age of Empires IV`)}`,
    })
  }
  return links
}

type TwitchChannel = {
  id: string
  display_name: string
  login: string
  title: string
  thumbnail_url: string
  is_live?: boolean
}
type TwitchChannelsResponse = { data?: TwitchChannel[] }

type TwitchVideo = {
  id: string
  title: string
  url: string
  thumbnail_url: string
  view_count: number
  created_at: string
  published_at?: string
  user_name: string
  user_login: string
  duration: string
  type?: string
}
type TwitchVideosResponse = { data?: TwitchVideo[] }
type TwitchCategory = { id: string; name: string }
type TwitchCategoriesResponse = { data?: TwitchCategory[] }

function twitchDurationSeconds(value: string): number | null {
  const match = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i.exec(value.trim())
  if (!match || !match[0]) return null
  return Number(match[1] ?? 0) * 3600 + Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0)
}

function recentCutoff(days: number | undefined): number | null {
  if (!days || days <= 0) return null
  return Date.now() - days * 24 * 60 * 60 * 1_000
}

function withinCutoff(isoDate: string, cutoff: number | null): boolean {
  if (cutoff == null) return true
  const timestamp = Date.parse(isoDate)
  return Number.isFinite(timestamp) && timestamp >= cutoff
}

function twitchVideoResult(video: TwitchVideo): OnlineSearchResult {
  const publishedAt = video.published_at ?? video.created_at
  return {
    id: video.id,
    provider: 'twitch',
    source: 'twitch',
    kind: 'video',
    title: video.title || 'Twitch VOD',
    channel: video.user_name || video.user_login || 'Twitch',
    channelUrl: video.user_login ? `https://www.twitch.tv/${video.user_login}` : null,
    url: video.url || `https://www.twitch.tv/videos/${video.id}`,
    thumbnailUrl: video.thumbnail_url || null,
    publishedAt,
    viewCount: Number.isFinite(video.view_count) ? video.view_count : null,
    live: false,
    durationSec: twitchDurationSeconds(video.duration),
    description: 'Official Twitch VOD metadata',
  }
}

async function searchAoe4WorldStreamers(query: OnlineSearchQuery): Promise<OnlineSearchResult[]> {
  const client = getClient()
  const [players, leaderboard] = await Promise.all([
    client.searchPlayers(query.query),
    client.getLeaderboard('rm_solo', { page: 1 }).catch(() => null),
  ])
  const liveIds = new Set(
    leaderboard?.players
      .filter((player) => player.twitch_is_live)
      .map((player) => player.profile_id) ?? [],
  )
  return players.players
    .filter((player) => player.social?.twitch)
    .slice(0, query.limit ?? 100)
    .map((player) => {
      const live = liveIds.has(player.profile_id)
      const twitch = player.social?.twitch ?? null
      const channelUrl = twitch
        ? /^https?:\/\//i.test(twitch)
          ? twitch
          : `https://www.twitch.tv/${twitch.replace(/^@/, '')}`
        : null
      return {
        id: String(player.profile_id),
        provider: 'twitch' as const,
        source: 'aoe4world' as const,
        kind: 'streamer' as const,
        title: player.name,
        channel: player.name,
        channelUrl,
        url: channelUrl ?? `https://aoe4world.com/players/${player.profile_id}`,
        thumbnailUrl: player.avatars?.medium ?? player.avatars?.small ?? null,
        publishedAt: player.last_game_at ?? null,
        viewCount: null,
        live,
        durationSec: null,
        description: live
          ? 'Live on Twitch according to the AoE4World ladder'
          : 'AoE4World player profile with a linked Twitch channel',
      } satisfies OnlineSearchResult
    })
    .filter((result) => !query.liveOnly || result.live)
}

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

/** Parses the current AoE4World Finder cards into a compact online-search projection. */
async function searchAoE4World(query: OnlineSearchQuery): Promise<OnlineSearchResult[]> {
  const response = await fetchWithTimeout(
    globalThis.fetch.bind(globalThis),
    'https://aoe4world.com/tools/twitch-video-finder',
    { headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml' } },
    REQUEST_TIMEOUT_MS,
  )
  if (!response.ok) throw new Error(`AoE4World Twitch Finder returned ${response.status}`)
  const html = await response.text()
  const starts = [...html.matchAll(/\bdata-game-id="(\d+)"/g)]
  const needle = query.query.toLocaleLowerCase()
  const result: OnlineSearchResult[] = []
  for (let index = 0; index < starts.length && result.length < (query.limit ?? 100); index++) {
    const start = starts[index]
    const gameId = start?.[1]
    const startAt = start?.index
    if (!gameId || startAt == null) continue
    const row = html.slice(startAt, starts[index + 1]?.index ?? html.length)
    const plain = stripHtml(row)
    const ongoing = /<span>\s*Ongoing\s*<\/span>/i.test(row)
    if (query.liveOnly && !ongoing) continue
    if (!plain.toLocaleLowerCase().includes(needle)) continue
    const map = stripHtml(/<h3[^>]*>\s*<a[^>]*>(.*?)<\/a>/i.exec(row)?.[1] ?? 'AoE4 match')
    const mode = />(((?:RM|QM)\s+\d+v\d+|FFA))<span/i.exec(row)?.[1] ?? 'AoE4 match'
    const vod = /href="(https:\/\/www\.twitch\.tv\/videos\/\d+(?:\?[^"<]*)?)"/i.exec(row)?.[1]
    if (!vod) continue
    const channel = /title="Twitch video by ([^"]+)"/i.exec(row)?.[1] ?? 'Twitch'
    const gameDate = /aria-label="Game Date"[^>]+title="([^"]+)"/i.exec(row)?.[1] ?? null
    const civs = [...row.matchAll(/<img[^>]+(?:alt|title)="([^"]+)"[^>]+(?:alt|title)="([^"]+)"/gi)]
      .map((match) => (match[1] === match[2] ? (match[1] ?? '') : (match[1] ?? match[2] ?? '')))
      .filter((value) => value.length > 0 && !/map|twitch/i.test(value))
    result.push({
      id: gameId,
      provider: 'twitch',
      source: 'aoe4world',
      kind: 'video',
      title: `${map} · ${mode}`,
      channel,
      channelUrl: null,
      url: vod.replaceAll('&amp;', '&'),
      thumbnailUrl: null,
      publishedAt:
        gameDate && !Number.isNaN(Date.parse(gameDate)) ? new Date(gameDate).toISOString() : null,
      viewCount: null,
      live: ongoing,
      durationSec: null,
      description:
        civs.length > 0 ? `${civs.join(' vs ')} · game ${gameId}` : `AoE4World game ${gameId}`,
    })
  }
  return result
}

async function searchTwitch(query: OnlineSearchQuery): Promise<OnlineSearchResult[]> {
  const headers = await getTwitchApiHeaders()
  if (!headers) return []
  const limit = query.limit ?? 100
  const channels = await jsonFetch<TwitchChannelsResponse>(
    `https://api.twitch.tv/helix/search/channels?query=${encodeURIComponent(query.query)}&live_only=${query.liveOnly ? 'true' : 'false'}&first=${Math.min(100, limit)}`,
    headers,
  )
  const streamers = (channels.data ?? []).map(
    (channel) =>
      ({
        id: channel.id,
        provider: 'twitch' as const,
        source: 'twitch' as const,
        kind: 'streamer' as const,
        title: channel.title || channel.display_name,
        channel: channel.display_name,
        channelUrl: `https://www.twitch.tv/${channel.login}`,
        url: `https://www.twitch.tv/${channel.login}`,
        thumbnailUrl: channel.thumbnail_url || null,
        publishedAt: null,
        viewCount: null,
        live: channel.is_live === true,
        durationSec: null,
        description: channel.title || null,
      }) satisfies OnlineSearchResult,
  )

  // Twitch does not expose full-text VOD search. Combine a category feed with
  // the channels returned by the text search, then rank/filter locally. This
  // gives the user real VODs while retaining streamer discovery.
  if (query.liveOnly) return streamers.filter((result) => result.live)
  const cutoff = recentCutoff(query.dateRangeDays)
  const videoRequests: Promise<TwitchVideosResponse>[] = []
  const categorySearch = await jsonFetch<TwitchCategoriesResponse>(
    `https://api.twitch.tv/helix/search/categories?query=${encodeURIComponent('Age of Empires IV')}&first=5`,
    headers,
  ).catch(() => ({ data: [] }))
  const category = categorySearch.data?.find((item) =>
    item.name
      .toLocaleLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .includes('age of empires iv'),
  )
  if (category) {
    const params = new URLSearchParams({
      game_id: category.id,
      first: '100',
      sort: query.sort === 'views' ? 'views' : 'time',
      type: 'archive',
    })
    videoRequests.push(
      jsonFetch<TwitchVideosResponse>(`https://api.twitch.tv/helix/videos?${params}`, headers),
    )
  }
  for (const channel of channels.data?.slice(0, 5) ?? []) {
    const params = new URLSearchParams({
      user_id: channel.id,
      first: '20',
      sort: query.sort === 'views' ? 'views' : 'time',
      type: 'archive',
    })
    videoRequests.push(
      jsonFetch<TwitchVideosResponse>(`https://api.twitch.tv/helix/videos?${params}`, headers),
    )
  }
  const videoResponses = await Promise.allSettled(videoRequests)
  const needle = query.query.toLocaleLowerCase()
  const videos = videoResponses.flatMap((response) =>
    response.status === 'fulfilled' ? (response.value.data ?? []) : [],
  )
  const unique = new Map<string, TwitchVideo>()
  for (const video of videos) {
    if (!withinCutoff(video.created_at, cutoff)) continue
    const searchable = `${video.title} ${video.user_name} ${video.user_login}`.toLocaleLowerCase()
    const genericQuery = /^(?:aoe\s*4|age of empires(?: iv| 4)?)$/i.test(query.query.trim())
    if (category && !genericQuery && !searchable.includes(needle)) continue
    unique.set(video.id, video)
  }
  const sorted = [...unique.values()].sort((left, right) => {
    if (query.sort === 'views') return right.view_count - left.view_count
    return Date.parse(right.created_at) - Date.parse(left.created_at)
  })
  return [...sorted.slice(0, limit).map(twitchVideoResult), ...streamers].slice(0, limit * 2)
}

type YoutubeItem = {
  id?: { videoId?: string }
  snippet?: {
    title?: string
    channelTitle?: string
    channelId?: string
    description?: string
    publishedAt?: string
    liveBroadcastContent?: string
    thumbnails?: { medium?: { url?: string } }
  }
}
type YoutubeResponse = { items?: YoutubeItem[] }

type YoutubeVideoItem = {
  id?: string
  snippet?: {
    title?: string
    channelTitle?: string
    channelId?: string
    description?: string
    publishedAt?: string
    liveBroadcastContent?: string
    thumbnails?: { medium?: { url?: string } }
  }
  contentDetails?: { duration?: string }
  statistics?: { viewCount?: string }
}
type YoutubeVideosResponse = { items?: YoutubeVideoItem[] }

function youtubeDurationSeconds(value: string | undefined): number | null {
  if (!value) return null
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i.exec(value)
  if (!match) return null
  return Number(match[1] ?? 0) * 3600 + Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0)
}

async function searchYoutube(query: OnlineSearchQuery): Promise<OnlineSearchResult[]> {
  const key = getYouTubeApiKey()
  if (!key) return []
  const searchParams = new URLSearchParams({
    part: 'snippet',
    type: 'video',
    maxResults: String(Math.min(50, Math.max(1, (query.limit ?? 100) * 2))),
    order: query.sort === 'views' ? 'viewCount' : 'date',
    q: `${query.query} Age of Empires IV`,
    key,
  })
  if (query.liveOnly) searchParams.set('eventType', 'live')
  const cutoff = recentCutoff(query.dateRangeDays)
  if (cutoff != null) searchParams.set('publishedAfter', new Date(cutoff).toISOString())
  const payload = await jsonFetch<YoutubeResponse>(
    `https://www.googleapis.com/youtube/v3/search?${searchParams.toString()}`,
  )
  const ids = (payload.items ?? [])
    .map((item) => item.id?.videoId)
    .filter((id): id is string => Boolean(id))
  if (ids.length === 0) return []
  const details = await jsonFetch<YoutubeVideosResponse>(
    `https://www.googleapis.com/youtube/v3/videos?${new URLSearchParams({
      part: 'snippet,contentDetails,statistics',
      id: ids.join(','),
      key,
    }).toString()}`,
  )
  const byId = new Map((details.items ?? []).map((item) => [item.id, item]))
  return ids.flatMap((videoId) => {
    const item = byId.get(videoId)
    const fallback = (payload.items ?? []).find((candidate) => candidate.id?.videoId === videoId)
    const snippet = item?.snippet ?? fallback?.snippet
    if (!snippet) return []
    const live = snippet.liveBroadcastContent === 'live'
    return [
      {
        id: videoId,
        provider: 'youtube',
        source: 'youtube',
        kind: 'video',
        title: snippet.title ?? 'YouTube video',
        channel: snippet.channelTitle ?? 'YouTube',
        channelUrl: snippet.channelId
          ? `https://www.youtube.com/channel/${snippet.channelId}`
          : null,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        thumbnailUrl: snippet.thumbnails?.medium?.url ?? null,
        publishedAt: snippet.publishedAt ?? null,
        viewCount: item?.statistics?.viewCount ? Number(item.statistics.viewCount) : null,
        live,
        durationSec: youtubeDurationSeconds(item?.contentDetails?.duration),
        description: snippet.description ?? null,
      } satisfies OnlineSearchResult,
    ]
  })
}

export async function searchOnline(input: unknown): Promise<IpcResult<OnlineSearchData>> {
  const query = normalizeQuery(input)
  if (!query) return err('validation', 'Enter at least two characters to search online.')
  const cacheKey = JSON.stringify(query)
  const cached = cache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) return ok(cached.value)

  const externalStatus = getExternalApiStatus()
  const providers: Record<
    OnlineSearchProvider,
    OnlineSearchData['providers'][OnlineSearchProvider]
  > = {
    twitch: externalStatus.twitch.configured ? 'ready' : 'not_configured',
    youtube: externalStatus.youtube.configured ? 'ready' : 'not_configured',
  }
  const results: OnlineSearchResult[] = []
  const wantsTwitch = query.provider === 'all' || query.provider === 'twitch'
  const wantsYoutube = query.provider === 'all' || query.provider === 'youtube'
  if (wantsTwitch && externalStatus.twitch.configured) {
    try {
      results.push(...(await searchTwitch(query)))
    } catch {
      providers.twitch = 'error'
    }
  }
  if (wantsTwitch) {
    const [vods, streamers] = await Promise.allSettled([
      searchAoE4World(query),
      searchAoe4WorldStreamers(query),
    ])
    if (vods.status === 'fulfilled') results.push(...vods.value)
    if (streamers.status === 'fulfilled') results.push(...streamers.value)
    if (vods.status === 'fulfilled' || streamers.status === 'fulfilled') {
      // AoE4World exposes two independent public surfaces. A VOD page failure
      // must not hide player profiles and linked Twitch channels.
      providers.twitch = 'ready'
    } else if (!externalStatus.twitch.configured) {
      providers.twitch = 'error'
    }
  }
  if (wantsYoutube && externalStatus.youtube.configured) {
    try {
      results.push(...(await searchYoutube(query)))
    } catch {
      providers.youtube = 'error'
    }
  }
  const value: OnlineSearchData = {
    results: results.slice(0, query.limit ?? 100),
    providers,
    fallbackLinks: fallbackLinks(query.query, query.provider),
    fetchedAt: new Date().toISOString(),
  }
  cache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, value })
  return ok(value)
}
