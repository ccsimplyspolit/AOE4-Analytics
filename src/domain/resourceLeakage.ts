/**
 * Resource Bank Leakage and Floating Resource Analyzer (pure domain logic).
 *
 * Evaluates unspent resource banks (Food, Wood, Gold, Stone) across the game timeline.
 * Differentiates intentional age-up saving from floating resource waste, computes
 * average and peak float values, and generates actionable conversion advice for military
 * production, farming, or technology investments.
 */

import type { PlayerSummary } from './statsSummary'

export interface ResourceFloatInterval {
  startSec: number
  endSec: number
  durationSec: number
  dominantResource: 'wood' | 'food' | 'gold' | 'total'
  peakAmount: number
  advice: string
}

export interface ResourceChartPoint {
  timeSec: number
  timeLabel: string
  food: number
  wood: number
  gold: number
  stone: number
  total: number
  isHighFloat: boolean
}

export interface ResourceLeakageReport {
  playerId: number
  playerName: string | null
  civToken: string | null
  totalGathered: number
  totalSpent: number
  reinvestmentRatePercent: number
  avgBank: number
  peakBank: number
  peakBankTimeSec: number
  highFloatDurationSec: number
  highFloatPercentage: number
  leakageGrade: 'S' | 'A' | 'B' | 'C' | 'D'
  intervals: ResourceFloatInterval[]
  chartPoints: ResourceChartPoint[]
  recommendations: string[]
}

const HIGH_WOOD_THRESHOLD = 700
const HIGH_FOOD_THRESHOLD = 800
const HIGH_GOLD_THRESHOLD = 600
const HIGH_TOTAL_THRESHOLD = 1200

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = String(Math.floor(sec % 60)).padStart(2, '0')
  return `${m}:${s}`
}

function calculateLeakageGrade(highFloatPct: number, avgBank: number): 'S' | 'A' | 'B' | 'C' | 'D' {
  if (highFloatPct < 8 && avgBank < 450) return 'S'
  if (highFloatPct < 18 && avgBank < 700) return 'A'
  if (highFloatPct < 30 && avgBank < 1000) return 'B'
  if (highFloatPct < 45) return 'C'
  return 'D'
}

/**
 * Checks whether the current point in time is an intentional age-up saving window.
 */
function isAgeUpSavingWindow(
  timeSec: number,
  age2Sec: number | null,
  age3Sec: number | null,
  age4Sec: number | null,
): { isSaving: boolean; ageTarget: number | null } {
  // Age 2: 90s before Feudal
  if (age2Sec != null && timeSec >= age2Sec - 90 && timeSec <= age2Sec + 20) {
    return { isSaving: true, ageTarget: 2 }
  }
  // Age 3: 120s before Castle
  if (age3Sec != null && timeSec >= age3Sec - 120 && timeSec <= age3Sec + 30) {
    return { isSaving: true, ageTarget: 3 }
  }
  // Age 4: 150s before Imperial
  if (age4Sec != null && timeSec >= age4Sec - 150 && timeSec <= age4Sec + 45) {
    return { isSaving: true, ageTarget: 4 }
  }
  return { isSaving: false, ageTarget: null }
}

/**
 * Analyzes floating resources and bank leakage for a player across the match.
 */
