import type { GameResult, GamePlayer } from '@api/types'

export type SimilarMatchQuality = 'exact' | 'same-matchup' | 'similar'
export type SimilarMatchDuration = 'shorter' | 'similar' | 'longer' | 'unknown'

export interface SimilarMatchPlayer {
  profileId: number
  name: string
  civilization: string
  result: GameResult
  rating: number | null
  mmr: number | null
}

export interface SimilarMatchTeam {
  index: number
  result: GameResult | 'unknown'
  players: SimilarMatchPlayer[]
}

export interface SimilarMatchCandidate {
  gameId: number
  startedAt: string
  map: string
  kind: string
  patch: string | null
  durationSec: number | null
  /** How the reference game's length compares with the current match. */
  durationRelation: SimilarMatchDuration
  /** Reference duration minus current duration, in seconds. */
  durationDeltaSec: number | null
  averageRating: number | null
  score: number
  quality: SimilarMatchQuality
  targetTeamIndex: number
  targetTeamWon: boolean
  referenceProfileId: number
  referenceCiv: string
  referenceRating: number | null
  teams: SimilarMatchTeam[]
  reasons: string[]
}

export interface SimilarMatchQuery {
  /** Active AoE4World profile whose complete local archive should be searched first. */
  profileId?: number | null
  gameId?: number | null
  map: string
  kind?: string | null
  patch?: string | null
  playedAt?: string | null
  targetCiv: string
  targetTeamCivs?: string[]
  enemyTeamCivs?: string[]
  /** Prefer examples where the requested civilization side won. */
  winsOnly?: boolean
  /** Prefer candidates whose average player rating is above this game rating. */
  ratingAbove?: number | null
  /** Prefer a reference that is no longer than the current game. */
  durationMaxSec?: number | null
  limit?: number
  lookbackDays?: number
}

/**
 * Ranks reference games for coaching: if any candidate is above the player's
 * rating, only that higher-rated pool is considered; within the pool the
 * highest average match rating wins. If no higher-rated match exists, the
 * best available matches are retained as a useful fallback.
 */
export function rankSimilarMatchCandidates(
  candidates: SimilarMatchCandidate[],
  ratingAbove: number | null | undefined,
  limit = 5,
): SimilarMatchCandidate[] {
  const higherRated =
    ratingAbove != null
      ? candidates.filter(
          (candidate) =>
            candidate.averageRating != null && candidate.averageRating > ratingAbove,
        )
      : []
  const pool = higherRated.length > 0 ? higherRated : candidates
  const safeLimit = Math.max(1, Math.min(5, Math.floor(limit)))
  return [...pool]
    .sort((a, b) => {
      const averageRatingDelta = (b.averageRating ?? -1) - (a.averageRating ?? -1)
      if (averageRatingDelta !== 0) return averageRatingDelta
      const referenceRatingDelta = (b.referenceRating ?? -1) - (a.referenceRating ?? -1)
      if (referenceRatingDelta !== 0) return referenceRatingDelta
      const durationPreference: Record<SimilarMatchDuration, number> = {
        shorter: 3,
        similar: 2,
        longer: 1,
        unknown: 0,
      }
      const durationDelta =
        durationPreference[b.durationRelation] - durationPreference[a.durationRelation]
      if (durationDelta !== 0) return durationDelta
      if (b.score !== a.score) return b.score - a.score
      return Date.parse(b.startedAt) - Date.parse(a.startedAt)
    })
    .slice(0, safeLimit)
}

export function compareMatchDurations(
  currentSec: number | null | undefined,
  referenceSec: number | null | undefined,
): { relation: SimilarMatchDuration; deltaSec: number | null } {
  if (
    currentSec == null ||
    referenceSec == null ||
    !Number.isFinite(currentSec) ||
    !Number.isFinite(referenceSec) ||
    currentSec <= 0 ||
    referenceSec <= 0
  ) {
    return { relation: 'unknown', deltaSec: null }
  }
  const deltaSec = Math.round(referenceSec - currentSec)
  if (deltaSec <= -60) return { relation: 'shorter', deltaSec }
  if (deltaSec <= 90) return { relation: 'similar', deltaSec }
  return { relation: 'longer', deltaSec }
}

export function normalizeMatchToken(value: string | null | undefined): string {
  return (value ?? '').trim().toLocaleLowerCase().replace(/\s+/g, ' ')
}

export function civMultiset(civs: string[]): string[] {
  return civs
    .map((civ) => normalizeMatchToken(civ))
    .filter(Boolean)
    .sort()
}

export function sameCivMultiset(left: string[], right: string[]): boolean {
  const a = civMultiset(left)
  const b = civMultiset(right)
  return a.length === b.length && a.every((value, index) => value === b[index])
}

export function gamePlayerRow(player: GamePlayer): SimilarMatchPlayer {
  return {
    profileId: player.profile_id,
    name: player.name,
    civilization: player.civilization,
    result: player.result,
    rating: player.rating ?? player.mmr ?? null,
    mmr: player.mmr ?? null,
  }
}

export function teamResult(players: SimilarMatchPlayer[]): GameResult | 'unknown' {
  if (players.length === 0) return 'unknown'
  if (players.every((player) => player.result === 'win')) return 'win'
  if (players.every((player) => player.result === 'loss')) return 'loss'
  return 'unknown'
}

export function inferGameKind(format: string | null | undefined, teamSize = 1): string | null {
  const value = normalizeMatchToken(format)
  if (value === 'rm_1v1' || value === 'qm_1v1') {
    return value === 'qm_1v1' ? 'qm_1v1' : 'rm_solo'
  }
  if (/^(?:rm|qm)_\d+v\d+$/.test(value)) return value
  if (/^\d+v\d+$/.test(value)) {
    return value === '1v1' ? 'rm_solo' : `rm_${value}`
  }
  return teamSize > 0 ? `rm_${teamSize}v${teamSize}` : null
}
