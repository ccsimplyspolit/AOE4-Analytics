import { describe, expect, it } from 'vitest'
import type { LastMatchCoachContext } from '../coachContext'
import { evaluateMatchDiagnostics } from '../matchDiagnostics'

function ctx(
  durationSec = 900,
  result: 'win' | 'loss' | null = 'loss',
): LastMatchCoachContext {
  return {
    profile: { profileId: 1, name: 'Test', country: null },
    game: {
      gameId: 100,
      startedAt: '2026-08-01T12:00:00Z',
      durationSec,
      map: 'Dry Arabia',
      format: 'rm_solo',
      patch: '10604',
      server: null,
      isFfa: false,
    },
    player: {
      profileId: 1,
      name: 'Test',
      civilization: 'english',
      result,
    },
    teammates: [],
    opponents: [{ profileId: 2, name: 'Opp', civilization: 'french', result: 'win' }],
  }
}

describe('evaluateMatchDiagnostics', () => {
  it('fires always-on tips for any context', () => {
    const result = evaluateMatchDiagnostics(ctx(600, 'win'))
    expect(result.diagnostics.length).toBeGreaterThan(0)
    expect(result.diagnostics.some((d) => d.tip.id === 'macro-tc-idle-avoid')).toBe(true)
  })

  it('shows tips on wins as well as losses', () => {
    const win = evaluateMatchDiagnostics(ctx(400, 'win'))
    const loss = evaluateMatchDiagnostics(ctx(400, 'loss'))
    expect(win.diagnostics.length).toBeGreaterThan(0)
    expect(loss.diagnostics.length).toBeGreaterThan(0)
  })

  it('grades long losses lower on macro score', () => {
    const shortWin = evaluateMatchDiagnostics(ctx(420, 'win'))
    const longLoss = evaluateMatchDiagnostics(ctx(1500, 'loss'))
    expect(shortWin.macroScoreLabel.startsWith('S') || shortWin.macroScoreLabel.startsWith('A')).toBe(true)
    expect(longLoss.macroScoreLabel.startsWith('D')).toBe(true)
  })

  it('includes duration-gated tips for longer games', () => {
    const short = evaluateMatchDiagnostics(ctx(200, 'loss'))
    const long = evaluateMatchDiagnostics(ctx(1200, 'loss'))
    expect(long.diagnostics.length).toBeGreaterThanOrEqual(short.diagnostics.length)
  })
})
