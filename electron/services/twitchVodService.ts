import { REQUEST_TIMEOUT_MS, USER_AGENT } from '@api/client'
import { fetchWithTimeout } from '@api/fetchWithTimeout'
import { RateLimiter } from '@api/rateLimiter'
import {
  isTwitchVodFinderInput,
  twitchFinderLastPage,
  twitchVideoFinderUrl,
  twitchVodReferencesFromFinderHtml,
  type TwitchVodFinderInput,
  type TwitchVodLookupResult,
} from '@domain/twitchVodFinder'
import type { IpcResult } from '@ipc/contract'
import { err, errFrom, ok } from './result'

/**
 * The Finder is an HTML tool rather than a public API. Keep this conservative:
 * three narrow pages, then one looser duration fallback. This is enough to
 * validate an exact game id without crawling AoE4World or inventing a VOD.
 */
const MAX_PAGES_PER_QUERY = 3
const CACHE_TTL_MS = 5 * 60_000
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

async function lookup(input: TwitchVodFinderInput): Promise<TwitchVodLookupResult> {
  const finderUrl = twitchVideoFinderUrl(input)
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

/** Looks up one stored public game without exposing network access to the renderer. */
export async function findTwitchVod(input: unknown): Promise<IpcResult<TwitchVodLookupResult>> {
  if (!isTwitchVodFinderInput(input)) {
    return err('validation', 'A valid public AoE4World game id and civilization are required.')
  }
  const cached = cache.get(input.gameId)
  if (cached && cached.expiresAt > Date.now()) return ok(cached.value)

  let request = inFlight.get(input.gameId)
  if (!request) {
    request = lookup(input)
    inFlight.set(input.gameId, request)
  }

  try {
    const value = await request
    cache.set(input.gameId, { expiresAt: Date.now() + CACHE_TTL_MS, value })
    return ok(value)
  } catch (error) {
    return errFrom(error)
  } finally {
    if (inFlight.get(input.gameId) === request) inFlight.delete(input.gameId)
  }
}
