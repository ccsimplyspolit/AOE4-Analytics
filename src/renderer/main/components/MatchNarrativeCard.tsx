import { Activity, ArrowDown, ArrowRight, CheckCircle2, CircleAlert, Clock, Lightbulb } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { PerPlayerMatchStats, Severity, Signal } from '@domain/analysis'
import type { LastMatchCoachContext } from '@domain/coachContext'
import {
  deriveFirstCauseReview,
  type AdvancedReviewCheck,
  type FirstCauseCheck,
  type FirstCauseStatus,
} from '@domain/firstCauseReview'
import { composeMatchNarrative } from '@domain/matchNarrative'
import type { MatchSummary } from '@domain/statsSummary'
import {
  deriveTurningPoints,
  type TurningPoint,
  type TurningPointAnchor,
  type TurningPointTone,
} from '@domain/turningPoints'
import { formatDurationShort } from '@shared/format'
import { cn } from '@shared/lib/utils'
import { Badge } from '@shared/components/ui/badge'
import { Card, CardContent } from '@shared/components/ui/card'
import { useI18n } from '../../i18n'
import { MatchDiagnosticsPanel } from './MatchDiagnosticsPanel'

const TONE_STYLE: Record<TurningPointTone, string> = {
  positive: 'border-win/40 bg-win/5',
  caution: 'border-warn/40 bg-warn/5',
  neutral: 'border-border bg-secondary/20',
}

const DOT_STYLE: Record<TurningPointTone, string> = {
  positive: 'bg-win',
  caution: 'bg-warn',
  neutral: 'bg-primary',
}

const LINK_LABEL: Record<TurningPointAnchor, string> = {
  summary: 'View summary evidence',
  resources: 'View resource evidence',
  score: 'View score evidence',
  'build-order': 'View build order',
}

const EVIDENCE_TARGET: Record<TurningPointAnchor, string> = {
  summary: 'game-summary-evidence',
  resources: 'game-summary-resources',
  score: 'game-summary-score',
  'build-order': 'game-summary-build-order',
}

const STATUS_STYLE: Record<FirstCauseStatus, string> = {
  confirmed: 'bg-destructive/15 text-destructive',
  review: 'bg-warn/15 text-warn',
  clear: 'bg-win/15 text-win',
  unavailable: 'bg-secondary text-muted-foreground',
}

const STATUS_LABEL: Record<FirstCauseStatus, string> = {
  confirmed: 'confirmed fact',
  review: 'replay check',
  clear: 'no flag found',
  unavailable: 'not recorded',
}

const SEVERITY_STYLE: Record<Severity, string> = {
  major: 'bg-destructive/15 text-destructive',
  minor: 'bg-warn/15 text-warn',
  info: 'bg-secondary text-muted-foreground',
  good: 'bg-win/15 text-win',
}

