import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ipc } from '@shared/ipc'
import { useSettings } from './useProfile'
import type { AccountReplayPage, ReplayAnalysisTarget } from '@ipc/contract'

/** Paginated local archive; permission and filesystem access stay in main. */
export function useReplays(page = 1, pageSize = 25) {
  const settings = useSettings()
  return useQuery({
    queryKey: ['replays', page, pageSize],
    queryFn: () => ipc.listReplays(page, pageSize),
    enabled: settings.isSuccess && settings.data.localData.consentGranted,
    staleTime: 30_000,
  })
}

/** Account history starts from the local archive; only the explicit refresh fetches it again. */
export function useAccountReplays(page = 1, pageSize = 20, forceRefresh = false) {
  const settings = useSettings()
  return useQuery<AccountReplayPage | null>({
    queryKey: ['account-replays', settings.data?.profileId, page, pageSize, forceRefresh],
    queryFn: async () => {
      const result = await ipc.listAccountReplays(page, pageSize, forceRefresh)
      return result.ok ? result.data : Promise.reject(new Error(result.error.message))
    },
    enabled: settings.isSuccess && settings.data.profileId != null,
    staleTime: 60_000,
  })
}

export function useCacheReplay() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (gameId: number) => ipc.cacheReplay(gameId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['account-replays'] }),
  })
}

export function useCacheReplays() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (gameIds: number[]) => ipc.cacheReplays(gameIds),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['account-replays'] }),
  })
}

export function useCacheSummary() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (gameId: number) => ipc.cacheSummary(gameId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['account-replays'] }),
  })
}

export function useCacheSummaries() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (gameIds: number[]) => ipc.cacheSummaries(gameIds),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['account-replays'] }),
  })
}

export function useReplayAnalysis() {
  return useMutation({
    mutationFn: async (target: ReplayAnalysisTarget) => {
      const result = await ipc.analyzeReplay(target)
      if (!result.ok) throw new Error(result.error.message)
      return result.data
    },
  })
}

/** Downloads (if needed) and combines the online replay with its Relic summary. */
export function useDownloadAndAnalyzeReplay() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (gameId: number) => {
      const result = await ipc.downloadAndAnalyzeReplay(gameId)
      if (!result.ok) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['account-replays'] }),
  })
}
