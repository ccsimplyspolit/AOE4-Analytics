import { Dumbbell } from 'lucide-react'
import type { MatchSummary } from '@domain/statsSummary'
import { BUNDLED_BUILD_ORDERS } from '@data/buildOrders'
import { buildIndexForCiv } from '@domain/buildOrderSchema'
import { gradeBuildFollow, type TrainerCheckpoint } from '@domain/buildTrainer'
import { buildRecoveryPlan, type RecoveryRecommendation } from '@domain/adaptiveBuild'
import { formatDuration } from '@domain/format'
import { cn } from '@shared/lib/utils'
import { Card, CardContent } from '@shared/components/ui/card'
import { selectTrainerPlayer } from './gameSummaryHelpers'
import { useI18n } from '../../i18n'

/**
 * The practice loop: this game's decoded build events graded against the
 * bundled reference build for your civ. Renders nothing when there's no
 * bundled build, no player row, or no timed reference steps. Missing decoded
 * events now render as an honest data-gap recovery item instead of disappearing.
 */
export function BuildTrainerCard({
  summary,
  myCiv,
  myProfileId,
  referenceBuildName,
}: {
  summary: MatchSummary
  myCiv: string
  myProfileId?: number | null
  /** The guide explicitly pinned by the player; used only when it supports this civ. */
  referenceBuildName?: string | null
}) {
  const { tt } = useI18n()
  const pinned = referenceBuildName
    ? BUNDLED_BUILD_ORDERS.find((build) => build.name === referenceBuildName) ?? null
    : null
  const idx = buildIndexForCiv(BUNDLED_BUILD_ORDERS, myCiv)
  // Do not grade a different civilization against the pinned guide. If there
  // is no compatible pinned guide, preserve the prior first-guide fallback.
  const reference = pinned && buildIndexForCiv([pinned], myCiv) === 0
    ? pinned
    : idx != null
      ? BUNDLED_BUILD_ORDERS[idx]!
      : null
  const me = selectTrainerPlayer(summary.players, myProfileId, myCiv)
  if (!reference || !me) return null

  const report = gradeBuildFollow({
    reference,
    events: me.buildOrder,
    civ: myCiv,
    ageUpTimes: me.totals
      ? {
          2: me.totals.age2Sec,
          3: me.totals.age3Sec,
          4: me.totals.age4Sec,
        }
      : undefined,
  })
  if (report.checkpoints.length === 0) return null
  const recovery = buildRecoveryPlan(report)

  return (
    <section className="space-y-2">
      <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
        <Dumbbell className="h-4 w-4 text-primary" />
        {tt('Build trainer')}
        <ScoreBadge score={report.score} />
      </h2>
      <Card>
        <CardContent className="space-y-2 p-4">
          <p className="text-xs text-muted-foreground">
            {tt('This game vs')} <span className="font-medium text-foreground">{report.buildName}</span> — {tt('replay the build in a custom game and watch the score climb.')}
          </p>
          <div className="overflow-hidden rounded-md border border-border/70">
            {report.checkpoints.map((c, i) => (
              <CheckpointRow key={i} c={c} />
            ))}
          </div>
          {recovery.length > 0 && <RecoveryPlan recommendations={recovery} />}
          <p className="text-[11px] text-muted-foreground">
            {tt("Villager counts assume the reference's opening villagers plus your production (the stat file doesn't record losses); age-ups use the authoritative match summary when available, with landmark events as a fallback.")}
          </p>
        </CardContent>
      </Card>
    </section>
  )
}

function RecoveryPlan({ recommendations }: { recommendations: RecoveryRecommendation[] }) {
  const { tt } = useI18n()
  return (
    <div className="rounded-md border border-primary/25 bg-primary/5 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">{tt('Recovery plan')}</p>
      <div className="mt-2 space-y-2">
        {recommendations.map((item) => (
          <div key={item.kind} className="text-xs leading-relaxed">
            <p className="font-medium text-foreground">{item.title}</p>
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground/80">{tt('Evidence:')}</span> {item.evidence}
            </p>
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground/80">{tt('Next run:')}</span> {item.advice}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

function ScoreBadge({ score }: { score: number | null }) {
  const { tt } = useI18n()
  if (score == null) return null
  const tone =
    score >= 80
      ? 'bg-win/15 text-win'
      : score >= 50
        ? 'bg-warn/15 text-warn'
        : 'bg-loss/15 text-loss'
  return (
    <span className={cn('rounded-sm px-2.5 py-0.5 text-xs font-bold tabular-nums', tone)}>
      {score}% {tt('on plan')}
    </span>
  )
}

function CheckpointRow({ c }: { c: TrainerCheckpoint }) {
  const { tt } = useI18n()
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_5.5rem_5.5rem_5rem] items-center gap-2 border-b border-border/50 px-3 py-1.5 text-sm last:border-b-0">
      <span className="truncate">{tt(c.label)}</span>
      <span className="text-right text-xs tabular-nums text-muted-foreground">
        {c.kind === 'villagers' ? `${c.targetVillagers} ${tt('vills')}` : formatDuration(c.targetTimeSec)}
      </span>
      <span className="text-right text-xs tabular-nums">
        {c.kind === 'villagers'
          ? (c.actualVillagers ?? '—')
          : c.actualTimeSec != null
            ? formatDuration(c.actualTimeSec)
            : tt('not seen')}
      </span>
      <DeltaChip c={c} />
    </div>
  )
}

function DeltaChip({ c }: { c: TrainerCheckpoint }) {
  const { tt } = useI18n()
  if (c.ok == null) {
    return <span className="text-right text-xs text-muted-foreground">—</span>
  }
  const text =
    c.kind === 'villagers'
      ? `${c.villagerDelta! > 0 ? '+' : ''}${c.villagerDelta}`
      : `${c.deltaSec! > 0 ? '+' : c.deltaSec! < 0 ? '−' : ''}${formatDuration(Math.abs(c.deltaSec!))}`
  return (
    <span
      className={cn(
        'text-right text-xs font-semibold tabular-nums',
        c.ok ? 'text-win' : 'text-loss',
      )}
    >
      {c.kind === 'ageup' && c.deltaSec === 0 ? tt('on time') : text}
    </span>
  )
}
