/**
 * MatchDiagnosticsPanel — renders fired ProTip coaching cards for a completed match.
 * Powered by evaluateMatchDiagnostics() from proTips + matchDiagnostics domain.
 */
import { useState } from 'react'
import { ChevronDown, ChevronUp, ExternalLink, Lightbulb, AlertTriangle, Info } from 'lucide-react'
import type { LastMatchCoachContext } from '@domain/coachContext'
import { evaluateMatchDiagnostics, type MatchDiagnostic } from '@domain/matchDiagnostics'
import type { TipSeverity, TipCategory } from '@domain/proTips'
import { Card, CardContent } from '@shared/components/ui/card'
import { Badge } from '@shared/components/ui/badge'
import { useI18n } from '../../i18n'

const CATEGORY_LABELS: Record<TipCategory, { en: string; ru: string }> = {
  macro: { en: 'Macro', ru: 'Макро' },
  micro: { en: 'Micro', ru: 'Микро' },
  economic: { en: 'Economy', ru: 'Экономика' },
  military: { en: 'Military', ru: 'Армия' },
  map: { en: 'Map', ru: 'Карта' },
  psychology: { en: 'Mindset', ru: 'Психология' },
  build_order: { en: 'Build Order', ru: 'Билд-ордер' },
}

function SeverityIcon({ severity }: { severity: TipSeverity }) {
  if (severity === 'critical') {
    return <AlertTriangle className="h-4 w-4 text-destructive" />
  }
  if (severity === 'important') {
    return <Lightbulb className="h-4 w-4 text-amber-500" />
  }
  return <Info className="h-4 w-4 text-muted-foreground" />
}

function severityBadgeClass(severity: TipSeverity): string {
  if (severity === 'critical') return 'border-0 bg-destructive/15 text-destructive'
  if (severity === 'important') return 'border-0 bg-amber-500/15 text-amber-600 dark:text-amber-400'
  return 'border-0 bg-secondary text-muted-foreground'
}

function DiagnosticCard({
  diagnostic,
  isRu,
}: {
  diagnostic: MatchDiagnostic
  isRu: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const { tip, videoUrl, severity } = diagnostic
  const category = CATEGORY_LABELS[tip.category]

  return (
    <div
      className={`rounded-md border bg-card/40 p-3 transition-colors ${
        severity === 'critical'
          ? 'border-destructive/30'
          : severity === 'important'
            ? 'border-amber-500/30'
            : 'border-border/60'
      }`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 shrink-0">
            <SeverityIcon severity={severity} />
          </span>
          <div className="space-y-0.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge className={`text-[9px] ${severityBadgeClass(severity)}`}>
                {isRu
                  ? severity === 'critical'
                    ? 'Критично'
                    : severity === 'important'
                      ? 'Важно'
                      : 'Совет'
                  : severity === 'critical'
                    ? 'Critical'
                    : severity === 'important'
                      ? 'Important'
                      : 'Tip'}
              </Badge>
              <Badge variant="secondary" className="text-[9px]">
                {isRu ? category.ru : category.en}
              </Badge>
              <span className="font-mono text-[9px] text-muted-foreground">
                Beastyqt{' '}
                {tip.videoId === 'macro'
                  ? isRu
                    ? '(Макро)'
                    : '(Macro)'
                  : isRu
                    ? '(Микро)'
                    : '(Micro)'}{' '}
                {tip.timeFormatted}
              </span>
            </div>
            <p className="text-xs font-semibold leading-snug text-foreground">
              {isRu ? tip.shortTextRu : tip.shortText}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="shrink-0 text-muted-foreground hover:text-foreground"
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="mt-2.5 space-y-2 border-t border-border/40 pt-2.5">
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {isRu ? tip.detailTextRu : tip.detailText}
          </p>
          {tip.transcriptQuote && (
            <blockquote className="border-l-2 border-primary/40 pl-2.5 text-[11px] italic text-muted-foreground">
              {tip.transcriptQuote}
            </blockquote>
          )}
          <a
            href={videoUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            {isRu ? 'Смотреть в видео' : 'Watch in video'} @ {tip.timeFormatted}
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}
    </div>
  )
}

export function MatchDiagnosticsPanel({
  context,
  maxCards = 6,
  embedded = false,
}: {
  context: LastMatchCoachContext
  maxCards?: number
  embedded?: boolean
}) {
  const { locale } = useI18n()
  const isRu = locale === 'ru'
  const [showAll, setShowAll] = useState(false)

  const { diagnostics, macroScoreLabel, macroScoreLabelRu } = evaluateMatchDiagnostics(context)

  const displayed = showAll ? diagnostics.slice(0, maxCards) : diagnostics.slice(0, 3)

  if (diagnostics.length === 0) return null

  const body = (
        <div className="space-y-3">
        {/* Section header */}
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-primary" />
              <div className="rts-section-title">
                {isRu ? 'Коучинг от Beastyqt — разбор матча' : 'Beastyqt Match Coaching'}
              </div>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {isRu
                ? 'Советы из макро и микро гайдов Beastyqt, применимые к этому матчу'
                : 'Tips from Beastyqt\'s macro & micro masterclasses, matched to this game'}
            </p>
          </div>
          {/* Macro score badge */}
          <div className="shrink-0 rounded-md border border-border bg-secondary/60 px-2.5 py-1.5 text-center">
            <div className="text-[10px] text-muted-foreground">
              {isRu ? 'Макро-оценка' : 'Macro Score'}
            </div>
            <div className="text-xs font-bold text-foreground">
              {isRu ? macroScoreLabelRu.split(' — ')[0] : macroScoreLabel.split(' — ')[0]}
            </div>
            <div className="max-w-[120px] text-[9px] text-muted-foreground">
              {isRu
                ? macroScoreLabelRu.split(' — ')[1]
                : macroScoreLabel.split(' — ')[1]}
            </div>
          </div>
        </div>

        {/* Diagnostic cards */}
        <div className="space-y-2">
          {displayed.map((d) => (
            <DiagnosticCard key={d.tip.id} diagnostic={d} isRu={isRu} />
          ))}
        </div>

        {/* Show more / less */}
        {diagnostics.length > 3 && (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            {showAll
              ? isRu
                ? '↑ Свернуть'
                : '↑ Show fewer'
              : isRu
                ? `↓ Показать ещё ${diagnostics.length - 3} советов`
                : `↓ Show ${diagnostics.length - 3} more tips`}
          </button>
        )}

        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span>
            {isRu
              ? 'Источник: Beastyqt Macro Guide & Micro Guide (YouTube)'
              : 'Source: Beastyqt Macro Guide & Micro Guide (YouTube)'}
          </span>
        </div>
        </div>
  )

  if (embedded) {
    return <div className="rounded-md border border-border/70 p-4">{body}</div>
  }

  return (
    <Card>
      <CardContent className="p-4">{body}</CardContent>
    </Card>
  )
}