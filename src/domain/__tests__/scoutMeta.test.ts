import { describe, expect, it } from 'vitest'
import type { CivStatsResponse, MatchupStatsResponse, MapStatsResponse, TeamStatsResponse } from '../../api/types'
import type { AgeupStatsResponse } from '../landmarkStats'
import { buildScoutMetaContext } from '../scoutMeta'

const players = [
  [{ profileId: 1, name: 'Me', civ: 'english', rating: 1100, isMe: true }],
  [{ profileId: 2, name: 'Opp', civ: 'french', rating: 1120, isMe: false }],
]

function civStats(): CivStatsResponse {
  return {
    leaderboard: 'rm_solo',
    rank_level: 'gold',
    rating: '1000-1199',
    patch: '11308',
    data: [
      {
        civilization: 'english',
        win_rate: 51,
        pick_rate: 12,
        games_count: 1000,
        player_games_count: 1000,
        duration_median: 900,
        duration_average: 1000,
      },
      {
        civilization: 'french',
        win_rate: 49,
        pick_rate: 10,
        games_count: 900,
        player_games_count: 900,
        duration_median: 850,
        duration_average: 950,
      },
    ],
  }
}

function mapCivStats(): CivStatsResponse {
  return {
    ...civStats(),
    map_id: 7,
    map: 'Dry Arabia',
    data: civStats().data.map((row) => ({ ...row, win_rate: row.civilization === 'english' ? 56 : 47 })),
  }
}

function mapStats(): MapStatsResponse {
  return {
    leaderboard: 'rm_solo',
    rank_level: 'gold',
    rating: '1000-1199',
    patch: '11308',
    data: [
      {
        map_id: 7,
        map: 'Dry Arabia',
        games_count: 1000,
        duration_median: 900,
        duration_average: 1000,
      },
    ],
  }
}

function matchups(): MatchupStatsResponse {
  return {
    leaderboard: 'rm_solo',
    rank_level: 'gold',
    rating: '1000-1199',
    patch: '11308',
    data: [
      {
        civilization: 'english',
        other_civilization: 'french',
        win_rate: 54,
        win_count: 54,
        games_count: 100,
        player_games_count: 100,
        duration_median: 780,
        duration_average: 800,
      },
    ],
  }
}

function ageups(): AgeupStatsResponse {
  return {
    filter: { patch: '11308', rank_level: null, rating: null },
    data: {
      age1: [{ civilization: 'english', player_games_count: 100, win_count: 50, win_rate: 50 }],
      'age1-4': [
        {
          civilization: 'english',
          player_games_count: 30,
          win_count: 18,
          win_rate: 60,
          age2_pbgid: 1,
          age2_name: 'Council Hall',
          age2_finished_at_average: 300,
          age2_finished_at_minimum: 260,
          age2_finished_at_mode: 290,
          age3_pbgid: 2,
          age3_name: 'White Tower',
          age3_finished_at_average: 800,
          age3_finished_at_minimum: 720,
          age3_finished_at_mode: 780,
          age4_pbgid: 3,
          age4_name: 'Berkshire Palace',
          age4_finished_at_average: 1500,
          age4_finished_at_minimum: 1300,
          age4_finished_at_mode: 1450,
        },
        {
          civilization: 'english',
          player_games_count: 60,
          win_count: 27,
          win_rate: 45,
          age2_pbgid: 1,
          age2_name: 'Council Hall',
          age2_finished_at_average: 310,
          age2_finished_at_minimum: 270,
          age2_finished_at_mode: 300,
          age3_pbgid: 2,
          age3_name: 'White Tower',
          age3_finished_at_average: 820,
          age3_finished_at_minimum: 740,
          age3_finished_at_mode: 800,
        },
        {
          civilization: 'english',
          player_games_count: 10,
          win_count: 4,
          win_rate: 40,
        },
      ],
    },
    ageups_metadata: [],
  }
}

