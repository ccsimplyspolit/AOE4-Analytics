import type {
  CivStatsResponse,
  MatchupStatsResponse,
  MapStatsResponse,
  StatsLeaderboard,
  TeamStatsResponse,
} from '../api/types'
import type { AgeupPathRow, AgeupStatsResponse } from './landmarkStats'
import { civDisplayName } from './civ'
import { round1 } from './form'

export interface ScoutMetaPlayer {
  profileId: number
  name: string
  civ: string | null
  /** Legacy display rating; kept for callers that only need one number. */
  rating: number | null
  /** Ladder ELO/rating from the current game's public roster/profile. */
  elo?: number | null
  /** Profile MMR for the current mode. */
  mmr?: number | null
  isMe: boolean
  rankLevel?: string | null
  rank?: number | null
  maxRating?: number | null
  winRate?: number | null
  gamesCount?: number
  winsCount?: number
  lossesCount?: number
  season?: number | null
  favoriteCivs?: string[]
  favoriteCivStats?: ScoutFavoriteCiv[]
}

export interface ScoutFavoriteCiv {
  civ: string
  games: number
  wins: number
  winRate: number | null
  pickRate: number | null
}

export interface ScoutMetaMatch {
  map: string | null
  leaderboard: StatsLeaderboard
  kind: string | null
  patch: string | null
  averageMmr: number | null
  averageRating: number | null
  server: string | null
  startedAt: string | null
  durationSec: number | null
}

export interface ScoutMetaScope {
  leaderboard: StatsLeaderboard
  rankLevel: string | null
  rating: string | null
  patch: string | null
  map: string | null
  mapId: number | null
  fetchedAt: string
  ageupScope: {
    patchApplied: boolean
    rankLevelApplied: boolean
    ratingApplied: boolean
    mapApplied: false
    label: string
  }
}

export interface ScoutCivMetric {
  winRate: number | null
  pickRate: number | null
  games: number
  durationMedianSec: number | null
  reliable: boolean
}

export interface ScoutCivSlice {
  civ: string
  civName: string
  overall: ScoutCivMetric | null
  onMap: ScoutCivMetric | null
  mapDelta: number | null
}

export interface ScoutMetaTeam {
  teamIndex: number
  players: ScoutMetaPlayer[]
  averageWinRate: number | null
  averageMmr: number | null
  averageElo: number | null
}

export interface ScoutTeamPartner {
  profileId: number
  name: string
  sharedGames: number
  likelyPremade: boolean
}

export interface ScoutMatchupMeta {
  civilization: string
  civilizationName: string
  opponentCivilization: string
  opponentCivilizationName: string
  winRate: number | null
  wins: number | null
  games: number
  durationMedianSec: number | null
  durationAverageSec: number | null
  /** AoE4 Scout's minimum sample threshold for a reliable matchup read. */
  reliable: boolean
}

export interface ScoutTeamComposition {
  teamIndex: number
  civilizations: string[]
  civilizationNames: string[]
  winRate: number | null
  wins: number | null
  games: number
  durationMedianSec: number | null
  durationAverageSec: number | null
  /** 2v2 team-combo stats are treated as reliable at 30+ games. */
  reliable: boolean
}

export interface ScoutAgeupLandmark {
  age: 2 | 3 | 4
  name: string
  icon: string | null
  games: number
  pickRate: number
  winRate: number | null
  typicalSec: number | null
  fastestSec: number | null
}

export interface ScoutAgeupAge {
  age: 2 | 3 | 4
  totalGames: number
  completedGames: number
  endedBeforeGames: number
  landmarks: ScoutAgeupLandmark[]
}

export interface ScoutAgeupPath {
  age2: string | null
  age3: string | null
  age4: string | null
  games: number
  share: number
  winRate: number | null
}

export interface ScoutAgeupFlow {
  civ: string
  civName: string
  games: number
  reliable: boolean
  ages: ScoutAgeupAge[]
  paths: ScoutAgeupPath[]
}

export interface ScoutMetaContext {
  match: ScoutMetaMatch
  scope: ScoutMetaScope
  teams: ScoutMetaTeam[]
  teamPartners: ScoutTeamPartner[]
  civs: ScoutCivSlice[]
  matchups: ScoutMatchupMeta[]
  teamCompositions: ScoutTeamComposition[]
  ageups: ScoutAgeupFlow[]
}

