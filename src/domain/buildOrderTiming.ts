import { formatDuration, parseDuration } from './format'
import type { BuildOrder } from './buildOrderSchema'

export interface BuildTimingReport {
  totalSteps: number
  timedSteps: number
  untimedSteps: number
  malformedSteps: number
  nonMonotonicSteps: number
  durationSec: number | null
  averageStepSec: number | null
  villagerGrowth: number
}

export interface BuildTimingEstimateOptions {
  /** Fallback gap used when a build has no valid timing anchors. */
  defaultGapSec?: number
}

/** Evaluates schedule coverage without pretending that a build is game telemetry. */
export function evaluateBuildTiming(build: BuildOrder): BuildTimingReport {
  const times: number[] = []
  let malformedSteps = 0
  for (const step of build.build_order) {
    if (!step.time?.trim()) continue
    const seconds = parseDuration(step.time)
    if (seconds == null) malformedSteps += 1
    else times.push(seconds)
  }

  let nonMonotonicSteps = 0
  for (let index = 1; index < times.length; index += 1) {
    if ((times[index] ?? 0) <= (times[index - 1] ?? 0)) nonMonotonicSteps += 1
  }
  const intervals = times.slice(1).map((time, index) => time - (times[index] ?? time))
  const positiveIntervals = intervals.filter((value) => value > 0)

  return {
    totalSteps: build.build_order.length,
    timedSteps: times.length,
    untimedSteps: Math.max(0, build.build_order.length - times.length - malformedSteps),
    malformedSteps,
    nonMonotonicSteps,
    durationSec: times.length > 0 ? Math.max(...times) : null,
    averageStepSec:
      positiveIntervals.length > 0
        ? Math.round(
            positiveIntervals.reduce((sum, value) => sum + value, 0) / positiveIntervals.length,
          )
        : null,
    villagerGrowth:
      build.build_order.length > 1
        ? (build.build_order.at(-1)?.villager_count ?? 0) -
          (build.build_order[0]?.villager_count ?? 0)
        : 0,
  }
}

/** Applies a deliberate schedule offset to valid timestamps and preserves notes/data. */
export function shiftBuildOrderTimes(build: BuildOrder, offsetSec: number): BuildOrder {
  const safeOffset = Number.isFinite(offsetSec) ? offsetSec : 0
  return {
    ...build,
    updatedAt: new Date().toISOString(),
    build_order: build.build_order.map((step) => {
      const seconds = step.time ? parseDuration(step.time) : null
      if (seconds == null) return { ...step }
      return { ...step, time: formatDuration(Math.max(0, seconds + safeOffset)) }
    }),
  }
}

/**
 * Fills missing or malformed step times using the build's existing timing
 * anchors. This deliberately remains an estimate: it interpolates author
 * checkpoints and does not simulate villagers, resources, or game telemetry.
 */
export function estimateBuildOrderTimes(
  build: BuildOrder,
  options: BuildTimingEstimateOptions = {},
): BuildOrder {
  const fallback = Number.isFinite(options.defaultGapSec) && (options.defaultGapSec ?? 0) > 0
    ? Math.round(options.defaultGapSec as number)
    : 15
  const rawTimes = build.build_order.map((step) => (step.time ? parseDuration(step.time) : null))
  const intervals: number[] = []
  for (let index = 1; index < rawTimes.length; index += 1) {
    const previous = rawTimes[index - 1]
    const current = rawTimes[index]
    if (previous != null && current != null && current > previous) intervals.push(current - previous)
  }
  intervals.sort((a, b) => a - b)
  const middle = Math.floor(intervals.length / 2)
  const cadence = intervals.length
    ? intervals.length % 2 === 0
      ? Math.round(((intervals[middle - 1] ?? fallback) + (intervals[middle] ?? fallback)) / 2)
      : intervals[middle] ?? fallback
    : fallback
  const estimated: number[] = Array.from({ length: rawTimes.length }, () => 0)

  for (let index = 0; index < rawTimes.length; index += 1) {
    const time = rawTimes[index]
    if (time != null) estimated[index] = Math.max(0, Math.round(time))
  }

  let index = 0
  while (index < rawTimes.length) {
    if (rawTimes[index] != null) {
      index += 1
      continue
    }
    const start = index
    while (index < rawTimes.length && rawTimes[index] == null) index += 1
    const end = index
    const before = start > 0 && rawTimes[start - 1] != null ? estimated[start - 1] : null
    const after = end < rawTimes.length && rawTimes[end] != null ? estimated[end] : null

    if (before != null && after != null) {
      let previous = before
      const count = end - start
      for (let offset = 0; offset < count; offset += 1) {
        const remaining = count - offset
        const ideal = Math.round(before + ((after - before) * (offset + 1)) / (count + 1))
        const value = Math.min(after - remaining, Math.max(previous + 1, ideal))
        estimated[start + offset] = Math.max(0, value)
        previous = estimated[start + offset] ?? previous
      }
    } else if (before != null) {
      for (let offset = 0; offset < end - start; offset += 1) {
        estimated[start + offset] = before + cadence * (offset + 1)
      }
    } else if (after != null) {
      for (let offset = end - start - 1; offset >= 0; offset -= 1) {
        estimated[start + offset] = Math.max(0, after - cadence * (end - start - offset))
      }
    } else {
      for (let offset = start; offset < end; offset += 1) {
        estimated[offset] = cadence * offset
      }
    }
  }

  return {
    ...build,
    updatedAt: new Date().toISOString(),
    build_order: build.build_order.map((step, stepIndex) => ({
      ...step,
      time: formatDuration(estimated[stepIndex] ?? 0),
    })),
  }
}
