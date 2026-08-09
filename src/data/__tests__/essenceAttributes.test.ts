import { describe, expect, it } from 'vitest'
import {
  ESSENCE_RGD_PROJECTION,
  essenceRgdByPbg,
  essenceRgdRecords,
  essenceRgdSearch,
} from '../essenceAttributes'

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
})
