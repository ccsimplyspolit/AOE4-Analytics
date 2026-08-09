import { describe, expect, it } from 'vitest'
import {
  ESSENCE_RGD_PROJECTION,
  compareEssenceAttributes,
  essenceRgdByPbg,
  essenceRgdRecords,
  essenceRgdSearch,
} from '../essenceAttributes'
import { UNITS } from '../gameData'

describe('Essence RGD projection', () => {
  it('loads a bounded, auditable local snapshot without replacing AoE4World data', () => {
    expect(ESSENCE_RGD_PROJECTION.sourceUrl).toBe('https://github.com/aoemods/AOEMods.Essence')
    expect(ESSENCE_RGD_PROJECTION.policy).toContain('AoE4World')
    expect(ESSENCE_RGD_PROJECTION.counts.records).toBe(ESSENCE_RGD_PROJECTION.records.length)
    expect(ESSENCE_RGD_PROJECTION.records.length).toBeGreaterThan(0)
  })

  it('keeps kind and PBG indexes deterministic', () => {
    expect(essenceRgdRecords('unit').every((record) => record.kind === 'unit')).toBe(true)
    const first = ESSENCE_RGD_PROJECTION.records.find((record) => record.pbgName)
    expect(first).toBeDefined()
    expect(essenceRgdByPbg(first!.pbgName).map((record) => record.path)).toContain(first!.path)
    expect(essenceRgdSearch(first!.pbgName).map((record) => record.path)).toContain(first!.path)
  })

  it('compares bundled combat attributes without hiding missing or conflicting rows', () => {
    const summary = compareEssenceAttributes(UNITS.slice(0, 40))
    expect(summary.compared).toBe(40)
    expect(summary.matched + summary.partial + summary.conflicts + summary.missing).toBe(40)
    expect(summary.projectionRecords).toBeGreaterThan(0)
    expect(summary.rows.every((row) => row.unitId && row.status)).toBe(true)
  })

  it('reports an entity with no deterministic local counterpart as missing', () => {
    const source = UNITS[0]!
    const summary = compareEssenceAttributes([
      {
        ...source,
        id: 'unknown-validation-unit',
        name: 'Unknown Validation Unit',
        classes: [],
        civs: [],
        displayClasses: [],
      },
    ])
    expect(summary.rows[0]?.status).toBe('missing')
    expect(summary.missing).toBe(1)
  })
})
