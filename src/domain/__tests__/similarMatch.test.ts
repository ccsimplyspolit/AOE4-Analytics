import { describe, expect, it } from 'vitest'
import {
  civMultiset,
  inferGameKind,
  normalizeMatchToken,
  rankSimilarMatchCandidates,
  sameCivMultiset,
  teamResult,
  type SimilarMatchCandidate,
  type SimilarMatchPlayer,
} from '../similarMatch'

describe('similar match matching primitives', () => {
  it('normalizes local 1v1 formats to AoE4World rm_solo', () => {
    expect(inferGameKind('1v1')).toBe('rm_solo')
    expect(inferGameKind('rm_1v1')).toBe('rm_solo')
    expect(inferGameKind('2v2')).toBe('rm_2v2')
  })

  it('compares civilization sides as unordered multisets', () => {
    expect(normalizeMatchToken('  Order   of the Dragon ')).toBe('order of the dragon')
    expect(civMultiset(['French', 'English'])).toEqual(['english', 'french'])
    expect(sameCivMultiset(['French', 'English'], ['english', 'french'])).toBe(true)
    expect(sameCivMultiset(['French'], ['english'])).toBe(false)
  })

  it('resolves a team result only when every player agrees', () => {
    const player = (result: SimilarMatchPlayer['result']): SimilarMatchPlayer => ({
      profileId: 1,
      name: 'player',
      civilization: 'english',
      result,
      rating: 1_200,
      mmr: 1_200,
    })
    expect(teamResult([player('win')])).toBe('win')
    expect(teamResult([player('win'), player('loss')])).toBe('unknown')
    expect(teamResult([])).toBe('unknown')
  })

  it('prefers higher-rated matches and returns the top five by average rating', () => {
    const candidate = (gameId: number, averageRating: number): SimilarMatchCandidate => ({
      gameId,
      startedAt: `2026-08-${String(gameId).padStart(2, '0')}T00:00:00.000Z`,
      map: 'Highways',
      kind: 'rm_1v1',
      patch: '12',
      durationSec: 900,
      averageRating,
      score: 50,
      quality: 'exact',
      targetTeamIndex: 0,
      targetTeamWon: true,
      referenceProfileId: gameId,
      referenceCiv: 'english',
      referenceRating: averageRating,
      teams: [],
      reasons: [],
    })
    const candidates = [1100, 1400, 1300, 1500, 1600, 1700, 1200].map((rating, index) =>
      candidate(index + 1, rating),
    )

    expect(
      rankSimilarMatchCandidates(candidates, 1250).map((item) => item.averageRating),
    ).toEqual([1700, 1600, 1500, 1400, 1300])
  })

  it('falls back to the best available ratings when no candidate is above the baseline', () => {
    const candidate = (gameId: number, averageRating: number): SimilarMatchCandidate => ({
      gameId,
      startedAt: '2026-08-01T00:00:00.000Z',
      map: 'Highways',
      kind: 'rm_1v1',
      patch: '12',
      durationSec: 900,
      averageRating,
      score: 50,
      quality: 'exact',
      targetTeamIndex: 0,
      targetTeamWon: true,
      referenceProfileId: gameId,
      referenceCiv: 'english',
      referenceRating: averageRating,
      teams: [],
      reasons: [],
    })

    expect(rankSimilarMatchCandidates([candidate(1, 1100), candidate(2, 1200)], 1300).map((item) => item.gameId)).toEqual([2, 1])
  })
})
