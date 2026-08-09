import { describe, expect, it } from 'vitest'
import { CURATED_MATCH_REVIEWS, CURATED_MATCH_REVIEWS_BY_GAME_ID } from '../curatedMatchReviews'

describe('curated match review pack', () => {
  it('keeps every supplied VOD offset linked to one exact public game', () => {
    expect(CURATED_MATCH_REVIEWS).toHaveLength(8)
    expect(new Set(CURATED_MATCH_REVIEWS.map((review) => review.gameId)).size).toBe(8)
    expect(CURATED_MATCH_REVIEWS.map((review) => review.gameId)).toEqual([
      246498987, 246497762, 246498004, 246497189, 246497039, 246495667, 246495361, 246493818,
    ])
    expect(
      CURATED_MATCH_REVIEWS.map((review) => `${review.video.id}:${review.video.offsetSec}`),
    ).toEqual([
      '2841027880:998',
      '2841027880:51',
      '2840961055:5624',
      '2840968725:4387',
      '2840961055:4843',
      '2840845005:12612',
      '2840961055:3552',
      '2840968725:1985',
    ])
  })

  it('keeps both player rows and the transcript coverage gap explicit', () => {
    for (const review of CURATED_MATCH_REVIEWS) {
      expect(review.players).toHaveLength(2)
      expect(review.players[0]?.result).not.toBe(review.players[1]?.result)
      expect(review.captionStatus).toBe('unavailable')
      expect(CURATED_MATCH_REVIEWS_BY_GAME_ID.get(review.gameId)).toBe(review)
    }
  })
})
