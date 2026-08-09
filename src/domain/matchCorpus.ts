import type { PerPlayerMatchStats } from './analysis'
import type { BuildAuditHistoryRow } from './buildOrderHistory'
import { deriveMatchReview, type MatchReview, type MatchReviewCoverage } from './matchReview'
import { civDisplayName } from './civ'
import type { MatchSummary, PlayerSummary } from './statsSummary'
import type { StoredMatch } from '../store/historyStore'

/** A compact mean used by the cross-match report. Null means there was no evidence. */
export interface CorpusMetricSet {
  avgDurationSec: number | null
  avgApm: number | null
  avgKd: number | null
  avgGathered: number | null
  avgSpent: number | null
  avgResourcesPerMinute: number | null
  avgVillagersProduced: number | null
  avgVillagerHigh: number | null
  avgKills: number | null
  avgTroopLosses: number | null
  avgUnitsProduced: number | null
  avgUpgrades: number | null
  avgBuildScore: number | null
  avgFeudalSec: number | null
  avgTcIdleWindows: number | null
  avgResourceFloatPct: number | null
}

export interface CorpusBreakdown extends CorpusMetricSet {
  key: string
  label: string
  games: number
  wins: number
  losses: number
  winRate: number | null
  summaryGames: number
  matchedPlayerGames: number
  counterGames: number
  economyGames: number
  buildTimelineGames: number
}

export interface CorpusCoverage {
  totalGames: number
  decidedGames: number
  wins: number
  losses: number
  unknownResults: number
  summaryGames: number
  matchedPlayerGames: number
  counterGames: number
  economyGames: number
  buildTimelineGames: number
  buildScoreGames: number
  casualtyTimelineGames: number
  highConfidenceGames: number
}

export interface CorpusMatchMetrics {
  gathered: number | null
  spent: number | null
  conversionPct: number | null
  resourceFloatPct: number | null
  resourcesPerMinute: number | null
  villagersProduced: number | null
  villagersLost: number | null
  villagerHigh: number | null
  kills: number | null
  troopLosses: number | null
  kd: number | null
  unitsProduced: number | null
  largestArmy: number | null
  upgrades: number | null
  apm: number | null
  age2Sec: number | null
  age3Sec: number | null
  age4Sec: number | null
  feudalLagSec: number | null
  tcIdleWindows: number
  longestTcGapSec: number | null
}

export interface CorpusMatchRow {
  matchId: string
  playedAt: string
  result: 'win' | 'loss' | null
  civ: string
  opponentCiv: string | null
  map: string
  format: string | null
  durationSec: number | null
  summaryStatus: 'available' | 'unavailable'
  playerMatched: boolean
  coverage: MatchReviewCoverage | null
  buildScore: number | null
  metrics: CorpusMatchMetrics
  /** Stable ids are suitable for filtering/translating in the renderer. */
  findingIds: string[]
}

export interface CorpusInsight {
  id: string
  title: string
  detail: string
  count: number
  rate: number
  priority: 'high' | 'medium' | 'info'
}

export interface MatchCorpusReport {
  generatedAt: string
  metrics: CorpusMetricSet
  coverage: CorpusCoverage
  byCiv: CorpusBreakdown[]
  byMap: CorpusBreakdown[]
  byOpponentCiv: CorpusBreakdown[]
  repeatedFindings: CorpusInsight[]
  /** Newest first; no raw summary timelines are sent over IPC. */
  matches: CorpusMatchRow[]
}

export interface MatchCorpusInput {
  matches: StoredMatch[]
  summaries: Map<string, MatchSummary | null>
  profileId: number | null
  buildAuditRows?: BuildAuditHistoryRow[]
  generatedAt?: string
}

interface MetricAccumulator {
  duration: number[]
  apm: number[]
  kd: number[]
  gathered: number[]
  spent: number[]
  rpm: number[]
  villagers: number[]
  villagerHigh: number[]
  kills: number[]
  troopLosses: number[]
  units: number[]
  upgrades: number[]
  buildScore: number[]
  feudal: number[]
  tcIdle: number[]
  floatPct: number[]
}

interface BreakdownAccumulator extends MetricAccumulator {
  key: string
  label: string
  games: number
  wins: number
  losses: number
  summaryGames: number
  matchedPlayerGames: number
  counterGames: number
  economyGames: number
  buildTimelineGames: number
}

