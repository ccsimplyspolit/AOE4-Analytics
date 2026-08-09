import { REQUEST_TIMEOUT_MS, USER_AGENT } from '@api/client'
import { fetchWithTimeout } from '@api/fetchWithTimeout'
import { RateLimiter } from '@api/rateLimiter'
import { normalizeTeams } from '@api/types'
import {
  isTwitchVodFinderInput,
  twitchFinderLastPage,
  twitchVideoFinderUrl,
  twitchVodReferenceFromUrl,
  twitchVodReferencesFromFinderHtml,
  type TwitchVodFinderInput,
  type TwitchVodLookupResult,
  type TwitchVodReference,
} from '@domain/twitchVodFinder'
import type { IpcResult } from '@ipc/contract'
import { getClient } from './appContext'
import { err, errFrom, ok } from './result'

/**
 * The Finder is an HTML tool rather than a public API. Keep this conservative:
 * three narrow pages, then one looser duration fallback. This is enough to
 * validate an exact game id without crawling AoE4World or inventing a VOD.
 */
const MAX_PAGES_PER_QUERY = 3
const CACHE_TTL_MS = 5 * 60_000
const NEGATIVE_CACHE_TTL_MS = 30_000
const rateLimiter = new RateLimiter({ minIntervalMs: 500 })
const cache = new Map<string, { expiresAt: number; value: TwitchVodLookupResult }>()
const inFlight = new Map<string, Promise<TwitchVodLookupResult>>()

function finderPageUrl(baseUrl: string, page: number): string {
  if (page <= 1) return baseUrl
  const url = new URL(baseUrl)
  url.searchParams.set('page', String(page))
  return url.toString()
}

async function fetchFinderPage(url: string): Promise<string> {
  const response = await rateLimiter.schedule(() =>
    fetchWithTimeout(
      globalThis.fetch.bind(globalThis),
      url,
      {
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'text/html,application/xhtml+xml',
        },
      },
      REQUEST_TIMEOUT_MS,
    ),
  )
  if (!response.ok) throw new Error(`AoE4World Twitch Finder returned ${response.status}`)
  return response.text()
}

/**
 * AoE4World already includes the Twitch association on the exact
 * `/players/:profile/games/:game` response. Prefer that field over scraping the
 * Finder: it is both faster and fixes the race where a newly indexed VOD is
 * still absent from the Finder HTML/cache.
 */
async function lookupDirectGame(
  input: TwitchVodFinderInput,
): Promise<TwitchVodLookupResult['vod']> {
  if (input.profileId == null) return null
  try {
    const game = await getClient().getGame(input.profileId, Number(input.gameId))
    if (game.game_id !== Number(input.gameId)) return null
    const players = normalizeTeams(game).flat()
    const preferred = players.find(
      (player) => player.profile_id === input.profileId && player.twitch_video_url,
    )
    const associated = preferred ?? players.find((player) => player.twitch_video_url)
    return associated?.twitch_video_url
      ? twitchVodReferenceFromUrl(associated.twitch_video_url, input.gameId)
      : null
  } catch {
    // The Finder remains the fallback for stale/missing profile API data.
    return null
  }
}

async function lookup(input: TwitchVodFinderInput): Promise<TwitchVodLookupResult> {
  const finderUrl = twitchVideoFinderUrl(input)
  const directVod = await lookupDirectGame(input)
  if (directVod) return { gameId: input.gameId, finderUrl, vod: directVod, checkedPages: 0 }
  // The duration is useful to keep the result set small, but a video can be
  // indexed with a slightly different end time. Retry once without it before
  // reporting no verified VOD.
  const withoutDuration = twitchVideoFinderUrl({ ...input, durationSec: null })
  const queries = [...new Set([finderUrl, withoutDuration])]
  let checkedPages = 0

  for (const baseUrl of queries) {
    let lastPage = 1
    for (let page = 1; page <= Math.min(lastPage, MAX_PAGES_PER_QUERY); page++) {
      const html = await fetchFinderPage(finderPageUrl(baseUrl, page))
      checkedPages++
      const vod = twitchVodReferencesFromFinderHtml(html).find((row) => row.gameId === input.gameId)
      if (vod) return { gameId: input.gameId, finderUrl, vod, checkedPages }
      lastPage = twitchFinderLastPage(html)
    }
  }

  return { gameId: input.gameId, finderUrl, vod: null, checkedPages }
}

/**
 * Returns the Finder's public rows for a matchup query. Similar-match search
 * uses these rows as a long-tail source when the global games feed has already
 * rotated an older VOD-linked game out of its 1,000-game window.
 */
export async function findTwitchFinderReferences(
  input: TwitchVodFinderInput,
): Promise<TwitchVodReference[]> {
  const queries = [
    ...new Set([
      twitchVideoFinderUrl(input),
      twitchVideoFinderUrl({ ...input, durationSec: null }),
    ]),
  ]
  const references = new Map<string, TwitchVodReference>()
  for (const baseUrl of queries) {
    let lastPage = 1
    for (let page = 1; page <= Math.min(lastPage, MAX_PAGES_PER_QUERY); page++) {
      const html = await fetchFinderPage(finderPageUrl(baseUrl, page))
      for (const reference of twitchVodReferencesFromFinderHtml(html)) {
        references.set(reference.gameId, reference)
      }
      lastPage = twitchFinderLastPage(html)
    }
  }
  return [...references.values()]
}

/** Looks up one stored public game without exposing network access to the renderer. */
export async function findTwitchVod(input: unknown): Promise<IpcResult<TwitchVodLookupResult>> {
  if (!isTwitchVodFinderInput(input)) {
    return err('validation', 'A valid public AoE4World game id and civilization are required.')
  }
  const cacheKey = `${input.gameId}:${input.profileId ?? 'any'}`
  const cached = cache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) return ok(cached.value)

  let request = inFlight.get(cacheKey)
  if (!request) {
    request = lookup(input)
    inFlight.set(cacheKey, request)
  }

  try {
    const value = await request
    cache.set(cacheKey, {
      expiresAt: Date.now() + (value.vod ? CACHE_TTL_MS : NEGATIVE_CACHE_TTL_MS),
      value,
    })
    return ok(value)
  } catch (error) {
    return errFrom(error)
  } finally {
    if (inFlight.get(cacheKey) === request) inFlight.delete(cacheKey)
  }
}
