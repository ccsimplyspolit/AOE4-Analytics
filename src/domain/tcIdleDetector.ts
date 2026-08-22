/**
 * Town Center Idle Time Detector (pure domain logic).
 *
 * Evaluates villager production continuity and Town Center uptime across game ages
 * (Dark Age / Feudal Age / Castle Age / Imperial Age). Calculates exact idle intervals,
 * accounting for multiple Town Centers and age milestones, and estimates the economic
 * impact (lost villagers and lost resource gathering potential).
 */

import type { BuildEvent, PlayerSummary } from './statsSummary'

export interface TcIdleWindow {
  startSec: number
  endSec: number
  durationSec: number
  age: 'dark' | 'feudal' | 'castle' | 'imperial'
  contextLabel: string
}

export interface AgeTcPerformance {
  age: 'dark' | 'feudal' | 'castle' | 'imperial'
  ageLabel: string
  startSec: number
  endSec: number
  durationSec: number
  villagersTrained: number
  idleSec: number
  uptimePercent: number
  longestGapSec: number
  idleWindowsCount: number
}

export interface TcIdleReport {
  playerId: number
  playerName: string | null
  civToken: string | null
  totalDurationSec: number
  totalVillagersTrained: number
  totalIdleSec: number
  overallUptimePercent: number
  first15MinIdleSec: number
  first15MinUptimePercent: number
  lostVillagersTotal: number
  estimatedLostResources: number
  performanceGrade: 'S' | 'A' | 'B' | 'C' | 'D'
  ages: AgeTcPerformance[]
  idleWindows: TcIdleWindow[]
  majorIdleWarnings: string[]
}

const VILLAGER_TRAIN_TIME_SEC = 20
const MIN_IDLE_GAP_THRESHOLD_SEC = 25 // 20s train time + 5s tolerance

function isVillagerEvent(event: BuildEvent): boolean {
  if (event.category !== 'unit') return false
  const bp = (event.blueprint || '').toLowerCase()
  const name = (event.name || '').toLowerCase()
  return bp.includes('unit_villager') || name.includes('villager') || bp.includes('settler')
}

function isTownCenterEvent(event: BuildEvent): boolean {
  if (event.category !== 'building') return false
  const bp = (event.blueprint || '').toLowerCase()
  const name = (event.name || '').toLowerCase()
  return bp.includes('town_center') || name.includes('town center')
}

function classifyAge(
  timeSec: number,
  age2Sec: number | null,
  age3Sec: number | null,
  age4Sec: number | null,
): 'dark' | 'feudal' | 'castle' | 'imperial' {
  if (age4Sec != null && timeSec >= age4Sec) return 'imperial'
  if (age3Sec != null && timeSec >= age3Sec) return 'castle'
  if (age2Sec != null && timeSec >= age2Sec) return 'feudal'
  return 'dark'
}

function formatContextLabel(startSec: number, age: 'dark' | 'feudal' | 'castle' | 'imperial'): string {
  const m = Math.floor(startSec / 60)
  const s = String(Math.floor(startSec % 60)).padStart(2, '0')
  const timeStr = `${m}:${s}`
  if (age === 'dark' && startSec < 180) return `Early Dark Age (${timeStr})`
  if (age === 'dark') return `Age II Transition (${timeStr})`
  if (age === 'feudal' && startSec < 360) return `Early Feudal Age (${timeStr})`
  if (age === 'feudal') return `Mid Feudal Age (${timeStr})`
  if (age === 'castle') return `Castle Age Macro (${timeStr})`
  return `Imperial Age (${timeStr})`
}

function calculateGrade(uptime15Min: number): 'S' | 'A' | 'B' | 'C' | 'D' {
  if (uptime15Min >= 95) return 'S'
  if (uptime15Min >= 88) return 'A'
  if (uptime15Min >= 78) return 'B'
  if (uptime15Min >= 65) return 'C'
  return 'D'
}

/**
 * Analyzes Town Center production and idle time from a player summary.
 */
