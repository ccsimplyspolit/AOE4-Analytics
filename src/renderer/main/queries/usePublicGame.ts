import { useQuery } from '@tanstack/react-query'
import { ipc } from '@shared/ipc'

export function usePublicGame(
  profileId: number | null,
  gameId: number | null,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: ['publicGame', profileId, gameId],
    queryFn: () => ipc.getPublicGame({ profileId: profileId!, gameId: gameId! }),
    enabled: profileId != null && gameId != null && (options?.enabled ?? true),
    staleTime: 5 * 60_000,
  })
}
