import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const state = vi.hoisted(() => ({
  documents: '',
  userData: '',
  settings: { localData: { consentGranted: true }, profileId: null as number | null },
}))

vi.mock('electron', () => ({
  app: {
    getPath: (name: string) => (name === 'documents' ? state.documents : state.userData),
  },
}))

vi.mock('./appContext', () => ({
  getSettings: () => ({ getAll: () => state.settings }),
}))

import { getLocalDataStatus, listReplayArchive } from './localDataService'

let root: string

beforeEach(() => {
  root = mkdtempSync(join(process.env.TEMP ?? process.cwd(), 'rtslytics-local-archive-'))
  state.documents = root
  state.userData = root
  mkdirSync(join(root, 'My Games', 'Age of Empires IV', 'playback'), { recursive: true })
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

describe('local replay archive discovery', () => {
  it('indexes playback/temp.rec without requiring matchhistory', () => {
    const path = join(root, 'My Games', 'Age of Empires IV', 'playback', 'temp.rec')
    const bytes = new Uint8Array(32)
    bytes.set(
      Array.from('AOE4_RE').map((char) => char.charCodeAt(0)),
      4,
    )
    writeFileSync(path, bytes)

    const result = listReplayArchive()

    expect(result.totalCount).toBe(1)
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        source: 'playback',
        hasReplay: true,
        id: path.replace(/\\/g, '/'),
      }),
    )
  })

  it('reports replay storage as available when warnings.log is absent', () => {
    expect(getLocalDataStatus()).toEqual(
      expect.objectContaining({
        consentGranted: true,
        available: true,
        logExists: false,
      }),
    )
  })
})
