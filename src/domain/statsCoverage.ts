import type { LocalGameStats, PerPlayerMatchStats } from './analysis'
import type { PlayerSummary } from './statsSummary'

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

export type PlayerEvidenceLevel = 'full' | 'partial' | 'events-only' | 'unavailable'

export interface PlayerEvidenceCoverage {
  level: PlayerEvidenceLevel
  summaryReported: number
  summaryTotal: number
  counterReported: number
  counterTotal: number
  missing: string[]
}

/**
 * Reports the evidence actually available for one player. This is deliberately
 * field-oriented: a player row can exist while its economy or Relic counters
 * are missing, and those cases must not be presented as zeroes.
 */
export function playerEvidenceCoverage(
  player: PlayerSummary,
  counter?: PerPlayerMatchStats | null,
): PlayerEvidenceCoverage {
  const summaryChecks: [string, boolean][] = [
    ['summary totals', player.totals != null],
    ['build timeline', player.buildOrder.length > 0],
    ['economy timeline', player.resources.length >= 2],
    ['score timeline', player.scores.length >= 2],
    ['casualty timeline', player.casualties != null],
  ]
  const counterChecks: [string, boolean][] = [
    ['units produced', counter?.unitsProduced != null],
    ['kills', counter?.kills != null],
    ['losses', counter?.deaths != null],
    ['buildings', counter?.buildingsProduced != null],
    ['technology', counter?.techsResearched != null],
    ['APM', counter?.apm != null],
  ]
  const summaryReported = summaryChecks.filter(([, present]) => present).length
  const counterReported = counterChecks.filter(([, present]) => present).length
  const missing = [...summaryChecks, ...counterChecks]
    .filter(([, present]) => !present)
    .map(([label]) => label)
  const level: PlayerEvidenceLevel =
    summaryReported >= 4 && counterReported >= 5
      ? 'full'
      : summaryReported > 0 || counterReported > 0
        ? summaryReported >= 2 || counterReported >= 2
          ? 'partial'
          : 'events-only'
        : 'unavailable'
  return {
    level,
    summaryReported,
    summaryTotal: summaryChecks.length,
    counterReported,
    counterTotal: counterChecks.length,
    missing,
  }
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
