import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { GameplayAutoInput, GameplayAutoResult } from '@domain/gameplayAuto'
import { ipc } from '@shared/ipc'

/** Runs the main-process public gameplay search/download/analysis workflow. */
export function useGameplayAuto() {
  const queryClient = useQueryClient()
  return useMutation<GameplayAutoResult, Error, GameplayAutoInput>({
    mutationFn: async (input) => {
      const result = await ipc.autoFindGameplay(input)
      if (!result.ok) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['videoAnalyses'] })
    },
  })
}
