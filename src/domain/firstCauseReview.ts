import type { PerPlayerMatchStats } from './analysis'
import { deriveMatchReview } from './matchReview'
import { summaryPlayerForMe } from './summaryCoaching'
import type { BuildEvent, MatchSummary, PlayerSummary, ResourceAmounts } from './statsSummary'

export type FirstCauseLane = 'opening' | 'information' | 'reaction' | 'spending' | 'conversion'
export type AdvancedReviewLane =
  'resource-bottleneck' | 'greedy-investment' | 'first-fight' | 'post-fight-reset' | 'team-plan'
export type ReviewLane = FirstCauseLane | AdvancedReviewLane
export type FirstCauseStatus = 'confirmed' | 'review' | 'clear' | 'unavailable'
export type MistakeCategory = 'mechanics' | 'information' | 'decision' | 'execution-under-pressure'

interface ReviewCheckCore {
  status: FirstCauseStatus
  title: string
  observed: string
  takeaway: string
  /** The earliest evidence timestamp for this check, when a timeline exposed one. */
  timeSec: number | null
  startTimeSec: number | null
  guideSlug: string
}

export type FirstCauseCheck = ReviewCheckCore & { lane: FirstCauseLane }
export type AdvancedReviewCheck = ReviewCheckCore & { lane: AdvancedReviewLane }

export interface NextGameGoal {
  category: MistakeCategory
  trigger: string
  action: string
}

export interface FirstCauseConclusion {
  lane: ReviewLane
  category: MistakeCategory
  timeSec: number
  rationale: string
}

export interface FirstCauseReview {
  checks: FirstCauseCheck[]
  /** Extra guide-derived checks that need more context than the five-step loop. */
  advancedChecks: AdvancedReviewCheck[]
  /** The earliest actionable signal, not a claim that it alone lost the game. */
  firstCause: FirstCauseConclusion | null
  nextGoal: NextGameGoal
}

export interface FirstCauseReviewInput {
  summary: MatchSummary
  myProfileId: number | null
  myCiv: string | null
  myPlayerId?: number | null
  perPlayer?: PerPlayerMatchStats[]
  feudalTargetSec?: number | null
}

interface TimedGap {
  startTimeSec: number
  endTimeSec: number
  durationSec: number
}

interface TimedBank {
  timeSec: number
  total: number
}

interface TimedChange {
  startTimeSec: number
  endTimeSec: number
  change: number
}

const VILLAGER_GAP_SEC = 35
const MILITARY_UNIT_GAP_SEC = 75
const OPENING_WINDOW_SEC = 7 * 60
const RESOURCE_BANK_FOR_REVIEW = 1_200
const PAIRED_BANK_FOR_REVIEW = 800
const SCORE_SWING_FOR_REVIEW = 200
const RESOURCE_DROP_FOR_REVIEW = 250
const HIGH_BANK_RESOURCE = 800
const LOW_BANK_RESOURCE = 250
const HIGH_STONE_BANK = 300
const HIGH_TOTAL_BANK = 1_800
const INVESTMENT_FOLLOW_UP_SEC = 120
const FIRST_FIGHT_MIN_UNITS = 3
const TEAM_TIMING_SPREAD_SEC = 90

const LANE_GUIDES: Record<FirstCauseLane, string> = {
  opening: 'first-ten-minutes',
  information: 'adaptive-scouting',
  reaction: 'defending-early-pressure',
  spending: 'economy-fundamentals',
  conversion: 'map-control-resource-safety',
}

const ADVANCED_LANE_GUIDES: Record<AdvancedReviewLane, string> = {
  'resource-bottleneck': 'economy-fundamentals',
  'greedy-investment': 'build-order-reading',
  'first-fight': 'when-to-attack',
  'post-fight-reset': 'map-control-resource-safety',
  'team-plan': 'team-game-roles',
}

/**
 * Applies the replay-review loop to decoded post-game evidence. The summary
 * records outcomes and timelines, not camera vision or player intent, so an
 * unavailable / review status is intentional: this function never invents a
 * scouting report, production queue, or fight result that was not recorded.
 */
export function deriveFirstCauseReview(input: FirstCauseReviewInput): FirstCauseReview | null {
  const me = summaryPlayerForMe(input.summary, input.myProfileId, input.myCiv, input.myPlayerId)
  if (!me) return null

  const opponent =
    input.summary.players.length === 2
      ? (input.summary.players.find((player) => player.playerId !== me.playerId) ?? null)
      : null
  const matchReview = deriveMatchReview(
    input.summary,
    input.myProfileId,
    input.myCiv,
    input.perPlayer ?? [],
    input.myPlayerId,
  )
  const enemyProduction = opponent ? firstMilitaryBuilding(opponent) : null
  const ownProduction = firstMilitaryBuilding(me)

  const checks = [
    openingCheck(me, opponent, input.feudalTargetSec ?? null),
    informationCheck(opponent, enemyProduction),
    reactionCheck(me, enemyProduction, ownProduction, matchReview?.pressure ?? null),
    spendingCheck(me),
    conversionCheck(me, opponent),
  ]
  const advancedChecks: AdvancedReviewCheck[] = [
    resourceBottleneckCheck(me),
    greedyInvestmentCheck(me, opponent),
    firstFightCheck(me, opponent, matchReview?.pressure ?? null),
    postFightResetCheck(me, matchReview?.pressure ?? null),
    ...(isTeamSummary(input.summary, input.perPlayer ?? [])
      ? [teamPlanCheck(input.summary, me, input.perPlayer ?? [])]
      : []),
  ]

  const firstCheck = [...checks, ...advancedChecks]
    .filter((check) => check.status === 'confirmed' || check.status === 'review')
    .filter((check) => check.timeSec != null)
    .sort((left, right) => (left.timeSec ?? Infinity) - (right.timeSec ?? Infinity))[0]
  const firstCause =
    firstCheck?.timeSec != null
      ? {
          lane: firstCheck.lane,
          category: categoryFor(firstCheck.lane, firstCheck),
          timeSec: firstCheck.timeSec,
          rationale: firstCheck.takeaway,
        }
      : null

  return {
    checks,
    advancedChecks,
    firstCause,
    nextGoal: goalFor(firstCause),
  }
}

