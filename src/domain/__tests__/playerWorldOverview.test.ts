import { describe, expect, it } from 'vitest'
import type { Game, Player } from '../../api/types'
import {
  civsByMode,
  civsFromPlayerModes,
  groupLaddersBySeason,
  groupPreviousSeasons,
  parseRatingHistory,
  previousSeasonsFromModes,
  ratingHistoryForPlayer,
  topOpponents,
  topTeammates,
} from '../playerWorldOverview'

describe('parseRatingHistory', () => {
  it('sorts unix-second keys and ignores junk', () => {
    const series = parseRatingHistory({
      '1787368144': { rating: 628, streak: -1, games_count: 51 },
      '1787420911': { rating: 603, streak: -2, games_count: 52 },
      nope: { rating: 1 },
    })
    expect(series).toEqual([
      { atSec: 1787368144, rating: 628 },
      { atSec: 1787420911, rating: 603 },
    ])
  })
})

describe('civsFromPlayerModes', () => {
  it('takes the mode with the largest civilization sample', () => {
    const civs = civsFromPlayerModes({
      rm_solo: { games_count: 2, civilizations: [{ civilization: 'english', games_count: 2, win_rate: 50, pick_rate: 100 }] },
      rm_team: {
        games_count: 52,
        civilizations: [
          { civilization: 'macedonian_dynasty', games_count: 36, win_rate: 41.666, pick_rate: 72 },
          { civilization: 'zhu_xis_legacy', games_count: 8, win_rate: 12.5, pick_rate: 16 },
        ],
      },
    })
    expect(civs[0]?.civ).toBe('macedonian_dynasty')
    expect(civs[0]?.games).toBe(36)
    expect(civs[0]?.winRate).toBe(41.7)
    expect(civs[0]?.mode).toBe('rm_team')
    expect(civsByMode({
      rm_solo: { games_count: 2, civilizations: [{ civilization: 'english', games_count: 2, win_rate: 50, pick_rate: 100 }] },
      rm_team: {
        games_count: 52,
        civilizations: [{ civilization: 'macedonian_dynasty', games_count: 36, win_rate: 41.666, pick_rate: 72 }],
      },
    }).map((group) => group.mode)).toEqual(['rm_team', 'rm_solo'])
  })
})

describe('ratingHistoryForPlayer / topTeammates', () => {
  it('reads the most-played mode history', () => {
    const player: Player = {
      name: 'P',
      profile_id: 1,
      modes: {
        rm_team: {
          games_count: 10,
          rating_history: {
            '10': { rating: 500 },
            '20': { rating: 520 },
          },
        },
      },
    }
    expect(ratingHistoryForPlayer(player).map((p) => p.rating)).toEqual([500, 520])
  })

  it('counts same-team partners from the subject’s wins', () => {
    const game = (id: number, win: boolean): Game => ({
      game_id: id,
      started_at: '2026-08-01T00:00:00Z',
      duration: 1000,
      map: 'Prairie',
      kind: 'rm_2v2',
      leaderboard: 'rm_team',
      ongoing: false,
      just_finished: false,
      teams: [
        [
          {
            player: {
              profile_id: 1,
              name: 'Me',
              result: win ? 'win' : 'loss',
              civilization: 'english',
              rating: 600,
              rating_diff: 10,
              mmr: null,
            },
          },
          {
            player: {
              profile_id: 2,
              name: 'Lanzerxyz',
              result: win ? 'win' : 'loss',
              civilization: 'french',
              rating: 700,
              rating_diff: 8,
              mmr: null,
            },
          },
        ],
        [
          {
            player: {
              profile_id: 3,
              name: 'Opp',
              result: win ? 'loss' : 'win',
              civilization: 'rus',
              rating: 650,
              rating_diff: -8,
              mmr: null,
            },
          },
        ],
      ],
    })
    const mates = topTeammates([game(1, true), game(2, false)], 1)
    expect(mates).toEqual([
      { profileId: 2, name: 'Lanzerxyz', games: 2, wins: 1, winRate: 50 },
    ])
    expect(topOpponents([game(1, true), game(2, false)], 1)).toEqual([
      { profileId: 3, name: 'Opp', games: 2, wins: 1, winRate: 50 },
    ])
  })
})

