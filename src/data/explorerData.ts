import explorerJson from './vendor/aoe4world-data/explorer.json'

export type ExplorerRecordKind = 'building' | 'technology' | 'upgrade'

export interface ExplorerCosts {
  food: number
  wood: number
  gold: number
  stone: number
  total: number
  popcap: number
  time: number
}

export interface ExplorerRecord {
  id: string
  name: string
  kind: ExplorerRecordKind
  displayClasses: string[]
  classes: string[]
  minAge: number
  civs: string[]
  unique: boolean
  icon: string | null
  description: string
  costs: ExplorerCosts | null
  producedBy: string[]
  hitpoints: number | null
}

/** Compact buildings, technologies and upgrades projection from aoe4world/data. */
export const EXPLORER_RECORDS = explorerJson as ExplorerRecord[]

export const EXPLORER_RECORDS_BY_KIND: Record<ExplorerRecordKind, ExplorerRecord[]> = {
  building: EXPLORER_RECORDS.filter((record) => record.kind === 'building'),
  technology: EXPLORER_RECORDS.filter((record) => record.kind === 'technology'),
  upgrade: EXPLORER_RECORDS.filter((record) => record.kind === 'upgrade'),
}
