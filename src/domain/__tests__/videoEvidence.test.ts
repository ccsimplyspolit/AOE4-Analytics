import { describe, expect, it } from 'vitest'
import { evidenceLabel, type BuildOrderVideoEvidence } from '../videoEvidence'

const baseEvidence: BuildOrderVideoEvidence = {
  schemaVersion: 1,
  windowStart: '2026-07-09',
  windowEnd: '2026-08-08',
  sampleSize: 2,
  requestedSampleSize: 100,
  coverageNote: '2 matching videos found; requested 100',
  commonActions: [],
  commonResources: [],
  commonTopics: [],
  commonOpponents: [],
  commonMilitaryMentions: [],
  timingSignals: [],
  sources: [
    {
      id: 'one',
      title: 'One',
      url: 'https://www.youtube.com/watch?v=one',
      channel: null,
      publishedAt: '2026-08-01T00:00:00Z',
      viewCount: null,
      transcriptLanguage: null,
      transcriptSource: 'none',
      signals: {
        archetype: null,
        actions: [],
        resources: [],
        topics: [],
        opponentCivs: [],
        militaryMentions: [],
        timings: [],
        confidence: 0.5,
      },
    },
    {
      id: 'two',
      title: 'Two',
      url: 'https://www.youtube.com/watch?v=two',
      channel: null,
      publishedAt: '2026-08-02T00:00:00Z',
      viewCount: null,
      transcriptLanguage: null,
      transcriptSource: 'none',
      signals: {
        archetype: null,
        actions: [],
        resources: [],
        topics: [],
        opponentCivs: [],
        militaryMentions: [],
        timings: [],
        confidence: 0.5,
      },
    },
  ],
}

describe('evidenceLabel', () => {
  it('distinguishes metadata-only evidence', () => {
    expect(evidenceLabel(baseEvidence)).toBe('2 videos · metadata only')
  })

  it('reports transcript-backed evidence explicitly', () => {
    expect(
      evidenceLabel({
        ...baseEvidence,
        sources: baseEvidence.sources.map((source, index) =>
          index === 0
            ? { ...source, transcriptSource: 'auto', transcriptLanguage: 'en' }
            : source,
        ),
      }),
    ).toBe('2 videos analysed · 1 transcript')
  })

  it('reports an empty slice clearly', () => {
    expect(evidenceLabel({ ...baseEvidence, sampleSize: 0, sources: [] })).toBe(
      'No video evidence harvested yet',
    )
  })
})
