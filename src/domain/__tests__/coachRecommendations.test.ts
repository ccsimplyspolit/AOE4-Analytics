import { describe, expect, it } from 'vitest'
import type { BuildCatalogEntry } from '../buildCatalog'
import { recommendBuildsForCoach } from '../coachRecommendations'
import type { LastMatchCoachContext } from '../coachContext'
import type { BuildOrderVideoEvidence } from '../videoEvidence'

function entry(overrides: Partial<BuildCatalogEntry> = {}): BuildCatalogEntry {
  return {
    id: 'english-test',
    origin: 'curated',
    civilizationLabels: ['English'],
    opponentCivilizationLabels: [],
    sourceUrl: null,
    provider: null,
    strategy: null,
    map: null,
    videoUrl: null,
    score: null,
    views: null,
    patch: '10604',
    updatedAt: '2026-08-08T00:00:00Z',
    confidence: 0.8,
    sampleSize: 100,
    stepCount: 4,
    durationSec: 360,
    timedSteps: 3,
    hasVideoEvidence: false,
    searchText: 'english test',
    build: {
      name: 'English timed pressure',
      civilization: 'English',
      archetype: 'Feudal aggression',
      build_order: [],
    },
    ...overrides,
  }
}

const context: LastMatchCoachContext = {
  profile: { profileId: 1, name: 'Test', country: null },
  game: {
    gameId: 2,
    startedAt: '2026-08-08T00:00:00Z',
    durationSec: 900,
    map: 'Dry Arabia',
    format: 'rm_1v1',
    patch: '10604',
    server: null,
    isFfa: false,
  },
  player: { profileId: 1, name: 'Test', civilization: 'english', result: 'loss' },
  teammates: [],
  opponents: [{ profileId: 2, name: 'Opponent', civilization: 'french', result: 'win' }],
}

describe('coach build recommendations', () => {
  it('keeps only the player civilization and prefers timed local evidence', () => {
    const recommendations = recommendBuildsForCoach(context, [
      entry(),
      entry({
        id: 'french-test',
        civilizationLabels: ['French'],
        build: { ...entry().build, name: 'French knights' },
      }),
    ])

    expect(recommendations).toHaveLength(1)
    expect(recommendations[0]?.entry.id).toBe('english-test')
    expect(recommendations[0]?.reasons[0]).toBe('Matches English')
  })

  it('uses matchup-specific video evidence when ranking a build', () => {
    const evidence: BuildOrderVideoEvidence = {
      schemaVersion: 1,
      windowStart: '2026-07-09',
      windowEnd: '2026-08-08',
      sampleSize: 3,
      requestedSampleSize: 100,
      coverageNote: null,
      commonActions: ['Feudal aggression'],
      commonResources: ['food'],
      commonTopics: ['Counterplay'],
      commonOpponents: ['French'],
      commonMilitaryMentions: ['Archer'],
      timingSignals: [],
      sources: [],
    }
    const recommendations = recommendBuildsForCoach(context, [
      entry({
        hasVideoEvidence: true,
        build: { ...entry().build, video_evidence: evidence },
      }),
      entry({ id: 'english-generic', hasVideoEvidence: false }),
    ])

    expect(recommendations[0]?.entry.id).toBe('english-test')
    expect(recommendations[0]?.reasons).toContain('Video evidence covers French')
    expect(recommendations[0]?.reasons).toContain('Video evidence includes counterplay context')
  })
})
