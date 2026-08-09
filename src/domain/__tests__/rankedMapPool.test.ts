import { describe, expect, it } from 'vitest'
import {
  CURRENT_RANKED_MAP_POOL,
  filterMapStatsByPool,
  isMapInPool,
  normalizeMapName,
  resolveForLeaderboard,
} from '../rankedMapPool'

describe('ranked map pool', () => {
  it('normalizes display names consistently', () => {
    expect(normalizeMapName('  The Pit ')).toBe('the pit')
    expect(normalizeMapName('Cráteres')).toBe('crateres')
  })

  it('selects solo and team rotations for ranked queues', () => {
    const solo = resolveForLeaderboard('rm_solo', new Date('2026-08-09T12:00:00Z'))
    const team = resolveForLeaderboard('rm_4v4', new Date('2026-08-09T12:00:00Z'))
    expect(solo?.status).toBe('current')
    expect(solo?.maps).toContain('Ocean Gateway')
    expect(team?.maps).toContain('The Pit')
    expect(team?.maps).not.toContain('Ocean Gateway')
  })

  it('does not classify quick match as ranked rotation', () => {
    expect(resolveForLeaderboard('qm_1v1', new Date('2026-08-09T12:00:00Z'))).toBeNull()
  })

  it('does not filter with a stale snapshot', () => {
    const stale = resolveForLeaderboard('rm_solo', new Date('2026-09-02T12:00:00Z'))
    expect(stale?.status).toBe('stale')
    expect(isMapInPool('A map not in the snapshot', stale)).toBe(true)
    expect(filterMapStatsByPool([{ mapId: 1, map: 'A map not in the snapshot', games: 1, pickRate: 1, durationAverageSec: 1, durationMedianSec: 1, bestCiv: null, bestCivName: null }], stale)).toHaveLength(1)
  })

  it('keeps the snapshot provenance explicit', () => {
    expect(CURRENT_RANKED_MAP_POOL.sourceUrl).toContain('reddit.com')
    expect(CURRENT_RANKED_MAP_POOL.supportingSourceUrl).toContain('ageofempires.com')
  })
})
