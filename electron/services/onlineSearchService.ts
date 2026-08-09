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
      Math.min(20, Math.floor(typeof value.limit === 'number' ? value.limit : 10)),
    ),
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

function twitchHeaders(): Record<string, string> | null {
  const clientId = process.env.RTSLYTICS_TWITCH_CLIENT_ID ?? process.env.TWITCH_CLIENT_ID
  const token = process.env.RTSLYTICS_TWITCH_ACCESS_TOKEN ?? process.env.TWITCH_ACCESS_TOKEN
  return clientId && token ? { 'Client-ID': clientId, Authorization: `Bearer ${token}` } : null
}

function youtubeKey(): string | null {
  return process.env.RTSLYTICS_YOUTUBE_API_KEY ?? process.env.YOUTUBE_API_KEY ?? null
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
    .slice(0, query.limit ?? 10)
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
  for (let index = 0; index < starts.length && result.length < (query.limit ?? 10); index++) {
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
  const headers = twitchHeaders()
  if (!headers) return []
  const channels = await jsonFetch<TwitchChannelsResponse>(
    `https://api.twitch.tv/helix/search/channels?query=${encodeURIComponent(query.query)}&live_only=${query.liveOnly ? 'true' : 'false'}&first=${query.limit ?? 10}`,
    headers,
  )
  return (channels.data ?? []).map((channel) => ({
    id: channel.id,
    provider: 'twitch',
    source: 'twitch',
    kind: 'streamer',
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
  }))
}

type YoutubeItem = {
  id?: { videoId?: string }
  snippet?: {
    title?: string
    channelTitle?: string
    channelId?: string
    description?: string
    publishedAt?: string
    thumbnails?: { medium?: { url?: string } }
  }
}
type YoutubeResponse = { items?: YoutubeItem[] }

async function searchYoutube(query: OnlineSearchQuery): Promise<OnlineSearchResult[]> {
  const key = youtubeKey()
  if (!key) return []
  const payload = await jsonFetch<YoutubeResponse>(
    `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=${query.limit ?? 10}&q=${encodeURIComponent(`${query.query} Age of Empires IV`)}&key=${encodeURIComponent(key)}`,
  )
  return (payload.items ?? []).flatMap((item) => {
    const id = item.id?.videoId
    const snippet = item.snippet
    if (!id || !snippet) return []
    return [
      {
        id,
        provider: 'youtube',
        source: 'youtube',
        kind: 'video',
        title: snippet.title ?? 'YouTube video',
        channel: snippet.channelTitle ?? 'YouTube',
        channelUrl: snippet.channelId
          ? `https://www.youtube.com/channel/${snippet.channelId}`
          : null,
        url: `https://www.youtube.com/watch?v=${id}`,
        thumbnailUrl: snippet.thumbnails?.medium?.url ?? null,
        publishedAt: snippet.publishedAt ?? null,
        viewCount: null,
        live: false,
        durationSec: null,
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

  const providers: Record<
    OnlineSearchProvider,
    OnlineSearchData['providers'][OnlineSearchProvider]
  > = {
    twitch: twitchHeaders() ? 'ready' : 'not_configured',
    youtube: youtubeKey() ? 'ready' : 'not_configured',
  }
  const results: OnlineSearchResult[] = []
  const wantsTwitch = query.provider === 'all' || query.provider === 'twitch'
  const wantsYoutube = query.provider === 'all' || query.provider === 'youtube'
  if (wantsTwitch && providers.twitch === 'ready') {
    try {
      results.push(...(await searchTwitch(query)))
    } catch {
      providers.twitch = 'error'
    }
  }
  if (wantsTwitch && providers.twitch !== 'error') {
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
    } else if (providers.twitch === 'not_configured') {
      providers.twitch = 'error'
    }
  }
  if (wantsYoutube && providers.youtube === 'ready') {
    try {
      results.push(...(await searchYoutube(query)))
    } catch {
      providers.youtube = 'error'
    }
  }
  const value: OnlineSearchData = {
    results: results.slice(0, query.limit ?? 10),
    providers,
    fallbackLinks: fallbackLinks(query.query, query.provider),
    fetchedAt: new Date().toISOString(),
  }
  cache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, value })
  return ok(value)
}
