import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const electronState = vi.hoisted(() => ({ userData: '' }))

vi.mock('electron', () => ({
  app: { getPath: () => electronState.userData },
}))

import { analyzeCachedReplay, getCachedReplayInfo, writeCachedReplay } from './replayCacheService'

let dir: string

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'rtslytics-replay-cache-'))
  electronState.userData = dir
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

describe('replay cache lifecycle', () => {
  it('reports invalid and missing ids without touching disk', () => {
    expect(getCachedReplayInfo(0)).toEqual({ cached: false, sizeBytes: null, path: null })
    expect(getCachedReplayInfo(Number.MAX_SAFE_INTEGER + 1)).toEqual({
      cached: false,
      sizeBytes: null,
      path: null,
    })
    expect(() => writeCachedReplay(0, new Uint8Array([1]))).toThrow('Invalid replay id')
  })

  it('rejects empty downloads and preserves the previous cache on replacement', () => {
    expect(() => writeCachedReplay(123, new Uint8Array())).toThrow('empty')
    const first = writeCachedReplay(123, new Uint8Array([1, 2, 3]))
    const second = writeCachedReplay(123, new Uint8Array([4, 5]))
    expect(first.cached).toBe(true)
    expect(second).toMatchObject({ cached: true, sizeBytes: 2, path: first.path })
    expect(getCachedReplayInfo(123)).toEqual(second)
  })

  it('analyzes a cached blob and returns the same revision from the disk cache', () => {
    writeCachedReplay(456, new Uint8Array([1, 2, 3, 4]))
    const first = analyzeCachedReplay(456)
    expect(first).toMatchObject({ id: 'cached:456', source: 'cached', info: null })
    expect(first?.commandStream.coverage).toBe('header-only')
    expect(first?.actionLog?.format).toBe('ndjson')
    expect(analyzeCachedReplay(456)).toEqual(first)
  })

  it('returns null when no cached replay exists', () => {
    expect(analyzeCachedReplay(999)).toBeNull()
  })
})
