import { describe, expect, it } from 'vitest'
import { computeStatsCoverage, type CoverageGame } from '../statsCoverage'

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
