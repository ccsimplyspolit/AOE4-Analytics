import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart3,
  Clock,
  Map as MapIcon,
  Swords,
  Hourglass,
  RefreshCw,
  Download,
  ChevronRight,
  Filter,
  ClipboardCheck,
} from 'lucide-react'
import type { StoredMatch } from '@store/historyStore'
import { filterPersonalHistory } from '@domain/historyFilters'
import { resourcesPerMinute, resultFromPerPlayer, villagersPerMinute } from '@domain/analysis'
import type { BenchmarkGame } from '@domain/benchmarkLens'
import { computePlayerStats, type Breakdown, type StatGame } from '@domain/playerStats'
import { computeStatsCoverage, type StatsCoverage } from '@domain/statsCoverage'
import { computePlaystyle, type PlaystyleGame } from '@domain/playstyle'
import {
  computeProfileOverview,
  type PerformanceTiles,
  type ProfileGame,
} from '@domain/profileOverview'
import { computeTrends, type TrendGame } from '@domain/trends'
import { summarizeBuildAuditHistory, type BuildAuditHistoryRow } from '@domain/buildOrderHistory'
import type { RankInfo } from '@domain/types'
import { civDisplayName } from '@domain/civ'
import { formatDurationShort, relativeTime } from '@shared/format'
import { cn } from '@shared/lib/utils'
import { Card, CardContent } from '@shared/components/ui/card'
import {
  useBuildAuditHistory,
  useFullHistory,
  useAnalyzeRecent,
  useMatchCorpusReport,
} from '../queries/useHistory'
import { useDashboard, useSettings, useUpdateSettings } from '../queries/useProfile'
import { WinRateBar } from '../components/WinRateBar'
import { RatingChart } from '../components/RatingChart'
import { PlaystyleRadar } from '../components/PlaystyleRadar'
import { StatTile } from '../components/StatTile'
import { CivOverviewTable, ProfileIdentityCard } from '../components/ProfileOverview'
import { PageHead } from '../components/PageHead'
import { BenchmarkLens } from '../components/BenchmarkLens'
import { EmptyBox, Spinner, ErrorBox } from '../components/feedback'
import { CorpusAnalysisCard } from '../components/CorpusAnalysisCard'
import { useI18n } from '../../i18n'

