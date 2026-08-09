/** Shared provenance helpers for all bundled or locally captured source data. */

export const SOURCE_SNAPSHOT_SCHEMA_VERSION = 1 as const

export type SnapshotFreshness = 'fresh' | 'aging' | 'stale' | 'unknown'

export interface SourceSnapshot<T> {
  schemaVersion: typeof SOURCE_SNAPSHOT_SCHEMA_VERSION
  sourceId: string
  sourceUrl: string
  sourceRevision: string | null
  patch: string | null
  capturedAt: string
  payload: T
}

export function createSourceSnapshot<T>(input: {
  sourceId: string
  sourceUrl: string
  sourceRevision?: string | null
  patch?: string | null
  capturedAt?: string
  payload: T
}): SourceSnapshot<T> {
  return {
    schemaVersion: SOURCE_SNAPSHOT_SCHEMA_VERSION,
    sourceId: input.sourceId,
    sourceUrl: input.sourceUrl,
    sourceRevision: input.sourceRevision ?? null,
    patch: input.patch ?? null,
    capturedAt: input.capturedAt ?? new Date().toISOString(),
    payload: input.payload,
  }
}

/** Classify source age without treating an unavailable timestamp as current. */
export function snapshotFreshness(
  capturedAt: string | null | undefined,
  options: { nowMs?: number; agingDays?: number; staleDays?: number } = {},
): SnapshotFreshness {
  if (!capturedAt) return 'unknown'
  const timestamp = Date.parse(capturedAt)
  if (!Number.isFinite(timestamp)) return 'unknown'
  const ageMs = Math.max(0, (options.nowMs ?? Date.now()) - timestamp)
  const agingDays = Math.max(1, options.agingDays ?? 7)
  const staleDays = Math.max(agingDays, options.staleDays ?? 30)
  if (ageMs <= agingDays * 86_400_000) return 'fresh'
  if (ageMs <= staleDays * 86_400_000) return 'aging'
  return 'stale'
}

export function isSourceSnapshot(value: unknown): value is SourceSnapshot<unknown> {
  if (!value || typeof value !== 'object') return false
  const snapshot = value as Record<string, unknown>
  return (
    snapshot.schemaVersion === SOURCE_SNAPSHOT_SCHEMA_VERSION &&
    typeof snapshot.sourceId === 'string' &&
    typeof snapshot.sourceUrl === 'string' &&
    (snapshot.sourceRevision == null || typeof snapshot.sourceRevision === 'string') &&
    (snapshot.patch == null || typeof snapshot.patch === 'string') &&
    typeof snapshot.capturedAt === 'string' &&
    'payload' in snapshot
  )
}
