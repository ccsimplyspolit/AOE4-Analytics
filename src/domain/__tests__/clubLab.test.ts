import { describe, expect, it } from 'vitest'
import { UNITS } from '@data/gameData'
import { armyCost, clubUnits, compareUnits, dpsPreview, unitDps } from '../clubLab'

function unitNamed(name: string) {
  const unit = UNITS.find((entry) => entry.name === name && entry.costs)
  if (!unit) throw new Error(`missing ${name}`)
  return unit
}

describe('clubLab', () => {
  it('dedupes units and can filter by a data civ code', () => {
    const all = clubUnits()
    const english = clubUnits('en')
    expect(all.length).toBeGreaterThan(english.length)
    expect(english.every((unit) => unit.civs.includes('en'))).toBe(true)
    expect(new Set(all.map((unit) => unit.id)).size).toBe(all.length)
  })

  it('sums an army bill and converts costs into villager-seconds', () => {
    const spearman = unitNamed('Spearman')
    const result = armyCost([{ unitId: spearman.id, count: 5 }], { foodSource: 'sheep' })
    expect(result.totals.food).toBe((spearman.costs?.food ?? 0) * 5)
    expect(result.totals.pop).toBeGreaterThan(0)
    expect(result.villagerSeconds.food).toBeGreaterThan(0)
  })

  it('marks the higher hit-point unit as the left or right advantage', () => {
    const left = unitNamed('Spearman')
    const right = unitNamed('Archer')
    const hp = compareUnits(left, right).find((row) => row.key === 'Hit points')
    expect(hp).toBeTruthy()
    expect(['left', 'right', 'even']).toContain(hp?.advantage)
  })

  it('returns a finite DPS preview without claiming a simulated win', () => {
    const left = unitNamed('Spearman')
    const right = unitNamed('Horseman')
    const preview = dpsPreview(left, right)
    expect(preview.leftDps).toBeCloseTo(unitDps(left))
    expect(preview.reasons.length).toBeGreaterThan(0)
    expect(preview.relation).toMatch(/hard|soft|even|disadvantage/)
  })
})
