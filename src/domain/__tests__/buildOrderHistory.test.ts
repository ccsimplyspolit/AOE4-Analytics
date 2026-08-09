import { describe, expect, it } from 'vitest'
import type { BuildOrder } from '../buildOrderSchema'
import { buildAuditHistoryRow, summarizeBuildAuditHistory } from '../buildOrderHistory'
import type { MatchSummary } from '../statsSummary'
import type { StoredMatch } from '../../store/historyStore'

const reference: BuildOrder = {
  name: 'English Dry Arabia opening',
  civilization: 'English',
  map: 'Dry Arabia',
  patch: '12',
  build_order: [
    {
      population_count: 6,
      villager_count: 6,
      age: 1,
      resources: { food: 6, wood: 0, gold: 0, stone: 0 },
      notes: [],
      time: '0:00',
    },
  ],
}

const match = {
  id: 'game-1',
  playedAt: '2026-08-09T10:00:00.000Z',
  result: 'win',
  civ: 'english',
  oppCiv: 'french',
  oppName: 'Opponent',
  map: 'Dry Arabia',
  durationSec: 900,
  rating: 1400,
  ratingDiff: 20,
  format: '1v1',
  patch: '12',
} as unknown as StoredMatch

function summary(): MatchSummary {
  return {
    gameLengthSec: 900,
    players: [
      {
        playerId: 1,
        name: 'Me',
        profileId: 10,
        civToken: 'english',
        totals: null,
        villagersLost: null,
        buildOrder: [
          {
            timeSec: 20,
            playerId: 1,
            category: 'unit',
            blueprint: 'unit_villager_1_eng',
            name: 'Villager',
          },
        ],
        resources: [],
        scores: [],
      },
    ],
  }
}

describe('build order history audit', () => {
  it('keeps a missing summary unavailable instead of assigning a zero score', () => {
    const row = buildAuditHistoryRow({
      match,
      summary: null,
      profileId: 10,
      builds: [reference],
    })

    expect(row.summaryStatus).toBe('unavailable')
    expect(row.score).toBeNull()
    expect(row.confidence).toBe('none')
  })

  it('scores the uniquely identified player against the compatible map build', () => {
    const row = buildAuditHistoryRow({
      match,
      summary: summary(),
      profileId: 10,
      builds: [reference],
    })

    expect(row.summaryStatus).toBe('available')
    expect(row.referenceBuild).toBe(reference.name)
    expect(row.score).toBe(100)
    expect(row.gradeableCheckpoints).toBe(1)
    expect(row.timedCheckpoints).toBe(1)
    expect(row.confidence).toBe('high')
  })

  it('aggregates only scored rows and keeps unavailable evidence visible', () => {
    const rows = [
      buildAuditHistoryRow({ match, summary: summary(), profileId: 10, builds: [reference] }),
      buildAuditHistoryRow({ match: { ...match, id: 'game-2' }, summary: null, profileId: 10, builds: [reference] }),
    ]
    const totals = summarizeBuildAuditHistory(rows)

    expect(totals.games).toBe(2)
    expect(totals.available).toBe(1)
    expect(totals.scored).toBe(1)
    expect(totals.averageScore).toBe(100)
  })
})
