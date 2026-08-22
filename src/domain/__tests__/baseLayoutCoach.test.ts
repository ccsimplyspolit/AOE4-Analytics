import { describe, it, expect } from 'vitest'
import {
  analyzeBaseLayout,
  isDefensiveStructure,
  isMilitaryProductionBuilding,
  isDropOffBuilding,
} from '../baseLayoutCoach'
import type { BuildEvent, PlayerSummary } from '../statsSummary'

describe('baseLayoutCoach', () => {
  it('correctly identifies defensive, production, and drop-off buildings', () => {
    const outpost: BuildEvent = {
      timeSec: 180,
      playerId: 1,
      category: 'building',
      blueprint: 'building_outpost',
      name: 'Outpost',
    }
    const barracks: BuildEvent = {
      timeSec: 220,
      playerId: 1,
      category: 'building',
      blueprint: 'building_barracks',
      name: 'Barracks',
    }
    const lumberCamp: BuildEvent = {
      timeSec: 25,
      playerId: 1,
      category: 'building',
      blueprint: 'building_lumber_camp',
      name: 'Lumber Camp',
    }

    expect(isDefensiveStructure(outpost)).toBe(true)
    expect(isDefensiveStructure(barracks)).toBe(false)
    expect(isMilitaryProductionBuilding(barracks)).toBe(true)
    expect(isDropOffBuilding(lumberCamp)).toBe(true)
  })

  it('detects production bottleneck when floating large unspent resources with few military buildings', () => {
    const player: PlayerSummary = {
      playerId: 1,
      name: 'EcoBooster',
      profileId: 100,
      civToken: 'hre',
      villagersLost: 2,
      buildOrder: [],
      resources: [],
      scores: [],
      totals: {
        resourcesGathered: { food: 15000, wood: 10000, gold: 8000, stone: 1000 },
        resourcesSpent: { food: 10000, wood: 7000, gold: 6000, stone: 500 }, // Floating >10,000 resources!
        unitsProduced: 25,
        unitsLost: 20,
        unitsKilled: 15,
        buildingsLost: 2,
        buildingsRazed: 1,
        techResearched: 10,
        largestArmy: 18,
        sacredCaptured: 0,
        sacredLost: 0,
        sacredNeutralized: 0,
        relicsCaptured: 1,
        villagerHigh: 85,
        age2Sec: 260,
        age3Sec: 520,
        age4Sec: null,
      },
    }

    const events: BuildEvent[] = [
      { timeSec: 30, playerId: 1, category: 'building', blueprint: 'building_lumber_camp', name: 'Lumber Camp' },
      { timeSec: 240, playerId: 1, category: 'building', blueprint: 'building_barracks', name: 'Barracks' },
      { timeSec: 600, playerId: 1, category: 'building', blueprint: 'building_archery_range', name: 'Archery Range' },
    ]

    const report = analyzeBaseLayout(player, events, 1200)

    expect(report.militaryProductionBuildingsCount).toBe(2)
    expect(report.bottlenecks.length).toBeGreaterThan(0)
    expect(report.bottlenecks[0]).toContain('Production bottleneck')
  })

  it('rewards S-grade for zero building losses and balanced defense with active military', () => {
    const player: PlayerSummary = {
      playerId: 2,
      name: 'SolidDefender',
      profileId: 200,
      civToken: 'eng',
      villagersLost: 1,
      buildOrder: [],
      resources: [],
      scores: [],
      totals: {
        resourcesGathered: { food: 12000, wood: 9000, gold: 8000, stone: 1500 },
        resourcesSpent: { food: 11500, wood: 8800, gold: 7800, stone: 1400 },
        unitsProduced: 60,
        unitsLost: 25,
        unitsKilled: 45,
        buildingsLost: 0,
        buildingsRazed: 6,
        techResearched: 18,
        largestArmy: 40,
        sacredCaptured: 1,
        sacredLost: 0,
        sacredNeutralized: 0,
        relicsCaptured: 2,
        villagerHigh: 90,
        age2Sec: 240,
        age3Sec: 600,
        age4Sec: null,
      },
    }

    const events: BuildEvent[] = [
      { timeSec: 25, playerId: 2, category: 'building', blueprint: 'building_mill', name: 'Mill' },
      { timeSec: 40, playerId: 2, category: 'building', blueprint: 'building_lumber_camp', name: 'Lumber Camp' },
      { timeSec: 200, playerId: 2, category: 'building', blueprint: 'building_outpost', name: 'Outpost' },
      { timeSec: 280, playerId: 2, category: 'building', blueprint: 'building_barracks', name: 'Barracks' },
      { timeSec: 320, playerId: 2, category: 'building', blueprint: 'building_archery_range', name: 'Archery Range' },
      { timeSec: 500, playerId: 2, category: 'building', blueprint: 'building_keep', name: 'Keep' },
      { timeSec: 550, playerId: 2, category: 'building', blueprint: 'building_stable', name: 'Stable' },
      { timeSec: 600, playerId: 2, category: 'building', blueprint: 'building_siege_workshop', name: 'Siege Workshop' },
    ]

    const report = analyzeBaseLayout(player, events, 1200)

    expect(report.grade).toBe('S')
    expect(report.defensiveStructuresCount).toBe(2)
    expect(report.militaryProductionBuildingsCount).toBe(4)
    expect(report.bottlenecks.length).toBe(0)
    expect(report.simCityTips.length).toBeGreaterThan(0)
    expect(report.simCityTips[0]).toContain('TC Defensive Umbrella')
  })
})

