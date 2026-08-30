/**
 * Coaching dossier for any profile — own account, scouted opponent, or a
 * player opened from a match roster. Built only from match-history facts
 * (civ/map/format/duration/result). Missing evidence stays missing.
 */

import { civDisplayName } from './civ'
import { computePlayerStats, type Breakdown, type StatGame } from './playerStats'
import { calculatePlayerMacroProfile, type MacroInputRow } from './playerMacroSummary'

export type PatternConfidence = 'confirmed' | 'likely' | 'anecdote'

export interface DossierFinding {
  id: string
  kind: 'strength' | 'weakness' | 'habit' | 'opportunity'
  severity: 'critical' | 'important' | 'minor'
  title: string
  detail: string
  evidence: string
  action: string
  games: number
  confidence: PatternConfidence
}

export interface PlayerDossier {
  profileId: number
  gameCount: number
  decided: number
  winRate: number | null
  styleTag: string
  styleRationale: string
  civPool: { key: string; label: string; games: number; winRate: number | null }[]
  formats: Breakdown[]
  maps: Breakdown[]
  strengths: DossierFinding[]
  weaknesses: DossierFinding[]
  bottleneck: DossierFinding | null
  preMatch: {
    role: string
    firstPriority: string
    scout: string
    firstTiming: string
    neverForget: string
    whenAttack: string
    whenNotFight: string
    winCondition: string
    matchRule: string
  }
}

function confidenceFor(games: number): PatternConfidence {
  if (games >= 12) return 'confirmed'
  if (games >= 5) return 'likely'
  return 'anecdote'
}

function gamesToMacro(games: StatGame[]): MacroInputRow[] {
  return games.map((game) => ({
    durationSec: game.durationSec,
    result: game.result,
    civilization: game.civ,
    map: game.map,
    opponentCivilizations: game.oppCiv ? [game.oppCiv] : [],
  }))
}

function finding(partial: Omit<DossierFinding, 'confidence'>): DossierFinding {
  return { ...partial, confidence: confidenceFor(partial.games) }
}

function rateLabel(winRate: number | null): string {
  return winRate == null ? 'no decided sample' : `${winRate}% win rate`
}

