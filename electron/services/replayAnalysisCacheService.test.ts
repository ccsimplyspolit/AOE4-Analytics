import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { ReplayAnalysisResult } from '@domain/replayCommand'

const electronState = vi.hoisted(() => ({ userData: '' }))

vi.mock('electron', () => ({
  app: { getPath: () => electronState.userData },
}))

import {
  createReplayActionLogWriter,
  readCachedReplayAnalysis,
  readReplayActionPage,
  writeCachedReplayAnalysis,
} from './replayAnalysisCacheService'

let dir: string

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'rtslytics-replay-analysis-cache-'))
  electronState.userData = dir
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

describe('replay analysis disk cache', () => {
  it('restores a result only for the exact replay revision that produced it', () => {
    const result = {
      id: 'cached:246000001',
      source: 'cached',
      sourcePath: 'C:\\cache\\246000001.rec',
      recordedAtMs: 1_234_567,
      info: null,
      commandStream: { coverage: 'unavailable' },
    } as ReplayAnalysisResult

    writeCachedReplayAnalysis('cached:246000001', result)

    expect(
      readCachedReplayAnalysis('cached:246000001', result.sourcePath, result.recordedAtMs),
    ).toEqual(result)
    expect(
      readCachedReplayAnalysis('cached:246000001', result.sourcePath, result.recordedAtMs + 1),
    ).toBeNull()
  })

  it('pages the complete action journal without loading it into the renderer', async () => {
    const writer = createReplayActionLogWriter('cached:journal-test')
    const event = {
      eventIndex: 0,
      offset: 12,
      tick: 8,
      timeSec: 1,
      hostComputerId: 1,
      playerId: 1000,
      commandType: 3,
      commandName: 'queue-unit',
      queued: false,
      playerCommandCount: 1,
      payloadBytes: 1,
      unitIds: [],
      pbgid: 123,
      productionBuildingId: 321,
      queueCount: 1,
      selectedUnitCount: 0,
      position: null,
      targetBuildingId: null,
      actionCategory: 'production' as const,
      decodeLevel: 'exact' as const,
      payloadHex: '10',
      payloadHexTruncated: false,
      known: true,
    }
    writer.push(event)
    const log = writer.finish(true)
    expect(log?.eventCount).toBe(1)
    const page = await readReplayActionPage(
      {
        id: 'cached:journal-test',
        source: 'cached',
        sourcePath: 'replay.rec',
        recordedAtMs: 1,
        info: null,
        commandStream: {} as ReplayAnalysisResult['commandStream'],
        actionLog: log,
      },
      0,
      10,
    )
    expect(page?.events).toEqual([event])
    expect(page?.complete).toBe(true)
  })
})
