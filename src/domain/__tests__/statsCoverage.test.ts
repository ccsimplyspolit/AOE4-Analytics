import { describe, expect, it } from 'vitest'
import { computeStatsCoverage, playerEvidenceCoverage, type CoverageGame } from '../statsCoverage'
import type { PlayerSummary } from '../statsSummary'

const game = (over: Partial<CoverageGame> = {}): CoverageGame => ({
  result: 'win',
  rating: 1_000,
  ratingDiff: 10,
  ...over,
})

describe('computeStatsCoverage', () => {
  it('counts each evidence layer independently', () => {
    const coverage = computeStatsCoverage(
      [
        game({ perPlayer: [{ profileId: 7 } as never], local: { villagersProduced: 30 } }),
        game({ result: 'loss', rating: null, ratingDiff: null, local: { gameTimeSec: 900 } }),
        game({
          result: null,
          perPlayer: [{ profileId: 8 } as never],
          local: { resourcesGathered: { food: 1, wood: 2, gold: 3, stone: 0 } },
        }),
      ],
      7,
    )

    expect(coverage).toEqual({ total: 3, decided: 2, rated: 2, counters: 1, economy: 2 })
  })

  it('does not claim counters without an active profile', () => {
    expect(
      computeStatsCoverage([game({ perPlayer: [{ profileId: 7 } as never] })], null).counters,
    ).toBe(0)
  })
})

describe('playerEvidenceCoverage', () => {
  const player = (over: Partial<PlayerSummary> = {}): PlayerSummary => ({
    playerId: 1,
    name: 'player',
    profileId: 7,
    civToken: 'english',
    totals: null,
    villagersLost: null,
    buildOrder: [],
    resources: [],
    scores: [],
    ...over,
  })

  it('marks a player full only when summary and counters are both complete', () => {
    const summary = player({
      totals: {
        resourcesGathered: { food: 1, wood: 1, gold: 1, stone: 1 },
        resourcesSpent: { food: 1, wood: 1, gold: 1, stone: 1 },
        largestArmy: 1,
        villagerHigh: 1,
        age2Sec: 1,
        age3Sec: 2,
        age4Sec: 3,
        unitsProduced: 1,
        unitsKilled: 1,
        unitsLost: 1,
        buildingsLost: 0,
        buildingsRazed: 1,
        techResearched: 1,
        relicsCaptured: 0,
        sacredCaptured: 0,
        sacredLost: 0,
        sacredNeutralized: 0,
      },
      buildOrder: [{ timeSec: 1, playerId: 1, category: 'unit', blueprint: 'x', name: 'x' }],
      resources: [{ timeSec: 1 } as never, { timeSec: 2 } as never],
      scores: [{ timeSec: 1 } as never, { timeSec: 2 } as never],
      casualties: [],
    })
    const counter = {
      profileId: 7,
      teamId: 0,
      civ: 'english',
      result: 'win',
      unitsProduced: 10,
      kills: 5,
      deaths: 2,
      kd: 2.5,
      buildingsProduced: 3,
      techsResearched: 4,
      apm: 60,
      gameTimeSec: 900,
    } as const

    expect(playerEvidenceCoverage(summary, counter)).toMatchObject({
      level: 'full',
      summaryReported: 5,
      counterReported: 6,
      missing: [],
    })
  })

  it('keeps event-only rows visibly partial instead of treating missing fields as zero', () => {
    const coverage = playerEvidenceCoverage(
      player({ buildOrder: [{ timeSec: 1, playerId: 1, category: 'unit', blueprint: 'x', name: 'x' }] }),
      null,
    )
    expect(coverage.level).toBe('events-only')
    expect(coverage.missing).toContain('summary totals')
    expect(coverage.counterReported).toBe(0)
  })
})
