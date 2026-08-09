import { parseDuration } from './format'
import type { BuildOrder } from './buildOrderSchema'

export type BuildCatalogOrigin = 'curated' | 'house' | 'imported' | 'video'

export interface BuildCatalogEntry {
  id: string
  build: BuildOrder
  origin: BuildCatalogOrigin
  civilizationLabels: string[]
  opponentCivilizationLabels: string[]
  sourceUrl: string | null
  provider: string | null
  strategy: string | null
  map: string | null
  videoUrl: string | null
  score: number | null
  views: number | null
  patch: string | null
  updatedAt: string | null
  confidence: number | null
  sampleSize: number | null
  stepCount: number
  durationSec: number | null
  timedSteps: number
  hasVideoEvidence: boolean
  searchText: string
}

function labelsForBuild(build: BuildOrder): string[] {
  return Array.isArray(build.civilization) ? build.civilization : [build.civilization]
}

function opponentLabelsForBuild(build: BuildOrder): string[] {
  if (build.opponentCivilization == null) return []
  return Array.isArray(build.opponentCivilization)
    ? build.opponentCivilization
    : [build.opponentCivilization]
}

function originForBuild(build: BuildOrder): BuildCatalogOrigin {
  if (build.origin) return build.origin
  if (build.source?.includes('aoe4guides.com')) return 'curated'
  if (build.source?.includes('rtslytics.app')) return 'house'
  return 'imported'
}

function slug(value: string): string {
  return value
    .toLocaleLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function hash(value: string): string {
  let result = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index)
    result = Math.imul(result, 16777619)
  }
  return (result >>> 0).toString(36)
}

function fingerprint(build: BuildOrder): string {
  return JSON.stringify({
    source: build.origin === 'video' ? (build.providerId ?? build.source ?? build.name) : null,
    civilization: labelsForBuild(build)
      .map((value) => slug(value))
      .sort(),
    opponentCivilization: opponentLabelsForBuild(build)
      .map((value) => slug(value))
      .sort(),
    steps: build.build_order.map((step) => ({
      age: step.age,
      time: step.time ?? null,
      villagers: step.villager_count,
      resources: step.resources,
      notes: step.notes.map((note) => note.trim().toLocaleLowerCase()),
    })),
  })
}

function durationForBuild(build: BuildOrder): number | null {
  const durations = build.build_order
    .map((step) => (step.time ? parseDuration(step.time) : null))
    .filter((value): value is number => value != null)
  return durations.length > 0 ? Math.max(...durations) : null
}

function metadataNumber(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

/** Convert raw build orders into the archive model used by Tincture. */
export function buildCatalogEntries(builds: BuildOrder[]): BuildCatalogEntry[] {
  const seen = new Set<string>()
  const entries: BuildCatalogEntry[] = []

  for (const build of builds) {
    const key = fingerprint(build)
    if (seen.has(key)) continue
    seen.add(key)

    const labels = labelsForBuild(build)
    const opponentLabels = opponentLabelsForBuild(build)
    const timedSteps = build.build_order.filter(
      (step) => step.time && parseDuration(step.time) != null,
    ).length
    const searchText = [
      build.name,
      ...labels,
      ...opponentLabels,
      build.author,
      build.archetype,
      build.difficulty,
      build.description,
      build.strategy,
      build.map,
      build.provider,
      build.patch,
      build.origin,
      build.transcriptText,
      ...(build.tactics?.flatMap((tactic) => [tactic.title, tactic.detail]) ?? []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase()

    entries.push({
      id: `${slug(labels[0] ?? 'unknown')}-${slug(build.name)}-${hash(key)}`,
      build,
      origin: originForBuild(build),
      civilizationLabels: labels,
      opponentCivilizationLabels: opponentLabels,
      sourceUrl: build.source ?? null,
      provider: build.provider ?? null,
      strategy: build.strategy ?? null,
      map: build.map ?? null,
      videoUrl: build.video ?? null,
      score: metadataNumber(build.score),
      views: metadataNumber(build.views),
      patch: build.patch ?? null,
      updatedAt: build.updatedAt ?? null,
      confidence: metadataNumber(build.confidence),
      sampleSize: metadataNumber(build.sampleSize),
      stepCount: build.build_order.length,
      durationSec: durationForBuild(build),
      timedSteps,
      hasVideoEvidence: build.video_evidence != null,
      searchText,
    })
  }

  return entries
}
