import type { PerPlayerMatchStats } from './analysis'
import {
  civFromToken,
  type BuildEvent,
  type MatchSummary,
  type PlayerSummary,
} from './statsSummary'

export interface MatchReviewPlayer {
  player: PlayerSummary
  perPlayer: PerPlayerMatchStats | null
  gathered: number | null
  spent: number | null
  conversionPct: number | null
  lastBank: number | null
  lastBankTimeSec: number | null
  peakBank: number | null
  peakBankTimeSec: number | null
  /** End-of-game float as a share of all gathered resources. This is a read on
   * unconverted bank, not proof that saving was wrong. */
  resourceFloatPct: number | null
  kills: number | null
  troopLosses: number | null
  tradeRatio: number | null
  unitsProduced: number | null
  largestArmy: number | null
  firstNonVillagerUnit: BuildEvent | null
  firstBuilding: BuildEvent | null
  /** Age timestamps are copied from the authoritative summary header. */
  age2Sec: number | null
  age3Sec: number | null
  age4Sec: number | null
  /** Observable gaps between completed non-villager units. These are not
   * direct production-queue idle times when multiple buildings are active. */
  unitCompletionGaps: number
  longestUnitCompletionGapSec: number | null
  upgrades: number | null
  villagersLost: number | null
  villagerHigh: number | null
  tcIdleWindows: number
  longestTcGapSec: number | null
}

export interface MatchReviewCheckpoint {
  label: 'Opening' | 'Midgame' | 'End'
  timeSec: number
  myGathered: number | null
  opponentGathered: number | null
  gatheredDelta: number | null
  myScore: number | null
  opponentScore: number | null
  scoreDelta: number | null
}

export interface MatchReviewTeamSide {
  playerCount: number
  gathered: number | null
  spent: number | null
  conversionPct: number | null
  kills: number | null
  troopLosses: number | null
  tradeRatio: number | null
  unitsProduced: number | null
  largestArmy: number | null
  upgrades: number | null
  villagersLost: number | null
  villagerHigh: number | null
  tcIdleWindows: number
}

export interface MatchReviewTeamComparison {
  mine: MatchReviewTeamSide
  enemy: MatchReviewTeamSide
}

export interface MatchReviewCoverage {
  summaryTotals: boolean
  economyTimeline: boolean
  scoreTimeline: boolean
  buildTimeline: boolean
  combatCounters: boolean
  confidence: 'high' | 'medium' | 'low'
}

export interface MatchReview {
  me: MatchReviewPlayer
  opponent: MatchReviewPlayer | null
  checkpoints: MatchReviewCheckpoint[]
  isOneVsOne: boolean
  /** Team-level comparison when Relic supplied usable team ids for both sides. */
  teamComparison: MatchReviewTeamComparison | null
  /** Explicit evidence coverage so coaching never looks more certain than the data. */
  coverage: MatchReviewCoverage
}

const VILLAGER_GAP_THRESHOLD_SEC = 35

/** Build the evidence-backed decision metrics used by the match UI and coaching. */
export function deriveMatchReview(
  summary: MatchSummary,
  myProfileId: number | null,
  myCiv: string | null,
  perPlayer: PerPlayerMatchStats[] = [],
): MatchReview | null {
  const me = identifyPlayer(summary, myProfileId, myCiv)
  if (!me) return null

  const isOneVsOne = summary.players.length === 2
  const opponent = isOneVsOne
    ? (summary.players.find((player) => player.playerId !== me.playerId) ?? null)
    : null
  const perPlayerById = new Map(perPlayer.map((row) => [row.profileId, row]))
  const meMetrics = playerMetrics(me, perPlayerById)

  return {
    me: meMetrics,
    opponent: opponent ? playerMetrics(opponent, perPlayerById) : null,
    checkpoints: opponent ? deriveCheckpoints(summary, me, opponent) : [],
    isOneVsOne,
    teamComparison: deriveTeamComparison(summary, me, perPlayer, perPlayerById),
    coverage: coverageFor(summary, me, perPlayerById),
  }
}

