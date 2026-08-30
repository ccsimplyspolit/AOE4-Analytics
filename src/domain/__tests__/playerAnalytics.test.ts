import { describe, expect, it } from 'vitest'
import { buildPlayerAnalytics } from '../playerAnalytics'

describe('buildPlayerAnalytics', () => {
  it('uses public scout history when no local matches', () => {
    const bundle = buildPlayerAnalytics({
      identity: {
        profileId: 1,
        name: 'Scout',
        country: null,
        primary: null,
      },
      scoutGames: [
        {
          gameId: 1,
          startedAt: '2026-08-01T12:00:00Z',
          durationSec: 600,
          map: 'Dry Arabia',
          format: '1v1',
          result: 'win',
          civilization: 'english',
          opponentCivilizations: ['french'],
          opponentNames: ['Opp'],
        },
      ],
    })
    expect(bundle.source).toBe('public')
    expect(bundle.stats.totalGames).toBe(1)
    expect(bundle.macro?.totalGames).toBe(1)
  })

  it('prefers local matches for own account', () => {
    const bundle = buildPlayerAnalytics({
      identity: {
        profileId: 42,
        name: 'Me',
        country: null,
        primary: null,
      },
      activeProfileId: 42,
      localMatches: [
        {
          id: '1',
          playedAt: '2026-08-01T12:00:00Z',
          result: 'win',
          civ: 'english',
          oppCiv: 'french',
          oppName: 'Opp',
          map: 'Dry Arabia',
          durationSec: 500,
          rating: 1200,
          ratingDiff: 8,
          analysis: {
            result: 'win',
            signals: [],
            apm: 90,
            grade: 'A',
            summary: 'Win',
            hasLocalStats: false,
          },
          goals: [],
          priorGoalChecks: [],
          createdAt: '2026-08-01T13:00:00Z',
        },
      ],
      scoutGames: [
        {
          gameId: 2,
          startedAt: '2026-07-01T12:00:00Z',
          durationSec: 900,
          map: 'Lipany',
          format: '1v1',
          result: 'loss',
          civilization: 'english',
          opponentCivilizations: ['mongols'],
          opponentNames: ['Opp2'],
        },
      ],
    })
    expect(bundle.source).toBe('mixed')
    expect(bundle.hasLocalRichData).toBe(true)
    expect(bundle.playstyle).not.toBeNull()
    expect(bundle.stats.totalGames).toBe(1)
  })
})
