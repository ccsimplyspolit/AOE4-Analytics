import { useState } from 'react'
import { ArrowLeft, Medal, Search, Trophy } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import type { RankLevel, StatsLeaderboard } from '@api/types'
import type { ScoutMetaQuery } from '@ipc/contract'
import { PlayerSearch } from '../components/PlayerSearch'
import { ScoutReportCard } from '../components/ScoutReportCard'
import { ScoutLiveMetaCard } from '../components/ScoutLiveMetaCard'
import { PageHead } from '../components/PageHead'
import { ScreenTabs } from '../components/ScreenTabs'
import { ErrorBox, Spinner } from '../components/feedback'
import { useScout, useScoutMeta } from '../queries/useScout'
import { useLiveMatch } from '../queries/useLiveMatch'
import { useI18n } from '../../i18n'
import { LeaderboardPanel } from './Leaderboards'
import { Tournaments } from './Tournaments'

const SECTIONS = [
  { id: 'recon', label: 'Player', icon: Search },
  { id: 'ladders', label: 'Leaderboards', icon: Trophy },
  { id: 'events', label: 'Tournaments', icon: Medal },
] as const

type Section = (typeof SECTIONS)[number]['id']

export function Scout() {
  const { tt } = useI18n()
  const [searchParams, setSearchParams] = useSearchParams()
  const raw = searchParams.get('section')
  const section: Section = SECTIONS.some((item) => item.id === raw) ? (raw as Section) : 'recon'
  const setSection = (id: Section) =>
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous)
        if (id === 'recon') next.delete('section')
        else next.set('section', id)
        return next
      },
      { replace: true },
    )

  return (
    <div className="animate-fade-in space-y-6">
      <PageHead
        kicker="Reconnaissance"
        title="Scout"
        sub="Look up any opponent, browse the live ladder, or open the tournament Elo desk."
      />

      <ScreenTabs
        items={SECTIONS}
        value={section}
        onChange={setSection}
        ariaLabel={tt('Scout sections')}
      />

      {section === 'recon' && <ScoutRecon onOpenSection={setSection} />}
      {section === 'ladders' && <LeaderboardPanel embedded hideHeading />}
      {section === 'events' && <Tournaments embedded />}
    </div>
  )
}

function ScoutRecon({ onOpenSection }: { onOpenSection: (id: Section) => void }) {
  const { tt } = useI18n()
  const [selected, setSelected] = useState<{ profileId: number; name: string } | null>(null)
  const { data, isLoading, refetch } = useScout(selected?.profileId ?? null)
  const { data: live } = useLiveMatch()
  const liveMetaQuery = buildLiveScoutMetaQuery(live)
  const liveMeta = useScoutMeta(liveMetaQuery)

  return (
    <div className="space-y-6">
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
            <ArrowLeft className="h-4 w-4" /> {tt('New scout')}
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
        <div className="grid max-w-3xl gap-3 sm:grid-cols-2">
          <p className="text-sm text-muted-foreground sm:col-span-2">
            {tt('Search a name, or pick a player from the ladder and tournament tables on the other tabs.')}
          </p>
          <button
            type="button"
            onClick={() => onOpenSection('ladders')}
            className="rts-menu-card flex items-start gap-3 border border-border p-4 text-left transition-colors hover:border-primary/40"
          >
            <Trophy className="mt-0.5 h-4 w-4 text-primary" />
            <span>
              <span className="block text-sm font-medium text-foreground">{tt('Browse leaderboards')}</span>
              <span className="mt-1 block text-[12px] text-muted-foreground">
                {tt('Ranked and Quick Match ladders stay here in Scout — open a name from the table to scout them.')}
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => onOpenSection('events')}
            className="rts-menu-card flex items-start gap-3 border border-border p-4 text-left transition-colors hover:border-primary/40"
          >
            <Medal className="mt-0.5 h-4 w-4 text-primary" />
            <span>
              <span className="block text-sm font-medium text-foreground">{tt('Open tournaments')}</span>
              <span className="mt-1 block text-[12px] text-muted-foreground">
                {tt('Tournament Elo and event directories, plus a jump to Stream Desk if you are broadcasting.')}
              </span>
            </span>
          </button>
        </div>
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
