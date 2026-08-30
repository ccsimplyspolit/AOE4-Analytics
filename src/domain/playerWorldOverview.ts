/**
 * AoE4World player overview slices that already exist on GET /players/:id
 * and /players/:id/games: mode civs, rating history, teammates, opponents,
 * previous seasons. Challenges have no public API — do not invent times or medals.
 */

import { normalizeTeams, type Game, type Modes, type Player, type Social } from '../api/types'
import { civDisplayName } from './civ'
import type {
  MapUsage,
  ModeCivGroup,
  ModeCivUsage,
  PlayerSocialLinks,
  PreviousSeason,
  RankInfo,
  RatingHistoryPoint,
  RatingHistorySeries,
  TeammateStat,
} from './types'
import { mapPreferences } from './usage'

export type { ModeCivUsage, RatingHistoryPoint, TeammateStat }

const EMPTY_SOCIAL: PlayerSocialLinks = {
  twitch: null,
  youtube: null,
  twitter: null,
  instagram: null,
  liquipedia: null,
}

export function parseRatingHistory(raw: unknown): RatingHistoryPoint[] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return []
  const out: RatingHistoryPoint[] = []
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const atSec = Number(key)
    if (!Number.isFinite(atSec) || atSec <= 0) continue
    const rating =
      value && typeof value === 'object' && 'rating' in value
        ? Number((value as { rating: unknown }).rating)
        : NaN
    if (!Number.isFinite(rating)) continue
    out.push({ atSec, rating })
  }
  return out.sort((a, b) => a.atSec - b.atSec)
}

function mapCivRows(mode: string, rows: NonNullable<Modes[string]>['civilizations']): ModeCivUsage[] {
  return (rows ?? [])
    .filter((row) => (row.games_count ?? 0) > 0 && row.civilization)
    .map((row) => ({
      civ: row.civilization,
      civName: civDisplayName(row.civilization),
      games: Math.floor(row.games_count ?? 0),
      winRate: typeof row.win_rate === 'number' ? Math.round(row.win_rate * 10) / 10 : null,
      pickRate: typeof row.pick_rate === 'number' ? Math.round(row.pick_rate * 10) / 10 : null,
      mode,
    }))
    .sort((a, b) => b.games - a.games)
}

/** Prefer the rated mode with the richest civilization sample. */
export function civsFromPlayerModes(modes: Modes): ModeCivUsage[] {
  return civsByMode(modes)[0]?.civs ?? []
}

export function civsByMode(modes: Modes): ModeCivGroup[] {
  const groups: ModeCivGroup[] = []
  for (const [mode, stats] of Object.entries(modes)) {
    const civs = mapCivRows(mode, stats?.civilizations)
    if (civs.length === 0) continue
    groups.push({ mode, civs })
  }
  return dropEloTwins(
    groups.sort((a, b) => {
      const aGames = a.civs.reduce((sum, row) => sum + row.games, 0)
      const bGames = b.civs.reduce((sum, row) => sum + row.games, 0)
      return bGames - aGames
    }),
    (group) => group.mode,
  )
}

export function ratingHistoryForPlayer(player: Player): RatingHistoryPoint[] {
  return ratingHistoriesForPlayer(player)[0]?.points ?? []
}

export function ratingHistoriesForPlayer(player: Player): RatingHistorySeries[] {
  const ranked = Object.entries(player.modes)
    .filter(([, stats]) => (stats?.games_count ?? 0) > 0)
    .sort((a, b) => (b[1]?.games_count ?? 0) - (a[1]?.games_count ?? 0))
  const out: RatingHistorySeries[] = []
  for (const [mode, stats] of ranked) {
    const points = parseRatingHistory(stats?.rating_history)
    if (points.length >= 2) out.push({ mode, points })
  }
  return dropEloTwins(out, (series) => series.mode)
}

function tallyPartners(
  games: Game[],
  profileId: number,
  side: 'allies' | 'opponents',
  limit: number,
): TeammateStat[] {
  const byId = new Map<number, { name: string; games: number; wins: number }>()
  for (const game of games) {
    const teams = normalizeTeams(game)
    const teamIndex = teams.findIndex((row) => row.some((p) => p.profile_id === profileId))
    if (teamIndex < 0) continue
    const self = teams[teamIndex]?.find((p) => p.profile_id === profileId)
    const won = self?.result === 'win'
    const pool =
      side === 'allies'
        ? (teams[teamIndex] ?? []).filter((p) => p.profile_id !== profileId)
        : teams.filter((_, index) => index !== teamIndex).flat()
    for (const mate of pool) {
      const row = byId.get(mate.profile_id) ?? { name: mate.name, games: 0, wins: 0 }
      row.name = mate.name || row.name
      row.games++
      if (won) row.wins++
      byId.set(mate.profile_id, row)
    }
  }
  return [...byId.entries()]
    .map(([id, row]) => ({
      profileId: id,
      name: row.name,
      games: row.games,
      wins: row.wins,
      winRate: row.games > 0 ? Math.round((row.wins / row.games) * 1000) / 10 : null,
    }))
    .sort((a, b) => b.games - a.games || a.name.localeCompare(b.name))
    .slice(0, limit)
}

