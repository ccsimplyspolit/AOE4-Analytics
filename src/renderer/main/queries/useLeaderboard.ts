import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { ipc } from '@shared/ipc'
import type { LeaderboardQuery } from '@ipc/contract'

export function useLeaderboard(query: LeaderboardQuery) {
  return useQuery({
    queryKey: ['leaderboard', query.leaderboard, query.page ?? 1, query.country ?? 'all'],
    // Leaderboards are live data. The main-process `fresh` flag also bypasses
    // the disk cache, so a manual refresh cannot silently return the old page.
    queryFn: () => ipc.getLeaderboard({ ...query, fresh: true }),
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
    refetchOnWindowFocus: true,
    placeholderData: keepPreviousData,
  })
}
