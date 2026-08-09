import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { AccountReplayItem } from '@ipc/contract'

const electronState = vi.hoisted(() => ({ userData: '' }))

vi.mock('electron', () => ({
  app: { getPath: () => electronState.userData },
}))

import { readAccountReplayArchive, writeAccountReplayArchive } from './accountReplayArchiveStore'

let dir: string

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'rtslytics-account-replay-archive-'))
  electronState.userData = dir
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

describe('account replay archive store', () => {
  it('persists and restores the full history snapshot for one profile', () => {
    const item = {
      game: { game_id: 246000001, started_at: '2026-08-09T00:00:00.000Z' },
      historySource: 'merged',
      replayAvailable: true,
      summaryAvailable: true,
      summaryCached: false,
      cacheStatus: 'available',
      cacheSizeBytes: null,
    } as AccountReplayItem

    writeAccountReplayArchive(1_234_567, {
      items: [item],
      aoe4WorldCount: 1,
      relicCount: 1,
      relicOnlyCount: 0,
    })

    expect(readAccountReplayArchive(1_234_567)).toMatchObject({
      schemaVersion: 1,
      profileId: 1_234_567,
      aoe4WorldCount: 1,
      relicCount: 1,
      relicOnlyCount: 0,
      items: [item],
    })
  })
})
