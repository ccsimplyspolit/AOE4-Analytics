import { describe, expect, it } from 'vitest'
import {
  calculateProduction,
  inferProductionUnitIds,
  type ProductionUnitLike,
} from '../productionCalculator'

const spearman: ProductionUnitLike = {
  id: 'spearman',
  name: 'Spearman',
  time: 15,
  costs: { food: 60, wood: 20, gold: 0, stone: 0 },
}

const archer: ProductionUnitLike = {
  id: 'archer',
  name: 'Archer',
  time: 15,
  costs: { food: 30, wood: 50, gold: 0, stone: 0 },
}

describe('calculateProduction', () => {
  it('converts continuous unit queues into resource and villager demand', () => {
    const result = calculateProduction({
      units: [spearman],
      lines: [{ unitId: 'spearman', count: 2 }],
      foodSource: 'sheep',
    })

    expect(result.totals).toEqual({ food: 480, wood: 160, gold: 0, stone: 0 })
    expect(result.villagers.food).toBeCloseTo(480 / 37.05, 6)
    expect(result.villagers.wood).toBeCloseTo(160 / 31, 6)
  })

  it('applies production speed, discounts, passive income, and minimum food', () => {
    const result = calculateProduction({
      units: [archer],
      lines: [{ unitId: 'archer', count: 1 }],
      speedPercent: 20,
      discountPercent: 10,
      passive: { food: 20, wood: 10 },
      minFoodVillagers: 4,
    })

    expect(result.totals.food).toBeCloseTo(129.6, 6)
    expect(result.totals.wood).toBeCloseTo(216, 6)
    expect(result.net.food).toBeCloseTo(109.6, 6)
    expect(result.net.wood).toBeCloseTo(206, 6)
    expect(result.villagers.food).toBe(4)
  })

  it('ignores unknown, zero-count, and instant/free entries', () => {
    const result = calculateProduction({
      units: [{ ...spearman, id: 'free', time: 0 }],
      lines: [
        { unitId: 'missing', count: 1 },
        { unitId: 'free', count: 1 },
        { unitId: 'free', count: 0 },
      ],
    })

    expect(result.lines).toHaveLength(0)
    expect(result.totalVillagers).toBe(0)
  })

  it('supports a target output expressed as units per minute', () => {
    const result = calculateProduction({
      units: [archer],
      lines: [{ unitId: 'archer', count: 4 }],
      mode: 'unitsPerMinute',
    })

    expect(result.lines[0]).toMatchObject({ unitsPerMinute: 4, buildingsRequired: 1 })
    expect(result.totals).toEqual({ food: 120, wood: 200, gold: 0, stone: 0 })
  })

  it('applies drop-off, gathering, speed, and cost modifiers selectively', () => {
    const result = calculateProduction({
      units: [spearman, { ...archer, classes: ['ranged'], producedBy: ['archery-range'] }],
      lines: [
        { unitId: 'spearman', count: 1 },
        { unitId: 'archer', count: 1 },
      ],
      modifiers: [
        {
          id: 'sheep-bonus',
          label: 'Sheep bonus',
          description: '',
          kind: 'gathering',
          defaultSelected: true,
          foodSources: ['sheep'],
          resourceMultiplier: { food: 1.2 },
        },
        {
          id: 'archer-speed',
          label: 'Archer speed',
          description: '',
          kind: 'speed',
          target: { classes: ['ranged'] },
          multiplier: 2,
        },
        {
          id: 'archer-cost',
          label: 'Archer cost',
          description: '',
          kind: 'cost',
          target: { producedBy: ['archery-range'] },
          multiplier: 0.5,
        },
        {
          id: 'drop-off',
          label: 'Drop-off',
          description: '',
          kind: 'dropOff',
          dropOffPercent: { food: 20 },
        },
      ],
      selectedModifierIds: ['sheep-bonus', 'archer-speed', 'archer-cost', 'drop-off'],
    })

    expect(result.rates.food).toBeCloseTo(37.05 * 1.2 * 1.2, 6)
    expect(result.totals.food).toBeCloseTo(60 * 4 + 30 * 8 * 0.5, 6)
    expect(result.totals.wood).toBeCloseTo(20 * 4 + 50 * 8 * 0.5, 6)
  })
})

describe('inferProductionUnitIds', () => {
  it('finds unit ids mentioned in build notes', () => {
    const ids = inferProductionUnitIds(
      { build_order: [{ notes: ['Make @units/archer@ and then add spearmen.'] }] },
      [archer, spearman],
    )

    expect(ids).toEqual(['archer', 'spearman'])
  })
})
