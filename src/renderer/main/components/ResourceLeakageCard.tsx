import { useState } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { Coins, AlertTriangle, Zap, TrendingDown, Hammer } from 'lucide-react'
import { Card, CardContent } from '@shared/components/ui/card'
import { Badge } from '@shared/components/ui/badge'
import { cn } from '@shared/lib/utils'
import { analyzeResourceLeakage, type ResourceLeakageReport } from '@domain/resourceLeakage'
import type { PlayerSummary } from '@domain/statsSummary'
import { useI18n } from '../../i18n'

export function ResourceLeakageCard({
  player,
  matchDurationSec,
  className,
}: {
  player: PlayerSummary
  matchDurationSec?: number
  className?: string
}) {
  const { tt } = useI18n()
  const report: ResourceLeakageReport = analyzeResourceLeakage(player, matchDurationSec)
  const [activeRes, setActiveRes] = useState<'total' | 'wood' | 'food' | 'gold'>('total')

  const gradeColors: Record<ResourceLeakageReport['leakageGrade'], string> = {
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
            <div className="rounded-md bg-amber-500/10 p-2 text-amber-400">
              <Coins className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold tracking-wide text-foreground">
                {tt('Resource Floating & Bank Leakage')}
              </h3>
              <p className="text-xs text-muted-foreground">
                {tt('Tracks unspent bank accumulation and spending efficiency across match timelines.')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{tt('Float Efficiency')}:</span>
            <Badge variant="outline" className={cn('px-2.5 py-0.5 text-sm font-bold', gradeColors[report.leakageGrade])}>
              {tt('Grade')} {report.leakageGrade}
            </Badge>
          </div>
        </div>

        {/* 4 Summary Stat Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-lg bg-background/50 border border-border/40 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Zap className="h-3.5 w-3.5 text-emerald-400" />
              <span>{tt('Reinvestment Rate')}</span>
            </div>
            <div className="mt-1 text-xl font-bold text-foreground">{report.reinvestmentRatePercent}%</div>
            <div className="text-[11px] text-muted-foreground">{tt('Gathered res spent')}</div>
          </div>

          <div className="rounded-lg bg-background/50 border border-border/40 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Coins className="h-3.5 w-3.5 text-primary" />
              <span>{tt('Average Unspent')}</span>
            </div>
            <div className="mt-1 text-xl font-bold text-foreground">{report.avgBank}</div>
            <div className="text-[11px] text-muted-foreground">{tt('Avg banked resources')}</div>
          </div>

          <div className="rounded-lg bg-background/50 border border-border/40 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <TrendingDown className="h-3.5 w-3.5 text-warn" />
              <span>{tt('Peak Bank')}</span>
            </div>
            <div className="mt-1 text-xl font-bold text-warn">{report.peakBank}</div>
            <div className="text-[11px] text-muted-foreground">
              {tt('at')} {Math.floor(report.peakBankTimeSec / 60)}:{String(Math.floor(report.peakBankTimeSec % 60)).padStart(2, '0')}
            </div>
          </div>

          <div className="rounded-lg bg-background/50 border border-border/40 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
              <span>{tt('High Float Time')}</span>
            </div>
            <div className="mt-1 text-xl font-bold text-rose-400">{report.highFloatDurationSec}s</div>
            <div className="text-[11px] text-muted-foreground">{report.highFloatPercentage}% {tt('of game duration')}</div>
          </div>
        </div>

        {/* Resource Filter Buttons */}
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="text-muted-foreground font-semibold uppercase tracking-wider">
            {tt('Resource Bank Timeline')}
          </span>
          <div className="flex items-center gap-1 bg-background/60 p-1 rounded-lg border border-border/40">
            <button
              type="button"
              onClick={() => setActiveRes('total')}
              className={cn(
                'px-2.5 py-1 rounded text-xs font-medium transition-colors',
                activeRes === 'total' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {tt('Total')}
            </button>
            <button
              type="button"
              onClick={() => setActiveRes('wood')}
              className={cn(
                'px-2.5 py-1 rounded text-xs font-medium transition-colors',
                activeRes === 'wood' ? 'bg-amber-600 text-white' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              🌲 {tt('Wood')}
            </button>
            <button
              type="button"
              onClick={() => setActiveRes('food')}
              className={cn(
                'px-2.5 py-1 rounded text-xs font-medium transition-colors',
                activeRes === 'food' ? 'bg-rose-600 text-white' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              🥩 {tt('Food')}
            </button>
            <button
              type="button"
              onClick={() => setActiveRes('gold')}
              className={cn(
                'px-2.5 py-1 rounded text-xs font-medium transition-colors',
                activeRes === 'gold' ? 'bg-yellow-500 text-black font-semibold' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              🪙 {tt('Gold')}
            </button>
          </div>
        </div>

        {/* Recharts Area Chart */}
        {report.chartPoints.length > 0 && (
          <div className="h-56 w-full rounded-lg bg-background/40 border border-border/30 p-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={report.chartPoints} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="gradWood" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d97706" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#d97706" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="gradFood" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="gradGold" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#eab308" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#eab308" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                <XAxis dataKey="timeLabel" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(val: unknown) => [
                    `${typeof val === 'number' ? val : Number(val) || 0} ${tt('unspent')}`,
                    '',
                  ]}
                  labelFormatter={(label) => `${tt('Game Time')}: ${label}`}
                />
                {activeRes === 'total' && (
                  <Area
                    type="monotone"
                    dataKey="total"
                    name={tt('Total Bank')}
                    stroke="#38bdf8"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#gradTotal)"
                  />
                )}
                {activeRes === 'wood' && (
                  <Area
                    type="monotone"
                    dataKey="wood"
                    name={tt('Wood Bank')}
                    stroke="#d97706"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#gradWood)"
                  />
                )}
                {activeRes === 'food' && (
                  <Area
                    type="monotone"
                    dataKey="food"
                    name={tt('Food Bank')}
                    stroke="#ef4444"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#gradFood)"
                  />
                )}
                {activeRes === 'gold' && (
                  <Area
                    type="monotone"
                    dataKey="gold"
                    name={tt('Gold Bank')}
                    stroke="#eab308"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#gradGold)"
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Coach Recommendations & Conversion Insights */}
        {report.recommendations.length > 0 && (
          <div className="space-y-2 rounded-lg bg-background/50 border border-border/40 p-3 text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-primary">
              <Hammer className="h-4 w-4" />
              <span>{tt('Macro Spending & Conversion Advice')}</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              {report.recommendations.map((rec, idx) => (
                <li key={idx} className="text-foreground/90">{rec}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Float Windows Table */}
        {report.intervals.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {tt('Identified Floating Intervals')}
            </h4>
            <div className="space-y-1.5">
              {report.intervals.slice(0, 3).map((interval, idx) => (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-md bg-background/30 border border-border/20 p-2.5 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize text-warn border-warn/30">
                      {interval.dominantResource}
                    </Badge>
                    <span className="text-foreground/90">{interval.advice}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground text-[11px] self-end sm:self-center">
                    <span>
                      {Math.floor(interval.startSec / 60)}:{String(Math.floor(interval.startSec % 60)).padStart(2, '0')} - {Math.floor(interval.endSec / 60)}:{String(Math.floor(interval.endSec % 60)).padStart(2, '0')}
                    </span>
                    <Badge variant="secondary" className="text-[10px]">
                      {interval.durationSec}s
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