function openingCheck(
  me: PlayerSummary,
  opponent: PlayerSummary | null,
  feudalTargetSec: number | null,
): FirstCauseCheck {
  const villagerGap = earliestGap(villagerCompletionTimes(me), VILLAGER_GAP_SEC, OPENING_WINDOW_SEC)
  const myAge2 = validTime(me.totals?.age2Sec)
  const enemyAge2 = validTime(opponent?.totals?.age2Sec)
  const buildDelay =
    myAge2 != null && feudalTargetSec != null && myAge2 - feudalTargetSec > 45
      ? myAge2 - feudalTargetSec
      : null
  const opponentDelay =
    myAge2 != null && enemyAge2 != null && myAge2 - enemyAge2 > 60 ? myAge2 - enemyAge2 : null

  if (villagerGap) {
    return check('opening', 'confirmed', 'Opening health', {
      observed: `No villager completion was recorded for ${time(villagerGap.durationSec)}, from ${time(villagerGap.startTimeSec)} to ${time(villagerGap.endTimeSec)}.`,
      takeaway:
        'This is the earliest concrete opening checkpoint to inspect. The timeline cannot distinguish a housing block, idle Town Center, or an incomplete event stream.',
      timeSec: villagerGap.startTimeSec,
      startTimeSec: villagerGap.startTimeSec,
    })
  }
  if (buildDelay != null && myAge2 != null && feudalTargetSec != null) {
    return check('opening', 'confirmed', 'Opening health', {
      observed: `Feudal completed at ${time(myAge2)}, ${time(buildDelay)} after the selected build target of ${time(feudalTargetSec)}.`,
      takeaway:
        'Replay the opening before this age-up and name the first realistic cause: villager rhythm, worker travel, an unsafe resource, or a defensive spend.',
      timeSec: myAge2,
      startTimeSec: null,
    })
  }
  if (opponentDelay != null && myAge2 != null && enemyAge2 != null) {
    return check('opening', 'review', 'Opening health', {
      observed: `You reached Feudal at ${time(myAge2)}, ${time(opponentDelay)} after the opponent at ${time(enemyAge2)}.`,
      takeaway:
        'This is a timing difference, not proof of an error. Check whether the slower age-up was intentional and survivable for the matchup.',
      timeSec: myAge2,
      startTimeSec: null,
    })
  }
  if (villagerCompletionTimes(me).length >= 2 || myAge2 != null) {
    return check('opening', 'clear', 'Opening health', {
      observed:
        'The decoded opening has no early villager-production gap or late Feudal checkpoint above the review threshold.',
      takeaway:
        'Housing blocks and worker walking are not recorded directly; use the replay camera if either still looks suspicious.',
      timeSec: null,
      startTimeSec: null,
    })
  }
  return check('opening', 'unavailable', 'Opening health', {
    observed: 'No usable villager-production or age-up timeline was decoded for this player.',
    takeaway:
      'Check the replay manually for Town Center idle time, housing blocks, and worker travel.',
    timeSec: null,
    startTimeSec: null,
  })
}

function informationCheck(
  opponent: PlayerSummary | null,
  enemyProduction: BuildEvent | null,
): FirstCauseCheck {
  if (!opponent) {
    return check('information', 'unavailable', 'Information', {
      observed:
        'This is a team or incomplete summary, so no single opponent timeline is safe to compare.',
      takeaway:
        'Review your scout route and identify the first enemy production or expansion clue you needed.',
      timeSec: null,
      startTimeSec: null,
    })
  }
  if (enemyProduction) {
    return check('information', 'unavailable', 'Information', {
      observed: `The opponent's first recorded military building was ${enemyProduction.name} at ${time(enemyProduction.timeSec)}. The summary does not record what you had vision of.`,
      takeaway:
        'Rewatch the 30 seconds before this point: did your scout see the building or another clue, and did that information change your plan?',
      timeSec: enemyProduction.timeSec,
      startTimeSec: null,
    })
  }
  return check('information', 'unavailable', 'Information', {
    observed: 'No opponent military-production event was decoded from the summary.',
    takeaway:
      'The replay summary cannot prove whether you scouted. Use the replay to record the first clue you missed or acted on.',
    timeSec: null,
    startTimeSec: null,
  })
}

