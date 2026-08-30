import { describe, expect, it } from 'vitest'
import { buildPlayerDossier, scoutRowsToStatGames } from '../playerDossier'
import type { StatGame } from '../playerStats'

function game(partial: Partial<StatGame> & Pick<StatGame, 'result' | 'civ'>): StatGame {
  return {
    oppCiv: 'french',
    map: 'Dry Arabia',
    durationSec: 1200,
    ratingDiff: null,
    format: 'rm_1v1',
    playedAt: '2026-08-01T12:00:00Z',
    ...partial,
  }
}

describe('buildPlayerDossier', () => {
  it('returns an empty-safe dossier', () => {
    const dossier = buildPlayerDossier([], 1)
    expect(dossier.gameCount).toBe(0)
    expect(dossier.bottleneck).toBeNull()
    expect(dossier.preMatch.role).toBe('Insufficient sample')
  })

  it('flags repeated short losses as a critical bottleneck', () => {
    const games = Array.from({ length: 6 }, (_, index) =>
      game({
        result: 'loss',
        civ: 'english',
        durationSec: 500,
        playedAt: `2026-08-0${index + 1}T12:00:00Z`,
      }),
    )
    const dossier = buildPlayerDossier(games, 42)
    expect(dossier.weaknesses.some((item) => item.id === 'early-losses')).toBe(true)
    expect(dossier.bottleneck?.id).toBe('early-losses')
    expect(dossier.bottleneck?.confidence).toBe('likely')
  })

  it('names the best civ from a winning sample', () => {
    const games = [
      ...Array.from({ length: 6 }, () => game({ result: 'win', civ: 'rus', durationSec: 800 })),
      game({ result: 'loss', civ: 'malians', durationSec: 2000 }),
    ]
    const dossier = buildPlayerDossier(games, 7)
    expect(dossier.civPool[0]?.key).toBe('rus')
    expect(dossier.strengths.some((item) => item.id === 'best-civ')).toBe(true)
  })
})

describe('scoutRowsToStatGames', () => {
  it('maps unknown results to null', () => {
    const games = scoutRowsToStatGames([
      {
        result: 'unknown',
        civilization: 'english',
        opponentCivilizations: ['french'],
        map: 'Gorge',
        durationSec: 100,
        format: 'rm_1v1',
        startedAt: '2026-08-01T12:00:00Z',
      },
    ])
    expect(games[0]?.result).toBeNull()
    expect(games[0]?.civ).toBe('english')
  })
})
