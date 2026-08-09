import { useQuery } from '@tanstack/react-query'
import type { TwitchVodFinderInput } from '@domain/twitchVodFinder'
import { ipc } from '@shared/ipc'

/** One cached exact-game VOD lookup. Custom/AI games have no public game id. */
export function useTwitchVod(input: TwitchVodFinderInput, enabled: boolean) {
  return useQuery({
    queryKey: [
      'twitchVod',
      input.gameId,
      input.profileId ?? null,
      input.civilization,
      input.map ?? null,
      input.durationSec ?? null,
    ],
    queryFn: () => ipc.findTwitchVod(input),
    enabled,
    // VOD association can arrive after a stream finishes, so don't make a
    // "not found" result permanent for the entire app session.
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    retry: false,
  })
}
