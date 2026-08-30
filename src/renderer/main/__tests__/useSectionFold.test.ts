import { describe, expect, it } from 'vitest'
import { parseFoldFlag } from '../hooks/useSectionFold'

describe('parseFoldFlag', () => {
  it('reads 1 as collapsed and 0 as expanded', () => {
    expect(parseFoldFlag('1', false)).toBe(true)
    expect(parseFoldFlag('0', true)).toBe(false)
    expect(parseFoldFlag(null, false)).toBe(false)
    expect(parseFoldFlag('nope', true)).toBe(true)
  })
})
