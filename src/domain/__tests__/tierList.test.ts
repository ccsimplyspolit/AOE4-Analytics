import { describe, it, expect } from 'vitest'
import { loadFixture } from '../../api/__tests__/fixtures'
import type { CivStatsResponse } from '../../api/types'
import { aggregateCivStatsByMapPool, buildTierList, tierForWinRate } from '../tierList'

const stats = loadFixture<CivStatsResponse>('stats-rmsolo-civilizations.json')

describe('tierForWinRate', () => {
  it('maps win rate to the right band', () => {
    expect(tierForWinRate(56)).toBe('Z')
    expect(tierForWinRate(54)).toBe('Z')
    expect(tierForWinRate(53)).toBe('S')
    expect(tierForWinRate(52.5)).toBe('S')
    expect(tierForWinRate(51.4)).toBe('A')
    expect(tierForWinRate(50)).toBe('B')
    expect(tierForWinRate(48)).toBe('C')
    expect(tierForWinRate(45)).toBe('D')
  })
})

describe('buildTierList (real fixture)', () => {
  const result = buildTierList(stats)

  it('places the top civ (≥54%) in Z, above S, and the lowest in D', () => {
    expect(result.civs[0]!.civ).toBe('macedonian_dynasty') // 55.0% win rate
    expect(result.civs[0]!.tier).toBe('Z')
    const last = result.civs[result.civs.length - 1]!
    expect(last.civ).toBe('chinese')
    expect(last.tier).toBe('D')
  })

  it('covers all civilizations exactly once across tiers', () => {
    const total = result.civs.length
    const grouped = Object.values(result.byTier).reduce((s, arr) => s + arr.length, 0)
    expect(grouped).toBe(total)
    expect(total).toBe(stats.data.length)
  })

  it('sorts by win rate descending and includes a methodology note', () => {
    for (let i = 1; i < result.civs.length; i++) {
      expect(result.civs[i - 1]!.winRate).toBeGreaterThanOrEqual(result.civs[i]!.winRate)
    }
    expect(result.methodology).toContain('win rate')
  })

  it('flags low-sample civs by the threshold', () => {
    const flagged = buildTierList(stats, { minGames: 1_000_000 })
    expect(flagged.civs.every((c) => c.lowSample)).toBe(true)
  })
})

describe('aggregateCivStatsByMapPool', () => {
  it('weights civ meta by actual map games instead of averaging map percentages', () => {
    const slice = (mapId: number, games: number, wins: number): CivStatsResponse => ({
      leaderboard: 'rm_solo',
      rank_level: null,
      rating: null,
      patch: '11308',
      map_id: mapId,
      data: [
        {
          civilization: 'english',
          win_rate: (wins / games) * 100,
          pick_rate: 50,
          win_count: wins,
          games_count: games,
          player_games_count: games,
          duration_median: 600,
          duration_average: 600,
        },
      ],
    })

    const result = aggregateCivStatsByMapPool([slice(1, 100, 60), slice(2, 10, 0)])
    expect(result?.data[0]?.win_rate).toBeCloseTo((60 / 110) * 100)
    expect(result?.data[0]?.games_count).toBe(110)
  })

  it('derives wins when map-specific API slices omit win_count', () => {
    const result = aggregateCivStatsByMapPool([
      {
        leaderboard: 'rm_solo',
        rank_level: null,
        rating: null,
        patch: '11308',
        data: [
          {
            civilization: 'english',
            win_rate: 55,
            pick_rate: 50,
            games_count: 100,
            player_games_count: 100,
            duration_median: 600,
            duration_average: 600,
          },
        ],
      },
    ])
    expect(result?.data[0]?.win_count).toBeCloseTo(55)
    expect(result?.data[0]?.win_rate).toBeCloseTo(55)
  })
})
