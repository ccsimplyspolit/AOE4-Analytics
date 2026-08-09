import type { CivStatEntry, CivStatsResponse } from '../api/types'
import { civDisplayName } from './civ'
import { round1 } from './form'

export type Tier = 'Z' | 'S' | 'A' | 'B' | 'C' | 'D'
export const TIERS: Tier[] = ['Z', 'S', 'A', 'B', 'C', 'D']

export interface CivTier {
  civ: string
  civName: string
  tier: Tier
  winRate: number
  pickRate: number
  games: number
  lowSample: boolean
}

export interface TierListResult {
  civs: CivTier[]
  byTier: Record<Tier, CivTier[]>
  methodology: string
  leaderboard: string
  rankLevel: string | null
  totalGames: number
}

/** Win-rate cut points (inclusive lower bound) for each tier. */
export const TIER_BANDS: { tier: Tier; minWinRate: number }[] = [
  { tier: 'Z', minWinRate: 54 },
  { tier: 'S', minWinRate: 52.5 },
  { tier: 'A', minWinRate: 51 },
  { tier: 'B', minWinRate: 49 },
  { tier: 'C', minWinRate: 47.5 },
  { tier: 'D', minWinRate: Number.NEGATIVE_INFINITY },
]

export function tierForWinRate(winRate: number): Tier {
  for (const band of TIER_BANDS) {
    if (winRate >= band.minWinRate) return band.tier
  }
  return 'D'
}

/**
 * Combines map-specific civ slices into one pool-weighted stats response.
 * AoE4World exposes exact games and a high-precision win rate for each civ on
 * each map. The map endpoint omits win_count, so wins are reconstructed from
 * win_rate × games_count when that optional field is absent. This keeps the
 * aggregation finite and avoids treating a rarely played map as equal to Dry
 * Arabia.
 */
export function aggregateCivStatsByMapPool(
  slices: readonly CivStatsResponse[],
): CivStatsResponse | null {
  const first = slices[0]
  if (!first || slices.length === 0) return null

  type Accumulator = {
    civilization: string
    winCount: number
    gamesCount: number
    playerGamesCount: number
    durationMedianWeighted: number
    durationAverageWeighted: number
  }
  const byCiv = new Map<string, Accumulator>()

  for (const slice of slices) {
    for (const entry of slice.data) {
      const winCount =
        entry.win_count ??
        (Number.isFinite(entry.win_rate) ? (entry.win_rate / 100) * entry.games_count : 0)
      const current = byCiv.get(entry.civilization) ?? {
        civilization: entry.civilization,
        winCount: 0,
        gamesCount: 0,
        playerGamesCount: 0,
        durationMedianWeighted: 0,
        durationAverageWeighted: 0,
      }
      current.winCount += winCount
      current.gamesCount += entry.games_count
      current.playerGamesCount += entry.player_games_count
      current.durationMedianWeighted += entry.duration_median * entry.games_count
      current.durationAverageWeighted += entry.duration_average * entry.games_count
      byCiv.set(entry.civilization, current)
    }
  }

  const totalPlayerGames = [...byCiv.values()].reduce(
    (sum, entry) => sum + entry.playerGamesCount,
    0,
  )
  const data: CivStatEntry[] = [...byCiv.values()].map((entry) => ({
    civilization: entry.civilization,
    win_rate: entry.gamesCount > 0 ? (entry.winCount / entry.gamesCount) * 100 : 0,
    pick_rate: totalPlayerGames > 0 ? (entry.playerGamesCount / totalPlayerGames) * 100 : 0,
    // Map slices currently omit win_count; round only the reconstructed
    // display counter while keeping win_rate based on the unrounded total.
    win_count: Math.round(entry.winCount),
    games_count: entry.gamesCount,
    player_games_count: entry.playerGamesCount,
    duration_median: entry.gamesCount > 0 ? entry.durationMedianWeighted / entry.gamesCount : 0,
    duration_average: entry.gamesCount > 0 ? entry.durationAverageWeighted / entry.gamesCount : 0,
  }))

  return {
    leaderboard: first.leaderboard,
    rank_level: first.rank_level,
    rating: first.rating,
    patch: first.patch,
    data,
  }
}

const METHODOLOGY =
  'Tiers are assigned from live win rate at the selected rank bracket — the clearest single ' +
  'signal of how effective a civ is right now. Bands: Z ≥ 54% (dominant), S ≥ 52.5%, A ≥ 51%, ' +
  'B ≥ 49%, C ≥ 47.5%, D below. Pick rate is shown for meta context but does not change the ' +
  'tier. Civs with a small ' +
  'sample are flagged — their win rate is noisier. This is descriptive of the current meta, not ' +
  'a statement about a civ’s ceiling; at beginner level, fundamentals matter far more than civ choice.'

export interface TierListOptions {
  /** Below this many games a civ is flagged as low-sample. */
  minGames?: number
}

/** Builds a tier list from the AoE4World civ-stats response. */
export function buildTierList(
  stats: CivStatsResponse,
  options: TierListOptions = {},
): TierListResult {
  const minGames = options.minGames ?? 150
  const civs: CivTier[] = stats.data
    .map((d) => ({
      civ: d.civilization,
      civName: civDisplayName(d.civilization),
      // Tier from the ROUNDED win rate so it agrees with the % shown (a raw
      // 50.99% civ displays "51%" and belongs in A, not B).
      tier: tierForWinRate(round1(d.win_rate)),
      winRate: round1(d.win_rate),
      pickRate: round1(d.pick_rate),
      games: d.games_count,
      lowSample: d.games_count < minGames,
    }))
    .sort((a, b) => b.winRate - a.winRate || a.civName.localeCompare(b.civName))

  const byTier = Object.fromEntries(TIERS.map((t) => [t, [] as CivTier[]])) as Record<
    Tier,
    CivTier[]
  >
  for (const civ of civs) byTier[civ.tier].push(civ)

  return {
    civs,
    byTier,
    methodology: METHODOLOGY,
    leaderboard: stats.leaderboard,
    rankLevel: stats.rank_level,
    totalGames: stats.data.reduce((s, d) => s + d.games_count, 0),
  }
}
