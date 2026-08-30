import { describe, expect, it } from 'vitest'
import { alignBuildWithVideo, parseBuildClock } from '../buildVideoAlignment'
import type { BuildOrder } from '../buildOrderSchema'

describe('parseBuildClock', () => {
  it('parses overlay clocks', () => {
    expect(parseBuildClock('04:30')).toBe(270)
    expect(parseBuildClock('1:02:03')).toBe(3723)
    expect(parseBuildClock('bad')).toBeNull()
  })
})

describe('alignBuildWithVideo', () => {
  it('deep-links timed steps to the attached YouTube video', () => {
    const build = {
      name: 'Test',
      civilization: 'Macedonian Dynasty',
      video: 'https://www.youtube.com/watch?v=GIErhV3Eeys',
      build_order: [
        {
          population_count: -1,
          villager_count: 6,
          age: 1,
          resources: { food: 5, wood: 0, gold: 0, stone: 0 },
          notes: ['Warcamp'],
          time: '00:00',
        },
        {
          population_count: -1,
          villager_count: 17,
          age: 1,
          resources: { food: 9, wood: 6, gold: 2, stone: 0 },
          notes: ['Horsemen'],
          time: '04:00',
        },
      ],
    } as BuildOrder
    const aligned = alignBuildWithVideo(build)
    expect(aligned).toHaveLength(2)
    expect(aligned[1]?.watchUrl).toBe('https://www.youtube.com/watch?v=GIErhV3Eeys&t=240s')
    expect(aligned[1]?.note).toContain('Horsemen')
  })
})
