import { describe, expect, it } from 'vitest'
import { calculatePlayerMacroProfile, type MacroInputRow } from '../playerMacroSummary'

describe('playerMacroSummary', () => {
  it('handles empty games list gracefully', () => {
    const res = calculatePlayerMacroProfile([], 12345)
    expect(res.totalGames).toBe(0)
    expect(res.playstyleTag).toBe('Balanced Strategist')
  })

  it('calculates win rates, average durations and identifies Aggressive Rusher', () => {
    const mockMatches: MacroInputRow[] = [
      {
        durationSec: 600, // 10 min
        result: 'win',
        civilization: 'english',
        map: 'Dry Arabia',
        opponentCivilizations: ['french'],
      },
      {
        durationSec: 720, // 12 min
        result: 'win',
        civilization: 'french',
        map: 'Dry Arabia',
        opponentCivilizations: ['english'],
      },
      {
        durationSec: 1800, // 30 min
        result: 'loss',
        civilization: 'english',
        map: 'Hill and Dale',
        opponentCivilizations: ['mongols'],
      },
    ]

    const res = calculatePlayerMacroProfile(mockMatches, 100)
    expect(res.totalGames).toBe(3)
    expect(res.wins).toBe(2)
    expect(res.losses).toBe(1)
    expect(res.winRatePct).toBe(67)
    expect(res.rushGamesCount).toBe(2)
    expect(res.playstyleTag).toBe('Aggressive Rusher')
    expect(res.civStats[0]?.civ).toBe('english')
    expect(res.civStats[0]?.games).toBe(2)
    expect(res.mapStats[0]?.map).toBe('Dry Arabia')
    expect(res.opponentCivCounters[0]?.civ).toBe('mongols')
    expect(res.recentForm).toHaveLength(3)
  })
})

