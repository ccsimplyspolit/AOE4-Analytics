export interface TinctureCivSnapshot {
  civ: string
  civName: string
  winRate: number
  pickRate: number
  games: number
}

export interface TinctureMetaSlice {
  leaderboard: string
  rankLevel: string | null
  totalGames: number
  civs: TinctureCivSnapshot[]
  /** AoE4World patch ids represented by this saved slice, when available. */
  patch?: string | null
}

export interface TinctureHistorySnapshot {
  schemaVersion?: 2
  source?: string
  capturedAt: string
  patch?: string | null
  slices: TinctureMetaSlice[]
}

export interface TinctureHistoryDocument {
  schemaVersion: 1 | 2
  maxSnapshots: number
  snapshots: TinctureHistorySnapshot[]
}

export interface TinctureMetaDocument {
  schemaVersion: 1 | 2
  generatedAt: string | null
  capturedAt?: string | null
  source: string
  patch?: string | null
  rankLevel: string | null
  slices: TinctureMetaSlice[]
}

export const TINCTURE_SNAPSHOT_SCHEMA_VERSION = 2 as const

/** Stable envelope used by both the current meta file and bounded history. */
export interface TinctureSnapshotEnvelope {
  schemaVersion: typeof TINCTURE_SNAPSHOT_SCHEMA_VERSION
  source: string
  capturedAt: string
  patch: string | null
  rankLevel: string | null
  slices: TinctureMetaSlice[]
}

export function snapshotEnvelope(document: TinctureMetaDocument): TinctureSnapshotEnvelope | null {
  const capturedAt = document.capturedAt ?? document.generatedAt
  if (!capturedAt) return null
  const patch =
    document.patch ??
    ([
      ...new Set(
        document.slices.map((slice) => slice.patch).filter((value): value is string => !!value),
      ),
    ].join(',') ||
      null)
  return {
    schemaVersion: TINCTURE_SNAPSHOT_SCHEMA_VERSION,
    source: document.source,
    capturedAt,
    patch,
    rankLevel: document.rankLevel,
    slices: document.slices,
  }
}

export type TinctureDelta = {
  winRate: number | null
  pickRate: number | null
  games: number | null
}

function sliceKey(leaderboard: string, rankLevel: string | null): string {
  return `${leaderboard}:${rankLevel ?? 'all'}`
}

/** Append a snapshot, replacing a same-timestamp snapshot and respecting the cap. */
export function appendTinctureSnapshot(
  document: TinctureHistoryDocument,
  snapshot: TinctureHistorySnapshot,
): TinctureHistoryDocument {
  const withoutSameTime = document.snapshots.filter(
    (item) => item.capturedAt !== snapshot.capturedAt,
  )
  const snapshots = [...withoutSameTime, snapshot]
    .sort((left, right) => left.capturedAt.localeCompare(right.capturedAt))
    .slice(-Math.max(1, document.maxSnapshots))
  return { ...document, snapshots }
}

/** Compare a civ with the immediately preceding snapshot of the same slice. */
export function tinctureDelta(
  document: TinctureHistoryDocument,
  current: TinctureHistorySnapshot,
  leaderboard: string,
  rankLevel: string | null,
  civ: string,
): TinctureDelta {
  const currentSlice = current.slices.find(
    (slice) => sliceKey(slice.leaderboard, slice.rankLevel) === sliceKey(leaderboard, rankLevel),
  )
  const previous = [...document.snapshots]
    .filter((snapshot) => snapshot.capturedAt < current.capturedAt)
    .sort((left, right) => right.capturedAt.localeCompare(left.capturedAt))
    .find((snapshot) =>
      snapshot.slices.some(
        (slice) =>
          sliceKey(slice.leaderboard, slice.rankLevel) === sliceKey(leaderboard, rankLevel),
      ),
    )
  const previousCiv = previous?.slices
    .find(
      (slice) => sliceKey(slice.leaderboard, slice.rankLevel) === sliceKey(leaderboard, rankLevel),
    )
    ?.civs.find((entry) => entry.civ === civ)
  const currentCiv = currentSlice?.civs.find((entry) => entry.civ === civ)
  if (!currentCiv || !previousCiv) return { winRate: null, pickRate: null, games: null }
  return {
    winRate: currentCiv.winRate - previousCiv.winRate,
    pickRate: currentCiv.pickRate - previousCiv.pickRate,
    games: currentCiv.games - previousCiv.games,
  }
}

export function isTinctureHistoryStale(
  generatedAt: string | null | undefined,
  now = Date.now(),
  maxAgeHours = 26,
): boolean {
  if (!generatedAt) return true
  const timestamp = Date.parse(generatedAt)
  return !Number.isFinite(timestamp) || now - timestamp > maxAgeHours * 60 * 60 * 1000
}
