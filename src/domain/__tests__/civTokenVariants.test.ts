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
