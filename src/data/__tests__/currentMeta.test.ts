import { describe, expect, it } from 'vitest'
import { CURRENT_META, metaCivSlugs } from '@data/currentMeta'

describe('CURRENT_META August 2026', () => {
  it('keeps Macedonian as the 1v1 WR leader in this patch window', () => {
    expect(CURRENT_META.solo.zTier[0]?.civ).toBe('macedonian_dynasty')
    expect(CURRENT_META.solo.zTier[0]?.winRate).toBeGreaterThanOrEqual(54)
    expect(metaCivSlugs()).toContain('knights_templar')
    expect(CURRENT_META.patchIds).toContain('11308')
  })

  it('points at the new August community build orders', () => {
    const urls = CURRENT_META.communityBuilds.map((build) => build.url)
    expect(urls).toContain('https://aoe4guides.com/builds/RgHNHa5jDWnCw7pY67UL')
    expect(CURRENT_META.communityBuilds.map((build) => build.civ)).toEqual([
      'macedonian_dynasty',
      'knights_templar',
      'golden_horde',
    ])
  })
})