function emptyMetrics(): MetricAccumulator {
  return {
    duration: [],
    apm: [],
    kd: [],
    gathered: [],
    spent: [],
    rpm: [],
    villagers: [],
    villagerHigh: [],
    kills: [],
    troopLosses: [],
    units: [],
    upgrades: [],
    buildScore: [],
    feudal: [],
    tcIdle: [],
    floatPct: [],
  }
}

function emptyBreakdown(key: string, label: string): BreakdownAccumulator {
  return {
    ...emptyMetrics(),
    key,
    label,
    games: 0,
    wins: 0,
    losses: 0,
    summaryGames: 0,
    matchedPlayerGames: 0,
    counterGames: 0,
    economyGames: 0,
    buildTimelineGames: 0,
  }
}

function finite(value: number | null | undefined): value is number {
  return value != null && Number.isFinite(value)
}

function mean(values: number[]): number | null {
  return values.length > 0
    ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10
    : null
}

function sumResources(resources: { food: number; wood: number; gold: number; stone: number } | null | undefined): number | null {
  if (!resources) return null
  const total = resources.food + resources.wood + resources.gold + resources.stone
  return Number.isFinite(total) && total > 0 ? Math.round(total) : null
}

function countVillagers(summaryPlayer: { buildOrder: Array<{ blueprint: string; name: string }> } | null): number | null {
  if (!summaryPlayer) return null
  const count = summaryPlayer.buildOrder.filter((event) =>
    /villager|worker_elephant/i.test(`${event.blueprint} ${event.name}`),
  ).length
  return count > 0 ? count : null
}

function counterFor(match: StoredMatch, profileId: number | null): PerPlayerMatchStats | null {
  if (profileId == null) return null
  return match.perPlayer?.find((player) => player.profileId === profileId) ?? null
}

function basicMetrics(match: StoredMatch, counter: PerPlayerMatchStats | null): CorpusMatchMetrics {
  const gathered = sumResources(match.local?.resourcesGathered)
  const duration = match.local?.gameTimeSec ?? match.durationSec
  const rpm = gathered != null && duration != null && duration > 0
    ? Math.round(gathered / (duration / 60))
    : null
  return {
    gathered,
    spent: null,
    conversionPct: null,
    resourceFloatPct: null,
    resourcesPerMinute: rpm,
    villagersProduced: match.local?.villagersProduced ?? null,
    villagersLost: null,
    villagerHigh: null,
    kills: counter?.kills ?? null,
    troopLosses: counter?.deaths ?? null,
    kd: counter?.kd ?? null,
    unitsProduced: counter?.unitsProduced ?? null,
    largestArmy: null,
    upgrades: counter?.techsResearched ?? null,
    apm: counter?.apm ?? match.analysis.apm ?? null,
    age2Sec: null,
    age3Sec: null,
    age4Sec: null,
    feudalLagSec: null,
    tcIdleWindows: 0,
    longestTcGapSec: null,
  }
}

function metricsFromReview(
  match: StoredMatch,
  review: MatchReview,
  summaryPlayer: PlayerSummary | null,
): CorpusMatchMetrics {
  const me = review.me
  const duration = match.durationSec
  const villagersProduced = match.local?.villagersProduced ?? countVillagers(summaryPlayer)
  const rpm = me.gathered != null && duration != null && duration > 0
    ? Math.round(me.gathered / (duration / 60))
    : null
  const feudalLag =
    me.age2Sec != null && review.opponent?.age2Sec != null
      ? Math.round(me.age2Sec - review.opponent.age2Sec)
      : null
  return {
    gathered: me.gathered,
    spent: me.spent,
    conversionPct: me.conversionPct,
    resourceFloatPct: me.resourceFloatPct,
    resourcesPerMinute: rpm,
    villagersProduced,
    villagersLost: me.villagersLost,
    villagerHigh: me.villagerHigh,
    kills: me.kills,
    troopLosses: me.troopLosses,
    kd: me.tradeRatio,
    unitsProduced: me.unitsProduced,
    largestArmy: me.largestArmy,
    upgrades: me.upgrades,
    apm: me.perPlayer?.apm ?? match.analysis.apm ?? null,
    age2Sec: me.age2Sec,
    age3Sec: me.age3Sec,
    age4Sec: me.age4Sec,
    feudalLagSec: feudalLag,
    tcIdleWindows: me.tcIdleWindows,
    longestTcGapSec: me.longestTcGapSec,
  }
}

