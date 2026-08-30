import { describe, it, expect } from 'vitest'
import { loadFixture } from '../../api/__tests__/fixtures'
import type { GamesResponse, Player } from '../../api/types'
import { summarizeRecentForm, computeStreak } from '../form'
import { mostPlayedCivs, mapPreferences } from '../usage'
import { buildScoutReport, foldEloIntoLadders, pickPrimaryMode, ratedModes } from '../scouting'
import { civDisplayName } from '../civ'
import type { RankInfo } from '../types'

const PID = 10240693
const games = loadFixture<GamesResponse>('games-10240693-rmsolo.json').games
const player = loadFixture<Player>('player-10240693.json')

describe('civDisplayName', () => {
  it('title-cases slugs and applies overrides', () => {
    expect(civDisplayName('abbasid_dynasty')).toBe('Abbasid Dynasty')
    expect(civDisplayName('zhu_xis_legacy')).toBe("Zhu Xi's Legacy")
    expect(civDisplayName('jeanne_darc')).toBe("Jeanne d'Arc")
    expect(civDisplayName('chinese')).toBe('Chinese')
  })
})

describe('computeStreak', () => {
  it('reads the leading run, signed by W/L', () => {
    expect(computeStreak(['L', 'L', 'W'])).toBe(-2)
    expect(computeStreak(['W', 'W', 'W', 'L'])).toBe(3)
    expect(computeStreak([])).toBe(0)
  })
})

describe('summarizeRecentForm (real fixture)', () => {
  it('computes Beasty 7-5 over 12 with a -2 loss streak', () => {
    const form = summarizeRecentForm(games, PID)
    expect(form.games).toBe(12)
    expect(form.wins).toBe(7)
    expect(form.losses).toBe(5)
    expect(form.winRate).toBe(58.3)
    expect(form.streak).toBe(-2)
    expect(form.lastResults.join('')).toBe('LLWLWWWWLWWL')
    expect(form.avgDurationSec).toBe(1181)
  })

  it('returns zeros (no throw) for an empty games list', () => {
    const form = summarizeRecentForm([], PID)
    expect(form).toMatchObject({ games: 0, wins: 0, losses: 0, winRate: null, streak: 0 })
  })
})

describe('mostPlayedCivs / mapPreferences (real fixture)', () => {
  it('ranks Chinese first (5 games) for Beasty', () => {
    const civs = mostPlayedCivs(games, PID)
    expect(civs[0]!.civ).toBe('chinese')
    expect(civs[0]!.games).toBe(5)
    expect(civs[0]!.civName).toBe('Chinese')
  })

  it('ranks Dry Arabia first (3 games)', () => {
    const maps = mapPreferences(games, PID)
    expect(maps[0]!.map).toBe('Dry Arabia')
    expect(maps[0]!.games).toBe(3)
  })
})

describe('pickPrimaryMode', () => {
  it('skips unranked rm_solo and picks the populated rm_1v1_elo', () => {
    const primary = pickPrimaryMode(player.modes)
    expect(primary?.leaderboard).toBe('rm_1v1_elo')
    expect(primary?.rating).toBe(1215)
  })

  it('returns null for an unranked player', () => {
    const unranked = loadFixture<Player>('player-unranked_synthetic.json')
    expect(pickPrimaryMode(unranked.modes)).toBeNull()
  })
})

describe('buildScoutReport', () => {
  it('assembles a full report from a real profile + games', () => {
    const report = buildScoutReport({ player, games })
    expect(report.hasData).toBe(true)
    expect(report.name).toBe('Beastyqt')
    expect(report.recentForm.wins).toBe(7)
    expect(report.topCivs[0]!.civ).toBe('chinese')
    expect(report.primary?.rating).toBe(1215)
    expect(report.note).toContain('Chinese')
  })

  it('degrades gracefully for an unranked player with no games', () => {
    const unranked = loadFixture<Player>('player-unranked_synthetic.json')
    const report = buildScoutReport({ player: unranked, games: [] })
    expect(report.hasData).toBe(false)
    expect(report.primary).toBeNull()
    expect(report.topCivs).toEqual([])
    expect(report.note).toContain('No recent public games')
  })
})

describe('foldEloIntoLadders', () => {
  const row = (leaderboard: string, extra: Partial<RankInfo> = {}): RankInfo => ({
    leaderboard,
    rankLevel: extra.rankLevel ?? null,
    rating: extra.rating ?? null,
    maxRating: extra.maxRating ?? null,
    rank: extra.rank ?? null,
    winRate: extra.winRate ?? null,
    gamesCount: extra.gamesCount ?? 10,
    winsCount: extra.winsCount,
    lossesCount: extra.lossesCount,
    matchmakingElo: extra.matchmakingElo,
    season: extra.season,
  })

  it('folds *_elo into the matching ranked row', () => {
    const rows = foldEloIntoLadders([
      row('rm_3v3', { rankLevel: 'silver_1', rating: 635, gamesCount: 28 }),
      row('rm_3v3_elo', { rating: 640, gamesCount: 28 }),
      row('rm_team', { rating: 617, gamesCount: 55 }),
    ])
    expect(rows.map((entry) => entry.leaderboard)).toEqual(['rm_3v3', 'rm_team'])
    expect(rows[0]!.matchmakingElo).toBe(640)
  })

  it('keeps an elo ladder when there is no ranked twin', () => {
    const rows = foldEloIntoLadders([row('rm_1v1_elo', { rating: 1215 })])
    expect(rows).toHaveLength(1)
    expect(rows[0]!.leaderboard).toBe('rm_1v1_elo')
  })

  it('merges Relic English labels with AoE4World ranked + elo twins', () => {
    const rows = foldEloIntoLadders([
      row('rm_3v3', { rankLevel: 'silver_1', rating: 635, gamesCount: 28, season: 13 }),
      row('rm_3v3_elo', { rating: 635, gamesCount: 28, winsCount: 9, lossesCount: 19 }),
      row('Ranked 3v3', { rating: 635, gamesCount: 28 }),
      row('rm_2v2', { rankLevel: 'gold_1', rating: 852, gamesCount: 19, season: 13 }),
      row('rm_2v2_elo', { rating: 831, gamesCount: 18, winsCount: 7, lossesCount: 11 }),
      row('Ranked 2v2', { rating: 831, gamesCount: 18 }),
    ])
    expect(rows.map((entry) => entry.leaderboard)).toEqual(['rm_3v3', 'rm_2v2'])
    expect(rows[0]).toMatchObject({
      rankLevel: 'silver_1',
      matchmakingElo: 635,
      winsCount: 9,
      lossesCount: 19,
      season: 13,
    })
    expect(rows[1]).toMatchObject({
      rankLevel: 'gold_1',
      rating: 852,
      matchmakingElo: 831,
    })
  })
})

describe('ratedModes', () => {
  it('does not list an *_elo twin beside its ranked ladder', () => {
    const rows = ratedModes({
      rm_3v3: { games_count: 28, rating: 635, rank_level: 'silver_1' },
      rm_3v3_elo: { games_count: 28, rating: 640 },
      rm_team: { games_count: 55, rating: 617 },
    })
    expect(rows.map((row) => row.leaderboard)).toEqual(['rm_team', 'rm_3v3'])
    expect(rows.find((row) => row.leaderboard === 'rm_3v3')?.matchmakingElo).toBe(640)
  })
})