function coverageFor(
  summary: MatchSummary,
  me: PlayerSummary,
  perPlayerById: Map<number, PerPlayerMatchStats>,
): MatchReviewCoverage {
  const summaryTotals = summary.players.some((player) => player.totals != null)
  const economyTimeline = summary.players.some((player) => player.resources.length >= 2)
  const scoreTimeline = summary.players.some((player) => player.scores.length >= 2)
  const buildTimeline = summary.players.some((player) => player.buildOrder.length > 0)
  const combatCounters = me.profileId != null && perPlayerById.has(me.profileId)
  const evidenceCount = [summaryTotals, economyTimeline, scoreTimeline, buildTimeline, combatCounters].filter(Boolean).length
  return {
    summaryTotals,
    economyTimeline,
    scoreTimeline,
    buildTimeline,
    combatCounters,
    confidence: evidenceCount >= 4 ? 'high' : evidenceCount >= 2 ? 'medium' : 'low',
  }
}

function deriveTeamComparison(
  summary: MatchSummary,
  me: PlayerSummary,
  perPlayer: PerPlayerMatchStats[],
  perPlayerById: Map<number, PerPlayerMatchStats>,
): MatchReviewTeamComparison | null {
  const meStats = me.profileId == null ? null : (perPlayerById.get(me.profileId) ?? null)
  const myTeamId = meStats?.teamId ?? null
  if (myTeamId == null) return null
  const enemyTeamIds = new Set(
    perPlayer
      .filter((row) => row.teamId != null && row.teamId !== myTeamId)
      .map((row) => row.teamId as number),
  )
  if (enemyTeamIds.size === 0) return null

  const myPlayers = summary.players.filter(
    (player) => playerTeamId(player, perPlayerById) === myTeamId,
  )
  const enemyPlayers = summary.players.filter((player) => {
    const teamId = playerTeamId(player, perPlayerById)
    return teamId != null && enemyTeamIds.has(teamId)
  })
  if (myPlayers.length === 0 || enemyPlayers.length === 0) return null
  return {
    mine: aggregateTeamSide(myPlayers, perPlayerById),
    enemy: aggregateTeamSide(enemyPlayers, perPlayerById),
  }
}

function playerTeamId(
  player: PlayerSummary,
  perPlayerById: Map<number, PerPlayerMatchStats>,
): number | null {
  return player.profileId == null ? null : (perPlayerById.get(player.profileId)?.teamId ?? null)
}

function aggregateTeamSide(
  players: PlayerSummary[],
  perPlayerById: Map<number, PerPlayerMatchStats>,
): MatchReviewTeamSide {
  const rows = players.map((player) => playerMetrics(player, perPlayerById))
  const gathered = sumNullable(rows.map((row) => row.gathered))
  const spent = sumNullable(rows.map((row) => row.spent))
  const kills = sumNullable(rows.map((row) => row.kills))
  const troopLosses = sumNullable(rows.map((row) => row.troopLosses))
  return {
    playerCount: rows.length,
    gathered,
    spent,
    conversionPct:
      gathered != null && gathered > 0 && spent != null
        ? Math.round(Math.max(0, Math.min(100, (spent / gathered) * 100)))
        : null,
    kills,
    troopLosses,
    tradeRatio: kills != null && troopLosses != null && troopLosses > 0 ? kills / troopLosses : null,
    unitsProduced: sumNullable(rows.map((row) => row.unitsProduced)),
    largestArmy: sumNullable(rows.map((row) => row.largestArmy)),
    upgrades: sumNullable(rows.map((row) => row.upgrades)),
    villagersLost: sumNullable(rows.map((row) => row.villagersLost)),
    villagerHigh: sumNullable(rows.map((row) => row.villagerHigh)),
    tcIdleWindows: rows.reduce((total, row) => total + row.tcIdleWindows, 0),
  }
}

function sumNullable(values: Array<number | null>): number | null {
  const known = values.filter((value): value is number => value != null && Number.isFinite(value))
  return known.length > 0 ? known.reduce((total, value) => total + value, 0) : null
}

function identifyPlayer(
  summary: MatchSummary,
  myProfileId: number | null,
  myCiv: string | null,
): PlayerSummary | null {
  if (myProfileId != null) {
    const byId = summary.players.find((player) => player.profileId === myProfileId)
    if (byId) return byId
  }
  if (!myCiv) return null
  const byCiv = summary.players.filter((player) => civFromToken(player.civToken) === myCiv)
  return byCiv.length === 1 ? byCiv[0]! : null
}

