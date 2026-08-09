import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, BarChart3, Database, Microscope, RefreshCw } from 'lucide-react'
import type { CorpusBreakdown, MatchCorpusReport } from '@domain/matchCorpus'
import { formatDurationShort } from '@shared/format'
import { cn } from '@shared/lib/utils'
import { Card, CardContent } from '@shared/components/ui/card'
import { ErrorBox } from './feedback'
import { useI18n } from '../../i18n'

export function CorpusAnalysisCard({
  report,
  isPending,
  error,
  onRun,
}: {
  report: MatchCorpusReport | null
  isPending: boolean
  error: string | null
  onRun: () => void
}) {
  const { tt, gameName } = useI18n()
  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <Microscope className="h-4 w-4 text-primary" />
          {tt('Detailed match corpus analysis')}
        </h2>
        <button
          type="button"
          onClick={onRun}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded-sm border border-primary/40 px-3 py-1.5 text-xs text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isPending && 'animate-spin')} />
          {isPending ? tt('Decoding all matches…') : tt('Analyze all found matches')}
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        {tt(
          'Joins local or cached match summaries with Relic counters. Missing evidence stays unavailable and is never counted as zero.',
        )}
      </p>
      {error && <ErrorBox message={error} onRetry={onRun} />}
      {isPending && !report && (
        <Card>
          <CardContent className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin text-primary" />
            {tt('Reading cached summaries and building cross-match statistics…')}
          </CardContent>
        </Card>
      )}
      {report && <ReportBody report={report} gameName={gameName} />}
    </section>
  )
}