export interface ScoutMetaBuildInput {
  match?: ScoutMetaMatch
  scope: Omit<ScoutMetaScope, 'fetchedAt' | 'ageupScope'>
  teams: ScoutMetaPlayer[][]
  civStats: CivStatsResponse
  mapCivStats: CivStatsResponse | null
  mapStats: MapStatsResponse
  matchupStats: MatchupStatsResponse
  teamStats?: TeamStatsResponse | null
  ageups: Record<string, AgeupStatsResponse>
  teamPartners?: ScoutTeamPartner[]
}

function finite(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function nonNegativeInt(value: unknown): number {
  const n = finite(value)
  return n != null && n >= 0 ? Math.floor(n) : 0
}

function metricFromRow(row: CivStatsResponse['data'][number] | undefined): ScoutCivMetric | null {
  if (!row) return null
  return {
    winRate: finite(row.win_rate) == null ? null : round1(row.win_rate),
    pickRate: finite(row.pick_rate) == null ? null : round1(row.pick_rate),
    games: nonNegativeInt(row.games_count),
    durationMedianSec: finite(row.duration_median),
    reliable: nonNegativeInt(row.games_count) >= 50,
  }
}

function ageField(age: 2 | 3 | 4): 'age2' | 'age3' | 'age4' {
  return `age${age}` as 'age2' | 'age3' | 'age4'
}

function pathRows(response: AgeupStatsResponse): AgeupPathRow[] {
  const terminal = response.data['age1-4']
  if (Array.isArray(terminal)) return terminal
  const candidates = Object.entries(response.data)
    .filter(([key, value]) => /^age1-\d$/.test(key) && Array.isArray(value))
    .sort(([a], [b]) => b.length - a.length || b.localeCompare(a))
  const best = candidates[0]?.[1]
  return Array.isArray(best) ? best : best ? [best] : []
}

function rowsFor(response: AgeupStatsResponse, key: string): AgeupPathRow[] {
  const rows = response.data[key]
  return Array.isArray(rows) ? rows : rows ? [rows] : []
}

function nameFor(row: AgeupPathRow, age: 2 | 3 | 4): string | null {
  return row[`${ageField(age)}_name`] ?? null
}

function pbgidFor(row: AgeupPathRow, age: 2 | 3 | 4): number | null {
  return row[`${ageField(age)}_pbgid`] ?? null
}

function averageFor(row: AgeupPathRow, age: 2 | 3 | 4): number | null {
  return finite(row[`${ageField(age)}_finished_at_average`])
}

function minimumFor(row: AgeupPathRow, age: 2 | 3 | 4): number | null {
  return finite(row[`${ageField(age)}_finished_at_minimum`])
}

function modeFor(row: AgeupPathRow, age: 2 | 3 | 4): number | null {
  return finite(row[`${ageField(age)}_finished_at_mode`])
}

function rowGames(row: AgeupPathRow): number {
  return nonNegativeInt(row.player_games_count)
}

function rowWinRate(row: AgeupPathRow): number | null {
  const rate = finite(row.win_rate)
  return rate == null || rate < 0 || rate > 100 ? null : rate
}

function rowWins(row: AgeupPathRow): number {
  const games = rowGames(row)
  const explicit = finite(row.win_count)
  if (explicit != null) return Math.min(games, Math.max(0, explicit))
  const rate = rowWinRate(row)
  return rate == null ? 0 : (rate / 100) * games
}

function ageupFlow(civ: string, response: AgeupStatsResponse): ScoutAgeupFlow {
  const terminalRows = pathRows(response)
  const age1Rows = rowsFor(response, 'age1')
  const games = age1Rows.reduce((sum, row) => sum + rowGames(row), 0) ||
    terminalRows.reduce((sum, row) => sum + rowGames(row), 0)
  const metadata = new Map(
    (response.ageups_metadata ?? []).map((entry) => [entry.pbgid, entry.icon]),
  )

  const ages = ([2, 3, 4] as const).map((age): ScoutAgeupAge => {
    const byLandmark = new Map<
      string,
      {
        pbgid: number | null
        games: number
        wins: number
        typicalWeighted: number
        typicalGames: number
        fastest: number | null
      }
    >()
    let completedGames = 0
    for (const row of terminalRows) {
      const name = nameFor(row, age)
      if (!name) continue
      const rowCount = rowGames(row)
      completedGames += rowCount
      const current = byLandmark.get(name) ?? {
        pbgid: pbgidFor(row, age),
        games: 0,
        wins: 0,
        typicalWeighted: 0,
        typicalGames: 0,
        fastest: null,
      }
      current.games += rowCount
      current.wins += rowWins(row)
      const typical = modeFor(row, age) ?? averageFor(row, age)
      if (typical != null && typical > 0) {
        current.typicalWeighted += typical * rowCount
        current.typicalGames += rowCount
      }
      const fastest = minimumFor(row, age)
      if (fastest != null && fastest > 0) {
        current.fastest = current.fastest == null ? fastest : Math.min(current.fastest, fastest)
      }
      byLandmark.set(name, current)
    }
    return {
      age,
      totalGames: games,
      completedGames,
      endedBeforeGames: Math.max(0, games - completedGames),
      landmarks: [...byLandmark.entries()]
        .map(([name, entry]) => ({
          age,
          name,
          icon: entry.pbgid == null ? null : (metadata.get(entry.pbgid) ?? null),
          games: entry.games,
          pickRate: completedGames > 0 ? round1((entry.games / completedGames) * 100) : 0,
          winRate: entry.games > 0 ? round1((entry.wins / entry.games) * 100) : null,
          typicalSec:
            entry.typicalGames > 0 ? entry.typicalWeighted / entry.typicalGames : null,
          fastestSec: entry.fastest,
        }))
        .sort((a, b) => b.games - a.games || a.name.localeCompare(b.name)),
    }
  })

  const paths = terminalRows
    .filter((row) => nameFor(row, 2) != null)
    .map((row) => ({
      age2: nameFor(row, 2),
      age3: nameFor(row, 3),
      age4: nameFor(row, 4),
      games: rowGames(row),
      share: games > 0 ? round1((rowGames(row) / games) * 100) : 0,
      winRate: rowGames(row) > 0 ? round1((rowWins(row) / rowGames(row)) * 100) : null,
    }))
    .sort((a, b) => b.games - a.games)
    .slice(0, 12)

  return { civ, civName: civDisplayName(civ), games, reliable: games >= 50, ages, paths }
}

function metricMap(response: CivStatsResponse): Map<string, CivStatsResponse['data'][number]> {
  return new Map(response.data.map((row) => [row.civilization, row]))
}

function buildMatchup(
  response: MatchupStatsResponse,
  civilization: string,
  opponentCivilization: string,
): ScoutMatchupMeta | null {
  const direct = response.data.find(
    (row) => row.civilization === civilization && row.other_civilization === opponentCivilization,
  )
  const reverse = direct
    ? null
    : response.data.find(
        (row) =>
          row.civilization === opponentCivilization && row.other_civilization === civilization,
      )
  const row = direct ?? reverse
  if (!row) return null
  const directRate = finite(row.win_rate)
  const games = nonNegativeInt(row.games_count)
  const rawWins = finite(row.win_count)
  const wins = rawWins == null ? null : Math.min(games, Math.max(0, Math.floor(rawWins)))
  const reversed = direct == null && civilization !== opponentCivilization
  return {
    civilization,
    civilizationName: civDisplayName(civilization),
    opponentCivilization,
    opponentCivilizationName: civDisplayName(opponentCivilization),
    winRate:
      directRate == null || directRate < 0 || directRate > 100
        ? null
        : round1(reversed ? 100 - directRate : directRate),
    wins: wins == null ? null : reversed ? games - wins : wins,
    games,
    durationMedianSec: finite(row.duration_median),
    durationAverageSec: finite(row.duration_average),
    reliable: games >= 50,
  }
}

function civMultisetKey(civs: string[]): string {
  return [...civs].sort().join('|')
}

function buildTeamCompositions(
  response: TeamStatsResponse | null | undefined,
  teams: ScoutMetaPlayer[][],
): ScoutTeamComposition[] {
  if (!response) return []
  const rows = new Map(response.data.map((row) => [civMultisetKey(row.civilization), row]))
  return teams
    .map((players, teamIndex) => {
      const civilizations = players
        .map((player) => player.civ)
        .filter((civ): civ is string => Boolean(civ))
      if (civilizations.length !== 2) return null
      const row = rows.get(civMultisetKey(civilizations))
      if (!row) return null
      const games = nonNegativeInt(row.games_count)
      const wins = finite(row.win_count)
      return {
        teamIndex,
        civilizations,
        civilizationNames: civilizations.map(civDisplayName),
        winRate: finite(row.win_rate) == null ? null : round1(row.win_rate),
        wins: wins == null ? null : Math.min(games, Math.max(0, Math.floor(wins))),
        games,
        durationMedianSec: finite(row.duration_median),
        durationAverageSec: finite(row.duration_average),
        reliable: games >= 30,
      }
    })
    .filter((value): value is ScoutTeamComposition => value != null)
}

function ageupScope(
  ageups: Record<string, AgeupStatsResponse>,
  requested: ScoutMetaBuildInput['scope'],
): ScoutMetaScope['ageupScope'] {
  const first = Object.values(ageups)[0]
  const filter = first?.filter
  const patchApplied =
    requested.patch == null || (filter?.patch != null && filter.patch.includes(requested.patch))
  const rankLevelApplied =
    requested.rankLevel == null || filter?.rank_level === requested.rankLevel
  const ratingApplied = requested.rating == null || filter?.rating === requested.rating
  const label = [
    patchApplied ? 'current patch' : 'patch scope unavailable',
    rankLevelApplied && ratingApplied ? 'requested bracket' : 'all ratings/ranks',
    'all maps',
  ].join(' · ')
  return {
    patchApplied,
    rankLevelApplied,
    ratingApplied,
    mapApplied: false,
    label,
  }
}

export function buildScoutMetaContext(input: ScoutMetaBuildInput): ScoutMetaContext {
  const overall = metricMap(input.civStats)
  const onMap = input.mapCivStats ? metricMap(input.mapCivStats) : new Map()
  const civs = [
    ...new Set(input.teams.flatMap((team) => team.map((player) => player.civ)).filter(Boolean)),
  ] as string[]
  const teams = input.teams.map((players, teamIndex) => ({
    teamIndex,
    players,
    averageWinRate: (() => {
      const values = players
        .map((player) => overall.get(player.civ ?? '')?.win_rate)
        .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
      return values.length > 0 ? round1(values.reduce((sum, value) => sum + value, 0) / values.length) : null
    })(),
    averageMmr: (() => {
      const values = players
        .map((player) => player.mmr)
        .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
      return values.length > 0 ? round1(values.reduce((sum, value) => sum + value, 0) / values.length) : null
    })(),
    averageElo: (() => {
      const values = players
        .map((player) => player.elo ?? player.rating)
        .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
      return values.length > 0 ? round1(values.reduce((sum, value) => sum + value, 0) / values.length) : null
    })(),
  }))
  const matchupPairs = input.teams.length >= 2
    ? input.teams[0]!.flatMap((left) =>
        input.teams[1]!
          .filter((right) => left.civ && right.civ)
          .map((right) => [left.civ!, right.civ!] as const),
      )
    : []
  const matchups = matchupPairs
    .map(([left, right]) => buildMatchup(input.matchupStats, left, right))
    .filter((value): value is ScoutMatchupMeta => value != null)

  return {
    match: input.match ?? {
      map: input.scope.map,
      leaderboard: input.scope.leaderboard,
      kind: null,
      patch: input.scope.patch,
      averageMmr: null,
      averageRating: null,
      server: null,
      startedAt: null,
      durationSec: null,
    },
    scope: {
      ...input.scope,
      fetchedAt: new Date().toISOString(),
      ageupScope: ageupScope(input.ageups, input.scope),
    },
    teams,
    teamPartners: input.teamPartners ?? [],
    civs: civs.map((civ) => {
      const overallMetric = metricFromRow(overall.get(civ))
      const mapMetric = metricFromRow(onMap.get(civ))
      return {
        civ,
        civName: civDisplayName(civ),
        overall: overallMetric,
        onMap: mapMetric,
        mapDelta:
          overallMetric?.winRate != null && mapMetric?.winRate != null
            ? round1(mapMetric.winRate - overallMetric.winRate)
            : null,
      }
    }),
    matchups,
    teamCompositions: buildTeamCompositions(input.teamStats, input.teams),
    ageups: civs
      .map((civ) => input.ageups[civ] ? ageupFlow(civ, input.ageups[civ]!) : null)
      .filter((value): value is ScoutAgeupFlow => value != null),
  }
}
