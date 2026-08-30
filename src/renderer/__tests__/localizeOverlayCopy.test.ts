import { describe, expect, it } from 'vitest'
import { localizeOverlayCopy, localizeOverlayTitleRemainder } from '../localizeOverlayCopy'
import { localizeGeneratedRu } from '../localizeGeneratedCopy'

describe('localizeOverlayCopy', () => {
  it('translates aoe4guides English and German build-note fragments', () => {
    expect(localizeOverlayCopy('Start Building Town Center with Gold Villager', { terms: true })).toMatch(
      /Начните строить/i,
    )
    expect(localizeOverlayCopy('Start Building Town Center with Gold Villager', { terms: true })).toMatch(
      /крестьянином на золоте/,
    )
    expect(localizeOverlayCopy('Rally > Food Until Age Up')).toMatch(/до перехода в эпоху/)
    expect(localizeOverlayCopy('Beginne zu bauen')).toMatch(/Начните строить/)
  })

  it('translates catalog title remainders like FC / 2TC', () => {
    expect(localizeOverlayTitleRemainder(' - Marinelord (FC)')).toBe(' - Marinelord (БЗ)')
    expect(localizeOverlayTitleRemainder(' 2TC Boom')).toMatch(/2 ТЦ/)
  })

  it('translates live coach build-target checkpoints', () => {
    expect(localizeOverlayCopy('Build Target: Feudal Age')).toBe('Цель билда: феодальная эпоха')
    expect(localizeOverlayCopy('18 villagers target')).toBe('Цель: 18 крестьян')
  })

  it('translates coverage notes with a count', () => {
    expect(
      localizeOverlayCopy(
        '2 opponent civilizations unknown — matchup guidance covers known civilizations only.',
      ),
    ).toMatch(/цивилизац/)
  })

  it('translates unstructured scout forks', () => {
    const text = localizeOverlayCopy('If you scout Palace Guard or Zhuge Nu:')
    expect(text).toMatch(/^Если разведка показывает/)
    expect(text).not.toMatch(/If you scout/)
  })

  it('replaces leftover unit names when terms are on', () => {
    expect(localizeOverlayCopy('Queue Horsemen and Mangonels', { terms: true })).toMatch(/Всадник/)
  })
})

describe('localizeGeneratedRu overlay analysis titles', () => {
  it('translates post-game signal titles with numbers', () => {
    expect(localizeGeneratedRu('You won your fights (K/D 1.5)')).toBe('Выигрывали бои (K/D 1.5)')
    expect(localizeGeneratedRu('Town Center sat idle (~6 villagers never made)')).toMatch(/Ратуша/)
    expect(localizeGeneratedRu('Feudal at 5:10 — your build targets 4:15')).toMatch(/Феодал/)
  })
})
