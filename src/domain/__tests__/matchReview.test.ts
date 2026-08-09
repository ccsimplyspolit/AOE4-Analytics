import { describe, expect, it } from 'vitest'
import { deriveMatchReview } from '../matchReview'
import type { PerPlayerMatchStats } from '../analysis'
import type { MatchSummary, PlayerSummary, PlayerTotals } from '../statsSummary'

const ME = 111

function perPlayer(profileId: number, teamId: number): PerPlayerMatchStats {
  return {
    profileId,
    teamId,
    civ: 'english',
    result: profileId === ME ? 'loss' : 'win',
    unitsProduced: 20,
    kills: 10,
    deaths: 5,
    kd: 2,
    buildingsProduced: 4,
    techsResearched: 3,
    apm: 90,
    gameTimeSec: 900,
  }
}

function totals(overrides: Partial<PlayerTotals> = {}): PlayerTotals {
  return {
    resourcesGathered: { food: 5_000, wood: 2_000, gold: 1_000, stone: 0 },
    resourcesSpent: { food: 3_500, wood: 1_000, gold: 500, stone: 0 },
    unitsProduced: 30,
    unitsLost: 12,
    unitsKilled: 8,
    buildingsLost: 0,
    buildingsRazed: 0,
    techResearched: 5,
    largestArmy: 18,
    sacredCaptured: 0,
    sacredLost: 0,
    sacredNeutralized: 0,
    relicsCaptured: 0,
    villagerHigh: 35,
    age2Sec: 300,
    age3Sec: null,
    age4Sec: null,
    ...overrides,
  }
}

function player(
  playerId: number,
  profileId: number | null,
  overrides: Partial<PlayerSummary> = {},
): PlayerSummary {
  return {
    playerId,
    profileId,
    name: `P${playerId}`,
    civToken: 'english',
    totals: totals(),
    villagersLost: 4,
    buildOrder: [
      {
        timeSec: 30,
        playerId,
        category: 'unit',
        blueprint: 'unit_villager_1_eng',
        name: 'Villager',
      },
      {
        timeSec: 55,
        playerId,
        category: 'unit',
        blueprint: 'unit_villager_1_eng',
        name: 'Villager',
      },
      {
        timeSec: 150,
        playerId,
        category: 'unit',
        blueprint: 'unit_longbowman_1_eng',
        name: 'Longbowman',
      },
      {
        timeSec: 180,
        playerId,
        category: 'building',
        blueprint: 'building_outpost_1_eng',
        name: 'Outpost',
      },
    ],
    resources: [
      {
        timeSec: 300,
        bank: { food: 400, wood: 200, gold: 100, stone: 0 },
        gathered: { food: 2_000, wood: 800, gold: 400, stone: 0 },
        spent: { food: 1_600, wood: 600, gold: 300, stone: 0 },
        perMinute: null,
      },
      {
        timeSec: 600,
        bank: { food: 1_500, wood: 800, gold: 300, stone: 0 },
        gathered: { food: 5_000, wood: 2_000, gold: 1_000, stone: 0 },
        spent: { food: 3_500, wood: 1_000, gold: 500, stone: 0 },
        perMinute: null,
      },
    ],
    scores: [
      { timeSec: 300, economy: 300, military: 100, society: 50, technology: 50, total: 500 },
      { timeSec: 600, economy: 800, military: 300, society: 150, technology: 150, total: 1_400 },
    ],
    ...overrides,
  }
}

describe('deriveMatchReview', () => {
  it('derives conversion, bank, troop trade and opening metrics', () => {
    const summary: MatchSummary = {
      gameLengthSec: 900,
      players: [player(1, ME), player(2, 222)],
    }
    const review = deriveMatchReview(summary, ME, 'english', [
      {
        profileId: ME,
        teamId: 1,
        civ: 'english',
        result: 'loss',
        unitsProduced: 28,
        kills: 8,
        deaths: 12,
        kd: 0.67,
        buildingsProduced: 4,
        techsResearched: 5,
        apm: 90,
        gameTimeSec: 900,
      },
    ])

    expect(review).not.toBeNull()
    expect(review!.me.conversionPct).toBe(63)
    expect(review!.me.lastBank).toBe(2_600)
    expect(review!.me.peakBank).toBe(2_600)
    expect(review!.me.resourceFloatPct).toBe(33)
    expect(review!.me.troopLosses).toBe(8)
    expect(review!.me.tradeRatio).toBe(1)
    expect(review!.me.firstNonVillagerUnit?.name).toBe('Longbowman')
    expect(review!.me.firstBuilding?.name).toBe('Outpost')
    expect(review!.me.age2Sec).toBe(300)
    expect(review!.me.unitCompletionGaps).toBe(0)
    expect(review!.coverage.confidence).toBe('high')
    expect(review!.checkpoints.map((point) => point.label)).toEqual(['Opening', 'Midgame'])
    expect(review!.checkpoints[0]?.gatheredDelta).toBe(0)
  })

  it('surfaces observable unit-completion cadence without calling it queue idle', () => {
    const summary: MatchSummary = {
      gameLengthSec: 900,
      players: [
        player(1, ME, {
          buildOrder: [
            ...player(1, ME).buildOrder,
            {
              timeSec: 240,
              playerId: 1,
              category: 'unit',
              blueprint: 'unit_longbowman_1_eng',
              name: 'Longbowman',
            },
          ],
        }),
        player(2, 222),
      ],
    }
    const review = deriveMatchReview(summary, ME, 'english')
    expect(review?.me.unitCompletionGaps).toBe(1)
    expect(review?.me.longestUnitCompletionGapSec).toBe(90)
  })

  it('does not guess a side-by-side opponent for team summaries', () => {
    const summary: MatchSummary = {
      gameLengthSec: 900,
      players: [player(1, ME), player(2, 222), player(3, 333)],
    }
    const review = deriveMatchReview(summary, ME, 'english')
    expect(review?.opponent).toBeNull()
    expect(review?.checkpoints).toEqual([])
    expect(review?.isOneVsOne).toBe(false)
  })

  it('aggregates both sides when team ids are available', () => {
    const summary: MatchSummary = {
      gameLengthSec: 900,
      players: [player(1, ME), player(2, 222), player(3, 333), player(4, 444)],
    }
    const review = deriveMatchReview(summary, ME, 'english', [
      perPlayer(ME, 0),
      perPlayer(333, 0),
      perPlayer(222, 1),
      perPlayer(444, 1),
    ])

    expect(review?.teamComparison?.mine.playerCount).toBe(2)
    expect(review?.teamComparison?.enemy.playerCount).toBe(2)
    expect(review?.teamComparison?.mine.kills).toBe(20)
    expect(review?.teamComparison?.enemy.unitsProduced).toBe(40)
  })
})
