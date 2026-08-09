import { ApiError } from '@api/client'
import type { Game } from '@api/types'
import { normalizeTeams } from '@api/types'
import type {
  SimilarMatchCandidate,
  SimilarMatchQuery,
  SimilarMatchTeam,
} from '@domain/similarMatch'
import {
  gamePlayerRow,
  normalizeMatchToken,
  rankSimilarMatchCandidates,
  sameCivMultiset,
  teamResult,
} from '@domain/similarMatch'
import { getClient } from './appContext'
import type { IpcResult } from '@ipc/contract'
import { err, errFrom, ok } from './result'

// A public-game comparison is advisory, not an unbounded crawler. AoE4World's
// global feed exposes at most 20 pages, so scan the complete API window (up to
// 1,000 recent games) while still relying on the shared disk cache/rate limit.
const MAX_PAGES = 20
const DEFAULT_LIMIT = 5
const DEFAULT_LOOKBACK_DAYS = 365

class SimilarMatchValidationError extends Error {}

function parseQuery(input: unknown): SimilarMatchQuery {
  if (!input || typeof input !== 'object') {
    throw new SimilarMatchValidationError('Map and civilization are required.')
  }
  const value = input as Record<string, unknown>
  const map = typeof value.map === 'string' ? value.map.trim() : ''
  const targetCiv = typeof value.targetCiv === 'string' ? value.targetCiv.trim() : ''
  if (!map || !targetCiv) {
    throw new SimilarMatchValidationError('Map and civilization are required.')
  }
  const readCivs = (candidate: unknown): string[] | undefined => {
    if (!Array.isArray(candidate)) return undefined
    return candidate.filter(
      (item): item is string => typeof item === 'string' && item.trim().length > 0,
    )
  }
  const limit =
    typeof value.limit === 'number' && Number.isFinite(value.limit) ? value.limit : DEFAULT_LIMIT
  const lookbackDays =
    typeof value.lookbackDays === 'number' && Number.isFinite(value.lookbackDays)
      ? value.lookbackDays
      : DEFAULT_LOOKBACK_DAYS
  return {
    gameId:
      typeof value.gameId === 'number' && Number.isSafeInteger(value.gameId) ? value.gameId : null,
    map,
    kind: typeof value.kind === 'string' && value.kind.trim() ? value.kind.trim() : null,
    patch: typeof value.patch === 'string' && value.patch.trim() ? value.patch.trim() : null,
    playedAt: typeof value.playedAt === 'string' ? value.playedAt : null,
    targetCiv,
    targetTeamCivs: readCivs(value.targetTeamCivs),
    enemyTeamCivs: readCivs(value.enemyTeamCivs),
    winsOnly: value.winsOnly !== false,
    ratingAbove:
      typeof value.ratingAbove === 'number' && Number.isFinite(value.ratingAbove)
        ? value.ratingAbove
        : null,
    limit: Math.max(1, Math.min(5, Math.floor(limit))),
    lookbackDays: Math.max(30, Math.min(730, Math.floor(lookbackDays))),
  }
}

function playerTeams(game: Game): SimilarMatchTeam[] {
  return normalizeTeams(game).map((players, index) => {
    const rows = players.map(gamePlayerRow)
    return { index, result: teamResult(rows), players: rows }
  })
}

function averageRating(teams: SimilarMatchTeam[]): number | null {
  const values = teams
    .flatMap((team) => team.players.map((player) => player.rating ?? 0))
    .filter((value) => value > 0)
  return values.length > 0
    ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
    : null
}

function teamCivs(team: SimilarMatchTeam): string[] {
  return team.players.map((player) => player.civilization)
}

function otherTeamCivs(teams: SimilarMatchTeam[], teamIndex: number): string[] {
  return teams.filter((team) => team.index !== teamIndex).flatMap(teamCivs)
}

function sameMap(left: string, right: string): boolean {
  return normalizeMatchToken(left) === normalizeMatchToken(right)
}

function dateDistanceDays(left: string | null | undefined, right: string): number | null {
  if (!left) return null
  const a = Date.parse(left)
  const b = Date.parse(right)
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null
  return Math.abs(a - b) / 86_400_000
}