export function MatchNarrativeCard({
  summary,
  loading,
  myProfileId,
  myPlayerId,
  myCiv,
  perPlayer,
  feudalTargetSec,
  signals,
  summaryText,
  coachContext,
}: {
  summary: MatchSummary | null
  loading: boolean
  myProfileId: number | null
  myPlayerId?: number | null
  myCiv: string | null
  perPlayer?: PerPlayerMatchStats[]
  feudalTargetSec?: number | null
  signals?: Signal[]
  summaryText?: string | null
  coachContext?: LastMatchCoachContext | null
}) {
  const { tt } = useI18n()
  const turningPoints = summary
    ? deriveTurningPoints({ summary, myProfileId, myPlayerId, myCiv })
    : []
  const review = summary
    ? deriveFirstCauseReview({
        summary,
        myProfileId,
        myPlayerId,
        myCiv,
        perPlayer,
        feudalTargetSec,
      })
    : null
  const narrative = composeMatchNarrative({
    turningPoints,
    review,
    signals: signals ?? [],
  })
  const isTeamSummary = (summary?.players.length ?? 0) > 2

  return (
    <section id="match-review" className="scroll-mt-4 space-y-2">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <Activity className="h-4 w-4 text-primary" />
          {tt('Match review')}
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {tt(
            'What happened, the earliest cause, and one next-game goal — in a single story, without repeating the same facts.',
          )}
        </p>
      </div>

      <Card>
        <CardContent className="space-y-4 p-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">{tt("Reading the game's stat summary…")}</p>
          ) : !summary ? (
            <p className="text-sm text-muted-foreground">
              {tt(
                "This review needs the game's post-match summary, which is not available for this game.",
              )}
            </p>
          ) : (
            <>
              {summaryText && (
                <p className="text-sm text-muted-foreground">{tt(summaryText)}</p>
              )}

              <div className="grid gap-3 lg:grid-cols-2">
                <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
                  <div className="flex items-center gap-1.5 text-sm font-semibold">
                    <CircleAlert className="h-4 w-4 text-primary" />
                    {tt('Earliest point to test')}
                  </div>
                  {narrative.firstCause ? (
                    <>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {tt('Start at')} {formatDurationShort(narrative.firstCause.timeSec)} ·{' '}
                        {tt(
                          narrative.firstCause.category === 'execution-under-pressure'
                            ? 'Execution under pressure'
                            : narrative.firstCause.category === 'mechanics'
                              ? 'Mechanics'
                              : narrative.firstCause.category === 'decision'
                                ? 'Decision'
                                : 'Information',
                        )}
                        .
                      </p>
                      <p className="mt-2 text-xs leading-relaxed">
                        {tt(narrative.firstCause.rationale)}
                      </p>
                    </>
                  ) : (
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {tt(
                        'No early causal claim is supported by this summary. Start with the information check in the replay instead of blaming the final fight.',
                      )}
                    </p>
                  )}
                </div>
                <div className="rounded-md border border-win/30 bg-win/5 p-3">
                  <div className="flex items-center gap-1.5 text-sm font-semibold">
                    <Lightbulb className="h-4 w-4 text-win" />
                    {tt('One next-game goal')}
                  </div>
                  {narrative.nextGoal ? (
                    <>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        <span className="font-medium text-foreground">{tt('Trigger')}:</span>{' '}
                        {tt(narrative.nextGoal.trigger)}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        <span className="font-medium text-foreground">{tt('Action')}:</span>{' '}
                        {tt(narrative.nextGoal.action)}
                      </p>
                    </>
                  ) : (
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {tt('No standout issues this game — a clean, balanced performance.')}
                    </p>
                  )}
                </div>
              </div>

              {isTeamSummary && (
                <p className="rounded-md border border-border bg-secondary/30 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                  {tt(
                    'Team summary: these moments use only your own timelines. The summary does not identify which other rows are allies, so it does not make opponent comparisons.',
                  )}
                </p>
              )}

              <div className="space-y-2">
                <h3 className="text-sm font-semibold">{tt('How the game unfolded')}</h3>
                {narrative.turningPoints.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {tt(
                      'No evidence-backed turning points could be produced because your player row or the required timeline data was unavailable.',
                    )}
                  </p>
                ) : (
                  <ol className="space-y-3">
                    {narrative.turningPoints.map((point, index) => (
                      <StoryCard key={point.id} point={point} number={index + 1} />
                    ))}
                  </ol>
                )}
              </div>

              {narrative.extraChecks.length > 0 && (
                <div className="space-y-2 border-t border-border/70 pt-4">
                  <h3 className="text-sm font-semibold">{tt('Additional findings')}</h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {narrative.extraChecks.map((item) => (
                      <CheckCard key={item.lane} check={item} />
                    ))}
                  </div>
                </div>
              )}

              {narrative.extraSignals.length > 0 && (
                <div className="space-y-2 border-t border-border/70 pt-4">
                  <h3 className="text-sm font-semibold">{tt('Other notes')}</h3>
                  <div className="space-y-2">
                    {narrative.extraSignals.map((sig) => (
                      <div key={sig.id} className="flex items-start gap-2">
                        <span
                          className={cn(
                            'mt-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase',
                            SEVERITY_STYLE[sig.severity],
                          )}
                        >
                          {tt(
                            sig.severity === 'major'
                              ? 'Major'
                              : sig.severity === 'minor'
                                ? 'Minor'
                                : sig.severity === 'good'
                                  ? 'Good'
                                  : 'Info',
                          )}
                        </span>
                        <div>
                          <div className="text-sm font-medium">{tt(sig.title)}</div>
                          <div className="text-xs text-muted-foreground">{tt(sig.detail)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Link
                to="/guides?tab=guides&guide=replay-review-loop"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                {tt('Open the replay-review guide')} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </>
          )}
        </CardContent>
      </Card>

      {coachContext && <MatchDiagnosticsPanel context={coachContext} embedded />}
    </section>
  )
}

function StoryCard({ point, number }: { point: TurningPoint; number: number }) {
  const { tt } = useI18n()
  return (
    <li
      className={cn('rounded-md border p-3', TONE_STYLE[point.tone])}
      data-turning-point-kind={point.kind}
    >
      <article className="grid gap-3 sm:grid-cols-[5rem_1fr]">
        <div className="flex items-center gap-2 text-xs font-semibold tabular-nums text-muted-foreground sm:items-start">
          <span
            className={cn(
              'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] text-primary-foreground',
              DOT_STYLE[point.tone],
            )}
          >
            {number}
          </span>
          <span className="inline-flex items-center gap-1 pt-0.5">
            <Clock className="h-3 w-3" />
            {formatRange(point)}
          </span>
        </div>
        <div className="min-w-0 space-y-2">
          <h3 className="text-sm font-semibold">{tt(point.title)}</h3>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {tt('Observed')}
            </div>
            <p className="text-xs leading-relaxed text-foreground">{tt(point.observed)}</p>
          </div>
          <div className="flex items-start gap-1.5">
            <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {tt('Possible takeaway')}
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">{tt(point.coaching)}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => scrollToSummaryEvidence(point.anchor)}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary/80"
          >
            {tt(LINK_LABEL[point.anchor])}
            <ArrowDown className="h-3 w-3" />
          </button>
        </div>
      </article>
    </li>
  )
}

function CheckCard({ check }: { check: FirstCauseCheck | AdvancedReviewCheck }) {
  const { tt } = useI18n()
  return (
    <article className="space-y-2 rounded-md border border-border/70 bg-background/30 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="text-sm font-semibold">{tt(check.title)}</div>
        <Badge className={cn('shrink-0 border-0 text-[10px]', STATUS_STYLE[check.status])}>
          {tt(STATUS_LABEL[check.status])}
        </Badge>
      </div>
      {check.timeSec != null && (
        <div className="flex items-center gap-1 text-[11px] font-medium tabular-nums text-primary">
          <CheckCircle2 className="h-3 w-3" />
          {check.startTimeSec != null &&
            check.startTimeSec !== check.timeSec &&
            `${formatDurationShort(check.startTimeSec)}–`}
          {formatDurationShort(check.timeSec)}
        </div>
      )}
      <p className="text-xs leading-relaxed text-muted-foreground">{tt(check.observed)}</p>
      <p className="text-xs leading-relaxed">{tt(check.takeaway)}</p>
      <Link
        to={`/guides?tab=guides&guide=${check.guideSlug}`}
        className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
      >
        {tt('Related guide')} <ArrowRight className="h-3 w-3" />
      </Link>
    </article>
  )
}

function formatRange(point: TurningPoint): string {
  if (point.startTimeSec == null) return formatDurationShort(point.timeSec)
  return `${formatDurationShort(point.startTimeSec)}–${formatDurationShort(point.timeSec)}`
}

function scrollToSummaryEvidence(anchor: TurningPointAnchor): void {
  const target =
    document.getElementById(EVIDENCE_TARGET[anchor]) ??
    document.getElementById('game-summary-evidence')
  target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
