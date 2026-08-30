/** Unified input for macro profiling — works with scout history rows. */
export type MacroInputRow = {
  durationSec: number | null
  result: 'win' | 'loss' | 'unknown' | null
  civilization: string | null
  map: string | null
  opponentCivilizations: string[]
}

export interface PlayerMacroProfile {
  profileId: number
  totalGames: number
  wins: number
  losses: number
  winRatePct: number
  averageDurationSec: number
  winAverageDurationSec: number
  lossAverageDurationSec: number
  rushGamesCount: number // < 15 min (900s)
  midGamesCount: number // 15 - 28 min (900s - 1680s)
  lateGamesCount: number // > 28 min (1680s)
  playstyleTag: 'Aggressive Rusher' | 'Castle Timing Specialist' | 'Late Game Boomer' | 'Balanced Strategist'
  playstyleDescription: string
  civStats: {
    civ: string
    games: number
    wins: number
    winRatePct: number
  }[]
  mapStats: {
    map: string
    games: number
    wins: number
    winRatePct: number
  }[]
  /** Civs that appear most as opponents in losses — what beats this player */
  opponentCivCounters: {
    civ: string
    appearances: number
  }[]
  /** Last 10 games newest→oldest: 'W' | 'L' | '?' */
  recentForm: ('W' | 'L' | '?')[]
}

export function calculatePlayerMacroProfile(
  matches: MacroInputRow[],
  profileId: number,
): PlayerMacroProfile {
  const validMatches = matches.filter((m) => m && m.durationSec != null && m.durationSec > 0)
  const totalGames = validMatches.length

  const empty: PlayerMacroProfile = {
    profileId,
    totalGames: 0,
    wins: 0,
    losses: 0,
    winRatePct: 0,
    averageDurationSec: 0,
    winAverageDurationSec: 0,
    lossAverageDurationSec: 0,
    rushGamesCount: 0,
    midGamesCount: 0,
    lateGamesCount: 0,
    playstyleTag: 'Balanced Strategist',
    playstyleDescription: 'Недостаточно сыгранных матчей для определения макро-профиля.',
    civStats: [],
    mapStats: [],
    opponentCivCounters: [],
    recentForm: [],
  }

  if (totalGames === 0) return empty

  let wins = 0
  let losses = 0
  let totalDurationSec = 0
  let winDurationSec = 0
  let lossDurationSec = 0
  let rushGamesCount = 0
  let midGamesCount = 0
  let lateGamesCount = 0

  const civMap = new Map<string, { games: number; wins: number }>()
  const mapMap = new Map<string, { games: number; wins: number }>()
  const opponentLossCivs = new Map<string, number>()

  for (const match of validMatches) {
    const dur = match.durationSec ?? 0
    const won = match.result === 'win'

    totalDurationSec += dur

    if (won) {
      wins++
      winDurationSec += dur
    } else {
      losses++
      lossDurationSec += dur
      // Track which opponent civs appear in losses
      for (const opp of match.opponentCivilizations ?? []) {
        opponentLossCivs.set(opp, (opponentLossCivs.get(opp) ?? 0) + 1)
      }
    }

    if (dur < 900) rushGamesCount++
    else if (dur <= 1680) midGamesCount++
    else lateGamesCount++

    if (match.civilization) {
      const entry = civMap.get(match.civilization) ?? { games: 0, wins: 0 }
      entry.games++
      if (won) entry.wins++
      civMap.set(match.civilization, entry)
    }

    if (match.map) {
      const entry = mapMap.get(match.map) ?? { games: 0, wins: 0 }
      entry.games++
      if (won) entry.wins++
      mapMap.set(match.map, entry)
    }
  }

  const avgDur = Math.round(totalDurationSec / totalGames)
  const winAvgDur = wins > 0 ? Math.round(winDurationSec / wins) : 0
  const lossAvgDur = losses > 0 ? Math.round(lossDurationSec / losses) : 0
  const winRatePct = Math.round((wins / totalGames) * 100)

  let playstyleTag: PlayerMacroProfile['playstyleTag'] = 'Balanced Strategist'
  let playstyleDescription =
    'Сбалансированный темп игры: варьирует феодальное давление и переход в Замковую эпоху в зависимости от матчапа.'

  if (rushGamesCount / totalGames >= 0.45) {
    playstyleTag = 'Aggressive Rusher'
    playstyleDescription =
      'Ярко выраженная ранняя агрессия: предпочитает быстрые феодальные пуши, рейды кавалерии и окончание матча до 15 минут.'
  } else if (midGamesCount / totalGames >= 0.5) {
    playstyleTag = 'Castle Timing Specialist'
    playstyleDescription =
      'Специалист по Замковой эпохе: стремится к тайминговой атаке в Замках (15–25 мин) с рыцарями, арбалетами или осадными орудиями.'
  } else if (lateGamesCount / totalGames >= 0.45) {
    playstyleTag = 'Late Game Boomer'
    playstyleDescription =
      'Экономический бум и лейтгейм: играет в 2+ Городских Центра, сбор реликвий и затяжную имперскую войну.'
  }

  const civStats = Array.from(civMap.entries())
    .map(([civ, data]) => ({
      civ,
      games: data.games,
      wins: data.wins,
      winRatePct: Math.round((data.wins / data.games) * 100),
    }))
    .sort((a, b) => b.games - a.games)

  const mapStats = Array.from(mapMap.entries())
    .map(([map, data]) => ({
      map,
      games: data.games,
      wins: data.wins,
      winRatePct: Math.round((data.wins / data.games) * 100),
    }))
    .sort((a, b) => b.games - a.games)
    .slice(0, 8)

  const opponentCivCounters = Array.from(opponentLossCivs.entries())
    .map(([civ, appearances]) => ({ civ, appearances }))
    .sort((a, b) => b.appearances - a.appearances)
    .slice(0, 5)

  // Last 10 in newest-first order (matches arrive newest-first from API)
  const recentForm: ('W' | 'L' | '?')[] = validMatches
    .slice(0, 10)
    .map((m) => (m.result === 'win' ? 'W' : m.result === 'loss' ? 'L' : '?'))

  return {
    profileId,
    totalGames,
    wins,
    losses,
    winRatePct,
    averageDurationSec: avgDur,
    winAverageDurationSec: winAvgDur,
    lossAverageDurationSec: lossAvgDur,
    rushGamesCount,
    midGamesCount,
    lateGamesCount,
    playstyleTag,
    playstyleDescription,
    civStats,
    mapStats,
    opponentCivCounters,
    recentForm,
  }
}


