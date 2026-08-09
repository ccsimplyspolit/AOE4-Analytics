import { describe, expect, it } from 'vitest'
import { civDisplayName, teamCivLabel } from '../civ'

describe('civilization display helpers', () => {
  it('uses canonical names for special slugs', () => {
    expect(civDisplayName('zhu_xis_legacy')).toBe("Zhu Xi's Legacy")
    expect(civDisplayName('jeanne_darc')).toBe("Jeanne d'Arc")
    expect(civDisplayName('holy_roman_empire')).toBe('Holy Roman Empire')
    expect(civDisplayName('hre')).toBe('Holy Roman Empire')
  })

  it('title-cases ordinary API slugs', () => {
    expect(civDisplayName('order_of_the_dragon')).toBe('Order of the Dragon')
    expect(civDisplayName('macedonian dynasty')).toBe('Macedonian Dynasty')
  })

  it('keeps unknown tokens readable and empty tokens explicit', () => {
    expect(civDisplayName('new_civ_42')).toBe('New Civ 42')
    expect(civDisplayName('')).toBe('Unknown')
  })

  it('combines a player civilization with teammates in stable order', () => {
    expect(teamCivLabel('ottomans', [{ civ: 'byzantines' }, { civ: 'zhu_xis_legacy' }])).toBe(
      "Ottomans + Byzantines + Zhu Xi's Legacy",
    )
  })

  it('does not add a phantom teammate for solo games', () => {
    expect(teamCivLabel('french', undefined)).toBe('French')
    expect(teamCivLabel('french', [])).toBe('French')
  })
})
