import type {
  HeadToHeadData,
  IpcResult,
  ScoutMetaContext,
  ScoutMetaQuery,
  ScoutHistoryData,
  ScoutHistoryQuery,
  ScoutMatchPage,
  ScoutMatchRow,
} from '@ipc/contract'
import {
  normalizeTeams,
  type Game,
  type GamesResponse,
  type Modes,
  type ModeStats,
  type RankLevel,
  type StatsLeaderboard,
} from '@api/types'
import type { ScoutReport } from '@domain/types'
import type { ScoutFavoriteCiv, ScoutMetaPlayer, ScoutTeamPartner } from '@domain/scoutMeta'
import { buildScoutMetaContext } from '@domain/scoutMeta'
import { buildScoutReport } from '@domain/scouting'
import { buildScoutReportFromRelic } from '@domain/relic'
import { isMatchupCivilization } from '@domain/matchupLab'
import { isAllowedRating, ratingFiltersForLeaderboard } from '@domain/statsFilters'
import { getClient, getRelicClient, getSettings } from './appContext'
import { err, errFrom, ok } from './result'

const RECENT_MATCH_LIMIT = 10
const HEAD_TO_HEAD_LIMIT = 20
const MAX_HISTORY_PAGE = 5_000
const STATS_LEADERBOARDS = new Set<StatsLeaderboard>([
  'rm_solo',
  'qm_1v1',
  'rm_2v2',
  'rm_3v3',
  'rm_4v4',
  'qm_2v2',
  'qm_3v3',
  'qm_4v4',
])

function isProfileId(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
}

function safePatch(value: unknown): string | null {
  return typeof value === 'string' && /^[0-9]+(?:,[0-9]+)*$/.test(value) && value.length <= 64
    ? value
    : null
}

function rankBand(value: unknown): RankLevel | null {
  if (typeof value !== 'string' || value.length === 0) return null
  const base = value.replace(/_[1-4]$/, '')
  return base.length > 0 ? (base as RankLevel) : null
}

function ratingBucket(value: number | null, leaderboard: StatsLeaderboard): string | null {
  if (value == null || !Number.isFinite(value)) return null
  const rating = Math.round(value)
  const options = ratingFiltersForLeaderboard(leaderboard)
  const preferred = leaderboard.startsWith('qm_')
    ? rating < 900
      ? '<899'
      : rating < 1000
        ? '900-999'
        : rating < 1100
          ? '1000-1099'
          : rating < 1200
            ? '1100-1199'
            : rating < 1300
              ? '1200-1299'
              : rating < 1400
                ? '1300-1399'
                : '>1400'
    : rating < 500
      ? '<499'
      : rating < 700
        ? '500-699'
        : rating < 1000
          ? '700-999'
          : rating < 1200
            ? '1000-1199'
            : rating < 1400
              ? '1200-1399'
              : '>1400'
  return options.some((option) => option.value === preferred) ? preferred : null
}

function ageupKind(leaderboard: StatsLeaderboard): string {
  return leaderboard === 'rm_solo' ? 'rm_1v1' : leaderboard
}

function mapKey(value: string | null | undefined): string {
  return (value ?? '').toLocaleLowerCase().replace(/[^a-z0-9]+/g, '')
}

