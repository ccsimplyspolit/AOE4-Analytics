import { describe, expect, it, vi } from 'vitest'
import { ApiError, type Aoe4WorldClient } from '@api/client'
import type { Game, GamePlayer, GamesResponse } from '@api/types'
import { findSimilarMatches } from './similarMatchService'

function player(profileId: number, civilization: string, result: 'win' | 'loss'): GamePlayer {
  return {
    profile_id: profileId,
    name: `Player ${profileId}`,
    result,
    civilization,
    rating: 1500,
    rating_diff: null,
    mmr: null,
  }
}

const matchingGame: Game = {
  game_id: 42,
  started_at: '2026-08-06T22:00:00.000Z',
  duration: 900,
  map: 'Dry Arabia',
  kind: 'rm_1v1',
  leaderboard: 'rm_solo',
  ongoing: false,
  just_finished: false,
  teams: [[player(1, 'english', 'win')], [player(2, 'french', 'loss')]],
}

const query = {
  map: 'Dry Arabia',
  kind: 'rm_solo',
  targetCiv: 'english',
  targetTeamCivs: ['english'],
  enemyTeamCivs: ['french'],
  playedAt: '2026-08-09T00:00:00.000Z',
}

function gamePage(games: Game[]): GamesResponse {
  return { total_count: games.length, count: games.length, games }
}

describe('findSimilarMatches', () => {
  it('keeps already found examples when AoE4World rate-limits a later page', async () => {
    const getGames = vi
      .fn<Aoe4WorldClient['getGames']>()
      .mockResolvedValueOnce(gamePage(Array.from({ length: 50 }, () => matchingGame)))
      .mockRejectedValueOnce(new ApiError(429, 'https://aoe4world.com/api/v0/games?page=2'))

    const result = await findSimilarMatches(query, { getGames })

    expect(getGames).toHaveBeenCalledTimes(2)
    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        data: [expect.objectContaining({ gameId: 42 })],
      }),
    )
  })

  it('never scans beyond the five-page public sample', async () => {
    const getGames = vi
      .fn<Aoe4WorldClient['getGames']>()
      .mockResolvedValue(gamePage(Array.from({ length: 50 }, () => matchingGame)))

    await findSimilarMatches({ ...query, map: 'High View' }, { getGames })

    expect(getGames).toHaveBeenCalledTimes(5)
  })

  it('returns a retryable explanation when the first request is rate-limited', async () => {
    const getGames = vi
      .fn<Aoe4WorldClient['getGames']>()
      .mockRejectedValue(new ApiError(429, 'https://aoe4world.com/api/v0/games?page=1'))

    const result = await findSimilarMatches(query, { getGames })

    expect(result).toEqual({
      ok: false,
      error: {
        kind: 'api',
        message:
          'AoE4World is temporarily limiting public-game searches. Please try again in a minute.',
        status: 429,
      },
    })
  })
})