export function Stats() {
  const { tt, gameName } = useI18n()
  const { data, isLoading, refetch } = useFullHistory()
  const { data: settings } = useSettings()
  const { data: dash } = useDashboard(settings?.profileId != null)
  const { data: buildAudit } = useBuildAuditHistory()
  const analyze = useAnalyzeRecent()
  const corpus = useMatchCorpusReport()
  const updateSettings = useUpdateSettings()
  const [range, setRange] = useState<StatsRange>('all')
  const [civFilter, setCivFilter] = useState('all')
  const [formatFilter, setFormatFilter] = useState('all')
  const excludeAi = settings?.localData.excludeAiFromStats ?? false
  const historyMatches = useMemo(
    () => filterPersonalHistory(data?.ok ? data.data : [], excludeAi),
    [data, excludeAi],
  )
  const civOptions = useMemo(
    () =>
      [...new Set(historyMatches.map((match) => match.civ).filter(Boolean))].sort((a, b) =>
        gameName(civDisplayName(a)).localeCompare(gameName(civDisplayName(b))),
      ),
    [gameName, historyMatches],
  )
  const formatOptions = useMemo(
    () =>
      [
        ...new Set(
          historyMatches
            .map((match) => match.format)
            .filter((value): value is string => Boolean(value)),
        ),
      ].sort(),
    [historyMatches],
  )
  const selectedCiv = civOptions.includes(civFilter) ? civFilter : 'all'
  const selectedFormat = formatOptions.includes(formatFilter) ? formatFilter : 'all'
  const matches = useMemo(() => {
    const cutoff = rangeCutoff(range)
    return historyMatches.filter((match) => {
      const inRange = cutoff == null || Date.parse(match.playedAt) >= cutoff
      const civMatches = selectedCiv === 'all' || match.civ === selectedCiv
      const formatMatches = selectedFormat === 'all' || match.format === selectedFormat
      return inRange && civMatches && formatMatches
    })
  }, [historyMatches, range, selectedCiv, selectedFormat])
  const selectedMatchIds = useMemo(() => new Set(matches.map((match) => match.id)), [matches])
  const visibleBuildAudit = useMemo(
    () =>
      buildAudit?.ok ? buildAudit.data.filter((row) => selectedMatchIds.has(row.matchId)) : [],
    [buildAudit, selectedMatchIds],
  )

  return (
    <div className="animate-fade-in space-y-6">
      <PageHead
        kicker="Chronicle"
        title="My Stats"
        sub="Your playstyle, win-rate breakdowns, and game-by-game history."
        aside={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              disabled={!settings || updateSettings.isPending}
              onClick={() => {
                if (!settings) return
                updateSettings.mutate({
                  localData: {
                    ...settings.localData,
                    excludeAiFromStats: !excludeAi,
                  },
                })
              }}
              aria-pressed={excludeAi}
              title={tt('Keep AI and custom practice games out of the stats on this page')}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-sm border px-3 py-1.5 text-sm transition-colors disabled:opacity-50',
                excludeAi
                  ? 'border-primary/50 bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:bg-secondary hover:text-foreground',
              )}
            >
              <Filter className="h-3.5 w-3.5" />
              {excludeAi ? tt('Practice games hidden') : tt('Hide AI / custom')}
            </button>
            <button
              type="button"
              onClick={() => analyze.mutate(undefined)}
              disabled={analyze.isPending}
              className="inline-flex items-center gap-2 rounded-sm bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', analyze.isPending && 'animate-spin')} />
              {analyze.isPending ? tt('Analyzing…') : tt('Sync all account games')}
            </button>
            <button
              type="button"
              disabled={matches.length === 0}
              onClick={() => downloadStatsCsv(matches, settings?.profileId ?? null)}
              className="inline-flex items-center gap-1.5 rounded-sm border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" />
              {tt('Export CSV')}
            </button>
          </div>
        }
      />

      {analyze.data && !analyze.data.ok && (
        <ErrorBox message={analyze.data.error.message} onRetry={() => analyze.mutate(undefined)} />
      )}
      {analyze.data?.ok && (
        <p className="text-xs text-muted-foreground">
          {tt('Analyzed {new} new game(s) · {total} total · storage: {backend}')
            .replace('{new}', String(analyze.data.data.analyzed))
            .replace('{total}', String(analyze.data.data.total))
            .replace('{backend}', analyze.data.data.backend)}
        </p>
      )}

      <StatsScopeBar
        total={historyMatches.length}
        selected={matches.length}
        range={range}
        civ={selectedCiv}
        format={selectedFormat}
        civOptions={civOptions}
        formatOptions={formatOptions}
        onRangeChange={setRange}
        onCivChange={setCivFilter}
        onFormatChange={setFormatFilter}
        civLabel={(value) => gameName(civDisplayName(value))}
      />

      <CorpusAnalysisCard
        report={corpus.data?.ok ? corpus.data.data : null}
        isPending={corpus.isPending}
        error={
          corpus.data && !corpus.data.ok
            ? corpus.data.error.message
            : corpus.error instanceof Error
              ? corpus.error.message
              : null
        }
        onRun={() => corpus.mutate(undefined)}
      />

      {isLoading && <Spinner />}
      {!isLoading && data && !data.ok && (
        <ErrorBox message={data.error.message} onRetry={() => refetch()} />
      )}

      {!isLoading && data?.ok && matches.length === 0 && (
        <EmptyBox>
          <div className="space-y-1">
            <p>
              {historyMatches.length > 0
                ? tt('No games fit every selected filter.')
                : tt('No analyzed games yet.')}
            </p>
            <p className="text-xs">
              {historyMatches.length > 0
                ? tt('Broaden the view or reset the filters.')
                : tt('Click “Sync all account games” to pull and analyze your matches.')}
            </p>
          </div>
        </EmptyBox>
      )}

      {!isLoading && matches.length > 0 && (
        <Content
          matches={matches}
          buildAuditRows={visibleBuildAudit}
          profileId={settings?.profileId ?? null}
          identity={
            dash?.ok
              ? { name: dash.data.name, country: dash.data.country, primary: dash.data.primary }
              : null
          }
        />
      )}
    </div>
  )
}

