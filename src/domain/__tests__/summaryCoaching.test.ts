import { describe, it, expect } from 'vitest'
import { summarySignals, villagerGaps } from '../summaryCoaching'
import type { MatchSummary, PlayerSummary, PlayerTotals } from '../statsSummary'

function totals(over: Partial<PlayerTotals>): PlayerTotals {
  return {
    resourcesGathered: { food: 5000, wood: 4000, gold: 3000, stone: 500 },
    resourcesSpent: { food: 4000, wood: 3500, gold: 2500, stone: 400 },
    unitsProduced: 50,
    unitsLost: 10,
    unitsKilled: 10,
    buildingsLost: 0,
    buildingsRazed: 0,
    techResearched: 12,
    largestArmy: 40,
    sacredCaptured: 0,
    sacredLost: 0,
    sacredNeutralized: 0,
    relicsCaptured: 0,
    villagerHigh: 50,
    age2Sec: 400,
    age3Sec: null,
    age4Sec: null,
    ...over,
  }
}

function player(
  playerId: number,
  profileId: number | null,
  t: Partial<PlayerTotals>,
  villagerTimes: number[] = [],
): PlayerSummary {
  return {
    playerId,
    name: `P${playerId}`,
    profileId,
    civToken: 'english',
    totals: totals(t),
    villagersLost: null,
    buildOrder: villagerTimes.map((timeSec) => ({
      timeSec,
      playerId,
      category: 'unit' as const,
      blueprint: 'unit_villager_1_eng',
      name: 'Villager',
    })),
    resources: [],
    scores: [],
  }
}

function game(me: PlayerSummary, enemy: PlayerSummary, gameLengthSec = 1200): MatchSummary {
  return { gameLengthSec, players: [me, enemy] }
}

const ME = 111

