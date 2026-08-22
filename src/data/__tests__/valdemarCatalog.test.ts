import { describe, expect, it } from 'vitest'
import {
  VALDEMAR_BUILD_ORDERS,
  VALDEMAR_CATALOG_STATS,
  VALDEMAR_CIV_GUIDES,
  VALDEMAR_FUNDAMENTALS,
  VALDEMAR_MATCH_ANALYSES,
  VALDEMAR_VIDEOS,
  VALDEMAR_VIDEOS_BY_CIV,
  VALDEMAR_VIDEOS_BY_ID,
} from '../valdemarCatalog.generated'
import { CIV_SLUGS } from '../civs'

describe('Valdemar1902 video catalog', () => {
  it('loads the full 3-year video collection', () => {
    expect(VALDEMAR_VIDEOS.length).toBe(370)
    expect(VALDEMAR_CATALOG_STATS.totalVideos).toBe(370)
    expect(VALDEMAR_VIDEOS_BY_ID.size).toBe(370)
  })

  it('classifies videos into distinct categories', () => {
    expect(VALDEMAR_MATCH_ANALYSES.length).toBeGreaterThan(50)
    expect(VALDEMAR_BUILD_ORDERS.length).toBeGreaterThan(40)
    expect(VALDEMAR_CIV_GUIDES.length).toBeGreaterThan(50)
    expect(VALDEMAR_FUNDAMENTALS.length).toBeGreaterThan(20)

    const sumCategories =
      VALDEMAR_CATALOG_STATS.categories.match_analysis +
      VALDEMAR_CATALOG_STATS.categories.build_order +
      VALDEMAR_CATALOG_STATS.categories.civ_guide +
      VALDEMAR_CATALOG_STATS.categories.tier_list_meta +
      VALDEMAR_CATALOG_STATS.categories.mechanics_fundamentals
    expect(sumCategories).toBe(370)
  })

  it('indexes videos by canonical civilization slugs', () => {
    for (const slug of CIV_SLUGS) {
      expect(VALDEMAR_VIDEOS_BY_CIV).toHaveProperty(slug)
      expect(Array.isArray(VALDEMAR_VIDEOS_BY_CIV[slug])).toBe(true)
    }

    // High-coverage civs should have multiple videos
    expect((VALDEMAR_VIDEOS_BY_CIV['byzantines'] ?? []).length).toBeGreaterThan(5)
    expect((VALDEMAR_VIDEOS_BY_CIV['english'] ?? []).length).toBeGreaterThan(5)
    expect((VALDEMAR_VIDEOS_BY_CIV['rus'] ?? []).length).toBeGreaterThan(5)
    expect((VALDEMAR_VIDEOS_BY_CIV['holy_roman_empire'] ?? []).length).toBeGreaterThan(5)
  })

  it('validates tactical timestamps and video entries', () => {
    const videoWithTactics = VALDEMAR_VIDEOS.find((v) => v.keyTactics.length > 0)
    expect(videoWithTactics).toBeDefined()
    if (videoWithTactics && videoWithTactics.keyTactics.length > 0) {
      const tactic = videoWithTactics.keyTactics[0]!
      expect(tactic).toHaveProperty('name')
      expect(typeof tactic.timeSec).toBe('number')
      expect(typeof tactic.timeFormatted).toBe('string')
      expect(typeof tactic.text).toBe('string')
    }
  })
})