function reactionCheck(
  me: PlayerSummary,
  enemyProduction: BuildEvent | null,
  ownProduction: BuildEvent | null,
  pressure: {
    myFirstMilitaryLossTimeSec: number | null
    firstEnemyMilitaryLossCausedTimeSec: number | null
    responseLagSec: number | null
  } | null,
): FirstCauseCheck {
  if (
    pressure?.responseLagSec != null &&
    pressure.responseLagSec >= 90 &&
    pressure.myFirstMilitaryLossTimeSec != null &&
    pressure.firstEnemyMilitaryLossCausedTimeSec != null
  ) {
    return check('reaction', 'review', 'Reaction', {
      observed: `Your first recorded military loss was at ${time(pressure.myFirstMilitaryLossTimeSec)}; the first enemy military loss attributed to you was at ${time(pressure.firstEnemyMilitaryLossCausedTimeSec)} (${time(pressure.responseLagSec)} later).`,
      takeaway:
        'Review this interval for the smallest response that was available: counter units, safer workers, a defensive rally, or disengaging. The casualty stream does not prove why the gap occurred.',
      timeSec: pressure.myFirstMilitaryLossTimeSec,
      startTimeSec: null,
    })
  }
  if (enemyProduction && ownProduction && ownProduction.timeSec - enemyProduction.timeSec > 90) {
    const delay = ownProduction.timeSec - enemyProduction.timeSec
    return check('reaction', 'review', 'Reaction', {
      observed: `The opponent's ${enemyProduction.name} completed at ${time(enemyProduction.timeSec)}; your first recorded military building, ${ownProduction.name}, completed ${time(delay)} later.`,
      takeaway:
        'This is a timing checkpoint, not proof that you saw the building. Rewatch the interval and decide whether an earlier counter, safer resource placement, or different spend was realistic.',
      timeSec: enemyProduction.timeSec,
      startTimeSec: null,
    })
  }
  if (me.buildOrder.length > 0) {
    return check('reaction', 'clear', 'Reaction', {
      observed:
        'No large response-lag signal was confirmed from the decoded casualty and production timelines.',
      takeaway:
        'Use the replay to verify whether your first counter and worker repositioning matched the information you had.',
      timeSec: null,
      startTimeSec: null,
    })
  }
  return check('reaction', 'unavailable', 'Reaction', {
    observed: 'No usable casualty or production timeline was decoded for a response check.',
    takeaway:
      'Review the first pressure window manually and record what you saw, then what you did.',
    timeSec: null,
    startTimeSec: null,
  })
}

function spendingCheck(me: PlayerSummary): FirstCauseCheck {
  const bank = largestBank(me)
  if (!bank) {
    return check('spending', 'unavailable', 'Spending', {
      observed: 'No resource-bank timeline was decoded for this player.',
      takeaway:
        'Use the replay or post-game graph to look for a bank while production or upgrades were missing.',
      timeSec: null,
      startTimeSec: null,
    })
  }
  const pairedGap = militaryUnitGaps(me).find(
    (gap) =>
      gap.durationSec >= MILITARY_UNIT_GAP_SEC &&
      bank.timeSec >= gap.startTimeSec &&
      bank.timeSec <= gap.endTimeSec &&
      bank.total >= PAIRED_BANK_FOR_REVIEW,
  )
  if (pairedGap) {
    return check('spending', 'review', 'Spending', {
      observed: `Your bank was ${whole(bank.total)} at ${time(bank.timeSec)} during a ${time(pairedGap.durationSec)} gap between recorded military-unit completions.`,
      takeaway:
        'Inspect this window before calling it idle production: the summary cannot identify individual queues. If the bank was not an intentional age-up or tech save, practise spending before the next fight.',
      timeSec: Math.min(bank.timeSec, pairedGap.startTimeSec),
      startTimeSec: pairedGap.startTimeSec,
    })
  }
  if (bank.total >= RESOURCE_BANK_FOR_REVIEW) {
    return check('spending', 'review', 'Spending', {
      observed: `The largest recorded resource bank was ${whole(bank.total)} at ${time(bank.timeSec)}.`,
      takeaway:
        'A bank may be an intentional age-up or technology save. Verify the intended spend; if there was none, make production capacity or unit queues the next correction.',
      timeSec: bank.timeSec,
      startTimeSec: null,
    })
  }
  return check('spending', 'clear', 'Spending', {
    observed: `The largest decoded resource bank was ${whole(bank.total)} at ${time(bank.timeSec)}, below the review threshold.`,
    takeaway:
      'This does not prove spending was perfect, but no large bank is visible in the available samples.',
    timeSec: null,
    startTimeSec: null,
  })
}

