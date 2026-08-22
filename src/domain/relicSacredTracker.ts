/**
 * Sacred Sites & Relic Opportunity Tracker (pure domain logic).
 *
 * Analyzes relic acquisition and sacred site contestation for each player in the match.
 * Calculates monk production timings, delay between Castle Age and first monk,
 * estimated passive gold generated vs lost, and civilization-specific opportunities
 * (HRE/OOTD Regnitz, Delhi Feudal Sanctity, Rus Abbey of Trinity).
 */

import type { BuildEvent, PlayerSummary } from './statsSummary'
import { civFromToken } from './statsSummary'

export interface RelicSacredReport {
  playerId: number
  playerName: string | null
  civSlug: string | null
  age3Sec: number | null
  age2Sec: number | null
  relicsCaptured: number
  sacredCaptured: number
  sacredLost: number
  sacredNeutralized: number
  monasteryBuiltSec: number | null
  firstMonkSec: number | null
  monkDelayAfterAge3Sec: number | null
  monksProducedTotal: number
  estimatedPassiveGoldGained: number
  estimatedPassiveGoldLost: number
  performanceGrade: 'S' | 'A' | 'B' | 'C' | 'D'
  findings: string[]
  opportunities: string[]
  warnings: string[]
}

export function isReligiousUnit(event: BuildEvent): boolean {
  if (event.category !== 'unit') return false
  const bp = (event.blueprint || '').toLowerCase()
  const name = (event.name || '').toLowerCase()
  return (
    bp.includes('monk') ||
    bp.includes('prelate') ||
    bp.includes('scholar') ||
    bp.includes('shaman') ||
    bp.includes('dervish') ||
    bp.includes('imam') ||
    bp.includes('bishop') ||
    name.includes('monk') ||
    name.includes('prelate') ||
    name.includes('scholar') ||
    name.includes('shaman') ||
    name.includes('dervish') ||
    name.includes('imam') ||
    name.includes('bishop')
  )
}

export function isReligiousBuilding(event: BuildEvent): boolean {
  if (event.category !== 'building') return false
  const bp = (event.blueprint || '').toLowerCase()
  const name = (event.name || '').toLowerCase()
  return (
    bp.includes('monastery') ||
    bp.includes('mosque') ||
    bp.includes('pagoda') ||
    bp.includes('regnitz') ||
    bp.includes('trinity') ||
    bp.includes('dome_of_the_faith') ||
    bp.includes('winery') ||
    name.includes('monastery') ||
    name.includes('mosque') ||
    name.includes('pagoda') ||
    name.includes('regnitz') ||
    name.includes('trinity') ||
    name.includes('winery')
  )
}

/** Base gold rate per relic in standard civilization (approx 80 gold/min). */
const STANDARD_RELIC_GPM = 80
/** Regnitz Cathedral gold rate per relic (160 gold/min up to 3 relics). */
const REGNITZ_RELIC_GPM = 160
/** Passive gold rate per sacred site (approx 100 gold/min). */
const SACRED_SITE_GPM = 100

/**
 * Analyzes Sacred Site and Relic performance for a given player summary and event stream.
 */
