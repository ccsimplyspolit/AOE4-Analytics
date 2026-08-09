import { describe, expect, it } from 'vitest'
import { productionModifiersForCiv } from '../productionModifiers'

describe('production calculator civilization modifiers', () => {
  it('returns an empty list for an unknown civilization', () => {
    expect(productionModifiersForCiv('not-a-civ')).toEqual([])
  })

  it('exposes English age-specific farms and military bonuses', () => {
    const modifiers = productionModifiersForCiv('english')
    expect(modifiers.map((modifier) => modifier.id)).toEqual([
      'english-farms-dark',
      'english-farms-feudal',
      'english-farms-castle',
      'english-farms-imperial',
      'english-dock',
      'white-tower',
      'english-man-at-arms',
    ])
    expect(modifiers.find((modifier) => modifier.id === 'english-farms-feudal')).toMatchObject({
      age: 2,
      foodSources: ['farm'],
      resourceMultiplier: { food: 1.2, wood: 1, gold: 1, stone: 1 },
    })
  })

  it('fills resource multiplier defaults without mutating the source data', () => {
    const first = productionModifiersForCiv('english')
    first.find((modifier) => modifier.id === 'english-farms-feudal')!.resourceMultiplier!.food = 99
    const second = productionModifiersForCiv('english')
    expect(
      second.find((modifier) => modifier.id === 'english-farms-feudal')!.resourceMultiplier?.food,
    ).toBe(1.2)
  })

  it('keeps modifier target filters available for selective calculator matching', () => {
    expect(productionModifiersForCiv('french')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'school-of-cavalry', target: { classes: ['cavalry'] } }),
        expect.objectContaining({
          id: 'french-archery-range',
          target: { producedBy: ['archery-range'] },
        }),
      ]),
    )
  })

  it('models passive income and drop-off modifiers as independent values', () => {
    const mongol = productionModifiersForCiv('mongols')
    expect(mongol.find((modifier) => modifier.id === 'steppe-redoubt')).toMatchObject({
      kind: 'dropOff',
      dropOffPercent: { gold: 50 },
    })
    const goldenHorde = productionModifiersForCiv('golden_horde')
    expect(goldenHorde.find((modifier) => modifier.id === 'golden-horde-stockyard-edict')).toEqual(
      expect.objectContaining({ kind: 'passive', passivePerMinute: { gold: 40 } }),
    )
  })

  it('returns fresh nested objects for every call', () => {
    const first = productionModifiersForCiv('tughlaq_dynasty')
    const second = productionModifiersForCiv('tughlaq_dynasty')
    expect(first).not.toBe(second)
    expect(first[0]!.resourceMultiplier).not.toBe(second[0]!.resourceMultiplier)
    expect(first[3]!.dropOffPercent).not.toBe(second[3]!.dropOffPercent)
  })
})
