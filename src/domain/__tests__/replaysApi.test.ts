import { describe, expect, it } from 'vitest'
import { normalizeReplaysApiSummary } from '../replaysApi'

describe('normalizeReplaysApiSummary', () => {
  it('normalizes the modern /Summary/new payload and keeps raw build events', () => {
    const summary = normalizeReplaysApiSummary({
      gameSummary: {
        players: [
          {
            playerId: 1,
            playerProfileId: 42,
            playerName: 'Alice',
            civ: 'english',
            totalResourcesGathered: { food: 900, wood: 300, gold: 200, stone: 0 },
            totalResourcesSpent: { food: 700, wood: 250, gold: 180, stone: 0 },
            unitsProduced: 12,
            unitsLost: 2,
            unitsKilled: 4,
            buildingsLost: 0,
            buildingsRazed: 1,
            techResearched: 3,
            age2Timestamp: 315.5,
            timeline: [
              {
                Timestamp: 20,
                ResourcesCurrent: { food: 100, wood: 50, gold: 20, stone: 0 },
                ResourcesCumulative: { food: 10, wood: 5, gold: 2, stone: 0 },
                ResourcesPerMinute: { food: 300, wood: 120, gold: 80, stone: 0 },
                ScoreEconomy: 10,
                ScoreMilitary: 2,
                ScoreSociety: 1,
                ScoreTechnology: 0,
                ScoreTotal: 13,
              },
            ],
          },
        ],
      },
      replaySummary: {
        dataSTLS: {
          gameLength: 480,
          lostEntities: [
            {
              timestamp: 250,
              targetPlayerId: 1,
              targetUnitType: 'unit_villager_1_eng',
              attackerPlayerId: 2,
              attackerUnitType: 'unit_knight_2_fre',
            },
          ],
        },
        players: [
          {
            playerDetails: {
              playerId: 1,
              unitTimeline: [
                { timestamp: 0, unitIcon: 'units/villager.png', unitLabel: '$Villager$' },
                { timestamp: 315.5, unitIcon: 'buildings/age_up.png', unitLabel: 'Age Up' },
              ],
            },
          },
        ],
      },
    })

    expect(summary?.gameLengthSec).toBe(480)
    expect(summary?.parser).toMatchObject({
      remote: true,
      coverage: 'full-summary',
      stpdVersions: [],
    })
    const player = summary?.players[0]
    expect(player).toMatchObject({ playerId: 1, profileId: 42, civToken: 'english' })
    expect(player?.buildOrder.map((event) => [event.timeSec, event.name])).toEqual([
      [0, 'Villager'],
      [315.5, 'Age Up'],
    ])
    expect(player?.resources[0]?.gathered).toEqual({ food: 110, wood: 55, gold: 22, stone: 0 })
    expect(player?.villagersLost).toBe(1)
    expect(player?.casualties?.[0]?.attackerUnitType).toBe('unit_knight_2_fre')
  })

  it('accepts the legacy compatibility array returned by /Summary', () => {
    const summary = normalizeReplaysApiSummary([
      {
        playerId: 7,
        name: 'Legacy',
        profileId: 99,
        civilizationAttrib: 'french',
        totalResourcesGathered: { food: 100, wood: 50, gold: 20, stone: 0 },
        totalResourcesSpent: { food: 80, wood: 40, gold: 10, stone: 0 },
        resources: {
          timestamps: [0, 60],
          food: [50, 40],
          wood: [20, 10],
          gold: [10, 5],
          stone: [0, 0],
          food_gathered: [50, 70],
          wood_gathered: [20, 30],
          gold_gathered: [10, 15],
          stone_gathered: [0, 0],
          food_per_min: [0, 100],
          wood_per_min: [0, 50],
          gold_per_min: [0, 20],
          stone_per_min: [0, 0],
          total: [0, 10],
          economy: [0, 8],
          military: [0, 1],
          society: [0, 0],
          technology: [0, 1],
        },
        buildOrder: [{ id: 'unit_villager_1_fre', type: 0, finished: [12] }],
      },
    ])

    expect(summary?.parser?.remote).toBe(true)
    expect(summary?.players[0]?.civToken).toBe('french')
    expect(summary?.players[0]?.buildOrder[0]).toMatchObject({ timeSec: 12, category: 'unit' })
    expect(summary?.players[0]?.resources[1]?.gathered).toEqual({ food: 70, wood: 30, gold: 15, stone: 0 })
  })
})
