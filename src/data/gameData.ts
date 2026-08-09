import unitsJson from './vendor/aoe4world-data/units.json'
import essenceProvenanceJson from './vendor/aoe4world-data/essence-provenance.json'
import { civCode } from './civs'

/** Provenance for the versioned snapshot consumed by Production Calculator. */
export const GAME_DATA_SOURCE = 'aoe4world/data'
export const GAME_DATA_COMMIT = 'b2cd38222deae40ba2db18171edf494f81410c69'
export const GAME_DATA_CAPTURED_AT = '2026-08-08T19:51:51Z'
export const GAME_DATA_VERSION = `${GAME_DATA_SOURCE}@${GAME_DATA_COMMIT.slice(0, 12)}`

export interface EssenceProvenance {
  schemaVersion: number
  source: string
  sourceUrl: string
  sourceRevision: string | null
  capturedAt: string | null
  status: 'not-run' | 'ready' | 'dry-run' | 'decoded' | 'inventoried' | 'unavailable' | string
  input: {
    path: string | null
    kind: string | null
    name?: string | null
    bytes?: number | null
    effectivePath?: string
  }
  counts: Record<string, number>
  actions: string[]
  projection?: {
    status?: string
    sourceRevision?: string | null
    counts?: Record<string, number>
    path?: string
  } | null
}

/** Optional local-game snapshot provenance produced by AOEMods.Essence. */
export const ESSENCE_PROVENANCE = essenceProvenanceJson as EssenceProvenance

export interface VendoredUnit {
  id: string
  name: string
  displayClasses: string[]
  classes: string[]
  minAge: number
  civs: string[]
  unique: boolean
  icon: string | null
  hitpoints: number | null
  costs: {
    food: number
    wood: number
    gold: number
    stone: number
    total: number
    popcap: number
    time: number
  } | null
  attack: { type: string; damage: number } | null
  /** Optional detailed weapon projection added by the source synchronizer. */
  weapons?: VendoredWeapon[]
  movementSpeed?: number | null
  armor: { melee: number; ranged: number }
  producedBy: string[]
}

export interface VendoredWeaponModifier {
  value: number
  groups: string[][]
}

export interface VendoredWeapon {
  name: string
  type: string
  damage: number
  speed: number
  range: number
  modifiers: VendoredWeaponModifier[]
}

/** All vendored combat units (slim, from aoe4world/data — see vendor/SOURCE.md). */
export const UNITS: VendoredUnit[] = unitsJson as VendoredUnit[]

const BY_ID = new Map(UNITS.map((u) => [u.id, u]))

export function unitById(id: string): VendoredUnit | undefined {
  return BY_ID.get(id)
}

/** Units available to a civ (by slug), age-sorted. */
export function unitsForCiv(slug: string): VendoredUnit[] {
  const code = civCode(slug)
  if (!code) return []
  return UNITS.filter((u) => u.civs.includes(code)).sort(
    (a, b) => a.minAge - b.minAge || a.name.localeCompare(b.name),
  )
}
