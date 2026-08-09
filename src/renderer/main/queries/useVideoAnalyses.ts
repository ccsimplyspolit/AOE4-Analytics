import { useQuery } from '@tanstack/react-query'
import { ipc } from '@shared/ipc'

/** Shared main-process archive; extraction writes through the same boundary. */
export function useVideoAnalyses() {
  return useQuery({
    queryKey: ['videoAnalyses'],
    queryFn: () => ipc.listVideoAnalyses(),
    staleTime: 60_000,
  })
}
