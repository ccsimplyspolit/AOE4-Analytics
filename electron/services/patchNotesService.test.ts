import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getPatchNotes, resetPatchNotesCache } from './patchNotesService'

const patchSource = (id: string, buildId: string, date: string) => `
  export const patch = {
    id: "${id}",
    buildId: "${buildId}",
    name: "${buildId} Update",
    type: "update",
    officialUrl: "https://www.ageofempires.com/news/${buildId}/",
    date: new Date("${date}"),
    sections: [{ title: "Gameplay", changes: [{ diff: [["fix", "Fixed a test issue."]] }] }]
  }
`

function response(body: string, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => body,
  }
}

describe('AoE4World patch notes service', () => {
  beforeEach(() => {
    resetPatchNotesCache()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('loads the public patch directory and caches parsed patch details', async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url.includes('api.github.com')) {
        return Promise.resolve(
          response(
            JSON.stringify([
              {
                name: 'patch-15.3.8338.tsx',
                type: 'file',
                download_url: 'https://raw.githubusercontent.com/aoe4world/explorer/15.tsx',
              },
              {
                name: 'patch-16.1.9737-season-13.tsx',
                type: 'file',
                download_url: 'https://raw.githubusercontent.com/aoe4world/explorer/16.tsx',
              },
            ]),
          ),
        )
      }
      if (url.endsWith('/15.tsx')) {
        return Promise.resolve(response(patchSource('patch-15-3-8338', '15.3.8338', '2026-02-04')))
      }
      return Promise.resolve(
        response(patchSource('patch-16-1-9737-season-13', '16.1.9737', '2026-05-07')),
      )
    })
    vi.stubGlobal('fetch', fetchMock)

    const first = await getPatchNotes()
    expect(first.ok).toBe(true)
    if (!first.ok) return
    expect(first.data.patches.map((patch) => patch.buildId)).toEqual(['16.1.9737', '15.3.8338'])
    expect(first.data.selected?.buildId).toBe('16.1.9737')

    const selected = await getPatchNotes('patch-15-3-8338')
    expect(selected.ok && selected.data.selected?.buildId).toBe('15.3.8338')
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('serves the last good catalog when a forced refresh fails', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        response(
          JSON.stringify([
            {
              name: 'patch-15.3.8338.tsx',
              type: 'file',
              download_url: 'https://raw.githubusercontent.com/aoe4world/explorer/15.tsx',
            },
          ]),
        ),
      )
      .mockResolvedValueOnce(response(patchSource('patch-15-3-8338', '15.3.8338', '2026-02-04')))
      .mockRejectedValueOnce(new Error('offline'))
    vi.stubGlobal('fetch', fetchMock)

    const first = await getPatchNotes()
    const stale = await getPatchNotes(undefined, true)

    expect(first.ok).toBe(true)
    expect(stale.ok && stale.data.patches[0]?.buildId).toBe('15.3.8338')
  })
})
