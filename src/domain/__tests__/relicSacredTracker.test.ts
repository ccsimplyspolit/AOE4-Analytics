import { describe, it, expect } from 'vitest'
import {
  analyzeRelicSacredPerformance,
  isReligiousUnit,
  isReligiousBuilding,
} from '../relicSacredTracker'
import type { BuildEvent, PlayerSummary } from '../statsSummary'

describe('relicSacredTracker', () => {
  it('identifies religious units and buildings accurately across civilizations', () => {
    const monkEvent: BuildEvent = {
      timeSec: 600,
      playerId: 1,
      category: 'unit',
      blueprint: 'unit_monk_3_hre',
      name: 'Prelate',
    }
    const warriorMonkEvent: BuildEvent = {
      timeSec: 620,
      playerId: 1,
      category: 'unit',
      blueprint: 'unit_warrior_monk',
      name: 'Warrior Monk',
    }
    const archeryEvent: BuildEvent = {
      timeSec: 300,
      playerId: 1,
      category: 'building',
      blueprint: 'building_archery_range',
      name: 'Archery Range',
    }
    const regnitzEvent: BuildEvent = {
      timeSec: 550,
      playerId: 1,
      category: 'building',
      blueprint: 'landmark_hre_regnitz',
      name: 'Regnitz Cathedral',
    }

    expect(isReligiousUnit(monkEvent)).toBe(true)
    expect(isReligiousUnit(warriorMonkEvent)).toBe(true)
    expect(isReligiousBuilding(archeryEvent)).toBe(false)
    expect(isReligiousBuilding(regnitzEvent)).toBe(true)
  })

  it('detects HRE/OOTD zero relics warning and calculates passive gold opportunity loss', () => {
    const player: PlayerSummary = {
      playerId: 1,
      name: 'ProHrePlayer',
      profileId: 100,
      civToken: 'hre',
      villagersLost: 5,
      buildOrder: [],
      resources: [],
      scores: [],
      totals: {
        resourcesGathered: { food: 10000, wood: 8000, gold: 6000, stone: 0 },
        resourcesSpent: { food: 9500, wood: 7500, gold: 5500, stone: 0 },
        unitsProduced: 40,
        unitsLost: 35,
        unitsKilled: 20,
        buildingsLost: 5,
        buildingsRazed: 1,
        techResearched: 12,
        largestArmy: 30,
        sacredCaptured: 0,
        sacredLost: 0,
        sacredNeutralized: 0,
        relicsCaptured: 0,
        villagerHigh: 75,
        age2Sec: 260,
        age3Sec: 500, // 8:20 Castle Age
        age4Sec: null,
      },
    }

    const events: BuildEvent[] = [
      {
        timeSec: 510,
        playerId: 1,
        category: 'building',
        blueprint: 'landmark_hre_regnitz',
        name: 'Regnitz Cathedral',
      },
      // No monk trained throughout the match
    ]

    // 25 min match (1500s)
    const report = analyzeRelicSacredPerformance(player, events, 1500)

    expect(report.relicsCaptured).toBe(0)
    expect(report.monksProducedTotal).toBe(0)
    expect(report.monkDelayAfterAge3Sec).toBe(1000)
    expect(report.estimatedPassiveGoldLost).toBeGreaterThan(3000)
    expect(report.warnings.length).toBeGreaterThan(0)
    expect(report.warnings[0]).toContain('Regnitz')
    expect(report.performanceGrade).toBe('D')
  })

  it('recognizes Delhi early sacred site capture and rewards S-grade performance', () => {
    const player: PlayerSummary = {
      playerId: 2,
      name: 'DelhiSultan',
      profileId: 200,
      civToken: 'delhi',
      villagersLost: 2,
      buildOrder: [],
      resources: [],
      scores: [],
      totals: {
        resourcesGathered: { food: 12000, wood: 9000, gold: 9000, stone: 1000 },
        resourcesSpent: { food: 11000, wood: 8500, gold: 8000, stone: 800 },
        unitsProduced: 55,
        unitsLost: 25,
        unitsKilled: 45,
        buildingsLost: 1,
        buildingsRazed: 8,
        techResearched: 25,
        largestArmy: 45,
        sacredCaptured: 3,
        sacredLost: 0,
        sacredNeutralized: 0,
        relicsCaptured: 2,
        villagerHigh: 90,
        age2Sec: 240,
        age3Sec: 620,
        age4Sec: null,
      },
    }

    const events: BuildEvent[] = [
      {
        timeSec: 200,
        playerId: 2,
        category: 'unit',
        blueprint: 'unit_scholar',
        name: 'Scholar',
      },
      {
        timeSec: 650,
        playerId: 2,
        category: 'unit',
        blueprint: 'unit_scholar',
        name: 'Scholar',
      },
    ]

    const report = analyzeRelicSacredPerformance(player, events, 1200)

    expect(report.sacredCaptured).toBe(3)
    expect(report.relicsCaptured).toBe(2)
    expect(report.estimatedPassiveGoldGained).toBeGreaterThan(1500)
    expect(report.performanceGrade).toBe('S')
    expect(report.findings.some((f) => f.includes('sacred site pressure'))).toBe(true)
  })
})
