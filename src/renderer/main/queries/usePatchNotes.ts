import { useQuery } from '@tanstack/react-query'
import { ipc } from '@shared/ipc'

export function usePatchNotes(patchId?: string, refreshNonce = 0) {
  return useQuery({
    queryKey: ['patchNotes', patchId ?? 'current', refreshNonce],
    queryFn: () => ipc.getPatchNotes(patchId, refreshNonce > 0),
    staleTime: 30 * 60_000,
    retry: false,
  })
}
