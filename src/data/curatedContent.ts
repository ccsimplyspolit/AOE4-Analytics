import curatedSnapshot from './vendor/aoe4world-curated/content.json'

export interface CuratedContentItem {
  id: string
  title: string
  type: string
  tags: string[]
  creator: string | null
  creatorUrl: string | null
  civilizations: string[]
  relatedItems: string[]
  url: string
  description: string | null
  thumbnail: string | null
  featured: boolean
  youtube: {
    videoId: string | null
    channelId: string | null
    durationSec: number | null
  }
}

interface CuratedSnapshot {
  schemaVersion: number
  source: string
  sourceUrl: string
  sourceRevision?: string
  sourceCommitUrl?: string
  capturedAt: string
  items: CuratedContentItem[]
  counts: {
    items: number
    featured: number
    videos: number
    descriptions: number
    civilizations: number
  }
}

const SNAPSHOT = curatedSnapshot as CuratedSnapshot

export const CURATED_CONTENT: readonly CuratedContentItem[] = SNAPSHOT.items
export const CURATED_CONTENT_COUNTS = SNAPSHOT.counts
export const CURATED_CONTENT_CAPTURED_AT = SNAPSHOT.capturedAt
export const CURATED_CONTENT_SOURCE = SNAPSHOT.sourceUrl
export const CURATED_CONTENT_REVISION = SNAPSHOT.sourceRevision ?? null
export const CURATED_CONTENT_COMMIT_URL = SNAPSHOT.sourceCommitUrl ?? null

function normalized(value: string): string {
  return value
    .toLocaleLowerCase()
    .replace(/\b(dynasty|sultanate)\b/g, '')
    .replace(/[^a-z0-9]+/g, '')
}

/** Match curated display names to both API civ slugs and variant names. */
export function curatedCivMatches(itemCiv: string, requestedCiv: string): boolean {
  if (requestedCiv === 'all') return true
  // Upstream uses the literal "All" for generally useful coaching videos.
  // Include those alongside civ-specific material instead of hiding them as a
  // false mismatch when the player narrows the guide library to one civ.
  if (normalized(itemCiv) === 'all') return true
  const requestedCandidates = [requestedCiv]
  if (requestedCiv.includes('_')) requestedCandidates.push(requestedCiv.replaceAll('_', ' '))
  const item = normalized(itemCiv)
  return requestedCandidates.some((candidate) => normalized(candidate) === item)
}

export function curatedContentForCiv(
  civilization: string,
  items: readonly CuratedContentItem[] = CURATED_CONTENT,
): CuratedContentItem[] {
  return items.filter((item) =>
    item.civilizations.some((itemCiv) => curatedCivMatches(itemCiv, civilization)),
  )
}

export function searchCuratedContent(
  query: string,
  civilization = 'all',
  items: readonly CuratedContentItem[] = CURATED_CONTENT,
): CuratedContentItem[] {
  const needle = query.trim().toLocaleLowerCase()
  return curatedContentForCiv(civilization, items).filter((item) => {
    if (!needle) return true
    return [
      item.title,
      item.type,
      item.creator ?? '',
      item.description ?? '',
      ...item.tags,
      ...item.civilizations,
      ...item.relatedItems,
    ]
      .join(' ')
      .toLocaleLowerCase()
      .includes(needle)
  })
}
