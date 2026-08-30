import type { Game, Modes, Player } from '../api/types'
import type { CivUsage, RankInfo, RecentForm, ScoutReport } from './types'
import { summarizeRecentForm } from './form'
import {
  avatarUrlFromPlayer,
  civsByMode,
  civsFromPlayerModes,
  lastGameAtFromModes,
  previousSeasonsFromModes,
  ratingHistoriesForPlayer,
  ratingHistoryForPlayer,
  socialLinksFrom,
  topOpponents,
  topTeammates,
} from './playerWorldOverview'
import { mapPreferences, mostPlayedCivs } from './usage'

/** Modes we prefer when picking a representative rating, best first. */
const PREFERRED_MODES = ['rm_solo', 'rm_1v1_elo', 'rm_1v1', 'qm_1v1', 'rm_team']

export function extractRankInfo(modes: Modes, key: string): RankInfo | null {
  const m = modes[key]
  if (!m) return null
  return {
    leaderboard: key,
    rankLevel: m.rank_level ?? null,
    rating: m.rating ?? null,
    maxRating: m.max_rating ?? null,
    maxRating7d: m.max_rating_7d ?? null,
    maxRating1m: m.max_rating_1m ?? null,
    rank: m.rank ?? null,
    winRate: m.win_rate ?? null,
    gamesCount: m.games_count ?? 0,
    streak: m.streak ?? null,
    winsCount: m.wins_count ?? null,
    lossesCount: m.losses_count ?? null,
    season: m.season ?? null,
    lastGameAt: m.last_game_at ?? null,
    dropsCount: m.drops_count ?? null,
    disputesCount: m.disputes_count ?? null,
  }
}

/** All modes the player has actually played, most-played first. */
export function ratedModes(modes: Modes): RankInfo[] {
  return foldEloIntoLadders(
    Object.keys(modes)
      .map((k) => extractRankInfo(modes, k))
      .filter((r): r is RankInfo => r !== null && r.gamesCount > 0)
      .sort((a, b) => b.gamesCount - a.gamesCount),
  )
}

/** Picks the most representative rated mode (rm_solo preferred), or null if unranked. */
export function pickPrimaryMode(modes: Modes): RankInfo | null {
  const rated = ratedModes(modes)
  if (rated.length === 0) return null
  for (const pref of PREFERRED_MODES) {
    const found = rated.find((r) => r.leaderboard === pref && r.rating != null)
    if (found) return found
  }
  return rated.find((r) => r.rating != null) ?? rated[0] ?? null
}

/**
 * AoE4World lists two ladders per team queue: the public rank (`rm_3v3`,
 * Silver/Gold) and hidden matchmaking Elo (`rm_3v3_elo`). Fold the Elo into
 * the ranked row so the profile table is not a pair of near-duplicates.
 */
const LEADERBOARD_ALIASES: Record<string, string> = {
  'Ranked 1v1': 'rm_solo',
  'Ranked Team': 'rm_team',
  'Ranked 2v2': 'rm_2v2',
  'Ranked 3v3': 'rm_3v3',
  'Ranked 4v4': 'rm_4v4',
  'Quick Match 1v1': 'qm_1v1',
  'Quick Match 2v2': 'qm_2v2',
  'Quick Match 3v3': 'qm_3v3',
  'Quick Match 4v4': 'qm_4v4',
}

export function isEloLeaderboard(key: string): boolean {
  return /_elo$/i.test(key) || /\(\s*Elo\s*\)$/i.test(key)
}

/** Map Relic labels and `*_elo` twins onto the AoE4World queue id. */
export function canonicalLeaderboardId(key: string): string {
  const stripped = key.replace(/_elo$/i, '').replace(/\s*\(\s*Elo\s*\)$/i, '').trim()
  return LEADERBOARD_ALIASES[stripped] ?? stripped
}

function ladderQuality(row: RankInfo): number {
  const id = canonicalLeaderboardId(row.leaderboard)
  let score = 0
  if (/^(rm_|qm_)/.test(id) && !isEloLeaderboard(row.leaderboard)) score += 8
  if (row.rankLevel && row.rankLevel !== 'unranked') score += 4
  if (row.season != null) score += 2
  if (row.winsCount != null) score += 1
  return score
}

