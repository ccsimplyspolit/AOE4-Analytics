import { describe, expect, it } from 'vitest'
import {
  CIV_TIMING_PROFILES,
  evaluateTimingBenchmark,
} from '../timingMatrix'

describe('Timing Matrix Domain & Evaluations', () => {
  it('loads all core civilization timing profiles', () => {
    expect(CIV_TIMING_PROFILES).toHaveProperty('byzantines')
    expect(CIV_TIMING_PROFILES).toHaveProperty('english')
    expect(CIV_TIMING_PROFILES).toHaveProperty('french')
    expect(CIV_TIMING_PROFILES).toHaveProperty('rus')
    expect(CIV_TIMING_PROFILES).toHaveProperty('holy_roman_empire')
  })

  it('validates phase benchmarks and transcript quotes', () => {
    for (const [slug, profile] of Object.entries(CIV_TIMING_PROFILES)) {
      expect(profile.civSlug).toBe(slug)
      expect(profile.feudalTargetSec).toBeGreaterThan(150)
      expect(profile.phases.length).toBeGreaterThanOrEqual(3)

      for (const phase of profile.phases) {
        expect(phase.targetSec).toBeGreaterThan(0)
        expect(phase.transcriptQuoteEn.length).toBeGreaterThan(15)
        expect(phase.transcriptQuoteRu.length).toBeGreaterThan(15)
        expect(phase.quoteVideoUrl).toContain('youtube.com/watch?v=')
        expect(phase.layoutAscii.length).toBeGreaterThan(5)

        const totalCalculated =
          phase.idealWorkers.food +
          phase.idealWorkers.wood +
          phase.idealWorkers.gold +
          phase.idealWorkers.stone
        expect(totalCalculated).toBe(phase.idealWorkers.total)
      }
    }
  })

  it('evaluates timing benchmarks accurately across all grade brackets', () => {
    // English Feudal target is 180s (03:00)
    
    // Grade S (diff <= 10s)
    const gradeS = evaluateTimingBenchmark('english', 'feudal', 185)
    expect(gradeS.grade).toBe('S')
    expect(gradeS.status).toBe('on_target')
    expect(gradeS.diffSec).toBe(5)

    // Grade A (diff <= 35s)
    const gradeA = evaluateTimingBenchmark('english', 'feudal', 210)
    expect(gradeA.grade).toBe('A')
    expect(gradeA.status).toBe('on_target')

    // Grade B (diff <= 65s)
    const gradeB = evaluateTimingBenchmark('english', 'feudal', 240)
    expect(gradeB.grade).toBe('B')
    expect(gradeB.status).toBe('slight_delay')

    // Grade C (diff <= 105s)
    const gradeC = evaluateTimingBenchmark('english', 'feudal', 280)
    expect(gradeC.grade).toBe('C')
    expect(gradeC.status).toBe('significant_delay')

    // Grade D (diff > 105s)
    const gradeD = evaluateTimingBenchmark('english', 'feudal', 360)
    expect(gradeD.grade).toBe('D')
    expect(gradeD.status).toBe('critical_delay')
  })

  it('falls back to default English profile when civilization is unmapped', () => {
    const res = evaluateTimingBenchmark('unknown_civ', 'feudal', 180)
    expect(res).toBeDefined()
    expect(res.grade).toBe('S')
  })
})