export function analyzeTcIdleTime(player: PlayerSummary, matchDurationSec = 0): TcIdleReport {
  const duration = Math.max(
    matchDurationSec,
    player.resources.at(-1)?.timeSec ?? 0,
    player.scores.at(-1)?.timeSec ?? 0,
    player.buildOrder.at(-1)?.timeSec ?? 0,
  )

  const age2 = player.totals?.age2Sec ?? null
  const age3 = player.totals?.age3Sec ?? null
  const age4 = player.totals?.age4Sec ?? null

  const villagerEvents = player.buildOrder.filter(isVillagerEvent).sort((a, b) => a.timeSec - b.timeSec)
  const tcBuildEvents = player.buildOrder.filter(isTownCenterEvent).sort((a, b) => a.timeSec - b.timeSec)

  const idleWindows: TcIdleWindow[] = []
  let prevTime = 0

  for (let i = 0; i < villagerEvents.length; i++) {
    const currentEvent = villagerEvents[i]!
    const currentTime = currentEvent.timeSec
    const gap = currentTime - prevTime

    // Check how many TCs were active during this gap
    const activeTcs = 1 + tcBuildEvents.filter((tc) => tc.timeSec <= prevTime).length
    const expectedTrainWindow = VILLAGER_TRAIN_TIME_SEC / activeTcs

    if (gap > expectedTrainWindow + 5 && prevTime > 0) {
      const idleDuration = gap - expectedTrainWindow
      const age = classifyAge(prevTime, age2, age3, age4)
      idleWindows.push({
        startSec: Math.round(prevTime),
        endSec: Math.round(currentTime),
        durationSec: Math.round(idleDuration),
        age,
        contextLabel: formatContextLabel(prevTime, age),
      })
    }
    prevTime = currentTime
  }

  // Trailing gap until match end (if game is still in early/mid macro, e.g. < 25 min)
  if (duration > prevTime + MIN_IDLE_GAP_THRESHOLD_SEC && prevTime > 0) {
    const trailingIdle = duration - prevTime - VILLAGER_TRAIN_TIME_SEC
    if (trailingIdle > 10) {
      const age = classifyAge(prevTime, age2, age3, age4)
      idleWindows.push({
        startSec: Math.round(prevTime),
        endSec: Math.round(duration),
        durationSec: Math.round(trailingIdle),
        age,
        contextLabel: formatContextLabel(prevTime, age),
      })
    }
  }

  // Group performance by Age
  const ageBoundaries: { age: 'dark' | 'feudal' | 'castle' | 'imperial'; label: string; start: number; end: number }[] = [
    {
      age: 'dark',
      label: 'Dark Age (I)',
      start: 0,
      end: age2 != null ? age2 : duration,
    },
  ]

  if (age2 != null) {
    ageBoundaries.push({
      age: 'feudal',
      label: 'Feudal Age (II)',
      start: age2,
      end: age3 != null ? age3 : duration,
    })
  }

  if (age3 != null) {
    ageBoundaries.push({
      age: 'castle',
      label: 'Castle Age (III)',
      start: age3,
      end: age4 != null ? age4 : duration,
    })
  }

  if (age4 != null) {
    ageBoundaries.push({
      age: 'imperial',
      label: 'Imperial Age (IV)',
      start: age4,
      end: duration,
    })
  }

  const ages: AgeTcPerformance[] = ageBoundaries.map((b) => {
    const ageDuration = Math.max(1, b.end - b.start)
    const ageVills = villagerEvents.filter((v) => v.timeSec >= b.start && v.timeSec < b.end).length
    const ageIdleWindows = idleWindows.filter((w) => w.startSec >= b.start && w.startSec < b.end)
    const idleSec = ageIdleWindows.reduce((acc, w) => acc + w.durationSec, 0)
    const longestGap = ageIdleWindows.reduce((acc, w) => Math.max(acc, w.durationSec), 0)
    const uptimePercent = Math.max(0, Math.min(100, Math.round(((ageDuration - idleSec) / ageDuration) * 100)))

    return {
      age: b.age,
      ageLabel: b.label,
      startSec: b.start,
      endSec: b.end,
      durationSec: Math.round(ageDuration),
      villagersTrained: ageVills,
      idleSec: Math.round(idleSec),
      uptimePercent,
      longestGapSec: Math.round(longestGap),
      idleWindowsCount: ageIdleWindows.length,
    }
  })

  const totalIdleSec = idleWindows.reduce((acc, w) => acc + w.durationSec, 0)
  const overallUptimePercent = duration > 0 ? Math.max(0, Math.min(100, Math.round(((duration - totalIdleSec) / duration) * 100))) : 100

  // 15-minute standard benchmark
  const first15MinDuration = Math.min(duration, 900)
  const first15MinIdle = idleWindows
    .filter((w) => w.startSec < 900)
    .reduce((acc, w) => {
      const windowIn15 = Math.min(w.endSec, 900) - w.startSec
      return acc + Math.max(0, windowIn15)
    }, 0)
  const first15MinUptimePercent =
    first15MinDuration > 0
      ? Math.max(0, Math.min(100, Math.round(((first15MinDuration - first15MinIdle) / first15MinDuration) * 100)))
      : 100

  const lostVillagersTotal = Math.round(totalIdleSec / VILLAGER_TRAIN_TIME_SEC)
  // Each lost villager costs roughly ~40 resources gathered per minute for an average remaining match time
  const avgRemainingMinutes = Math.max(2, (duration - 300) / 120)
  const estimatedLostResources = Math.round(lostVillagersTotal * 40 * avgRemainingMinutes)

  const warnings: string[] = []
  const feudalAgePerf = ages.find((a) => a.age === 'feudal')
  if (feudalAgePerf && feudalAgePerf.idleSec > 45) {
    warnings.push(`Town Center was idle for ${Math.round(feudalAgePerf.idleSec)}s during Feudal Age (~${Math.round(feudalAgePerf.idleSec / 20)} missed villagers).`)
  }
  const darkAgePerf = ages.find((a) => a.age === 'dark')
  if (darkAgePerf && darkAgePerf.idleSec > 25) {
    warnings.push(`Dark Age TC idle gap of ${Math.round(darkAgePerf.idleSec)}s delayed your Feudal transition.`)
  }

  return {
    playerId: player.playerId,
    playerName: player.name,
    civToken: player.civToken,
    totalDurationSec: Math.round(duration),
    totalVillagersTrained: villagerEvents.length,
    totalIdleSec: Math.round(totalIdleSec),
    overallUptimePercent,
    first15MinIdleSec: Math.round(first15MinIdle),
    first15MinUptimePercent,
    lostVillagersTotal,
    estimatedLostResources,
    performanceGrade: calculateGrade(first15MinUptimePercent),
    ages,
    idleWindows: idleWindows.sort((a, b) => b.durationSec - a.durationSec),
    majorIdleWarnings: warnings,
  }
}
