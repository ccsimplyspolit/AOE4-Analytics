import type {
  EsportsLeaderboardPage,
  EsportsLeaderboardQuery,
  IpcResult,
  LeaderboardPage,
  LeaderboardQuery,
} from '@ipc/contract'
import { buildEsportsLeaderboardRows, buildLeaderboardRows } from '@domain/leaderboard'
import { getClient, getSettings } from './appContext'
import { errFrom, ok } from './result'

/**
 * Fetches a leaderboard page (optionally country-filtered), marks the current
 * user's row, and resolves the user's own rank for the ladder (best-effort) so
 * the page can show "you're #N" even when off the visible page.
 */
export async function getLeaderboardPage(
  query: LeaderboardQuery,
): Promise<IpcResult<LeaderboardPage>> {
  try {
    const profileId = getSettings().getAll().profileId
    const resp = await getClient().getLeaderboard(query.leaderboard, {
      page: query.page,
      country: query.country,
      search: query.search?.trim() || undefined,
      fresh: query.fresh,
    })
    const rows = buildLeaderboardRows(resp, profileId)

    let you: LeaderboardPage['you'] = null
    if (profileId != null) {
      const yours = rows.find((row) => row.isYou)
      if (yours) {
        you = {
          rank: yours.rank,
          rating: yours.rating,
          winRate: yours.winRate,
          games: yours.games,
        }
      } else {
        try {
          const standing = await getClient().getLeaderboard(query.leaderboard, {
            profileIds: [profileId],
            fresh: query.fresh,
          })
          const self = standing.players[0]
          if (self?.rank != null) {
            you = {
              rank: self.rank,
              rating: self.rating ?? null,
              winRate: self.win_rate ?? null,
              games: self.games_count ?? 0,
            }
          }
        } catch {
          try {
            const player = await getClient().getPlayer(profileId)
            const mode = player.modes[query.leaderboard]
            if (mode?.rank != null) {
              you = {
                rank: mode.rank,
                rating: mode.rating ?? null,
                winRate: mode.win_rate ?? null,
                games: mode.games_count ?? 0,
              }
            }
          } catch {
            // best-effort — the page still renders without the "you" banner
          }
        }
      }
    }

    return ok({
      rows,
      page: resp.page ?? query.page ?? 1,
      perPage: resp.per_page ?? 50,
      totalCount: resp.total_count,
      leaderboard: query.leaderboard,
      you,
    })
  } catch (e) {
    return errFrom(e)
  }
}

export async function getEsportsLeaderboardPage(
  query: EsportsLeaderboardQuery = {},
): Promise<IpcResult<EsportsLeaderboardPage>> {
  try {
    const profileId = getSettings().getAll().profileId
    const client = getClient()
    const resp = await client.getEsportsLeaderboard(1, {
      page: query.page,
      search: query.search?.trim() || undefined,
      showInactive: query.showInactive,
      country: query.country,
      fresh: query.fresh,
    })
    const rows = buildEsportsLeaderboardRows(resp.players, profileId)
    let you = rows.find((row) => row.isYou) ?? null
    if (!you && profileId != null) {
      const standing = await client
        .getEsportsLeaderboard(1, { profileIds: [profileId], fresh: query.fresh })
        .catch(() => null)
      you = standing ? (buildEsportsLeaderboardRows(standing.players, profileId)[0] ?? null) : null
    }
    return ok({
      rows,
      page: resp.page ?? query.page ?? 1,
      perPage: resp.per_page ?? 50,
      totalCount: resp.total_count,
      name: resp.name ?? null,
      siteUrl: resp.site_url ?? null,
      you,
    })
  } catch (e) {
    return errFrom(e)
  }
}
