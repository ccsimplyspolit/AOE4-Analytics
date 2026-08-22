import { describe, expect, it } from 'vitest'
import { analyzeTcIdleTime } from '../tcIdleDetector'
import type { PlayerSummary } from '../statsSummary'

function makeMockPlayer(overrides: Partial<PlayerSummary> = {}): PlayerSummary {
  return {
    playerId: 1,
    name: 'TestPlayer',
    profileId: 12345,
    civToken: 'french',
    totals: {
      resourcesGathered: { food: 5000, wood: 4000, gold: 3000, stone: 500 },
      resourcesSpent: { food: 4800, wood: 3800, gold: 2900, stone: 450 },
      unitsProduced: 45,
      unitsLost: 10,
      unitsKilled: 25,
      buildingsLost: 0,
      buildingsRazed: 3,
      techResearched: 8,
      largestArmy: 30,
      sacredCaptured: 0,
      sacredLost: 0,
      sacredNeutralized: 0,
      relicsCaptured: 2,
      villagerHigh: 40,
      age2Sec: 270, // 4:30 Feudal
      age3Sec: 720, // 12:00 Castle
      age4Sec: null,
    },
    villagersLost: 2,
    buildOrder: [
      // Dark Age: 0 to 270
      { timeSec: 25, playerId: 1, category: 'unit', blueprint: 'unit_villager_1_fre', name: 'Villager' },
      { timeSec: 45, playerId: 1, category: 'unit', blueprint: 'unit_villager_1_fre', name: 'Villager' },
      { timeSec: 65, playerId: 1, category: 'unit', blueprint: 'unit_villager_1_fre', name: 'Villager' },
      { timeSec: 85, playerId: 1, category: 'unit', blueprint: 'unit_villager_1_fre', name: 'Villager' },
      { timeSec: 105, playerId: 1, category: 'unit', blueprint: 'unit_villager_1_fre', name: 'Villager' },
      // Notice an idle gap between 105 and 165 (60s gap, 40s idle)
      { timeSec: 165, playerId: 1, category: 'unit', blueprint: 'unit_villager_1_fre', name: 'Villager' },
      { timeSec: 185, playerId: 1, category: 'unit', blueprint: 'unit_villager_1_fre', name: 'Villager' },
      // Feudal Age: 270 to 720
      { timeSec: 300, playerId: 1, category: 'unit', blueprint: 'unit_villager_1_fre', name: 'Villager' },
      { timeSec: 320, playerId: 1, category: 'unit', blueprint: 'unit_villager_1_fre', name: 'Villager' },
      // Idle gap in Feudal: 320 to 420 (100s gap, 80s idle)
      { timeSec: 420, playerId: 1, category: 'unit', blueprint: 'unit_villager_1_fre', name: 'Villager' },
      { timeSec: 440, playerId: 1, category: 'unit', blueprint: 'unit_villager_1_fre', name: 'Villager' },
    ],
    resources: [
      {
        timeSec: 900,
        bank: { food: 200, wood: 150, gold: 80, stone: 0 },
        gathered: { food: 5000, wood: 4000, gold: 3000, stone: 500 },
        spent: { food: 4800, wood: 3800, gold: 2900, stone: 450 },
        perMinute: null,
      },
    ],
    scores: [],
    ...overrides,
  }
}

describe('Town Center Idle Time Detector', () => {
  it('detects idle windows in Dark Age and Feudal Age accurately', () => {
    const player = makeMockPlayer()
    const report = analyzeTcIdleTime(player, 900)

    expect(report.playerId).toBe(1)
    expect(report.totalVillagersTrained).toBe(11)
    expect(report.idleWindows.length).toBeGreaterThan(0)

    const darkAge = report.ages.find((a) => a.age === 'dark')
    expect(darkAge).toBeDefined()
    expect(darkAge?.startSec).toBe(0)
    expect(darkAge?.endSec).toBe(270)
    expect(darkAge?.villagersTrained).toBe(7)

    const feudalAge = report.ages.find((a) => a.age === 'feudal')
    expect(feudalAge).toBeDefined()
    expect(feudalAge?.startSec).toBe(270)
    expect(feudalAge?.endSec).toBe(720)
    expect(feudalAge?.villagersTrained).toBe(4)

    expect(report.lostVillagersTotal).toBeGreaterThan(0)
    expect(report.estimatedLostResources).toBeGreaterThan(0)
  })

  it('assigns performance grade based on first 15 min uptime', () => {
    const perfectPlayer = makeMockPlayer({
      buildOrder: Array.from({ length: 45 }, (_, i) => ({
        timeSec: (i + 1) * 20,
        playerId: 1,
        category: 'unit',
        blueprint: 'unit_villager_1_fre',
        name: 'Villager',
      })),
    })

    const report = analyzeTcIdleTime(perfectPlayer, 900)
    expect(report.first15MinUptimePercent).toBeGreaterThanOrEqual(95)
    expect(report.performanceGrade).toBe('S')
  })
})