function favoriteCivsFromModes(modes: Modes): string[] {
  const counts = new Map<string, number>()
  for (const stats of Object.values(modes)) {
    if (!stats) continue
    for (const civ of stats.civilizations ?? []) {
      const games = civ.games_count ?? 0
      counts.set(civ.civilization, (counts.get(civ.civilization) ?? 0) + games)
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 3)
    .map(([civ]) => civ)
}

function modeKeysForLeaderboard(leaderboard: StatsLeaderboard): string[] {
  if (leaderboard === 'rm_solo') return ['rm_solo', 'rm_1v1', 'rm_1v1_elo']
  return [leaderboard]
}

function modeForLeaderboard(modes: Modes, leaderboard: StatsLeaderboard): ModeStats | null {
  for (const key of modeKeysForLeaderboard(leaderboard)) {
    const mode = modes[key]
    if (mode) return mode
  }
  return null
}

function eloModeForLeaderboard(modes: Modes, leaderboard: StatsLeaderboard): ModeStats | null {
  if (leaderboard === 'rm_solo') return modes.rm_1v1_elo ?? modes.rm_solo ?? null
  return modes[`${leaderboard}_elo`] ?? modes[leaderboard] ?? null
}

function favoriteCivStatsFromMode(mode: ModeStats | null): ScoutFavoriteCiv[] {
  return (mode?.civilizations ?? [])
    .filter((civ) => (civ.games_count ?? 0) > 0)
    .sort((a, b) => (b.games_count ?? 0) - (a.games_count ?? 0))
    .slice(0, 5)
    .map((civ) => ({
      civ: civ.civilization,
      games: Math.max(0, Math.floor(civ.games_count ?? 0)),
      wins: Math.max(0, Math.floor(civ.wins_count ?? 0)),
      winRate: typeof civ.win_rate === 'number' && Number.isFinite(civ.win_rate) ? civ.win_rate : null,
      pickRate: typeof civ.pick_rate === 'number' && Number.isFinite(civ.pick_rate) ? civ.pick_rate : null,
    }))
}

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

async function teamPartnerSignals(
  teams: ScoutMetaPlayer[][],
  client: ReturnType<typeof getClient>,
): Promise<ScoutTeamPartner[]> {
  const players = [...new Map(teams.flat().map((player) => [player.profileId, player])).values()]
  if (!teams.some((team) => team.length > 1) || players.length === 0) return []
  const histories = await Promise.all(
    players.map(async (player) => {
      const response = await client.getPlayerGames(player.profileId, { limit: 100 }).catch(() => null)
      return [player.profileId, response?.games ?? []] as const
    }),
  )
  const byId = new Map(histories)
  const output: ScoutTeamPartner[] = []
  for (const team of teams) {
    for (let i = 0; i < team.length; i++) {
      for (let j = i + 1; j < team.length; j++) {
        const left = team[i]!
        const right = team[j]!
        const games = byId.get(left.profileId) ?? []
        const sharedGames = games.filter((game) =>
          normalizeTeams(game).some(
            (side) =>
              side.some((player) => player.profile_id === left.profileId) &&
              side.some((player) => player.profile_id === right.profileId),
          ),
        ).length
        output.push({
          profileId: right.profileId,
          name: right.name,
          sharedGames,
          // The reference app uses a deliberately soft public-history heuristic,
          // not a claim that the matchmaking queue was observed directly.
          likelyPremade: sharedGames >= 5,
        })
      }
    }
  }
  return output.sort((a, b) => b.sharedGames - a.sharedGames)
}

function parseScoutMetaQuery(input: unknown): {
  query: ScoutMetaQuery
  players: ScoutMetaPlayer[][]
  leaderboard: StatsLeaderboard
  rankLevel: RankLevel | null
  rating: string | null
  patch: string | null
} | null {
  if (!input || typeof input !== 'object') return null
  const value = input as Record<string, unknown>
  const leaderboardValue = value.leaderboard ?? 'rm_solo'
  const leaderboard = STATS_LEADERBOARDS.has(leaderboardValue as StatsLeaderboard)
    ? (leaderboardValue as StatsLeaderboard)
    : null
  if (!leaderboard || !Array.isArray(value.teams) || value.teams.length < 2) return null
  const teams: ScoutMetaPlayer[][] = []
  for (const rawTeam of value.teams) {
    if (!Array.isArray(rawTeam) || rawTeam.length === 0) return null
    const team: ScoutMetaPlayer[] = []
    for (const rawPlayer of rawTeam) {
      if (!rawPlayer || typeof rawPlayer !== 'object') return null
      const player = rawPlayer as Record<string, unknown>
      const civ = player.civ
      if (civ != null && !isMatchupCivilization(civ)) return null
      if (!isProfileId(player.profileId) || typeof player.name !== 'string') return null
      team.push({
        profileId: player.profileId,
        name: player.name.slice(0, 128),
        civ: typeof civ === 'string' ? civ : null,
        rating: typeof player.rating === 'number' && Number.isFinite(player.rating) ? player.rating : null,
        isMe: player.isMe === true,
      })
    }
    teams.push(team)
  }
  if (teams.flat().every((player) => player.civ == null)) return null
  const rankLevel = rankBand(value.rankLevel)
  const ratingValue = value.rating
  const rating = ratingValue == null ? null : isAllowedRating(leaderboard, ratingValue) ? ratingValue : null
  const patch = value.patch == null ? null : safePatch(value.patch)
  const map = typeof value.map === 'string' ? value.map.slice(0, 128) : null
  const rawMatch = value.match && typeof value.match === 'object'
    ? value.match as Record<string, unknown>
    : null
  const match = {
    map,
    leaderboard,
    kind: typeof rawMatch?.kind === 'string' ? rawMatch.kind.slice(0, 64) : null,
    patch,
    averageMmr: finiteNumber(rawMatch?.averageMmr),
    averageRating: finiteNumber(rawMatch?.averageRating),
    server: typeof rawMatch?.server === 'string' ? rawMatch.server.slice(0, 64) : null,
    startedAt: typeof rawMatch?.startedAt === 'string' ? rawMatch.startedAt.slice(0, 64) : null,
    durationSec: finiteNumber(rawMatch?.durationSec),
  }
  return {
    query: {
      leaderboard,
      rankLevel,
      rating,
      patch,
      map,
      match,
      teams,
    },
    players: teams,
    leaderboard,
    rankLevel,
    rating,
    patch,
  }
}

/** Loads the public aggregate context for the current live roster. */
export async function getScoutMeta(input: unknown): Promise<IpcResult<ScoutMetaContext>> {
  const parsed = parseScoutMetaQuery(input)
  if (!parsed) return err('validation', 'Live scouting needs two teams with valid civilization data.')
  const client = getClient()
  const profiles = await Promise.all(
    parsed.players.flat().map(async (player) => {
      const profile = await client.getPlayer(player.profileId).catch(() => null)
      const mode = profile ? modeForLeaderboard(profile.modes, parsed.leaderboard) : null
      const eloMode = profile ? eloModeForLeaderboard(profile.modes, parsed.leaderboard) : null
      const favoriteCivStats = favoriteCivStatsFromMode(mode)
      return [
        player.profileId,
        profile
          ? {
              rankLevel: mode?.rank_level ?? null,
              rank: mode?.rank ?? null,
              maxRating: mode?.max_rating ?? null,
              winRate: mode?.win_rate ?? null,
              gamesCount: mode?.games_count ?? 0,
              winsCount: mode?.wins_count ?? 0,
              lossesCount: mode?.losses_count ?? 0,
              season: mode?.season ?? null,
              favoriteCivs: favoriteCivStats.length > 0
                ? favoriteCivStats.map((civ) => civ.civ)
                : favoriteCivsFromModes(profile.modes),
              favoriteCivStats,
              elo: eloMode?.rating ?? null,
              mmr: mode?.rating ?? null,
            }
          : null,
      ] as const
    }),
  )
  const profileById = new Map(profiles)
  const enrichedTeams = parsed.players.map((team) =>
    team.map((player) => {
      const profile = profileById.get(player.profileId)
      return profile
        ? {
        ...player,
            rating: player.rating ?? profile.elo ?? profile.mmr,
            elo: player.elo ?? profile.elo ?? player.rating ?? null,
            mmr: player.mmr ?? profile.mmr ?? null,
            rankLevel: profile.rankLevel,
            rank: profile.rank,
            maxRating: profile.maxRating,
            winRate: profile.winRate,
            gamesCount: profile.gamesCount,
            winsCount: profile.winsCount,
            lossesCount: profile.lossesCount,
            season: profile.season,
            favoriteCivs: profile.favoriteCivs,
            favoriteCivStats: profile.favoriteCivStats,
          }
        : player
    }),
  )
  const ratings = enrichedTeams
    .flat()
    .map((player) => player.mmr ?? player.rating)
    .filter((value): value is number => value != null && Number.isFinite(value))
  const effectiveRating =
    parsed.rating ??
    ratingBucket(
      ratings.length > 0 ? ratings.reduce((sum, value) => sum + value, 0) / ratings.length : null,
      parsed.leaderboard,
    )
  const statsQuery = {
    leaderboard: parsed.leaderboard,
    // Rank bands are only exposed by AoE4World on the 1v1 stats ladders.
    rankLevel: parsed.leaderboard === 'rm_solo' || parsed.leaderboard === 'qm_1v1'
      ? parsed.rankLevel ?? undefined
      : undefined,
    rating: effectiveRating ?? undefined,
    patch: parsed.patch ?? undefined,
  }
  const civs = [
    ...new Set(enrichedTeams.flatMap((team) => team.map((player) => player.civ)).filter(Boolean)),
  ] as string[]
  try {
    const teamStatsPromise = parsed.leaderboard === 'rm_2v2'
      ? client.getTeamStats(statsQuery).catch(() => null)
      : Promise.resolve(null)
    const [civStats, matchupStats, mapStats, teamStats] = await Promise.all([
      client.getCivStats(statsQuery),
      client.getMatchupStats(statsQuery),
      client.getMapStats(statsQuery),
      teamStatsPromise,
    ])
    const mapId = parsed.query.map
      ? mapStats.data.find((row) => mapKey(row.map) === mapKey(parsed.query.map))?.map_id ?? null
      : null
    const mapCivStats = mapId == null
      ? null
      : await client.getMapCivStats(mapId, statsQuery).catch(() => null)
    const ageupEntries = await Promise.all(
      civs.map(async (civ) => {
        const response = await client
          .getAgeupStats(civ, ageupKind(parsed.leaderboard), {
            ...statsQuery,
            leaderboard: parsed.leaderboard,
          })
          .catch(() => null)
        return response ? ([civ, response] as const) : null
      }),
    )
    const ageups = Object.fromEntries(
      ageupEntries.filter((entry): entry is readonly [string, NonNullable<typeof entry>[1]] => entry != null),
    )
    return ok(
      buildScoutMetaContext({
        match: parsed.query.match,
        scope: {
          leaderboard: parsed.leaderboard,
          rankLevel: civStats.rank_level ?? parsed.rankLevel,
          rating: civStats.rating ?? effectiveRating,
          patch: civStats.patch ?? parsed.patch,
          map: parsed.query.map ?? null,
          mapId,
        },
        teams: enrichedTeams,
        civStats,
        mapCivStats,
        mapStats,
        matchupStats,
        teamStats,
        ageups,
        teamPartners: await teamPartnerSignals(enrichedTeams, client),
      }),
    )
  } catch (error) {
    return errFrom(error)
  }
}

function historyQuery(input: unknown): Required<ScoutHistoryQuery> {
  if (input == null) return { recentPage: 1, recentPageSize: RECENT_MATCH_LIMIT }
  if (typeof input !== 'object') throw new Error('Scout history query must be an object.')
  const value = input as Record<string, unknown>
  const page = value.recentPage ?? 1
  const pageSize = value.recentPageSize ?? RECENT_MATCH_LIMIT
  if (
    typeof page !== 'number' ||
    !Number.isSafeInteger(page) ||
    page < 1 ||
    page > MAX_HISTORY_PAGE ||
    typeof pageSize !== 'number' ||
    !Number.isSafeInteger(pageSize) ||
    pageSize < 1 ||
    pageSize > 100
  ) {
    throw new Error('Scout history page must be a positive integer up to 5,000.')
  }
  return { recentPage: page, recentPageSize: pageSize }
}

/** Maps an API game without guessing when the requested player is missing. */
function matchRow(game: Game, perspectiveProfileId: number): ScoutMatchRow {
  const teams = normalizeTeams(game)
  const teamIndex = teams.findIndex((team) =>
    team.some((player) => player.profile_id === perspectiveProfileId),
  )
  const player =
    teamIndex >= 0
      ? teams[teamIndex]?.find((candidate) => candidate.profile_id === perspectiveProfileId)
      : undefined
  const teammates =
    teamIndex >= 0
      ? (teams[teamIndex] ?? []).filter((candidate) => candidate.profile_id !== perspectiveProfileId)
      : []
  const opponents = teamIndex >= 0 ? teams.filter((_, index) => index !== teamIndex).flat() : []

  return {
    gameId: game.game_id,
    startedAt: game.started_at,
    durationSec: game.duration ?? null,
    map: game.map || null,
    format: game.leaderboard || game.kind || null,
    result: player?.result === 'win' || player?.result === 'loss' ? player.result : 'unknown',
    civilization: player?.civilization || null,
    opponentCivilizations: opponents
      .map((opponent) => opponent.civilization)
      .filter((civilization): civilization is string => Boolean(civilization)),
    opponentNames: opponents
      .map((opponent) => opponent.name)
      .filter((name): name is string => Boolean(name)),
    teammateNames: teammates.map((mate) => mate.name).filter(Boolean),
    teammateProfileIds: teammates.map((mate) => mate.profile_id),
    rating: player?.rating ?? null,
    ratingDiff: player?.rating_diff ?? null,
    mmrDiff: player?.mmr_diff ?? null,
    server: game.server ?? null,
    kind: game.kind || game.mmr_leaderboard || null,
    patch: game.patch ?? null,
    averageRating: game.average_rating ?? null,
    inputType: player?.input_type ?? null,
  }
}

function matchPage(response: GamesResponse, perspectiveProfileId: number): ScoutMatchPage {
  const matches = response.games.map((game) => matchRow(game, perspectiveProfileId))
  const rawTotal = response.total_count
  return {
    matches,
    sampleSize: matches.length,
    totalCount:
      Number.isFinite(rawTotal) && rawTotal >= matches.length
        ? Math.floor(rawTotal)
        : matches.length,
  }
}

function headToHeadPage(response: GamesResponse, perspectiveProfileId: number): HeadToHeadData {
  const page = matchPage(response, perspectiveProfileId)
  const wins = page.matches.filter((match) => match.result === 'win').length
  const losses = page.matches.filter((match) => match.result === 'loss').length
  const decidedGames = wins + losses
  return {
    ...page,
    wins,
    losses,
    decidedGames,
    winRate: decidedGames > 0 ? (wins / decidedGames) * 100 : null,
  }
}

function settledMatchPage(
  result: PromiseSettledResult<GamesResponse>,
  perspectiveProfileId: number,
): IpcResult<ScoutMatchPage> {
  if (result.status === 'rejected') return errFrom(result.reason)
  try {
    return ok(matchPage(result.value, perspectiveProfileId))
  } catch {
    return err('api', 'AoE4World returned malformed match history data.')
  }
}

/**
 * Assembles a ScoutReport, PREFERRING Relic's official API (real per-mode
 * rank/rating + recent form across ranked/QM/custom — what AoE4World's public
 * API filters out) and FALLING BACK to AoE4World on any Relic error (TLS,
 * network, non-zero result code). Same ScoutReport shape either way (D49).
 */
export async function scoutPlayer(profileId: number): Promise<IpcResult<ScoutReport>> {
  const relic = getRelicClient()
  // Run the two Relic calls independently: a recent-history hiccup must not wipe the
  // rank, nor a stats hiccup the recent form. (The old `Promise.all` discarded BOTH
  // on either failure and silently demoted to AoE4World — which has no data for
  // QM/custom-only players, producing a bogus "Unranked / no recent games" report.)
  const [statRes, histRes] = await Promise.allSettled([
    relic.getPersonalStat([profileId]),
    relic.getRecentMatchHistory(profileId),
  ])

  if (statRes.status === 'fulfilled' || histRes.status === 'fulfilled') {
    const personalStat =
      statRes.status === 'fulfilled'
        ? statRes.value
        : { result: { code: 0, message: '' }, statGroups: [], leaderboardStats: [] }
    const matches = histRes.status === 'fulfilled' ? histRes.value.matchHistoryStats : []
    const mapNames = relic.mapNamesFor(matches)
    return ok(buildScoutReportFromRelic({ personalStat, matches, profileId, mapNames }))
  }

  // Both Relic calls failed — log why (was silently swallowed), then try AoE4World
  // as a last resort (blind to QM/custom-only players, but better than nothing).
  console.warn(
    '[scout] Relic unavailable for',
    profileId,
    statRes.status === 'rejected' ? statRes.reason : '',
    histRes.status === 'rejected' ? histRes.reason : '',
  )
  try {
    const client = getClient()
    const [player, gamesRes] = await Promise.all([
      client.getPlayer(profileId),
      client.getPlayerGames(profileId, { limit: 100 }),
    ])
    return ok(buildScoutReport({ player, games: gamesRes.games }))
  } catch (e) {
    return errFrom(e)
  }
}

/**
 * Loads a bounded public-history sample for a viewed profile. If a different
 * active account exists, the second request is scoped with opponent_profile_id
 * so the head-to-head list is not inferred from unrelated local history.
 */
export async function getScoutHistory(
  profileId: unknown,
  queryInput?: unknown,
): Promise<IpcResult<ScoutHistoryData>> {
  if (!isProfileId(profileId)) {
    return err('validation', 'Player profile id must be a positive integer.')
  }

  let query: Required<ScoutHistoryQuery>
  try {
    query = historyQuery(queryInput)
  } catch (error) {
    return err('validation', error instanceof Error ? error.message : 'Invalid history query.')
  }

  // Capture identity before starting account-scoped IO. The renderer also keys
  // this query by the active profile so a switch cannot reuse another account's data.
  const settings = getSettings().getAll()
  const activeProfileId = isProfileId(settings.profileId) ? settings.profileId : null
  const shouldLoadHeadToHead =
    query.recentPage === 1 && activeProfileId != null && activeProfileId !== profileId
  const client = getClient()

  const recentQuery =
    query.recentPage === 1
      ? { limit: query.recentPageSize }
      : { limit: query.recentPageSize, page: query.recentPage }

  const [recentResult, headToHeadResult] = await Promise.allSettled([
    client.getPlayerGames(profileId, recentQuery),
    shouldLoadHeadToHead
      ? client.getPlayerGames(activeProfileId, {
          limit: HEAD_TO_HEAD_LIMIT,
          opponentProfileId: profileId,
        })
      : Promise.resolve(null),
  ])

  const recent = settledMatchPage(recentResult, profileId)

  let headToHead: IpcResult<HeadToHeadData> | null = null
  if (shouldLoadHeadToHead) {
    const currentProfileId = getSettings().getAll().profileId
    if (currentProfileId !== activeProfileId) {
      headToHead = err('validation', 'Active account changed while head-to-head loaded. Retry.')
    } else if (headToHeadResult.status === 'fulfilled' && headToHeadResult.value) {
      try {
        headToHead = ok(headToHeadPage(headToHeadResult.value, activeProfileId))
      } catch {
        headToHead = err('api', 'AoE4World returned malformed head-to-head data.')
      }
    } else if (headToHeadResult.status === 'rejected') {
      headToHead = errFrom(headToHeadResult.reason)
    } else {
      headToHead = err('unknown', 'Head-to-head data was unavailable.')
    }
  }

  return ok({
    viewedProfileId: profileId,
    activeProfile:
      activeProfileId == null
        ? null
        : { profileId: activeProfileId, name: settings.playerName ?? null },
    recentPage: query.recentPage,
    recentPageSize: query.recentPageSize,
    recent,
    headToHead,
  })
}
