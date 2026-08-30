import { describe, expect, it } from 'vitest'
import {
  CIV_AND_MAP_NAMES,
  expandGameNameKeys,
  lookupCivOrMapName,
} from '../gameNameDictionary'
import { resolveGameNameKey } from '../gameNameResolve'

describe('resolveGameNameKey', () => {
  it('resolves civ slugs to canonical English labels', () => {
    expect(resolveGameNameKey('ottomans')).toBe('Ottomans')
    expect(resolveGameNameKey('zhu_xis_legacy')).toBe("Zhu Xi's Legacy")
  })

  it('resolves map slugs to display labels', () => {
    expect(resolveGameNameKey('dry_arabia')).toBe('Dry Arabia')
    expect(resolveGameNameKey('generated_map')).toBe('Random Map')
    expect(resolveGameNameKey('nagari')).toBe('Nagari')
    expect(resolveGameNameKey('highwoods')).toBe('Highwoods')
    expect(resolveGameNameKey('high_view')).toBe('High View')
  })

  it('passes through already-localized or English labels', () => {
    expect(resolveGameNameKey('Dry Arabia')).toBe('Dry Arabia')
    expect(resolveGameNameKey('Сухая Аравия')).toBe('Сухая Аравия')
    expect(resolveGameNameKey('Nagari')).toBe('Nagari')
  })
})

describe('ranked map advisor dictionary', () => {
  const ru = expandGameNameKeys(CIV_AND_MAP_NAMES.ru)

  it('translates every Map Pool Advisor dropdown label in Russian', () => {
    const advisorMaps = [
      'Nagari',
      'High View',
      'Highwoods',
      'Golden Heights',
      'Dry Arabia',
      'Cliffside',
      'Gorge',
      'Himeyama',
      'Forts',
    ]
    const expected: Record<string, string> = {
      Nagari: 'Нагари',
      'High View': 'Высокий вид',
      Highwoods: 'Высокий лес',
      'Golden Heights': 'Золотые высоты',
      'Dry Arabia': 'Сухая Аравия',
      Cliffside: 'Утёс',
      Gorge: 'Ущелье',
      Himeyama: 'Химэяма',
      Forts: 'Форты',
    }
    for (const map of advisorMaps) {
      const key = resolveGameNameKey(map)
      const translated = lookupCivOrMapName(ru, key) ?? ru[key]
      expect(translated).toBe(expected[map])
      expect(translated).not.toBe(map)
    }
  })

  it('resolves Relic slug forms to the same Russian labels', () => {
    expect(lookupCivOrMapName(ru, 'nagari')).toBe('Нагари')
    expect(lookupCivOrMapName(ru, 'high_view')).toBe('Высокий вид')
    expect(lookupCivOrMapName(ru, 'golden_heights')).toBe('Золотые высоты')
    expect(lookupCivOrMapName(ru, 'dry_arabia')).toBe('Сухая Аравия')
    expect(lookupCivOrMapName(ru, 'cliffside')).toBe('Утёс')
  })

  it('keeps English identity when the locale table is empty', () => {
    expect(resolveGameNameKey('Nagari')).toBe('Nagari')
    expect(lookupCivOrMapName({}, 'Nagari')).toBeUndefined()
  })
})