function playerMetrics(
  player: PlayerSummary,
  perPlayerById: Map<number, PerPlayerMatchStats>,
): MatchReviewPlayer {
  const totals = player.totals
  const gathered = totals ? resourceTotal(totals.resourcesGathered) : null
  const spent = totals ? resourceTotal(totals.resourcesSpent) : null
  const conversionPct =
    gathered != null && gathered > 0 && spent != null
      ? Math.round(Math.max(0, Math.min(100, (spent / gathered) * 100)))
      : null
  const bank = bankExtremes(player)
  const counters = player.profileId == null ? null : (perPlayerById.get(player.profileId) ?? null)
  const kills = counters?.kills ?? totals?.unitsKilled ?? null
  const troopLosses = militaryLosses(player, counters)
  const firstNonVillagerUnit = firstBuildEvent(
    player,
    (event) => event.category === 'unit' && !isVillager(event),
  )
  const firstBuilding = firstBuildEvent(player, (event) => event.category === 'building')
  const rhythm = villagerRhythm(player)
  const unitRhythm = unitCompletionRhythm(player)
  const resourceFloatPct =
    gathered != null && gathered > 0 && bank.last != null
      ? Math.round(Math.max(0, Math.min(100, (bank.last.total / gathered) * 100)))
      : null

  return {
    player,
    perPlayer: counters,
    gathered,
    spent,
    conversionPct,
    lastBank: bank.last?.total ?? null,
    lastBankTimeSec: bank.last?.timeSec ?? null,
    peakBank: bank.peak?.total ?? null,
    peakBankTimeSec: bank.peak?.timeSec ?? null,
    resourceFloatPct,
    kills,
    troopLosses,
    tradeRatio:
      kills != null && troopLosses != null && troopLosses > 0 ? kills / troopLosses : null,
    unitsProduced: counters?.unitsProduced ?? totals?.unitsProduced ?? null,
    largestArmy: totals?.largestArmy ?? null,
    firstNonVillagerUnit,
    firstBuilding,
    age2Sec: totals?.age2Sec ?? null,
    age3Sec: totals?.age3Sec ?? null,
    age4Sec: totals?.age4Sec ?? null,
    unitCompletionGaps: unitRhythm.count,
    longestUnitCompletionGapSec: unitRhythm.longestGapSec > 0 ? unitRhythm.longestGapSec : null,
    upgrades: counters?.techsResearched ?? totals?.techResearched ?? null,
    villagersLost: player.villagersLost,
    villagerHigh: totals?.villagerHigh ?? null,
    tcIdleWindows: rhythm.count,
    longestTcGapSec: rhythm.longestGapSec > 0 ? rhythm.longestGapSec : null,
  }
}

function unitCompletionRhythm(player: PlayerSummary): { count: number; longestGapSec: number } {
  const times = player.buildOrder
    .filter((event) => event.category === 'unit' && !isVillager(event))
    .map((event) => event.timeSec)
    .filter((timeSec) => Number.isFinite(timeSec) && timeSec >= 0)
    .sort((a, b) => a - b)
  let count = 0
  let longestGapSec = 0
  for (let index = 1; index < times.length; index++) {
    const gap = times[index]! - times[index - 1]!
    longestGapSec = Math.max(longestGapSec, gap)
    if (gap > 60) count++
  }
  return { count, longestGapSec }
}

function militaryLosses(
  player: PlayerSummary,
  counters: PerPlayerMatchStats | null,
): number | null {
  if (player.totals) {
    // The summary's units-lost counter includes villagers. Subtract them only
    // when the lost-entity list decoded; otherwise keep the metric unavailable.
    if (player.villagersLost != null) {
      return Math.max(0, player.totals.unitsLost - player.villagersLost)
    }
    // Relic's per-player deaths are already military-only when the summary
    // did not decode the lost-entity list, so use that independent counter.
    return counters?.deaths ?? null
  }
  return counters?.deaths ?? null
}

function firstBuildEvent(
  player: PlayerSummary,
  predicate: (event: BuildEvent) => boolean,
): BuildEvent | null {
  return (
    [...player.buildOrder]
      .filter((event) => predicate(event) && Number.isFinite(event.timeSec) && event.timeSec >= 0)
      .sort((a, b) => a.timeSec - b.timeSec || a.name.localeCompare(b.name))[0] ?? null
  )
}

function isVillager(event: BuildEvent): boolean {
  return event.blueprint.startsWith('unit_villager') || event.name === 'Villager'
}

function bankExtremes(player: PlayerSummary): {
  last: { timeSec: number; total: number } | null
  peak: { timeSec: number; total: number } | null
} {
  const points = player.resources
    .map((point) => ({ timeSec: point.timeSec, total: resourceTotal(point.bank) }))
    .filter((point) => Number.isFinite(point.timeSec) && point.timeSec >= 0 && point.total >= 0)
    .sort((a, b) => a.timeSec - b.timeSec)
  let peak: { timeSec: number; total: number } | null = null
  for (const point of points) {
    if (
      !peak ||
      point.total > peak.total ||
      (point.total === peak.total && point.timeSec < peak.timeSec)
    ) {
      peak = point
    }
  }
  return { last: points.at(-1) ?? null, peak }
}

