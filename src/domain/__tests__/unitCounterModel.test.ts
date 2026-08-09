import { describe, expect, it } from 'vitest'
import { unitsForCiv } from '@data/gameData'
import {
  calculateContextualMatchup,
  counterCandidatesForTarget,
  counterGraphCoverage,
  counterRowsForCivs,
  evaluateUnitMatchup,
} from '../unitCounterModel'

describe('unitCounterModel', () => {
  it('ranks available anti-cavalry units against a French knight threat', () => {
    const frenchKnight = unitsForCiv('french').find((unit) => /knight|lancer/i.test(unit.id))!
    const candidates = counterCandidatesForTarget(frenchKnight, unitsForCiv('english'))

    expect(candidates.length).toBeGreaterThan(0)
    expect(candidates.some((candidate) => candidate.role === 'spearman')).toBe(true)
    expect(candidates[0]!.reasons.length).toBeGreaterThan(0)
  })

  it('builds a threat matrix from target and responding civ rosters', () => {
    const rows = counterRowsForCivs('french', 'english')

    expect(rows.length).toBeGreaterThan(0)
    expect(rows.every((row) => row.candidates.length <= 3)).toBe(true)
    expect(rows.some((row) => row.targetRole === 'knight')).toBe(true)
  })

  it('returns an empty answer when the target unit has no mapped role', () => {
    const unknown = { id: 'unknown', name: 'Unknown', displayClasses: [] } as never
    expect(counterCandidatesForTarget(unknown, unitsForCiv('english'))).toEqual([])
  })

  it('can restrict answers to a playable age and exposes explainable cost metadata', () => {
    const frenchKnight = unitsForCiv('french').find((unit) => /knight|lancer/i.test(unit.id))!
    const candidates = counterCandidatesForTarget(frenchKnight, unitsForCiv('english'), 8, {
      maxAge: 2,
    })

    expect(candidates.length).toBeGreaterThan(0)
    expect(candidates.every((candidate) => candidate.unit.minAge <= 2)).toBe(true)
    expect(candidates.every((candidate) => candidate.relation === 'hard')).toBe(true)
    expect(candidates.every((candidate) => candidate.resourceTotal != null)).toBe(true)
  })

  it('exposes the full auditable War Room pair-space without calling it a probability', () => {
    const coverage = counterGraphCoverage()
    expect(coverage.units).toBe(205)
    expect(coverage.directedPairs).toBe(42_025)
    expect(coverage.roleTaggedPairs).toBeGreaterThan(0)
    expect(coverage.hardCounterEdges).toBeGreaterThan(0)
  })

  it('returns explainable directed matchup evidence', () => {
    const spearman = unitsForCiv('english').find((unit) => /spearman/i.test(unit.id))!
    const knight = unitsForCiv('french').find((unit) => /knight|lancer/i.test(unit.id))!
    const edge = evaluateUnitMatchup(spearman, knight)

    expect(edge.relation).toBe('hard')
    expect(edge.confidencePct).toBeGreaterThan(0)
    expect(edge.reasons.some((reason) => /role graph/i.test(reason))).toBe(true)
  })

  it('evaluates a contextual pair with weapon bonuses and equal resources', () => {
    const spearman = unitsForCiv('english').find((unit) => /spearman/i.test(unit.id))!
    const knight = unitsForCiv('french').find((unit) => /knight|lancer/i.test(unit.id))!
    const result = calculateContextualMatchup(spearman, knight, {
      mode: 'resources',
      budget: 720,
      terrain: 'open',
      micro: 'solid',
      upgradeAdvantage: 0,
    })

    expect(result.comparable).toBe(true)
    expect(result.verdict).toBe('hard-counter')
    expect(result.attackerCount).toBeGreaterThan(result.defenderCount)
    expect(result.attackerWeapon.bonus).toBeGreaterThan(0)
    expect(result.reasons.some((reason) => /bonus damage/i.test(reason))).toBe(true)
  })

  it('keeps count mode symmetric and makes terrain/micro explicit', () => {
    const archer = unitsForCiv('english').find((unit) => /archer|longbow/i.test(unit.id))!
    const horseman = unitsForCiv('french').find((unit) => /horseman/i.test(unit.id))!
    const result = calculateContextualMatchup(archer, horseman, {
      mode: 'count',
      count: 12,
      terrain: 'forest',
      micro: 'strong',
      upgradeAdvantage: 1,
    })

    expect(result.attackerCount).toBe(12)
    expect(result.defenderCount).toBe(12)
    expect(result.reasons.some((reason) => /Forest/i.test(reason))).toBe(true)
    expect(result.reasons.some((reason) => /micro|upgrade/i.test(reason))).toBe(true)
  })
})
