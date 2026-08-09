import { afterEach, describe, expect, it } from 'vitest'
import {
  getStreamManagerStatus,
  resetStreamManagerState,
  startStreamManager,
  stopStreamManager,
  updateLiveOverlay,
  updateStreamManagerState,
} from '../streamManagerService'
import type { OverlayUpdatePayload } from '@ipc/contract'

const TEST_PORT = 41987

afterEach(async () => {
  await stopStreamManager()
  resetStreamManagerState()
})

describe('stream manager browser source', () => {
  it('serves and updates the OBS state through the local HTTP API', async () => {
    const started = await startStreamManager(TEST_PORT)
    expect(started.running).toBe(true)
    expect(started.port).toBe(TEST_PORT)

    const html = await fetch(`http://127.0.0.1:${TEST_PORT}/`)
    expect(html.status).toBe(200)
    const htmlText = await html.text()
    expect(htmlText).toContain('RTSLytics Stream Desk')
    expect(htmlText).toContain('--stream-accent')

    const update = await fetch(`http://127.0.0.1:${TEST_PORT}/api/state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        leftName: 'RTSLytics',
        leftScore: 2,
      theme: {
        accentColor: '#ff8800',
        fontScale: 1.25,
        compact: true,
        customCss: '.card { border-radius: 0; }',
      },
      }),
    })
    expect(update.status).toBe(200)
    const updated = (await update.json()) as {
      leftName?: string
      theme?: { accentColor?: string; fontScale?: number; compact?: boolean; customCss?: string }
    }
    expect(updated.leftName).toBe('RTSLytics')
    expect(updated.theme).toMatchObject({
      accentColor: '#ff8800',
      fontScale: 1.25,
      compact: true,
      customCss: '.card { border-radius: 0; }',
    })

    const command = await fetch(`http://127.0.0.1:${TEST_PORT}/score/addRight`)
    expect(command.status).toBe(200)
    const commanded = (await command.json()) as { rightScore?: number }
    expect(commanded.rightScore).toBe(1)
    expect(getStreamManagerStatus().state.leftScore).toBe(2)
  })

  it('serves the live roster browser source from the native overlay payload', async () => {
    const livePort = TEST_PORT + 1
    await startStreamManager(livePort)
    const payload: OverlayUpdatePayload = {
      matchState: 'ongoing',
      scout: null,
      myCiv: 'french',
      map: 'Dry Arabia',
      startedAt: null,
      custom: false,
      oppCiv: 'english',
      oppName: null,
      oppIsAI: false,
      matchup: {
        teams: [
          [
            {
              profileId: 1,
              name: 'Me',
              civ: 'french',
              rating: 1500,
              winRate: 55,
              favoriteCivs: ['french'],
              rank: 10,
              rankLevel: 'gold_2',
              isMe: true,
              isAI: false,
            },
          ],
          [
            {
              profileId: 2,
              name: 'Opponent',
              civ: 'english',
              rating: 1490,
              winRate: 49,
              favoriteCivs: ['english'],
              rank: 11,
              rankLevel: 'gold_2',
              isMe: false,
              isAI: false,
            },
          ],
        ],
      },
      kind: 'Ranked 1v1',
      session: null,
      matchId: 'test-match',
    }
    updateLiveOverlay(payload)

    const html = await fetch(`http://127.0.0.1:${livePort}/live?theme=floating`)
    expect(html.status).toBe(200)
    expect(await html.text()).toContain('RTSLytics Live Match')

    const flag = await fetch(`http://127.0.0.1:${livePort}/assets/civ/french.png`)
    expect(flag.status).toBe(200)
    expect(flag.headers.get('content-type')).toContain('image/png')

    const live = await fetch(`http://127.0.0.1:${livePort}/api/live`)
    expect(live.status).toBe(200)
    const current = (await live.json()) as OverlayUpdatePayload
    expect(current.matchup?.teams[1]?.[0]?.name).toBe('Opponent')
    expect(current.matchup?.teams[0]?.[0]?.favoriteCivs).toEqual(['french'])
  })

  it('applies structured casting overrides only to the local live browser source', async () => {
    const livePort = TEST_PORT + 2
    await startStreamManager(livePort)
    updateStreamManagerState({
      liveOverride: {
        left: { name: 'Caster Left', civ: 'english', rank: 'diamond_1' },
        right: { name: 'Caster Right', civ: 'rus', rank: 'platinum_2' },
      },
    })
    updateLiveOverlay({
      matchState: 'ongoing',
      scout: null,
      myCiv: 'french',
      map: 'Dry Arabia',
      startedAt: null,
      custom: false,
      oppCiv: 'english',
      oppName: null,
      oppIsAI: false,
      matchup: {
        teams: [
          [{ profileId: 1, name: 'Original left', civ: 'french', rating: 1, winRate: null, favoriteCivs: [], rank: null, rankLevel: null, isMe: true, isAI: false }],
          [{ profileId: 2, name: 'Original right', civ: 'english', rating: 1, winRate: null, favoriteCivs: [], rank: null, rankLevel: null, isMe: false, isAI: false }],
        ],
      },
      kind: 'Ranked 1v1',
      session: null,
      matchId: 'override-match',
    })
    const live = (await (await fetch(`http://127.0.0.1:${livePort}/api/live`)).json()) as OverlayUpdatePayload
    expect(live.matchup?.teams[0]?.[0]).toMatchObject({ name: 'Caster Left', civ: 'english', rankLevel: 'diamond_1' })
    expect(live.matchup?.teams[1]?.[0]).toMatchObject({ name: 'Caster Right', civ: 'rus', rankLevel: 'platinum_2' })
  })
})
