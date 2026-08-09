import { describe, expect, it } from 'vitest'
import { deriveBuildOrderInsights } from '../buildOrderInsights'

const build = {
  name: 'AoE4Guides timing sample',
  civilization: 'English',
  build_order: [
    {
      age: 1,
      time: '0:00',
      population_count: 6,
      villager_count: 6,
      resources: { food: 6, wood: 0, gold: 0, stone: 0 },
      notes: ['Opening'],
    },
    {
      age: 1,
      time: '~3:40',
      timeProvenance: 'derived' as const,
      population_count: 16,
      villager_count: 16,
      resources: { food: 5, wood: 6, gold: 2, stone: 0 },
      notes: ['Click up'],
    },
    {
      age: 2,
      time: '5:00',
      population_count: 20,
      villager_count: 20,
      resources: { food: 5, wood: 6, gold: 2, stone: 0 },
      notes: ['Feudal'],
    },
    {
      age: 2,
      time: '6:00',
      population_count: 22,
      villager_count: 22,
      resources: { food: 5, wood: 6, gold: 2, stone: 0 },
      notes: ['Repeat'],
    },
  ],
}

describe('buildOrderInsights', () => {
  it('derives age arrivals and preserves estimated timing provenance', () => {
    const result = deriveBuildOrderInsights(build)
    expect(result.ageTimings).toEqual([{ age: 2, seconds: 300, derived: false, stepIndex: 2 }])
    expect(result.durationSec).toBe(360)
  })

  it('removes repeated economy distributions without inventing a zero collapse', () => {
    const result = deriveBuildOrderInsights(build)
    expect(result.economy.map((point) => point.stepIndex)).toEqual([0, 1])
    expect(result.economy[1]?.statedTime).toBe(false)
    expect(result.economy[1]?.values).toMatchObject({ food: 5, wood: 6, gold: 2 })
  })
})
