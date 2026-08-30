import { describe, expect, it } from 'vitest'
import { TEAM_SECTION_IDS } from '../coachReportCommon'
import { buildTeamCoachReport } from '../teamCoachReport'
import type { StoredMatch } from '../../store/historyStore'

function match(partial: Partial<StoredMatch> & Pick<StoredMatch, 'id' | 'result' | 'format'>): StoredMatch {
  return {
    id: partial.id,
    playedAt: partial.playedAt ?? '2026-08-01T12:00:00Z',
    result: partial.result,
    civ: partial.civ ?? 'english',
    oppCiv: 'french',
    oppName: 'E1',
    map: 'Dry Arabia',
    durationSec: partial.durationSec ?? 1200,
    rating: 1200,
    ratingDiff: 0,
    analysis: {
      result: partial.result,
      signals: [],
      apm: 50,
      grade: 'B',
      summary: '',
      hasLocalStats: false,
    },
    goals: [],
    priorGoalChecks: [],
    createdAt: '2026-08-01T13:00:00Z',
    format: partial.format,
    myTeam: partial.myTeam ?? [{ civ: 'rus', name: 'AllyA' }],
    oppTeam: partial.oppTeam ?? [
      { civ: 'french', name: 'E1' },
      { civ: 'holy_roman_empire', name: 'E2' },
    ],
  }
}

describe('buildTeamCoachReport', () => {
  it('keeps unique structure and insufficient_data for empty / 1v1-only', () => {
    const empty = buildTeamCoachReport({ subjectProfileId: 1, subjectName: 'Me' })
    expect(Object.keys(empty.sections).sort()).toEqual([...TEAM_SECTION_IDS].sort())
    expect(empty.gameCount).toBe(0)
    expect(empty.sections.allyProfiles.status).toBe('insufficient_data')

    const only1v1 = buildTeamCoachReport({
      subjectProfileId: 1,
      subjectName: 'Me',
      localMatches: [match({ id: 'a', result: 'win', format: '1v1', myTeam: [] })],
    })
    expect(only1v1.gameCount).toBe(0)
    expect(only1v1.sections.teamErrors.status).toBe('insufficient_data')
  })

  it('profiles allies from 2v2 games without blaming them for the subject sample', () => {
    const localMatches = Array.from({ length: 6 }, (_, i) =>
      match({
        id: String(i),
        result: 'loss',
        format: '2v2',
        durationSec: 10 * 60,
        playedAt: `2026-08-0${i + 1}T12:00:00Z`,
      }),
    )
    const report = buildTeamCoachReport({
      subjectProfileId: 42,
      subjectName: 'Me',
      localMatches,
    })
    expect(report.gameCount).toBe(6)
    expect(report.allyProfiles[0]?.name).toBe('AllyA')
    expect(report.teamTopErrors.some((e) => e.id === 'team-early')).toBe(true)
    expect(report.allyErrors).toEqual([])
    expect(report.sections.allyErrors.status).toBe('insufficient_data')
    expect(report.weakLink.text.toLowerCase()).toContain('weak-link')
  })

  it('splits format plans for 2v2 vs 3v3', () => {
    const localMatches = [
      ...Array.from({ length: 3 }, (_, i) => match({ id: `2-${i}`, result: 'win', format: '2v2' })),
      ...Array.from({ length: 3 }, (_, i) =>
        match({
          id: `3-${i}`,
          result: 'loss',
          format: '3v3',
          myTeam: [
            { civ: 'rus', name: 'A' },
            { civ: 'malians', name: 'B' },
          ],
        }),
      ),
    ]
    const report = buildTeamCoachReport({
      subjectProfileId: 1,
      subjectName: 'Me',
      localMatches,
    })
    const two = report.formatPlans.find((p) => p.lane === '2v2')
    const three = report.formatPlans.find((p) => p.lane === '3v3')
    expect(two?.plan.text).toMatch(/3 games/)
    expect(three?.plan.text).toMatch(/3 games/)
    expect(report.overallConfidence).toBe('probable')
  })
})
