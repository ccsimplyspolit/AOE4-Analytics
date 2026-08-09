import { describe, expect, it } from 'vitest'
import type { Game, GamePlayer } from '@api/types'
import { computeStreak, playerInGame, summarizeRecentForm } from '../form'

function player(profileId: number, result: GamePlayer['result']): GamePlayer {
  return {
    profile_id: profileId,
    name: `Player ${profileId}`,
    result,
    civilization: 'English',
    rating: null,
    rating_diff: null,
    mmr: null,
  }
}

function game(
  gameId: number,
  result: GamePlayer['result'],
  options: { ongoing?: boolean; duration?: number | null; wrapped?: boolean } = {},
): Game {
  const me = player(42, result)
  const opponent = player(99, 'loss')
  const slots = options.wrapped ? [[{ player: me }], [{ player: opponent }]] : [[me], [opponent]]
  return {
    game_id: gameId,
    started_at: `2026-08-0${gameId}T00:00:00Z`,
    duration: options.duration === undefined ? 600 : options.duration,
    map: 'Dry Arabia',
    kind: 'ranked',
    leaderboard: 'rm_solo',
    ongoing: options.ongoing ?? false,
    just_finished: false,
    teams: slots,
  }
}

describe('computeStreak', () => {
  it('returns zero for no results', () => {
    expect(computeStreak([])).toBe(0)
  })

  it('encodes a leading win or loss streak', () => {
    expect(computeStreak(['W', 'W', 'L'])).toBe(2)
    expect(computeStreak(['L', 'L', 'W'])).toBe(-2)
  })
})

describe('playerInGame and summarizeRecentForm', () => {
  it('finds direct and wrapped team slots', () => {
    expect(playerInGame(game(1, 'win'), 42)?.profile_id).toBe(42)
    expect(playerInGame(game(2, 'loss', { wrapped: true }), 42)?.result).toBe('loss')
    expect(playerInGame(game(3, 'win'), 123)).toBeUndefined()
  })

  it('skips ongoing, missing-player, and result-less games', () => {
    const resultless = game(4, null)
    resultless.teams = [[player(7, 'win')]]
    const summary = summarizeRecentForm(
      [game(1, 'win'), game(2, 'loss', { ongoing: true }), resultless],
      42,
    )
    expect(summary).toMatchObject({ games: 1, wins: 1, losses: 0, winRate: 100, streak: 1 })
  })

  it('calculates rounded win rate and average duration from finished results', () => {
    const summary = summarizeRecentForm(
      [
        game(1, 'win', { duration: 601 }),
        game(2, 'loss', { duration: 700 }),
        game(3, 'win', { duration: null }),
      ],
      42,
    )
    expect(summary.games).toBe(3)
    expect(summary.winRate).toBe(66.7)
    expect(summary.avgDurationSec).toBe(651)
    expect(summary.lastResults).toEqual(['W', 'L', 'W'])
  })
})
