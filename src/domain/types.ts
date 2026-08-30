/**
 * Domain models — the app's own vocabulary, decoupled from raw API shapes.
 * Pure types; no Node/Electron. Built by the `src/domain/*` functions.
 */

export interface RecentForm {
  /** Finished games counted (with a win/loss result). */
  games: number
  wins: number
  losses: number
  /** Win percentage (0–100), or null when no finished games. */
  winRate: number | null
  /** Current streak: positive = win streak, negative = loss streak. */
  streak: number
  /** Results most-recent-first, e.g. ['L','L','W', …]. */
  lastResults: ('W' | 'L')[]
  avgDurationSec: number | null
}

export interface CivUsage {
  civ: string
  civName: string
  games: number
  wins: number
  winRate: number | null
}

export interface MapUsage {
  map: string
  games: number
  wins: number
  winRate: number | null
}

export interface RankInfo {
  leaderboard: string
  rankLevel: string | null
  rating: number | null
  maxRating: number | null
  maxRating7d?: number | null
  maxRating1m?: number | null
  rank: number | null
  winRate: number | null
  gamesCount: number
  streak?: number | null
  winsCount?: number | null
  lossesCount?: number | null
  season?: number | null
  lastGameAt?: string | null
  dropsCount?: number | null
  disputesCount?: number | null
  /**
   * Hidden matchmaking Elo for the same queue, when AoE4World also publishes
   * a parallel `*_elo` ladder. Not a second mode — just the MMR behind the
   * public rank badge.
   */
  matchmakingElo?: number | null
}

export interface RatingHistoryPoint {
  atSec: number
  rating: number
}

export interface ModeCivUsage {
  civ: string
  civName: string
  games: number
  winRate: number | null
  pickRate: number | null
  mode: string
}

export interface TeammateStat {
  profileId: number
  name: string
  games: number
  wins: number
  winRate: number | null
}

export interface ModeCivGroup {
  mode: string
  civs: ModeCivUsage[]
}

export interface RatingHistorySeries {
  mode: string
  points: RatingHistoryPoint[]
}

export interface PreviousSeason {
  mode: string
  season: number
  rating: number | null
  rank: number | null
  rankLevel: string | null
  gamesCount: number
  winsCount: number | null
  lossesCount: number | null
  winRate: number | null
}

export interface PlayerSocialLinks {
  twitch: string | null
  youtube: string | null
  twitter: string | null
  instagram: string | null
  liquipedia: string | null
}

export interface ScoutReport {
  profileId: number
  name: string
  country: string | null
  /** Best/most-relevant rated mode (rm_solo preferred), or null if unranked. */
  primary: RankInfo | null
  /** All rated modes with games, most-played first. */
  modes: RankInfo[]
  recentForm: RecentForm
  topCivs: CivUsage[]
  topMaps: MapUsage[]
  /** AoE4World per-mode civilization sample (not the last-10 games slice). */
  modeCivs: ModeCivUsage[]
  modeCivGroups: ModeCivGroup[]
  ratingHistory: RatingHistoryPoint[]
  ratingHistories: RatingHistorySeries[]
  teammates: TeammateStat[]
  opponents: TeammateStat[]
  previousSeasons: PreviousSeason[]
  avatarUrl: string | null
  steamId: string | null
  social: PlayerSocialLinks
  lastGameAt: string | null
  siteUrl: string | null
  /** Plain-English "what to expect / how to counter" (enriched in Phase 2). */
  note: string
  /** False when the player has no public match history / no rated games. */
  hasData: boolean
}