describe('buildScoutMetaContext', () => {
  it('joins exact map civ meta, directional matchup and team roster', () => {
    const context = buildScoutMetaContext({
      scope: {
        leaderboard: 'rm_solo',
        rankLevel: 'gold',
        rating: '1000-1199',
        patch: '11308',
        map: 'Dry Arabia',
        mapId: 7,
      },
      teams: players,
      civStats: civStats(),
      mapCivStats: mapCivStats(),
      mapStats: mapStats(),
      matchupStats: matchups(),
      ageups: { english: ageups() },
    })

    expect(context.teams[0]?.players[0]?.isMe).toBe(true)
    expect(context.civs.find((row) => row.civ === 'english')?.mapDelta).toBe(5)
    expect(context.matchups[0]).toMatchObject({ winRate: 54, games: 100, wins: 54 })
    expect(context.ageups[0]?.ages[0]).toMatchObject({ completedGames: 90, endedBeforeGames: 10 })
    expect(context.ageups[0]?.ages[2]?.landmarks[0]).toMatchObject({ fastestSec: 1300 })
    expect(context.ageups[0]?.paths.find((path) => path.age4 === 'Berkshire Palace')).toMatchObject({
      share: 30,
      winRate: 60,
    })
  })

  it('marks age-up bracket scope as unavailable when the source ignores it', () => {
    const context = buildScoutMetaContext({
      scope: {
        leaderboard: 'rm_solo',
        rankLevel: 'gold',
        rating: '1000-1199',
        patch: '11308',
        map: null,
        mapId: null,
      },
      teams: players,
      civStats: civStats(),
      mapCivStats: null,
      mapStats: mapStats(),
      matchupStats: matchups(),
      ageups: { english: ageups() },
    })

    expect(context.scope.ageupScope.patchApplied).toBe(true)
    expect(context.scope.ageupScope.rankLevelApplied).toBe(false)
    expect(context.scope.ageupScope.ratingApplied).toBe(false)
    expect(context.scope.ageupScope.mapApplied).toBe(false)
  })

  it('matches exact 2v2 civilization combinations and marks small samples as unreliable', () => {
    const teamPlayers = [
      [
        { profileId: 1, name: 'Me', civ: 'english', rating: 1100, elo: 1110, mmr: 1200, isMe: true },
        { profileId: 3, name: 'Ally', civ: 'french', rating: 1080, elo: 1090, mmr: 1180, isMe: false },
      ],
      [
        { profileId: 2, name: 'Opp', civ: 'malians', rating: 1120, elo: 1130, mmr: 1210, isMe: false },
        { profileId: 4, name: 'Partner', civ: 'english', rating: 1090, elo: 1100, mmr: 1190, isMe: false },
      ],
    ]
    const teamStats: TeamStatsResponse = {
      kind: 'rm_2v2',
      rating: '1200-1399',
      patch: '11308',
      data: [
        {
          civilization: ['english', 'french'],
          win_rate: 52,
          win_count: 26,
          games_count: 50,
          player_games_count: 50,
          duration_median: 900,
          duration_average: 950,
        },
        {
          civilization: ['english', 'malians'],
          win_rate: 60,
          win_count: 6,
          games_count: 10,
          player_games_count: 10,
        },
      ],
    }
    const context = buildScoutMetaContext({
      scope: {
        leaderboard: 'rm_2v2',
        rankLevel: null,
        rating: '1200-1399',
        patch: '11308',
        map: null,
        mapId: null,
      },
      teams: teamPlayers,
      civStats: civStats(),
      mapCivStats: null,
      mapStats: mapStats(),
      matchupStats: matchups(),
      teamStats,
      ageups: {},
    })

    expect(context.teams[0]).toMatchObject({ averageMmr: 1190, averageElo: 1100 })
    expect(context.teamCompositions).toEqual([
      expect.objectContaining({ civilizations: ['english', 'french'], games: 50, reliable: true }),
      expect.objectContaining({ civilizations: ['malians', 'english'], games: 10, reliable: false }),
    ])
  })
})