function villagerRhythm(player: PlayerSummary): {
  count: number
  longestGapSec: number
} {
  const times = player.buildOrder
    .filter((event) => event.category === 'unit' && isVillager(event))
    .map((event) => event.timeSec)
    .filter((timeSec) => Number.isFinite(timeSec) && timeSec >= 0)
    .sort((a, b) => a - b)
  let count = 0
  let longestGapSec = 0
  for (let i = 1; i < times.length; i++) {
    const gap = times[i]! - times[i - 1]!
    if (gap > VILLAGER_GAP_THRESHOLD_SEC) count++
    longestGapSec = Math.max(longestGapSec, gap)
  }
  return { count, longestGapSec }
}

function deriveCheckpoints(
  summary: MatchSummary,
  me: PlayerSummary,
  opponent: PlayerSummary,
): MatchReviewCheckpoint[] {
  const duration = validTime(summary.gameLengthSec)
  const availableTimes = [
    ...me.resources.map((point) => point.timeSec),
    ...me.scores.map((point) => point.timeSec),
  ]
    .concat(
      opponent.resources.map((point) => point.timeSec),
      opponent.scores.map((point) => point.timeSec),
    )
    .filter((timeSec) => validTime(timeSec) != null)
    .sort((a, b) => a - b)
  if (availableTimes.length === 0) return []

  const lastTime = duration ?? availableTimes.at(-1)!
  const targets = [
    { label: 'Opening' as const, timeSec: Math.min(300, lastTime) },
    { label: 'Midgame' as const, timeSec: Math.min(600, lastTime) },
    { label: 'End' as const, timeSec: lastTime },
  ]
  const seen = new Set<number>()
  return targets.flatMap((target) => {
    const actualTime = nearestSampleTime(me, opponent, target.timeSec)
    if (actualTime == null || seen.has(actualTime)) return []
    seen.add(actualTime)
    const myGathered = sampleValue(me.resources, actualTime, (point) =>
      resourceTotal(point.gathered),
    )
    const opponentGathered = sampleValue(opponent.resources, actualTime, (point) =>
      resourceTotal(point.gathered),
    )
    const myScore = sampleValue(me.scores, actualTime, (point) => point.total)
    const opponentScore = sampleValue(opponent.scores, actualTime, (point) => point.total)
    return [
      {
        label: target.label,
        timeSec: actualTime,
        myGathered,
        opponentGathered,
        gatheredDelta: delta(myGathered, opponentGathered),
        myScore,
        opponentScore,
        scoreDelta: delta(myScore, opponentScore),
      },
    ]
  })
}

function sampleValue<T extends { timeSec: number }>(
  points: T[],
  targetSec: number,
  valueOf: (point: T) => number,
): number | null {
  const point = [...points]
    .filter((candidate) => validTime(candidate.timeSec) != null && candidate.timeSec <= targetSec)
    .sort((a, b) => b.timeSec - a.timeSec)[0]
  if (!point) return null
  const value = valueOf(point)
  return Number.isFinite(value) && value > 0 ? Math.round(value) : null
}

function nearestSampleTime(
  me: PlayerSummary,
  opponent: PlayerSummary,
  targetSec: number,
): number | null {
  const times = [
    ...me.resources.map((point) => point.timeSec),
    ...me.scores.map((point) => point.timeSec),
    ...opponent.resources.map((point) => point.timeSec),
    ...opponent.scores.map((point) => point.timeSec),
  ].filter((timeSec) => validTime(timeSec) != null)
  if (times.length === 0) return null
  const atOrBefore = times.filter((timeSec) => timeSec <= targetSec).sort((a, b) => b - a)[0]
  return atOrBefore ?? Math.min(...times)
}

function delta(mine: number | null, theirs: number | null): number | null {
  return mine != null && theirs != null ? mine - theirs : null
}

function resourceTotal(resources: {
  food: number
  wood: number
  gold: number
  stone: number
}): number {
  return resources.food + resources.wood + resources.gold + resources.stone
}

function validTime(value: number | null | undefined): number | null {
  return value != null && Number.isFinite(value) && value >= 0 ? value : null
}