function matchCandidate(game: Game, query: SimilarMatchQuery): SimilarMatchCandidate | null {
  if (game.ongoing || !sameMap(game.map, query.map)) return null
  const teams = playerTeams(game)
  if (teams.length < 2 || teams.some((team) => team.players.length === 0)) return null

  const targetTeamCivs = query.targetTeamCivs?.length ? query.targetTeamCivs : [query.targetCiv]
  const enemyTeamCivs = query.enemyTeamCivs ?? []
  const targetCiv = normalizeMatchToken(query.targetCiv)
  const targetTeamIndex =
    teams.find((team) => sameCivMultiset(teamCivs(team), targetTeamCivs))?.index ??
    teams.find((team) =>
      team.players.some((player) => normalizeMatchToken(player.civilization) === targetCiv),
    )?.index
  if (targetTeamIndex == null) return null

  const actualTargetCivs = teamCivs(teams[targetTeamIndex]!)
  const actualEnemyCivs = otherTeamCivs(teams, targetTeamIndex)
  const targetTeamExact = sameCivMultiset(actualTargetCivs, targetTeamCivs)
  const enemyTeamExact =
    enemyTeamCivs.length === 0 || sameCivMultiset(actualEnemyCivs, enemyTeamCivs)
  const requestedPool = [...targetTeamCivs, ...enemyTeamCivs]
  const actualPool = [...actualTargetCivs, ...actualEnemyCivs]
  const samePool = requestedPool.length > 0 && sameCivMultiset(actualPool, requestedPool)
  const containsRequestedEnemies = enemyTeamCivs.every((civ) =>
    actualEnemyCivs.some(
      (candidate) => normalizeMatchToken(candidate) === normalizeMatchToken(civ),
    ),
  )
  if (!targetTeamExact && !samePool && !containsRequestedEnemies) return null

  const targetTeamResult = teams[targetTeamIndex]!.result
  if (targetTeamResult !== 'win' && targetTeamResult !== 'loss') return null
  const targetTeamWon = targetTeamResult === 'win'
  if (query.winsOnly && !targetTeamWon) return null
  const queryKind = normalizeMatchToken(query.kind)
  const gameKind = normalizeMatchToken(game.kind)
  const kindExact =
    !queryKind ||
    queryKind === gameKind ||
    gameKind.endsWith(queryKind) ||
    (queryKind === 'rm_solo' && gameKind === 'rm_1v1')
  const patchExact = !query.patch || String(game.patch ?? '') === String(query.patch)
  const quality =
    targetTeamExact && enemyTeamExact ? 'exact' : samePool ? 'same-matchup' : 'similar'
  const distance = dateDistanceDays(query.playedAt, game.started_at)
  if (distance != null && distance > (query.lookbackDays ?? DEFAULT_LOOKBACK_DAYS)) return null

  const reference =
    teams[targetTeamIndex]!.players.find(
      (player) => normalizeMatchToken(player.civilization) === targetCiv && player.result === 'win',
    ) ??
    teams[targetTeamIndex]!.players.find(
      (player) => normalizeMatchToken(player.civilization) === targetCiv,
    )
  if (!reference) return null

  const reasons = ['Exact map']
  if (kindExact) reasons.push('Same game mode')
  if (targetTeamExact && enemyTeamExact) reasons.push('Same civilization sides')
  else if (samePool) reasons.push('Same civilizations, side order may differ')
  else reasons.push('Same map and target civilization, partial matchup')
  if (patchExact) reasons.push('Same patch')
  if (targetTeamWon) reasons.push('Target civilization won')

  const score =
    50 +
    (kindExact ? 20 : 0) +
    (quality === 'exact' ? 20 : quality === 'same-matchup' ? 12 : 4) +
    (patchExact ? 8 : 0) +
    (targetTeamWon ? 16 : 0) +
    (distance == null
      ? 0
      : Math.max(0, 5 - (distance / (query.lookbackDays ?? DEFAULT_LOOKBACK_DAYS)) * 5)) +
    Math.min(6, (averageRating(teams) ?? 0) / 300)

  return {
    gameId: game.game_id,
    startedAt: game.started_at,
    map: game.map,
    kind: game.kind,
    patch: game.patch == null ? null : String(game.patch),
    durationSec: game.duration,
    averageRating: averageRating(teams) ?? game.average_rating ?? null,
    score: Math.round(score * 10) / 10,
    quality,
    targetTeamIndex,
    targetTeamWon,
    referenceProfileId: reference.profileId,
    referenceCiv: reference.civilization,
    referenceRating: reference.rating,
    teams,
    reasons,
  }
}

/** Search a small, cached slice of the public game feed for a coaching example. */
export async function findSimilarMatches(
  input: unknown,
  gamesSource: Pick<ReturnType<typeof getClient>, 'getGames'> = getClient(),
): Promise<IpcResult<SimilarMatchCandidate[]>> {
  try {
    const query = parseQuery(input)
    const sinceDate = new Date(
      Date.parse(query.playedAt ?? new Date().toISOString()) -
        (query.lookbackDays ?? DEFAULT_LOOKBACK_DAYS) * 86_400_000,
    )
    const unique = new Map<number, SimilarMatchCandidate>()
    // The global feed documents rm_1v1 and qm_* filters, but not every ranked
    // team kind. Keep RM 2v2/3v3/4v4 in the feed and filter those locally.
    const desiredKind =
      query.kind && /^(?:rm_solo|rm_1v1|qm_[1-4]v[1-4])$/i.test(query.kind)
        ? query.kind.toLocaleLowerCase() === 'rm_solo'
          ? 'rm_1v1'
          : query.kind
        : undefined

    for (let page = 1; page <= MAX_PAGES; page++) {
      let response
      try {
        response = await gamesSource.getGames({
          page,
          perPage: 50,
          leaderboard: desiredKind,
          since: sinceDate.toISOString(),
          order: 'started_at',
        })
      } catch (error) {
        if (error instanceof ApiError && error.status === 429) {
          if (unique.size > 0) break
          return err(
            'api',
            'AoE4World is temporarily limiting public-game searches. Please try again in a minute.',
            429,
          )
        }
        throw error
      }
      for (const game of response.games) {
        if (query.gameId != null && game.game_id === query.gameId) continue
        const candidate = matchCandidate(game, query)
        if (candidate) unique.set(candidate.gameId, candidate)
      }
      if (response.games.length === 0 || response.games.length < 50) break
    }

    return ok(
      rankSimilarMatchCandidates(
        [...unique.values()],
        query.ratingAbove,
        query.limit ?? DEFAULT_LIMIT,
      ),
    )
  } catch (error) {
    return error instanceof SimilarMatchValidationError
      ? err('validation', error.message)
      : errFrom(error)
  }
}
