import { describe, expect, it } from 'vitest'
import type { Game, Player } from '@api/types'
import { buildLastMatchCoachContext } from '../coachContext'

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
