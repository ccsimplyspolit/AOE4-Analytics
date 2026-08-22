import { describe, expect, it } from 'vitest'
import { analyzeResourceLeakage } from '../resourceLeakage'
import type { PlayerSummary } from '../statsSummary'

function makeMockPlayerWithResources(overrides: Partial<PlayerSummary> = {}): PlayerSummary {
  return {
    playerId: 1,
    name: 'EcoPlayer',
    profileId: 9999,
    civToken: 'english',
    totals: {
      resourcesGathered: { food: 10000, wood: 8000, gold: 6000, stone: 1000 },
      resourcesSpent: { food: 9500, wood: 7400, gold: 5800, stone: 900 },
      unitsProduced: 60,
      unitsLost: 20,
      unitsKilled: 35,
      buildingsLost: 1,
      buildingsRazed: 5,
      techResearched: 12,
      largestArmy: 40,
      sacredCaptured: 0,
      sacredLost: 0,
      sacredNeutralized: 0,
      relicsCaptured: 3,
      villagerHigh: 55,
      age2Sec: 280, // 4:40
      age3Sec: 780, // 13:00
      age4Sec: null,
    },
    villagersLost: 3,
    buildOrder: [],
    resources: [
      // 0:00 - 3:00 Normal opening bank
      { timeSec: 60, bank: { food: 100, wood: 50, gold: 50, stone: 0 }, gathered: { food: 300, wood: 100, gold: 100, stone: 0 }, spent: { food: 200, wood: 50, gold: 50, stone: 0 }, perMinute: null },
      { timeSec: 180, bank: { food: 350, wood: 100, gold: 180, stone: 0 }, gathered: { food: 800, wood: 300, gold: 300, stone: 0 }, spent: { food: 450, wood: 200, gold: 120, stone: 0 }, perMinute: null },
      // 4:00 Saving for Feudal (exempt from float)
      { timeSec: 240, bank: { food: 420, wood: 80, gold: 210, stone: 0 }, gathered: { food: 1200, wood: 400, gold: 450, stone: 0 }, spent: { food: 780, wood: 320, gold: 240, stone: 0 }, perMinute: null },
      // 8:00 - 10:00 Massive Wood Float (~1100 wood)
      { timeSec: 480, bank: { food: 200, wood: 850, gold: 150, stone: 0 }, gathered: { food: 2500, wood: 2000, gold: 1200, stone: 0 }, spent: { food: 2300, wood: 1150, gold: 1050, stone: 0 }, perMinute: null },
      { timeSec: 540, bank: { food: 250, wood: 1100, gold: 200, stone: 0 }, gathered: { food: 3000, wood: 2600, gold: 1500, stone: 0 }, spent: { food: 2750, wood: 1500, gold: 1300, stone: 0 }, perMinute: null },
      { timeSec: 600, bank: { food: 300, wood: 1050, gold: 220, stone: 0 }, gathered: { food: 3600, wood: 3200, gold: 1800, stone: 0 }, spent: { food: 3300, wood: 2150, gold: 1580, stone: 0 }, perMinute: null },
      // 12:00 Spent wood on farms/barracks, bank returns to normal
      { timeSec: 720, bank: { food: 400, wood: 200, gold: 300, stone: 0 }, gathered: { food: 4800, wood: 4000, gold: 2400, stone: 0 }, spent: { food: 4400, wood: 3800, gold: 2100, stone: 0 }, perMinute: null },
    ],
    scores: [],
    ...overrides,
  }
}

describe('Resource Bank Leakage Analyzer', () => {
  it('correctly identifies wood floating interval and computes peak bank', () => {
    const player = makeMockPlayerWithResources()
    const report = analyzeResourceLeakage(player, 720)

    expect(report.playerId).toBe(1)
    expect(report.totalGathered).toBe(25000)
    expect(report.peakBank).toBe(1570)
    expect(report.peakBankTimeSec).toBe(600)
    expect(report.intervals.length).toBeGreaterThan(0)

    const woodInterval = report.intervals.find((i) => i.dominantResource === 'wood')
    expect(woodInterval).toBeDefined()
    expect(woodInterval?.peakAmount).toBeGreaterThanOrEqual(1100)
    expect(woodInterval?.advice).toContain('High Wood float')
  })

  it('handles empty resource arrays gracefully', () => {
    const emptyPlayer = makeMockPlayerWithResources({ resources: [] })
    const report = analyzeResourceLeakage(emptyPlayer, 500)

    expect(report.avgBank).toBe(0)
    expect(report.intervals.length).toBe(0)
    expect(report.leakageGrade).toBe('A')
  })
})