describe('summarySignals', () => {
  it('flags being out-gathered and praises an economy lead', () => {
    const behind = summarySignals({
      summary: game(
        player(1000, ME, { resourcesGathered: { food: 3000, wood: 2000, gold: 1500, stone: 200 } }),
        player(1001, 222, {
          resourcesGathered: { food: 6000, wood: 5000, gold: 4000, stone: 800 },
        }),
      ),
      myProfileId: ME,
      myCiv: 'english',
    })
    expect(behind.some((s) => s.id === 'sum-eco-behind' && s.severity === 'major')).toBe(true)

    const ahead = summarySignals({
      summary: game(
        player(1000, ME, { resourcesGathered: { food: 8000, wood: 6000, gold: 5000, stone: 900 } }),
        player(1001, 222, {
          resourcesGathered: { food: 4000, wood: 3000, gold: 2500, stone: 400 },
        }),
      ),
      myProfileId: ME,
      myCiv: 'english',
    })
    expect(ahead.some((s) => s.id === 'sum-eco-ahead' && s.severity === 'good')).toBe(true)
  })

  it('reads TC idle gaps from the villager build log', () => {
    // Steady production, then three big gaps (95s, 130s, 155s → ~11 lost vills).
    const times = [30, 55, 80, 175, 305, 460, 485, 510]
    const gaps = villagerGaps(player(1000, ME, {}, times))
    expect(gaps).not.toBeNull()
    expect(gaps!.villagersMade).toBe(times.length)
    expect(gaps!.count).toBe(3)
    expect(gaps!.idleWindows).toBe(3)
    expect(gaps!.longestSec).toBe(155)
    expect(gaps!.longestGapSec).toBe(155)

    const signals = summarySignals({
      summary: game(player(1000, ME, {}, times), player(1001, 222, {})),
      myProfileId: ME,
      myCiv: 'english',
    })
    expect(signals.some((s) => s.id === 'sum-tc-idle')).toBe(true)
  })

  it('uses the shared 35s threshold for TC idle windows', () => {
    const gaps = villagerGaps(player(1000, ME, {}, [30, 64, 100]))
    expect(gaps).not.toBeNull()
    expect(gaps!.idleWindows).toBe(1)
  })

  it('compares the age-up against the build target and the enemy', () => {
    const signals = summarySignals({
      summary: game(player(1000, ME, { age2Sec: 444 }), player(1001, 222, { age2Sec: 330 })),
      myProfileId: ME,
      myCiv: 'english',
      feudalTargetSec: 375,
    })
    expect(signals.some((s) => s.id === 'sum-age2-late')).toBe(true)
    expect(signals.some((s) => s.id === 'sum-age2-behind')).toBe(true)
  })

  it('flags villager deficit, army peak deficit, and conceded relics', () => {
    const signals = summarySignals({
      summary: game(
        player(1000, ME, { villagerHigh: 40, largestArmy: 60, relicsCaptured: 0 }),
        player(1001, 222, { villagerHigh: 66, largestArmy: 120, relicsCaptured: 3 }),
      ),
      myProfileId: ME,
      myCiv: 'english',
    })
    expect(signals.some((s) => s.id === 'sum-vills-behind')).toBe(true)
    expect(signals.some((s) => s.id === 'sum-army-peak')).toBe(true)
    expect(signals.some((s) => s.id === 'sum-relics')).toBe(true)
  })

  it('flags unspent resources, poor troop trade, and worker losses', () => {
    const me = player(
      1000,
      ME,
      {
        resourcesGathered: { food: 6_000, wood: 2_000, gold: 1_000, stone: 0 },
        resourcesSpent: { food: 3_000, wood: 800, gold: 300, stone: 0 },
        unitsKilled: 8,
        unitsLost: 20,
      },
      [30, 55, 150],
    )
    me.villagersLost = 8
    me.resources = [
      {
        timeSec: 300,
        bank: { food: 400, wood: 100, gold: 100, stone: 0 },
        gathered: { food: 2_000, wood: 800, gold: 300, stone: 0 },
        spent: { food: 1_600, wood: 600, gold: 200, stone: 0 },
        perMinute: null,
      },
      {
        timeSec: 1_000,
        bank: { food: 1_500, wood: 800, gold: 300, stone: 0 },
        gathered: { food: 6_000, wood: 2_000, gold: 1_000, stone: 0 },
        spent: { food: 3_000, wood: 800, gold: 300, stone: 0 },
        perMinute: null,
      },
    ]
    me.buildOrder.push({
      timeSec: 500,
      playerId: 1000,
      category: 'unit',
      blueprint: 'unit_longbowman_1_eng',
      name: 'Longbowman',
    })
    me.buildOrder.push(
      {
        timeSec: 650,
        playerId: 1000,
        category: 'unit',
        blueprint: 'unit_longbowman_1_eng',
        name: 'Longbowman',
      },
      {
        timeSec: 760,
        playerId: 1000,
        category: 'unit',
        blueprint: 'unit_longbowman_1_eng',
        name: 'Longbowman',
      },
    )
    const enemy = player(1001, 222, { unitsKilled: 20, unitsLost: 10 }, [30, 55, 80, 105])
    enemy.villagersLost = 0

    const signals = summarySignals({
      summary: game(me, enemy, 1_200),
      myProfileId: ME,
      myCiv: 'english',
      perPlayer: [
        {
          profileId: ME,
          teamId: 1,
          civ: 'english',
          result: 'loss',
          unitsProduced: 20,
          kills: 8,
          deaths: 20,
          kd: 0.4,
          buildingsProduced: 4,
          techsResearched: 5,
          apm: 80,
          gameTimeSec: 1_200,
        },
        {
          profileId: 222,
          teamId: 2,
          civ: 'english',
          result: 'win',
          unitsProduced: 30,
          kills: 20,
          deaths: 10,
          kd: 2,
          buildingsProduced: 5,
          techsResearched: 6,
          apm: 90,
          gameTimeSec: 1_200,
        },
      ],
    })
    expect(signals.some((s) => s.id === 'sum-resource-float')).toBe(true)
    expect(signals.some((s) => s.id === 'sum-combat-trade')).toBe(true)
    expect(signals.some((s) => s.id === 'sum-villagers-lost')).toBe(true)
    expect(signals.some((s) => s.id === 'sum-unit-cadence')).toBe(true)
  })

  it('flags a first-pressure window and a slow military response', () => {
    const me = player(1000, ME, {})
    const enemy = player(1001, 222, {})
    me.casualties = [
      {
        timeSec: 360,
        targetPlayerId: 1000,
        targetUnitType: 'unit_spearman_1_eng',
        attackerPlayerId: 1001,
        attackerUnitType: 'unit_archer_1_fre',
      },
    ]
    enemy.casualties = [
      {
        timeSec: 510,
        targetPlayerId: 1001,
        targetUnitType: 'unit_archer_1_fre',
        attackerPlayerId: 1000,
        attackerUnitType: 'unit_longbowman_1_eng',
      },
    ]
    const signals = summarySignals({
      summary: game(me, enemy),
      myProfileId: ME,
      myCiv: 'english',
    })
    expect(signals.some((signal) => signal.id === 'sum-first-pressure')).toBe(true)
    expect(signals.some((signal) => signal.id === 'sum-pressure-response')).toBe(true)
  })

  it('returns nothing when the user is not identifiable', () => {
    const signals = summarySignals({
      summary: game(player(1000, 999, {}), player(1001, 222, {})),
      myProfileId: ME,
      myCiv: null,
    })
    expect(signals).toEqual([])
  })
})