function conversionCheck(me: PlayerSummary, opponent: PlayerSummary | null): FirstCauseCheck {
  if (!opponent) {
    return check('conversion', 'unavailable', 'Conversion', {
      observed:
        'A team summary cannot safely attribute a score or resource swing to one opponent interaction.',
      takeaway:
        'After the next successful team fight, name one shared conversion: a resource, production, expansion, relic, trade route, or map objective.',
      timeSec: null,
      startTimeSec: null,
    })
  }
  const positiveSwing = largestPositiveScoreSwing(me, opponent)
  if (!positiveSwing) {
    return check('conversion', 'unavailable', 'Conversion', {
      observed: 'No shared score-timeline swing large enough to review was decoded.',
      takeaway:
        'The summary cannot show whether you converted a fight. Review the first advantage or defence manually and ask what it bought you next.',
      timeSec: null,
      startTimeSec: null,
    })
  }
  const resourceFall = resourceGapFallAfter(me, opponent, positiveSwing.endTimeSec)
  if (resourceFall && resourceFall.change <= -RESOURCE_DROP_FOR_REVIEW) {
    return check('conversion', 'review', 'Conversion', {
      observed: `The score gap improved by ${whole(positiveSwing.change)} in your favour from ${time(positiveSwing.startTimeSec)} to ${time(positiveSwing.endTimeSec)}, then the gathered-resource gap moved ${whole(Math.abs(resourceFall.change))} against you by ${time(resourceFall.endTimeSec)}.`,
      takeaway:
        'This is a possible conversion window, not proof that a fight was won. Rewatch it and test one follow-up: secure food, take space, add production, expand, or age up.',
      timeSec: positiveSwing.endTimeSec,
      startTimeSec: positiveSwing.startTimeSec,
    })
  }
  return check('conversion', 'clear', 'Conversion', {
    observed: `A positive score shift was recorded from ${time(positiveSwing.startTimeSec)} to ${time(positiveSwing.endTimeSec)}, but the following resource samples do not show a clear lost-conversion pattern.`,
    takeaway:
      'Total score is not a fight log. Use the replay to decide whether that window should have become a map or economic advantage.',
    timeSec: null,
    startTimeSec: null,
  })
}

function resourceBottleneckCheck(me: PlayerSummary): AdvancedReviewCheck {
  const points = [...me.resources]
    .filter((point) => validTime(point.timeSec) != null)
    .sort((left, right) => left.timeSec - right.timeSec)
  if (points.length === 0) {
    return advancedCheck('resource-bottleneck', 'unavailable', 'Resource bottleneck', {
      observed: 'No resource-bank timeline was decoded for this player.',
      takeaway:
        'Use the replay economy graph to identify which resource stopped the next useful action.',
      timeSec: null,
      startTimeSec: null,
    })
  }

  for (const point of points) {
    const { food, wood, gold, stone } = point.bank
    const total = resourceTotal(point.bank)
    const followUp = eventsAfter(me, point.timeSec, INVESTMENT_FOLLOW_UP_SEC)
    if (food >= HIGH_BANK_RESOURCE && wood <= LOW_BANK_RESOURCE && food - wood >= 600) {
      return advancedCheck('resource-bottleneck', 'review', 'Resource bottleneck', {
        observed: `At ${time(point.timeSec)} the bank held ${whole(food)} food but only ${whole(wood)} wood.`,
        takeaway:
          'This pattern can delay houses, farms, ranged production, or a second military building. Move the next workers before wood becomes the bottleneck; verify the intended unit mix in the replay.',
        timeSec: point.timeSec,
        startTimeSec: null,
      })
    }
    if (wood >= HIGH_BANK_RESOURCE && food <= LOW_BANK_RESOURCE && wood - food >= 600) {
      return advancedCheck('resource-bottleneck', 'review', 'Resource bottleneck', {
        observed: `At ${time(point.timeSec)} the bank held ${whole(wood)} wood but only ${whole(food)} food.`,
        takeaway:
          'This can mean buildings were added before the economy could sustain units, or that food became unsafe. Protect food and align the next workers with the plan instead of adding empty production.',
        timeSec: point.timeSec,
        startTimeSec: null,
      })
    }
    if (gold >= HIGH_BANK_RESOURCE && food + wood <= 600 && !hasMilitaryEvent(followUp)) {
      return advancedCheck('resource-bottleneck', 'review', 'Resource bottleneck', {
        observed: `At ${time(point.timeSec)} the bank held ${whole(gold)} gold while food and wood together were only ${whole(food + wood)}; no military completion followed in the next two minutes.`,
        takeaway:
          'Gold alone does not become an army. Check whether the composition needed more food/wood, another production building, or a different unit choice.',
        timeSec: point.timeSec,
        startTimeSec: null,
      })
    }
    if (stone >= HIGH_STONE_BANK && !followUp.some(isExpansionOrFortification)) {
      return advancedCheck('resource-bottleneck', 'review', 'Resource bottleneck', {
        observed: `At ${time(point.timeSec)} the bank held ${whole(stone)} stone, but no Town Center, keep, or fortification event followed in the next two minutes.`,
        takeaway:
          'Stone is an investment, not a score. If there was no expansion or defensive plan, redirect workers to the next army or age-up resource.',
        timeSec: point.timeSec,
        startTimeSec: null,
      })
    }
    if (total >= HIGH_TOTAL_BANK && followUp.length === 0) {
      return advancedCheck('resource-bottleneck', 'review', 'Resource bottleneck', {
        observed: `The bank reached ${whole(total)} total resources at ${time(point.timeSec)} with no recorded unit, building, or upgrade completion in the next two minutes.`,
        takeaway:
          'A large bank may be intentional saving. Name the age-up, technology, expansion, or army it was funding; otherwise add usable production before the next fight.',
        timeSec: point.timeSec,
        startTimeSec: null,
      })
    }
  }

  const peak = largestBank(me)
  return advancedCheck('resource-bottleneck', 'clear', 'Resource bottleneck', {
    observed:
      peak == null
        ? 'The available resource samples did not expose a usable bottleneck.'
        : `No single-resource imbalance crossed the review threshold; the largest total bank was ${whole(peak.total)} at ${time(peak.timeSec)}.`,
    takeaway:
      'This does not prove the worker split was optimal. Compare each bank with the next 60–90 seconds of intended spending.',
    timeSec: null,
    startTimeSec: null,
  })
}

