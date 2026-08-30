import { describe, expect, it } from 'vitest'
import { OPPONENT_SECTION_IDS } from '../coachReportCommon'
import { buildOpponentCoachReport } from '../opponentCoachReport'
import type { ScoutMatchRow } from '../../../electron/ipc/contract'

function row(partial: Partial<ScoutMatchRow> & Pick<ScoutMatchRow, 'result' | 'civilization'>): ScoutMatchRow {
  return {
    gameId: partial.gameId ?? 1,
    startedAt: partial.startedAt ?? '2026-08-01T12:00:00Z',
    durationSec: partial.durationSec ?? 700,
    map: partial.map ?? 'Gorge',
    format: partial.format ?? '1v1',
    result: partial.result,
    civilization: partial.civilization,
    opponentCivilizations: partial.opponentCivilizations ?? ['english'],
    opponentNames: partial.opponentNames ?? ['You'],
  }
}

describe('buildOpponentCoachReport', () => {
  it('keeps unique structure and insufficient_data when empty', () => {
    const report = buildOpponentCoachReport({ profileId: 8, playerName: 'Enemy' })
    expect(Object.keys(report.sections).sort()).toEqual([...OPPONENT_SECTION_IDS].sort())
    expect(report.gameCount).toBe(0)
    expect(report.sections.predictablePatterns.status).toBe('insufficient_data')
    expect(report.punishPlan.length).toBeGreaterThan(0)
  })

  it('reads civ pool and early pattern from history', () => {
    const scoutGames = Array.from({ length: 6 }, (_, i) =>
      row({
        gameId: i + 1,
        result: i % 2 === 0 ? 'win' : 'loss',
        civilization: 'french',
        durationSec: 8 * 60,
      }),
    )
    const report = buildOpponentCoachReport({
      profileId: 8,
      playerName: 'RushGuy',
      knownCiv: 'french',
      scoutGames,
    })
    expect(report.civPool[0]?.civ).toBe('french')
    expect(report.predictablePatterns.some((p) => p.id === 'early-closer')).toBe(true)
    expect(report.overallConfidence).toBe('probable')
    expect(report.preMatchEnemyChecklist.length).toBeGreaterThan(0)
  })

  it('marks a small sample as single not confirmed', () => {
    const report = buildOpponentCoachReport({
      profileId: 4,
      playerName: 'X',
      scoutGames: [row({ result: 'win', civilization: 'rus' })],
    })
    expect(report.overallConfidence).toBe('single')
    expect(report.overallConfidence).not.toBe('confirmed')
  })
})
