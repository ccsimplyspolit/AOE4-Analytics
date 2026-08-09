import { describe, expect, it } from 'vitest'
import { normalizeSourceSyncOptions, parseSourceSyncCompleted } from '../sourceSync'

describe('source sync contract', () => {
  it('normalizes bounded refresh options', () => {
    expect(
      normalizeSourceSyncOptions({ dryRun: true, skipIcons: true, patch: '15.2' }),
    ).toEqual({
      ok: true,
      data: {
        dryRun: true,
        skipIcons: true,
        skipGameData: false,
        skipMeta: false,
        skipGuides: false,
        patch: '15.2',
      },
    })
  })

  it('rejects unsafe patch labels and parses completed steps', () => {
    expect(normalizeSourceSyncOptions({ patch: '15.2 && whoami' })).toEqual({
      ok: false,
      message: 'Patch must contain only letters, numbers, dots, underscores or dashes.',
    })
    expect(
      parseSourceSyncCompleted('[sync] completed: aoe4world-data, aoe4world-icons, aoe4guides-builds'),
    ).toEqual(['aoe4world-data', 'aoe4world-icons', 'aoe4guides-builds'])
  })
})
