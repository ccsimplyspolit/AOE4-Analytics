import { resolveAoE4Icon } from '@data/vendor/aoe4-icons/manifest'

/** Text fallback for the resource line when an asset is unavailable. */
export const RES_GLYPH = {
  food: '🍖',
  wood: '🪵',
  gold: '🪙',
  stone: '🪨',
  builder: '🔨',
  villager: '👤',
  pop: '🏠',
} as const

/** Native game icons extracted from UIArt.sga, with a text fallback kept for tests/old bundles. */
export const RES_ICON = {
  food: resolveAoE4Icon('resource/resource_food'),
  wood: resolveAoE4Icon('resource/resource_wood'),
  gold: resolveAoE4Icon('resource/resource_gold'),
  stone: resolveAoE4Icon('resource/resource_stone'),
  builder: resolveAoE4Icon('resource/resource_villager'),
  villager: resolveAoE4Icon('resource/resource_villager'),
  pop: resolveAoE4Icon('resource/popcap'),
} as const

/** Age number → roman numeral chip label (stands in for age_1..4.webp). */
export const AGE_ROMAN: Record<number, string> = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV' }
export const AGE_ICON: Record<number, string | null> = {
  1: resolveAoE4Icon('age/age_1'),
  2: resolveAoE4Icon('age/age_2'),
  3: resolveAoE4Icon('age/age_3'),
  4: resolveAoE4Icon('age/age_4'),
}

export const TIME_GLYPH = '⏱'

/** Resolves any imported RTS_Overlay @icon@ token to a local asset URL. */
export function noteTokenIcon(path: string): string | null {
  return resolveAoE4Icon(path)
}

/** Maps an RTS_Overlay note image token (e.g. `resource/resource_wood.webp`) to a glyph. */
export function noteTokenGlyph(path: string): string | null {
  const p = path.toLowerCase()
  if (p.includes('food')) return RES_GLYPH.food
  if (p.includes('wood')) return RES_GLYPH.wood
  if (p.includes('gold')) return RES_GLYPH.gold
  if (p.includes('stone')) return RES_GLYPH.stone
  if (p.includes('villager') || p.includes('worker')) return RES_GLYPH.villager
  if (p.includes('house') || p.includes('population')) return RES_GLYPH.pop
  return null
}
