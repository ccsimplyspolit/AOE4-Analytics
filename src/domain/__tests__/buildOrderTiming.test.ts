import { describe, expect, it } from 'vitest'
import {
  estimateBuildOrderTimes,
  evaluateBuildTiming,
  shiftBuildOrderTimes,
} from '../buildOrderTiming'

const build = {
  name: 'Timing test',
  civilization: 'English',
  build_order: [
    {
      time: '0:00',
      population_count: 6,
      villager_count: 6,
      age: 1,
      resources: { food: 0, wood: 0, gold: 0, stone: 0 },
      notes: ['Start'],
    },
    {
      time: '2:00',
      population_count: 8,
      villager_count: 8,
      age: 1,
      resources: { food: 0, wood: 0, gold: 0, stone: 0 },
      notes: ['House'],
    },
    {
      time: '',
      population_count: 10,
      villager_count: 10,
      age: 2,
      resources: { food: 0, wood: 0, gold: 0, stone: 0 },
      notes: ['Age'],
    },
  ],
}

describe('buildOrderTiming', () => {
  it('reports timing coverage, duration, cadence and villager growth', () => {
    expect(evaluateBuildTiming(build)).toMatchObject({
      totalSteps: 3,
      timedSteps: 2,
      untimedSteps: 1,
      durationSec: 120,
      averageStepSec: 120,
      villagerGrowth: 4,
    })
  })

  it('shifts valid times while preserving untimed steps', () => {
    const shifted = shiftBuildOrderTimes(build, 15)
    expect(shifted.build_order.map((step) => step.time)).toEqual(['0:15', '2:15', ''])
  })

  it('estimates gaps from timing anchors and uses a conservative fallback', () => {
    const estimated = estimateBuildOrderTimes(build)
    expect(estimated.build_order.map((step) => step.time)).toEqual(['0:00', '2:00', '4:00'])

    const noAnchors = estimateBuildOrderTimes({
      ...build,
      build_order: build.build_order.map((step) => ({ ...step, time: '' })),
    })
    expect(noAnchors.build_order.map((step) => step.time)).toEqual(['0:00', '0:15', '0:30'])
  })
})