export function topTeammates(games: Game[], profileId: number, limit = 6): TeammateStat[] {
  return tallyPartners(games, profileId, 'allies', limit)
}

export function topOpponents(games: Game[], profileId: number, limit = 6): TeammateStat[] {
  return tallyPartners(games, profileId, 'opponents', limit)
}

export function mapsFromGames(games: Game[], profileId: number): MapUsage[] {
  return mapPreferences(games, profileId).slice(0, 8)
}

export function previousSeasonsFromModes(modes: Modes): PreviousSeason[] {
  const out: PreviousSeason[] = []
  for (const [mode, stats] of Object.entries(modes)) {
    for (const row of stats?.previous_seasons ?? []) {
      const season = row.season
      if (season == null || !Number.isFinite(season)) continue
      out.push({
        mode,
        season,
        rating: row.rating ?? null,
        rank: row.rank ?? null,
        rankLevel: row.rank_level ?? null,
        gamesCount: Math.floor(row.games_count ?? 0),
        winsCount: row.wins_count ?? null,
        lossesCount: row.losses_count ?? null,
        winRate: typeof row.win_rate === 'number' ? Math.round(row.win_rate * 10) / 10 : null,
      })
    }
  }
  return dropEloTwins(out, (row) => row.mode).sort(
    (a, b) => b.season - a.season || a.mode.localeCompare(b.mode),
  )
}

/** Finished-season rows grouped newest-first, so the profile can page by season. */
export function groupPreviousSeasons(
  rows: PreviousSeason[],
): Array<{ season: number; rows: PreviousSeason[] }> {
  const bySeason = new Map<number, PreviousSeason[]>()
  for (const row of rows) {
    const list = bySeason.get(row.season)
    if (list) list.push(row)
    else bySeason.set(row.season, [row])
  }
  return [...bySeason.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([season, grouped]) => ({
      season,
      rows: [...grouped].sort((a, b) => a.mode.localeCompare(b.mode)),
    }))
}

function isQuickMatchMode(key: string): boolean {
  return key.startsWith('qm_') || key.startsWith('Quick Match')
}

/** Live ladders plus finished seasons, newest first — one tab strip on the profile. */
export function groupLaddersBySeason(
  live: RankInfo[],
  previous: PreviousSeason[],
  liveSeason: number,
): Array<{ season: number; live: boolean; rows: PreviousSeason[] }> {
  const liveRows: PreviousSeason[] = live
    .filter((row) => !isQuickMatchMode(row.leaderboard))
    .map((row) => ({
      mode: row.leaderboard,
      season: row.season ?? liveSeason,
      rating: row.rating,
      rank: row.rank,
      rankLevel: row.rankLevel,
      gamesCount: row.gamesCount,
      winsCount: row.winsCount ?? null,
      lossesCount: row.lossesCount ?? null,
      winRate: row.winRate,
    }))
  const older = groupPreviousSeasons(
    previous.filter((row) => row.season !== liveSeason && !isQuickMatchMode(row.mode)),
  )
  return [
    { season: liveSeason, live: true, rows: liveRows },
    ...older.map((group) => ({ season: group.season, live: false, rows: group.rows })),
  ]
}

/** Hide `rm_3v3_elo` when the same list already has `rm_3v3`. */
function dropEloTwins<T>(items: T[], modeOf: (item: T) => string): T[] {
  const modes = new Set(items.map(modeOf))
  return items.filter((item) => {
    const mode = modeOf(item)
    return !mode.endsWith('_elo') || !modes.has(mode.slice(0, -4))
  })
}

export function lastGameAtFromModes(modes: Modes): string | null {
  let best: string | null = null
  for (const stats of Object.values(modes)) {
    const at = stats?.last_game_at
    if (!at) continue
    if (!best || at > best) best = at
  }
  return best
}

export function avatarUrlFromPlayer(player: Player): string | null {
  return player.avatars?.medium ?? player.avatars?.small ?? player.avatars?.full ?? null
}

export function socialLinksFrom(social: Social | undefined | null): PlayerSocialLinks {
  if (!social) return { ...EMPTY_SOCIAL }
  const clean = (value: string | null | undefined) => {
    const trimmed = value?.trim()
    return trimmed ? trimmed : null
  }
  return {
    twitch: clean(social.twitch),
    youtube: clean(social.youtube),
    twitter: clean(social.twitter),
    instagram: clean(social.instagram),
    liquipedia: clean(social.liquipedia),
  }
}

export const EMPTY_PLAYER_SOCIAL = EMPTY_SOCIAL
