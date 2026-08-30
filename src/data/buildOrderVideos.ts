import type { BuildOrder } from '@domain/buildOrderSchema'
import { compactCivKey, videoTitleBelongsToCiv } from '@domain/videoEvidence'
import {
  canonicalVideoUrl,
  embeddedVideoFromUrl,
  mapVideoUrlsInText,
  videoUrlsFromBuild,
} from '@domain/videoEmbed'
import { BEASTY_VIDEOS } from './beastyCatalog.generated'
import { GUIDE_CATALOG } from './guideCatalog.generated'
import { VALDEMAR_VIDEOS } from './valdemarCatalog.generated'
import { videoEvidenceForCiv } from './videoEvidenceMap'

interface CatalogVideo {
  title: string
  primaryKeys: string[]
  url: string
}

const CATALOG_BY_ID: ReadonlyMap<string, CatalogVideo> = (() => {
  const map = new Map<string, CatalogVideo>()
  const remember = (id: string, title: string, url: string, primary: readonly string[]) => {
    const existing = map.get(id)
    const primaryKeys = primary.map((value) => compactCivKey(value)).filter(Boolean)
    if (!existing) {
      map.set(id, { title, primaryKeys, url })
      return
    }
    if (primaryKeys.length > existing.primaryKeys.length) {
      map.set(id, { title, primaryKeys, url })
    }
  }
  for (const video of BEASTY_VIDEOS) {
    remember(video.id, video.title, video.url, video.primaryCivs)
  }
  for (const video of VALDEMAR_VIDEOS) {
    remember(video.id, video.title, video.url, video.primaryCivs)
  }
  for (const video of GUIDE_CATALOG) {
    remember(video.id, video.title, video.url, [])
  }
  return map
})()

function civKeysForBuild(civilization: BuildOrder['civilization']): string[] {
  const labels = Array.isArray(civilization) ? civilization : [civilization]
  return [...new Set(labels.map((label) => compactCivKey(label)).filter(Boolean))]
}

function tidyLinkedText(value: string): string {
  return value
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/(?:,\s*){2,}/g, ', ')
    .replace(/^[\s,]+|[\s,]+$/g, '')
    .trim()
}

export function videoMatchesBuildCiv(
  videoId: string,
  civKeys: readonly string[],
  titleHint?: string,
): boolean {
  if (civKeys.length === 0) return false
  const catalog = CATALOG_BY_ID.get(videoId)
  if (catalog?.primaryKeys.length) {
    return catalog.primaryKeys.some((key) => civKeys.includes(key))
  }
  const title = catalog?.title ?? titleHint
  if (!title) return true
  return civKeys.some((key) => videoTitleBelongsToCiv(title, key))
}

function fallbackVideoUrl(civKeys: readonly string[]): string | null {
  for (const key of civKeys) {
    const match = BEASTY_VIDEOS.find(
      (video) =>
        video.aoe4Relevant !== false &&
        videoTitleBelongsToCiv(video.title, key) &&
        /\b(how to play|build order|masterclass)\b/i.test(video.title) &&
        (video.primaryCivs.length === 0 ||
          video.primaryCivs.some((slug) => compactCivKey(slug) === key)),
    )
    if (match) return match.url
  }
  return null
}

function sanitizeLinkedField(value: string | null | undefined, civKeys: string[]): string | null {
  if (!value) return value ?? null
  const next = tidyLinkedText(
    mapVideoUrlsInText(value, (url, video) =>
      videoMatchesBuildCiv(video.videoId, civKeys) ? (canonicalVideoUrl(url) ?? url) : null,
    ),
  )
  return next || null
}

function firstMatchingVideo(build: BuildOrder, civKeys: string[]): string | null {
  for (const url of videoUrlsFromBuild(build)) {
    const video = embeddedVideoFromUrl(url)
    if (video && videoMatchesBuildCiv(video.videoId, civKeys)) return url
  }
  return fallbackVideoUrl(civKeys)
}

/** Drop videos about a different civilization and fill a same-civ guide when needed. */
export function sanitizeBuildOrderVideos(build: BuildOrder): BuildOrder {
  const civKeys = civKeysForBuild(build.civilization)
  const description = sanitizeLinkedField(build.description, civKeys)
  const source = sanitizeLinkedField(build.source, civKeys)
  const cleaned: BuildOrder = {
    ...build,
    description,
    source: source ?? undefined,
    video: sanitizeLinkedField(build.video, civKeys),
  }
  const video = firstMatchingVideo(cleaned, civKeys)
  const keptSources = build.video_evidence?.sources.filter((sourceRow) =>
    videoMatchesBuildCiv(sourceRow.id, civKeys, sourceRow.title),
  )
  return {
    ...cleaned,
    video,
    video_evidence:
      keptSources && keptSources.length > 0
        ? { ...build.video_evidence!, sampleSize: keptSources.length, sources: keptSources }
        : videoEvidenceForCiv(build.civilization),
  }
}
