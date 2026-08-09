import projectionJson from '../../data/research/essence/rgd-projection.json'
import { CIV_CODE_TO_SLUG } from './civs'
import { UNITS, type VendoredUnit } from './gameData'

export type EssenceRgdKind = 'unit' | 'building' | 'weapon'

export interface EssenceRgdRecord {
  path: string
  kind: EssenceRgdKind
  pbgName: string
  parentPbg: string
  nodeCount: number
  hitpoints?: number
  maxSpeed?: number
  classCode?: string | number
  costs?: Record<string, number>
  timeSeconds?: number
  armor?: number
  weaponRefs?: string[]
}

export interface EssenceRgdProjection {
  schemaVersion: number
  source: string
  sourceUrl: string
  sourceRevision: string | null
  capturedAt: string
  status: 'ready' | 'empty' | string
  inputName: string
  counts: {
    jsonFiles: number
    nodes: number
    records: number
    unit: number
    building: number
    weapon: number
    errors: number
  }
  policy: string
  records: EssenceRgdRecord[]
  errors: Array<{ path: string; error: string }>
}

/** Optional, reviewed local projection. AoE4World remains runtime game-data truth. */
export const ESSENCE_RGD_PROJECTION = projectionJson as EssenceRgdProjection

const RECORDS_BY_PBG = new Map<string, EssenceRgdRecord[]>()
for (const record of ESSENCE_RGD_PROJECTION.records) {
  const key = record.pbgName.trim().toLowerCase()
  if (!key) continue
  const rows = RECORDS_BY_PBG.get(key) ?? []
  rows.push(record)
  RECORDS_BY_PBG.set(key, rows)
}

export function essenceRgdRecords(kind?: EssenceRgdKind): EssenceRgdRecord[] {
  if (!kind) return ESSENCE_RGD_PROJECTION.records
  return ESSENCE_RGD_PROJECTION.records.filter((record) => record.kind === kind)
}

/** Return all local variants for a PBG name; variants are never silently merged. */
export function essenceRgdByPbg(pbgName: string): EssenceRgdRecord[] {
  const key = pbgName.trim().toLowerCase()
  return key ? [...(RECORDS_BY_PBG.get(key) ?? [])] : []
}

export function essenceRgdSearch(query: string, kind?: EssenceRgdKind): EssenceRgdRecord[] {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return []
  return essenceRgdRecords(kind).filter(
    (record) => record.pbgName.toLowerCase().includes(normalized) || record.path.includes(normalized),
  )
}

export type EssenceComparableField = 'hitpoints' | 'food' | 'wood' | 'gold' | 'stone' | 'time'

export interface EssenceAttributeDifference {
  field: EssenceComparableField
  aoe4world: number | null
  essence: number | null
  delta: number | null
}

export interface EssenceUnitComparison {
  unitId: string
  unitName: string
  matches: number
  /** The best deterministic candidate; variants remain visible through `matches`. */
  best: EssenceRgdRecord | null
  status: 'matched' | 'partial' | 'conflict' | 'missing'
  differences: EssenceAttributeDifference[]
}

export interface EssenceAttributeComparisonSummary {
  compared: number
  matched: number
  partial: number
  conflicts: number
  missing: number
  fieldConflicts: number
  projectionRecords: number
  projectionErrors: number
  sourceRevision: string | null
  rows: EssenceUnitComparison[]
}

const MATCH_STOPWORDS = new Set([
  'military',
  'human',
  'normal',
  'melee',
  'ranged',
  'land',
  'unit',
  'included',
  'find',
  'formational',
  'torch',
  'thrower',
  'annihilation',
  'condition',
])

const PBG_ALIASES: Record<string, string[]> = {
  batteringram: ['ram'],
  manatarms: ['manatarms'],
  menatarms: ['manatarms'],
  crossbowman: ['crossbow'],
  cavalryarcher: ['horsearcher'],
  camelarcher: ['camelarcher', 'camel'],
  grenadier: ['grenadier'],
  bombard: ['bombard'],
  mangonel: ['mangonel'],
  springald: ['springald'],
}

const RACE_CODE_ALIASES: Record<string, string[]> = {
  abbasid: ['ab'],
  ayyubid: ['ay'],
  byzantine: ['by', 'mac'],
  chinese: ['ch', 'jin', 'zx'],
  hre: ['hr', 'od'],
  english: ['en'],
  french: ['fr', 'je'],
  lancaster: ['hl'],
  japanese: ['ja', 'sen'],
  jin: ['jin'],
  malian: ['ma'],
  mongol: ['mo', 'gol'],
  ottoman: ['ot'],
  rus: ['ru'],
  templar: ['kt'],
  sultanate: ['de', 'tug'],
}

