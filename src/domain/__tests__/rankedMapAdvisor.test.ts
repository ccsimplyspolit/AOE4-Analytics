import { describe, it, expect } from 'vitest'
import { getMapStrategyAdvice } from '../rankedMapAdvisor'

describe('rankedMapAdvisor', () => {
  it('returns water/hybrid advice and top civs for Nagari', () => {
    const advice = getMapStrategyAdvice('Nagari')
    expect(advice.archetype).toBe('water_hybrid')
    expect(advice.topCivilizations.length).toBeGreaterThan(0)
    expect(advice.topCivilizations[0]!.tier).toBe('S')
    expect(advice.recommendedBuildStyles.some((b) => b.includes('Dock'))).toBe(true)
  })

  it('returns wooded chokepoint advice and HRE/OOTD top civs for Highwoods', () => {
    const advice = getMapStrategyAdvice('Highwoods')
    expect(advice.archetype).toBe('wooded_choke')
    expect(advice.topCivilizations.some((c) => c.civ === 'holy_roman_empire')).toBe(true)
    expect(advice.recommendedBuildStyles.some((b) => b.includes('Relic Rush'))).toBe(true)
  })

  it('treats West Lake as land because ranked docks are disabled', () => {
    const advice = getMapStrategyAdvice('West Lake')
    expect(advice.archetype).toBe('open_land')
    expect(advice.description.toLowerCase()).toContain('dock')
    expect(advice.topCivilizations.some((c) => c.civ === 'macedonian_dynasty')).toBe(true)
  })

  it('provides sensible fallback for unknown or custom maps', () => {
    const advice = getMapStrategyAdvice('MegaRandom 2026')
    expect(advice.archetype).toBe('open_land')
    expect(advice.topCivilizations.length).toBeGreaterThan(0)
    expect(advice.counterMatchups.length).toBeGreaterThan(0)
  })
})