function metricArrays(target: MetricAccumulator, metrics: CorpusMatchMetrics, durationSec: number | null): void {
  if (finite(durationSec)) target.duration.push(durationSec)
  if (finite(metrics.apm)) target.apm.push(metrics.apm)
  if (finite(metrics.kd)) target.kd.push(metrics.kd)
  if (finite(metrics.gathered)) target.gathered.push(metrics.gathered)
  if (finite(metrics.spent)) target.spent.push(metrics.spent)
  if (finite(metrics.resourcesPerMinute)) target.rpm.push(metrics.resourcesPerMinute)
  if (finite(metrics.villagersProduced)) target.villagers.push(metrics.villagersProduced)
  if (finite(metrics.villagerHigh)) target.villagerHigh.push(metrics.villagerHigh)
  if (finite(metrics.kills)) target.kills.push(metrics.kills)
  if (finite(metrics.troopLosses)) target.troopLosses.push(metrics.troopLosses)
  if (finite(metrics.unitsProduced)) target.units.push(metrics.unitsProduced)
  if (finite(metrics.upgrades)) target.upgrades.push(metrics.upgrades)
  if (finite(metrics.feudalLagSec)) target.feudal.push(metrics.feudalLagSec)
  if (finite(metrics.tcIdleWindows)) target.tcIdle.push(metrics.tcIdleWindows)
  if (finite(metrics.resourceFloatPct)) target.floatPct.push(metrics.resourceFloatPct)
}

function addToBreakdown(
  bucket: BreakdownAccumulator,
  match: StoredMatch,
  summary: MatchSummary | null,
  review: MatchReview | null,
  metrics: CorpusMatchMetrics,
  buildScore: number | null,
  counter: PerPlayerMatchStats | null,
): void {
  bucket.games++
  if (match.result === 'win') bucket.wins++
  if (match.result === 'loss') bucket.losses++
  if (summary) bucket.summaryGames++
  if (review) {
    bucket.matchedPlayerGames++
    if (review.coverage.buildTimeline) bucket.buildTimelineGames++
  }
  if (counter) bucket.counterGames++
  if (metrics.gathered != null) bucket.economyGames++
  if (buildScore != null) bucket.buildScore.push(buildScore)
  metricArrays(bucket, metrics, match.durationSec)
}

function finalizeBreakdown(bucket: BreakdownAccumulator): CorpusBreakdown {
  return {
    key: bucket.key,
    label: bucket.label,
    games: bucket.games,
    wins: bucket.wins,
    losses: bucket.losses,
    winRate: bucket.wins + bucket.losses > 0
      ? Math.round((bucket.wins / (bucket.wins + bucket.losses)) * 100)
      : null,
    summaryGames: bucket.summaryGames,
    matchedPlayerGames: bucket.matchedPlayerGames,
    counterGames: bucket.counterGames,
    economyGames: bucket.economyGames,
    buildTimelineGames: bucket.buildTimelineGames,
    avgDurationSec: mean(bucket.duration),
    avgApm: mean(bucket.apm),
    avgKd: mean(bucket.kd),
    avgGathered: mean(bucket.gathered),
    avgSpent: mean(bucket.spent),
    avgResourcesPerMinute: mean(bucket.rpm),
    avgVillagersProduced: mean(bucket.villagers),
    avgVillagerHigh: mean(bucket.villagerHigh),
    avgKills: mean(bucket.kills),
    avgTroopLosses: mean(bucket.troopLosses),
    avgUnitsProduced: mean(bucket.units),
    avgUpgrades: mean(bucket.upgrades),
    avgBuildScore: mean(bucket.buildScore),
    avgFeudalSec: mean(bucket.feudal),
    avgTcIdleWindows: mean(bucket.tcIdle),
    avgResourceFloatPct: mean(bucket.floatPct),
  }
}

function sortBreakdowns(rows: CorpusBreakdown[]): CorpusBreakdown[] {
  return rows.sort((a, b) =>
    b.games - a.games || (b.winRate ?? -1) - (a.winRate ?? -1) || a.label.localeCompare(b.label),
  )
}

