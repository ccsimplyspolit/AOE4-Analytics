import { describe, expect, it } from 'vitest'
import { validateBuildOrderFeasibility } from '../buildOrderValidation'
import type { BuildOrder } from '../buildOrderSchema'

const step = (overrides: Partial<BuildOrder['build_order'][number]> = {}) => ({
  age: 1,
  population_count: 6,
  villager_count: 6,
  resources: { food: 6, wood: 0, gold: 0, stone: 0, builder: -1 },
  notes: ['6 to sheep'],
  ...overrides,
})

const build = (steps: BuildOrder['build_order']): BuildOrder => ({
  name: 'validation test',
  civilization: 'English',
  build_order: steps,
})

describe('validateBuildOrderFeasibility', () => {
  it('accepts monotonic timing and worker allocation', () => {
    const result = validateBuildOrderFeasibility(
      build([
        step({ time: '0:00' }),
        step({ time: '0:20', villager_count: 7, population_count: 7 }),
      ]),
    )
    expect(result.ok).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('reports impossible timing, population and allocation', () => {
    const result = validateBuildOrderFeasibility(
      build([
        step({ time: '0:20', villager_count: 12, population_count: 6 }),
        step({ time: '0:10', resources: { food: 8, wood: 8, gold: 8, stone: 8, builder: 1 } }),
      ]),
    )
    expect(result.errors.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(['population-underflow', 'time-regression', 'resource-allocation']),
    )
  })

  it('checks known unit age requirements from game data', () => {
    const result = validateBuildOrderFeasibility(
      build([step({ notes: ['make knight'], time: '1:00' })]),
      { units: [{ id: 'knight', name: 'Knight', minAge: 3, costs: null }] },
    )
    expect(result.errors.some((issue) => issue.code === 'age-requirement')).toBe(true)
  })

  it('warns when a timed unit cost exceeds the estimated bank', () => {
    const result = validateBuildOrderFeasibility(
      build([step({ time: '0:00', notes: ['make knight'] })]),
      {
        units: [
          {
            id: 'knight',
            name: 'Knight',
            minAge: 1,
            costs: { food: 0, wood: 0, gold: 100, stone: 0 },
          },
        ],
      },
    )
    expect(result.warnings.some((issue) => issue.code === 'resource-shortage')).toBe(true)
  })
})
