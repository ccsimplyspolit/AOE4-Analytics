import { describe, expect, it } from 'vitest'
import { parsePatchSource, patchSummaryFromFileName, sortPatchNotes } from '../patchNotes'

const SOURCE = `
export const patch = {
  id: "patch-16-1-9737-season-13",
  buildId: "16.1.9737",
  name: "Season 13 Update",
  season: 13,
  type: "update",
  officialUrl: "https://www.ageofempires.com/news/example/",
  summary: \`Quality of life and balance changes.\`,
  introduction: \`Read on for the full notes.\`,
  date: new Date("2026-05-07T19:00:00Z"),
  sections: [{
    title: "Gameplay",
    changes: [{ title: "AI Update", diff: [
      ["buff", "AI scouts more efficiently."],
      ["fix", \`Fixed a crash.\`],
    ] }]
  }]
}
`

describe('AoE4World patch notes projection', () => {
  it('extracts metadata and typed diff rows from Explorer source', () => {
    const patch = parsePatchSource(SOURCE, 'patch-16.1.9737-season-13.tsx')

    expect(patch).toMatchObject({
      id: 'patch-16-1-9737-season-13',
      buildId: '16.1.9737',
      name: 'Season 13 Update',
      season: 13,
      type: 'update',
      date: '2026-05-07T19:00:00.000Z',
      officialUrl: 'https://www.ageofempires.com/news/example/',
      aoe4WorldUrl: 'https://aoe4world.com/explorer/patches/16.1.9737-season-13',
      changeCount: 2,
      changeKinds: ['buff', 'fix'],
    })
    expect(patch.changes).toEqual([
      { section: 'AI Update', kind: 'buff', text: 'AI scouts more efficiently.' },
      { section: 'AI Update', kind: 'fix', text: 'Fixed a crash.' },
    ])
  })

  it('keeps a useful fallback summary when an upstream source cannot be parsed', () => {
    expect(patchSummaryFromFileName('patch-15.3.8338.tsx')).toMatchObject({
      buildId: '15.3.8338',
      type: 'update',
      aoe4WorldUrl: 'https://aoe4world.com/explorer/patches/15.3.8338',
    })
    expect(patchSummaryFromFileName('patch-12.1.2638-hotfix.tsx').type).toBe('hotfix')
  })

  it('sorts dated patches newest-first without mutating the input', () => {
    const input = [
      { ...patchSummaryFromFileName('patch-15.3.8338.tsx'), date: '2026-02-04T00:00:00.000Z' },
      {
        ...patchSummaryFromFileName('patch-16.1.9737-season-13.tsx'),
        date: '2026-05-07T00:00:00.000Z',
      },
    ]
    const sorted = sortPatchNotes(input)

    expect(sorted.map((patch) => patch.buildId)).toEqual(['16.1.9737', '15.3.8338'])
    expect(input[0]?.buildId).toBe('15.3.8338')
  })
})
