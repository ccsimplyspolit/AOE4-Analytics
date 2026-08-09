import { describe, expect, it } from 'vitest'
import { fuzzyMatches } from '../fuzzySearch'

describe('fuzzyMatches', () => {
  it('matches all query tokens across punctuation and accents', () => {
    expect(fuzzyMatches("Jeanne d'Arc — Feudal pressure", 'jean feudal')).toBe(true)
    expect(fuzzyMatches("Jeanne d'Arc — Feudal pressure", 'jean castle')).toBe(false)
  })

  it('allows loose subsequence searches used by overlay build libraries', () => {
    expect(fuzzyMatches('Macedonian Dynasty 2TC pressure', 'mace dyn')).toBe(true)
    expect(fuzzyMatches('English longbow opening', 'enlg')).toBe(true)
  })

  it('treats an empty query as a match', () => {
    expect(fuzzyMatches('anything', '')).toBe(true)
  })
})

