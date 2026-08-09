import { describe, expect, it } from 'vitest'
import {
  appendTinctureSnapshot,
  isTinctureHistoryStale,
  snapshotEnvelope,
  tinctureDelta,
  type TinctureHistoryDocument,
  type TinctureHistorySnapshot,
} from '../tinctureHistory'

const slice = {
  leaderboard: 'rm_solo',
  rankLevel: null,
  totalGames: 100,
  civs: [{ civ: 'english', civName: 'English', winRate: 50, pickRate: 10, games: 20 }],
}

const history: TinctureHistoryDocument = { schemaVersion: 1, maxSnapshots: 2, snapshots: [] }

describe('tincture history', () => {
  it('keeps a capped, time-ordered snapshot archive and computes deltas', () => {
    const first: TinctureHistorySnapshot = { capturedAt: '2026-08-08T00:00:00Z', slices: [slice] }
    const second: TinctureHistorySnapshot = {
      capturedAt: '2026-08-08T01:00:00Z',
      slices: [{ ...slice, civs: [{ ...slice.civs[0]!, winRate: 52, pickRate: 11, games: 30 }] }],
    }
    const document = appendTinctureSnapshot(appendTinctureSnapshot(history, first), second)

    expect(document.snapshots).toHaveLength(2)
    expect(tinctureDelta(document, second, 'rm_solo', null, 'english')).toEqual({
      winRate: 2,
      pickRate: 1,
      games: 10,
    })
  })

  it('flags missing and old data as stale', () => {
    expect(isTinctureHistoryStale(null)).toBe(true)
    expect(isTinctureHistoryStale('2026-08-06T20:00:00Z', Date.parse('2026-08-08T00:00:00Z'))).toBe(
      true,
    )
    expect(isTinctureHistoryStale('2026-08-07T23:00:00Z', Date.parse('2026-08-08T00:00:00Z'))).toBe(
      false,
    )
  })

  it('normalizes legacy meta documents into the v2 snapshot envelope', () => {
    const envelope = snapshotEnvelope({
      schemaVersion: 1,
      generatedAt: '2026-08-08T00:00:00Z',
      source: 'aoe4world',
      rankLevel: null,
      slices: [{ ...slice, patch: 'patch-1' }],
    })
    expect(envelope).toMatchObject({
      schemaVersion: 2,
      source: 'aoe4world',
      capturedAt: '2026-08-08T00:00:00Z',
      patch: 'patch-1',
    })
  })
})