function greedyInvestmentCheck(
  me: PlayerSummary,
  opponent: PlayerSummary | null,
): AdvancedReviewCheck {
  const townCenters = me.buildOrder
    .filter(
      (event) =>
        event.category === 'building' && /town.?center/i.test(`${event.name} ${event.blueprint}`),
    )
    .sort((left, right) => left.timeSec - right.timeSec)
  const secondTownCenter = townCenters[1]
  if (!secondTownCenter) {
    return advancedCheck('greedy-investment', 'clear', 'Greedy investment', {
      observed: 'No second Town Center completion was decoded for this player.',
      takeaway:
        'If the game contained a fast Castle, keep, or expensive technology instead, compare that investment with the defense and production it delayed.',
      timeSec: null,
      startTimeSec: null,
    })
  }

  const enemyProduction = opponent ? firstMilitaryBuilding(opponent) : null
  const ownUnitsBefore = militaryUnitTimes(me).filter(
    (timeSec) => timeSec <= secondTownCenter.timeSec,
  ).length
  const ownFollowUp = eventsAfter(me, secondTownCenter.timeSec, INVESTMENT_FOLLOW_UP_SEC)
  if (
    enemyProduction &&
    enemyProduction.timeSec <= secondTownCenter.timeSec &&
    ownUnitsBefore < FIRST_FIGHT_MIN_UNITS
  ) {
    return advancedCheck('greedy-investment', 'review', 'Greedy investment', {
      observed: `The second Town Center completed at ${time(secondTownCenter.timeSec)} after the opponent's ${enemyProduction.name} at ${time(enemyProduction.timeSec)}; only ${ownUnitsBefore} military completions were recorded beforehand.`,
      takeaway:
        'This is a risk window, not proof that the Town Center was wrong. Check whether builders, the location, and the next minute were safe against the pressure you had seen.',
      timeSec: secondTownCenter.timeSec,
      startTimeSec: null,
    })
  }
  if (ownUnitsBefore < FIRST_FIGHT_MIN_UNITS && !hasMilitaryEvent(ownFollowUp)) {
    return advancedCheck('greedy-investment', 'review', 'Greedy investment', {
      observed: `The second Town Center completed at ${time(secondTownCenter.timeSec)} with only ${ownUnitsBefore} recorded military completions and no military completion in the following two minutes.`,
      takeaway:
        'Before repeating the investment, name the defensive plan for its construction window and the production that keeps it alive.',
      timeSec: secondTownCenter.timeSec,
      startTimeSec: null,
    })
  }
  return advancedCheck('greedy-investment', 'clear', 'Greedy investment', {
    observed: `The second Town Center completed at ${time(secondTownCenter.timeSec)} after ${ownUnitsBefore} military completions, with follow-up activity recorded.`,
    takeaway:
      'Compare the investment with the current matchup and map; a safe 2TC is a plan, not a universal benchmark.',
    timeSec: null,
    startTimeSec: null,
  })
}

function firstFightCheck(
  me: PlayerSummary,
  opponent: PlayerSummary | null,
  pressure: {
    myFirstMilitaryLossTimeSec: number | null
    opponentFirstMilitaryLossTimeSec: number | null
  } | null,
): AdvancedReviewCheck {
  const firstLoss = pressure?.myFirstMilitaryLossTimeSec
  if (firstLoss == null) {
    return advancedCheck('first-fight', 'unavailable', 'First-fight readiness', {
      observed:
        'No first military casualty window was decoded, so the summary cannot identify the first attack or defence.',
      takeaway:
        'Before the next move-out, check composition, reinforcements, and the safety of your own exposed resources in the replay.',
      timeSec: null,
      startTimeSec: null,
    })
  }
  const ownUnits = militaryUnitTimes(me).filter((timeSec) => timeSec <= firstLoss).length
  const ownRoles = new Set(militaryUnitRoles(me, firstLoss))
  const enemyLoss = pressure?.opponentFirstMilitaryLossTimeSec
  const enemyRoles =
    opponent && enemyLoss != null
      ? new Set(militaryUnitRoles(opponent, enemyLoss))
      : new Set<string>()
  if (ownUnits < FIRST_FIGHT_MIN_UNITS) {
    return advancedCheck('first-fight', 'review', 'First-fight readiness', {
      observed: `Your first recorded military loss arrived at ${time(firstLoss)} with only ${ownUnits} military completions in the timeline.`,
      takeaway:
        'This may be a raid or a fight taken before reinforcements arrived. Review whether a smaller harassment, safer retreat, or one more production cycle was the realistic choice.',
      timeSec: firstLoss,
      startTimeSec: null,
    })
  }
  if (enemyRoles.size >= 2 && ownRoles.size === 1) {
    return advancedCheck('first-fight', 'review', 'First-fight readiness', {
      observed: `Your first casualty window had one recorded army role (${[...ownRoles][0] ?? 'unknown'}) while the opponent's window contained at least two roles.`,
      takeaway:
        'Before adding another expensive unit, identify the missing frontline, cover, damage, mobility, or siege role and confirm the map position in the replay.',
      timeSec: firstLoss,
      startTimeSec: null,
    })
  }
  return advancedCheck('first-fight', 'clear', 'First-fight readiness', {
    observed: `The first recorded casualty window at ${time(firstLoss)} had ${ownUnits} military completions and more than one visible army role or no comparable enemy role data.`,
    takeaway:
      'Before an attack, still confirm the target, reinforcement path, and safe retreat line; the summary does not record position.',
    timeSec: null,
    startTimeSec: null,
  })
}

