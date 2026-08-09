import type { BuildCatalogEntry } from './buildCatalog'
import { classifyPatch } from './patchAudit'
import { normalizeMapName } from './rankedMapPool'
import { fuzzyMatches } from './fuzzySearch'

export type BuildPatchFilter = 'all' | 'current' | 'unversioned' | 'legacy' | `patch:${string}`
export type BuildSeasonFilter = 'all' | 'current' | 'unversioned' | `season:${number}`
/**
 * A current ranked pool, or one concrete map from that pool.  The concrete
 * variant keeps the guide archive useful when a player already knows the map
 * from the match-found / current-game screens.
 */
export type BuildMapPoolFilter = 'all' | 'solo' | 'team' | `map:${string}`

export interface BuildLibraryFilterContext {
  currentPatch: string | null
  currentSeason: number | null
  soloMaps: readonly string[]
  teamMaps: readonly string[]
}

export interface BuildArchiveTextFilters {
  query?: string
  civilization?: string
  opponentCivilization?: string
  origin?: string
}

/** Shared text/provenance predicate for the public library and personal Cellar. */
export function matchesBuildArchiveTextFilters(
  entry: BuildCatalogEntry,
  filters: BuildArchiveTextFilters,
): boolean {
  if (filters.civilization && !entry.civilizationLabels.includes(filters.civilization)) {
    return false
  }
  if (
    filters.opponentCivilization &&
    !entry.opponentCivilizationLabels.includes(filters.opponentCivilization)
  ) {
    return false
  }
  if (filters.origin && entry.origin !== filters.origin) return false
  const needle = filters.query?.trim().toLocaleLowerCase() ?? ''
  return !needle || fuzzyMatches(entry.searchText, needle)
}

/** A build is video-backed when it has either a direct provider link or harvested evidence. */
export function hasBuildVideo(entry: Pick<BuildCatalogEntry, 'videoUrl' | 'hasVideoEvidence'>): boolean {
  return Boolean(entry.videoUrl || entry.hasVideoEvidence)
}

const MAP_ARCHETYPE_TAGS = new Set(['open', 'closed', 'hybrid', 'water', 'nomad', 'mixed'])

function mapMatchesPool(map: string | null, pool: readonly string[]): boolean {
  // Older community builds often store Open/Closed/Hybrid instead of an exact
  // map. Keep those useful builds visible and avoid claiming a false mismatch.
  if (!map || MAP_ARCHETYPE_TAGS.has(normalizeMapName(map))) return true
  if (pool.length === 0) return true
  const wanted = normalizeMapName(map)
  return pool.some((candidate) => normalizeMapName(candidate) === wanted)
}

function mapMatchesExact(map: string | null, requestedMap: string): boolean {
  // Do not treat broad archetype tags such as "Open" as a claim that a guide
  // was written for a particular ladder map. They remain available in a pool
  // view, but an exact-map view should be precise.
  if (!map || MAP_ARCHETYPE_TAGS.has(normalizeMapName(map))) return false
  return normalizeMapName(map) === normalizeMapName(requestedMap)
}

export function matchesBuildLibraryFilters(
  entry: BuildCatalogEntry,
  filters: {
    patch: BuildPatchFilter
    season: BuildSeasonFilter
    mapPool: BuildMapPoolFilter
  },
  context: BuildLibraryFilterContext,
): boolean {
  if (filters.patch !== 'all') {
    const coverage = classifyPatch(entry.patch, context.currentPatch)
    if (filters.patch === 'current' && coverage !== 'covered') return false
    if (filters.patch === 'unversioned' && coverage !== 'unversioned') return false
    if (filters.patch === 'legacy' && coverage !== 'legacy') return false
    if (filters.patch.startsWith('patch:') && entry.patch !== filters.patch.slice('patch:'.length)) {
      return false
    }
  }

  // An unversioned build cannot be proven stale. Keep it visible in the
  // current-season view and let the explicit "unversioned" filter distinguish
  // it; only a known, different season is excluded.
  if (
    filters.season === 'current' &&
    entry.build.season != null &&
    entry.build.season !== context.currentSeason
  ) {
    return false
  }
  if (filters.season === 'unversioned' && entry.build.season != null) return false
  if (filters.season.startsWith('season:')) {
    const season = Number(filters.season.slice('season:'.length))
    if (!Number.isSafeInteger(season) || entry.build.season !== season) return false
  }

  if (filters.mapPool === 'solo' && !mapMatchesPool(entry.map, context.soloMaps)) return false
  if (filters.mapPool === 'team' && !mapMatchesPool(entry.map, context.teamMaps)) return false
  if (filters.mapPool.startsWith('map:')) {
    const requestedMap = filters.mapPool.slice('map:'.length)
    if (!requestedMap || !mapMatchesExact(entry.map, requestedMap)) return false
  }

  return true
}
