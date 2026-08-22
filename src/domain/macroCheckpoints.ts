import type { BuildOrder, BuildStep } from './buildOrderSchema'
import { parseDuration } from './format'

export interface MacroCheckpoint {
  id: string
  title: string
  detail: string
  timeSec: number
  category: 'scouting' | 'age' | 'map_control' | 'economy' | 'army'
  priority?: 'high' | 'normal'
}

/** Standard AoE4 competitive benchmark milestones. */
export const STANDARD_MACRO_CHECKPOINTS: readonly MacroCheckpoint[] = [
  {
    id: 'scout_opening',
    title: 'Initial Scouting',
    detail: 'Collect starting sheep and identify enemy base direction',
    timeSec: 75, // 1:15
    category: 'scouting',
  },
  {
    id: 'scout_gold',
    title: 'Scout Enemy Gold & Wood',
    detail: 'Check opponent gold mining: Fast Castle, 2TC or Feudal aggression',
    timeSec: 150, // 2:30
    category: 'scouting',
    priority: 'high',
  },
  {
    id: 'feudal_timing',
    title: 'Feudal Transition Check',
    detail: 'Landmark should begin or finish; scout military production buildings',
    timeSec: 255, // 4:15
    category: 'age',
    priority: 'high',
  },
  {
    id: 'sacred_relics',
    title: 'Sacred Sites & Relics Prep',
    detail: 'Prepare monastery and monks; sacred sites unlock at 10:00',
    timeSec: 420, // 7:00
    category: 'map_control',
    priority: 'high',
  },
  {
    id: 'sacred_sites_active',
    title: 'Sacred Sites Activated',
    detail: 'Sacred sites are now capturable! Contest or secure victory timer',
    timeSec: 600, // 10:00
    category: 'map_control',
    priority: 'high',
  },
  {
    id: 'neutral_resources',
    title: 'Neutral Resource Control',
    detail: 'Check safe deer packs, boars, and outer gold/stone veins',
    timeSec: 780, // 13:00
    category: 'map_control',
  },
] as const

/** Civilization-specific sacred site and relic milestones. */
export function getCivSpecialCheckpoints(civ: string | null | undefined): MacroCheckpoint[] {
  if (!civ) return []
  const c = civ.toLowerCase()

  if (c.includes('delhi') || c.includes('sultanate')) {
    return [
      {
        id: 'delhi_sanctity',
        title: 'Delhi Sanctity & Sacred Sites',
        detail: 'Capture sacred sites now with Scholars for +300 gold/min and vision',
        timeSec: 285, // 4:45
        category: 'map_control',
        priority: 'high',
      },
    ]
  }

  if (c.includes('hre') || c.includes('holy_roman') || c.includes('dragon') || c.includes('od')) {
    return [
      {
        id: 'hre_relic_rush',
        title: 'HRE 3-Relic Regnitz Priority',
        detail: 'Produce Prelates immediately to claim 3 relics (+480 gold/min passive gold)',
        timeSec: 480, // 8:00
        category: 'map_control',
        priority: 'high',
      },
    ]
  }

  if (c.includes('rus')) {
    return [
      {
        id: 'rus_warrior_monks',
        title: 'Rus Warrior Monk Relic Hunt',
        detail: 'Deploy mounted Warrior Monks to grab contested relics and gain combat aura',
        timeSec: 510, // 8:30
        category: 'map_control',
        priority: 'high',
      },
    ]
  }

  return []
}

/**
 * Extracts build-order specific milestone checkpoints from an active BuildOrder.
 */
export function extractBuildOrderCheckpoints(bo: BuildOrder | null | undefined): MacroCheckpoint[] {
  if (!bo || !Array.isArray(bo.build_order)) return []

  const checkpoints: MacroCheckpoint[] = []
  let lastAge = 1

  bo.build_order.forEach((step: BuildStep, index: number) => {
    if (step.age > lastAge && step.time) {
      const sec = parseDuration(step.time)
      if (sec != null && sec > 0) {
        const ageName = step.age === 2 ? 'Feudal Age' : step.age === 3 ? 'Castle Age' : 'Imperial Age'
        checkpoints.push({
          id: `bo_age_${step.age}_${index}`,
          title: `Build Target: ${ageName}`,
          detail: step.notes?.[0] || `${step.villager_count} villagers target`,
          timeSec: sec,
          category: 'age',
          priority: 'high',
        })
        lastAge = step.age
      }
    }
  })

  return checkpoints
}

/**
 * Resolves all active match timing checkpoints combining standard benchmarks,
 * civ-specific relic/sacred milestones, and active build milestones.
 */
export function resolveActiveCheckpoints(
  bo?: BuildOrder | null,
  includeStandard = true,
  civ?: string | null,
): MacroCheckpoint[] {
  const list: MacroCheckpoint[] = []

  if (includeStandard) {
    list.push(...STANDARD_MACRO_CHECKPOINTS)
    if (civ) {
      list.push(...getCivSpecialCheckpoints(civ))
    }
  }

  if (bo) {
    list.push(...extractBuildOrderCheckpoints(bo))
  }

  // Deduplicate and sort by time
  const map = new Map<string, MacroCheckpoint>()
  for (const item of list) {
    map.set(item.id, item)
  }

  return Array.from(map.values()).sort((a, b) => a.timeSec - b.timeSec)
}

/**
 * Gets the next upcoming checkpoint given elapsed time.
 */
export function getUpcomingCheckpoint(
  checkpoints: MacroCheckpoint[],
  elapsedSec: number,
  leadSec = 90,
): { checkpoint: MacroCheckpoint; remainingSec: number } | null {
  for (const cp of checkpoints) {
    const diff = cp.timeSec - elapsedSec
    // Visible within lead window and stays active for 15s after timing passes
    if (diff > -15 && diff <= leadSec) {
      return { checkpoint: cp, remainingSec: Math.max(0, diff) }
    }
  }
  return null
}