function normalizeAttributeToken(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

function unitMatchAliases(unit: VendoredUnit): string[] {
  const raw = [unit.id, unit.name, ...unit.classes]
  const aliases = new Set<string>()
  for (const value of raw) {
    const token = normalizeAttributeToken(value)
    if (token.length >= 4 && !MATCH_STOPWORDS.has(token)) aliases.add(token)
  }
  for (const alias of [...aliases]) {
    for (const extra of PBG_ALIASES[alias] ?? []) aliases.add(extra)
  }
  return [...aliases]
}

function recordMatchTokens(record: EssenceRgdRecord): string[] {
  const basename = record.path.split('/').pop()?.replace(/\.json$/i, '') ?? ''
  return [record.pbgName, record.parentPbg, basename]
    .map(normalizeAttributeToken)
    .filter((token) => token.length >= 4)
}

function raceMatchesUnit(record: EssenceRgdRecord, unit: VendoredUnit): boolean {
  const race = record.path.match(/\/races\/([^/]+)\//i)?.[1]
  if (!race || unit.civs.length === 0) return true
  const raceToken = normalizeAttributeToken(race)
  const raceStem = raceToken.split('ha')[0] ?? raceToken
  const raceCodes = Object.entries(RACE_CODE_ALIASES).find(([key]) => raceStem.includes(key))?.[1] ?? []
  return unit.civs.some((code) => {
    const slug = CIV_CODE_TO_SLUG[code]
    if (!slug) return false
    const slugToken = normalizeAttributeToken(slug)
    return (
      raceToken.includes(slugToken) ||
      slugToken.includes(raceStem) ||
      raceCodes.includes(code) ||
      raceToken.includes(normalizeAttributeToken(code))
    )
  })
}

function matchingRecords(unit: VendoredUnit): EssenceRgdRecord[] {
  const aliases = unitMatchAliases(unit)
  if (aliases.length === 0) return []
  const candidates = essenceRgdRecords('unit').filter((record) => {
    if (!raceMatchesUnit(record, unit)) return false
    return recordMatchTokens(record).some((candidate) =>
      aliases.some(
        (alias) =>
          candidate === alias ||
          (alias.length >= 6 && candidate.includes(alias)) ||
          (candidate.length >= 6 && alias.includes(candidate)),
      ),
    )
  })
  return candidates.sort((a, b) =>
    a.path.localeCompare(b.path) || a.pbgName.localeCompare(b.pbgName),
  )
}

function numericDifference(
  field: EssenceComparableField,
  aoe4world: number | null | undefined,
  essence: number | null | undefined,
): EssenceAttributeDifference | null {
  if (aoe4world == null || essence == null) return null
  return { field, aoe4world, essence, delta: essence - aoe4world }
}

function compareUnit(unit: VendoredUnit): EssenceUnitComparison {
  const matches = matchingRecords(unit)
  const best = matches[0] ?? null
  const differences = best
    ? ([
        numericDifference('hitpoints', unit.hitpoints, best.hitpoints),
        numericDifference('food', unit.costs?.food, best.costs?.food),
        numericDifference('wood', unit.costs?.wood, best.costs?.wood),
        numericDifference('gold', unit.costs?.gold, best.costs?.gold),
        numericDifference('stone', unit.costs?.stone, best.costs?.stone),
        numericDifference('time', unit.costs?.time, best.timeSeconds),
      ].filter(Boolean) as EssenceAttributeDifference[])
    : []
  const fieldConflicts = differences.filter((difference) => difference.delta !== 0).length
  return {
    unitId: unit.id,
    unitName: unit.name,
    matches: matches.length,
    best,
    status:
      matches.length === 0
        ? 'missing'
        : fieldConflicts > 0
          ? 'conflict'
          : matches.length > 1
            ? 'partial'
            : 'matched',
    differences,
  }
}

/**
 * Compare the bundled AoE4World combat snapshot with the optional local
 * Essence projection. This is a validation lens only: it never replaces the
 * patch-aware AoE4World snapshot and it never silently merges civ variants.
 */
export function compareEssenceAttributes(units: readonly VendoredUnit[] = UNITS): EssenceAttributeComparisonSummary {
  const rows = units.map(compareUnit)
  return {
    compared: rows.length,
    matched: rows.filter((row) => row.status === 'matched').length,
    partial: rows.filter((row) => row.status === 'partial').length,
    conflicts: rows.filter((row) => row.status === 'conflict').length,
    missing: rows.filter((row) => row.status === 'missing').length,
    fieldConflicts: rows.reduce(
      (total, row) => total + row.differences.filter((difference) => difference.delta !== 0).length,
      0,
    ),
    projectionRecords: ESSENCE_RGD_PROJECTION.counts.records,
    projectionErrors: ESSENCE_RGD_PROJECTION.counts.errors,
    sourceRevision: ESSENCE_RGD_PROJECTION.sourceRevision,
    rows,
  }
}