function ReportBody({
  report,
  gameName,
}: {
  report: MatchCorpusReport
  gameName: (value: string) => string
}) {
  const { tt } = useI18n()
  const c = report.coverage
  const m = report.metrics
  const topRows = report.matches.filter((row) => row.findingIds.length > 0).slice(0, 8)
  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">
            <Metric label={tt('Games')} value={String(c.totalGames)} />
            <Metric
              label={tt('Win rate')}
              value={c.decidedGames > 0 ? `${Math.round((c.wins / c.decidedGames) * 100)}%` : '—'}
              hint={`${c.wins}–${c.losses}`}
            />
            <Metric label={tt('Avg APM')} value={display(m.avgApm)} />
            <Metric label={tt('Avg K/D')} value={display(m.avgKd)} />
            <Metric label={tt('Resources / min')} value={display(m.avgResourcesPerMinute)} />
            <Metric label={tt('Villager high')} value={display(m.avgVillagerHigh)} />
            <Metric label={tt('Feudal lag')} value={formatDuration(m.avgFeudalSec)} />
            <Metric
              label={tt('Build score')}
              value={m.avgBuildScore == null ? '—' : `${m.avgBuildScore}%`}
              hint={`${c.buildScoreGames} ${tt('games scored')}`}
            />
          </div>
          <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
            <CoverageItem icon={<Database className="h-3.5 w-3.5" />} label={tt('Summaries')} value={`${c.summaryGames}/${c.totalGames}`} />
            <CoverageItem icon={<BarChart3 className="h-3.5 w-3.5" />} label={tt('Your player row')} value={`${c.matchedPlayerGames}/${c.summaryGames}`} />
            <CoverageItem icon={<BarChart3 className="h-3.5 w-3.5" />} label={tt('Relic counters')} value={`${c.counterGames}/${c.totalGames}`} />
            <CoverageItem icon={<Microscope className="h-3.5 w-3.5" />} label={tt('High-confidence reviews')} value={`${c.highConfidenceGames}/${c.summaryGames}`} />
          </div>
          <div className="grid grid-cols-2 gap-2 border-t border-border/60 pt-3 sm:grid-cols-4">
            <Metric label={tt('Avg gathered')} value={display(m.avgGathered)} />
            <Metric label={tt('Avg spent')} value={display(m.avgSpent)} />
            <Metric label={tt('Avg kills')} value={display(m.avgKills)} />
            <Metric label={tt('Avg units')} value={display(m.avgUnitsProduced)} />
          </div>
        </CardContent>
      </Card>

      {report.repeatedFindings.length > 0 && (
        <Card>
          <CardContent className="space-y-2.5 p-4">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold">
              <AlertTriangle className="h-4 w-4 text-warn" />
              {tt('Repeated signals to apply')}
            </h3>
            {report.repeatedFindings.slice(0, 6).map((finding) => (
              <div key={finding.id} className="rounded-md border border-border/60 bg-secondary/10 p-2.5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-sm font-medium">{tt(finding.title)}</span>
                  <span className={cn('text-xs tabular-nums', finding.priority === 'high' ? 'text-loss' : 'text-muted-foreground')}>
                    {finding.count}/{c.totalGames} · {finding.rate}%
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{tt(finding.detail)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 lg:grid-cols-3">
        <BreakdownTable title={tt('By civilization')} rows={report.byCiv.slice(0, 6)} gameName={gameName} />
        <BreakdownTable title={tt('By map')} rows={report.byMap.slice(0, 6)} gameName={gameName} />
        <BreakdownTable title={tt('By opponent civilization')} rows={report.byOpponentCiv.slice(0, 6)} gameName={gameName} />
      </div>

      {topRows.length > 0 && (
        <Card>
          <CardContent className="space-y-2 p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-sm font-semibold">{tt('Matches requiring a closer look')}</h3>
              <span className="text-[11px] text-muted-foreground">{tt('Open the match for full timelines')}</span>
            </div>
            <div className="overflow-x-auto rounded-md border border-border/70">
              <table className="w-full min-w-[620px] text-xs">
                <thead>
                  <tr className="border-b border-border bg-background/40">
                    <th className="rts-ledger-head px-2 py-2 text-left">{tt('Match')}</th>
                    <th className="rts-ledger-head px-2 py-2 text-left">{tt('Civilization')}</th>
                    <th className="rts-ledger-head px-2 py-2 text-right">{tt('APM')}</th>
                    <th className="rts-ledger-head px-2 py-2 text-right">{tt('K/D')}</th>
                    <th className="rts-ledger-head px-2 py-2 text-left">{tt('Signals')}</th>
                    <th className="rts-ledger-head px-2 py-2 text-right">{tt('Open')}</th>
                  </tr>
                </thead>
                <tbody>
                  {topRows.map((row) => (
                    <tr key={row.matchId} className="border-b border-border/50 last:border-b-0">
                      <td className="px-2 py-2 text-muted-foreground">{formatDuration(row.durationSec)}</td>
                      <td className="px-2 py-2">{gameName(row.civ)}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{display(row.metrics.apm)}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{display(row.metrics.kd)}</td>
                      <td className="max-w-[260px] truncate px-2 py-2 text-muted-foreground">
                        {row.findingIds.map((id) => findingLabel(id, tt)).join(' · ')}
                      </td>
                      <td className="px-2 py-2 text-right">
                        <Link to={`/game/${row.matchId}`} className="text-primary hover:underline">{tt('Open')}</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
      <details className="rounded-lg border border-border/70 bg-background/30">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">
          <span>{tt('All analyzed matches')}</span>
          <span className="text-xs font-normal text-muted-foreground">
            {c.totalGames > 200 ? `200/${c.totalGames}` : c.totalGames}
          </span>
        </summary>
        <div className="overflow-x-auto border-t border-border/70">
          <table className="w-full min-w-[680px] text-xs">
            <thead>
              <tr className="border-b border-border bg-background/40">
                <th className="rts-ledger-head px-2 py-2 text-left">{tt('Result')}</th>
                <th className="rts-ledger-head px-2 py-2 text-left">{tt('Civilization')}</th>
                <th className="rts-ledger-head px-2 py-2 text-left">{tt('Map')}</th>
                <th className="rts-ledger-head px-2 py-2 text-right">{tt('Summary')}</th>
                <th className="rts-ledger-head px-2 py-2 text-right">{tt('APM')}</th>
                <th className="rts-ledger-head px-2 py-2 text-right">{tt('Build score')}</th>
                <th className="rts-ledger-head px-2 py-2 text-right">{tt('Open')}</th>
              </tr>
            </thead>
            <tbody>
              {report.matches.slice(0, 200).map((row) => (
                <tr key={row.matchId} className="border-b border-border/50 last:border-b-0">
                  <td className={cn('px-2 py-2', row.result === 'win' ? 'text-win' : row.result === 'loss' ? 'text-loss' : 'text-muted-foreground')}>
                    {row.result === 'win' ? tt('W') : row.result === 'loss' ? tt('L') : '—'}
                  </td>
                  <td className="px-2 py-2">{gameName(row.civ)}</td>
                  <td className="px-2 py-2 text-muted-foreground">{row.map}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{row.summaryStatus === 'available' ? tt('Available') : tt('Unavailable')}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{display(row.metrics.apm)}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{row.buildScore == null ? '—' : `${row.buildScore}%`}</td>
                  <td className="px-2 py-2 text-right"><Link to={`/game/${row.matchId}`} className="text-primary hover:underline">{tt('Open')}</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
      <p className="text-[11px] text-muted-foreground">
        {tt('Generated from {count} visible matches at {time}.').replace('{count}', String(c.totalGames)).replace('{time}', new Date(report.generatedAt).toLocaleString())}
      </p>
    </div>
  )
}

function BreakdownTable({
  title,
  rows,
  gameName,
}: {
  title: string
  rows: CorpusBreakdown[]
  gameName: (value: string) => string
}) {
  const { tt } = useI18n()
  return (
    <Card>
      <CardContent className="space-y-2 p-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground">{tt('No data yet')}.</p>
        ) : (
          <div className="space-y-2">
            {rows.map((row) => (
              <div key={row.key} className="space-y-1">
                <div className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="truncate">{gameName(row.label)}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {row.games} · {row.winRate == null ? '—' : `${row.winRate}%`}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1 text-[10px] tabular-nums text-muted-foreground">
                  <span>{tt('APM')} {display(row.avgApm)}</span>
                  <span>{tt('K/D')} {display(row.avgKd)}</span>
                  <span>{tt('res/min')} {display(row.avgResourcesPerMinute)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function CoverageItem({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <span className="inline-flex items-center gap-1.5"><span className="text-primary">{icon}</span>{label}: <strong className="font-medium text-foreground">{value}</strong></span>
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return <div className="rounded-md border border-border/60 bg-secondary/20 px-2 py-1.5"><div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div><div className="text-base font-semibold tabular-nums">{value}</div>{hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}</div>
}

function display(value: number | null): string {
  return value == null || !Number.isFinite(value) ? '—' : String(value)
}

function formatDuration(value: number | null): string {
  return value == null || !Number.isFinite(value) ? '—' : formatDurationShort(value)
}

function findingLabel(id: string, tt: (value: string) => string): string {
  const labels: Record<string, string> = {
    'tc-idle': 'TC idle gaps',
    'low-villager-production': 'Low villager production',
    'low-villager-high': 'Low villager high',
    'poor-trade': 'Poor trades',
    'low-apm': 'Low APM',
    'resource-float': 'Resource float',
    'late-feudal': 'Late Feudal',
    'villager-losses': 'Villager losses',
  }
  return tt(labels[id] ?? id)
}
