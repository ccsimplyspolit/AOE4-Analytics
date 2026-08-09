import { describe, expect, it } from 'vitest'
import type { MatchSummary } from '../statsSummary'
import type { StoredMatch } from '../../store/historyStore'
import { analyzeMatchCorpus } from '../matchCorpus'

function match(id: string, overrides: Partial<StoredMatch> = {}): StoredMatch {
  return {
    id,
    playedAt: `2026-08-0${id}T12:00:00.000Z`,
    result: 'loss',
    civ: 'order_of_the_dragon',
    oppCiv: 'english',
    oppName: 'Opponent',
    map: 'Dry Arabia',
    durationSec: 900,
    rating: 1_000,
    ratingDiff: -20,
    analysis: {
      result: 'loss',
      signals: [],
      apm: null,
      grade: null,
      summary: 'Loss',
      hasLocalStats: false,
    },
    goals: [],
    priorGoalChecks: [],
    createdAt: `2026-08-0${id}T12:00:00.000Z`,
    ...overrides,
  }
}

const completeSummary: MatchSummary = {
  gameLengthSec: 900,
  players: [
    {
      playerId: 1,
      name: 'Me',
      profileId: 42,
      civToken: 'od',
      villagersLost: 6,
      casualties: [],
      buildOrder: [
        { timeSec: 0, playerId: 1, category: 'unit', blueprint: 'unit_villager_1_od', name: 'Villager' },
        { timeSec: 30, playerId: 1, category: 'unit', blueprint: 'unit_villager_1_od', name: 'Villager' },
        { timeSec: 100, playerId: 1, category: 'unit', blueprint: 'unit_villager_1_od', name: 'Villager' },
        { timeSec: 240, playerId: 1, category: 'building', blueprint: 'building_town_center_od', name: 'Town Center' },
      ],
      resources: [
        {
          timeSec: 900,
          bank: { food: 700, wood: 100, gold: 100, stone: 0 },
          gathered: { food: 4_000, wood: 1_000, gold: 900, stone: 0 },
          spent: { food: 3_000, wood: 900, gold: 800, stone: 0 },
          perMinute: null,
        },
      ],
      scores: [],
      totals: {
        resourcesGathered: { food: 4_000, wood: 1_000, gold: 900, stone: 0 },
        resourcesSpent: { food: 3_000, wood: 900, gold: 800, stone: 0 },
        unitsProduced: 30,
        unitsLost: 20,
        unitsKilled: 10,
        buildingsLost: 0,
        buildingsRazed: 0,
        techResearched: 4,
        largestArmy: 12,
        sacredCaptured: 0,
        sacredLost: 0,
        sacredNeutralized: 0,
        relicsCaptured: 0,
        villagerHigh: 38,
        age2Sec: 420,
        age3Sec: null,
        age4Sec: null,
      },
    },
    {
      playerId: 2,
      name: 'Enemy',
      profileId: 99,
      civToken: 'eng',
      villagersLost: 0,
      casualties: [],
      buildOrder: [],
      resources: [],
      scores: [],
      totals: {
        resourcesGathered: { food: 3_000, wood: 900, gold: 900, stone: 0 },
        resourcesSpent: { food: 2_500, wood: 800, gold: 800, stone: 0 },
        unitsProduced: 25,
        unitsLost: 10,
        unitsKilled: 20,
        buildingsLost: 0,
        buildingsRazed: 0,
        techResearched: 3,
        largestArmy: 15,
        sacredCaptured: 0,
        sacredLost: 0,
        sacredNeutralized: 0,
        relicsCaptured: 0,
        villagerHigh: 44,
        age2Sec: 300,
        age3Sec: null,
        age4Sec: null,
      },
    },
  ],
}

describe('analyzeMatchCorpus', () => {
  it('keeps missing summaries unavailable and still counts available Relic counters', () => {
    const second = match('2', {
      result: null,
      perPlayer: [
        {
          profileId: 42,
          teamId: 1,
          civ: 'order_of_the_dragon',
          result: 'win',
          unitsProduced: 20,
          kills: 8,
          deaths: 4,
          kd: 2,
          buildingsProduced: 5,
          techsResearched: 2,
          apm: 44,
          gameTimeSec: 600,
        },
      ],
    })
    const report = analyzeMatchCorpus({
      matches: [match('1', { perPlayer: [{
        profileId: 42,
        teamId: 1,
        civ: 'order_of_the_dragon',
        result: 'loss',
        unitsProduced: 30,
        kills: 10,
        deaths: 14,
        kd: 0.71,
        buildingsProduced: 4,
        techsResearched: 4,
        apm: 29,
        gameTimeSec: 900,
      }] }), second],
      summaries: new Map([['1', completeSummary], ['2', null]]),
      profileId: 42,
      buildAuditRows: [{
        matchId: '1',
        playedAt: '',
        result: 'loss',
        civ: 'order_of_the_dragon',
        map: 'Dry Arabia',
        format: '1v1',
        summaryStatus: 'available',
        referenceBuild: 'Order build',
        score: 67,
        confirmedIssues: 1,
        reviewItems: 0,
        strengths: 1,
        eventCount: 4,
        gradeableCheckpoints: 2,
        timedCheckpoints: 1,
        confidence: 'medium',
      }],
      generatedAt: '2026-08-09T00:00:00.000Z',
    })

    expect(report.coverage.totalGames).toBe(2)
    expect(report.coverage.summaryGames).toBe(1)
    expect(report.coverage.matchedPlayerGames).toBe(1)
    expect(report.coverage.counterGames).toBe(2)
    expect(report.coverage.buildScoreGames).toBe(1)
    expect(report.coverage.unknownResults).toBe(0)
    expect(report.metrics.avgBuildScore).toBe(67)
    expect(report.matches[0]?.summaryStatus).toBe('available')
    expect(report.matches[1]?.summaryStatus).toBe('unavailable')
    expect(report.matches[0]?.metrics.gathered).toBe(5900)
    expect(report.matches[0]?.findingIds).toEqual(expect.arrayContaining(['tc-idle', 'villager-losses']))
    expect(report.repeatedFindings.some((finding) => finding.id === 'missing-summary')).toBe(true)
  })
})
