import { describe, expect, it } from 'vitest'
import { PRO_TIPS, getCivProTips, getOpeningProTips } from '../proTips'

describe('PRO_TIPS', () => {
  it('has unique ids', () => {
    const ids = PRO_TIPS.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('each tip has required fields', () => {
    for (const tip of PRO_TIPS) {
      expect(tip.shortText.length).toBeGreaterThan(0)
      expect(tip.shortTextRu.length).toBeGreaterThan(0)
      expect(tip.videoId).toMatch(/^(macro|micro)$/)
      expect(tip.timeSec).toBeGreaterThanOrEqual(0)
      expect(tip.timeFormatted.length).toBeGreaterThan(0)
    }
  })
})

describe('getOpeningProTips', () => {
  it('returns up to 3 macro opening tips', () => {
    const tips = getOpeningProTips('english', 3)
    expect(tips.length).toBe(3)
    expect(tips.every((t) => t.timeSec <= 600 || t.trigger.always)).toBe(true)
  })
})

describe('getCivProTips', () => {
  it('returns macro and micro mix', () => {
    const tips = getCivProTips('english', 3)
    expect(tips.length).toBeGreaterThan(0)
    expect(tips.length).toBeLessThanOrEqual(3)
  })
})