export function analyzeResourceLeakage(player: PlayerSummary, matchDurationSec = 0): ResourceLeakageReport {
  const resources = player.resources || []
  const age2 = player.totals?.age2Sec ?? null
  const age3 = player.totals?.age3Sec ?? null
  const age4 = player.totals?.age4Sec ?? null

  const totals = player.totals?.resourcesGathered
  const totalGathered = totals ? totals.food + totals.wood + totals.gold + totals.stone : 0
  const spent = player.totals?.resourcesSpent
  const totalSpent = spent ? spent.food + spent.wood + spent.gold + spent.stone : 0
  const reinvestmentRatePercent = totalGathered > 0 ? Math.min(100, Math.round((totalSpent / totalGathered) * 100)) : 100

  if (resources.length === 0) {
    return {
      playerId: player.playerId,
      playerName: player.name,
      civToken: player.civToken,
      totalGathered,
      totalSpent,
      reinvestmentRatePercent,
      avgBank: 0,
      peakBank: 0,
      peakBankTimeSec: 0,
      highFloatDurationSec: 0,
      highFloatPercentage: 0,
      leakageGrade: 'A',
      intervals: [],
      chartPoints: [],
      recommendations: [],
    }
  }

  let totalBankSum = 0
  let peakBank = 0
  let peakBankTimeSec = 0
  let highFloatSeconds = 0

  const chartPoints: ResourceChartPoint[] = []
  const intervals: ResourceFloatInterval[] = []

  let inFloat = false
  let floatStart = 0
  let floatPeak = 0
  let dominantRes: 'wood' | 'food' | 'gold' | 'total' = 'total'

  for (let i = 0; i < resources.length; i++) {
    const pt = resources[i]!
    const t = pt.timeSec
    const f = Math.round(pt.bank.food)
    const w = Math.round(pt.bank.wood)
    const g = Math.round(pt.bank.gold)
    const s = Math.round(pt.bank.stone)
    const tot = f + w + g + s

    totalBankSum += tot
    if (tot > peakBank) {
      peakBank = tot
      peakBankTimeSec = t
    }

    const { isSaving } = isAgeUpSavingWindow(t, age2, age3, age4)

    // A point is considered floating if wood is high (wood is never used for age up) or total is excessive outside saving
    const isWoodFloat = w > HIGH_WOOD_THRESHOLD
    const isFoodFloat = !isSaving && f > HIGH_FOOD_THRESHOLD
    const isGoldFloat = !isSaving && g > HIGH_GOLD_THRESHOLD
    const isTotalFloat = (!isSaving && tot > HIGH_TOTAL_THRESHOLD) || tot > 2000

    const isHighFloat = isWoodFloat || isFoodFloat || isGoldFloat || isTotalFloat

    chartPoints.push({
      timeSec: t,
      timeLabel: formatTime(t),
      food: f,
      wood: w,
      gold: g,
      stone: s,
      total: tot,
      isHighFloat,
    })

    const intervalStep = i > 0 ? t - resources[i - 1]!.timeSec : 30
    if (isHighFloat) {
      highFloatSeconds += Math.max(1, intervalStep)
      if (!inFloat) {
        inFloat = true
        floatStart = t
        floatPeak = tot
        if (w > f && w > g) dominantRes = 'wood'
        else if (f > w && f > g) dominantRes = 'food'
        else if (g > w && g > f) dominantRes = 'gold'
        else dominantRes = 'total'
      } else {
        if (tot > floatPeak) floatPeak = tot
      }
    } else {
      if (inFloat) {
        const floatDuration = t - floatStart
        if (floatDuration >= 45) {
          let advice = `Banked ${floatPeak} unspent resources around ${formatTime(floatStart)}.`
          if (dominantRes === 'wood') {
            const barracksCount = Math.floor(floatPeak / 150)
            const farmCount = Math.floor(floatPeak / 75)
            advice = `High Wood float (~${floatPeak}) at ${formatTime(floatStart)}: could have built ${barracksCount} production buildings or ${farmCount} farms.`
          } else if (dominantRes === 'gold') {
            advice = `High Gold float (~${floatPeak}) at ${formatTime(floatStart)}: prioritize blacksmith upgrades or military tech.`
          } else if (dominantRes === 'food') {
            advice = `High Food float (~${floatPeak}) at ${formatTime(floatStart)}: queue military or advance age.`
          }
          intervals.push({
            startSec: floatStart,
            endSec: t,
            durationSec: floatDuration,
            dominantResource: dominantRes,
            peakAmount: floatPeak,
            advice,
          })
        }
        inFloat = false
      }
    }
  }

  // Final interval check if ended in high float
  if (inFloat) {
    const lastT = resources.at(-1)!.timeSec
    const floatDuration = lastT - floatStart
    if (floatDuration >= 45) {
      intervals.push({
        startSec: floatStart,
        endSec: lastT,
        durationSec: floatDuration,
        dominantResource: dominantRes,
        peakAmount: floatPeak,
        advice: `Floating ~${floatPeak} ${dominantRes} into late match: expand production queue or tech up.`,
      })
    }
  }

  const duration = Math.max(matchDurationSec, resources.at(-1)?.timeSec ?? 1)
  const avgBank = Math.round(totalBankSum / resources.length)
  const highFloatPercentage = duration > 0 ? Math.min(100, Math.round((highFloatSeconds / duration) * 100)) : 0

  const recommendations: string[] = []
  if (highFloatPercentage > 20) {
    recommendations.push(
      `Resources were banked over threshold for ${highFloatPercentage}% of the game duration. Add extra production buildings earlier.`,
    )
  }
  const woodIntervals = intervals.filter((i) => i.dominantResource === 'wood')
  if (woodIntervals.length > 0) {
    recommendations.push(
      `Recurring Wood Float detected (${woodIntervals.length} times). Shift villagers from wood to food/gold or build additional barracks/stables.`,
    )
  }
  if (peakBank > 2500) {
    recommendations.push(
      `Peak resource bank reached ${peakBank} at ${formatTime(peakBankTimeSec)}. Aim to keep total unspent resources below 1,000 in mid-game.`,
    )
  }

  return {
    playerId: player.playerId,
    playerName: player.name,
    civToken: player.civToken,
    totalGathered,
    totalSpent,
    reinvestmentRatePercent,
    avgBank,
    peakBank,
    peakBankTimeSec,
    highFloatDurationSec: Math.round(highFloatSeconds),
    highFloatPercentage,
    leakageGrade: calculateLeakageGrade(highFloatPercentage, avgBank),
    intervals: intervals.sort((a, b) => b.durationSec - a.durationSec),
    chartPoints,
    recommendations,
  }
}
