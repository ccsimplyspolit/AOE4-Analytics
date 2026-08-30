import { describe, expect, it } from 'vitest'
import type { Signal } from '../analysis'
import type { FirstCauseCheck, FirstCauseReview, NextGameGoal } from '../firstCauseReview'
import { composeMatchNarrative } from '../matchNarrative'
import type { TurningPoint } from '../turningPoints'

const nextGoal: NextGameGoal = {
  category: 'mechanics',
  trigger: 'At 2:30',
  action: 'Queue villagers.',
}

function point(kind: TurningPoint['kind'], id = kind): TurningPoint {
  return {
    id,
    kind,
    title: kind,
    timeSec: 120,
    startTimeSec: 90,
    observed: `Observed ${kind}`,
    coaching: `Coaching ${kind}`,
    anchor: 'summary',
    tone: 'caution',
  }
}

function check(lane: FirstCauseCheck['lane'], status: FirstCauseCheck['status'] = 'confirmed'): FirstCauseCheck {
  return {
    lane,
    status,
    title: lane,
    observed: `Observed ${lane}`,
    takeaway: `Takeaway ${lane}`,
    timeSec: 120,
    startTimeSec: 90,
    guideSlug: 'economy-fundamentals',
  }
}

function review(checks: FirstCauseCheck[]): FirstCauseReview {
  return {
    checks,
    advancedChecks: [],
    firstCause: {
      lane: checks[0]?.lane ?? 'opening',
      category: 'mechanics',
      timeSec: 120,
      rationale: 'Earliest recorded gap.',
    },
    nextGoal,
  }
}

function signal(id: string): Signal {
  return { id, severity: 'major', title: id, detail: id }
}

describe('composeMatchNarrative', () => {
  it('drops first-cause opening and spending checks when turning points already cover them', () => {
    const narrative = composeMatchNarrative({
      turningPoints: [point('villager-gap'), point('resource-bank')],
      review: review([check('opening'), check('spending'), check('information')]),
      signals: [signal('sum-tc-idle'), signal('sum-villagers-lost')],
    })

    expect(narrative.extraChecks.map((item) => item.lane)).toEqual(['information'])
    expect(narrative.extraSignals.map((item) => item.id)).toEqual(['sum-villagers-lost'])
    expect(narrative.nextGoal).toEqual(nextGoal)
    expect(narrative.firstCause?.lane).toBe('opening')
  })

  it('keeps a flagged check when no overlapping turning point exists', () => {
    const narrative = composeMatchNarrative({
      turningPoints: [point('age-up')],
      review: review([check('spending')]),
      signals: [signal('cmp-kd-low')],
    })

    expect(narrative.extraChecks.map((item) => item.lane)).toEqual(['spending'])
    expect(narrative.extraSignals.map((item) => item.id)).toEqual(['cmp-kd-low'])
  })

  it('omits clear and unavailable checks from the extra list', () => {
    const narrative = composeMatchNarrative({
      turningPoints: [],
      review: review([check('information', 'clear'), check('reaction', 'unavailable')]),
      signals: [],
    })

    expect(narrative.extraChecks).toEqual([])
  })
})
