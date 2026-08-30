import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { ipc } from '@shared/ipc'
import type { LeaderboardQuery } from '@ipc/contract'

export function useLeaderboard(query: LeaderboardQuery) {
  return useQuery({
    queryKey: ['leaderboard', query.leaderboard, query.page ?? 1, query.country ?? 'all', query.search ?? ''],
    // Renderer refetches can happen on focus and navigation; let the shared
    // ten-minute disk TTL absorb those duplicate public API requests.
    queryFn: () => ipc.getLeaderboard(query),
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
    refetchOnWindowFocus: true,
    placeholderData: keepPreviousData,
  })
}

export function useEsportsLeaderboard(query: {
  page?: number
  search?: string
  showInactive?: boolean
  country?: string
}) {
  return useQuery({
    queryKey: [
      'esports-leaderboard',
      query.page ?? 1,
      query.search ?? '',
      query.showInactive ?? false,
      query.country ?? 'all',
    ],
    queryFn: () => ipc.getEsportsLeaderboard(query),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  })
}
