import type { LocalGameStats, PerPlayerMatchStats } from './analysis'

/** Minimal match shape used to explain which personal metrics have evidence. */
export interface CoverageGame {
  result: 'win' | 'loss' | null
  rating: number | null
  ratingDiff: number | null
  local?: LocalGameStats
  perPlayer?: readonly PerPlayerMatchStats[]
}

export interface StatsCoverage {
  total: number
  decided: number
  rated: number
  counters: number
  economy: number
}

/**
 * Counts evidence coverage without treating missing values as zero.
 * Economy requires an actual villager or resource total; a lone game clock
 * from a local log is not enough to claim that economy data is present.
 */
export function computeStatsCoverage(
  games: readonly CoverageGame[],
  profileId: number | null,
): StatsCoverage {
  return {
    total: games.length,
    decided: games.filter((game) => game.result === 'win' || game.result === 'loss').length,
    rated: games.filter((game) => game.rating != null || game.ratingDiff != null).length,
    counters:
      profileId == null
        ? 0
        : games.filter((game) => game.perPlayer?.some((player) => player.profileId === profileId))
            .length,
    economy: games.filter(
      (game) => game.local?.villagersProduced != null || game.local?.resourcesGathered != null,
    ).length,
  }
}
