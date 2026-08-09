import { describe, expect, it } from 'vitest'
import { buildCatalogEntries } from '../buildCatalog'
import type { BuildOrder } from '../buildOrderSchema'

function build(overrides: Partial<BuildOrder> = {}): BuildOrder {
  return {
    name: 'English opener',
    civilization: 'English',
    source: 'https://aoe4guides.com/builds/example',
    build_order: [
      {
        population_count: 6,
        villager_count: 6,
        age: 1,
        resources: { food: 6, wood: 0, gold: 0, stone: 0 },
        notes: ['Start on sheep'],
        time: '0:00',
      },
    ],
    ...overrides,
  }
}

describe('buildCatalogEntries', () => {
  it('adds archive metadata and infers provenance', () => {
    const entry = buildCatalogEntries([
      build({ confidence: 0.82, sampleSize: 42, patch: '15.2' }),
    ])[0]!

    expect(entry).toMatchObject({
      origin: 'curated',
      sourceUrl: 'https://aoe4guides.com/builds/example',
      confidence: 0.82,
      sampleSize: 42,
      stepCount: 1,
      durationSec: 0,
      timedSteps: 1,
    })
    expect(entry.id).toContain('english-opener-')
  })

  it('deduplicates identical step lists while keeping distinct variants', () => {
    const entries = buildCatalogEntries([
      build(),
      build({ name: 'Same label', source: 'https://example.com/duplicate' }),
      build({
        name: 'Different timing',
        build_order: [{ ...build().build_order[0]!, time: '1:00' }],
      }),
    ])

    expect(entries).toHaveLength(2)
    expect(entries.map((entry) => entry.build.name)).toEqual(['English opener', 'Different timing'])
  })

  it('keeps matchup tags available for opponent-faction filtering', () => {
    const entry = buildCatalogEntries([
      build({ opponentCivilization: ['French', 'Rus'] }),
    ])[0]!
    expect(entry.opponentCivilizationLabels).toEqual(['French', 'Rus'])
    expect(entry.searchText).toContain('french')
  })
})
