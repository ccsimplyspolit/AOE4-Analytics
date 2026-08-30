import { describe, expect, it } from 'vitest'
import {
  VALDEMAR_VISUAL_MILESTONES,
  VALDEMAR_MILESTONES_BY_CIV,
  getClosestMilestoneForCiv,
  getTimingGateMilestone,
} from '../valdemarVisualMilestones.generated'

describe('Valdemar visual milestones and frame analysis', () => {
  it('loads the visual milestone corpus', () => {
    expect(VALDEMAR_VISUAL_MILESTONES.length).toBeGreaterThan(0)
    expect(Object.keys(VALDEMAR_MILESTONES_BY_CIV).length).toBeGreaterThan(0)
  })

  it('validates worker allocations and layout blueprints', () => {
    for (const m of VALDEMAR_VISUAL_MILESTONES) {
      expect(m).toHaveProperty('id')
      expect(m).toHaveProperty('civ')
      expect(m).toHaveProperty('videoId')
      expect(m).toHaveProperty('second')
      expect(m.workers.total).toBeGreaterThan(0)
      expect(m.workers.food + m.workers.wood + m.workers.gold + m.workers.stone).toBeLessThanOrEqual(
        m.workers.total + 5,
      )

      expect(m.layout).toBeDefined()
      expect(m.layout.ascii.length).toBeGreaterThan(10)
      expect(m.layout.tipsEn.length).toBeGreaterThan(0)
      expect(m.layout.tipsRu.length).toBeGreaterThan(0)
    }
  })

  it('correctly queries closest milestone for a civilization', () => {
    const byzMilestone = getClosestMilestoneForCiv('byzantines', 200)
    expect(byzMilestone).not.toBeNull()
    if (byzMilestone) {
      expect(byzMilestone.civ).toBe('byzantines')
      expect(byzMilestone.second).toBe(210) // 03:30 milestone
    }

    const nonExistent = getClosestMilestoneForCiv('unknown_civ', 100)
    expect(nonExistent).toBeNull()
  })

  it('resolves timing gate milestones', () => {
    const feudalGate = getTimingGateMilestone('english', 'feudal')
    expect(feudalGate).not.toBeNull()
    if (feudalGate) {
      expect(feudalGate.civ).toBe('english')
      expect(feudalGate.second).toBe(180) // 03:00 milestone
    }

    const harassGate = getTimingGateMilestone('english', 'harass')
    expect(harassGate).not.toBeNull()
    if (harassGate) {
      expect(harassGate.second).toBe(360) // 06:00 milestone
    }
  })

  it('keeps Conqueror 3 Byz Winery and mill checkpoints off the 3:30 gate', () => {
    const vodMilestones = VALDEMAR_VISUAL_MILESTONES.filter((m) => m.videoId === '0pkvLN16f4o')
    expect(vodMilestones.length).toBeGreaterThanOrEqual(6)
    expect(vodMilestones.some((m) => m.second === 43)).toBe(true)
    expect(vodMilestones.some((m) => m.second === 619)).toBe(true)
    const byzAt200 = getClosestMilestoneForCiv('byzantines', 200)
    expect(byzAt200?.second).toBe(210)
  })
})
