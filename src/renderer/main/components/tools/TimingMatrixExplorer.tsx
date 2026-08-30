import { useMemo, useState } from 'react'
import {
  Calculator,
  Clock,
  Compass,
  Play,
  Quote,
  Sparkles,
  Timer,
  Trees,
  Users,
  Wheat,
  Coins,
  Layers,
} from 'lucide-react'
import {
  CIV_TIMING_PROFILES,
  evaluateTimingBenchmark,
  type CivTimingProfile,
  type TimingGrade,
} from '@domain/timingMatrix'
import { CIV_SLUGS } from '@data/civs'
import { Badge } from '@shared/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@shared/components/ui/card'
import { useI18n } from '../../../i18n'

const GRADE_COLORS: Record<TimingGrade, string> = {
  S: 'bg-win/15 text-win border-win/35',
  A: 'bg-primary/15 text-primary border-primary/35',
  B: 'bg-warn/15 text-warn border-warn/35',
  C: 'bg-warn/10 text-warn border-warn/25',
  D: 'bg-destructive/15 text-destructive border-destructive/35',
}

export function TimingMatrixExplorer() {
  const { locale, gameName } = useI18n()
  const isRu = locale === 'ru'

  const [selectedCiv, setSelectedCiv] = useState<string>('byzantines')
  const [selectedPhaseIdx, setSelectedPhaseIdx] = useState<number>(1) // Default to Feudal

  // Calculator inputs
  const [userFeudalMin, setUserFeudalMin] = useState<number>(3)
  const [userFeudalSec, setUserFeudalSec] = useState<number>(45)

  const profile: CivTimingProfile = useMemo(() => {
    return CIV_TIMING_PROFILES[selectedCiv] ?? CIV_TIMING_PROFILES['english']!
  }, [selectedCiv])

  const activePhase = profile.phases[selectedPhaseIdx] ?? profile.phases[0]!

  const evaluation = useMemo(() => {
    const totalSec = userFeudalMin * 60 + userFeudalSec
    return evaluateTimingBenchmark(selectedCiv, 'feudal', totalSec)
  }, [selectedCiv, userFeudalMin, userFeudalSec])

  const { idealWorkers } = activePhase
  const totalWorkers =
    idealWorkers.food + idealWorkers.wood + idealWorkers.gold + idealWorkers.stone
  const foodPct = totalWorkers > 0 ? (idealWorkers.food / totalWorkers) * 100 : 0
  const woodPct = totalWorkers > 0 ? (idealWorkers.wood / totalWorkers) * 100 : 0
  const goldPct = totalWorkers > 0 ? (idealWorkers.gold / totalWorkers) * 100 : 0
  const stonePct = totalWorkers > 0 ? (idealWorkers.stone / totalWorkers) * 100 : 0

  return (
    <div className="space-y-6">
      {/* Header card */}
      <Card className="border-primary/30 bg-primary/[0.035]">
        <CardContent className="space-y-2 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="rounded-lg bg-primary/15 p-2 text-primary">
                <Timer className="h-6 w-6" />
              </span>
              <div>
                <h2 className="text-base font-bold tracking-tight">
                  {isRu
                    ? 'Справочник покадровых таймингов и макро-контрольных точек'
                    : 'Frame-Accurate Timing Matrix & Macro Benchmarks'}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {isRu
                    ? 'Эталонные секунды перехода эпох, распределения крестьян и выдержки из транскрипций Valdemar1902.'
                    : 'Target age-up seconds, villager HUD splits, and verified transcript insights from Valdemar1902.'}
                </p>
              </div>
            </div>

            {/* Civ Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground">
                {isRu ? 'Цивилизация:' : 'Civilization:'}
              </span>
              <select
                value={selectedCiv}
                onChange={(e) => setSelectedCiv(e.target.value)}
                className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground focus:border-primary focus:outline-none"
              >
                {CIV_SLUGS.map((slug) => (
                  <option key={slug} value={slug}>
                    {gameName(slug)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main interactive workbench: 2 columns */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Timeline Phases & Blueprint (7 cols) */}
        <div className="space-y-4 lg:col-span-7">
          {/* Phase Selector Tabs */}
          <div className="flex flex-wrap gap-1.5 border-b border-border pb-2">
            {profile.phases.map((phase, idx) => (
              <button
                key={phase.phaseId}
                type="button"
                onClick={() => setSelectedPhaseIdx(idx)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  selectedPhaseIdx === idx
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-secondary/70 text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                <Clock className="h-3 w-3" />
                <span className="font-mono font-bold">{phase.targetFormatted}</span>
                <span className="opacity-90">{isRu ? phase.nameRu.split('(')[0] : phase.nameEn.split('(')[0]}</span>
              </button>
            ))}
          </div>

          {/* Active Phase Card */}
          <Card className="border-border/80 bg-card/60">
            <CardContent className="space-y-4 p-5">
              <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border/60 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-xs font-bold text-primary">
                      {activePhase.targetFormatted}
                    </Badge>
                    <h3 className="text-sm font-bold text-foreground">
                      {isRu ? activePhase.nameRu : activePhase.nameEn}
                    </h3>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {isRu ? activePhase.keyObjectiveRu : activePhase.keyObjectiveEn}
                  </p>
                </div>

                <a
                  href={activePhase.quoteVideoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <Play className="h-3 w-3" />
                  {isRu ? 'Смотреть кадр' : 'Watch Frame'} [{activePhase.quoteTimestamp}]
                </a>
              </div>

              {/* Worker Allocation HUD */}
              <div className="space-y-2 rounded-lg border border-border/60 bg-background/50 p-3">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    {isRu ? 'Эталонное распределение крестьян (HUD)' : 'Target Worker HUD Allocation'}:
                  </span>
                  <span className="font-mono text-xs text-primary">
                    {idealWorkers.total} {isRu ? 'рабочих' : 'vills'} (0 idle)
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="flex h-3.5 w-full overflow-hidden rounded-full bg-secondary">
                  {foodPct > 0 && (
                    <div style={{ width: `${foodPct}%` }} className="bg-amber-500" title="Food" />
                  )}
                  {woodPct > 0 && (
                    <div style={{ width: `${woodPct}%` }} className="bg-emerald-600" title="Wood" />
                  )}
                  {goldPct > 0 && (
                    <div style={{ width: `${goldPct}%` }} className="bg-yellow-400" title="Gold" />
                  )}
                  {stonePct > 0 && (
                    <div style={{ width: `${stonePct}%` }} className="bg-slate-400" title="Stone" />
                  )}
                </div>

                {/* Counter Badges */}
                <div className="grid grid-cols-4 gap-2 pt-1 text-center">
                  <div className="rounded bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400">
                    <div className="flex items-center justify-center gap-1 text-[10px] font-semibold">
                      <Wheat className="h-3 w-3" /> {isRu ? 'Еда' : 'Food'}
                    </div>
                    <div className="font-mono text-sm font-bold">{idealWorkers.food}</div>
                  </div>
                  <div className="rounded bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
                    <div className="flex items-center justify-center gap-1 text-[10px] font-semibold">
                      <Trees className="h-3 w-3" /> {isRu ? 'Дерево' : 'Wood'}
                    </div>
                    <div className="font-mono text-sm font-bold">{idealWorkers.wood}</div>
                  </div>
                  <div className="rounded bg-yellow-500/10 p-2 text-yellow-600 dark:text-yellow-400">
                    <div className="flex items-center justify-center gap-1 text-[10px] font-semibold">
                      <Coins className="h-3 w-3" /> {isRu ? 'Золото' : 'Gold'}
                    </div>
                    <div className="font-mono text-sm font-bold">{idealWorkers.gold}</div>
                  </div>
                  <div className="rounded bg-slate-500/10 p-2 text-slate-600 dark:text-slate-400">
                    <div className="flex items-center justify-center gap-1 text-[10px] font-semibold">
                      <Layers className="h-3 w-3" /> {isRu ? 'Камень' : 'Stone'}
                    </div>
                    <div className="font-mono text-sm font-bold">{idealWorkers.stone}</div>
                  </div>
                </div>
              </div>

              {/* ASCII Layout Blueprint */}
              {activePhase.layoutAscii && (
                <div className="space-y-1.5 rounded-lg border border-primary/20 bg-background/60 p-3">
                  <div className="flex items-center gap-1 text-xs font-semibold text-foreground">
                    <Compass className="h-3.5 w-3.5 text-primary" />
                    <span>{isRu ? 'Схема расстановки базы:' : 'Base Layout Blueprint:'}</span>
                  </div>
                  <pre className="overflow-x-auto rounded bg-secondary/80 p-2 font-mono text-[11px] leading-relaxed text-primary">
                    {activePhase.layoutAscii}
                  </pre>
                </div>
              )}

              {/* Transcript Quote */}
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-primary">
                  <Quote className="h-3.5 w-3.5" />
                  <span>{isRu ? 'Цитата из разбора Valdemar:' : 'Valdemar Masterclass Quote:'}</span>
                </div>
                <p className="mt-1 italic leading-relaxed text-foreground">
                  «{isRu ? activePhase.transcriptQuoteRu : activePhase.transcriptQuoteEn}»
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Diagnostic Calculator & Timing Gates (5 cols) */}
        <div className="space-y-4 lg:col-span-5">
          {/* Timing Evaluator Card */}
          <Card className="border-primary/40 bg-card/80">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-bold">
                <Calculator className="h-4 w-4 text-primary" />
                {isRu ? 'Калькулятор соответствия таймингов' : 'Timing Diagnostic Calculator'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">
                {isRu
                  ? 'Введите время выхода в Феодальную эпоху из вашего последнего реплея для оценки:'
                  : 'Enter your match Feudal completion time to evaluate against pro benchmarks:'}
              </p>

              {/* Time Inputs */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={2}
                    max={10}
                    value={userFeudalMin}
                    onChange={(e) => setUserFeudalMin(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-16 rounded border border-border bg-background p-1.5 text-center font-mono text-sm font-bold focus:border-primary focus:outline-none"
                  />
                  <span className="text-xs font-semibold text-muted-foreground">{isRu ? 'мин' : 'm'}</span>
                </div>

                <span className="text-sm font-bold">:</span>

                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={0}
                    max={59}
                    value={userFeudalSec}
                    onChange={(e) =>
                      setUserFeudalSec(Math.min(59, Math.max(0, parseInt(e.target.value, 10) || 0)))
                    }
                    className="w-16 rounded border border-border bg-background p-1.5 text-center font-mono text-sm font-bold focus:border-primary focus:outline-none"
                  />
                  <span className="text-xs font-semibold text-muted-foreground">{isRu ? 'сек' : 's'}</span>
                </div>

                <Badge variant="outline" className="ml-auto font-mono text-xs">
                  {isRu ? 'Цель:' : 'Target:'} {Math.floor(profile.feudalTargetSec / 60)}:
                  {String(profile.feudalTargetSec % 60).padStart(2, '0')}
                </Badge>
              </div>

              {/* Result Grade Card */}
              <div className={`rounded-lg border p-4 ${GRADE_COLORS[evaluation.grade]}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider">
                    {isRu ? 'Оценка темпа' : 'Pacing Grade'}
                  </span>
                  <span className="font-mono text-2xl font-black">Grade {evaluation.grade}</span>
                </div>

                <p className="mt-2 text-xs font-medium leading-relaxed">
                  {isRu ? evaluation.feedbackRu : evaluation.feedbackEn}
                </p>

                <div className="mt-2 flex items-start gap-1.5 border-t border-current/20 pt-2 text-[11px]">
                  <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    <strong>{isRu ? 'Рекомендация:' : 'Actionable Tip:'} </strong>
                    {isRu ? evaluation.actionableTipRu : evaluation.actionableTipEn}
                  </span>
                </div>
              </div>

              {/* Timing Gates Reference */}
              <div className="space-y-2 border-t border-border/60 pt-3">
                <div className="text-xs font-bold text-foreground">
                  {isRu ? 'Шкала оценки перехода (Feudal Benchmark):' : 'Evaluation Benchmark Scale:'}
                </div>
                <div className="grid gap-1.5 text-xs">
                  <div className="flex items-center justify-between rounded bg-secondary/50 px-2.5 py-1">
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">Grade S (Conqueror)</span>
                    <span className="font-mono">≤ 03:30</span>
                  </div>
                  <div className="flex items-center justify-between rounded bg-secondary/50 px-2.5 py-1">
                    <span className="font-semibold text-primary">Grade A (Diamond)</span>
                    <span className="font-mono">03:31 – 04:05</span>
                  </div>
                  <div className="flex items-center justify-between rounded bg-secondary/50 px-2.5 py-1">
                    <span className="font-semibold text-amber-600 dark:text-amber-400">Grade B (Platinum)</span>
                    <span className="font-mono">04:06 – 04:35</span>
                  </div>
                  <div className="flex items-center justify-between rounded bg-secondary/50 px-2.5 py-1">
                    <span className="font-semibold text-destructive">Grade C / D (Delay)</span>
                    <span className="font-mono">&gt; 04:35</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
