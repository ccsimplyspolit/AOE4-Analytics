import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const electronState = vi.hoisted(() => ({ userData: '' }))

vi.mock('electron', () => ({
  app: { getPath: () => electronState.userData },
}))

import {
  getCachedSummaryInfo,
  readCachedParsedSummary,
  writeCachedSummary,
} from '../../../electron/services/summaryCache'

let dir: string

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'rtslytics-summary-cache-'))
  electronState.userData = dir
  mkdirSync(join(dir, 'summaries'), { recursive: true })
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

describe('ranked summary cache recovery', () => {
  it('evicts a corrupt gzip so the caller can fetch it again', () => {
    const file = join(dir, 'summaries', 'bad-gzip.rgs.gz')
    writeFileSync(file, 'not a gzip stream')

    expect(readCachedParsedSummary('bad-gzip')).toBeNull()
    expect(existsSync(file)).toBe(false)
  })

  it('reports persisted summary metadata without inflating the blob', () => {
    writeCachedSummary('246000001', new Uint8Array([1, 2, 3, 4]))

    const info = getCachedSummaryInfo('246000001')
    expect(info.cached).toBe(true)
    expect(info.sizeBytes).toBeGreaterThan(0)
    expect(info.path).toContain('246000001.rgs.gz')
  })
})
