/**
 * Post-game coaching from the game's OWN stat summary (pure). Where
 * `gameCoaching.ts` reads the Relic counters (kills/production/tech),
 * this reads the decoded summary — exact age-up times, TC idle gaps,
 * villager high, gather rate, army peak, relics — and turns them into
 * specific, numbered findings a beginner can act on. Every number here
 * matches the game's post-match screens (D56).
 */
import type { Signal } from './analysis'
import type { PerPlayerMatchStats } from './analysis'
import { deriveMatchReview } from './matchReview'
import type { MatchSummary, PlayerSummary } from './statsSummary'
import { civFromToken } from './statsSummary'

function fmtTime(sec: number): string {
  const s = Math.round(sec)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export const VILLAGER_IDLE_GAP_SEC = 35

/** The user's row: profile id first (exact), then civ, then never guess. */
export function summaryPlayerForMe(
  summary: MatchSummary,
  myProfileId: number | null,
  myCiv: string | null,
): PlayerSummary | null {
  if (myProfileId != null) {
    const byId = summary.players.find((p) => p.profileId === myProfileId)
    if (byId) return byId
  }
  if (myCiv) {
    const byCiv = summary.players.filter((p) => civFromToken(p.civToken) === myCiv)
    if (byCiv.length === 1) return byCiv[0]!
  }
  return null
}

export interface VillagerProductionRhythm {
  villagersMade: number
  idleWindows: number
  count: number
  longestSec: number
  longestGapSec: number
  /** Villagers that COULD have been made during the idle time (~25s each). */
  lostVillagers: number
}

/** Villager production gaps from the timed build log (TC idle read). */
export function villagerGaps(p: PlayerSummary): VillagerProductionRhythm | null {
  const times = p.buildOrder
    .filter(
      (e) =>
        e.category === 'unit' && (e.blueprint.startsWith('unit_villager') || e.name === 'Villager'),
    )
    .map((e) => e.timeSec)
    .sort((a, b) => a - b)
  if (times.length === 0) return null
  let idleWindows = 0
  let longestGapSec = 0
  let idleSec = 0
  for (let i = 1; i < times.length; i++) {
    const gap = times[i]! - times[i - 1]!
    longestGapSec = Math.max(longestGapSec, gap)
    if (gap > VILLAGER_IDLE_GAP_SEC) {
      idleWindows++
      idleSec += gap - 25 // a villager takes ~20-25s; the rest was idle TC
    }
  }
  return {
    villagersMade: times.length,
    idleWindows,
    count: idleWindows,
    longestSec: longestGapSec,
    longestGapSec,
    lostVillagers: Math.floor(idleSec / 25),
  }
}

export interface SummaryCoachingInput {
  summary: MatchSummary
  myProfileId: number | null
  myCiv: string | null
  /** Relic counters, when available, for combat-trade context. */
  perPlayer?: PerPlayerMatchStats[]
  /** The Feudal age-up target (seconds) from the user's chosen build, if any. */
  feudalTargetSec?: number | null
}

/**
 * Coaching signals from the decoded summary. 1v1-focused: compares the user
 * against the FIRST other player (team games get self-contained reads only).
 */
export function summarySignals(input: SummaryCoachingInput): Signal[] {
  const me = summaryPlayerForMe(input.summary, input.myProfileId, input.myCiv)
  if (!me) return []
  const enemy = input.summary.players.find((p) => p.playerId !== me.playerId) ?? null
  const is1v1 = input.summary.players.length === 2
  const review = deriveMatchReview(
    input.summary,
    input.myProfileId,
    input.myCiv,
    input.perPlayer ?? [],
  )

  const signals: Signal[] = []
  const gameLen = input.summary.gameLengthSec

  // --- Economy pace: total gathered per minute, vs the enemy (the beginner metric). ---
  if (is1v1 && me.totals && enemy?.totals && gameLen && gameLen > 300) {
    const mine = resourceSum(me) / (gameLen / 60)
    const theirs = resourceSum(enemy) / (gameLen / 60)
    if (theirs > 0) {
      const ratio = mine / theirs
      if (ratio < 0.8) {
        signals.push({
          id: 'sum-eco-behind',
          severity: 'major',
          title: `Out-gathered (${Math.round(mine)}/min vs their ${Math.round(theirs)}/min)`,
          detail:
            'The enemy economy simply produced more than yours. More villagers, always working — that gap decides most games at every rank below Diamond.',
        })
      } else if (ratio > 1.2) {
        signals.push({
          id: 'sum-eco-ahead',
          severity: 'good',
          title: `Out-gathered them (${Math.round(mine)}/min vs ${Math.round(theirs)}/min)`,
          detail: 'Your economy out-produced theirs — keep converting that into army and upgrades.',
        })
      }
    }
  }

  // --- Town Center discipline: gaps in villager production. ---
  const gaps = villagerGaps(me)
  if (gaps && gaps.count >= 3 && gaps.lostVillagers >= 3) {
    signals.push({
      id: 'sum-tc-idle',
      severity: gaps.lostVillagers >= 8 ? 'major' : 'minor',
      title: `Town Center sat idle (~${gaps.lostVillagers} villagers never made)`,
      detail: `${gaps.count} production gaps, the longest ${fmtTime(gaps.longestSec)}. Queue 2-3 villagers whenever you check the base — especially while fighting.`,
    })
  }

  // --- Age-up: vs your build's target, then vs the enemy. ---
  const myAge2 = me.totals?.age2Sec ?? null
  if (myAge2 != null && input.feudalTargetSec != null && input.feudalTargetSec > 0) {
    const lateBy = myAge2 - input.feudalTargetSec
    if (lateBy > 45) {
      signals.push({
        id: 'sum-age2-late',
        severity: lateBy > 120 ? 'major' : 'minor',
        title: `Feudal at ${fmtTime(myAge2)} — your build targets ${fmtTime(input.feudalTargetSec)}`,
        detail:
          'Late age-ups usually trace back to villager gaps or floating food. Practice the opening in a custom game until the timing is automatic.',
      })
    }
  }
  const enemyAge2 = is1v1 ? (enemy?.totals?.age2Sec ?? null) : null
  if (myAge2 != null && enemyAge2 != null) {
    if (myAge2 - enemyAge2 > 60) {
      signals.push({
        id: 'sum-age2-behind',
        severity: 'minor',
        title: `They reached Feudal first (${fmtTime(enemyAge2)} vs your ${fmtTime(myAge2)})`,
        detail:
          'A minute of age lead is a window to hit you with better units. If you age slower, expect pressure — wall, and keep your army home until you catch up.',
      })
    } else if (enemyAge2 - myAge2 > 60) {
      signals.push({
        id: 'sum-age2-ahead',
        severity: 'good',
        title: `You aged up first (${fmtTime(myAge2)} vs their ${fmtTime(enemyAge2)})`,
        detail: 'Use that window — an age lead is only worth what you do with it.',
      })
    }
  }

  // --- Villager high: the size of the engine, vs theirs. ---
  const myVills = me.totals?.villagerHigh ?? null
  const enemyVills = is1v1 ? (enemy?.totals?.villagerHigh ?? null) : null
  if (myVills != null && enemyVills != null && enemyVills > 0) {
    if (myVills < enemyVills * 0.8) {
      signals.push({
        id: 'sum-vills-behind',
        severity: 'minor',
        title: `Out-boomed (${myVills} vs their ${enemyVills} villagers)`,
        detail:
          'They peaked with a much bigger workforce. Most games want villager production non-stop until at least 60-80 supply of economy.',
      })
    }
  }

  // --- Army peak: how big your force ever got, vs theirs. ---
  const myArmy = me.totals?.largestArmy ?? null
  const enemyArmy = is1v1 ? (enemy?.totals?.largestArmy ?? null) : null
  if (myArmy != null && enemyArmy != null && enemyArmy > 0 && myArmy < enemyArmy * 0.7) {
    signals.push({
      id: 'sum-army-peak',
      severity: 'minor',
      title: `Their army peaked far bigger (${enemyArmy} vs your ${myArmy})`,
      detail:
        'A bigger peak army wins the decisive fight. That comes from production buildings working AND not feeding units away before the fight.',
    })
  }

  // --- Relics: passive gold the enemy took uncontested. ---
  const myRelics = me.totals?.relicsCaptured ?? null
  const enemyRelics = is1v1 ? (enemy?.totals?.relicsCaptured ?? null) : null
  if (myRelics != null && enemyRelics != null && enemyRelics >= 2 && myRelics === 0) {
    signals.push({
      id: 'sum-relics',
      severity: 'info',
      title: `They took the relics (${enemyRelics} vs 0)`,
      detail:
        'Each relic pays 100 gold/min forever. Grab a monk when you hit Castle Age — even one contested relic denies them income.',
    })
  }

  // --- Conversion: gathered resources are only useful when they become units,
  // upgrades or infrastructure. A high last bank plus low conversion is a
  // stronger read than total gathered alone, but it never claims that saving
  // was wrong without knowing the player's intended timing.
  const meReview = review?.me
  if (
    meReview?.conversionPct != null &&
    meReview.gathered != null &&
    meReview.gathered >= 5_000 &&
    meReview.lastBank != null &&
    meReview.lastBank >= 1_200 &&
    meReview.conversionPct < 75
  ) {
    signals.push({
      id: 'sum-resource-float',
      severity: meReview.lastBank >= 2_500 ? 'major' : 'minor',
      title: `Resources were left unspent (${Math.round(meReview.lastBank)} in the last sample)`,
      detail: `${meReview.conversionPct}% of gathered resources were recorded as spent. This may be intentional saving, but if no age-up or tech was pending, queue production before taking the next fight.`,
    })
  }

  // --- Military trade: subtract villagers when the lost-entity list decoded,
  // so a raid on workers does not masquerade as a bad army trade.
  const opponentReview = review?.opponent
  if (
    is1v1 &&
    meReview?.tradeRatio != null &&
    opponentReview?.tradeRatio != null &&
    meReview.kills != null &&
    meReview.troopLosses != null &&
    meReview.kills + meReview.troopLosses >= 8 &&
    meReview.tradeRatio < opponentReview.tradeRatio * 0.65
  ) {
    signals.push({
      id: 'sum-combat-trade',
      severity: meReview.tradeRatio < 0.5 ? 'major' : 'minor',
      title: `Poor troop trade (${meReview.kills} kills for ${meReview.troopLosses} losses)`,
      detail: `The opponent traded at ${opponentReview.tradeRatio.toFixed(2)} K/D versus your ${meReview.tradeRatio.toFixed(2)}. Review the first fight around the score swing before adding more production.`,
    })
  }

  // --- Worker losses are distinct from a low villager high: they are a direct
  // map-control/defense leak and deserve their own next-game action.
  if (meReview?.villagersLost != null && meReview.villagersLost >= 5) {
    signals.push({
      id: 'sum-villagers-lost',
      severity: meReview.villagersLost >= 10 ? 'major' : 'minor',
      title: `Lost ${meReview.villagersLost} villagers`,
      detail:
        'Keep the first defensive response simple: scout the approach, pull exposed workers early, and avoid taking a fight while the Town Center is not covered.',
    })
  }

  // --- Opening checkpoint: a large gap between the first recorded non-villager
  // units is useful context, but the event can be a scout rather than army.
  if (
    is1v1 &&
    meReview?.firstNonVillagerUnit &&
    opponentReview?.firstNonVillagerUnit &&
    opponentReview.firstNonVillagerUnit.timeSec - meReview.firstNonVillagerUnit.timeSec > 60
  ) {
    signals.push({
      id: 'sum-opening-unit-late',
      severity: 'minor',
      title: `First non-villager unit came ${fmtTime(meReview.firstNonVillagerUnit.timeSec)} late`,
      detail: `Your first recorded unit was ${meReview.firstNonVillagerUnit.name} at ${fmtTime(meReview.firstNonVillagerUnit.timeSec)}; theirs was ${opponentReview.firstNonVillagerUnit.name} at ${fmtTime(opponentReview.firstNonVillagerUnit.timeSec)}. This is an opening checkpoint, not proof of a lost fight.`,
    })
  }

  // --- Unit cadence: completion gaps are a safer observable than pretending
  // the summary can identify an individual production queue's idle time.
  const unitCompletionGaps = meReview?.unitCompletionGaps ?? 0
  const longestUnitCompletionGapSec = meReview?.longestUnitCompletionGapSec ?? 0
  if (unitCompletionGaps >= 2 && longestUnitCompletionGapSec > 90) {
    signals.push({
      id: 'sum-unit-cadence',
      severity: unitCompletionGaps >= 4 ? 'minor' : 'info',
      title: `Long unit-completion gaps (${fmtTime(longestUnitCompletionGapSec)} max)`,
      detail: `${unitCompletionGaps} gaps over one minute were visible between completed non-villager units. Check whether production buildings were staffed and whether resources were being floated before the next fight; this is not a direct queue-idle measurement.`,
    })
  }

  // --- First recorded pressure: STLS keeps timestamps for casualties and,
  // when available, the attacking player. This is stronger evidence than a
  // final K/D, but it still marks a casualty window rather than the whole
  // fight or a guaranteed cause of the result.
  const pressure = review?.pressure
  if (
    is1v1 &&
    pressure?.myFirstMilitaryLossTimeSec != null &&
    pressure.opponentFirstMilitaryLossTimeSec != null
  ) {
    const deltaSec = Math.round(
      pressure.myFirstMilitaryLossTimeSec - pressure.opponentFirstMilitaryLossTimeSec,
    )
    if (Math.abs(deltaSec) >= 45) {
      const mineFirst = deltaSec < 0
      signals.push({
        id: 'sum-first-pressure',
        severity: mineFirst ? 'minor' : 'info',
        title: mineFirst
          ? `Your first military casualty came ${fmtTime(Math.abs(deltaSec))} before theirs`
          : `Their first military casualty came ${fmtTime(Math.abs(deltaSec))} before yours`,
        detail: `Recorded casualty window: you ${fmtTime(pressure.myFirstMilitaryLossTimeSec)}, opponent ${fmtTime(pressure.opponentFirstMilitaryLossTimeSec)}. This is a timing checkpoint for the first hostile loss, not proof that the unit loss alone decided the game.`,
      })
    }
  }

  if (pressure?.responseLagSec != null && pressure.responseLagSec >= 90) {
    signals.push({
      id: 'sum-pressure-response',
      severity: pressure.responseLagSec >= 180 ? 'minor' : 'info',
      title: `Response after first loss took ${fmtTime(pressure.responseLagSec)}`,
      detail:
        'The first opponent military loss attributed to you came well after your first recorded military loss. Review that interval in the replay: add production or disengage earlier instead of taking a second low-value fight.',
    })
  }

  return signals
}

function resourceSum(p: PlayerSummary): number {
  const r = p.totals!.resourcesGathered
  return r.food + r.wood + r.gold + r.stone
}
