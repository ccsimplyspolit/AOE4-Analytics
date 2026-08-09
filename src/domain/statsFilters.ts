import type { RankLevel, StatsLeaderboard } from '@api/types'

export interface StatsFilterOption {
  label: string
  value: string | undefined
}

/** Rank-level filters accepted by AoE4World's ranked statistics endpoints. */
export const RANK_FILTERS: readonly { label: string; value: RankLevel | undefined }[] = [
  { label: 'All ranks', value: undefined },
  { label: 'Bronze', value: 'bronze' },
  { label: 'Silver', value: 'silver' },
  { label: 'Gold', value: 'gold' },
  { label: 'Platinum', value: 'platinum' },
  { label: 'Diamond', value: 'diamond' },
  { label: 'Conqueror', value: 'conqueror' },
  { label: 'Bronze and Silver', value: '≤silver' },
  { label: 'Gold and above', value: '≥gold' },
  { label: 'Platinum and above', value: '≥platinum' },
  { label: 'Diamond and above', value: '≥diamond' },
  { label: 'Conqueror and above', value: '≥conqueror' },
  { label: 'Conqueror IV and above', value: '≥conqueror_4' },
]

/** Rating buckets exposed for ranked statistics. */
export const RANKED_RATING_FILTERS: readonly StatsFilterOption[] = [
  { label: 'All ratings', value: undefined },
  { label: '<499', value: '<499' },
  { label: '500-699', value: '500-699' },
  { label: '700-999', value: '700-999' },
  { label: '1000-1199', value: '1000-1199' },
  { label: '1200-1399', value: '1200-1399' },
  { label: '<699', value: '<699' },
  { label: '>700', value: '>700' },
  { label: '>1000', value: '>1000' },
  { label: '>1200', value: '>1200' },
  { label: '>1400', value: '>1400' },
  { label: '>1700', value: '>1700' },
]

/** Rating buckets exposed for Quick Match statistics. */
export const QUICK_MATCH_RATING_FILTERS: readonly StatsFilterOption[] = [
  { label: 'All ratings', value: undefined },
  { label: '<899', value: '<899' },
  { label: '900-999', value: '900-999' },
  { label: '1000-1099', value: '1000-1099' },
  { label: '1100-1199', value: '1100-1199' },
  { label: '1200-1299', value: '1200-1299' },
  { label: '1300-1399', value: '1300-1399' },
  { label: '>1100', value: '>1100' },
  { label: '>1200', value: '>1200' },
  { label: '>1300', value: '>1300' },
  { label: '>1400', value: '>1400' },
  { label: '>1500', value: '>1500' },
  { label: '>1600', value: '>1600' },
]

export function rankLevelFilterable(leaderboard: StatsLeaderboard): boolean {
  return leaderboard === 'rm_solo' || leaderboard.startsWith('rm_')
}

export function ratingFiltersForLeaderboard(
  leaderboard: StatsLeaderboard,
): readonly StatsFilterOption[] {
  return leaderboard.startsWith('qm_') ? QUICK_MATCH_RATING_FILTERS : RANKED_RATING_FILTERS
}

export function isAllowedRankLevel(value: unknown): value is RankLevel {
  return typeof value === 'string' && RANK_FILTERS.some((option) => option.value === value)
}

export function isAllowedRating(leaderboard: StatsLeaderboard, value: unknown): value is string {
  return (
    typeof value === 'string' &&
    ratingFiltersForLeaderboard(leaderboard).some((option) => option.value === value)
  )
}
