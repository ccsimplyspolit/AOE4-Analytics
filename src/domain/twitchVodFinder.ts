/**
 * AoE4World's Twitch Video Finder is the source of truth for VOD-to-game
 * matches. A game can have a VOD only when a streamer made the broadcast
 * public and AoE4World was able to associate it with the game id.
 *
 * This module deliberately contains no network code: URL construction and the
 * narrow HTML projection are pure and unit-testable. Network access lives in
 * the Electron main process, never in the renderer.
 */

export const TWITCH_VIDEO_FINDER_URL = 'https://aoe4world.com/tools/twitch-video-finder'

export interface TwitchVodFinderInput {
  /** AoE4World's canonical game id (the stored ranked/QM match id). */
  gameId: string
  /** Profile used for the exact AoE4World game endpoint, when known. */
  profileId?: number | null
  civilization: string
  opponentCivilization?: string | null
  map?: string | null
  durationSec?: number | null
}

/** A direct VOD URL and the game-clock position where the match begins. */
export interface TwitchVodReference {
  gameId: string
  /** A participant profile parsed from the Finder row, when available. */
  profileId?: number
  videoId: string
  /** Twitch VOD offset supplied by AoE4World, in seconds; null when absent. */
  offsetSec: number | null
  url: string
}

export interface TwitchVodLookupResult {
  gameId: string
  /** A user-openable AoE4World finder URL with the match filters applied. */
  finderUrl: string
  /** A VOD only when AoE4World associated it with this exact game id. */
  vod: TwitchVodReference | null
  /** Number of Finder result pages checked for this exact game. */
  checkedPages: number
}

const CIVILIZATION_SLUG = /^[a-z][a-z0-9_]{1,63}$/
const GAME_ID = /^\d{1,16}$/
const TWITCH_VOD_PATH = /^\/videos\/(\d+)(?:\/)?$/

export function isTwitchVodFinderInput(value: unknown): value is TwitchVodFinderInput {
  if (!value || typeof value !== 'object') return false
  const input = value as Partial<TwitchVodFinderInput>
  return (
    typeof input.gameId === 'string' &&
    GAME_ID.test(input.gameId) &&
    (input.profileId == null ||
      (typeof input.profileId === 'number' &&
        Number.isSafeInteger(input.profileId) &&
        input.profileId > 0)) &&
    typeof input.civilization === 'string' &&
    CIVILIZATION_SLUG.test(input.civilization)
  )
}

/** The exact length buckets exposed by AoE4World's Finder form. */
export function twitchGameLengthFilter(durationSec: number | null | undefined): string | null {
  if (!Number.isFinite(durationSec) || (durationSec ?? 0) < 0) return null
  const minutes = Math.floor((durationSec ?? 0) / 60)
  if (minutes < 5) return '<10mins'
  if (minutes >= 60) return '>60mins'
  const lower = Math.floor(minutes / 5) * 5
  return `${lower}-${lower + 4}mins`
}

function safeMap(value: string | null | undefined): string | null {
  const map = value?.trim() ?? ''
  return map.length > 0 && map.length <= 120 ? map : null
}

/**
 * Builds a Finder link using filters that apply to the whole game. We do not
 * restrict by the first opponent civ: in a team game the streamer may be any
 * participant, and that restriction would create false "no VOD" results.
 */
export function twitchVideoFinderUrl(input: TwitchVodFinderInput): string {
  const params = new URLSearchParams()
  if (CIVILIZATION_SLUG.test(input.civilization)) {
    params.set('civilization', input.civilization)
  }
  const map = safeMap(input.map)
  if (map) params.set('map', map)
  const gameLength = twitchGameLengthFilter(input.durationSec)
  if (gameLength) params.set('game_length', gameLength)
  const query = params.toString()
  return query ? `${TWITCH_VIDEO_FINDER_URL}?${query}` : TWITCH_VIDEO_FINDER_URL
}

/** Validates and normalizes one direct Twitch VOD URL from AoE4World. */
export function twitchVodReferenceFromUrl(
  value: string,
  gameId: string,
): TwitchVodReference | null {
  if (!GAME_ID.test(gameId)) return null
  let url: URL
  try {
    url = new URL(value.replaceAll('&amp;', '&'))
  } catch {
    return null
  }
  if (url.protocol !== 'https:') return null
  const host = url.hostname.toLowerCase().replace(/^www\./, '')
  if (host !== 'twitch.tv') return null
  const match = TWITCH_VOD_PATH.exec(url.pathname)
  if (!match?.[1]) return null
  return {
    gameId,
    videoId: match[1],
    offsetSec: twitchOffsetSeconds(url.searchParams.get('t')),
    url: url.toString(),
  }
}

/** Converts Twitch's `1h2m3s` (and Finder's `123s`) offsets to seconds. */
export function twitchOffsetSeconds(value: string | null): number | null {
  if (!value) return null
  const match = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(value)
  if (!match || !match[0] || (!match[1] && !match[2] && !match[3])) return null
  const hours = Number(match[1] ?? 0)
  const minutes = Number(match[2] ?? 0)
  const seconds = Number(match[3] ?? 0)
  const total = hours * 3600 + minutes * 60 + seconds
  return Number.isSafeInteger(total) ? total : null
}

/**
 * Projects Finder result rows into trusted VOD references. The page is not an
 * API, so only the stable row id and the direct Twitch URL are read. Each row
 * is bounded by the next `data-game-id`, preventing one row from borrowing the
 * following row's VOD link if AoE4World changes a card's optional content.
 */
export function twitchVodReferencesFromFinderHtml(html: string): TwitchVodReference[] {
  const starts = [...html.matchAll(/\bdata-game-id="(\d+)"/g)]
  const result: TwitchVodReference[] = []
  for (let index = 0; index < starts.length; index++) {
    const start = starts[index]
    const gameId = start?.[1]
    const startAt = start?.index
    if (!gameId || startAt == null) continue
    const nextAt = starts[index + 1]?.index ?? html.length
    const row = html.slice(startAt, nextAt)
    const vodUrl = /href="(https:\/\/(?:www\.)?twitch\.tv\/videos\/\d+(?:\?[^"#<]*)?)"/i.exec(
      row,
    )?.[1]
    if (!vodUrl) continue
    const reference = twitchVodReferenceFromUrl(vodUrl, gameId)
    if (reference) {
      const profileMatch = /href="\/players\/(\d+)(?:-[^"/?#]*)?"/i.exec(row)
      const profileId = profileMatch?.[1] ? Number(profileMatch[1]) : null
      result.push(
        profileId != null && Number.isSafeInteger(profileId) && profileId > 0
          ? { ...reference, profileId }
          : reference,
      )
    }
  }
  return result
}

/** Highest page number advertised by a Finder HTML response (at least one). */
export function twitchFinderLastPage(html: string): number {
  let last = 1
  for (const match of html.matchAll(/[?&]page=(\d+)/g)) {
    const page = Number(match[1])
    if (Number.isSafeInteger(page) && page > last) last = page
  }
  return last
}
