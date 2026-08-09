import type { StatsLeaderboard } from '@api/types'
import type { MapStat } from './mapStats'

/** Queue family used by the live ranked rotation. */
export type RankedMapPoolQueue = 'solo' | 'team'

export type RankedMapPoolStatus = 'current' | 'stale'

export type RankedMapPoolRefreshStatus = 'bundled' | 'cached' | 'checked' | 'updated' | 'error'

export interface RankedMapPoolRefreshInfo {
  status: RankedMapPoolRefreshStatus
  lastCheckedAt: string | null
  lastError: string | null
}

/**
 * A dated, auditable map-pool snapshot.
 *
 * AoE4's monthly rotation is not exposed as a documented AoE4World API field.
 * Keeping the effective dates and source URLs next to the names prevents a
 * historical stats response from being presented as today's pool.
 */
export interface RankedMapPoolSnapshot {
  schemaVersion: 1
  snapshotId: string
  source: 'official-rotation-notice' | 'community-verified'
  sourceUrl: string
  supportingSourceUrl: string
  capturedAt: string
  effectiveFrom: string
  effectiveUntil: string
  patch: string | null
  /** Ranked season associated with this rotation when known. */
  season?: number | null
  solo: readonly string[]
  team: readonly string[]
}

export interface RankedMapPoolResolution {
  status: RankedMapPoolStatus
  snapshot: RankedMapPoolSnapshot
  queue: RankedMapPoolQueue
  maps: readonly string[]
  autoRefresh?: RankedMapPoolRefreshInfo
}

/**
 * Current verified rotation available in the application snapshot.
 *
 * The official 16.2 notes establish automatic rotation starting July 2 and at
 * the beginning of each month. The exact August rotation was cross-checked
 * against the current player-reported pool on 2026-08-09 and is deliberately
 * retained with provenance until a machine-readable first-party endpoint is
 * available.
 */
export const CURRENT_RANKED_MAP_POOL: RankedMapPoolSnapshot = {
  schemaVersion: 1,
  snapshotId: 'ranked-rotation-2026-08',
  source: 'community-verified',
  sourceUrl: 'https://www.reddit.com/r/aoe4/comments/1vdlnix/new_map_pool/',
  supportingSourceUrl: 'https://www.ageofempires.com/news/age-of-empires-iv-patch-16-2-10884/',
  capturedAt: '2026-08-09T00:00:00.000Z',
  effectiveFrom: '2026-08-02',
  effectiveUntil: '2026-09-01',
  patch: '16.2.10604–11308',
  season: 13,
  solo: [
    'Ancient Spires',
    'Dry Arabia',
    'Flankwoods',
    'Golden Heights',
    'Gorge',
    'Hidden Valley',
    'Ocean Gateway',
    'Relic River',
    'West Lake',
  ],
  team: [
    'Boulder Bay',
    'Cliffside',
    'Dry Arabia',
    'Flankwoods',
    'High View',
    'Highwoods',
    'Nagari',
    'Prairie',
    'The Pit',
  ],
}

function dateKey(value: Date): string {
  return value.toISOString().slice(0, 10)
}

/** Consistent matching for API names, UI labels and replay names. */
export function normalizeMapName(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function queueForLeaderboard(leaderboard: StatsLeaderboard): RankedMapPoolQueue | null {
  if (leaderboard === 'rm_solo') return 'solo'
  if (/^rm_[234]v[234]$/.test(leaderboard)) return 'team'
  return null
}

export function mapsForQueue(
  snapshot: RankedMapPoolSnapshot,
  queue: RankedMapPoolQueue,
): readonly string[] {
  return queue === 'solo' ? snapshot.solo : snapshot.team
}

/**
 * Resolve the latest bundled snapshot and make staleness explicit. A stale
 * snapshot is returned for diagnostics but must not be used to hide maps.
 */
export function resolveRankedMapPool(now = new Date()): RankedMapPoolResolution {
  return {
    ...resolveSnapshotForLeaderboard(CURRENT_RANKED_MAP_POOL, 'rm_solo', now)!,
  }
}

export function resolveSnapshotForLeaderboard(
  snapshot: RankedMapPoolSnapshot,
  leaderboard: StatsLeaderboard,
  now = new Date(),
): RankedMapPoolResolution | null {
  const queue = queueForLeaderboard(leaderboard)
  if (!queue) return null
  const today = dateKey(now)
  const status = today >= snapshot.effectiveFrom && today < snapshot.effectiveUntil ? 'current' : 'stale'
  return {
    status,
    snapshot,
    queue,
    maps: mapsForQueue(snapshot, queue),
  }
}

export function resolveForLeaderboard(
  leaderboard: StatsLeaderboard,
  now = new Date(),
): RankedMapPoolResolution | null {
  return resolveSnapshotForLeaderboard(CURRENT_RANKED_MAP_POOL, leaderboard, now)
}

export function filterMapStatsByPool(
  maps: readonly MapStat[],
  resolution: RankedMapPoolResolution | null,
): MapStat[] {
  if (!resolution || resolution.status !== 'current') return [...maps]
  const allowed = new Set(resolution.maps.map(normalizeMapName))
  return maps.filter((map) => allowed.has(normalizeMapName(map.map)))
}

export function isMapInPool(mapName: string, resolution: RankedMapPoolResolution | null): boolean {
  if (!resolution || resolution.status !== 'current') return true
  const normalized = normalizeMapName(mapName)
  return resolution.maps.some((map) => normalizeMapName(map) === normalized)
}
