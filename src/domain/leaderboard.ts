import type { LeaderboardResponse } from '../api/types'

/** One ladder row, flattened from the AoE4World leaderboard response. */
export interface LeaderboardRow {
  rank: number
  profileId: number
  name: string
  country: string | null
  rating: number
  winRate: number | null
  games: number
  wins: number
  losses: number
  streak: number
  rankLevel: string | null
  /** Player is currently live on Twitch (per AoE4World). */
  live: boolean
  /** This row is the current user. */
  isYou: boolean
}

/** Flattens leaderboard players into rows, marking the current user. */
export function buildLeaderboardRows(
  resp: LeaderboardResponse,
  youProfileId?: number | null,
): LeaderboardRow[] {
  return resp.players.map((p) => ({
    rank: p.rank,
    profileId: p.profile_id,
    name: p.name,
    country: p.country ?? null,
    rating: p.rating,
    winRate: p.win_rate ?? null,
    games: p.games_count ?? 0,
    wins: p.wins_count ?? 0,
    losses: p.losses_count ?? 0,
    streak: p.streak ?? 0,
    rankLevel: p.rank_level ?? null,
    live: p.twitch_is_live ?? false,
    isYou: youProfileId != null && p.profile_id === youProfileId,
  }))
}

export interface EsportsLeaderboardRow {
  rank: number
  profileId: number
  name: string
  country: string | null
  rating: number
  winRate: number | null
  games: number
  wins: number
  losses: number
  active: boolean
  liquipediaName: string | null
  isYou: boolean
}

export function buildEsportsLeaderboardRows(
  players: Array<{
    rank: number
    profile_id: number
    name: string
    country?: string | null
    rating: number
    win_rate?: number | null
    games_count?: number
    wins_count?: number
    losses_count?: number
    is_active?: boolean
    liquipedia_name?: string | null
  }>,
  youProfileId?: number | null,
): EsportsLeaderboardRow[] {
  return players.map((p) => ({
    rank: p.rank,
    profileId: p.profile_id,
    name: p.name,
    country: p.country ?? null,
    rating: p.rating,
    winRate: p.win_rate ?? null,
    games: p.games_count ?? 0,
    wins: p.wins_count ?? 0,
    losses: p.losses_count ?? 0,
    active: p.is_active !== false,
    liquipediaName: p.liquipedia_name ?? null,
    isYou: youProfileId != null && p.profile_id === youProfileId,
  }))
}
