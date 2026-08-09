import { normalizeTeams, type Game, type GamePlayer, type Player } from '@api/types'

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
