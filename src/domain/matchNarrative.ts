import type { Signal } from './analysis'
import type {
  AdvancedReviewCheck,
  FirstCauseCheck,
  FirstCauseConclusion,
  FirstCauseReview,
  NextGameGoal,
  ReviewLane,
} from './firstCauseReview'
import type { TurningPoint, TurningPointKind } from './turningPoints'

export interface MatchNarrative {
  turningPoints: TurningPoint[]
  firstCause: FirstCauseConclusion | null
  nextGoal: NextGameGoal | null
  extraChecks: Array<FirstCauseCheck | AdvancedReviewCheck>
  extraSignals: Signal[]
}

const LANE_COVERED_BY: Partial<Record<ReviewLane, TurningPointKind[]>> = {
  opening: ['villager-gap', 'age-up'],
  spending: ['resource-bank'],
  conversion: ['score-swing', 'score-lane', 'resource-swing'],
  reaction: ['unit-milestone'],
  'resource-bottleneck': ['resource-bank', 'resource-swing'],
  'first-fight': ['unit-milestone'],
  'post-fight-reset': ['score-swing', 'unit-milestone'],
}

const SIGNAL_COVERED_BY_KIND: Record<string, TurningPointKind[]> = {
  'sum-tc-idle': ['villager-gap'],
  'sum-vills-behind': ['villager-gap'],
  'sum-age2-late': ['age-up'],
  'sum-age2-behind': ['age-up'],
  'sum-age2-ahead': ['age-up'],
  'sum-resource-float': ['resource-bank'],
  'sum-eco-behind': ['resource-swing'],
  'sum-eco-ahead': ['resource-swing'],
  'sum-opening-unit-late': ['unit-milestone'],
  'sum-unit-cadence': ['unit-milestone'],
  'cmp-production-low': ['unit-milestone'],
  'cmp-production-high': ['unit-milestone'],
}

const SIGNAL_COVERED_BY_LANE: Record<string, ReviewLane[]> = {
  'sum-tc-idle': ['opening'],
  'sum-vills-behind': ['opening'],
  'sum-age2-late': ['opening'],
  'sum-age2-behind': ['opening'],
  'sum-age2-ahead': ['opening'],
  'sum-resource-float': ['spending', 'resource-bottleneck'],
  'sum-eco-behind': ['conversion'],
  'sum-eco-ahead': ['conversion'],
  'sum-opening-unit-late': ['reaction', 'first-fight'],
  'sum-first-pressure': ['reaction', 'first-fight'],
  'sum-pressure-response': ['reaction', 'post-fight-reset'],
  'sum-unit-cadence': ['spending'],
}

/**
 * Fold turning points, first-cause checks, and coaching signals into one story
 * so the match page does not repeat the same villager-gap / bank / age-up fact.
 */
export function composeMatchNarrative(input: {
  turningPoints: TurningPoint[]
  review: FirstCauseReview | null
  signals: Signal[]
}): MatchNarrative {
  const kinds = new Set(input.turningPoints.map((point) => point.kind))
  const extraChecks = (input.review ? [...input.review.checks, ...input.review.advancedChecks] : []).filter(
    (check) => isUniqueCheck(check, kinds),
  )
  const flaggedLanes = new Set(extraChecks.map((check) => check.lane))
  if (input.review?.firstCause) flaggedLanes.add(input.review.firstCause.lane)

  const extraSignals = input.signals.filter(
    (signal) => !isCoveredSignal(signal.id, kinds, flaggedLanes),
  )

  return {
    turningPoints: input.turningPoints,
    firstCause: input.review?.firstCause ?? null,
    nextGoal: input.review?.nextGoal ?? null,
    extraChecks,
    extraSignals,
  }
}

function isUniqueCheck(
  check: FirstCauseCheck | AdvancedReviewCheck,
  kinds: Set<TurningPointKind>,
): boolean {
  if (check.status === 'clear' || check.status === 'unavailable') return false
  const coveredBy = LANE_COVERED_BY[check.lane]
  if (!coveredBy) return true
  return !coveredBy.some((kind) => kinds.has(kind))
}

function isCoveredSignal(
  signalId: string,
  kinds: Set<TurningPointKind>,
  flaggedLanes: Set<ReviewLane>,
): boolean {
  const byKind = SIGNAL_COVERED_BY_KIND[signalId]
  if (byKind?.some((kind) => kinds.has(kind))) return true
  const byLane = SIGNAL_COVERED_BY_LANE[signalId]
  if (byLane?.some((lane) => flaggedLanes.has(lane))) return true
  return false
}