function findIds(
  match: StoredMatch,
  metrics: CorpusMatchMetrics,
  _review: MatchReview | null,
): string[] {
  const findings: string[] = []
  if (metrics.longestTcGapSec != null && metrics.longestTcGapSec >= 35) findings.push('tc-idle')
  if (metrics.villagersProduced != null && metrics.villagersProduced > 0 && match.durationSec != null && match.durationSec >= 600 && metrics.villagersProduced < 30) {
    findings.push('low-villager-production')
  }
  if (metrics.villagerHigh != null && metrics.villagerHigh < 45 && (match.durationSec ?? 0) >= 900) findings.push('low-villager-high')
  if (metrics.troopLosses != null && metrics.troopLosses >= 15 && metrics.kd != null && metrics.kd < 0.65) findings.push('poor-trade')
  if (metrics.apm != null && metrics.apm < 35 && (match.durationSec ?? 0) >= 600) findings.push('low-apm')
  if (metrics.resourceFloatPct != null && metrics.resourceFloatPct >= 25) findings.push('resource-float')
  if (metrics.feudalLagSec != null && metrics.feudalLagSec > 100) findings.push('late-feudal')
  if (metrics.villagersLost != null && metrics.villagersLost >= 6) findings.push('villager-losses')
  return findings
}

function insight(
  id: string,
  title: string,
  detail: string,
  count: number,
  total: number,
  priority: CorpusInsight['priority'],
): CorpusInsight | null {
  if (count <= 0 || total <= 0) return null
  return { id, title, detail, count, rate: Math.round((count / total) * 100), priority }
}

function buildInsights(
  rows: CorpusMatchRow[],
  coverage: CorpusCoverage,
  total: number,
): CorpusInsight[] {
  const counts = new Map<string, number>()
  for (const row of rows) for (const id of row.findingIds) counts.set(id, (counts.get(id) ?? 0) + 1)
  const result = [
    insight('tc-idle', 'Town Center rhythm', 'Long gaps between completed villagers are a repeatable macro signal; verify the queue and housing at these match times.', counts.get('tc-idle') ?? 0, total, 'high'),
    insight('poor-trade', 'Unfavourable trades', 'Low K/D with many troop losses points to composition, scouting or engagement timing rather than raw APM.', counts.get('poor-trade') ?? 0, total, 'high'),
    insight('villager-losses', 'Economic casualties', 'The summary casualty stream confirms games with worker losses; compare the first loss time with the pressure timeline.', counts.get('villager-losses') ?? 0, total, 'high'),
    insight('late-feudal', 'Late Feudal', 'Your Feudal timing trails the earliest enemy timing by more than 1:40 in these games; inspect whether the delay was intentional.', counts.get('late-feudal') ?? 0, total, 'medium'),
    insight('low-apm', 'Low activity windows', 'APM below 35 in games of at least 10 minutes is a prompt to add production, scouting and spending checks.', counts.get('low-apm') ?? 0, total, 'medium'),
    insight('resource-float', 'Unspent bank', 'A large end-game bank is a conversion signal, not proof of a mistake; pair it with army and technology timing.', counts.get('resource-float') ?? 0, total, 'medium'),
    insight('low-villager-high', 'Small economy peak', 'The peak villager count stays low in longer games; inspect TC uptime and safety before adding more production.', counts.get('low-villager-high') ?? 0, total, 'medium'),
    coverage.summaryGames < total
      ? insight('missing-summary', 'Summary coverage', 'Some matches have no local or cached stats.rgs, so their economy and build evidence is unavailable rather than zero.', total - coverage.summaryGames, total, 'info')
      : null,
    coverage.matchedPlayerGames < coverage.summaryGames
      ? insight('missing-player', 'Player identity coverage', 'A summary can exist without a uniquely matched player row; those rows are kept but excluded from personal conclusions.', coverage.summaryGames - coverage.matchedPlayerGames, total, 'info')
      : null,
  ]
  return result.filter((item): item is CorpusInsight => item != null).sort((a, b) =>
    ({ high: 0, medium: 1, info: 2 }[a.priority] - ({ high: 0, medium: 1, info: 2 }[b.priority]) || b.count - a.count),
  )
}

/**
 * Aggregates every stored match without fetching the network. Local/cached
 * summaries are joined to Relic counters and build-audit rows, while each
 * missing source remains explicitly unavailable.
 */
