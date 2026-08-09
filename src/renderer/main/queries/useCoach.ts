import { useQuery } from '@tanstack/react-query'
import { ipc } from '@shared/ipc'

export function useLastMatchCoach(profileId: number | null) {
  return useQuery({
    queryKey: ['tinctureCoach', profileId],
    queryFn: () => ipc.getLastMatchCoach(profileId as number),
    enabled: profileId != null,
    staleTime: 12_000,
  })
}
