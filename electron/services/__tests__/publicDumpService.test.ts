import { describe, expect, it } from 'vitest'
import { parsePublicDumpCatalogHtml } from '../publicDumpService'

describe('AoE4World public dump catalog parser', () => {
  it('keeps official storage links and extracts useful metadata', () => {
    const entries = parsePublicDumpCatalogHtml(`
      <a href="https://storage.googleapis.com/aoe4world-dumps/games-qm.json">
        Games - QM 1v1 - 2023 Q1 - 16.1 MB - over 3 years ago
      </a>
      <a href="https://storage.googleapis.com/aoe4world-dumps/leaderboard.json">
        Leaderboards &amp; ratings - 2.4 GB - yesterday
      </a>
      <a href="https://evil.example/dump.json">Games - spoofed</a>
    `)

    expect(entries).toHaveLength(2)
    expect(entries[0]).toMatchObject({
      category: 'games',
      size: '16.1 MB',
      age: 'over 3 years ago',
    })
    expect(entries[1]).toMatchObject({
      title: 'Leaderboards & ratings - 2.4 GB - yesterday',
      category: 'leaderboards',
      size: '2.4 GB',
      age: 'yesterday',
    })
  })

  it('deduplicates repeated links', () => {
    const html = '<a href="https://storage.googleapis.com/dump.json">Games - current</a>'.repeat(2)
    expect(parsePublicDumpCatalogHtml(html)).toHaveLength(1)
  })

  it('recognizes approximate ages used by the live page', () => {
    const entries = parsePublicDumpCatalogHtml(
      '<a href="https://storage.googleapis.com/dump.json">Games - about 3 years ago</a>',
    )
    expect(entries[0]?.age).toBe('about 3 years ago')
  })
})
