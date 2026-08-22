import { Compass, Sparkles, AlertTriangle, CheckCircle2, Clock, Landmark as LandmarkIcon, Coins } from 'lucide-react'
import { Card, CardContent } from '@shared/components/ui/card'
import { Badge } from '@shared/components/ui/badge'
import { cn } from '@shared/lib/utils'
import { analyzeRelicSacredPerformance, type RelicSacredReport } from '@domain/relicSacredTracker'
import type { BuildEvent, PlayerSummary } from '@domain/statsSummary'
import { formatDuration } from '@domain/format'
import { useI18n } from '../../i18n'

export function RelicSacredCard({
  player,
  events = [],
  matchDurationSec,
  className,
}: {
  player: PlayerSummary
  events?: BuildEvent[]
  matchDurationSec?: number
  className?: string
}) {
  const { tt } = useI18n()
  const report: RelicSacredReport = analyzeRelicSacredPerformance(player, events, matchDurationSec)

  const gradeColors: Record<RelicSacredReport['performanceGrade'], string> = {
    S: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    A: 'bg-green-500/15 text-green-400 border-green-500/30',
    B: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    C: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    D: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  }

  const formatSec = (sec: number | null) => (sec != null && sec > 0 ? formatDuration(sec) : '—')

  return (
    <Card className={cn('border-border/60 bg-card/70', className)}>
      <CardContent className="p-5 space-y-5">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="rounded-md bg-amber-500/10 p-2 text-amber-400">
              <Compass className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold tracking-wide text-foreground">
                {tt('Sacred Sites & Relic Opportunity Tracker')}
              </h3>
              <p className="text-xs text-muted-foreground">
                {tt('Analysis of religious timings, monk production, relic control, and sacred sites.')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{tt('Relic Efficiency')}:</span>
            <Badge variant="outline" className={cn('px-2.5 py-0.5 text-sm font-bold', gradeColors[report.performanceGrade])}>
              {tt('Grade')} {report.performanceGrade}
            </Badge>
          </div>
        </div>

        {/* 4 Summary Stat Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-lg bg-background/50 border border-border/40 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>{tt('Relics Captured')}</span>
            </div>
            <div className="mt-1 text-xl font-bold text-foreground">
              {report.relicsCaptured} <span className="text-xs font-normal text-muted-foreground">/ 5</span>
            </div>
            <div className="text-[11px] text-muted-foreground">
              {report.relicsCaptured > 0 ? `+${report.relicsCaptured * 80} ${tt('gold/min')}` : tt('No relics secured')}
            </div>
          </div>

          <div className="rounded-lg bg-background/50 border border-border/40 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <LandmarkIcon className="h-3.5 w-3.5 text-cyan-400" />
              <span>{tt('Sacred Sites')}</span>
            </div>
            <div className="mt-1 text-xl font-bold text-foreground">
              {report.sacredCaptured}
              {report.sacredNeutralized > 0 && (
                <span className="text-xs font-normal text-muted-foreground ml-1.5">
                  ({report.sacredNeutralized} {tt('neutralized')})
                </span>
              )}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {report.sacredLost > 0 ? `${report.sacredLost} ${tt('lost to enemy')}` : tt('Contested on map')}
            </div>
          </div>

          <div className="rounded-lg bg-background/50 border border-border/40 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5 text-primary" />
              <span>{tt('First Monk Timing')}</span>
            </div>
            <div className="mt-1 text-xl font-bold text-foreground">
              {formatSec(report.firstMonkSec)}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {report.monkDelayAfterAge3Sec != null
                ? `+${Math.round(report.monkDelayAfterAge3Sec / 60)}m ${tt('after Castle')}`
                : tt('Religious unit')}
            </div>
          </div>

          <div className="rounded-lg bg-background/50 border border-border/40 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Coins className="h-3.5 w-3.5 text-emerald-400" />
              <span>{tt('Passive Gold Impact')}</span>
            </div>
            <div className="mt-1 text-xl font-bold text-emerald-400">
              +{report.estimatedPassiveGoldGained.toLocaleString()}
            </div>
            <div className="text-[11px] text-rose-400">
              {report.estimatedPassiveGoldLost > 0 ? `-${report.estimatedPassiveGoldLost.toLocaleString()} ${tt('missed')}` : tt('Max efficiency')}
            </div>
          </div>
        </div>

        {/* Actionable Findings & Warnings */}
        {(report.warnings.length > 0 || report.opportunities.length > 0 || report.findings.length > 0) && (
          <div className="space-y-2 pt-2 border-t border-border/40">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {tt('Coach Insights & Opportunity Findings')}
            </h4>

            {report.warnings.map((w, idx) => (
              <div
                key={`warn-${idx}`}
                className="flex items-start gap-2.5 rounded-md bg-rose-500/10 border border-rose-500/25 px-3 py-2 text-xs text-rose-300"
              >
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                <span>{tt(w)}</span>
              </div>
            ))}

            {report.opportunities.map((opp, idx) => (
              <div
                key={`opp-${idx}`}
                className="flex items-start gap-2.5 rounded-md bg-amber-500/10 border border-amber-500/25 px-3 py-2 text-xs text-amber-200"
              >
                <Sparkles className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                <span>{tt(opp)}</span>
              </div>
            ))}

            {report.findings.map((f, idx) => (
              <div
                key={`find-${idx}`}
                className="flex items-start gap-2.5 rounded-md bg-emerald-500/10 border border-emerald-500/25 px-3 py-2 text-xs text-emerald-300"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                <span>{tt(f)}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
