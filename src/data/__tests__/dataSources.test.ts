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
        'aoe4world-overlay',
        'aoe4world-explorer',
        'aoe4world-replay-parser',
        'aoe4world-curated',
        'aoe4world-docker-ruby-node',
        'aoe4guides',
        'aoe4-club',
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
    const essence = DATA_SOURCE_REGISTRY.find((source) => source.id === 'essence')!
    expect(essence.records).toBeGreaterThan(0)
  })

  it('keeps the six requested AoE4World source revisions visible', () => {
    for (const id of [
      'aoe4world-overlay',
      'aoe4world-explorer',
      'aoe4world-data',
      'aoe4world-replay-parser',
      'aoe4world-curated',
      'aoe4world-docker-ruby-node',
    ]) {
      const source = DATA_SOURCE_REGISTRY.find((entry) => entry.id === id)
      expect(source?.revision).toMatch(/^[0-9a-f]{40}$/)
    }
  })
})
