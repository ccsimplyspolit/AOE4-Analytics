import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { ReplayAnalysisResult } from '@domain/replayCommand'

const electronState = vi.hoisted(() => ({ userData: '' }))

vi.mock('electron', () => ({
  app: { getPath: () => electronState.userData },
}))

import { readCachedReplayAnalysis, writeCachedReplayAnalysis } from './replayAnalysisCacheService'

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
})
