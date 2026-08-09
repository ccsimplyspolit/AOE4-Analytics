import { useQuery } from '@tanstack/react-query'
import { ipc } from '@shared/ipc'

export function useCivDetailStats(civ: string, enabled = true) {
  return useQuery({
    queryKey: ['civDetailStats', civ],
    queryFn: () => ipc.getCivDetailStats(civ),
    staleTime: 6 * 60 * 60_000,
    enabled: enabled && civ.length > 0,
  })
}
