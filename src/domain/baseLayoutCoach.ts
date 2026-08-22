/**
 * Pure domain logic for base layout, defensive structure coverage,
 * drop-off placement efficiency, and macro/micro SimCity analysis.
 */

import type { BuildEvent, PlayerSummary } from './statsSummary'
import { civFromToken } from './statsSummary'

export interface BaseLayoutReport {
  playerId: number
  /** Overall base and defense rating: S, A, B, C, D */
  grade: 'S' | 'A' | 'B' | 'C' | 'D'
  /** Total defensive buildings constructed (outposts, stone walls, keeps, wooden fortresses, etc.) */
  defensiveStructuresCount: number
  /** Total military production buildings (barracks, archery ranges, stables, siege workshops) */
  militaryProductionBuildingsCount: number
  /** Total economic drop-off buildings (mills, lumber camps, mining camps, ger, hunting cabins) */
  dropOffBuildingsCount: number
  /** First defensive building timestamp in seconds */
  firstDefenseSec: number | null
  /** First military production building timestamp in seconds */
  firstMilitaryBuildingSec: number | null
  /** First economic drop-off building timestamp in seconds */
  firstDropOffSec: number | null
  /** Ratio of static defensive investment vs total building count [0..1] */
  defenseRatio: number
  /** Whether defensive/booming playstyle was detected */
  defensivePlaystyleDetected: boolean
  /** Specific defensive deficit and placement gap warnings */
  defensiveGaps: string[]
  /** Actionable coaching findings */
  findings: string[]
  /** Critical warnings regarding exposed resources or defensive gaps */
  warnings: string[]
  /** Macro & Micro bottlenecks (e.g. floating resources with insufficient production buildings) */
  bottlenecks: string[]
  /** SimCity & Building Placement Advice (TC radius, aura connections, defensive funnels) */
  simCityTips: string[]
}

const DEFENSIVE_KEYWORDS = [
  'outpost',
  'tower',
  'keep',
  'wall',
  'gate',
  'fortress',
  'donjon',
  'kremlin',
  'berkshire',
  'red_palace',
  'spasskaya',
  'saharan_caravanserai',
  'elzbach',
]

const MILITARY_PRODUCTION_KEYWORDS = [
  'barracks',
  'archery_range',
  'stable',
  'siege_workshop',
  'military_school',
  'war_camp',
  'dock',
  'castle',
]

const DROP_OFF_KEYWORDS = [
  'mill',
  'lumber_camp',
  'mining_camp',
  'ger',
  'hunting_cabin',
  'pasture',
]

export function isDefensiveStructure(event: BuildEvent): boolean {
  if (event.category !== 'building') return false
  const bp = (event.blueprint || '').toLowerCase()
  const name = (event.name || '').toLowerCase()
  return DEFENSIVE_KEYWORDS.some((kw) => bp.includes(kw) || name.includes(kw))
}

export function isMilitaryProductionBuilding(event: BuildEvent): boolean {
  if (event.category !== 'building') return false
  const bp = (event.blueprint || '').toLowerCase()
  const name = (event.name || '').toLowerCase()
  return MILITARY_PRODUCTION_KEYWORDS.some((kw) => bp.includes(kw) || name.includes(kw))
}

export function isDropOffBuilding(event: BuildEvent): boolean {
  if (event.category !== 'building') return false
  const bp = (event.blueprint || '').toLowerCase()
  const name = (event.name || '').toLowerCase()
  return DROP_OFF_KEYWORDS.some((kw) => bp.includes(kw) || name.includes(kw))
}

