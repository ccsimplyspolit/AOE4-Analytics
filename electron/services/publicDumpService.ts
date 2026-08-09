import { REQUEST_TIMEOUT_MS, USER_AGENT } from '@api/client'
import { fetchWithTimeout } from '@api/fetchWithTimeout'
import type { PublicDumpCatalog, PublicDumpEntry, IpcResult } from '@ipc/contract'
import { err, ok } from './result'

const DUMPS_URL = 'https://aoe4world.com/dumps'
const STORAGE_HOST = 'storage.googleapis.com'
const CACHE_TTL_MS = 15 * 60_000

let cached: { expiresAt: number; value: PublicDumpCatalog } | null = null

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_match, code: string) => {
      const value = Number(code)
      return Number.isSafeInteger(value) ? String.fromCodePoint(value) : ''
    })
}

function stripHtml(value: string): string {
  return decodeEntities(value.replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()
}

function safeDumpUrl(value: string): string | null {
  try {
    const url = new URL(decodeEntities(value))
    if (url.protocol !== 'https:' || url.hostname !== STORAGE_HOST) return null
    return url.toString()
  } catch {
    return null
  }
}

function categoryFor(title: string): PublicDumpEntry['category'] {
  const normalized = title.toLocaleLowerCase()
  if (normalized.startsWith('games')) return 'games'
  if (normalized.startsWith('leaderboard')) return 'leaderboards'
  return 'other'
}

function sizeFor(title: string): string | null {
  return title.match(/\b\d+(?:\.\d+)?\s*(?:kb|mb|gb)\b/i)?.[0] ?? null
}

function ageFor(title: string): string | null {
  return (
    title.match(
      /\b(?:(?:over|about|almost)\s+)?(?:\d+|a|an)\s+(?:minute|hour|day|week|month|year)s?\s+ago\b|\b(?:today|yesterday)\b/i,
    )?.[0] ?? null
  )
}

/** Parses storage links rendered by the public AoE4World dumps page. */
export function parsePublicDumpCatalogHtml(html: string): PublicDumpEntry[] {
  const entries: PublicDumpEntry[] = []
  const seen = new Set<string>()
  const links = /<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi

  for (const match of html.matchAll(links)) {
    const url = safeDumpUrl(match[1] ?? '')
    if (!url || seen.has(url)) continue
    const title = stripHtml(match[2] ?? '')
    if (!title) continue
    seen.add(url)
    entries.push({
      title,
      url,
      category: categoryFor(title),
      size: sizeFor(title),
      age: ageFor(title),
    })
  }
  return entries
}

export async function getPublicDumpCatalog(): Promise<IpcResult<PublicDumpCatalog>> {
  if (cached && cached.expiresAt > Date.now()) return ok(cached.value)

  try {
    const response = await fetchWithTimeout(
      globalThis.fetch.bind(globalThis),
      DUMPS_URL,
      { headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml' } },
      REQUEST_TIMEOUT_MS,
    )
    if (!response.ok)
      return err('api', `AoE4World dumps returned ${response.status}`, response.status)

    const entries = parsePublicDumpCatalogHtml(await response.text())
    if (entries.length === 0) {
      return err('api', 'AoE4World dumps page did not contain public storage links.')
    }

    const value: PublicDumpCatalog = {
      sourceUrl: DUMPS_URL,
      capturedAt: new Date().toISOString(),
      entries,
    }
    cached = { expiresAt: Date.now() + CACHE_TTL_MS, value }
    return ok(value)
  } catch (error) {
    return err('network', error instanceof Error ? error.message : String(error))
  }
}
