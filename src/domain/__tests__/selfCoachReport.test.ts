import { describe, expect, it } from 'vitest'
import { SELF_SECTION_IDS } from '../coachReportCommon'
import { buildSelfCoachReport } from '../selfCoachReport'
import type { ScoutMatchRow } from '../../../electron/ipc/contract'

function row(partial: Partial<ScoutMatchRow> & Pick<ScoutMatchRow, 'result' | 'civilization'>): ScoutMatchRow {
  return {
    gameId: partial.gameId ?? 1,
    startedAt: partial.startedAt ?? '2026-08-01T12:00:00Z',
    durationSec: partial.durationSec ?? 1200,
    map: partial.map ?? 'Dry Arabia',
    format: partial.format ?? '1v1',
    result: partial.result,
    civilization: partial.civilization,
    opponentCivilizations: partial.opponentCivilizations ?? ['french'],
    opponentNames: partial.opponentNames ?? ['Opp'],
  }
}

describe('buildSelfCoachReport', () => {
  it('keeps a unique section map and insufficient_data when empty', () => {
    const report = buildSelfCoachReport({ profileId: 1, playerName: 'A', voice: 'you' })
    expect(Object.keys(report.sections).sort()).toEqual([...SELF_SECTION_IDS].sort())
    expect(report.gameCount).toBe(0)
    expect(report.overallConfidence).toBe('single')
    expect(report.sections.economy.status).toBe('insufficient_data')
    expect(report.sections.scouting.status).toBe('insufficient_data')
    expect(report.topErrors).toEqual([])
  })

  it('always returns a decision tree even on empty samples', () => {
    const empty = buildSelfCoachReport({ profileId: 1, playerName: 'A' })
    expect(empty.decisionTree.length).toBeGreaterThan(0)
    const filled = buildSelfCoachReport({
      profileId: 1,
      playerName: 'A',
      scoutGames: [row({ result: 'win', civilization: 'english' })],
    })
    expect(filled.decisionTree.some((b) => b.ifId === '2tc')).toBe(true)
  })

  it('flags long losses as a probable macro weakness', () => {
    const scoutGames = Array.from({ length: 6 }, (_, i) =>
      row({
        gameId: i + 1,
        result: 'loss',
        civilization: 'english',
        durationSec: 32 * 60,
        startedAt: `2026-08-${String(i + 1).padStart(2, '0')}T12:00:00Z`,
      }),
    )
    const report = buildSelfCoachReport({
      profileId: 9,
      playerName: 'Me',
      voice: 'you',
      scoutGames,
    })
    const late = report.topErrors.find((e) => e.id === 'late-macro')
    expect(late).toBeTruthy()
    expect(late?.confidence).toBe('probable')
    expect(report.bottleneck?.id).toBe('late-macro')
    expect(report.sections.economy.status).toBe('insufficient_data')
  })

  it('splits 1v1 vs team formats', () => {
    const scoutGames = [
      ...Array.from({ length: 4 }, (_, i) =>
        row({ gameId: i + 1, result: 'win', civilization: 'rus', format: 'rm_1v1', durationSec: 800 }),
      ),
      ...Array.from({ length: 4 }, (_, i) =>
        row({
          gameId: i + 10,
          result: 'loss',
          civilization: 'rus',
          format: 'rm_2v2',
          durationSec: 1400,
        }),
      ),
    ]
    const report = buildSelfCoachReport({
      profileId: 3,
      playerName: 'P',
      scoutGames,
    })
    expect(report.formatSplits.status).toBe('ok')
    if (report.formatSplits.status !== 'ok') return
    const one = report.formatSplits.data.find((s) => s.lane === '1v1')
    const two = report.formatSplits.data.find((s) => s.lane === '2v2')
    expect(one?.games).toBe(4)
    expect(one?.wins).toBe(4)
    expect(two?.games).toBe(4)
    expect(two?.losses).toBe(4)
  })

  it('marks a small sample as single, not confirmed', () => {
    const report = buildSelfCoachReport({
      profileId: 2,
      playerName: 'B',
      scoutGames: [
        row({ result: 'win', civilization: 'malians', durationSec: 900 }),
        row({ gameId: 2, result: 'loss', civilization: 'malians', durationSec: 1100 }),
      ],
    })
    expect(report.overallConfidence).toBe('single')
    expect(report.overallConfidence).not.toBe('confirmed')
  })

  it('uses decoded Feudal times from summaries, not duration proxies', () => {
    const localMatches = Array.from({ length: 3 }, (_, i) => ({
      id: String(i + 1),
      playedAt: `2026-08-0${i + 1}T12:00:00Z`,
      result: 'loss' as const,
      civ: 'english',
      oppCiv: 'french',
      oppName: 'Opp',
      map: 'Dry Arabia',
      durationSec: 900,
      rating: 1200,
      ratingDiff: -8,
      analysis: {
        result: 'loss' as const,
        signals: [],
        apm: 50,
        grade: 'C' as const,
        summary: 'Loss',
        hasLocalStats: false,
      },
      goals: [],
      priorGoalChecks: [],
      createdAt: `2026-08-0${i + 1}T13:00:00Z`,
    }))
    const totals = {
      resourcesGathered: { food: 2000, wood: 800, gold: 400, stone: 0 },
      resourcesSpent: { food: 1500, wood: 600, gold: 300, stone: 0 },
      unitsProduced: 15,
      unitsLost: 10,
      unitsKilled: 8,
      buildingsLost: 1,
      buildingsRazed: 0,
      techResearched: 2,
      largestArmy: 10,
      sacredCaptured: 0,
      sacredLost: 0,
      sacredNeutralized: 0,
      relicsCaptured: 0,
      villagerHigh: 28,
      age2Sec: 360,
      age3Sec: null,
      age4Sec: null,
    }
    const summariesByMatchId = Object.fromEntries(
      localMatches.map((m) => [
        m.id,
        {
          gameLengthSec: 900,
          players: [
            {
              playerId: 1,
              name: 'Me',
              profileId: 9,
              civToken: 'eng',
              totals,
              villagersLost: 2,
              buildOrder: [],
              resources: [],
              scores: [],
            },
          ],
        },
      ]),
    )
    const report = buildSelfCoachReport({
      profileId: 9,
      playerName: 'Me',
      voice: 'you',
      localMatches,
      summariesByMatchId,
    })
    const feudal = report.topErrors.find((e) => e.id === 'feudal-late')
    expect(feudal).toBeTruthy()
    expect(report.sections.typicalTimings.status).toBe('ok')
    if (report.sections.typicalTimings.status === 'ok') {
      const data = report.sections.typicalTimings.data as { meanAge2Sec: number | null }
      expect(data.meanAge2Sec).toBe(360)
    }
    expect(report.sections.trainingPlan.status).toBe('ok')
  })

  it('keeps Russian coaching grammar in you-voice (no “ты не имеют”)', () => {
    const scoutGames = Array.from({ length: 6 }, (_, i) =>
      row({
        gameId: i + 1,
        result: i % 2 === 0 ? 'win' : 'loss',
        civilization: 'english',
        durationSec: 18 * 60,
        map: 'Dry Arabia',
      }),
    )
    const report = buildSelfCoachReport({
      profileId: 1,
      playerName: 'Me',
      voice: 'you',
      scoutGames,
    })
    expect(report.styleFingerprint.status).toBe('ok')
    if (report.styleFingerprint.status !== 'ok') return
    const ru = report.styleFingerprint.data.rationale.textRu
    expect(ru).not.toMatch(/не имеют/)
    expect(ru).not.toMatch(/^Ты не /)
    expect(ru).toMatch(/Англичане/)
    expect(ru).toMatch(/замковой эпохи/)
  })

  it('names the live civ in the checklist instead of the historical main', () => {
    const scoutGames = Array.from({ length: 8 }, (_, i) =>
      row({
        gameId: i + 1,
        result: 'win',
        civilization: 'macedonian_dynasty',
        durationSec: 18 * 60,
      }),
    )
    const report = buildSelfCoachReport({
      profileId: 1,
      playerName: 'Me',
      voice: 'you',
      scoutGames,
      currentCiv: 'byzantines',
      inMatch: true,
    })
    const civ = report.preMatchChecklist.find((item) => item.id === 'civ')
    expect(civ?.label.text).toMatch(/Byzantines/)
    expect(civ?.label.text).not.toMatch(/Macedonian/)
    expect(civ?.label.textRu).toMatch(/Визант/)
    expect(civ?.label.textRu).not.toMatch(/Македонск/)
  })

  it('does not recommend the historical main civ during a live match when the current civ is unknown', () => {
    const scoutGames = Array.from({ length: 6 }, (_, i) =>
      row({
        gameId: i + 1,
        result: i % 2 === 0 ? 'win' : 'loss',
        civilization: 'macedonian_dynasty',
        durationSec: 16 * 60,
      }),
    )
    const report = buildSelfCoachReport({
      profileId: 1,
      playerName: 'Me',
      voice: 'you',
      scoutGames,
      currentCiv: null,
      inMatch: true,
    })
    const civ = report.preMatchChecklist.find((item) => item.id === 'civ')
    expect(civ?.label.textRu).not.toMatch(/Македонск/)
    expect(civ?.label.text).not.toMatch(/Macedonian/)
    expect(civ?.label.textRu).toMatch(/уже выбрана/)
  })
})
