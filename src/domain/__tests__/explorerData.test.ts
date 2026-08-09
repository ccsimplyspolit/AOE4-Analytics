import { describe, expect, it } from 'vitest'
import { EXPLORER_RECORDS, EXPLORER_RECORDS_BY_KIND } from '@data/explorerData'
import { UNITS } from '@data/gameData'

describe('vendored Explorer data', () => {
  it('contains the three non-unit entity families', () => {
    expect(EXPLORER_RECORDS.length).toBeGreaterThan(700)
    expect(EXPLORER_RECORDS_BY_KIND.building.length).toBeGreaterThan(0)
    expect(EXPLORER_RECORDS_BY_KIND.technology.length).toBeGreaterThan(0)
    expect(EXPLORER_RECORDS_BY_KIND.upgrade.length).toBeGreaterThan(0)
  })

  it('keeps stable, searchable ids and names', () => {
    const ids = EXPLORER_RECORDS.map((record) => record.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(EXPLORER_RECORDS.every((record) => record.id.trim() && record.name.trim())).toBe(true)
  })

  it('keeps the military unit projection available alongside Explorer records', () => {
    expect(UNITS.length).toBeGreaterThan(150)
  })
})
