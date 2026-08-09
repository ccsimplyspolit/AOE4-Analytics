import { useQuery } from '@tanstack/react-query'
import { ipc } from '@shared/ipc'
import type { CivMetaQuery, MatchupLabQuery } from '@ipc/contract'
import { isGlobalMatchupLeaderboard } from '@domain/matchupLab'

export function useCivMeta(query: CivMetaQuery) {
  return useQuery({
    queryKey: [
      'civMeta',
      query.leaderboard ?? 'rm_solo',
      query.rankLevel ?? 'all',
      query.rating ?? 'all-ratings',
      query.patch ?? 'current',
      query.mapId ?? 'all-maps',
      query.mapPoolOnly ?? false,
    ],
    queryFn: () => ipc.getCivMeta(query),
    staleTime: 6 * 60 * 60_000,
  })
}

export function useRankedMapPool() {
  return useQuery({
    queryKey: ['rankedMapPool'],
    queryFn: () => ipc.getRankedMapPool(),
    staleTime: 60 * 60_000,
  })
}

export function useMatchupLab(query: MatchupLabQuery) {
  return useQuery({
    queryKey: [
      'matchupLab',
      query.leaderboard ?? 'rm_solo',
      query.rankLevel ?? 'all',
      query.rating ?? 'all-ratings',
      query.patch ?? 'current',
      query.civilization,
      query.opponentCivilization,
    ],
    queryFn: () => ipc.getMatchupLab(query),
    // Team queues do not have a global AoE4World matchup endpoint. The screen
    // still renders personal/local history, but there is no request to retry.
    enabled: isGlobalMatchupLeaderboard(query.leaderboard ?? 'rm_solo'),
    staleTime: 6 * 60 * 60 * 1000,
  })
}
