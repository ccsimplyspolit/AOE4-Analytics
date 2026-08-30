import { normalizeTeams, type Game, type GamePlayer, type Player } from '@api/types'
import type { ScoutMatchRow } from '../../electron/ipc/contract'
import { resultFromPerPlayer } from './analysis'
import type { StoredMatch } from '../store/historyStore'

export interface CoachParticipant {
  profileId: number
  name: string
  civilization: string
  result: 'win' | 'loss' | null
}

export interface LastMatchCoachContext {
  profile: {
    profileId: number
    name: string
    country: string | null
  }
  game: {
    gameId: number
    startedAt: string
    durationSec: number | null
    map: string
    format: string
    patch: string | null
    server: string | null
    isFfa: boolean
  }
  player: CoachParticipant
  teammates: CoachParticipant[]
  opponents: CoachParticipant[]
}

function participant(player: GamePlayer): CoachParticipant {
  return {
    profileId: player.profile_id,
    name: player.name,
    civilization: player.civilization,
    result: player.result,
  }
}

/** Builds a stable, renderer-friendly context from AoE4World's last-game payload. */
export function buildLastMatchCoachContext(player: Player, game: Game): LastMatchCoachContext {
  const teams = normalizeTeams(game)
  const teamIndex = teams.findIndex((team) =>
    team.some((candidate) => candidate.profile_id === player.profile_id),
  )
  const ownTeam = teamIndex >= 0 ? (teams[teamIndex] ?? []) : []
  const subject = ownTeam.find((candidate) => candidate.profile_id === player.profile_id) ?? {
    profile_id: player.profile_id,
    name: player.name,
    civilization: 'unknown',
    result: null,
    rating: null,
    rating_diff: null,
    mmr: null,
  }
  const opponents = teams
    .filter((_, index) => index !== teamIndex)
    .flat()
    .map(participant)

  return {
    profile: {
      profileId: player.profile_id,
      name: player.name,
      country: player.country ?? null,
    },
    game: {
      gameId: game.game_id,
      startedAt: game.started_at,
      durationSec: game.duration ?? null,
      map: game.map || 'Unknown map',
      format: game.leaderboard || game.kind || 'Unknown format',
      patch: game.patch == null ? null : String(game.patch),
      server: game.server ?? null,
      isFfa: teams.length > 2,
    },
    player: participant(subject),
    teammates: ownTeam
      .filter((candidate) => candidate.profile_id !== player.profile_id)
      .map(participant),
    opponents,
  }
}

/** Coach context from a public scout-history row (no full Game payload). */
export function buildCoachContextFromScoutMatch(
  row: ScoutMatchRow,
  profile: { profileId: number; name: string; country?: string | null },
): LastMatchCoachContext {
  const playerResult = row.result === 'unknown' ? null : row.result
  return {
    profile: {
      profileId: profile.profileId,
      name: profile.name,
      country: profile.country ?? null,
    },
    game: {
      gameId: row.gameId,
      startedAt: row.startedAt,
      durationSec: row.durationSec,
      map: row.map ?? 'Unknown map',
      format: row.format ?? 'Unknown format',
      patch: null,
      server: null,
      isFfa: row.opponentCivilizations.length > 2,
    },
    player: {
      profileId: profile.profileId,
      name: profile.name,
      civilization: row.civilization ?? 'unknown',
      result: playerResult,
    },
    teammates: [],
    opponents: row.opponentCivilizations.map((civ, index) => ({
      profileId: -(index + 1),
      name: row.opponentNames[index] ?? `Opponent ${index + 1}`,
      civilization: civ,
      result: null,
    })),
  }
}

/** Coach context from a stored local match row. */
export function buildCoachContextFromStoredMatch(
  match: StoredMatch,
  subjectProfileId: number,
  subjectName: string,
  country: string | null = null,
): LastMatchCoachContext {
  const playerResult = match.result ?? resultFromPerPlayer(match.perPlayer, subjectProfileId)
  return {
    profile: { profileId: subjectProfileId, name: subjectName, country },
    game: {
      gameId: Number(match.id) || 0,
      startedAt: match.playedAt,
      durationSec: match.durationSec,
      map: match.map,
      format: match.format ?? 'Unknown format',
      patch: match.patch ?? null,
      server: null,
      isFfa: (match.oppTeam?.length ?? 0) > 1,
    },
    player: {
      profileId: subjectProfileId,
      name: subjectName,
      civilization: match.civ,
      result: playerResult,
    },
    teammates: (match.myTeam ?? []).map((ally, index) => ({
      profileId: subjectProfileId + 10_000 + index,
      name: ally.name ?? 'Teammate',
      civilization: ally.civ,
      result: playerResult,
    })),
    opponents:
      (match.oppTeam ?? []).length > 0
        ? (match.oppTeam ?? []).map((opp, index) => ({
            profileId: -(index + 1),
            name: opp.name ?? 'Opponent',
            civilization: opp.civ,
            result:
              playerResult === 'win' ? 'loss' : playerResult === 'loss' ? 'win' : null,
          }))
        : match.oppCiv
          ? [
              {
                profileId: -1,
                name: match.oppName ?? 'Opponent',
                civilization: match.oppCiv,
                result:
                  playerResult === 'win' ? 'loss' : playerResult === 'loss' ? 'win' : null,
              },
            ]
          : [],
  }
}

/** Coach context from a full public Game + subject profile id. */
export function buildCoachContextFromGame(
  game: Game,
  subjectProfileId: number,
  profile?: Pick<Player, 'name' | 'country'> | null,
): LastMatchCoachContext | null {
  const teams = normalizeTeams(game)
  const flat = teams.flat()
  const subject = flat.find((candidate) => candidate.profile_id === subjectProfileId)
  if (!subject) return null

  const stub: Player = {
    profile_id: subjectProfileId,
    name: profile?.name ?? subject.name,
    country: profile?.country ?? null,
    modes: {},
  }
  return buildLastMatchCoachContext(stub, game)
}
