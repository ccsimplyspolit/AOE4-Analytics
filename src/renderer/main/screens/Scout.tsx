import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import type { RankLevel, StatsLeaderboard } from '@api/types'
import type { ScoutMetaQuery } from '@ipc/contract'
import { PlayerSearch } from '../components/PlayerSearch'
import { ScoutReportCard } from '../components/ScoutReportCard'
import { ScoutLiveMetaCard } from '../components/ScoutLiveMetaCard'
import { PageHead } from '../components/PageHead'
import { ErrorBox, Spinner } from '../components/feedback'
import { useScout, useScoutMeta } from '../queries/useScout'
import { useLiveMatch } from '../queries/useLiveMatch'
import { LeaderboardPanel } from './Leaderboards'
import { useI18n } from '../../i18n'

/**
 * Scout: the ladder leaderboard is the default view, with a single search bar on
 * top — type any player name to pull their scout report (rank, form, civs,
 * counters). Clearing the report returns to the leaderboard.
 */
export function Scout() {
  const { tt } = useI18n()
  const [selected, setSelected] = useState<{ profileId: number; name: string } | null>(null)
  const { data, isLoading, refetch } = useScout(selected?.profileId ?? null)
  const { data: live } = useLiveMatch()
  const liveMetaQuery = buildLiveScoutMetaQuery(live)
  const liveMeta = useScoutMeta(liveMetaQuery)

  return (
    <div className="animate-fade-in space-y-6">
      <PageHead
        kicker={tt('Reconnaissance')}
        title={tt('Scout')}
        sub={tt('Look up any opponent: rank, recent form, favourite civs and maps, and how to counter them.')}
      />

      <div className="max-w-xl">
        <PlayerSearch
          autoFocus
          placeholder={tt('Search any player to scout...')}
          onSelect={(hit) => setSelected({ profileId: hit.profileId, name: hit.name })}
        />
      </div>

      {liveMetaQuery && (
        <div className="max-w-5xl">
          {liveMeta.isLoading && <Spinner label={tt('Building live match meta…')} />}
          {!liveMeta.isLoading && liveMeta.data && !liveMeta.data.ok && (
            <ErrorBox message={liveMeta.data.error.message} onRetry={() => void liveMeta.refetch()} />
          )}
          {!liveMeta.isLoading && liveMeta.data?.ok && (
            <ScoutLiveMetaCard context={liveMeta.data.data} />
          )}
        </div>
      )}

      {selected ? (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> {tt('Back to leaderboard')}
          </button>
          <div className="max-w-3xl">
            {isLoading && <Spinner label={tt('Scouting {name}...').replace('{name}', selected.name)} />}
            {!isLoading && data && !data.ok && (
              <ErrorBox message={data.error.message} onRetry={() => refetch()} />
            )}
            {!isLoading && data?.ok && <ScoutReportCard report={data.data} showProfileLink />}
          </div>
        </div>
      ) : (
        <LeaderboardPanel embedded />
      )}
    </div>
  )
}

function buildLiveScoutMetaQuery(
  live: ReturnType<typeof useLiveMatch>['data'],
): ScoutMetaQuery | null {
  if (!live?.isLive || !live.teams || live.teams.length < 2) return null
  const leaderboard = normalizeLeaderboard(live.leaderboard)
  const rankValue = live.opponent?.rankLevel?.replace(/_[1-4]$/, '')
  const rankLevel = rankValue && rankValue !== 'unranked' ? (rankValue as RankLevel) : null
  return {
    leaderboard,
    rankLevel,
    patch: live.patch ?? null,
    map: live.map,
    match: {
      map: live.map,
      leaderboard,
      kind: live.kind,
      patch: live.patch ?? null,
      averageMmr: live.averageMmr,
      averageRating: live.averageRating,
      server: live.server,
      startedAt: live.startedAt,
      durationSec: live.durationSec,
    },
    teams: live.teams.map((team) =>
      team.map((player) => ({
        profileId: player.profileId,
        name: player.name,
        civ: player.civ,
        rating: player.rating,
        elo: player.elo ?? player.rating,
        mmr: player.mmr,
        isMe: player.isMe,
      })),
    ),
  }
}

function normalizeLeaderboard(value: string | null): StatsLeaderboard {
  if (value === 'qm_1v1') return 'qm_1v1'
  if (value === 'rm_2v2' || value === 'rm_3v3' || value === 'rm_4v4') return value
  return 'rm_solo'
}