export function analyzeBaseLayout(
  player: PlayerSummary,
  events: BuildEvent[] = [],
  matchDurationSec = 0,
): BaseLayoutReport {
  const pId = player.playerId
  const civ = (civFromToken(player.civToken) || player.civToken || '').toLowerCase()
  const playerEvents = events.filter((e) => e.playerId === pId)

  const defensiveBuildings = playerEvents.filter(isDefensiveStructure)
  const militaryBuildings = playerEvents.filter(isMilitaryProductionBuilding)
  const dropOffBuildings = playerEvents.filter(isDropOffBuilding)
  const allBuildings = playerEvents.filter((e) => e.category === 'building')

  const defensiveCount = defensiveBuildings.length
  const militaryCount = militaryBuildings.length
  const dropOffCount = dropOffBuildings.length
  const totalBuildings = allBuildings.length

  const firstDefenseSec = defensiveBuildings.length > 0 ? defensiveBuildings[0]!.timeSec : null
  const firstMilitarySec = militaryBuildings.length > 0 ? militaryBuildings[0]!.timeSec : null
  const firstDropOffSec = dropOffBuildings.length > 0 ? dropOffBuildings[0]!.timeSec : null

  const defenseRatio = totalBuildings > 0 ? defensiveCount / totalBuildings : 0

  const findings: string[] = []
  const warnings: string[] = []
  const bottlenecks: string[] = []

  const age2Sec = player.totals?.age2Sec ?? null
  const age3Sec = player.totals?.age3Sec ?? null
  const resourcesSpent = player.totals?.resourcesSpent
  const resourcesGathered = player.totals?.resourcesGathered
  const largestArmy = player.totals?.largestArmy ?? 0
  const buildingsLost = player.totals?.buildingsLost ?? 0

  // 1. Check defensive investment under pressure
  const unitsProduced = player.totals?.unitsProduced ?? 0
  const isFastCastleOrEco = age3Sec != null && (age3Sec - (age2Sec ?? 0) <= 300)
  const defensivePlaystyleDetected =
    (unitsProduced < 15 && matchDurationSec >= 540) ||
    isFastCastleOrEco ||
    civ.includes('byzantines') ||
    civ.includes('hre') ||
    civ.includes('chinese') ||
    civ.includes('abbasid')

  const defensiveGaps: string[] = []

  if (defensivePlaystyleDetected) {
    if (defensiveCount === 0 && matchDurationSec > 480) {
      defensiveGaps.push(
        'Critical Defense Deficit: You played a defensive/booming style with minimal early army, but built 0 Outposts or Walls. Your outer villagers on Gold/Berries/Deer were completely exposed to raids.',
      )
      warnings.push(
        'Fast Castle / 2 TC greed detected without defensive outposts or walls. Vulnerable to early Feudal cavalry/archer raids.',
      )
    } else if (defensiveCount === 1 && matchDurationSec > 720) {
      defensiveGaps.push(
        'Insufficient Flank Protection: Only 1 defensive structure built in a 12+ min defensive game. Exposed secondary resources and woodlines remained vulnerable.',
      )
    }

    if (firstDefenseSec != null && firstDefenseSec > 450) {
      defensiveGaps.push(
        `Late Defensive Reaction: First outpost was started late at ${Math.floor(firstDefenseSec / 60)}:${String(firstDefenseSec % 60).padStart(2, '0')}. In defensive builds, key outposts on exposed mineral nodes should be placed preemptively before enemy cavalry arrives.`,
      )
    }
  } else if (defensiveCount > 0) {
    findings.push(
      `Constructed ${defensiveCount} defensive structure${defensiveCount > 1 ? 's' : ''} covering key perimeter resources.`,
    )
  }

  // 2. Check early drop-off infrastructure
  if (firstDropOffSec != null && firstDropOffSec > 90 && civ !== 'abbasid' && civ !== 'ayyubids') {
    warnings.push(
      `First resource drop-off was delayed (${Math.floor(firstDropOffSec / 60)}:${String(firstDropOffSec % 60).padStart(2, '0')}). Villagers lost gathering efficiency due to long walking distances.`,
    )
  } else if (dropOffCount >= 3) {
    findings.push(`Solid drop-off infrastructure with ${dropOffCount} resource camps established.`)
  }

  // 3. Macro bottlenecks: Production building capacity vs Banked resources
  const totalGathered =
    (resourcesGathered?.food ?? 0) +
    (resourcesGathered?.wood ?? 0) +
    (resourcesGathered?.gold ?? 0) +
    (resourcesGathered?.stone ?? 0)
  const totalSpent =
    (resourcesSpent?.food ?? 0) +
    (resourcesSpent?.wood ?? 0) +
    (resourcesSpent?.gold ?? 0) +
    (resourcesSpent?.stone ?? 0)
  const unspentRes = Math.max(0, totalGathered - totalSpent)

  if (unspentRes > 2000 && militaryCount < 4 && matchDurationSec > 720) {
    bottlenecks.push(
      `Production bottleneck: accumulated ~${unspentRes} unspent resources with only ${militaryCount} military production buildings. Add 3-5 more Barracks/Ranges/Stables to convert bank into army.`,
    )
  }

  if (matchDurationSec > 900 && militaryCount >= 6) {
    findings.push(`Robust military industrial base with ${militaryCount} production facilities.`)
  }

  if (buildingsLost >= 4 && defensiveCount === 0) {
    warnings.push(
      `Suffered heavy base raid damage (${buildingsLost} buildings lost) due to lack of perimeter walls or defensive towers.`,
    )
  }

  // 4. SimCity & Radius Placement Guidance
  const simCityTips: string[] = []

  // Universal Town Center Umbrella check
  simCityTips.push(
    'TC Defensive Umbrella: First 8-12 farms must be placed adjacent to the Town Center under arrow protection. Building farms beyond TC radius without an Outpost makes villagers easy raid targets.',
  )

  if (civ.includes('hre') || civ.includes('holy_roman') || civ.includes('order')) {
    simCityTips.push(
      'HRE Aachen & Repair Radius: Pack lumber camps, farms, and production tightly within Aachen Chapel radius (+40% gather rate) and Town Center Emergency Repairs range.',
    )
  } else if (civ.includes('byzantines')) {
    simCityTips.push(
      'Byzantine Cistern Network: Connect all production facilities and drop-offs to Cistern water aqueducts to maintain the +10%/+20%/+30% gather and train speed aura.',
    )
  } else if (civ.includes('abbasid') || civ.includes('ayyubids')) {
    simCityTips.push(
      'House of Wisdom Connection: Connect every house and production building via street network to the House of Wisdom to achieve Golden Age Tiers 1-3.',
    )
  } else if (civ.includes('english')) {
    simCityTips.push(
      'English Network of Castles: Extend Outposts near forward Barracks/Archery Ranges so your army always fights under the +15-20% Network of Castles attack speed aura.',
    )
  } else if (civ.includes('chinese') || civ.includes('zhu_xi')) {
    simCityTips.push(
      'Imperial Tax & Supervise Hub: Cluster military production tightly around the Imperial Academy/Town Center so Officials minimize walk distance during tax collection.',
    )
  } else if (civ.includes('malians')) {
    simCityTips.push(
      'Malian Pit Mine SimCity: Encircle each active Pit Mine with exactly 3-4 Houses and Mining Camps to maximize passive gold generation.',
    )
  } else if (civ.includes('ottomans')) {
    simCityTips.push(
      'Ottoman Blacksmith Aura: Position Military Schools and Barracks touching Blacksmiths to receive maximum production speed discounts.',
    )
  }

  // Calculate grade
  let grade: 'S' | 'A' | 'B' | 'C' | 'D' = 'B'
  if (buildingsLost === 0 && (defensiveCount >= 2 || largestArmy >= 30) && bottlenecks.length === 0) {
    grade = 'S'
  } else if (buildingsLost <= 1 && bottlenecks.length === 0) {
    grade = 'A'
  } else if (warnings.length > 0 && bottlenecks.length > 0) {
    grade = 'D'
  } else if (warnings.length > 0 || buildingsLost >= 3) {
    grade = 'C'
  }

  return {
    playerId: pId,
    grade,
    defensiveStructuresCount: defensiveCount,
    militaryProductionBuildingsCount: militaryCount,
    dropOffBuildingsCount: dropOffCount,
    firstDefenseSec,
    firstMilitaryBuildingSec: firstMilitarySec,
    firstDropOffSec,
    defenseRatio,
    defensivePlaystyleDetected,
    defensiveGaps,
    findings,
    warnings,
    bottlenecks,
    simCityTips,
  }
}
