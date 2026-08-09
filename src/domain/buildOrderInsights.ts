import { parseDuration } from './format'
import type { BuildAgeTiming, BuildOrder, BuildStep } from './buildOrderSchema'
import { estimateBuildOrderTimes } from './buildOrderTiming'

export const BUILD_ECONOMY_RESOURCES = ['food', 'wood', 'gold', 'stone', 'builder'] as const
export type BuildEconomyResource = (typeof BUILD_ECONOMY_RESOURCES)[number]

export interface BuildEconomyPoint {
  seconds: number
  stepIndex: number
  statedTime: boolean
  values: Record<BuildEconomyResource, number>
}

export interface BuildOrderInsights {
  ageTimings: BuildAgeTiming[]
  economy: BuildEconomyPoint[]
  durationSec: number | null
}

interface ParsedStepTime {
  seconds: number
  derived: boolean
}

function stepTime(step: BuildStep): ParsedStepTime | null {
  if (!step.time) return null
  const seconds = parseDuration(step.time)
  if (seconds == null) return null
  return { seconds, derived: step.timeProvenance === 'derived' || /[~≈]/.test(step.time) }
}

function emptyValues(): Record<BuildEconomyResource, number> {
  return { food: 0, wood: 0, gold: 0, stone: 0, builder: 0 }
}

function valuesFor(step: BuildStep): Record<BuildEconomyResource, number> {
  return {
    food: Math.max(0, Number(step.resources.food) || 0),
    wood: Math.max(0, Number(step.resources.wood) || 0),
    gold: Math.max(0, Number(step.resources.gold) || 0),
    stone: Math.max(0, Number(step.resources.stone) || 0),
    builder: Math.max(0, Number(step.resources.builder) || 0),
  }
}

function hasEconomy(values: Record<BuildEconomyResource, number>): boolean {
  return BUILD_ECONOMY_RESOURCES.some((resource) => values[resource] > 0)
}

function sameValues(
  left: Record<BuildEconomyResource, number>,
  right: Record<BuildEconomyResource, number>,
): boolean {
  return BUILD_ECONOMY_RESOURCES.every((resource) => left[resource] === right[resource])
}

/** Derives AoE4Guides-style age arrival markers from the normalized flat order. */
export function deriveBuildAgeTimings(build: BuildOrder): BuildAgeTiming[] {
  if (build.ageTimings?.length) return build.ageTimings

  const timings: BuildAgeTiming[] = []
  let previousAge = 1
  build.build_order.forEach((step, stepIndex) => {
    const nextAge = Math.min(4, Math.max(previousAge, Math.floor(step.age)))
    const timing = stepTime(step)
    if (timing && nextAge > previousAge) {
      for (let age = previousAge + 1; age <= nextAge; age += 1) {
        timings.push({ age: age as 2 | 3 | 4, seconds: timing.seconds, derived: timing.derived, stepIndex })
      }
    }
    previousAge = nextAge
  })
  return timings
}

/**
 * Builds the small, evidence-preserving timeline used by the guide viewer.
 * Blank/zero resource rows do not become fake economy collapses, and repeated
 * distributions are collapsed just like the upstream guide timeline does.
 */
export function deriveBuildOrderInsights(build: BuildOrder): BuildOrderInsights {
  const hasAnchor = build.build_order.some((step) => stepTime(step) != null)
  const hasMissingTimes = build.build_order.some((step) => !stepTime(step))
  // Match the upstream resolver's useful case: fill gaps only when the author
  // gave at least one clock anchor. A completely prose-only build stays
  // untimed instead of receiving a fabricated 15-second cadence.
  const resolved = hasAnchor && hasMissingTimes ? estimateBuildOrderTimes(build) : build
  const ageTimings = deriveBuildAgeTimings({ ...resolved, ageTimings: undefined })
  const economy: BuildEconomyPoint[] = []
  let previousValues: Record<BuildEconomyResource, number> | null = null
  let durationSec: number | null = null

  resolved.build_order.forEach((step, stepIndex) => {
    const parsed = stepTime(step)
    if (parsed) durationSec = Math.max(durationSec ?? 0, parsed.seconds)
    const values = valuesFor(step)
    if (!parsed || !hasEconomy(values)) return
    if (previousValues && sameValues(previousValues, values)) return
    economy.push({
      seconds: parsed.seconds,
      stepIndex,
      statedTime: !parsed.derived,
      values,
    })
    previousValues = values
  })

  return { ageTimings, economy, durationSec }
}

export function buildEconomyMax(points: BuildEconomyPoint[]): number {
  return Math.max(1, ...points.flatMap((point) => BUILD_ECONOMY_RESOURCES.map((resource) => point.values[resource])))
}

export function buildEconomyPoints(
  points: BuildEconomyPoint[],
  resource: BuildEconomyResource,
  scaleSeconds: number,
  maxValue: number,
): string {
  if (!points.length || scaleSeconds <= 0 || maxValue <= 0) return ''
  return points
    .map((point) => {
      const x = Math.min(100, Math.max(0, (point.seconds / scaleSeconds) * 100))
      const y = 34 - (point.values[resource] / maxValue) * 30
      return `${x.toFixed(2)},${Math.max(2, Math.min(34, y)).toFixed(2)}`
    })
    .join(' ')
}

// Kept exported for consumers that want a correctly shaped empty state without
// allocating ad-hoc resource objects in renderer code.
export { emptyValues }
