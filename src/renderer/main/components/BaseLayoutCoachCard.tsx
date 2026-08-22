import React, { useMemo } from 'react'
import type { BuildEvent, PlayerSummary } from '@domain/statsSummary'
import { analyzeBaseLayout } from '@domain/baseLayoutCoach'

interface BaseLayoutCoachCardProps {
  player: PlayerSummary
  events: BuildEvent[]
  matchDurationSec?: number
}

function gradeBadgeClass(grade: string): string {
  switch (grade) {
    case 'S':
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
    case 'A':
      return 'bg-blue-500/20 text-blue-300 border-blue-500/40'
    case 'B':
      return 'bg-amber-500/20 text-amber-300 border-amber-500/40'
    case 'C':
      return 'bg-orange-500/20 text-orange-300 border-orange-500/40'
    default:
      return 'bg-red-500/20 text-red-300 border-red-500/40'
  }
}

export function BaseLayoutCoachCard({
  player,
  events,
  matchDurationSec,
}: BaseLayoutCoachCardProps): React.JSX.Element {
  const report = useMemo(
    () => analyzeBaseLayout(player, events, matchDurationSec ?? 0),
    [player, events, matchDurationSec],
  )

  return (
    <div className="rounded-xl border border-border/50 bg-card/60 p-4 backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">🏰</span>
          <div>
            <h3 className="text-sm font-semibold tracking-wide text-foreground">
              План базы и оборонительные сооружения (Base SimCity Coach)
            </h3>
            <p className="text-xs text-muted-foreground">
              Анализ защитных вышек, стен, ресурсных лагерей и производственных мощностей
            </p>
          </div>
        </div>
        <div
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1 text-xs font-bold ${gradeBadgeClass(
            report.grade,
          )}`}
        >
          <span>Оценка:</span>
          <span className="text-sm font-black">{report.grade}</span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-border/30 bg-muted/20 p-2.5 text-center">
          <div className="text-xs text-muted-foreground">Защитные постройки</div>
          <div className="mt-1 text-lg font-bold text-foreground">
            🛡️ {report.defensiveStructuresCount}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {report.firstDefenseSec != null
              ? `Первая на ${Math.floor(report.firstDefenseSec / 60)}:${String(
                  report.firstDefenseSec % 60,
                ).padStart(2, '0')}`
              : 'Не строились'}
          </div>
        </div>

        <div className="rounded-lg border border-border/30 bg-muted/20 p-2.5 text-center">
          <div className="text-xs text-muted-foreground">Военные заводы</div>
          <div className="mt-1 text-lg font-bold text-foreground">
            ⚔️ {report.militaryProductionBuildingsCount}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {report.firstMilitaryBuildingSec != null
              ? `Первый на ${Math.floor(report.firstMilitaryBuildingSec / 60)}:${String(
                  report.firstMilitaryBuildingSec % 60,
                ).padStart(2, '0')}`
              : 'Не строились'}
          </div>
        </div>

        <div className="rounded-lg border border-border/30 bg-muted/20 p-2.5 text-center">
          <div className="text-xs text-muted-foreground">Ресурсные лагеря</div>
          <div className="mt-1 text-lg font-bold text-foreground">
            🪵 {report.dropOffBuildingsCount}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {report.firstDropOffSec != null
              ? `Старт на ${Math.floor(report.firstDropOffSec / 60)}:${String(
                  report.firstDropOffSec % 60,
                ).padStart(2, '0')}`
              : 'Не строились'}
          </div>
        </div>

        <div className="rounded-lg border border-border/30 bg-muted/20 p-2.5 text-center">
          <div className="text-xs text-muted-foreground">Доля защиты</div>
          <div className="mt-1 text-lg font-bold text-foreground">
            {Math.round(report.defenseRatio * 100)}%
          </div>
          <div className="text-[10px] text-muted-foreground">от всех строений</div>
        </div>
      </div>

      {report.warnings.length > 0 && (
        <div className="mt-3 space-y-1.5 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
          <div className="font-semibold text-red-200">⚠️ Уязвимости обороны и базы:</div>
          <ul className="list-disc space-y-1 pl-4">
            {report.warnings.map((warn, i) => (
              <li key={i}>{warn}</li>
            ))}
          </ul>
        </div>
      )}

      {report.defensiveGaps.length > 0 && (
        <div className="mt-3 space-y-1.5 rounded-lg border border-purple-500/30 bg-purple-500/10 p-3 text-xs text-purple-300">
          <div className="font-semibold text-purple-200">🛡️ Анализ игры от обороны и дефицита защиты:</div>
          <ul className="list-disc space-y-1 pl-4">
            {report.defensiveGaps.map((gap, i) => (
              <li key={i}>{gap}</li>
            ))}
          </ul>
        </div>
      )}

      {report.bottlenecks.length > 0 && (
        <div className="mt-3 space-y-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
          <div className="font-semibold text-amber-200">⚡ Производственные заторы (Macro Bottlenecks):</div>
          <ul className="list-disc space-y-1 pl-4">
            {report.bottlenecks.map((bot, i) => (
              <li key={i}>{bot}</li>
            ))}
          </ul>
        </div>
      )}

      {report.findings.length > 0 && (
        <div className="mt-3 space-y-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
          <div className="font-semibold text-emerald-200">💡 Положительные моменты застройки:</div>
          <ul className="list-disc space-y-1 pl-4">
            {report.findings.map((fin, i) => (
              <li key={i}>{fin}</li>
            ))}
          </ul>
        </div>
      )}

      {report.simCityTips.length > 0 && (
        <div className="mt-3 space-y-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 text-xs text-blue-300">
          <div className="font-semibold text-blue-200">📐 Советы по SimCity и радиусам построек (TC Radius & Aura Grid):</div>
          <ul className="list-disc space-y-1 pl-4">
            {report.simCityTips.map((tip, i) => (
              <li key={i}>{tip}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