describe('previousSeasonsFromModes', () => {
  it('keeps finished seasons with their ladder key', () => {
    expect(
      previousSeasonsFromModes({
        rm_solo: {
          previous_seasons: [
            { season: 5, rating: 864, rank: 23522, rank_level: 'gold_2', games_count: 5, wins_count: 2, losses_count: 3, win_rate: 40 },
          ],
        },
      }),
    ).toEqual([
      {
        mode: 'rm_solo',
        season: 5,
        rating: 864,
        rank: 23522,
        rankLevel: 'gold_2',
        gamesCount: 5,
        winsCount: 2,
        lossesCount: 3,
        winRate: 40,
      },
    ])
  })
})


describe('elo twin folding', () => {
  it('hides *_elo twins when the ranked ladder is already in the list', () => {
    const modes = {
      rm_3v3: {
        games_count: 28,
        civilizations: [{ civilization: 'english', games_count: 28, win_rate: 50, pick_rate: 100 }],
        previous_seasons: [
          { season: 9, rating: 600, rank: 10, rank_level: 'gold_1', games_count: 20, wins_count: 10, losses_count: 10, win_rate: 50 },
        ],
      },
      rm_3v3_elo: {
        games_count: 28,
        civilizations: [{ civilization: 'english', games_count: 28, win_rate: 50, pick_rate: 100 }],
        previous_seasons: [
          { season: 9, rating: 640, rank: null, rank_level: null, games_count: 20, wins_count: 10, losses_count: 10, win_rate: 50 },
        ],
      },
    }
    expect(civsByMode(modes).map((group) => group.mode)).toEqual(['rm_3v3'])
    expect(previousSeasonsFromModes(modes).map((row) => row.mode)).toEqual(['rm_3v3'])
  })
})

describe('groupPreviousSeasons', () => {
  it('pages finished ladders by season, newest first', () => {
    const grouped = groupPreviousSeasons([
      {
        mode: 'rm_solo',
        season: 11,
        rating: 800,
        rank: 1,
        rankLevel: 'gold_1',
        gamesCount: 10,
        winsCount: 5,
        lossesCount: 5,
        winRate: 50,
      },
      {
        mode: 'rm_team',
        season: 12,
        rating: 900,
        rank: 2,
        rankLevel: 'gold_2',
        gamesCount: 8,
        winsCount: 4,
        lossesCount: 4,
        winRate: 50,
      },
      {
        mode: 'rm_solo',
        season: 12,
        rating: 910,
        rank: 3,
        rankLevel: 'gold_3',
        gamesCount: 12,
        winsCount: 7,
        lossesCount: 5,
        winRate: 58.3,
      },
    ])
    expect(grouped.map((group) => group.season)).toEqual([12, 11])
    expect(grouped[0]?.rows.map((row) => row.mode)).toEqual(['rm_solo', 'rm_team'])
    expect(grouped[1]?.rows).toHaveLength(1)
  })
})

describe('groupLaddersBySeason', () => {
  it('puts the live season first and keeps older seasons behind it', () => {
    const grouped = groupLaddersBySeason(
      [
        {
          leaderboard: 'rm_team',
          rankLevel: 'silver_3',
          rating: 653,
          maxRating: 955,
          rank: 70828,
          winRate: 32,
          gamesCount: 56,
          season: 13,
        },
        {
          leaderboard: 'qm_3v3',
          rankLevel: null,
          rating: 904,
          maxRating: null,
          rank: null,
          winRate: 0,
          gamesCount: 2,
        },
      ],
      [
        {
          mode: 'rm_solo',
          season: 12,
          rating: 910,
          rank: 3,
          rankLevel: 'gold_3',
          gamesCount: 12,
          winsCount: 7,
          lossesCount: 5,
          winRate: 58.3,
        },
      ],
      13,
    )
    expect(grouped.map((group) => ({ season: group.season, live: group.live }))).toEqual([
      { season: 13, live: true },
      { season: 12, live: false },
    ])
    expect(grouped[0]?.rows.map((row) => row.mode)).toEqual(['rm_team'])
    expect(grouped[1]?.rows).toHaveLength(1)
  })
})