/** Builds a coaching dossier from any player's match rows. */
export function buildPlayerDossier(games: StatGame[], profileId: number): PlayerDossier {
  const stats = computePlayerStats(games, { civLabel: civDisplayName })
  const macro = calculatePlayerMacroProfile(gamesToMacro(games), profileId)
  const decided = stats.decided
  const strengths: DossierFinding[] = []
  const weaknesses: DossierFinding[] = []

  const topCiv = stats.byCiv[0]
  const weakCiv = [...stats.byCiv].reverse().find((row) => row.games >= 3 && (row.winRate ?? 100) < 45)
  const bestMap = stats.byMap.find((row) => row.games >= 3 && (row.winRate ?? 0) >= 55)
  const worstMap = [...stats.byMap].reverse().find((row) => row.games >= 3 && (row.winRate ?? 100) < 45)

  const shortLosses = games.filter(
    (game) => game.result === 'loss' && game.durationSec != null && game.durationSec < 12 * 60,
  ).length
  const longLosses = games.filter(
    (game) => game.result === 'loss' && game.durationSec != null && game.durationSec > 28 * 60,
  ).length
  const shortWins = games.filter(
    (game) => game.result === 'win' && game.durationSec != null && game.durationSec < 15 * 60,
  ).length

  if (topCiv && topCiv.games >= 3 && (topCiv.winRate ?? 0) >= 55) {
    strengths.push(
      finding({
        id: 'best-civ',
        kind: 'strength',
        severity: 'important',
        title: `${topCiv.label} is the reliable civ`,
        detail: `Most games and a winning sample are on ${topCiv.label}.`,
        evidence: `${topCiv.games} games · ${topCiv.wins}–${topCiv.losses} · ${rateLabel(topCiv.winRate)}`,
        action: `Queue ${topCiv.label} first unless the map or teammate role forbids it.`,
        games: topCiv.games,
      }),
    )
  }

  if (bestMap) {
    strengths.push(
      finding({
        id: 'best-map',
        kind: 'strength',
        severity: 'minor',
        title: `Stronger on ${bestMap.label}`,
        detail: 'Map sample is small-to-medium; treat as a preference, not a guarantee.',
        evidence: `${bestMap.games} games · ${rateLabel(bestMap.winRate)}`,
        action: `On ${bestMap.label}, play the usual opening instead of improvising a new build.`,
        games: bestMap.games,
      }),
    )
  }

  if (shortWins >= 4 && shortWins >= longLosses) {
    strengths.push(
      finding({
        id: 'early-closings',
        kind: 'strength',
        severity: 'important',
        title: 'Wins more often before 15 minutes',
        detail: 'Short wins usually mean the Feudal/Castle timing actually lands.',
        evidence: `${shortWins} wins under 15 minutes in ${stats.totalGames} games`,
        action: 'Keep the first army continuous; do not bank resources during the timing window.',
        games: shortWins,
      }),
    )
  }

  if (weakCiv) {
    weaknesses.push(
      finding({
        id: 'weak-civ',
        kind: 'weakness',
        severity: 'important',
        title: `${weakCiv.label} is leaking games`,
        detail: 'A civ with a losing sample is a pool problem, not a one-game variance.',
        evidence: `${weakCiv.games} games · ${weakCiv.wins}–${weakCiv.losses} · ${rateLabel(weakCiv.winRate)}`,
        action: `Bench ${weakCiv.label} until the next 5 games on the main civ are stable.`,
        games: weakCiv.games,
      }),
    )
  }

  if (shortLosses >= 4) {
    weaknesses.push(
      finding({
        id: 'early-losses',
        kind: 'weakness',
        severity: 'critical',
        title: 'Too many losses before 12 minutes',
        detail:
          'A short loss is usually a broken opening: idle TC, no army, or a fight taken without scouting.',
        evidence: `${shortLosses} losses under 12 minutes`,
        action:
          'Before the next queue: scout gold by 4:30, keep TC queued, and do not take a fight until the first military building is producing.',
        games: shortLosses,
      }),
    )
  }

  if (longLosses >= 4) {
    weaknesses.push(
      finding({
        id: 'late-losses',
        kind: 'weakness',
        severity: 'important',
        title: 'Games that reach 28+ minutes are slipping',
        detail: 'Long losses usually mean relics/trade/siege were conceded, not that the opening failed.',
        evidence: `${longLosses} losses over 28 minutes`,
        action: 'From Castle: take relics, add siege before the third fight, and keep villager production through the mid-game.',
        games: longLosses,
      }),
    )
  }

  if (worstMap) {
    weaknesses.push(
      finding({
        id: 'weak-map',
        kind: 'weakness',
        severity: 'minor',
        title: `Weaker on ${worstMap.label}`,
        detail: 'Map-specific losses often come from the same opening on a layout that punishes it.',
        evidence: `${worstMap.games} games · ${rateLabel(worstMap.winRate)}`,
        action: `On ${worstMap.label}, scout the contested resource first and delay greedy 2TC if the opponent is already on military.`,
        games: worstMap.games,
      }),
    )
  }

  const teamFormat = stats.byFormat.find((row) => /2v2|3v3|4v4|team/i.test(row.key) || /2v2|3v3|4v4/.test(row.label))
  const soloFormat = stats.byFormat.find((row) => /1v1|solo/i.test(`${row.key} ${row.label}`))
  if (teamFormat && teamFormat.games >= 5 && (teamFormat.winRate ?? 50) < 45) {
    weaknesses.push(
      finding({
        id: 'team-leak',
        kind: 'weakness',
        severity: 'important',
        title: 'Team-game sample is below break-even',
        detail: 'Team losses often come from fighting 1v2 instead of waiting for the ally.',
        evidence: `${teamFormat.label}: ${teamFormat.games} games · ${rateLabel(teamFormat.winRate)}`,
        action: 'Ping before engaging. If an ally is more than 20 seconds away, retreat and raid instead.',
        games: teamFormat.games,
      }),
    )
  }

  const bottleneck =
    weaknesses.find((item) => item.severity === 'critical') ??
    weaknesses.find((item) => item.severity === 'important') ??
    null

  const role =
    macro.playstyleTag === 'Aggressive Rusher'
      ? 'Early pressure / tempo'
      : macro.playstyleTag === 'Late Game Boomer'
        ? 'Macro / scaling'
        : macro.playstyleTag === 'Castle Timing Specialist'
          ? 'Castle timing'
          : 'Flexible'

  const emptyPreMatch = {
    role: 'Insufficient sample',
    firstPriority: 'Play the usual opening and keep the Town Center queued.',
    scout: 'Gold, military buildings, second TC.',
    firstTiming: 'First army before minute 6.',
    neverForget: 'Villager production during the first fight.',
    whenAttack: 'When you have a producing building and a scouted target.',
    whenNotFight: 'When you are fighting 1v2 or under Town Center fire without siege.',
    winCondition: 'Convert the first advantage into map control, not a dive.',
    matchRule: 'Keep making villagers.',
  }

  return {
    profileId,
    gameCount: stats.totalGames,
    decided,
    winRate: stats.winRate,
    styleTag: macro.playstyleTag,
    styleRationale: macro.playstyleDescription,
    civPool: stats.byCiv.slice(0, 3).map((row) => ({
      key: row.key,
      label: row.label,
      games: row.games,
      winRate: row.winRate,
    })),
    formats: stats.byFormat,
    maps: stats.byMap.slice(0, 6),
    strengths: strengths.slice(0, 5),
    weaknesses: weaknesses.slice(0, 5),
    bottleneck,
    preMatch:
      stats.totalGames === 0
        ? emptyPreMatch
        : {
            role,
            firstPriority: bottleneck?.action ?? 'Keep Town Center queued and produce the first army on time.',
            scout: 'Opponent gold, first military building, Fast Castle vs 2TC.',
            firstTiming:
              macro.playstyleTag === 'Aggressive Rusher'
                ? 'Pressure window 5:30–7:30'
                : 'Castle or 2TC decision by 8:00',
            neverForget: 'Do not stop villagers while the army is out.',
            whenAttack: shortWins >= 3 ? 'When the usual early timing is ready — it has been winning.' : 'When scout confirms a vulnerable resource or no army.',
            whenNotFight:
              shortLosses >= 4
                ? 'Do not take a Dark/Feudal fight without production already running.'
                : 'Do not dive Town Centers without rams or a numbers lead.',
            winCondition:
              topCiv != null
                ? `Play ${topCiv.label} on-role and convert the first timing into relics or a denied gold.`
                : 'Convert the first timing into map control.',
            matchRule: bottleneck?.title
              ? `This match: fix “${bottleneck.title}”.`
              : 'Keep making villagers.',
          },
  }
}

export function scoutRowsToStatGames(
  rows: {
    result: 'win' | 'loss' | 'unknown'
    civilization: string | null
    opponentCivilizations: string[]
    map: string | null
    durationSec: number | null
    format: string | null
    startedAt: string
  }[],
): StatGame[] {
  return rows.map((row) => ({
    result: row.result === 'unknown' ? null : row.result,
    civ: row.civilization ?? 'unknown',
    oppCiv: row.opponentCivilizations[0] ?? null,
    map: row.map ?? '',
    durationSec: row.durationSec,
    ratingDiff: null,
    format: row.format ?? undefined,
    playedAt: row.startedAt,
  }))
}
