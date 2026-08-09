import { useQuery } from '@tanstack/react-query'
import { ipc } from '@shared/ipc'
import type { SimilarMatchQuery } from '@domain/similarMatch'

export function useSimilarMatches(query: SimilarMatchQuery | null, enabled = true) {
  return useQuery({
    queryKey: ['similarMatches', query],
    queryFn: () => ipc.findSimilarMatches(query!),
    enabled: enabled && query != null,
    // Empty results are often temporary: the account archive may still be
    // refreshing and the public feed changes continuously. Re-run the search
    // when this match is opened instead of silently reusing an old empty page.
    staleTime: 5 * 60_000,
    refetchOnMount: (current) =>
      current.state.data?.ok && current.state.data.data.length > 0 ? true : 'always',
    refetchOnWindowFocus: true,
    retry: 2,
  })
}