type StatsRange = 'all' | '30d' | '90d' | 'year'

function rangeCutoff(range: StatsRange): number | null {
  if (range === 'all') return null
  const days = range === '30d' ? 30 : range === '90d' ? 90 : 365
  return Date.now() - days * 24 * 60 * 60 * 1_000
}

function downloadStatsCsv(matches: StoredMatch[], profileId: number | null): void {
  const header = [
    'date',
    'result',
    'civilization',
    'opponent',
    'map',
    'format',
    'duration_sec',
    'rating',
    'rating_delta',
    'apm',
    'kd',
    'resources_per_min',
  ]
  const rows = matches.map((match) => {
    const mine = match.perPlayer?.find((player) => player.profileId === profileId)
    return [
      match.playedAt,
      displayedResult(match, profileId) ?? '',
      match.civ,
      match.oppCiv ?? '',
      match.map,
      match.format ?? '',
      match.durationSec ?? '',
      match.rating ?? '',
      match.ratingDiff ?? '',
      mine?.apm ?? match.analysis.apm ?? '',
      mine?.kd ?? '',
      resourcesPerMinute(match.local) ?? '',
    ]
  })
  const csv = [header, ...rows]
    .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','))
    .join('\r\n')
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `rtslytics-stats-${new Date().toISOString().slice(0, 10)}.csv`
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

