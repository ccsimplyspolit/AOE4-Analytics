import { useQuery } from '@tanstack/react-query'
import { ipc } from '@shared/ipc'
import type { CivMetaQuery, MatchupLabQuery } from '@ipc/contract'
import { isGlobalMatchupLeaderboard } from '@domain/matchupLab'

function civMetaKey(query: CivMetaQuery, phase: 'overview' | 'pool') {
  return [
    'civMeta',
    phase,
    query.leaderboard ?? 'rm_solo',
    query.rankLevel ?? 'all',
    query.rating ?? 'all-ratings',
    query.patch ?? 'current',
    query.mapId ?? 'all-maps',
    query.mapPoolOnly ?? false,
  ] as const
}

export function useCivMeta(query: CivMetaQuery) {
  const overview = useQuery({
    queryKey: civMetaKey(query, 'overview'),
    queryFn: () => ipc.getCivMeta({ ...query, includePoolRankings: false }),
    staleTime: 6 * 60 * 60_000,
  })
  const pooled = useQuery({
    queryKey: civMetaKey(query, 'pool'),
    queryFn: () => ipc.getCivMeta({ ...query, includePoolRankings: true }),
    enabled: query.mapPoolOnly === true && query.mapId == null,
    staleTime: 6 * 60 * 60_000,
  })

  return {
    data: pooled.data?.ok ? pooled.data : overview.data,
    isLoading: overview.isLoading,
    isFetching: overview.isFetching || pooled.isFetching,
    isPooling:
      query.mapPoolOnly === true &&
      query.mapId == null &&
      pooled.isFetching &&
      overview.data?.ok === true,
    isError: overview.isError,
    error: overview.error,
    refetch: () => {
      void overview.refetch()
      if (query.mapPoolOnly === true && query.mapId == null) void pooled.refetch()
    },
  }
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
