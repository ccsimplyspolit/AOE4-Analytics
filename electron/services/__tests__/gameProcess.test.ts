import { describe, expect, it } from 'vitest'
import { isKnownGameProcess } from '../gameProcess'

describe('AoE4 process detection', () => {
  it('recognizes Steam and Store/Xbox executable names', () => {
    expect(isKnownGameProcess('RelicCardinal.exe')).toBe(true)
    expect(isKnownGameProcess('reliccardinal_ws')).toBe(true)
  })

  it('does not treat unrelated processes as AoE4', () => {
    expect(isKnownGameProcess('steam.exe')).toBe(false)
    expect(isKnownGameProcess('CardinalHelper.exe')).toBe(false)
  })
})
