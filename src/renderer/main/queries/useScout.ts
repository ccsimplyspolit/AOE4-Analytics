import { useQuery } from '@tanstack/react-query'
import { ipc } from '@shared/ipc'
import type { ScoutMetaQuery } from '@ipc/contract'

export function useScout(profileId: number | null) {
  return useQuery({
    queryKey: ['scout', profileId],
    queryFn: () => ipc.scoutPlayer(profileId as number),
    enabled: profileId != null,
    staleTime: 60_000,
  })
}

export function useScoutMeta(query: ScoutMetaQuery | null) {
  return useQuery({
    queryKey: [
      'scoutMeta',
      query?.leaderboard ?? null,
      query?.rankLevel ?? null,
      query?.rating ?? null,
      query?.patch ?? null,
      query?.map ?? null,
      query?.match?.startedAt ?? null,
      query?.match?.averageMmr ?? null,
      query?.teams.map((team) => team.map((player) => [player.profileId, player.civ, player.elo, player.mmr, player.rating])),
    ],
    queryFn: () => ipc.getScoutMeta(query as ScoutMetaQuery),
    enabled: query != null,
    staleTime: 6 * 60 * 60_000,
    refetchInterval: 60 * 60_000,
  })
}
