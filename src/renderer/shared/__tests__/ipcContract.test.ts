import { describe, expect, it } from 'vitest'
import {
  IpcChannels,
  type RtslyticsApi,
} from '../../../../electron/ipc/contract'
import type { OverlayDetectionPayload } from '../../../../electron/ipc/contract'

describe('overlay placement IPC contract', () => {
  it('exposes a distinct placement-toggle command through the typed renderer API', async () => {
    const api: Pick<RtslyticsApi, 'toggleOverlayPlacement'> = {
      toggleOverlayPlacement: async () => true,
    }

    expect(IpcChannels.overlayTogglePlacement).toBe('overlay:togglePlacement')
    await expect(api.toggleOverlayPlacement()).resolves.toBe(true)
  })
})

describe('replays-api IPC contract', () => {
  it('exposes a typed parser readiness check for the replay laboratory', async () => {
    const api: Pick<RtslyticsApi, 'getReplaysApiStatus'> = {
      getReplaysApiStatus: async () => ({
        source: 'bundled',
        baseUrl: 'http://127.0.0.1:4175',
        available: true,
        detail: 'Bundled loopback sidecar ready.',
      }),
    }

    expect(IpcChannels.replaysApiStatus).toBe('replaysApi:status')
    await expect(api.getReplaysApiStatus()).resolves.toMatchObject({
      source: 'bundled',
      available: true,
    })
  })
})

describe('overlay detection diagnostics', () => {
  it('keeps waiting-state reasons typed and free of local path details', () => {
    const payload: OverlayDetectionPayload = {
      processRunning: true,
      localInMatch: false,
      liveSource: 'recent',
      profileConfigured: true,
      localDataEnabled: true,
    }

    expect(IpcChannels.overlayDetection).toBe('overlay:detection')
    expect(payload).toMatchObject({ processRunning: true, localInMatch: false })
  })
})