export function analyzeRelicSacredPerformance(
  player: PlayerSummary,
  events: BuildEvent[] = [],
  matchDurationSec = 0,
): RelicSacredReport {
  const pId = player.playerId
  const civ = (civFromToken(player.civToken) || player.civToken || '').toLowerCase()
  const age3Sec = player.totals?.age3Sec ?? null
  const age2Sec = player.totals?.age2Sec ?? null
  const relics = Math.max(0, player.totals?.relicsCaptured ?? 0)
  const sacredCaptured = Math.max(0, player.totals?.sacredCaptured ?? 0)
  const sacredLost = Math.max(0, player.totals?.sacredLost ?? 0)
  const sacredNeutralized = Math.max(0, player.totals?.sacredNeutralized ?? 0)

  // Filter events for this player
  const playerEvents = events.filter((e) => e.playerId === pId)

  // Find first monastery / religious building
  const religiousBuildings = playerEvents.filter(isReligiousBuilding)
  const monasteryBuiltSec = religiousBuildings.length > 0 ? Math.min(...religiousBuildings.map((b) => b.timeSec)) : null

  // Find monks produced
  const monkEvents = playerEvents.filter(isReligiousUnit)
  const monksProducedTotal = monkEvents.length
  const firstMonkSec = monkEvents.length > 0 ? Math.min(...monkEvents.map((m) => m.timeSec)) : null

  // Calculate delay after reaching Castle Age
  let monkDelayAfterAge3Sec: number | null = null
  if (age3Sec != null && age3Sec > 0) {
    if (firstMonkSec != null) {
      monkDelayAfterAge3Sec = Math.max(0, firstMonkSec - age3Sec)
    } else {
      // Reached Castle Age but never trained a religious unit
      monkDelayAfterAge3Sec = Math.max(0, matchDurationSec - age3Sec)
    }
  }

  // Determine civ multiplier
  const isHreOrOotd = civ.includes('hre') || civ.includes('holy_roman') || civ.includes('dragon')
  const isDelhi = civ.includes('delhi') || civ.includes('sultanate')
  const isRus = civ.includes('rus')
  const relicGpm = isHreOrOotd ? REGNITZ_RELIC_GPM : STANDARD_RELIC_GPM

  // Estimate passive gold generated from relics and sacred sites
  // Relics are typically gathered around (firstMonkSec + 60s) or (age3Sec + 120s)
  let estimatedPassiveGoldGained = 0
  if (relics > 0 && age3Sec != null && matchDurationSec > age3Sec) {
    const estimatedPickupSec = firstMonkSec != null ? firstMonkSec + 45 : age3Sec + 90
    const holdingSec = Math.max(0, matchDurationSec - estimatedPickupSec)
    estimatedPassiveGoldGained += Math.round((holdingSec / 60) * relics * relicGpm)
  }

  // Sacred site gold
  if (sacredCaptured > 0) {
    const sacredStartSec = isDelhi && age2Sec != null ? age2Sec + 60 : 600
    const sacredHoldingSec = Math.max(0, matchDurationSec - sacredStartSec)
    estimatedPassiveGoldGained += Math.round((sacredHoldingSec / 60) * sacredCaptured * SACRED_SITE_GPM * 0.75)
  }

  // Estimate missed opportunity (passive gold lost)
  let estimatedPassiveGoldLost = 0
  const findings: string[] = []
  const opportunities: string[] = []
  const warnings: string[] = []

  // Analyze Relic acquisition efficiency
  if (age3Sec != null && matchDurationSec > age3Sec + 180) {
    const castleDurationMin = (matchDurationSec - age3Sec) / 60

    if (relics === 0) {
      const lostGold = Math.round(castleDurationMin * 2 * relicGpm)
      estimatedPassiveGoldLost += lostGold
      warnings.push(
        isHreOrOotd
          ? `0 Relics secured as HRE/OOTD. Missed ~${lostGold} gold from Regnitz/Cathedral potential.`
          : `0 Relics secured despite reaching Castle Age. Missed ~${lostGold} passive gold.`,
      )
    } else if (relics === 1 && isHreOrOotd) {
      const lostGold = Math.round(castleDurationMin * 2 * relicGpm)
      estimatedPassiveGoldLost += lostGold
      warnings.push(`Only 1 Relic secured with HRE/OOTD. Regnitz caps at 3 relics (+480 gold/min).`)
    } else if (relics >= 3) {
      findings.push(`Excellent relic control: ${relics} relics secured (~+${relics * relicGpm} gold/min).`)
    }

    if (monkDelayAfterAge3Sec != null && monkDelayAfterAge3Sec > 150 && relics < 3) {
      const delayMin = Math.round(monkDelayAfterAge3Sec / 60)
      opportunities.push(
        `Religious unit delayed by ${delayMin}m after Castle Age. Queue a monk during the age-up transition to contest relics before opponents.`,
      )
    }
  }

  // Analyze Sacred Sites
  if (isDelhi) {
    if (sacredCaptured === 0 && matchDurationSec > 420) {
      const lostGold = Math.round(((matchDurationSec - 360) / 60) * 2 * SACRED_SITE_GPM)
      estimatedPassiveGoldLost += lostGold
      warnings.push(`Delhi Feudal Sanctity unused: 0 Sacred Sites captured. Missed ~${lostGold} early passive gold.`)
    } else if (sacredCaptured >= 2) {
      findings.push(`Dominant Delhi sacred site pressure: ${sacredCaptured} sites held.`)
    }
  } else {
    if (sacredCaptured > 0) {
      findings.push(`Controlled ${sacredCaptured} Sacred Sites for map dominance and victory pressure.`)
    }
    if (sacredNeutralized > 0) {
      findings.push(`Neutralized ${sacredNeutralized} enemy Sacred Sites to deny opponent victory clock.`)
    }
  }

  if (isRus && relics >= 2) {
    findings.push(`Rus Warrior Monks successfully collected ${relics} relics with Saint's Blessing combat buffs.`)
  }

  // Calculate performance grade
  let performanceGrade: 'S' | 'A' | 'B' | 'C' | 'D'
  if (age3Sec == null) {
    performanceGrade = sacredCaptured > 0 ? 'A' : 'B'
  } else if (relics >= 3 || (isDelhi && sacredCaptured >= 2)) {
    performanceGrade = 'S'
  } else if (relics >= 2 || sacredCaptured >= 1) {
    performanceGrade = 'A'
  } else if (relics === 1) {
    performanceGrade = 'B'
  } else if (relics === 0 && monkDelayAfterAge3Sec != null && monkDelayAfterAge3Sec > 240) {
    performanceGrade = 'D'
  } else {
    performanceGrade = 'C'
  }

  return {
    playerId: pId,
    playerName: player.name,
    civSlug: civ || null,
    age3Sec,
    age2Sec,
    relicsCaptured: relics,
    sacredCaptured,
    sacredLost,
    sacredNeutralized,
    monasteryBuiltSec,
    firstMonkSec,
    monkDelayAfterAge3Sec,
    monksProducedTotal,
    estimatedPassiveGoldGained,
    estimatedPassiveGoldLost,
    performanceGrade,
    findings,
    opportunities,
    warnings,
  }
}