function mergeLadderRows(left: RankInfo, right: RankInfo): RankInfo {
  const [primary, secondary] =
    ladderQuality(left) >= ladderQuality(right) ? [left, right] : [right, left]
  return {
    ...secondary,
    ...primary,
    leaderboard: canonicalLeaderboardId(primary.leaderboard),
    matchmakingElo: primary.matchmakingElo ?? secondary.matchmakingElo,
    winsCount: primary.winsCount ?? secondary.winsCount,
    lossesCount: primary.lossesCount ?? secondary.lossesCount,
    season: primary.season ?? secondary.season,
    rankLevel: primary.rankLevel ?? secondary.rankLevel,
    maxRating: primary.maxRating ?? secondary.maxRating,
    rank: primary.rank ?? secondary.rank,
  }
}

/**
 * AoE4World lists two ladders per team queue: the public rank (`rm_3v3`,
 * Silver/Gold) and hidden matchmaking Elo (`rm_3v3_elo`). Relic repeats the
 * same queues under English labels (`Ranked 3v3`). Collapse all of that into
 * one row per queue.
 */
export function foldEloIntoLadders(modes: RankInfo[]): RankInfo[] {
  const ranked = new Map<string, RankInfo>()
  const eloById = new Map<string, RankInfo>()
  const order: string[] = []
  for (const mode of modes) {
    const id = canonicalLeaderboardId(mode.leaderboard)
    if (!order.includes(id)) order.push(id)
    if (isEloLeaderboard(mode.leaderboard)) {
      const previous = eloById.get(id)
      eloById.set(id, previous ? mergeLadderRows(previous, mode) : mode)
      continue
    }
    const previous = ranked.get(id)
    ranked.set(id, previous ? mergeLadderRows(previous, { ...mode, leaderboard: id }) : { ...mode, leaderboard: id })
  }
  return order.map((id) => {
    const row = ranked.get(id)
    const elo = eloById.get(id)
    if (row && elo) {
      return {
        ...row,
        matchmakingElo: elo.rating ?? row.matchmakingElo,
        winsCount: row.winsCount ?? elo.winsCount,
        lossesCount: row.lossesCount ?? elo.lossesCount,
      }
    }
    if (row) return row
    const eloOnly = elo!
    return { ...eloOnly, leaderboard: `${id}_elo` }
  })
}

export function buildCounterNote(topCivs: CivUsage[], form: RecentForm): string {
  if (topCivs.length === 0) {
    return 'No recent public games to scout. Play your standard opening and scout in-game to read their plan.'
  }
  const main = topCivs[0]!
  const parts: string[] = []
  parts.push(
    `Mostly plays ${main.civName} (${main.games} of last ${form.games}` +
      `${main.winRate != null ? `, ${main.winRate}% win` : ''}).`,
  )
  if (topCivs.length > 1) {
    parts.push(
      `Also seen on: ${topCivs
        .slice(1)
        .map((c) => c.civName)
        .join(', ')}.`,
    )
  }
  if (form.streak <= -3) parts.push('On a losing streak — may play it safe or tilt.')
  else if (form.streak >= 3) parts.push('On a win streak — likely confident and aggressive.')
  parts.push(
    'Scout early, deny their key economy, and prepare a counter to their main composition. ' +
      '(Civ-specific counters arrive in Phase 2.)',
  )
  return parts.join(' ')
}

export interface BuildScoutInput {
  player: Player
  games: Game[]
}

/** Assembles a full ScoutReport from a player profile + their recent games. */
export function buildScoutReport({ player, games }: BuildScoutInput): ScoutReport {
  const recentForm = summarizeRecentForm(games, player.profile_id)
  const topCivs = mostPlayedCivs(games, player.profile_id).slice(0, 4)
  const topMaps = mapPreferences(games, player.profile_id).slice(0, 8)
  const modes = ratedModes(player.modes)
  const primary = pickPrimaryMode(player.modes)
  const hasData = recentForm.games > 0 || modes.length > 0

  return {
    profileId: player.profile_id,
    name: player.name,
    country: player.country ?? null,
    primary,
    modes,
    recentForm,
    topCivs,
    topMaps,
    modeCivs: civsFromPlayerModes(player.modes),
    modeCivGroups: civsByMode(player.modes),
    ratingHistory: ratingHistoryForPlayer(player),
    ratingHistories: ratingHistoriesForPlayer(player),
    teammates: topTeammates(games, player.profile_id),
    opponents: topOpponents(games, player.profile_id),
    previousSeasons: previousSeasonsFromModes(player.modes),
    avatarUrl: avatarUrlFromPlayer(player),
    steamId: player.steam_id ?? null,
    social: socialLinksFrom(player.social),
    lastGameAt: lastGameAtFromModes(player.modes),
    siteUrl: player.site_url ?? `https://aoe4world.com/players/${player.profile_id}`,
    note: buildCounterNote(topCivs, recentForm),
    hasData,
  }
}
