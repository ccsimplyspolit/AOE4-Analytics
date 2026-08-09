import { describe, expect, it } from 'vitest'
import { DATA_SOURCE_REGISTRY, EXPLORER_RECORD_COUNTS } from '../dataSources'
import { UNITS } from '../gameData'

describe('data source registry', () => {
  it('keeps the requested upstream integrations auditable', () => {
    const ids = new Set(DATA_SOURCE_REGISTRY.map((source) => source.id))

    expect([...ids]).toEqual(
      expect.arrayContaining([
        'aoe4world-api',
        'aoe4world-data',
        'aoe4guides',
        'war-room',
        'attrib',
        'essence',
      ]),
    )
  })

  it('reports bundled record coverage from the actual projections', () => {
    const data = DATA_SOURCE_REGISTRY.find((source) => source.id === 'aoe4world-data')!
    expect(data.records).toBeGreaterThan(UNITS.length)
    expect(EXPLORER_RECORD_COUNTS.building).toBeGreaterThan(0)
    expect(EXPLORER_RECORD_COUNTS.technology).toBeGreaterThan(0)
    expect(EXPLORER_RECORD_COUNTS.upgrade).toBeGreaterThan(0)
  })
})
