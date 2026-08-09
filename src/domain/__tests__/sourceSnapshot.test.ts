import { describe, expect, it } from 'vitest'
import {
  createSourceSnapshot,
  isSourceSnapshot,
  snapshotFreshness,
  SOURCE_SNAPSHOT_SCHEMA_VERSION,
} from '../sourceSnapshot'

describe('source snapshots', () => {
  it('creates a versioned provenance envelope', () => {
    const snapshot = createSourceSnapshot({
      sourceId: 'aoe4world-data',
      sourceUrl: 'https://github.com/aoe4world/data',
      sourceRevision: 'abc123',
      patch: '16.3',
      capturedAt: '2026-08-09T00:00:00Z',
      payload: { units: 205 },
    })

    expect(snapshot.schemaVersion).toBe(SOURCE_SNAPSHOT_SCHEMA_VERSION)
    expect(isSourceSnapshot(snapshot)).toBe(true)
  })

  it('never calls missing or invalid timestamps fresh', () => {
    expect(snapshotFreshness(null, { nowMs: 0 })).toBe('unknown')
    expect(snapshotFreshness('not-a-date', { nowMs: 0 })).toBe('unknown')
    expect(snapshotFreshness('2026-08-08T00:00:00Z', { nowMs: Date.parse('2026-08-09T00:00:00Z') })).toBe('fresh')
    expect(snapshotFreshness('2026-07-01T00:00:00Z', { nowMs: Date.parse('2026-08-09T00:00:00Z') })).toBe('stale')
  })
})