function postFightResetCheck(
  me: PlayerSummary,
  pressure: {
    firstEnemyMilitaryLossCausedTimeSec: number | null
  } | null,
): AdvancedReviewCheck {
  const advantageTime = pressure?.firstEnemyMilitaryLossCausedTimeSec
  if (advantageTime == null) {
    return advancedCheck('post-fight-reset', 'unavailable', 'Post-fight reset', {
      observed:
        'No military loss explicitly attributed to you was decoded, so a post-fight conversion window cannot be isolated.',
      takeaway:
        'After the next successful defence or attack, name one concrete conversion before chasing: resource, production, age, expansion, or objective.',
      timeSec: null,
      startTimeSec: null,
    })
  }
  const followUp = eventsAfter(me, advantageTime, INVESTMENT_FOLLOW_UP_SEC)
  if (followUp.length === 0) {
    return advancedCheck('post-fight-reset', 'review', 'Post-fight reset', {
      observed: `The first enemy military loss attributed to you was at ${time(advantageTime)}, with no unit, building, or upgrade completion recorded in the next two minutes.`,
      takeaway:
        'A kill is only a timing if it buys something. Rewatch the reset and choose the nearest safe resource, production, age-up, expansion, or map objective.',
      timeSec: advantageTime,
      startTimeSec: null,
    })
  }
  return advancedCheck('post-fight-reset', 'clear', 'Post-fight reset', {
    observed: `${followUp.length} follow-up build or upgrade events were recorded after the first attributed enemy loss at ${time(advantageTime)}.`,
    takeaway:
      'Check whether those events converted the advantage into map control or only replaced the army; the summary cannot see resource safety or retreat paths.',
    timeSec: null,
    startTimeSec: null,
  })
}

function eventsAfter(player: PlayerSummary, afterTimeSec: number, windowSec: number): BuildEvent[] {
  return player.buildOrder
    .filter(
      (event) =>
        event.timeSec > afterTimeSec &&
        event.timeSec <= afterTimeSec + windowSec &&
        (event.category === 'building' || event.category === 'upgrade' || isMilitaryEvent(event)),
    )
    .sort((left, right) => left.timeSec - right.timeSec)
}

function hasMilitaryEvent(events: BuildEvent[]): boolean {
  return events.some(isMilitaryEvent)
}

function isMilitaryEvent(event: BuildEvent): boolean {
  return event.category === 'unit' && !isWorkerOrCivilian(event)
}

function isExpansionOrFortification(event: BuildEvent): boolean {
  return /town.?center|keep|fort|castle|outpost|tower|wall/i.test(
    `${event.name} ${event.blueprint}`,
  )
}

function militaryUnitTimes(player: PlayerSummary): number[] {
  return player.buildOrder
    .filter(isMilitaryEvent)
    .map((event) => event.timeSec)
    .filter((timeSec) => validTime(timeSec) != null)
    .sort((left, right) => left - right)
}

function firstMilitaryUnitTime(player: PlayerSummary): number | null {
  return militaryUnitTimes(player)[0] ?? null
}

function militaryUnitRoles(player: PlayerSummary, beforeTimeSec: number): string[] {
  return player.buildOrder
    .filter((event) => isMilitaryEvent(event) && event.timeSec <= beforeTimeSec)
    .map(unitRole)
    .filter((role, index, roles) => roles.indexOf(role) === index)
}

function unitRole(event: BuildEvent): string {
  const raw = `${event.name} ${event.blueprint}`.toLocaleLowerCase()
  if (/siege|mangonel|ram|trebuchet|springald|cannon|culverin/.test(raw)) return 'siege'
  if (/horse|cavalry|knight|camel|lancer|sipahi|horseman/.test(raw)) return 'mobility'
  if (/archer|crossbow|gunner|handcannoneer|longbow|musket/.test(raw)) return 'ranged damage'
  if (/spearman|pikeman|man-at-arms|maa|infantry|warrior|sword/.test(raw)) return 'frontline'
  return 'other military'
}

function isWorkerOrCivilian(event: BuildEvent): boolean {
  return /villager|worker|scout|trader|merchant|monk|priest|fishing|transport/i.test(
    `${event.name} ${event.blueprint}`,
  )
}

function isTeamSummary(summary: MatchSummary, perPlayer: PerPlayerMatchStats[]): boolean {
  if (summary.players.length > 2) return true
  const teamIds = new Set(perPlayer.filter((row) => row.teamId != null).map((row) => row.teamId))
  return teamIds.size > 1 && perPlayer.length > 2
}

function advancedCheck(
  lane: AdvancedReviewLane,
  status: FirstCauseStatus,
  title: string,
  details: Omit<AdvancedReviewCheck, 'lane' | 'status' | 'title' | 'guideSlug'>,
): AdvancedReviewCheck {
  return { lane, status, title, guideSlug: ADVANCED_LANE_GUIDES[lane], ...details }
}

