import { describe, expect, it } from 'vitest'
import { buildPatchAudit, classifyPatch } from '../patchAudit'

describe('patchAudit', () => {
  it('matches numeric ids and known major.minor families', () => {
    expect(classifyPatch('10884', '10604,10884,11214,11308')).toBe('covered')
    expect(classifyPatch('16.3', '10604,10884,11214,11308')).toBe('covered')
    expect(classifyPatch('15.2', '10604,10884,11214,11308')).toBe('legacy')
    expect(classifyPatch(null, '10604,10884')).toBe('unversioned')
  })

  it('reports mixed build coverage without calling legacy data current', () => {
    expect(
      buildPatchAudit({
        sourcePatch: '10604,10884,11214,11308',
        buildPatches: ['16.3', '15.2', null],
      }),
    ).toEqual({
      sourcePatch: '10604,10884,11214,11308',
      sourcePatchIds: ['10604', '10884', '11214', '11308'],
      sourceFamilies: ['16.2', '16.3'],
      builds: { covered: 1, legacy: 1, unversioned: 1 },
      status: 'mixed',
      warnings: [
        '1 local build is outside the current meta patch set.',
        '1 local build has no patch metadata.',
      ],
    })
  })
})
