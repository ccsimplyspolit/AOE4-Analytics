import { describe, expect, it } from 'vitest'
import { civFromToken } from '../statsSummary'
import { resolveReplayCiv } from '../replay'

describe('Macedonian Dynasty token aliases', () => {
  it.each(['byzantine_ha_mac', 'byz_ha_mac'])('maps %s from post-game summaries', (token) => {
    expect(civFromToken(token)).toBe('macedonian_dynasty')
  })

  it('maps the replay token without falling back to the base Byzantine civilization', () => {
    expect(resolveReplayCiv('byzantine_ha_mac').slug).toBe('macedonian_dynasty')
  })
})

describe('Order of the Dragon token aliases', () => {
  it.each(['hre_ha_01', 'holy_roman_empire_ha_01', 'order_of_the_dragon', 'od'])(
    'maps %s to Order of the Dragon',
    (token) => {
      expect(civFromToken(token)).toBe('order_of_the_dragon')
    },
  )

  it('resolves the replay variant instead of generic HRE', () => {
    expect(resolveReplayCiv('hre_ha_01').slug).toBe('order_of_the_dragon')
    expect(resolveReplayCiv('od').slug).toBe('order_of_the_dragon')
  })
})