function StatsScopeBar({
  total,
  selected,
  range,
  civ,
  format,
  civOptions,
  formatOptions,
  onRangeChange,
  onCivChange,
  onFormatChange,
  civLabel,
}: {
  total: number
  selected: number
  range: StatsRange
  civ: string
  format: string
  civOptions: string[]
  formatOptions: string[]
  onRangeChange: (value: StatsRange) => void
  onCivChange: (value: string) => void
  onFormatChange: (value: string) => void
  civLabel: (value: string) => string
}) {
  const { tt } = useI18n()
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold">{tt('Stats scope')}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {tt('All personal history is loaded; these filters only change the analysis view.')}
            </p>
          </div>
          <span className="text-xs tabular-nums text-muted-foreground">
            {selected} / {total} {tt('matching games')}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            {tt('Recent window')}
            <select
              value={range}
              onChange={(event) => onRangeChange(event.target.value as StatsRange)}
              className="rounded-sm border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-primary"
            >
              <option value="all">{tt('All loaded history')}</option>
              <option value="30d">{tt('Last 30 days')}</option>
              <option value="90d">{tt('Last 90 days')}</option>
              <option value="year">{tt('Last year')}</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            {tt('Civilization')}
            <select
              value={civ}
              onChange={(event) => onCivChange(event.target.value)}
              className="max-w-52 rounded-sm border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-primary"
            >
              <option value="all">{tt('All civilizations')}</option>
              {civOptions.map((value) => (
                <option key={value} value={value}>
                  {civLabel(value)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            {tt('Format')}
            <select
              value={format}
              onChange={(event) => onFormatChange(event.target.value)}
              className="rounded-sm border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-primary"
            >
              <option value="all">{tt('All formats')}</option>
              {formatOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          {(range !== 'all' || civ !== 'all' || format !== 'all') && (
            <button
              type="button"
              className="text-xs text-primary hover:underline"
              onClick={() => {
                onRangeChange('all')
                onCivChange('all')
                onFormatChange('all')
              }}
            >
              {tt('Reset filters')}
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function Content({
  matches,
  buildAuditRows,
  profileId,
  identity,
}: {
  matches: StoredMatch[]
  buildAuditRows: BuildAuditHistoryRow[]
  profileId: number | null
  identity: { name: string; country: string | null; primary: RankInfo | null } | null
}) {
  const { tt } = useI18n()
  const s = useMemo(() => {
    const games: StatGame[] = matches.map((m) => ({
      result: displayedResult(m, profileId),
      civ: m.civ,
      oppCiv: m.oppCiv,
      map: m.map,
      durationSec: m.durationSec,
      ratingDiff: m.ratingDiff,
      format: m.format,
      playedAt: m.playedAt,
    }))
    return computePlayerStats(games, { civLabel: civDisplayName })
  }, [matches, profileId])

  const playstyle = useMemo(() => {
    const playstyleGames: PlaystyleGame[] = matches.map((m) => {
      const mine = m.perPlayer?.find((p) => p.profileId === profileId)
      return {
        result: displayedResult(m, profileId),
        civ: m.civ,
        durationSec: m.durationSec,
        apm: mine?.apm ?? m.analysis.apm,
        // A grade from a 0-villager parse-miss game is bogus — don't feed it to the radar.
        grade: (m.local?.villagersProduced ?? 0) > 0 ? m.analysis.grade : null,
        local: m.local,
        kd: mine?.kd ?? null,
        deaths: mine?.deaths ?? null,
        unitsProduced: mine?.unitsProduced ?? null,
        techsResearched: mine?.techsResearched ?? null,
      }
    })
    return computePlaystyle(playstyleGames)
  }, [matches, profileId])

  const overview = useMemo(() => {
    const profileGames: ProfileGame[] = matches.map((m) => ({
      civ: m.civ,
      result: displayedResult(m, profileId),
      ratingDiff: m.ratingDiff,
      durationSec: m.durationSec,
      local: m.local,
      perPlayer: m.perPlayer,
    }))
    return computeProfileOverview(profileGames, profileId)
  }, [matches, profileId])

  // Recent-window trends (rating momentum) for the tiles' delta arrows.
  const trends = useMemo(() => {
    const trendGames: TrendGame[] = matches.map((m) => ({
      result: displayedResult(m, profileId),
      rating: m.rating,
      ratingDiff: m.ratingDiff,
      durationSec: m.durationSec,
    }))
    return computeTrends(trendGames)
  }, [matches, profileId])

  const r = s.recent2w
  const recentWr = r.wins + r.losses > 0 ? Math.round((r.wins / (r.wins + r.losses)) * 100) : null
  const coverage = useMemo(() => computeStatsCoverage(matches, profileId), [matches, profileId])
  const benchmarkGames = useMemo<BenchmarkGame[]>(
    () =>
      matches.map((match) => {
        const mine = match.perPlayer?.find((player) => player.profileId === profileId)
        return {
          playedAt: match.playedAt,
          result: displayedResult(match, profileId),
          civ: match.civ,
          map: match.map,
          format: match.format ?? null,
          apm: mine?.apm ?? match.analysis.apm,
          resourcesPerMinute: resourcesPerMinute(match.local),
          villagersPerMinute: villagersPerMinute(match.local),
        }
      }),
    [matches, profileId],
  )

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        <ProfileIdentityCard
          identity={identity}
          totalGames={s.totalGames}
          wins={s.wins}
          losses={s.losses}
          winRate={s.winRate}
          longestWinStreak={s.longestWinStreak}
          longestLossStreak={s.longestLossStreak}
          tags={playstyle.tags}
        />
        <PlaystyleRadar profile={playstyle} showTags={false} />
      </div>

      {/* One performance panel: averages, the rating curve, and the recent-
          fortnight record — instead of three stacked cards. */}
      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="flex items-center gap-1.5 text-sm">
              <Clock className="h-4 w-4 text-primary" />
              {tt('Performance')}
            </h3>
            <span className="text-[11px] tabular-nums text-muted-foreground">
              {tt('Last 2 weeks')}: {r.games} {tt('games')} · {r.wins}
              {tt('W')}–{r.losses}
              {tt('L')}
              {recentWr != null ? ` · ${recentWr}%` : ''} · {r.hours}h {tt('played')}
            </span>
          </div>
          <PerformanceTilesRow tiles={overview.tiles} ratingTrend={trends.rating.delta} />
          <div>
            <div className="rts-ledger-head mb-1.5">{tt('Rating over time')}</div>
            <RatingChart matches={matches} />
          </div>
        </CardContent>
      </Card>

      <BenchmarkLens games={benchmarkGames} />

      <StatsCoverageCard coverage={coverage} />

      <BuildAuditHistoryCard rows={buildAuditRows} />

      <CivOverviewTable rows={overview.civs} />

      <details className="group rounded-lg border border-border/70 bg-background/30">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            {tt('More breakdowns')}
          </span>
          <span className="text-xs font-normal text-muted-foreground">
            {tt('opponent civ, map, format, game length, time of day')}
          </span>
        </summary>
        <div className="border-t border-border/70 p-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <BreakdownCard
              title={tt('Versus opponent civ')}
              icon={<Swords className="h-4 w-4 text-primary" />}
              rows={s.byOppCiv}
              emptyHint={tt('opponent civ not recorded')}
            />
            <BreakdownCard
              title={tt('By map')}
              icon={<MapIcon className="h-4 w-4 text-primary" />}
              rows={s.byMap}
            />
            <BreakdownCard
              title={tt('By team format')}
              icon={<BarChart3 className="h-4 w-4 text-primary" />}
              rows={s.byFormat}
            />
            <BreakdownCard
              title={tt('By game length')}
              icon={<Hourglass className="h-4 w-4 text-primary" />}
              rows={s.byGameLength}
            />
            <BreakdownCard
              title={tt('By time of day')}
              icon={<Clock className="h-4 w-4 text-primary" />}
              rows={s.byTimeOfDay}
            />
          </div>
        </div>
      </details>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold tracking-tight">{tt('Game history')}</h2>
        {matches.map((m) => (
          <MatchCard key={m.id} match={m} profileId={profileId} />
        ))}
      </section>

      <p className="text-xs text-muted-foreground">
        {tt(
          'Computed from your {games} synced games. Small samples are noisy — treat a low game count with caution.',
        ).replace('{games}', String(s.totalGames))}
      </p>
    </>
  )
}

function StatsCoverageCard({ coverage }: { coverage: StatsCoverage }) {
  const { tt } = useI18n()
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold">{tt('Data coverage')}</h3>
          <span className="text-[11px] text-muted-foreground">
            {tt('Missing evidence is excluded, never counted as zero.')}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <CoverageMetric
            label={tt('Resolved results')}
            value={coverage.decided}
            total={coverage.total}
          />
          <CoverageMetric label={tt('Rated games')} value={coverage.rated} total={coverage.total} />
          <CoverageMetric
            label={tt('Relic counters')}
            value={coverage.counters}
            total={coverage.total}
          />
          <CoverageMetric
            label={tt('Economy evidence')}
            value={coverage.economy}
            total={coverage.total}
          />
        </div>
      </CardContent>
    </Card>
  )
}

function CoverageMetric({ label, value, total }: { label: string; value: number; total: number }) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div className="rounded-md border border-border/60 bg-secondary/20 px-2.5 py-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-lg font-semibold tabular-nums">
        {value}/{total}
      </div>
      <div className="text-[11px] tabular-nums text-muted-foreground">{percent}%</div>
    </div>
  )
}

function BuildAuditHistoryCard({ rows }: { rows: BuildAuditHistoryRow[] }) {
  const { tt, gameName } = useI18n()
  const summary = useMemo(() => summarizeBuildAuditHistory(rows), [rows])
  if (rows.length === 0) return null
  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <ClipboardCheck className="h-4 w-4 text-primary" />
          {tt('Build adherence across games')}
        </h2>
        <span className="text-xs text-muted-foreground">
          {summary.scored}/{summary.games} {tt('games scored')} · {summary.available}/
          {summary.games} {tt('with decoded evidence')}
        </span>
      </div>
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            <AuditMetric
              label={tt('Average build score')}
              value={summary.averageScore == null ? '—' : `${summary.averageScore}%`}
            />
            <AuditMetric
              label={tt('Confirmed issues')}
              value={String(summary.confirmedIssues)}
              tone={summary.confirmedIssues > 0 ? 'loss' : 'win'}
            />
            <AuditMetric
              label={tt('Review items')}
              value={String(summary.reviewItems)}
              tone="warn"
            />
            <AuditMetric
              label={tt('Good checkpoints')}
              value={String(summary.strengths)}
              tone="win"
            />
            <AuditMetric
              label={tt('Evidence available')}
              value={`${summary.available}/${summary.games}`}
            />
          </div>
          <div className="overflow-x-auto rounded-md border border-border/70">
            <table className="w-full min-w-[700px] text-xs">
              <thead>
                <tr className="border-b border-border bg-background/40">
                  <th className="rts-ledger-head px-2 py-2 text-left">{tt('Date')}</th>
                  <th className="rts-ledger-head px-2 py-2 text-left">{tt('Civilization')}</th>
                  <th className="rts-ledger-head px-2 py-2 text-left">{tt('Map')}</th>
                  <th className="rts-ledger-head px-2 py-2 text-left">{tt('Reference build')}</th>
                  <th className="rts-ledger-head px-2 py-2 text-right">{tt('Score')}</th>
                  <th className="rts-ledger-head px-2 py-2 text-right">{tt('Good')}</th>
                  <th className="rts-ledger-head px-2 py-2 text-right">{tt('Improve')}</th>
                  <th className="rts-ledger-head px-2 py-2 text-right">{tt('Open')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.matchId} className="border-b border-border/50 last:border-b-0">
                    <td className="px-2 py-2 text-muted-foreground">
                      {relativeTime(row.playedAt)}
                    </td>
                    <td className="px-2 py-2">{gameName(civDisplayName(row.civ))}</td>
                    <td className="px-2 py-2 text-muted-foreground">{row.map || '—'}</td>
                    <td className="max-w-[220px] truncate px-2 py-2 text-muted-foreground">
                      {row.referenceBuild ?? tt('No compatible build')}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">
                      <AuditScore score={row.score} />
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums text-win">
                      {row.strengths || '—'}
                    </td>
                    <td
                      className={cn(
                        'px-2 py-2 text-right tabular-nums',
                        row.confirmedIssues > 0 ? 'text-loss' : 'text-muted-foreground',
                      )}
                    >
                      {row.confirmedIssues + row.reviewItems || '—'}
                    </td>
                    <td className="px-2 py-2">
                      <Link
                        to={`/game/${row.matchId}`}
                        className="inline-flex items-center text-primary hover:underline"
                        title={tt('Open full post-game breakdown')}
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {tt(
              'Only local or cached summaries are included. A missing summary is unavailable evidence, not a zero score.',
            )}
          </p>
        </CardContent>
      </Card>
    </section>
  )
}

function AuditMetric({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: 'win' | 'loss' | 'warn'
}) {
  return (
    <div className="rounded-md border border-border/60 bg-secondary/20 px-2.5 py-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div
        className={cn(
          'mt-0.5 text-lg font-semibold tabular-nums',
          tone === 'win' && 'text-win',
          tone === 'loss' && 'text-loss',
          tone === 'warn' && 'text-warn',
        )}
      >
        {value}
      </div>
    </div>
  )
}

function AuditScore({ score }: { score: number | null }) {
  const { tt } = useI18n()
  if (score == null) return <span className="text-muted-foreground">{tt('Unavailable')}</span>
  return (
    <span
      className={cn(
        'rounded-sm px-1.5 py-0.5 font-semibold',
        score >= 80
          ? 'bg-win/15 text-win'
          : score >= 50
            ? 'bg-warn/15 text-warn'
            : 'bg-loss/15 text-loss',
      )}
    >
      {score}%
    </span>
  )
}

/** Overall performance tiles from real per-game data (- when unavailable). */
function PerformanceTilesRow({
  tiles,
  ratingTrend,
}: {
  tiles: PerformanceTiles
  /** Rating change across the recent window (computeTrends), for the arrow. */
  ratingTrend: number | null
}) {
  const { tt } = useI18n()
  const delta = tiles.ratingDelta
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      <StatTile
        label={tt('Net rating')}
        value={delta == null ? '-' : `${delta > 0 ? '+' : ''}${delta}`}
        accent={delta == null ? undefined : delta >= 0 ? 'win' : 'loss'}
        sub={`${tt('over')} ${tiles.games} ${tt('games')}`}
        delta={ratingTrend}
      />
      <StatTile label="APM" value={tiles.avgApm ?? '-'} sub={tt('avg, Relic counters')} />
      <StatTile label="K/D" value={tiles.avgKd ?? '-'} sub={tt('units, avg')} />
      <StatTile
        label={tt('Units / game')}
        value={tiles.avgUnitsProduced ?? '-'}
        sub={tt('produced, avg')}
      />
      <StatTile label={tt('Kills / game')} value={tiles.avgKills ?? '-'} sub={tt('avg')} />
      <StatTile
        label={tt('Eco pace')}
        value={tiles.avgResourcesPerMinute ?? tiles.avgVillagersPerMinute ?? '-'}
        sub={tiles.avgResourcesPerMinute != null ? tt('resources/min') : tt('villagers/min')}
      />
    </div>
  )
}

function BreakdownCard({
  title,
  icon,
  rows,
  emptyHint,
}: {
  title: string
  icon: ReactNode
  rows: Breakdown[]
  emptyHint?: string
}) {
  const { tt } = useI18n()
  const display = rows
  return (
    <Card>
      <CardContent className="space-y-2.5 p-4">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          {icon}
          {title}
        </h3>
        {display.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            {tt('No data yet')}
            {emptyHint ? ` — ${emptyHint}` : ''}.
          </p>
        ) : (
          <div className="space-y-2">
            {display.map((b) => (
              <WinRateRow key={b.key} b={b} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function WinRateRow({ b }: { b: Breakdown }) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="truncate">{b.label}</span>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {b.games}g · {b.wins}–{b.losses}
        </span>
      </div>
      <WinRateBar winRate={b.winRate} />
    </div>
  )
}

function MatchCard({ match, profileId }: { match: StoredMatch; profileId: number | null }) {
  const { tt, gameName } = useI18n()
  const result = displayedResult(match, profileId)
  const win = result === 'win'
  const loss = result === 'loss'
  const isTeamGame = (match.myTeam?.length ?? 0) > 0 || (match.oppTeam?.length ?? 0) > 1
  const myLabel = isTeamGame
    ? [match.civ, ...(match.myTeam ?? []).map((player) => player.civ)]
        .map((civ) => gameName(civDisplayName(civ)))
        .join(' + ')
    : gameName(civDisplayName(match.civ))
  const oppLabel =
    isTeamGame && match.oppTeam?.length
      ? match.oppTeam.map((p) => gameName(civDisplayName(p.civ))).join(' + ')
      : match.oppCiv
        ? gameName(civDisplayName(match.oppCiv))
        : null
  const mine = match.perPlayer?.find((p) => p.profileId === profileId)
  const apm = mine?.apm ?? match.analysis.apm
  const vpm = villagersPerMinute(match.local)
  const rpm = resourcesPerMinute(match.local)
  // One quiet stat cluster per row (APM · K/D · eco pace) — details live in the
  // game view; the history list stays scannable.
  const statBits = [
    apm != null ? `${apm} APM` : null,
    mine?.kd != null ? `${mine.kd} K/D` : null,
    rpm != null ? `${rpm} ${tt('res/min')}` : vpm != null ? `${vpm} ${tt('vil/min')}` : null,
  ].filter(Boolean)
  return (
    <Card className="transition-colors hover:border-primary/40">
      <Link to={`/game/${match.id}`} className="block" title={tt('Open full post-game breakdown')}>
        <CardContent className="flex items-center gap-3 p-3">
          <span
            className={cn(
              'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-sm font-display font-bold',
              win
                ? 'bg-win/15 text-win'
                : loss
                  ? 'bg-loss/15 text-loss'
                  : 'bg-secondary text-muted-foreground',
            )}
          >
            {win ? tt('W') : loss ? tt('L') : '–'}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">{myLabel}</span>
              {oppLabel && (
                <span className="text-muted-foreground">
                  {tt('vs')} {oppLabel}
                </span>
              )}
              {match.custom && (
                <span className="rounded-sm bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  {match.vsAI ? tt('vs AI') : tt('Custom')}
                </span>
              )}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {match.format ? `${match.format} · ` : ''}
              {match.map} · {formatDurationShort(match.durationSec)} ·{' '}
              {tt(relativeTime(match.playedAt))}
            </div>
          </div>
          {statBits.length > 0 && (
            <span className="hidden shrink-0 text-[11px] tabular-nums text-muted-foreground sm:block">
              {statBits.join(' · ')}
            </span>
          )}
          {match.ratingDiff != null && (
            <span
              className={cn(
                'w-9 shrink-0 text-right tabular-nums text-xs font-semibold',
                match.ratingDiff >= 0 ? 'text-win' : 'text-loss',
              )}
            >
              {match.ratingDiff >= 0 ? '+' : ''}
              {match.ratingDiff}
            </span>
          )}
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </CardContent>
      </Link>
    </Card>
  )
}

function displayedResult(match: StoredMatch, profileId: number | null): 'win' | 'loss' | null {
  return match.result ?? resultFromPerPlayer(match.perPlayer, profileId)
}
