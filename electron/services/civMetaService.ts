import type {
  CivMetaQuery,
  CivMetaResult,
  IpcResult,
  MatchupLabQuery,
  PoolMapCivRanking,
} from '@ipc/contract'
import type { GlobalMatchupSummary } from '@domain/matchupLab'
import {
  buildGlobalMatchup,
  isGlobalMatchupLeaderboard,
  isMatchupCivilization,
} from '@domain/matchupLab'
import { aggregateCivStatsByMapPool, buildTierList, type CivTier } from '@domain/tierList'
import { buildMapStats, type MapStat } from '@domain/mapStats'
import { filterMapStatsByPool } from '@domain/rankedMapPool'
import type { StatsLeaderboard } from '@api/types'
import { isAllowedRankLevel, isAllowedRating, rankLevelFilterable } from '@domain/statsFilters'
import { getClient } from './appContext'
import { getRankedMapPoolResolution } from './rankedMapPoolService'
import { err, errFrom, ok } from './result'

const LEADERBOARDS = new Set<StatsLeaderboard>([
  'rm_solo',
  'qm_1v1',
  'rm_2v2',
  'rm_3v3',
  'rm_4v4',
  'qm_2v2',
  'qm_3v3',
  'qm_4v4',
])

function safePatch(value: unknown): string | undefined {
  return typeof value === 'string' && /^[0-9]+(?:,[0-9]+)*$/.test(value) && value.length <= 64
    ? value
    : undefined
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
    (rankLevel != null && !isAllowedRankLevel(rankLevel)) ||
    (rating != null &&
      (typeof leaderboard !== 'string' ||
        !isAllowedRating(leaderboard as StatsLeaderboard, rating))) ||
    (patch != null && safePatch(patch) == null)
  ) {
    return null
  }
  return {
    civilization,
    opponentCivilization,
    leaderboard: leaderboard as StatsLeaderboard,
    rankLevel: rankLevel as MatchupLabQuery['rankLevel'],
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
    const rankLevel =
      rankLevelFilterable(leaderboard) && isAllowedRankLevel(query.rankLevel)
        ? query.rankLevel
        : undefined
    const rating =
      query.rating && isAllowedRating(leaderboard, query.rating) ? query.rating : undefined
    const patch = safePatch(query.patch)
    const civStats = await getClient().getCivStats({
      leaderboard,
      rankLevel,
      rating,
      patch,
    })
    const mapPool = await getRankedMapPoolResolution(leaderboard)
    let maps: MapStat[] = []
    let metaStats = civStats
    let metaScope: CivMetaResult['metaScope'] = 'all-maps'
    let metaPoolMapCount: number | null = null
    let poolMapRankings: PoolMapCivRanking[] | undefined
    try {
      const mapStats = await getClient().getMapStats({
        leaderboard,
        rankLevel,
        rating,
        patch,
      })
      const allMaps = buildMapStats(mapStats)
      maps = query.mapPoolOnly === true ? filterMapStatsByPool(allMaps, mapPool) : allMaps

      if (query.mapPoolOnly === true && mapPool?.status === 'current') {
        const poolMaps = filterMapStatsByPool(allMaps, mapPool)
        try {
          const poolSlices = await Promise.all(
            poolMaps.map(async (map) => ({
              map,
              stats: await getClient().getMapCivStats(map.mapId, {
                leaderboard,
                rankLevel,
                rating,
                patch,
              }),
            })),
          )
          const poolStats = aggregateCivStatsByMapPool(poolSlices.map((slice) => slice.stats))
          if (poolStats && poolStats.data.length > 0 && poolMaps.length === mapPool.maps.length) {
            metaStats = poolStats
            metaScope = 'ranked-map-pool'
            metaPoolMapCount = poolMaps.length
            poolMapRankings = poolSlices.map((slice) => ({
              mapId: slice.map.mapId,
              map: slice.map.map,
              civs: buildTierList(slice.stats).civs,
            }))
          }
        } catch {
          // Keep the map table and global civ meta usable if one map slice is unavailable.
        }
      }
    } catch {
      maps = []
    }

    const tier = buildTierList(metaStats)

    let mapCivs: CivTier[] | undefined
    let selectedMap: string | null = null
    const selectedMapIsVisible = maps.some((map) => map.mapId === query.mapId)
    if (
      Number.isSafeInteger(query.mapId) &&
      query.mapId! > 0 &&
      (!query.mapPoolOnly || selectedMapIsVisible)
    ) {
      try {
        const mapResponse = await getClient().getMapCivStats(query.mapId!, {
          leaderboard,
          rankLevel,
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
      patch: metaStats.patch,
      metaScope,
      metaPoolMapCount,
      poolMapRankings,
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
  if (!isGlobalMatchupLeaderboard(leaderboard)) {
    // Team queues are valid meta filters, but AoE4World does not expose the
    // global civ-pair matrix for them. Returning an empty successful result
    // keeps the local-history half of the screen usable and avoids a noisy,
    // non-retryable 404 on every render.
    return ok(null)
  }
  try {
    const response = await getClient().getMatchupStats({
      leaderboard,
      rankLevel: rankLevelFilterable(leaderboard) ? query.rankLevel : undefined,
      rating: query.rating,
      patch: query.patch,
    })
    return ok(buildGlobalMatchup(response, query.civilization, query.opponentCivilization))
  } catch (error) {
    return errFrom(error)
  }
}
