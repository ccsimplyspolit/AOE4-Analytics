import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import type { GameClock } from '@domain/localStats'
import { ipc } from '@shared/ipc'

/** Polls the fused live-match state (process + AoE4World + local logs). */
export function useLiveMatch() {
  return useQuery({
    queryKey: ['liveMatch'],
    queryFn: () => ipc.getLiveMatch(),
    refetchInterval: 8000,
    staleTime: 0,
  })
}

/** Live match plus the clock/APM streams produced by the main-process poller. */
export function useLiveTelemetry() {
  const live = useLiveMatch()
  const [clock, setClock] = useState<GameClock | null>(null)
  const [apm, setApm] = useState<number | null>(null)

  useEffect(() => {
    const offClock = ipc.onOverlayGameClock(setClock)
    const offApm = ipc.onOverlayApm(setApm)
    return () => {
      offClock()
      offApm()
    }
  }, [])

  return { ...live, clock, apm }
}

export function useLaunchGame() {
  return useMutation({ mutationFn: () => ipc.launchGame() })
}
