import { describe, expect, it } from 'vitest'
import {
  curatedCivMatches,
  searchCuratedContent,
  type CuratedContentItem,
} from '../curatedContent'

const sample = (overrides: Partial<CuratedContentItem> = {}): CuratedContentItem => ({
  id: 'sample',
  title: 'Fast Castle Guide',
  type: 'Video',
  tags: ['Build Order'],
  creator: 'Coach',
  creatorUrl: null,
  civilizations: ['Abbasid'],
  relatedItems: ['civs/abbasid'],
  url: 'https://youtube.com/watch?v=sample',
  description: 'A safe opening for ranked play.',
  thumbnail: null,
  featured: false,
  youtube: { videoId: 'sample', channelId: null, durationSec: 600 },
  ...overrides,
})

describe('AoE4World curated content', () => {
  it('matches API slugs to upstream display names', () => {
    expect(curatedCivMatches('Abbasid', 'abbasid_dynasty')).toBe(true)
    expect(curatedCivMatches('Delhi', 'delhi_sultanate')).toBe(true)
    expect(curatedCivMatches('All', 'english')).toBe(true)
    expect(curatedCivMatches('French', 'english')).toBe(false)
  })

  it('searches title, creator, tags and descriptions within a civ', () => {
    const items = [sample(), sample({ id: 'other', civilizations: ['English'], title: 'Longbows' })]
    expect(searchCuratedContent('safe opening', 'abbasid_dynasty', items)).toHaveLength(1)
    expect(searchCuratedContent('coach', 'all', items)[0]?.id).toBe('sample')
    expect(searchCuratedContent('longbows', 'abbasid_dynasty', items)).toHaveLength(0)
  })
})
