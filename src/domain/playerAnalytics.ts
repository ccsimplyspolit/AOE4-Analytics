/**
 * Unified player analytics — one bundle for "My Stats" and any public profile.
 * Combines local stored matches (rich) with public scout history (lighter).
 */

import type { ScoutMatchRow } from '../../electron/ipc/contract'
import type { StoredMatch } from '../store/historyStore'
import type { RankInfo } from './types'
import { resultFromPerPlayer } from './analysis'
import { civDisplayName } from './civ'
import { calculatePlayerMacroProfile, type PlayerMacroProfile } from './playerMacroSummary'
import { computePlayerStats, type PlayerStats, type StatGame } from './playerStats'
import { computePlaystyle, type PlaystyleProfile, type PlaystyleGame } from './playstyle'
import {
  computeProfileOverview,
  type ProfileGame,
  type ProfileOverview,
} from './profileOverview'

export type PlayerAnalyticsSource = 'local' | 'public' | 'mixed'

export interface PlayerAnalyticsIdentity {
  profileId: number
  name: string
  country: string | null
  primary: RankInfo | null
}

export interface PlayerAnalyticsInput {
  identity: PlayerAnalyticsIdentity
  /** Public AoE4World match rows (scout history). */
  scoutGames?: ScoutMatchRow[]
  /** Locally synced matches for the active account. */
  localMatches?: StoredMatch[]
  /** When merging local matches, filter to this profile id. */
  activeProfileId?: number | null
}

export interface PlayerAnalyticsBundle {
  identity: PlayerAnalyticsIdentity
  source: PlayerAnalyticsSource
  stats: PlayerStats
  macro: PlayerMacroProfile | null
  playstyle: PlaystyleProfile | null
  overview: ProfileOverview | null
  /** Games feeding the bundle (for display counts). */
  gameCount: number
  hasLocalRichData: boolean
  /** Rows for PlayerMacroStatsCard (scout or mapped local). */
  macroDisplayGames: ScoutMatchRow[]
}

function scoutResult(row: ScoutMatchRow): StatGame['result'] {
  return row.result === 'unknown' ? null : row.result
}

function scoutToStatGame(row: ScoutMatchRow): StatGame {
  return {
    result: scoutResult(row),
    civ: row.civilization ?? 'unknown',
    oppCiv: row.opponentCivilizations[0] ?? null,
    map: row.map ?? '',
    durationSec: row.durationSec,
    ratingDiff: null,
    format: row.format ?? undefined,
    playedAt: row.startedAt,
  }
}

function localToStatGame(match: StoredMatch, profileId: number | null): StatGame {
  return {
    result: match.result ?? resultFromPerPlayer(match.perPlayer, profileId),
    civ: match.civ,
    oppCiv: match.oppCiv,
    map: match.map,
    durationSec: match.durationSec,
    ratingDiff: match.ratingDiff,
    format: match.format,
    playedAt: match.playedAt,
  }
}

function localToScoutRow(match: StoredMatch, profileId: number): ScoutMatchRow {
  const result = match.result ?? resultFromPerPlayer(match.perPlayer, profileId)
  return {
    gameId: Number(match.id) || 0,
    startedAt: match.playedAt,
    durationSec: match.durationSec,
    map: match.map,
    format: match.format ?? null,
    result: result ?? 'unknown',
    civilization: match.civ,
    opponentCivilizations: match.oppCiv
      ? [match.oppCiv]
      : (match.oppTeam?.map((p) => p.civ) ?? []),
    opponentNames: match.oppName
      ? [match.oppName]
      : (match.oppTeam?.map((p) => p.name ?? 'Opponent') ?? []),
  }
}

function localToMacroRow(match: StoredMatch, profileId: number | null) {
  return {
    durationSec: match.durationSec,
    result: match.result ?? resultFromPerPlayer(match.perPlayer, profileId),
    civilization: match.civ,
    map: match.map,
    opponentCivilizations: match.oppCiv ? [match.oppCiv] : (match.oppTeam?.map((p) => p.civ) ?? []),
  }
}

/** Builds the unified analytics bundle for any player profile page. */
export function buildPlayerAnalytics(input: PlayerAnalyticsInput): PlayerAnalyticsBundle {
  const { identity, scoutGames = [], localMatches = [], activeProfileId = null } = input
  const isOwnAccount = activeProfileId != null && activeProfileId === identity.profileId
  const ownLocal = isOwnAccount ? localMatches : []

  const scoutStatGames = scoutGames.map(scoutToStatGame)
  const localStatGames = ownLocal.map((m) => localToStatGame(m, identity.profileId))

  // Prefer local synced history when available — richer per-game data.
  const statGames = localStatGames.length > 0 ? localStatGames : scoutStatGames
  const stats = computePlayerStats(statGames, { civLabel: civDisplayName })

  const macroSource =
    scoutGames.length > 0
      ? scoutGames
      : ownLocal.map((m) => localToMacroRow(m, identity.profileId))
  const macro =
    macroSource.length > 0
      ? calculatePlayerMacroProfile(macroSource, identity.profileId)
      : null

  let playstyle: PlaystyleProfile | null = null
  let overview: ProfileOverview | null = null

  if (ownLocal.length > 0) {
    const playstyleGames: PlaystyleGame[] = ownLocal.map((m) => {
      const mine = m.perPlayer?.find((p) => p.profileId === identity.profileId)
      return {
        result: m.result ?? resultFromPerPlayer(m.perPlayer, identity.profileId),
        civ: m.civ,
        durationSec: m.durationSec,
        apm: mine?.apm ?? m.analysis.apm,
        grade: (m.local?.villagersProduced ?? 0) > 0 ? m.analysis.grade : null,
        local: m.local,
        kd: mine?.kd ?? null,
        deaths: mine?.deaths ?? null,
        unitsProduced: mine?.unitsProduced ?? null,
        techsResearched: mine?.techsResearched ?? null,
      }
    })
    playstyle = computePlaystyle(playstyleGames)

    const profileGames: ProfileGame[] = ownLocal.map((m) => ({
      civ: m.civ,
      result: m.result ?? resultFromPerPlayer(m.perPlayer, identity.profileId),
      ratingDiff: m.ratingDiff,
      durationSec: m.durationSec,
      local: m.local,
      perPlayer: m.perPlayer,
    }))
    overview = computeProfileOverview(profileGames, identity.profileId)
  }

  let source: PlayerAnalyticsSource = 'public'
  if (ownLocal.length > 0 && scoutGames.length > 0) source = 'mixed'
  else if (ownLocal.length > 0) source = 'local'

  const macroDisplayGames =
    scoutGames.length > 0
      ? scoutGames
      : ownLocal.map((m) => localToScoutRow(m, identity.profileId))

  return {
    identity,
    source,
    stats,
    macro,
    playstyle,
    overview,
    gameCount: statGames.length,
    hasLocalRichData: ownLocal.length > 0,
    macroDisplayGames,
  }
}