function teamPlanCheck(
  summary: MatchSummary,
  me: PlayerSummary,
  perPlayer: PerPlayerMatchStats[],
): AdvancedReviewCheck {
  const meRow =
    me.profileId == null ? null : perPlayer.find((row) => row.profileId === me.profileId)
  if (meRow?.teamId == null) {
    return advancedCheck('team-plan', 'unavailable', 'Team plan', {
      observed: 'This team summary does not expose reliable team ids for the selected player.',
      takeaway:
        'Use the replay to name who owned first pressure, the exposed flank, economic scaling, and the next shared objective.',
      timeSec: null,
      startTimeSec: null,
    })
  }
  const teamPlayers = summary.players.filter(
    (player) =>
      player.profileId != null &&
      perPlayer.some((row) => row.profileId === player.profileId && row.teamId === meRow.teamId),
  )
  const firstTimes = teamPlayers
    .map((player) => firstMilitaryUnitTime(player))
    .filter((value): value is number => value != null)
    .sort((left, right) => left - right)
  if (firstTimes.length < 2) {
    return advancedCheck('team-plan', 'unavailable', 'Team plan', {
      observed:
        'The team summary does not contain enough first-army timings to compare coordinated pressure.',
      takeaway:
        'Review the replay callout moments: first army, reinforcements, age/composition change, and the shared conversion target.',
      timeSec: null,
      startTimeSec: null,
    })
  }
  const spread = firstTimes.at(-1)! - firstTimes[0]!
  if (spread >= TEAM_TIMING_SPREAD_SEC) {
    return advancedCheck('team-plan', 'review', 'Team plan', {
      observed: `Your team's first recorded military timings were spread across ${time(spread)} (${time(firstTimes[0]!)} to ${time(firstTimes.at(-1)!)}).`,
      takeaway:
        'A smaller army arriving together can beat larger staggered armies. Assign pressure, protection, and economy roles, then rally the first useful timing.',
      timeSec: firstTimes[0]!,
      startTimeSec: null,
    })
  }
  return advancedCheck('team-plan', 'clear', 'Team plan', {
    observed: `Your team's first military timings were within ${time(spread)} of one another.`,
    takeaway:
      'Timing alone does not prove coordination. Check whether the team converted that arrival into one shared target instead of separate fights.',
    timeSec: null,
    startTimeSec: null,
  })
}

function check(
  lane: FirstCauseLane,
  status: FirstCauseStatus,
  title: string,
  details: Omit<FirstCauseCheck, 'lane' | 'status' | 'title' | 'guideSlug'>,
): FirstCauseCheck {
  return { lane, status, title, guideSlug: LANE_GUIDES[lane], ...details }
}

function categoryFor(lane: ReviewLane, check: ReviewCheckCore): MistakeCategory {
  if (lane === 'opening' && check.observed.includes('villager completion')) return 'mechanics'
  if (lane === 'reaction' || lane === 'first-fight') return 'execution-under-pressure'
  if (lane === 'information') return 'information'
  return 'decision'
}

function goalFor(firstCause: FirstCauseConclusion | null): NextGameGoal {
  switch (firstCause?.lane) {
    case 'opening':
      return {
        category: firstCause.category,
        trigger: 'At 2:30 and while aging up',
        action: 'Select every Town Center, queue two villagers, and check population space.',
      }
    case 'reaction':
      return {
        category: firstCause.category,
        trigger: 'When the first enemy production clue or army appears',
        action:
          'Start the smallest counter response before moving your own army out, then make exposed workers safe.',
      }
    case 'spending':
      return {
        category: firstCause.category,
        trigger: 'When the bank reaches 800 before the next fight',
        action:
          'Spend first on queued units or usable production; only keep the bank if you can name the planned age-up or technology.',
      }
    case 'conversion':
    case 'post-fight-reset':
      return {
        category: firstCause.category,
        trigger: 'After the first favourable fight or defended push',
        action:
          'Claim one safe external food source, expansion, age-up, or map objective before chasing farther.',
      }
    case 'resource-bottleneck':
      return {
        category: firstCause.category,
        trigger: 'When one resource is high and the next required resource is low',
        action:
          'Move the next workers to the bottleneck before production stops, then recheck the bank after 60–90 seconds.',
      }
    case 'greedy-investment':
      return {
        category: firstCause.category,
        trigger: 'Before starting a second Town Center or other expensive investment',
        action:
          'Name the defensive army and the next-minute production plan that keeps the investment alive.',
      }
    case 'first-fight':
      return {
        category: firstCause.category,
        trigger: 'Before the first move-out',
        action:
          'Confirm the damage, frontline, cover, reinforcement path, target, and safe retreat line.',
      }
    case 'team-plan':
      return {
        category: firstCause.category,
        trigger: 'Before the first team army arrives',
        action:
          'Assign pressure, protection, and economy roles and rally one shared target instead of splitting fights.',
      }
    default:
      return {
        category: 'information',
        trigger: 'Before placing your first military building',
        action:
          'Scout enemy gold and first production, then write down the one response that observation requires.',
      }
  }
}

