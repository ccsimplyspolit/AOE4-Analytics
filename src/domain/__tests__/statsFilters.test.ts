import { describe, expect, it } from 'vitest'
import {
  RANK_FILTERS,
  isAllowedRankLevel,
  isAllowedRating,
  rankLevelFilterable,
  ratingFiltersForLeaderboard,
} from '../statsFilters'

describe('AoE4World stats filters', () => {
  it('contains the complete grouped rank filter set', () => {
    expect(RANK_FILTERS.map((option) => option.value)).toEqual([
      undefined,
      'bronze',
      'silver',
      'gold',
      'platinum',
      'diamond',
      'conqueror',
      '≤silver',
      '≥gold',
      '≥platinum',
      '≥diamond',
      '≥conqueror',
      '≥conqueror_4',
    ])
  })

  it('keeps ranked and quick-match rating buckets separate', () => {
    expect(ratingFiltersForLeaderboard('rm_solo').map((option) => option.value)).toContain('<499')
    expect(ratingFiltersForLeaderboard('qm_1v1').map((option) => option.value)).toContain('<899')
    expect(ratingFiltersForLeaderboard('qm_4v4').map((option) => option.value)).toContain('<899')
    expect(isAllowedRating('rm_solo', '<899')).toBe(false)
    expect(isAllowedRating('qm_1v1', '<899')).toBe(true)
    expect(isAllowedRating('qm_4v4', '<899')).toBe(true)
  })

  it('exposes rank bands on every ranked queue, but not Quick Match', () => {
    expect(rankLevelFilterable('rm_solo')).toBe(true)
    expect(rankLevelFilterable('rm_4v4')).toBe(true)
    expect(rankLevelFilterable('qm_1v1')).toBe(false)
    expect(rankLevelFilterable('qm_4v4')).toBe(false)
  })

  it('accepts API rank thresholds and rejects arbitrary values', () => {
    expect(isAllowedRankLevel('≥conqueror_4')).toBe(true)
    expect(isAllowedRankLevel('gold_2')).toBe(false)
    expect(isAllowedRankLevel('master')).toBe(false)
  })
})
