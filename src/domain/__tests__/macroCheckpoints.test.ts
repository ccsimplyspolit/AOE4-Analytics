import { describe, it, expect } from 'vitest'
import {
  STANDARD_MACRO_CHECKPOINTS,
  extractBuildOrderCheckpoints,
  resolveActiveCheckpoints,
  getUpcomingCheckpoint,
} from '../macroCheckpoints'
import type { BuildOrder } from '../buildOrderSchema'

describe('macroCheckpoints', () => {
  it('has standard checkpoints sorted by default', () => {
    expect(STANDARD_MACRO_CHECKPOINTS.length).toBeGreaterThanOrEqual(5)
    expect(STANDARD_MACRO_CHECKPOINTS[0]?.timeSec).toBe(75)
    expect(STANDARD_MACRO_CHECKPOINTS[1]?.timeSec).toBe(150)
  })

  it('extracts checkpoints from build order age-ups', () => {
    const dummyBuild: BuildOrder = {
      name: 'French 2TC',
      civilization: 'French',
      build_order: [
        {
          population_count: 6,
          villager_count: 6,
          age: 1,
          resources: { food: 6, wood: 0, gold: 0, stone: 0 },
          notes: ['Start on sheep'],
        },
        {
          population_count: 14,
          villager_count: 14,
          age: 2,
          time: '4:20',
          resources: { food: 8, wood: 3, gold: 3, stone: 0 },
          notes: ['School of Cavalry landmark'],
        },
        {
          population_count: 32,
          villager_count: 30,
          age: 3,
          time: '9:30',
          resources: { food: 14, wood: 8, gold: 8, stone: 0 },
          notes: ['Guild Hall landmark'],
        },
      ],
    }

    const checkpoints = extractBuildOrderCheckpoints(dummyBuild)
    expect(checkpoints).toHaveLength(2)
    expect(checkpoints[0]?.title).toBe('Build Target: Feudal Age')
    expect(checkpoints[0]?.timeSec).toBe(260) // 4*60 + 20
    expect(checkpoints[1]?.title).toBe('Build Target: Castle Age')
    expect(checkpoints[1]?.timeSec).toBe(570) // 9*60 + 30
  })

  it('resolves upcoming checkpoints correctly based on elapsed seconds', () => {
    const active = resolveActiveCheckpoints(null, true)
    
    // At 60 seconds (1:00), 75s (1:15) is 15 seconds away
    const upcoming1 = getUpcomingCheckpoint(active, 60, 90)
    expect(upcoming1).not.toBeNull()
    expect(upcoming1?.checkpoint.id).toBe('scout_opening')
    expect(upcoming1?.remainingSec).toBe(15)

    // At 140 seconds (2:20), 150s (2:30) is 10 seconds away
    const upcoming2 = getUpcomingCheckpoint(active, 140, 90)
    expect(upcoming2).not.toBeNull()
    expect(upcoming2?.checkpoint.id).toBe('scout_gold')
    expect(upcoming2?.remainingSec).toBe(10)

    // At 900 seconds (15:00), no checkpoint within 90s
    const upcomingNone = getUpcomingCheckpoint(active, 900, 90)
    expect(upcomingNone).toBeNull()
  })
})
