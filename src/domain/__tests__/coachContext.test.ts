import { describe, expect, it } from 'vitest'
import type { Game, Player } from '@api/types'
import type { ScoutMatchRow } from '../../../electron/ipc/contract'
import type { StoredMatch } from '../../store/historyStore'
import {
  buildCoachContextFromGame,
  buildCoachContextFromScoutMatch,
  buildCoachContextFromStoredMatch,
  buildLastMatchCoachContext,
} from '../coachContext'

const player: Player = {
  profile_id: 42,
  name: 'Coach Test',
  country: 'UA',
  modes: {},
}

describe('last match coach context', () => {
  it('normalizes direct last-game teams and separates teammates from opponents', () => {
    const game: Game = {
      game_id: 9001,
      started_at: '2026-08-08T12:00:00Z',
      duration: 1234,
      map: 'Dry Arabia',
      kind: 'rm_2v2',
      leaderboard: 'rm_2v2',
      patch: 10604,
      ongoing: false,
      just_finished: false,
      teams: [
        [
          {
            profile_id: 42,
            name: 'Coach Test',
            civilization: 'english',
            result: 'win',
            rating: null,
            rating_diff: null,
            mmr: 1200,
          },
          {
            profile_id: 43,
            name: 'Ally',
            civilization: 'french',
            result: 'win',
            rating: null,
            rating_diff: null,
            mmr: 1200,
          },
        ],
        [
          {
            profile_id: 44,
            name: 'Enemy',
            civilization: 'mongols',
            result: 'loss',
            rating: null,
            rating_diff: null,
            mmr: 1200,
          },
        ],
      ],
    }

    const context = buildLastMatchCoachContext(player, game)
    expect(context.player.civilization).toBe('english')
    expect(context.teammates.map((item) => item.civilization)).toEqual(['french'])
    expect(context.opponents.map((item) => item.civilization)).toEqual(['mongols'])
    expect(context.game.patch).toBe('10604')
    expect(context.game.isFfa).toBe(false)
  })
})

describe('coach context builders', () => {
  it('builds from scout match row', () => {
    const row: ScoutMatchRow = {
      gameId: 55,
      startedAt: '2026-08-01T12:00:00Z',
      durationSec: 800,
      map: 'Dry Arabia',
      format: '1v1',
      result: 'loss',
      civilization: 'english',
      opponentCivilizations: ['french'],
      opponentNames: ['Enemy'],
    }
    const context = buildCoachContextFromScoutMatch(row, {
      profileId: 10,
      name: 'Scout Player',
    })
    expect(context.player.civilization).toBe('english')
    expect(context.opponents[0]?.civilization).toBe('french')
    expect(context.game.gameId).toBe(55)
  })

  it('builds from stored match', () => {
    const match: StoredMatch = {
      id: '123',
      playedAt: '2026-08-01T12:00:00Z',
      result: 'win',
      civ: 'english',
      oppCiv: 'french',
      oppName: 'Enemy',
      map: 'Dry Arabia',
      durationSec: 700,
      rating: 1200,
      ratingDiff: 10,
      analysis: {
        result: 'win',
        signals: [],
        apm: 80,
        grade: 'B',
        summary: 'Win',
        hasLocalStats: false,
      },
      goals: [],
      priorGoalChecks: [],
      createdAt: '2026-08-01T13:00:00Z',
      format: '1v1',
    }
    const context = buildCoachContextFromStoredMatch(match, 99, 'Me')
    expect(context.player.result).toBe('win')
    expect(context.opponents[0]?.civilization).toBe('french')
  })

  it('builds from public game', () => {
    const game: Game = {
      game_id: 77,
      started_at: '2026-08-01T12:00:00Z',
      duration: 600,
      map: 'Dry Arabia',
      kind: 'rm_solo',
      leaderboard: 'rm_solo',
      patch: 10604,
      ongoing: false,
      just_finished: false,
      teams: [
        [
          {
            profile_id: 5,
            name: 'A',
            civilization: 'english',
            result: 'win',
            rating: null,
            rating_diff: null,
            mmr: 1200,
          },
        ],
        [
          {
            profile_id: 6,
            name: 'B',
            civilization: 'french',
            result: 'loss',
            rating: null,
            rating_diff: null,
            mmr: 1100,
          },
        ],
      ],
    }
    const context = buildCoachContextFromGame(game, 5, { name: 'A', country: null })
    expect(context?.player.civilization).toBe('english')
    expect(context?.opponents[0]?.civilization).toBe('french')
  })
})
