import type { DashboardData, IpcResult, PlayerSearchHit } from '@ipc/contract'
import { summarizeRecentForm } from '@domain/form'
import { foldEloIntoLadders, pickPrimaryMode, ratedModes } from '@domain/scouting'
import { buildScoutReportFromRelic } from '@domain/relic'
import {
  avatarUrlFromPlayer,
  civsByMode,
  civsFromPlayerModes,
  lastGameAtFromModes,
  mapsFromGames,
  previousSeasonsFromModes,
  ratingHistoriesForPlayer,
  ratingHistoryForPlayer,
  socialLinksFrom,
  topOpponents,
  topTeammates,
} from '@domain/playerWorldOverview'
import { getClient, getRelicClient, getSettings } from './appContext'
import { aoe4WorldOwnQuery } from './aoe4WorldAccess'
import { errFrom, err, ok } from './result'

/** Resolves a name query to a list of player hits for the onboarding/scout picker. */
export async function searchPlayers(query: string): Promise<IpcResult<PlayerSearchHit[]>> {
  const q = query.trim()
  if (q.length < 2) return ok([])
  try {
    const hits: PlayerSearchHit[] = []
    const seen = new Set<number>()
    const push = (hit: PlayerSearchHit) => {
      if (seen.has(hit.profileId)) return
      seen.add(hit.profileId)
      hits.push(hit)
    }

    const looksLikeId = /^\d{5,}$/.test(q)
    const client = getClient()
    const search = q.length >= 3 ? await client.searchPlayers(q) : { players: [] }
    for (const p of search.players) {
      const primary = pickPrimaryMode(p.leaderboards)
      push({
        profileId: p.profile_id,
        name: p.name,
        country: p.country ?? null,
        rankLevel: primary?.rankLevel ?? null,
        rating: primary?.rating ?? null,
        lastGameAt: p.last_game_at ?? null,
      })
    }

    if (!looksLikeId && q.length >= 3) {
      const auto = await Promise.allSettled([
        client.autocompletePlayers(q, 'rm_solo', { limit: 10 }),
        client.autocompletePlayers(q, 'rm_team', { limit: 10 }),
        client.autocompletePlayers(q, 'qm_1v1', { limit: 10 }),
      ])
      for (const result of auto) {
        if (result.status !== 'fulfilled') continue
        for (const p of result.value.players) {
          push({
            profileId: p.profile_id,
            name: p.name,
            country: p.country ?? null,
            rankLevel: p.rank_level ?? null,
            rating: p.rating ?? null,
            lastGameAt: p.last_game_at ?? null,
          })
        }
      }
    }
    return ok(hits)
  } catch (e) {
    return errFrom(e)
  }
}

/** Builds the dashboard payload for the currently-saved profile. */
export async function getDashboard(): Promise<IpcResult<DashboardData>> {
  const settings = getSettings().getAll()
  if (settings.profileId == null) {
    return err('not_found', 'No profile set. Complete onboarding first.')
  }
  const profileId = settings.profileId
  try {
    const client = getClient()
    const [player, gamesRes, relicStats] = await Promise.all([
      client.getPlayer(profileId),
      client.getPlayerGames(profileId, {
        limit: settings.recentGamesCount,
        includeAlts: true,
        ...aoe4WorldOwnQuery(profileId),
      }),
      // AoE4World can lag or omit a ladder row. Relic's personal-stat endpoint
      // is the authoritative fallback for every mode visible to the account.
      getRelicClient().getPersonalStat([profileId]).catch(() => null),
    ])
    const publicModes = ratedModes(player.modes)
    const relicModes = relicStats
      ? buildScoutReportFromRelic({
          personalStat: relicStats,
          matches: [],
          profileId,
          mapNames: {},
        }).modes
      : []
    const modes = foldEloIntoLadders([...publicModes, ...relicModes]).sort(
      (left, right) => right.gamesCount - left.gamesCount,
    )
    return ok({
      profileId: player.profile_id,
      name: player.name,
      country: player.country ?? null,
      steamId: player.steam_id ?? null,
      primary: pickPrimaryMode(player.modes) ?? relicModes[0] ?? null,
      modes,
      recentForm: summarizeRecentForm(gamesRes.games, profileId),
      modeCivs: civsFromPlayerModes(player.modes),
      modeCivGroups: civsByMode(player.modes),
      ratingHistory: ratingHistoryForPlayer(player),
      ratingHistories: ratingHistoriesForPlayer(player),
      teammates: topTeammates(gamesRes.games, profileId),
      opponents: topOpponents(gamesRes.games, profileId),
      previousSeasons: previousSeasonsFromModes(player.modes),
      maps: mapsFromGames(gamesRes.games, profileId),
      avatarUrl: avatarUrlFromPlayer(player),
      social: socialLinksFrom(player.social),
      lastGameAt: lastGameAtFromModes(player.modes),
      siteUrl: player.site_url ?? `https://aoe4world.com/players/${player.profile_id}`,
    })
  } catch (e) {
    return errFrom(e)
  }
}