export function analyzeMatchCorpus(input: MatchCorpusInput): MatchCorpusReport {
  const byCiv = new Map<string, BreakdownAccumulator>()
  const byMap = new Map<string, BreakdownAccumulator>()
  const byOpponentCiv = new Map<string, BreakdownAccumulator>()
  const overall = emptyMetrics()
  const buildScores: number[] = []
  const auditById = new Map((input.buildAuditRows ?? []).map((row) => [row.matchId, row.score]))
  const matches: CorpusMatchRow[] = []
  let summaryGames = 0
  let matchedPlayerGames = 0
  let counterGames = 0
  let economyGames = 0
  let buildTimelineGames = 0
  let buildScoreGames = 0
  let casualtyTimelineGames = 0
  let highConfidenceGames = 0
  let wins = 0
  let losses = 0

  for (const match of input.matches) {
    const summary = input.summaries.get(match.id) ?? null
    const counter = counterFor(match, input.profileId)
    const review = summary
      ? deriveMatchReview(summary, input.profileId, match.civ, match.perPlayer ?? [])
      : null
    const summaryPlayer = review?.me.player ?? null
    const metrics = review
      ? metricsFromReview(match, review, summaryPlayer)
      : basicMetrics(match, counter)
    const result = match.result ?? counter?.result ?? null
    const buildScore = auditById.get(match.id) ?? null
    if (result === 'win') wins++
    if (result === 'loss') losses++
    if (summary) summaryGames++
    if (review) {
      matchedPlayerGames++
      if (review.coverage.buildTimeline) buildTimelineGames++
      if (review.coverage.casualtyTimeline) casualtyTimelineGames++
      if (review.coverage.confidence === 'high') highConfidenceGames++
    }
    if (counter) counterGames++
    if (metrics.gathered != null) economyGames++
    if (buildScore != null) {
      buildScores.push(buildScore)
      buildScoreGames++
    }
    metricArrays(overall, metrics, match.durationSec)

    const findingIds = findIds(match, metrics, review)
    const row: CorpusMatchRow = {
      matchId: match.id,
      playedAt: match.playedAt,
      result,
      civ: match.civ,
      opponentCiv: match.oppCiv,
      map: match.map,
      format: match.format ?? null,
      durationSec: match.durationSec,
      summaryStatus: summary ? 'available' : 'unavailable',
      playerMatched: review != null,
      coverage: review?.coverage ?? null,
      buildScore,
      metrics,
      findingIds,
    }
    matches.push(row)

    const add = (map: Map<string, BreakdownAccumulator>, key: string | null, label: string) => {
      if (!key) return
      const bucket = map.get(key) ?? emptyBreakdown(key, label)
      addToBreakdown(bucket, { ...match, result }, summary, review, metrics, buildScore, counter)
      map.set(key, bucket)
    }
    add(byCiv, match.civ, civDisplayName(match.civ))
    add(byMap, match.map, match.map)
    const opponentCiv = match.oppCiv
    if (opponentCiv) add(byOpponentCiv, opponentCiv, civDisplayName(opponentCiv))
  }

  const totalGames = input.matches.length
  const coverage: CorpusCoverage = {
    totalGames,
    decidedGames: wins + losses,
    wins,
    losses,
    unknownResults: Math.max(0, totalGames - wins - losses),
    summaryGames,
    matchedPlayerGames,
    counterGames,
    economyGames,
    buildTimelineGames,
    buildScoreGames,
    casualtyTimelineGames,
    highConfidenceGames,
  }
  return {
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    metrics: {
      avgDurationSec: mean(overall.duration),
      avgApm: mean(overall.apm),
      avgKd: mean(overall.kd),
      avgGathered: mean(overall.gathered),
      avgSpent: mean(overall.spent),
      avgResourcesPerMinute: mean(overall.rpm),
      avgVillagersProduced: mean(overall.villagers),
      avgVillagerHigh: mean(overall.villagerHigh),
      avgKills: mean(overall.kills),
      avgTroopLosses: mean(overall.troopLosses),
      avgUnitsProduced: mean(overall.units),
      avgUpgrades: mean(overall.upgrades),
      avgBuildScore: mean(buildScores),
      avgFeudalSec: mean(overall.feudal),
      avgTcIdleWindows: mean(overall.tcIdle),
      avgResourceFloatPct: mean(overall.floatPct),
    },
    coverage,
    byCiv: sortBreakdowns([...byCiv.values()].map(finalizeBreakdown)),
    byMap: sortBreakdowns([...byMap.values()].map(finalizeBreakdown)),
    byOpponentCiv: sortBreakdowns([...byOpponentCiv.values()].map(finalizeBreakdown)),
    repeatedFindings: buildInsights(matches, coverage, totalGames),
    matches,
  }
}
