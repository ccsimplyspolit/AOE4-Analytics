import { useMemo, type ReactNode } from 'react'
import { BarChart3, Clock, Map as MapIcon, Swords } from 'lucide-react'
import {
  buildPlayerAnalytics,
  type PlayerAnalyticsIdentity,
  type PlayerAnalyticsInput,
} from '@domain/playerAnalytics'
import type { ScoutMatchRow } from '@ipc/contract'
import type { StoredMatch } from '@store/historyStore'
import type { RankInfo } from '@domain/types'
import type { Breakdown } from '@domain/playerStats'
import { Card, CardContent } from '@shared/components/ui/card'
import { ProfileIdentityCard, CivOverviewTable } from './ProfileOverview'
import { PlaystyleRadar } from './PlaystyleRadar'
import { PlayerMacroStatsCard } from './PlayerMacroStatsCard'
import { WinRateBar } from './WinRateBar'
import { useI18n } from '../../i18n'

export function PlayerAnalyticsCard({
  identity,
  scoutGames = [],
  localMatches = [],
  activeProfileId = null,
}: {
  identity: PlayerAnalyticsIdentity
  scoutGames?: ScoutMatchRow[]
  localMatches?: StoredMatch[]
  activeProfileId?: number | null
}) {
  const { tt } = useI18n()
  const bundle = useMemo(
    () =>
      buildPlayerAnalytics({
        identity,
        scoutGames,
        localMatches,
        activeProfileId,
      } satisfies PlayerAnalyticsInput),
    [identity, scoutGames, localMatches, activeProfileId],
  )

  if (bundle.gameCount === 0 && !identity.primary) {
    return null
  }

  const { stats, playstyle, overview } = bundle

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        <ProfileIdentityCard
          identity={{
            name: identity.name,
            country: identity.country,
            primary: identity.primary,
          }}
          totalGames={stats.totalGames}
          wins={stats.wins}
          losses={stats.losses}
          winRate={stats.winRate}
          longestWinStreak={stats.longestWinStreak}
          longestLossStreak={stats.longestLossStreak}
          tags={playstyle?.tags ?? []}
        />
        {playstyle ? (
          <PlaystyleRadar profile={playstyle} showTags={false} />
        ) : (
          <PublicStatsSummary stats={stats} source={bundle.source} />
        )}
      </div>

      {bundle.macroDisplayGames.length > 0 && (
        <PlayerMacroStatsCard
          games={bundle.macroDisplayGames}
          profileId={identity.profileId}
          playerName={identity.name}
        />
      )}

      {overview && overview.civs.length > 0 && <CivOverviewTable rows={overview.civs} />}

      {stats.byCiv.length > 0 && !overview && (
        <BreakdownGrid
          title={tt('By civilization')}
          icon={<Swords className="h-4 w-4 text-primary" />}
          rows={stats.byCiv.slice(0, 6)}
        />
      )}

      {stats.byFormat.length > 0 && (
        <BreakdownGrid
          title={tt('By team format')}
          icon={<BarChart3 className="h-4 w-4 text-primary" />}
          rows={stats.byFormat.slice(0, 5)}
        />
      )}

      {stats.byMap.length > 0 && (
        <BreakdownGrid
          title={tt('By map')}
          icon={<MapIcon className="h-4 w-4 text-primary" />}
          rows={stats.byMap.slice(0, 6)}
        />
      )}

      {bundle.source === 'public' && (
        <p className="text-xs text-muted-foreground">
          {tt(
            'Public match history only — link your account and sync games for playstyle radar, economy grades, and replay analysis.',
          )}
        </p>
      )}
    </div>
  )
}

function PublicStatsSummary({
  stats,
  source,
}: {
  stats: ReturnType<typeof buildPlayerAnalytics>['stats']
  source: ReturnType<typeof buildPlayerAnalytics>['source']
}) {
  const { tt } = useI18n()
  const r = stats.recent2w
  const recentWr =
    r.wins + r.losses > 0 ? Math.round((r.wins / (r.wins + r.losses)) * 100) : null

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <Clock className="h-4 w-4 text-primary" />
          {tt('Performance snapshot')}
        </h3>
        <p className="text-xs text-muted-foreground">
          {source === 'public'
            ? tt('Based on public AoE4World match history.')
            : tt('Based on synced local match history.')}
        </p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded border border-border/60 px-2 py-1.5">
            <div className="text-muted-foreground">{tt('Win rate')}</div>
            <div className="text-lg font-bold tabular-nums">
              {stats.winRate != null ? `${stats.winRate}%` : '—'}
            </div>
          </div>
          <div className="rounded border border-border/60 px-2 py-1.5">
            <div className="text-muted-foreground">{tt('Last 2 weeks')}</div>
            <div className="text-lg font-bold tabular-nums">
              {recentWr != null ? `${recentWr}%` : '—'}
            </div>
            <div className="text-[10px] text-muted-foreground">
              {r.games} {tt('games')}
            </div>
          </div>
        </div>
        <WinRateBar winRate={stats.winRate} />
      </CardContent>
    </Card>
  )
}

function BreakdownGrid({
  title,
  icon,
  rows,
}: {
  title: string
  icon: ReactNode
  rows: Breakdown[]
}) {
  const { tt, gameName } = useI18n()
  return (
    <Card>
      <CardContent className="space-y-2 p-4">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          {icon}
          {title}
        </h3>
        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row.key} className="space-y-1">
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="truncate">{gameName(row.label)}</span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {row.games}g · {row.wins}–{row.losses}
                </span>
              </div>
              <WinRateBar winRate={row.winRate} />
            </div>
          ))}
        </div>
        {rows.length === 0 && (
          <p className="text-xs text-muted-foreground">{tt('No data yet')}.</p>
        )}
      </CardContent>
    </Card>
  )
}

/** Convenience builder from scout report + history. */
export function analyticsIdentityFromScout(report: {
  profileId: number
  name: string
  country: string | null
  primary: RankInfo | null
}): PlayerAnalyticsIdentity {
  return {
    profileId: report.profileId,
    name: report.name,
    country: report.country,
    primary: report.primary,
  }
}