function villagerCompletionTimes(player: PlayerSummary): number[] {
  return player.buildOrder
    .filter(
      (event) =>
        event.category === 'unit' &&
        (event.blueprint.startsWith('unit_villager') || event.name === 'Villager'),
    )
    .map((event) => event.timeSec)
    .filter((timeSec) => validTime(timeSec) != null)
    .sort((left, right) => left - right)
}

function earliestGap(times: number[], thresholdSec: number, beforeSec: number): TimedGap | null {
  for (let index = 1; index < times.length; index++) {
    const startTimeSec = times[index - 1]!
    const endTimeSec = times[index]!
    const durationSec = endTimeSec - startTimeSec
    if (startTimeSec <= beforeSec && durationSec > thresholdSec) {
      return { startTimeSec, endTimeSec, durationSec }
    }
  }
  return null
}

function firstMilitaryBuilding(player: PlayerSummary): BuildEvent | null {
  return (
    [...player.buildOrder]
      .filter(
        (event) =>
          event.category === 'building' &&
          /archery|barracks|stable|siege|military|outpost|tower|keep|fort|blacksmith|dock/i.test(
            `${event.name} ${event.blueprint}`,
          ) &&
          validTime(event.timeSec) != null,
      )
      .sort(
        (left, right) => left.timeSec - right.timeSec || left.name.localeCompare(right.name),
      )[0] ?? null
  )
}

function militaryUnitGaps(player: PlayerSummary): TimedGap[] {
  const times = player.buildOrder
    .filter(
      (event) =>
        event.category === 'unit' &&
        !/(villager|worker|scout|trader|merchant|monk|priest|fishing|transport)/i.test(
          `${event.name} ${event.blueprint}`,
        ),
    )
    .map((event) => event.timeSec)
    .filter((timeSec) => validTime(timeSec) != null)
    .sort((left, right) => left - right)
  const gaps: TimedGap[] = []
  for (let index = 1; index < times.length; index++) {
    const startTimeSec = times[index - 1]!
    const endTimeSec = times[index]!
    gaps.push({ startTimeSec, endTimeSec, durationSec: endTimeSec - startTimeSec })
  }
  return gaps
}

function largestBank(player: PlayerSummary): TimedBank | null {
  let result: TimedBank | null = null
  for (const point of player.resources) {
    const timeSec = validTime(point.timeSec)
    const total = resourceTotal(point.bank)
    if (timeSec == null || !Number.isFinite(total) || total < 0) continue
    if (!result || total > result.total || (total === result.total && timeSec < result.timeSec)) {
      result = { timeSec, total }
    }
  }
  return result
}

function largestPositiveScoreSwing(me: PlayerSummary, opponent: PlayerSummary): TimedChange | null {
  const theirs = new Map(opponent.scores.map((point) => [timeKey(point.timeSec), point.total]))
  const shared = me.scores
    .map((point) => {
      const theirsTotal = theirs.get(timeKey(point.timeSec))
      return theirsTotal == null ? null : { timeSec: point.timeSec, gap: point.total - theirsTotal }
    })
    .filter(
      (point): point is { timeSec: number; gap: number } =>
        point != null && validTime(point.timeSec) != null && Number.isFinite(point.gap),
    )
    .sort((left, right) => left.timeSec - right.timeSec)
  let result: TimedChange | null = null
  for (let index = 1; index < shared.length; index++) {
    const previous = shared[index - 1]!
    const current = shared[index]!
    const change = current.gap - previous.gap
    if (
      change >= SCORE_SWING_FOR_REVIEW &&
      (!result ||
        change > result.change ||
        (change === result.change && current.timeSec < result.endTimeSec))
    ) {
      result = { startTimeSec: previous.timeSec, endTimeSec: current.timeSec, change }
    }
  }
  return result
}

function resourceGapFallAfter(
  me: PlayerSummary,
  opponent: PlayerSummary,
  afterTimeSec: number,
): TimedChange | null {
  const theirs = new Map(
    opponent.resources.map((point) => [timeKey(point.timeSec), resourceTotal(point.gathered)]),
  )
  const shared = me.resources
    .map((point) => {
      const theirsGathered = theirs.get(timeKey(point.timeSec))
      return theirsGathered == null
        ? null
        : { timeSec: point.timeSec, gap: resourceTotal(point.gathered) - theirsGathered }
    })
    .filter(
      (point): point is { timeSec: number; gap: number } =>
        point != null && validTime(point.timeSec) != null && Number.isFinite(point.gap),
    )
    .sort((left, right) => left.timeSec - right.timeSec)
  const baseline = [...shared].reverse().find((point) => point.timeSec <= afterTimeSec)
  const next = shared.find(
    (point) => point.timeSec > afterTimeSec && point.timeSec - afterTimeSec <= 300,
  )
  if (!baseline || !next) return null
  return {
    startTimeSec: baseline.timeSec,
    endTimeSec: next.timeSec,
    change: next.gap - baseline.gap,
  }
}

function resourceTotal(resources: ResourceAmounts): number {
  return resources.food + resources.wood + resources.gold + resources.stone
}

function validTime(value: number | null | undefined): number | null {
  return value != null && Number.isFinite(value) && value >= 0 ? value : null
}

function timeKey(value: number): number {
  return Math.round(value)
}

function time(value: number): string {
  const rounded = Math.max(0, Math.round(value))
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, '0')}`
}

function whole(value: number): string {
  return String(Math.round(value))
}
