import projectionJson from '../../data/research/essence/rgd-projection.json'

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
