import { describe, expect, it } from 'vitest'
import {
  normalizeSourceSyncOptions,
  parseEssenceSyncStatus,
  parseSourceSyncCompleted,
} from '../sourceSync'

describe('source sync contract', () => {
  it('normalizes bounded refresh options', () => {
    expect(
      normalizeSourceSyncOptions({ dryRun: true, skipIcons: true, patch: '15.2' }),
    ).toEqual({
      ok: true,
      data: {
        dryRun: true,
        essenceAuto: true,
        essenceDecodeRgd: false,
        essenceDecodeNativeIcons: false,
        essenceOnly: false,
        skipIcons: true,
        skipGameData: false,
        skipMeta: false,
        skipGuides: false,
        patch: '15.2',
      },
    })
  })

  it('keeps native icon refresh separate from RGD-only research', () => {
    expect(normalizeSourceSyncOptions({ essenceOnly: true, essenceDecodeNativeIcons: true })).toEqual({
      ok: true,
      data: {
        dryRun: false,
        essenceAuto: true,
        essenceDecodeRgd: false,
        essenceDecodeNativeIcons: true,
        essenceOnly: true,
        skipIcons: false,
        skipGameData: false,
        skipMeta: false,
        skipGuides: false,
        patch: null,
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

  it('parses the optional Essence adapter summary', () => {
    expect(
      parseEssenceSyncStatus(
        '[essence] summary: {"status":"decoded","counts":{"files":12,"decodedPng":8},"sourceRevision":"abc123","report":"data/research/essence/latest.json"}',
      ),
    ).toEqual({
      status: 'decoded',
      sourceRevision: 'abc123',
      counts: { files: 12, decodedPng: 8 },
      report: 'data/research/essence/latest.json',
      inputName: null,
      inputKind: null,
      inputBytes: null,
      actions: [],
    })
  })
})
