import { useMemo } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Lightbulb,
} from 'lucide-react'
import type { LastMatchCoachContext } from '@domain/coachContext'
import { evaluateMatchDiagnostics } from '@domain/matchDiagnostics'
import { Card, CardContent } from '@shared/components/ui/card'
import { useI18n } from '../../i18n'

interface InsightSection {
  id: string
  titleEn: string
  titleRu: string
  status: 'good' | 'warn' | 'bad' | 'info'
  detailEn: string
  detailRu: string
  tipId?: string
  videoUrl?: string
  timeFormatted?: string
}

export function MatchStatsInsightsPanel({
  context,
}: {
  context: LastMatchCoachContext
}) {
  const { locale } = useI18n()
  const isRu = locale === 'ru'

  const { diagnostics, macroScoreLabel, macroScoreLabelRu } = useMemo(
    () => evaluateMatchDiagnostics(context),
    [context],
  )

  const sections = useMemo(() => buildInsightSections(context, diagnostics), [context, diagnostics])

  if (sections.length === 0) return null

  return (
    <Card className="border-primary/20">
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">
                {isRu ? 'Полный отчёт по матчу' : 'Full match insights'}
              </h3>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {isRu
                ? 'Макро, экономика, армия и микро — с отсылками к Beastyqt'
                : 'Macro, economy, army and micro — cited from Beastyqt'}
            </p>
          </div>
          <div className="rounded-md border border-border bg-secondary/50 px-3 py-2 text-center">
            <div className="text-[10px] text-muted-foreground">
              {isRu ? 'Макро-оценка' : 'Macro grade'}
            </div>
            <div className="text-sm font-bold">
              {(isRu ? macroScoreLabelRu : macroScoreLabel).split(' — ')[0]}
            </div>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {sections.map((section) => (
            <InsightCard key={section.id} section={section} isRu={isRu} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function InsightCard({ section, isRu }: { section: InsightSection; isRu: boolean }) {
  const statusIcon =
    section.status === 'good' ? (
      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
    ) : section.status === 'bad' ? (
      <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
    ) : section.status === 'warn' ? (
      <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
    ) : (
      <Lightbulb className="h-3.5 w-3.5 text-muted-foreground" />
    )

  return (
    <div className="rounded-md border border-border/70 bg-background/40 p-3">
      <div className="flex items-start gap-2">
        {statusIcon}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="text-xs font-semibold">{isRu ? section.titleRu : section.titleEn}</div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {isRu ? section.detailRu : section.detailEn}
          </p>
          {section.videoUrl && (
            <a
              href={section.videoUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[10px] font-medium text-primary hover:underline"
            >
              Beastyqt @ {section.timeFormatted}
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

function buildInsightSections(
  context: LastMatchCoachContext,
  diagnostics: ReturnType<typeof evaluateMatchDiagnostics>['diagnostics'],
): InsightSection[] {
  const { player, game } = context
  const durationSec = game.durationSec ?? 0
  const isLoss = player.result === 'loss'
  const isWin = player.result === 'win'
  const mapLower = game.map.toLowerCase()
  const isOpenMap =
    mapLower.includes('arabia') ||
    mapLower.includes('lipany') ||
    mapLower.includes('altai') ||
    mapLower.includes('open')

  const tip = (id: string) => diagnostics.find((d) => d.tip.id === id)

  const sections: InsightSection[] = []

  const macroTip = tip('macro-age-up-timing') ?? tip('macro-tc-idle-avoid')
  sections.push({
    id: 'macro-score',
    titleEn: 'Macro score',
    titleRu: 'Макро-оценка',
    status: isWin && durationSec < 720 ? 'good' : isLoss && durationSec >= 720 ? 'bad' : 'warn',
    detailEn: isWin
      ? `Game length ${Math.floor(durationSec / 60)}m — ${durationSec < 480 ? 'dominant timing' : 'solid macro pace'}.`
      : `Loss at ${Math.floor(durationSec / 60)}m — review TC idle and age-up timing.`,
    detailRu: isWin
      ? `Длина игры ${Math.floor(durationSec / 60)} мин — ${durationSec < 480 ? 'доминирующий темп' : 'уверенное макро'}.`
      : `Поражение на ${Math.floor(durationSec / 60)} мин — проверь простой ТЦ и тайминг age-up.`,
    videoUrl: macroTip?.videoUrl,
    timeFormatted: macroTip?.tip.timeFormatted,
  })

  const ecoTip = tip('macro-farm-wheel') ?? tip('macro-upgrades-timing')
  sections.push({
    id: 'economy',
    titleEn: 'Economy checklist',
    titleRu: 'Экономика',
    status: durationSec >= 480 ? (isLoss ? 'warn' : 'info') : 'good',
    detailEn:
      durationSec >= 480
        ? 'Mid-game: verify Wheelbarrow, farm transition, and villager queue during fights.'
        : 'Early game — focus on constant villager production and build order discipline.',
    detailRu:
      durationSec >= 480
        ? 'Мидгейм: проверь тачку, переход на фермы и очередь крестьян во время боёв.'
        : 'Ранний гейм — постоянное производство крестьян и следование билд-ордеру.',
    videoUrl: ecoTip?.videoUrl,
    timeFormatted: ecoTip?.tip.timeFormatted,
  })

  const armyTip = tip('macro-army-balance') ?? tip('macro-production-timing')
  sections.push({
    id: 'army',
    titleEn: 'Army composition',
    titleRu: 'Армия',
    status: isLoss && durationSec < 600 ? 'bad' : 'info',
    detailEn: isLoss && durationSec < 600
      ? 'Early loss — likely insufficient military during Feudal. Build production before you need it.'
      : 'Balance worker and army production — never boom with zero army.',
    detailRu: isLoss && durationSec < 600
      ? 'Раннее поражение — вероятно мало армии в Феодале. Строй производство заранее.'
      : 'Балансируй крестьян и армию — не бумь без войска.',
    videoUrl: armyTip?.videoUrl,
    timeFormatted: armyTip?.tip.timeFormatted,
  })

  const mapTip = tip('macro-second-tc')
  sections.push({
    id: 'map-control',
    titleEn: 'Map control',
    titleRu: 'Контроль карты',
    status: isOpenMap ? 'info' : 'good',
    detailEn: isOpenMap
      ? 'Open map — contest deer, gold, and map vision early. Consider 2TC on contested resources.'
      : 'Closed map — wall chokepoints and secure safe gold before expanding.',
    detailRu: isOpenMap
      ? 'Открытая карта — борись за оленей, золото и обзор. Рассмотри 2-й ТЦ на спорных ресурсах.'
      : 'Закрытая карта — стены на проходах и безопасное золото до расширения.',
    videoUrl: mapTip?.videoUrl,
    timeFormatted: mapTip?.tip.timeFormatted,
  })

  const microTip = tip('micro-stutter-step') ?? tip('micro-attack-move')
  sections.push({
    id: 'micro',
    titleEn: 'Micro checklist',
    titleRu: 'Микро',
    status: 'info',
    detailEn: 'Use attack-move, stutter-step ranged units, and screen siege with melee.',
    detailRu: 'Используй attack-move, статтер-шаг для стрелков и прикрывай осаду пехотой.',
    videoUrl: microTip?.videoUrl,
    timeFormatted: microTip?.tip.timeFormatted,
  })

  return sections
}
