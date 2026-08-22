import { Clock, Hourglass, Users, AlertCircle, TrendingUp, Coins } from 'lucide-react'
import { Card, CardContent } from '@shared/components/ui/card'
import { Badge } from '@shared/components/ui/badge'
import { cn } from '@shared/lib/utils'
import { analyzeTcIdleTime, type TcIdleReport } from '@domain/tcIdleDetector'
import type { PlayerSummary } from '@domain/statsSummary'
import { useI18n } from '../../i18n'

export function TcIdleTimelineCard({
  player,
  matchDurationSec,
  className,
}: {
  player: PlayerSummary
  matchDurationSec?: number
  className?: string
}) {
  const { tt } = useI18n()
  const report: TcIdleReport = analyzeTcIdleTime(player, matchDurationSec)

  const gradeColors: Record<TcIdleReport['performanceGrade'], string> = {
    S: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    A: 'bg-green-500/15 text-green-400 border-green-500/30',
    B: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    C: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    D: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  }

  return (
    <Card className={cn('border-border/60 bg-card/70', className)}>
      <CardContent className="p-5 space-y-5">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="rounded-md bg-primary/10 p-2 text-primary">
              <Hourglass className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold tracking-wide text-foreground">
                {tt('Town Center Uptime & Idle Detector')}
              </h3>
              <p className="text-xs text-muted-foreground">
                {tt('Analysis of villager production rhythm and age-by-age TC efficiency.')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{tt('15-Min Rating')}:</span>
            <Badge variant="outline" className={cn('px-2.5 py-0.5 text-sm font-bold', gradeColors[report.performanceGrade])}>
              {tt('Grade')} {report.performanceGrade}
            </Badge>
          </div>
        </div>

        {/* 4 Summary Stat Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-lg bg-background/50 border border-border/40 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5 text-primary" />
              <span>{tt('Villagers Trained')}</span>
            </div>
            <div className="mt-1 text-xl font-bold text-foreground">{report.totalVillagersTrained}</div>
            <div className="text-[11px] text-muted-foreground">{tt('Produced throughout match')}</div>
          </div>

          <div className="rounded-lg bg-background/50 border border-border/40 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5 text-warn" />
              <span>{tt('TC Idle Time')}</span>
            </div>
            <div className="mt-1 text-xl font-bold text-foreground">{report.totalIdleSec}s</div>
            <div className="text-[11px] text-muted-foreground">
              {report.first15MinIdleSec}s {tt('in first 15 min')}
            </div>
          </div>

          <div className="rounded-lg bg-background/50 border border-border/40 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
              <span>{tt('15m Uptime')}</span>
            </div>
            <div className="mt-1 text-xl font-bold text-foreground">{report.first15MinUptimePercent}%</div>
            <div className="text-[11px] text-muted-foreground">{report.overallUptimePercent}% {tt('overall')}</div>
          </div>

          <div className="rounded-lg bg-background/50 border border-border/40 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Coins className="h-3.5 w-3.5 text-amber-400" />
              <span>{tt('Lost Eco Potential')}</span>
            </div>
            <div className="mt-1 text-xl font-bold text-rose-400">-{report.lostVillagersTotal} {tt('vills')}</div>
            <div className="text-[11px] text-muted-foreground">~{report.estimatedLostResources.toLocaleString()} {tt('res')}</div>
          </div>
        </div>

        {/* Age-by-Age Breakdown */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {tt('Production Uptime by Age')}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {report.ages.map((age) => (
              <div key={age.age} className="rounded-lg bg-background/40 border border-border/30 p-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">{tt(age.ageLabel)}</span>
                  <span className={cn('font-bold', age.uptimePercent >= 85 ? 'text-emerald-400' : 'text-warn')}>
                    {age.uptimePercent}%
                  </span>
                </div>
                {/* Visual Bar */}
                <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      age.uptimePercent >= 88
                        ? 'bg-emerald-500'
                        : age.uptimePercent >= 75
                        ? 'bg-amber-500'
                        : 'bg-rose-500',
                    )}
                    style={{ width: `${age.uptimePercent}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{age.villagersTrained} {tt('vills')}</span>
                  <span>{age.idleSec}s {tt('idle')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Warnings / Advice */}
        {report.majorIdleWarnings.length > 0 && (
          <div className="space-y-2 rounded-lg bg-warn/10 border border-warn/25 p-3 text-xs text-warn">
            <div className="flex items-center gap-1.5 font-semibold">
              <AlertCircle className="h-4 w-4" />
              <span>{tt('Coach Observations')}</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              {report.majorIdleWarnings.map((warning, idx) => (
                <li key={idx} className="text-foreground/90">{warning}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Major Idle Windows Table (Top 3) */}
        {report.idleWindows.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {tt('Longest Idle Windows')}
            </h4>
            <div className="space-y-1.5">
              {report.idleWindows.slice(0, 3).map((w, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-md bg-background/30 border border-border/20 px-3 py-2 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground font-mono">#{idx + 1}</span>
                    <span className="font-medium text-foreground">{w.contextLabel}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">
                      {Math.floor(w.startSec / 60)}:{String(Math.floor(w.startSec % 60)).padStart(2, '0')} - {Math.floor(w.endSec / 60)}:{String(Math.floor(w.endSec % 60)).padStart(2, '0')}
                    </span>
                    <Badge variant="outline" className="text-rose-400 border-rose-500/30">
                      {w.durationSec}s {tt('idle')}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
