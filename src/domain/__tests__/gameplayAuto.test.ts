import { describe, expect, it } from 'vitest'
import { gameplaySearchQuery, isGameplayAutoInput } from '../gameplayAuto'

describe('gameplay auto workflow input', () => {
  it('accepts public match identity and builds a focused search query', () => {
    const input = {
      gameId: '246556107',
      civilization: 'english',
      opponentCivilization: 'french',
      map: 'Highview',
      durationSec: 900,
    }
    expect(isGameplayAutoInput(input)).toBe(true)
    expect(gameplaySearchQuery(input)).toBe('Highview english french')
  })

  it('rejects custom identifiers and missing civilization', () => {
    expect(isGameplayAutoInput({ gameId: 'custom-1', civilization: 'english' })).toBe(false)
    expect(isGameplayAutoInput({ gameId: '246556107', civilization: '' })).toBe(false)
  })
})
