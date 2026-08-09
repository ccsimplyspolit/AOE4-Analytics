/** Small dependency-free matcher for build libraries and other local catalogs. */

function normalize(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

function isSubsequence(needle: string, haystack: string): boolean {
  let needleIndex = 0
  for (const character of haystack) {
    if (character === needle[needleIndex]) needleIndex += 1
    if (needleIndex === needle.length) return true
  }
  return needle.length === 0
}

/**
 * Matches every query token either as a normal substring or as a loose
 * subsequence. This keeps searches like `mace feudal` useful when a catalog
 * contains punctuation, accents, or longer labels such as Macedonian Dynasty.
 */
export function fuzzyMatches(text: string, query: string): boolean {
  const haystack = normalize(text)
  const tokens = normalize(query).split(' ').filter(Boolean)
  return tokens.every((token) => haystack.includes(token) || isSubsequence(token, haystack))
}

