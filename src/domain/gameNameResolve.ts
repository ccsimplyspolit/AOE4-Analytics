/** Normalize civ/map slugs and internal IDs to canonical English display labels for i18n lookup. */

import { CIV_CODE_TO_SLUG, CIV_SLUG_TO_CODE } from '@data/civs'
import { civDisplayName } from './civ'
import { prettyMapName } from './relic'

const CIV_SLUG_ALIASES: Record<string, string> = {
  hre: 'holy_roman_empire',
  zhu_xi_legacy: 'zhu_xis_legacy',
}

/** Civ slug or map slug → English label used as the translation dictionary key. */
export function resolveGameNameKey(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) return trimmed

  const fromCode = CIV_CODE_TO_SLUG[trimmed] ?? CIV_CODE_TO_SLUG[trimmed.toLowerCase()]
  if (fromCode) return civDisplayName(fromCode)

  const slugKey = trimmed.toLowerCase().replace(/\s+/g, '_')
  const fromAlias = CIV_SLUG_ALIASES[slugKey]
  if (fromAlias) return civDisplayName(fromAlias)
  if (CIV_SLUG_TO_CODE[trimmed]) return civDisplayName(trimmed)
  if (CIV_SLUG_TO_CODE[slugKey]) return civDisplayName(slugKey)

  // Relic / replay map ids: dry_arabia, land_megarandom, nagari, highwoods.
  if (/^[a-z][a-z0-9_]*$/.test(trimmed)) {
    return prettyMapName(trimmed)
  }

  return trimmed
}
