import { useMemo } from 'react'
import {
  Clock,
  Flame,
  Shield,
  Swords,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-react'
import type { ScoutMatchRow } from '@ipc/contract'
import { calculatePlayerMacroProfile } from '@domain/playerMacroSummary'
import { formatDurationShort } from '@shared/format'
import { Card, CardContent, CardHeader, CardTitle } from '@shared/components/ui/card'
import { Badge } from '@shared/components/ui/badge'
import { useI18n } from '../../i18n'

export function PlayerMacroStatsCard({
  games,
  profileId,
  playerName,
}: {
  games: ScoutMatchRow[]
  profileId: number
  playerName?: string
}) {
  const { tt, gameName } = useI18n()
  const macro = useMemo(() => calculatePlayerMacroProfile(games, profileId), [games, profileId])

  if (macro.totalGames === 0) {
    return null
  }

  const totalRush = macro.rushGamesCount
  const totalMid = macro.midGamesCount
  const totalLate = macro.lateGamesCount
  const rushPct = Math.round((totalRush / macro.totalGames) * 100)
  const midPct = Math.round((totalMid / macro.totalGames) * 100)
  const latePct = Math.round((totalLate / macro.totalGames) * 100)

  return (
    <Card className="border-primary/20 bg-background/60 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <TrendingUp className="h-5 w-5 text-primary" />
            {tt('Макро-статистика и стиль игры')} {playerName ? `(${playerName})` : ''}
          </CardTitle>
          <Badge
            variant="outline"
            className="flex items-center gap-1.5 border-primary/40 bg-primary/10 text-primary font-medium"
          >
            {macro.playstyleTag === 'Aggressive Rusher' && <Flame className="h-3.5 w-3.5 text-amber-500" />}
            {macro.playstyleTag === 'Castle Timing Specialist' && <Swords className="h-3.5 w-3.5 text-blue-500" />}
            {macro.playstyleTag === 'Late Game Boomer' && <Shield className="h-3.5 w-3.5 text-emerald-500" />}
            {macro.playstyleTag === 'Balanced Strategist' && <Zap className="h-3.5 w-3.5 text-purple-500" />}
            {macro.playstyleTag}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">{macro.playstyleDescription}</p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Timing and Duration Breakdown */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-border bg-background/50 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5 text-primary" />
              {tt('Средняя игра')}
            </div>
            <div className="mt-1 text-lg font-bold">
              {formatDurationShort(macro.averageDurationSec)}
            </div>
            <div className="text-[10px] text-muted-foreground">
              {macro.totalGames} {tt('матчей')}
            </div>
          </div>

          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
            <div className="flex items-center gap-1.5 text-xs text-emerald-400">
              <Target className="h-3.5 w-3.5" />
              {tt('При победах')}
            </div>
            <div className="mt-1 text-lg font-bold text-emerald-300">
              {formatDurationShort(macro.winAverageDurationSec)}
            </div>
            <div className="text-[10px] text-emerald-400/80">
              {macro.wins} {tt('побед')} ({macro.winRatePct}%)
            </div>
          </div>

          <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-3">
            <div className="flex items-center gap-1.5 text-xs text-rose-400">
              <Clock className="h-3.5 w-3.5" />
              {tt('При поражениях')}
            </div>
            <div className="mt-1 text-lg font-bold text-rose-300">
              {formatDurationShort(macro.lossAverageDurationSec)}
            </div>
            <div className="text-[10px] text-rose-400/80">
              {macro.losses} {tt('поражений')}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-background/50 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Zap className="h-3.5 w-3.5 text-amber-400" />
              {tt('Быстрые победы')}
            </div>
            <div className="mt-1 text-lg font-bold text-amber-300">
              {totalRush} <span className="text-xs font-normal text-muted-foreground">(&lt;15м)</span>
            </div>
            <div className="text-[10px] text-muted-foreground">
              {rushPct}% {tt('от всех игр')}
            </div>
          </div>
        </div>

        {/* Phase Duration Spectrum Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{tt('Распределение матчей по длительности:')}</span>
            <span className="font-mono text-[11px]">
              &lt;15м ({rushPct}%) · 15-28м ({midPct}%) · &gt;28м ({latePct}%)
            </span>
          </div>
          <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="bg-amber-500 transition-all"
              style={{ width: `${rushPct}%` }}
              title={`Ранний темп (<15 мин): ${totalRush} игр (${rushPct}%)`}
            />
            <div
              className="bg-blue-500 transition-all"
              style={{ width: `${midPct}%` }}
              title={`Мидгейм / Замки (15-28 мин): ${totalMid} игр (${midPct}%)`}
            />
            <div
              className="bg-purple-500 transition-all"
              style={{ width: `${latePct}%` }}
              title={`Лейтгейм (>28 мин): ${totalLate} игр (${latePct}%)`}
            />
          </div>
        </div>

        {/* Top Civs Breakdown Table */}
        {macro.civStats.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {tt('Эффективность по цивилизациям')}
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {macro.civStats.slice(0, 6).map((c) => (
                <div
                  key={c.civ}
                  className="flex items-center justify-between rounded-md border border-border/80 bg-background/40 px-3 py-2 text-xs"
                >
                  <span className="font-medium">{gameName(c.civ)}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{c.games} игр</span>
                    <Badge
                      variant="secondary"
                      className={`px-1.5 py-0 text-[10px] font-mono ${
                        c.winRatePct >= 55
                          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                          : c.winRatePct <= 45
                            ? 'border-rose-500/40 bg-rose-500/10 text-rose-400'
                            : ''
                      }`}
                    >
                      {c.winRatePct}% WR
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Form — last 10 games */}
        {macro.recentForm.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {tt('Последняя форма')} ({macro.recentForm.length} {tt('матчей')})
            </div>
            <div className="flex gap-1">
              {macro.recentForm.map((r, i) => (
                <span
                  key={i}
                  className={`inline-flex h-6 w-6 items-center justify-center rounded text-[10px] font-bold ${
                    r === 'W'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : r === 'L'
                        ? 'bg-rose-500/20 text-rose-400'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {r}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Map Stats */}
        {macro.mapStats.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {tt('Эффективность по картам')}
            </div>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {macro.mapStats.slice(0, 6).map((m) => (
                <div
                  key={m.map}
                  className="flex items-center justify-between rounded-md border border-border/60 bg-background/30 px-3 py-1.5 text-xs"
                >
                  <span className="truncate font-medium">{gameName(m.map)}</span>
                  <div className="ml-2 flex shrink-0 items-center gap-2">
                    <span className="text-muted-foreground">{m.games}г</span>
                    <span
                      className={
                        m.winRatePct >= 55
                          ? 'font-semibold text-emerald-400'
                          : m.winRatePct <= 45
                            ? 'font-semibold text-rose-400'
                            : 'text-foreground'
                      }
                    >
                      {m.winRatePct}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Opponent civs that appear in losses — "Чего бояться" */}
        {macro.opponentCivCounters.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Shield className="h-3 w-3 text-rose-400" />
              {tt('Чего боится противник (теряет к этим цивам)')}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {macro.opponentCivCounters.map((c) => (
                <Badge
                  key={c.civ}
                  variant="outline"
                  className="border-rose-500/30 bg-rose-500/[0.07] text-rose-300 text-[11px]"
                >
                  {gameName(c.civ)} ×{c.appearances}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

