import { describe, expect, it } from 'vitest'
import {
  BEASTY_AOE4_VIDEOS,
  BEASTY_CATALOG_STATS,
  BEASTY_VIDEOS,
  BEASTY_VIDEOS_BY_ID,
  getBeastyVideosForCiv,
} from '../beastyCatalog.generated'

describe('Beastyqt channel catalog', () => {
  it('lists the 3-year uploads window from yt-dlp tabs', () => {
    expect(BEASTY_VIDEOS.length).toBe(BEASTY_CATALOG_STATS.totalVideos)
    expect(BEASTY_CATALOG_STATS.totalVideos).toBeGreaterThan(1000)
    expect(BEASTY_CATALOG_STATS.aoe4Relevant).toBeGreaterThan(500)
    expect(Object.keys(BEASTY_VIDEOS_BY_ID).length).toBe(BEASTY_VIDEOS.length)
  })

  it('uses real YouTube ids only', () => {
    for (const video of BEASTY_VIDEOS) {
      expect(video.id).toMatch(/^[A-Za-z0-9_-]{11}$/)
      expect(video.url).toContain(video.id)
    }
  })

  it('filters civ lessons from AoE4-relevant rows', () => {
    const english = getBeastyVideosForCiv('english')
    expect(english.length).toBeGreaterThan(0)
    expect(english.every((video) => video.aoe4Relevant !== false)).toBe(true)
  })

  it('exposes the AoE4-relevant slice used by hubs', () => {
    expect(BEASTY_AOE4_VIDEOS.length).toBe(BEASTY_CATALOG_STATS.aoe4Relevant)
    expect(BEASTY_AOE4_VIDEOS.every((video) => video.aoe4Relevant !== false)).toBe(true)
  })
})
