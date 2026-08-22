import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  Clock,
  Compass,
  ExternalLink,
  Layers,
  Sparkles,
  Users,
  Wheat,
  Trees,
  Coins,
  ShieldAlert,
} from 'lucide-react'
import {
  VALDEMAR_MILESTONES_BY_CIV,
  type VisualMilestoneEntry,
} from '@data/valdemarVisualMilestones.generated'
import { civDisplayName } from '@domain/civ'
import { Badge } from '@shared/components/ui/badge'
import { Card, CardContent } from '@shared/components/ui/card'
import { useI18n } from '../../i18n'

export function VisualMilestoneCoachCard({
  civ,
  targetSecond,
  className,
}: {
  civ: string | null
  targetSecond?: number
  className?: string
}) {
  const { locale } = useI18n()
  const isRu = locale === 'ru'

  const milestones = useMemo(() => {
    if (!civ) return []
    return VALDEMAR_MILESTONES_BY_CIV[civ] ?? []
  }, [civ])

  const [selectedIdx, setSelectedIdx] = useState<number>(0)

  const activeMilestone = useMemo(() => {
    if (milestones.length === 0) return null
    if (targetSecond != null) {
      let best = milestones[0]!
      let minDiff = Math.abs(best.second - targetSecond)
      for (const m of milestones) {
        const diff = Math.abs(m.second - targetSecond)
        if (diff < minDiff) {
          minDiff = diff
          best = m
        }
      }
      return best
    }
    return milestones[selectedIdx] ?? milestones[0] ?? null
  }, [milestones, targetSecond, selectedIdx])

  if (!civ || milestones.length === 0 || !activeMilestone) {
    return null
  }

  const { workers, layout, landmark } = activeMilestone
  const totalWorkers = workers.food + workers.wood + workers.gold + workers.stone
  const foodPct = totalWorkers > 0 ? (workers.food / totalWorkers) * 100 : 0
  const woodPct = totalWorkers > 0 ? (workers.wood / totalWorkers) * 100 : 0
  const goldPct = totalWorkers > 0 ? (workers.gold / totalWorkers) * 100 : 0
  const stonePct = totalWorkers > 0 ? (workers.stone / totalWorkers) * 100 : 0

  return (
    <Card className={`border-primary/30 bg-primary/[0.035] ${className ?? ''}`}>
      <CardContent className="space-y-4 p-4">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-start gap-2.5">
            <span className="rounded-md bg-primary/15 p-1.5 text-primary">
              <Compass className="h-4 w-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold">
                  {isRu
                    ? 'Покадровый эталон и схема базы от Valdemar'
                    : 'Valdemar Visual Milestone & Base Blueprint'}
                </h3>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {civDisplayName(civ)}
                </Badge>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {isRu
                  ? 'Точное распределение рабочих по ресурсам и геометрия застройки на ключевых секундах матча.'
                  : 'Frame-verified villager distributions and base geometry at exact match seconds.'}
              </p>
            </div>
          </div>

          <a
            href={activeMilestone.videoUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            {isRu ? 'Кадр в видео' : 'Video Frame'} <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        {/* Milestone Timeline Switcher */}
        {milestones.length > 1 && (
          <div className="flex gap-1 overflow-x-auto border-b border-border/60 pb-2">
            {milestones.map((m, idx) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedIdx(idx)}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  activeMilestone.id === m.id
                    ? 'bg-primary/20 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Clock className="h-3 w-3" />
                <span className="font-mono">{m.formattedTime}</span>
                <span className="text-[10px] opacity-75">
                  {m.age === 1 ? 'Dark' : m.age === 2 ? 'Feudal' : m.age === 3 ? 'Castle' : 'Imp'}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Tactical Directive */}
        <div className="rounded-md border border-border/80 bg-background/60 p-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>
              {isRu ? `Тайминг [${activeMilestone.formattedTime}]` : `Target Timing [${activeMilestone.formattedTime}]`}:
            </span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-foreground">
            {isRu ? activeMilestone.directiveRu : activeMilestone.directiveEn}
          </p>
        </div>

        {/* Worker Allocation HUD Gauge */}
        <div className="space-y-2 rounded-md border border-border/70 bg-card/60 p-3">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              {isRu ? 'Распределение рабочих (HUD)' : 'Worker Allocation HUD'}:
            </span>
            <span className="font-mono text-[11px] text-muted-foreground">
              {workers.total} {isRu ? 'рабочих' : 'vills'} (0 idle)
            </span>
          </div>

          {/* Allocation Bar */}
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-secondary">
            {foodPct > 0 && (
              <div
                style={{ width: `${foodPct}%` }}
                className="bg-amber-500/80 transition-all"
                title={`Food: ${workers.food}`}
              />
            )}
            {woodPct > 0 && (
              <div
                style={{ width: `${woodPct}%` }}
                className="bg-emerald-600/80 transition-all"
                title={`Wood: ${workers.wood}`}
              />
            )}
            {goldPct > 0 && (
              <div
                style={{ width: `${goldPct}%` }}
                className="bg-yellow-400/90 transition-all"
                title={`Gold: ${workers.gold}`}
              />
            )}
            {stonePct > 0 && (
              <div
                style={{ width: `${stonePct}%` }}
                className="bg-slate-400/80 transition-all"
                title={`Stone: ${workers.stone}`}
              />
            )}
          </div>

          {/* Worker Count Pills */}
          <div className="grid grid-cols-4 gap-2 pt-1 text-center text-xs">
            <div className="rounded bg-amber-500/10 p-1.5 text-amber-600 dark:text-amber-400">
              <div className="flex items-center justify-center gap-1 text-[10px] font-semibold">
                <Wheat className="h-3 w-3" /> {isRu ? 'Еда' : 'Food'}
              </div>
              <div className="font-mono text-sm font-bold">{workers.food}</div>
            </div>

            <div className="rounded bg-emerald-500/10 p-1.5 text-emerald-600 dark:text-emerald-400">
              <div className="flex items-center justify-center gap-1 text-[10px] font-semibold">
                <Trees className="h-3 w-3" /> {isRu ? 'Дерево' : 'Wood'}
              </div>
              <div className="font-mono text-sm font-bold">{workers.wood}</div>
            </div>

            <div className="rounded bg-yellow-500/10 p-1.5 text-yellow-600 dark:text-yellow-400">
              <div className="flex items-center justify-center gap-1 text-[10px] font-semibold">
                <Coins className="h-3 w-3" /> {isRu ? 'Золото' : 'Gold'}
              </div>
              <div className="font-mono text-sm font-bold">{workers.gold}</div>
            </div>

            <div className="rounded bg-slate-500/10 p-1.5 text-slate-600 dark:text-slate-400">
              <div className="flex items-center justify-center gap-1 text-[10px] font-semibold">
                <Layers className="h-3 w-3" /> {isRu ? 'Камень' : 'Stone'}
              </div>
              <div className="font-mono text-sm font-bold">{workers.stone}</div>
            </div>
          </div>
        </div>

        {/* Base Layout Diagram Blueprint */}
        {layout && (
          <div className="space-y-2 rounded-md border border-primary/20 bg-background/50 p-3">
            <div className="text-xs font-semibold text-foreground">
              {isRu ? layout.titleRu : layout.titleEn}:
            </div>

            <pre className="overflow-x-auto rounded bg-secondary/80 p-2.5 font-mono text-[11px] leading-relaxed text-primary">
              {layout.ascii}
            </pre>

            <ul className="space-y-1 text-[11px] text-muted-foreground">
              {(isRu ? layout.tipsRu : layout.tipsEn).map((tip, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-primary">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Key Mistake Alert */}
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-2.5 text-xs text-destructive">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <span className="font-semibold">{isRu ? 'Частая ошибка:' : 'Common Pitfall:'} </span>
            <span className="text-foreground/90">
              {isRu ? activeMilestone.mistakeRu : activeMilestone.mistakeEn}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
