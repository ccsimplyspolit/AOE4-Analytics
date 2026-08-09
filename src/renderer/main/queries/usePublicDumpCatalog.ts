import { useQuery } from '@tanstack/react-query'
import { ipc } from '@shared/ipc'

export function usePublicDumpCatalog(enabled = true) {
  return useQuery({
    queryKey: ['publicDumpCatalog'],
    queryFn: () => ipc.getPublicDumpCatalog(),
    enabled,
    staleTime: 15 * 60_000,
    retry: false,
  })
}
