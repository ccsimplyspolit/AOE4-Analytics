import { useQuery } from '@tanstack/react-query'
import { ipc } from '@shared/ipc'
import type { SimilarMatchQuery } from '@domain/similarMatch'

export function useSimilarMatches(query: SimilarMatchQuery | null, enabled = true) {
  return useQuery({
    queryKey: ['similarMatches', query],
    queryFn: () => ipc.findSimilarMatches(query!),
    enabled: enabled && query != null,
    staleTime: 10 * 60_000,
  })
}
