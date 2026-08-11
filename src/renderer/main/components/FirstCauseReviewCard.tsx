import { ArrowRight, CheckCircle2, CircleAlert, Lightbulb, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { PerPlayerMatchStats } from '@domain/analysis'
import {
  deriveFirstCauseReview,
  type AdvancedReviewCheck,
  type FirstCauseCheck,
  type FirstCauseStatus,
} from '@domain/firstCauseReview'
import type { MatchSummary } from '@domain/statsSummary'
import { formatDurationShort } from '@shared/format'
import { cn } from '@shared/lib/utils'
import { Card, CardContent } from '@shared/components/ui/card'
import { Badge } from '@shared/components/ui/badge'
import { useI18n } from '../../i18n'

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

export function FirstCauseReviewCard({
  summary,
  loading,
  myProfileId,
  myPlayerId,
  myCiv,
  perPlayer,
  feudalTargetSec,
}: {
  summary: MatchSummary | null
  loading: boolean
  myProfileId: number | null
  myPlayerId?: number | null
  myCiv: string | null
  perPlayer?: PerPlayerMatchStats[]
  feudalTargetSec?: number | null
}) {
  const { tt } = useI18n()
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

  return (
    <section id="first-cause-review" className="scroll-mt-4 space-y-2">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <Search className="h-4 w-4 text-primary" />
          {tt('First-cause review')}
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {tt(
            'Checks the earliest actionable evidence across opening health, information, reaction, spending, and conversion. It separates recorded facts from replay questions.',
          )}
        </p>
      </div>
      <Card>
        <CardContent className="space-y-4 p-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">
              {tt("Reading the game's stat summary…")}
            </p>
          ) : !summary ? (
            <p className="text-sm text-muted-foreground">
              {tt(
                'This review needs the post-game summary. It will not guess scouting, queues, or decisions without decoded evidence.',
              )}
            </p>
          ) : !review ? (
            <p className="text-sm text-muted-foreground">
              {tt(
                'Your player row could not be identified in this summary, so the review stays unavailable.',
              )}
            </p>
          ) : (
            <>
              <div className="grid gap-2 lg:grid-cols-5">
                {review.checks.map((check) => (
                  <CheckCard key={check.lane} check={check} />
                ))}
              </div>

              {review.advancedChecks.length > 0 && (
                <div className="space-y-2 border-t border-border/70 pt-4">
                  <div>
                    <h3 className="text-sm font-semibold">{tt('Extended guide checks')}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {tt(
                        'These checks cover bottlenecks, investments, first-fight readiness, post-fight reset, and team timing. They remain replay questions when the summary lacks intent or position.',
                      )}
                    </p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {review.advancedChecks.map((check) => (
                      <CheckCard key={check.lane} check={check} />
                    ))}
                  </div>
                </div>
              )}

              <div className="grid gap-3 border-t border-border/70 pt-4 lg:grid-cols-2">
                <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
                  <div className="flex items-center gap-1.5 text-sm font-semibold">
                    <CircleAlert className="h-4 w-4 text-primary" />
                    {tt('Earliest point to test')}
                  </div>
                  {review.firstCause ? (
                    <>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {tt('Start at')} {formatDurationShort(review.firstCause.timeSec)} ·{' '}
                        {tt(review.firstCause.category.replaceAll('-', ' '))}.
                      </p>
                      <p className="mt-2 text-xs leading-relaxed">
                        {tt(review.firstCause.rationale)}
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
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    <span className="font-medium text-foreground">{tt('Trigger')}:</span>{' '}
                    {tt(review.nextGoal.trigger)}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    <span className="font-medium text-foreground">{tt('Action')}:</span>{' '}
                    {tt(review.nextGoal.action)}
                  </p>
                </div>
              </div>

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
    </section>
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
