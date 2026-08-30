import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Aoe4WorldClient } from '@api/client'
import type { Game, GamePlayer } from '@api/types'
import { findTwitchVod } from './twitchVodService'
import { getClient } from './appContext'

vi.mock('./appContext', () => ({
  getClient: vi.fn(),
}))

function player(
  profileId: number,
  civilization: string,
  result: 'win' | 'loss',
  twitchVideoUrl?: string,
): GamePlayer {
  return {
    profile_id: profileId,
    name: `Player ${profileId}`,
    result,
    civilization,
    rating: 1_000,
    rating_diff: null,
    mmr: null,
    twitch_video_url: twitchVideoUrl,
  }
}

afterEach(() => vi.clearAllMocks())

describe('twitch VOD service', () => {
  it('uses AoE4World direct game association before Finder HTML', async () => {
    const game: Game = {
      game_id: 237594260,
      started_at: '2026-06-10T21:06:40.000Z',
      duration: 1_739,
      map: 'Highwoods',
      kind: 'rm_1v1',
      leaderboard: 'rm_solo',
      ongoing: false,
      just_finished: false,
      teams: [
        [player(17776510, 'golden_horde', 'win')],
        [
          player(
            5452192,
            'macedonian_dynasty',
            'loss',
            'https://www.twitch.tv/videos/2793503526?t=6773s',
          ),
        ],
      ],
    }
    const getGame = vi.fn<Aoe4WorldClient['getGame']>().mockResolvedValue(game)
    vi.mocked(getClient).mockReturnValue({ getGame } as unknown as Aoe4WorldClient)

    const result = await findTwitchVod({
      gameId: '237594260',
      profileId: 5452192,
      civilization: 'macedonian_dynasty',
      map: 'Highwoods',
      durationSec: 1_739,
    })

    expect(result).toEqual({
      ok: true,
      data: {
        gameId: '237594260',
        finderUrl:
          'https://aoe4world.com/tools/twitch-video-finder?civilization=macedonian_dynasty&map=Highwoods&game_length=25-29mins',
        checkedPages: 0,
        vod: {
          gameId: '237594260',
          videoId: '2793503526',
          offsetSec: 6_773,
          url: 'https://www.twitch.tv/videos/2793503526?t=6773s',
        },
      },
    })
    expect(getGame).toHaveBeenCalledWith(5452192, 237594260, { includeAlts: true })
  })
})
