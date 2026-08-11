import { describe, expect, it } from 'vitest'
import { deriveFirstCauseReview } from '../firstCauseReview'
import type { MatchSummary, PlayerSummary, PlayerTotals } from '../statsSummary'

const ME = 42

function totals(overrides: Partial<PlayerTotals> = {}): PlayerTotals {
  return {
    resourcesGathered: { food: 3_000, wood: 1_000, gold: 500, stone: 0 },
    resourcesSpent: { food: 2_000, wood: 800, gold: 400, stone: 0 },
    unitsProduced: 20,
    unitsLost: 8,
    unitsKilled: 8,
    buildingsLost: 0,
    buildingsRazed: 0,
    techResearched: 3,
    largestArmy: 12,
    sacredCaptured: 0,
    sacredLost: 0,
    sacredNeutralized: 0,
    relicsCaptured: 0,
    villagerHigh: 30,
    age2Sec: null,
    age3Sec: null,
    age4Sec: null,
    ...overrides,
  }
}

function player(
  playerId: number,
  profileId: number,
  overrides: Partial<PlayerSummary> = {},
): PlayerSummary {
  return {
    playerId,
    profileId,
    name: `P${playerId}`,
    civToken: playerId === 1 ? 'eng' : 'fre',
    totals: totals(),
    villagersLost: 0,
    buildOrder: [],
    resources: [],
    scores: [],
    ...overrides,
  }
}

function summary(players: PlayerSummary[]): MatchSummary {
  return { gameLengthSec: 900, players }
}

describe('deriveFirstCauseReview', () => {
  it('prioritizes an early opening checkpoint over later reaction and spending checks', () => {
    const review = deriveFirstCauseReview({
      summary: summary([
        player(1, ME, {
          buildOrder: [
            {
              timeSec: 20,
              playerId: 1,
              category: 'unit',
              blueprint: 'unit_villager_1_eng',
              name: 'Villager',
            },
            {
              timeSec: 80,
              playerId: 1,
              category: 'unit',
              blueprint: 'unit_villager_1_eng',
              name: 'Villager',
            },
            {
              timeSec: 200,
              playerId: 1,
              category: 'unit',
              blueprint: 'unit_longbowman_1_eng',
              name: 'Longbowman',
            },
            {
              timeSec: 280,
              playerId: 1,
              category: 'building',
              blueprint: 'building_barracks_1_eng',
              name: 'Barracks',
            },
            {
              timeSec: 340,
              playerId: 1,
              category: 'unit',
              blueprint: 'unit_longbowman_1_eng',
              name: 'Longbowman',
            },
          ],
          resources: [
            {
              timeSec: 250,
              bank: { food: 1_200, wood: 100, gold: 100, stone: 0 },
              gathered: { food: 1_600, wood: 800, gold: 200, stone: 0 },
              spent: { food: 900, wood: 400, gold: 100, stone: 0 },
              perMinute: null,
            },
          ],
        }),
        player(2, 99, {
          buildOrder: [
            {
              timeSec: 140,
              playerId: 2,
              category: 'building',
              blueprint: 'building_stable_1_fre',
              name: 'Stable',
            },
          ],
        }),
      ]),
      myProfileId: ME,
      myCiv: 'english',
    })

    expect(review?.checks.find((check) => check.lane === 'opening')?.status).toBe('confirmed')
    expect(review?.checks.find((check) => check.lane === 'reaction')?.status).toBe('review')
    expect(review?.checks.find((check) => check.lane === 'spending')?.status).toBe('review')
    expect(
      review?.advancedChecks.find((check) => check.lane === 'resource-bottleneck')?.status,
    ).toBe('review')
    expect(review?.firstCause).toMatchObject({
      lane: 'opening',
      category: 'mechanics',
      timeSec: 20,
    })
    expect(review?.nextGoal.trigger).toContain('2:30')
  })

  it('marks a post-advantage economy reversal as a replay question, not a confirmed fight result', () => {
    const review = deriveFirstCauseReview({
      summary: summary([
        player(1, ME, {
          buildOrder: [
            {
              timeSec: 20,
              playerId: 1,
              category: 'unit',
              blueprint: 'unit_villager_1_eng',
              name: 'Villager',
            },
            {
              timeSec: 45,
              playerId: 1,
              category: 'unit',
              blueprint: 'unit_villager_1_eng',
              name: 'Villager',
            },
          ],
          resources: [
            {
              timeSec: 600,
              bank: { food: 100, wood: 0, gold: 0, stone: 0 },
              gathered: { food: 1_000, wood: 0, gold: 0, stone: 0 },
              spent: { food: 900, wood: 0, gold: 0, stone: 0 },
              perMinute: null,
            },
            {
              timeSec: 720,
              bank: { food: 100, wood: 0, gold: 0, stone: 0 },
              gathered: { food: 1_400, wood: 0, gold: 0, stone: 0 },
              spent: { food: 1_300, wood: 0, gold: 0, stone: 0 },
              perMinute: null,
            },
          ],
          scores: [
            { timeSec: 300, economy: 100, military: 100, society: 0, technology: 0, total: 200 },
            { timeSec: 600, economy: 400, military: 400, society: 50, technology: 50, total: 900 },
          ],
        }),
        player(2, 99, {
          resources: [
            {
              timeSec: 600,
              bank: { food: 0, wood: 0, gold: 0, stone: 0 },
              gathered: { food: 1_000, wood: 0, gold: 0, stone: 0 },
              spent: { food: 1_000, wood: 0, gold: 0, stone: 0 },
              perMinute: null,
            },
            {
              timeSec: 720,
              bank: { food: 0, wood: 0, gold: 0, stone: 0 },
              gathered: { food: 3_000, wood: 0, gold: 0, stone: 0 },
              spent: { food: 3_000, wood: 0, gold: 0, stone: 0 },
              perMinute: null,
            },
          ],
          scores: [
            { timeSec: 300, economy: 100, military: 100, society: 0, technology: 0, total: 200 },
            { timeSec: 600, economy: 200, military: 150, society: 25, technology: 25, total: 400 },
          ],
        }),
      ]),
      myProfileId: ME,
      myCiv: 'english',
    })

    const conversion = review?.checks.find((check) => check.lane === 'conversion')
    expect(conversion?.status).toBe('review')
    expect(conversion?.observed).toContain('score gap improved')
    expect(conversion?.takeaway).toContain('not proof that a fight was won')
  })

  it('flags a second Town Center built into visible pressure as an investment review', () => {
    const review = deriveFirstCauseReview({
      summary: summary([
        player(1, ME, {
          buildOrder: [
            {
              timeSec: 100,
              playerId: 1,
              category: 'building',
              blueprint: 'building_town_center_1_eng',
              name: 'Town Center',
            },
            {
              timeSec: 250,
              playerId: 1,
              category: 'unit',
              blueprint: 'unit_longbowman_1_eng',
              name: 'Longbowman',
            },
            {
              timeSec: 300,
              playerId: 1,
              category: 'building',
              blueprint: 'building_town_center_1_eng',
              name: 'Town Center',
            },
          ],
        }),
        player(2, 99, {
          buildOrder: [
            {
              timeSec: 180,
              playerId: 2,
              category: 'building',
              blueprint: 'building_stable_1_fre',
              name: 'Stable',
            },
          ],
        }),
      ]),
      myProfileId: ME,
      myCiv: 'english',
    })

    expect(
      review?.advancedChecks.find((check) => check.lane === 'greedy-investment'),
    ).toMatchObject({
      status: 'review',
      timeSec: 300,
    })
  })
})
