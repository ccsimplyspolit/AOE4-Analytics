import type { CivMetaQuery, CivMetaResult, IpcResult, MatchupLabQuery } from '@ipc/contract'
import type { GlobalMatchupSummary } from '@domain/matchupLab'
import { buildGlobalMatchup, isMatchupCivilization } from '@domain/matchupLab'
import { buildTierList, type CivTier } from '@domain/tierList'
import { buildMapStats, type MapStat } from '@domain/mapStats'
import { filterMapStatsByPool, resolveForLeaderboard } from '@domain/rankedMapPool'
import type { RankLevel, StatsLeaderboard } from '@api/types'
import { getClient } from './appContext'
import { err, errFrom, ok } from './result'

const LEADERBOARDS = new Set<StatsLeaderboard>(['rm_solo', 'qm_1v1', 'rm_2v2', 'rm_3v3', 'rm_4v4'])
const RANKS = new Set<RankLevel>(['bronze', 'silver', 'gold', 'platinum', 'diamond', 'conqueror'])
/** Rating buckets accepted by AoE4World's Counter Calculator form. */
const RATINGS = new Set([
  '<699', '700-899', '900-999', '1000-1099', '1100-1199', '1200-1299', '1300-1399', '>1400',
  '>1100', '>1200', '>1300', '>1500', '>1600',
])

function safePatch(value: unknown): string | undefined {
  return typeof value === 'string' && /^[0-9]+(?:,[0-9]+)*$/.test(value) && value.length <= 64
    ? value
    : undefined
}

function rankFilterable(leaderboard: StatsLeaderboard): boolean {
  return leaderboard === 'rm_solo' || leaderboard === 'qm_1v1'
}

function parseMatchupLabQuery(input: unknown): MatchupLabQuery | null {
  if (!input || typeof input !== 'object') return null
  const query = input as Record<string, unknown>
  const civilization = query['civilization']
  const opponentCivilization = query['opponentCivilization']
  const leaderboard = query['leaderboard'] ?? 'rm_solo'
  const rankLevel = query['rankLevel']
  const rating = query['rating']
  const patch = query['patch']
  if (
    !isMatchupCivilization(civilization) ||
    !isMatchupCivilization(opponentCivilization) ||
    typeof leaderboard !== 'string' ||
    !LEADERBOARDS.has(leaderboard as StatsLeaderboard) ||
    (rankLevel != null && (typeof rankLevel !== 'string' || !RANKS.has(rankLevel as RankLevel))) ||
    (rating != null && (typeof rating !== 'string' || !RATINGS.has(rating))) ||
    (patch != null && safePatch(patch) == null)
  ) {
    return null
  }
  return {
    civilization,
    opponentCivilization,
    leaderboard: leaderboard as StatsLeaderboard,
    rankLevel: rankLevel as RankLevel | undefined,
    rating: rating as string | undefined,
    patch: safePatch(patch),
  }
}

/**
 * Civ meta explorer: global civ win/pick rates (as tiered, sortable rows) plus
 * map popularity/pace for the selected ladder + rank band. Maps are best-effort
 * — a ladder without a maps endpoint still returns the civ table.
 */
export async function getCivMeta(query: CivMetaQuery): Promise<IpcResult<CivMetaResult>> {
  try {
    const leaderboard = query.leaderboard ?? 'rm_solo'
    const rating = query.rating && RATINGS.has(query.rating) ? query.rating : undefined
    const patch = safePatch(query.patch)
    const civStats = await getClient().getCivStats({
      leaderboard,
      rankLevel: query.rankLevel,
      rating,
      patch,
    })
    const tier = buildTierList(civStats)

    const mapPool = resolveForLeaderboard(leaderboard)
    let maps: MapStat[] = []
    try {
      const mapStats = await getClient().getMapStats({
        leaderboard,
        rankLevel: query.rankLevel,
        rating,
        patch,
      })
      const allMaps = buildMapStats(mapStats)
      maps = query.mapPoolOnly === true ? filterMapStatsByPool(allMaps, mapPool) : allMaps
    } catch {
      maps = []
    }

    let mapCivs: CivTier[] | undefined
    let selectedMap: string | null = null
    const selectedMapIsVisible = maps.some((map) => map.mapId === query.mapId)
    if (Number.isSafeInteger(query.mapId) && query.mapId! > 0 && (!query.mapPoolOnly || selectedMapIsVisible)) {
      try {
        const mapResponse = await getClient().getMapCivStats(query.mapId!, {
          leaderboard,
          rankLevel: query.rankLevel,
          rating,
          patch,
        })
        mapCivs = buildTierList(mapResponse).civs
        selectedMap = mapResponse.map ?? null
      } catch {
        // The map pool can change between the overview and detail request. The
        // global slice is still useful, so keep the response successful.
      }
    }

    return ok({
      civs: tier.civs,
      maps,
      leaderboard: tier.leaderboard,
      rankLevel: tier.rankLevel,
      totalCivGames: tier.totalGames,
      patch: civStats.patch,
      mapCivs,
      selectedMap,
      mapPool,
    })
  } catch (e) {
    return errFrom(e)
  }
}

/** Filter-aware global matchup slice, sourced only from AoE4World's stats endpoint. */
export async function getMatchupLab(
  input: unknown,
): Promise<IpcResult<GlobalMatchupSummary | null>> {
  const query = parseMatchupLabQuery(input)
  if (!query) {
    return err('validation', 'Choose valid civilizations, leaderboard, and rank filters.')
  }

  const leaderboard = query.leaderboard ?? 'rm_solo'
  try {
    const response = await getClient().getMatchupStats({
      leaderboard,
      rankLevel: rankFilterable(leaderboard) ? query.rankLevel : undefined,
      rating: query.rating,
      patch: query.patch,
    })
    return ok(buildGlobalMatchup(response, query.civilization, query.opponentCivilization))
  } catch (error) {
    return errFrom(error)
  }
}
