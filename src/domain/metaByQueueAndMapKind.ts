/**
 * Dashboard meta slices: one ranked queue × one map kind (open / closed /
 * hybrid / naval), using the live August rotation plus the per-map advisor.
 */
import { CURRENT_RANKED_MAP_POOL } from './rankedMapPool'
import {
  lookupRankedMapAdvice,
  type MapStrategyAdvice,
} from './rankedMapAdvisor'

export type MetaQueueId = 'solo' | 'team_2v2' | 'team_3v3' | 'team_4v4'
export type RankedMapKind = 'open' | 'closed' | 'hybrid' | 'naval'

export const META_QUEUE_ORDER: readonly MetaQueueId[] = [
  'solo',
  'team_2v2',
  'team_3v3',
  'team_4v4',
]

export const MAP_KIND_ORDER: readonly RankedMapKind[] = ['open', 'closed', 'hybrid', 'naval']

export const META_QUEUE_LABEL: Record<MetaQueueId, string> = {
  solo: 'Ranked 1v1',
  team_2v2: 'Ranked 2v2',
  team_3v3: 'Ranked 3v3',
  team_4v4: 'Ranked 4v4',
}

export const MAP_KIND_LABEL: Record<RankedMapKind, string> = {
  open: 'Open maps',
  closed: 'Closed maps',
  hybrid: 'Hybrid maps',
  naval: 'Naval maps',
}

export interface MetaKindCiv {
  civ: string
  winRate: number
  note: string
}

export interface MetaKindSlice {
  kind: RankedMapKind
  maps: string[]
  civs: MetaKindCiv[]
}

export function mapsForMetaQueue(queue: MetaQueueId): readonly string[] {
  return queue === 'solo' ? CURRENT_RANKED_MAP_POOL.solo : CURRENT_RANKED_MAP_POOL.team
}

export function kindFromArchetype(archetype: MapStrategyAdvice['archetype']): RankedMapKind {
  if (archetype === 'wooded_choke') return 'closed'
  if (archetype === 'water_hybrid') return 'naval'
  if (archetype === 'gold_centric' || archetype === 'cliff_hybrid') return 'hybrid'
  return 'open'
}

export function rankedMapKind(mapName: string): RankedMapKind {
  const advice = lookupRankedMapAdvice(mapName)
  return kindFromArchetype(advice?.archetype ?? 'open_land')
}

export function metaSlicesForQueue(queue: MetaQueueId, civLimit = 3): MetaKindSlice[] {
  const grouped = new Map<RankedMapKind, string[]>()
  for (const map of mapsForMetaQueue(queue)) {
    const kind = rankedMapKind(map)
    const list = grouped.get(kind) ?? []
    list.push(map)
    grouped.set(kind, list)
  }
  return MAP_KIND_ORDER.flatMap((kind) => {
    const maps = grouped.get(kind)
    if (!maps?.length) return []
    return [{ kind, maps, civs: topCivsForMaps(maps, civLimit) }]
  })
}

function topCivsForMaps(maps: string[], limit: number): MetaKindCiv[] {
  const scores = new Map<string, { winRate: number; hits: number; note: string }>()
  for (const map of maps) {
    const advice = lookupRankedMapAdvice(map)
    if (!advice) continue
    for (const row of advice.topCivilizations) {
      const prev = scores.get(row.civ)
      if (!prev) {
        scores.set(row.civ, { winRate: row.winRate, hits: 1, note: row.keyAdvantage })
        continue
      }
      prev.hits += 1
      if (row.winRate > prev.winRate) {
        prev.winRate = row.winRate
        prev.note = row.keyAdvantage
      }
    }
  }
  return [...scores.entries()]
    .sort((a, b) => b[1].hits - a[1].hits || b[1].winRate - a[1].winRate)
    .slice(0, limit)
    .map(([civ, row]) => ({ civ, winRate: row.winRate, note: row.note }))
}
