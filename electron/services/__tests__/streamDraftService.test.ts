import { afterEach, describe, expect, it, vi } from 'vitest'
import { importAoe2cmDraft } from '../streamDraftService'

afterEach(() => vi.unstubAllGlobals())

describe('AoE2CM draft importer', () => {
  it('maps completed host/guest bans, picks, and snipes', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            nameHost: 'Home',
            nameGuest: 'Away',
            events: [
              { player: 'HOST', actionType: 'ban', chosenOptionId: 'English' },
              { player: 'GUEST', actionType: 'pick', chosenOptionId: 'French' },
              { player: 'HOST', actionType: 'snipe', chosenOptionId: 'Mongols' },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    )
    const result = await importAoe2cmDraft('https://aoe2cm.net/draft/abc123')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.leftName).toBe('Home')
    expect(result.data.civDraft.leftBans).toEqual(['English'])
    expect(result.data.civDraft.rightPicks).toEqual(['French'])
    expect(result.data.civDraft.rightBans).toEqual(['Mongols'])
  })
})
