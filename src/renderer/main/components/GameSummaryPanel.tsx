import type { ReactNode } from 'react'
import {
  Activity,
  Clock,
  Coins,
  Hammer,
  LineChart as LineChartIcon,
  Pickaxe,
  Swords,
  Trophy,
  Users,
} from 'lucide-react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { PerPlayerMatchStats } from '@domain/analysis'
import type {
  BuildEvent,
  MatchSummary,
  PlayerSummary,
  ResourceAmounts,
  ScorePoint,
} from '@domain/statsSummary'
import { civFromToken } from '@domain/statsSummary'
import {
  deriveMatchReview,
  type MatchReview,
  type MatchReviewPlayer,
  type MatchReviewTeamSide,
} from '@domain/matchReview'
import { villagerGaps, type VillagerProductionRhythm } from '@domain/summaryCoaching'
import { civDisplayName } from '@domain/civ'
import { landmarksForCiv } from '@domain/landmarks'
import {
  buildTeamContributionBreakdown,
  type MetricCoverage,
  type NormalizedTeamMetric,
  type TeamContributionBreakdown,
  type TeamContributionPlayer,
} from '@domain/teamInsights'
import { formatCount, formatDurationShort } from '@shared/format'
import { cn } from '@shared/lib/utils'
import { Card, CardContent } from '@shared/components/ui/card'
import { finiteMetricValue } from './gameSummaryHelpers'
import { useI18n } from '../../i18n'

const GRID = 'hsl(var(--border))'
const MUTED = 'hsl(var(--muted-foreground))'
// "You" always draws in the accent; the rest stay fixed but distinct from it.
const SERIES_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--loss))',
  'hsl(190, 95%, 50%)',
  'hsl(280, 65%, 62%)',
]
const RESOURCE_KEYS = ['food', 'wood', 'gold', 'stone'] as const

type ResourceKey = (typeof RESOURCE_KEYS)[number]

function playerLabel(p: PlayerSummary): string {
  const slug = civFromToken(p.civToken)
  const civ = slug ? civDisplayName(slug) : (p.civToken ?? 'Unknown')
  if (p.name && !/^\d[\d.]*$/.test(p.name)) return `${p.name} - ${civ}`
  return civ
}

const CATEGORY_STYLE: Record<BuildEvent['category'], string> = {
  unit: 'text-foreground',
  building: 'text-primary',
  upgrade: 'text-warn',
  other: 'text-muted-foreground',
}

/**
 * The full post-game breakdown from the stat summary: exact score/resource
 * totals, age timings, Relic combat counters, trend charts, and each player's
 * timed build order.
 */
export function GameSummaryPanel({
  summary,
  myCiv,
  perPlayer,
  myProfileId,
}: {
  summary: MatchSummary
  /** The signed-in player's civ slug, to highlight "you". */
  myCiv: string | null
  /** Relic comparison counters for combat/production/APM, when available. */
  perPlayer?: PerPlayerMatchStats[]
  myProfileId?: number | null
}) {
  const { tt } = useI18n()
  const meFirst = (a: PlayerSummary, b: PlayerSummary) =>
    Number(isMe(b, myProfileId ?? null, myCiv)) - Number(isMe(a, myProfileId ?? null, myCiv))
  const players = [...summary.players].sort(meFirst)
  const me = players.find((p) => isMe(p, myProfileId ?? null, myCiv)) ?? players[0] ?? null
  const colorOf = new Map(
    players.map((p, i) => [p.playerId, SERIES_COLORS[i % SERIES_COLORS.length]!]),
  )

  const ecoData = mergeSeries(players, (p) =>
    p.resources.map((r) => ({
      t: r.timeSec,
      v: Math.round(totalResources(r.gathered)),
    })),
  )
  const scoreData = mergeSeries(players, (p) =>
    p.scores.map((s) => ({ t: s.timeSec, v: Math.round(s.total) })),
  )

  const hasEco = ecoData.length > 1
  const hasScore = scoreData.length > 1
  const hasBuild = players.some((p) => p.buildOrder.length > 0)
  const myResources = me ? finalResources(me) : null
  const myScore = me ? finalScore(me) : null
  const myTc = me ? villagerGaps(me) : null
  const myVillHigh = me?.totals?.villagerHigh ?? null
  const myAge = me ? ageTimings(me, myCiv) : new Map<2 | 3 | 4, number>()
  const contribution = buildTeamContributionBreakdown(perPlayer ?? [], myProfileId ?? null)
  const review = deriveMatchReview(summary, myProfileId ?? null, myCiv, perPlayer ?? [])

  return (
    <div className="space-y-4">
      {me && (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <InsightCard
            icon={<Coins className="h-4 w-4 text-primary" />}
            label={tt('Resources gathered')}
            value={myResources ? fmtInt(totalResources(myResources)) : '-'}
            hint={
              myResources
                ? resourceLine(myResources)
                : tt('Summary did not include resource totals.')
            }
          />
          <InsightCard
            icon={<Trophy className="h-4 w-4 text-primary" />}
            label={tt('Score')}
            value={myScore ? fmtInt(myScore.total) : '-'}
            hint={myScore ? strongestScoreLane(myScore, tt) : tt('No final score split decoded.')}
          />
          <InsightCard
            icon={<Clock className="h-4 w-4 text-primary" />}
            label={tt('Age timing')}
            value={formatDurationShort(myAge.get(2))}
            hint={`${tt('Castle')} ${formatDurationShort(myAge.get(3))} / ${tt('Imperial')} ${formatDurationShort(myAge.get(4))}`}
          />
          <InsightCard
            icon={<Users className="h-4 w-4 text-primary" />}
            label={tt(myVillHigh != null ? 'Villager high' : 'Town Center rhythm')}
            value={
              myVillHigh != null
                ? `${myVillHigh} ${tt('villagers')}`
                : myTc
                  ? `${myTc.villagersMade} ${tt('vills made')}`
                  : '-'
            }
            hint={villagerHint(myTc, myVillHigh, tt)}
          />
        </div>
      )}

      {review && <DecisionMetricsCard review={review} />}

      <div className="grid gap-4 xl:grid-cols-2">
        <div id="game-summary-score" className="scroll-mt-4">
          <ScoreTable players={players} />
        </div>
        <div id="game-summary-resources" className="scroll-mt-4">
          <ResourceTable players={players} />
        </div>
        <AgeTable players={players} myProfileId={myProfileId ?? null} myCiv={myCiv} />
        <CombatTable
          perPlayer={perPlayer ?? []}
          players={players}
          myProfileId={myProfileId ?? null}
        />
      </div>
      <SummaryTotalsTable players={players} />
      {contribution.available && (
        <TeamContributionCard breakdown={contribution} summaryPlayers={players} />
      )}
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        {tt(
          "Scores are the game's last sampled values (up to ~20s before the end screen), so they can sit slightly under the score screen's finals. Resource totals count DELIVERED resources — the game's own screen also credits what villagers were still carrying when the game ended.",
        )}
      </p>

      {(hasEco || hasScore) && (
        <div className="grid gap-4 lg:grid-cols-2">
          {hasEco && (
            <ChartCard
              title={tt('Resources over time')}
              icon={<LineChartIcon className="h-4 w-4 text-primary" />}
            >
              <TimeChart
                data={ecoData}
                players={players}
                colorOf={colorOf}
                meId={me?.playerId ?? null}
              />
            </ChartCard>
          )}
          {hasScore && (
            <ChartCard
              title={tt('Score over time')}
              icon={<Trophy className="h-4 w-4 text-primary" />}
            >
              <TimeChart
                data={scoreData}
                players={players}
                colorOf={colorOf}
                meId={me?.playerId ?? null}
              />
            </ChartCard>
          )}
        </div>
      )}

      {hasBuild && (
        <Card id="game-summary-build-order" className="scroll-mt-4">
          <CardContent className="p-4">
            <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
              <Hammer className="h-4 w-4 text-primary" /> {tt('Build order timeline')}
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              {players.map((p) => (
                <BuildOrderColumn
                  key={p.playerId}
                  player={p}
                  me={isMe(p, myProfileId ?? null, myCiv)}
                  color={colorOf.get(p.playerId)!}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function InsightCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode
  label: string
  value: string
  hint: string
}) {
  return (
    <Card>
      <CardContent className="space-y-2 p-4">
        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {icon}
          {label}
        </div>
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
        <p className="text-xs leading-snug text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  )
}

function DecisionMetricsCard({ review }: { review: MatchReview }) {
  const { tt } = useI18n()
  const me = review.me
  const opponent = review.opponent
  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="flex items-center gap-1.5 text-sm font-semibold">
              <Activity className="h-4 w-4 text-primary" /> {tt('Decision metrics')}
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {tt(
                'Derived from the game summary and Relic counters. These explain conversion and timing; they are not a single skill score.',
              )}
            </p>
          </div>
          <span className="rounded bg-secondary px-2 py-1 text-[10px] text-muted-foreground">
            {tt(review.isOneVsOne ? '1v1 comparison' : 'your row only')}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
          <span className="rounded border border-border/70 px-2 py-1 uppercase tracking-wide">
            {tt('Evidence coverage')}: {coverageLabel(review.coverage.confidence, tt)}
          </span>
          <span>
            {coverageFacts(review.coverage)
              .map((fact) => tt(fact))
              .join(' · ')}
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <ReviewMetric
            icon={<Coins className="h-4 w-4 text-primary" />}
            label={tt('Resource conversion')}
            value={me.conversionPct == null ? '-' : `${me.conversionPct}%`}
            hint={
              me.gathered == null || me.spent == null
                ? tt('Gathered/spent totals unavailable.')
                : `${tt('Spent')} ${fmtInt(me.spent)} ${tt('of')} ${fmtInt(me.gathered)} · ${tt('last bank')} ${me.lastBank == null ? '—' : fmtInt(me.lastBank)}`
            }
          />
          <ReviewMetric
            icon={<Coins className="h-4 w-4 text-primary" />}
            label={tt('Unspent float')}
            value={me.resourceFloatPct == null ? '-' : `${me.resourceFloatPct}%`}
            hint={
              me.resourceFloatPct == null || me.lastBank == null
                ? tt('End-bank share unavailable.')
                : `${fmtInt(me.lastBank)} ${tt('in the last recorded bank')} · ${tt('saving may be intentional')}`
            }
          />
          <ReviewMetric
            icon={<Swords className="h-4 w-4 text-primary" />}
            label={tt('Troop trade')}
            value={tradeValue(me)}
            hint={
              me.kills == null || me.troopLosses == null
                ? tt('Troop losses could not be separated from villagers.')
                : `${me.kills} ${tt('kills')} · ${me.troopLosses} ${tt('troop losses')}${opponent ? ` · ${tt('opponent')} ${tradeValue(opponent)}` : ''}`
            }
          />
          <ReviewMetric
            icon={<Hammer className="h-4 w-4 text-primary" />}
            label={tt('Unit cadence')}
            value={
              me.longestUnitCompletionGapSec == null
                ? '-'
                : formatDurationShort(me.longestUnitCompletionGapSec)
            }
            hint={
              me.unitCompletionGaps === 0
                ? tt('No long completion gaps observed.')
                : `${me.unitCompletionGaps} ${tt('gap(s) over 1:00 between completed non-villager units')}`
            }
          />
          <ReviewMetric
            icon={<Hammer className="h-4 w-4 text-primary" />}
            label={tt('Production conversion')}
            value={
              me.unitsProduced == null || me.largestArmy == null
                ? '-'
                : `${me.unitsProduced} ${tt('units')} · ${me.largestArmy} ${tt('peak')}`
            }
            hint={`${me.villagerHigh == null ? tt('Villager high unavailable') : `${me.villagerHigh} ${tt('villager high')}`} · ${me.tcIdleWindows} ${tt('long TC gap(s)')}`}
          />
          <ReviewMetric
            icon={<Clock className="h-4 w-4 text-primary" />}
            label={tt('Opening checkpoint')}
            value={
              me.firstNonVillagerUnit == null
                ? '-'
                : `${me.firstNonVillagerUnit.name} · ${formatDurationShort(me.firstNonVillagerUnit.timeSec)}`
            }
            hint={[
              me.firstBuilding == null
                ? tt('First building event unavailable.')
                : `${tt('First building')}: ${me.firstBuilding.name} · ${formatDurationShort(me.firstBuilding.timeSec)}`,
              me.age2Sec == null ? null : `${tt('Feudal')} ${formatDurationShort(me.age2Sec)}`,
              me.age3Sec == null ? null : `${tt('Castle')} ${formatDurationShort(me.age3Sec)}`,
            ]
              .filter((value): value is string => value != null)
              .join(' · ')}
          />
          {review.pressure && (
            <ReviewMetric
              icon={<Swords className="h-4 w-4 text-primary" />}
              label={tt('First pressure')}
              value={pressureValue(review.pressure)}
              hint={pressureHint(review, tt)}
            />
          )}
        </div>

        {!review.isOneVsOne && review.teamComparison && (
          <TeamReviewComparison comparison={review.teamComparison} />
        )}

        {opponent && review.checkpoints.length > 0 && (
          <div className="overflow-x-auto rounded-md border border-border/70">
            <table className="w-full min-w-[560px] text-xs">
              <thead className="bg-secondary/50 text-[10px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">{tt('Checkpoint')}</th>
                  <th className="px-3 py-2 text-right">{tt('Time')}</th>
                  <th className="px-3 py-2 text-right">{tt('Gathered gap')}</th>
                  <th className="px-3 py-2 text-right">{tt('Score gap')}</th>
                  <th className="px-3 py-2 text-left">{tt('Read')}</th>
                </tr>
              </thead>
              <tbody>
                {review.checkpoints.map((checkpoint) => (
                  <tr
                    key={`${checkpoint.label}-${checkpoint.timeSec}`}
                    className="border-t border-border/60"
                  >
                    <td className="px-3 py-2 font-medium">{checkpoint.label}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatDurationShort(checkpoint.timeSec)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {signedMetric(checkpoint.gatheredDelta)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {signedMetric(checkpoint.scoreDelta)}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {checkpoint.gatheredDelta == null && checkpoint.scoreDelta == null
                        ? tt('Timeline sample unavailable')
                        : checkpoint.gatheredDelta != null && checkpoint.gatheredDelta < 0
                          ? tt('Economy behind here')
                          : checkpoint.scoreDelta != null && checkpoint.scoreDelta < 0
                            ? tt('Score behind here')
                            : tt('No recorded deficit here')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-[10px] leading-relaxed text-muted-foreground">
          {tt(
            "A positive gap means your value is higher than the opponent's at the nearest recorded sample. “Last bank” is the last timeline sample, not a claim about the exact end screen.",
          )}
        </p>
      </CardContent>
    </Card>
  )
}

function ReviewMetric({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode
  label: string
  value: string
  hint: string
}) {
  return (
    <div className="rounded-md border border-border/70 bg-secondary/20 p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-lg font-semibold tabular-nums">{value}</div>
      <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{hint}</p>
    </div>
  )
}

function coverageLabel(
  confidence: MatchReview['coverage']['confidence'],
  tt: (value: string) => string,
): string {
  return tt(confidence)
}

function coverageFacts(coverage: MatchReview['coverage']): string[] {
  return [
    coverage.summaryTotals ? 'summary totals' : null,
    coverage.economyTimeline ? 'economy timeline' : null,
    coverage.scoreTimeline ? 'score timeline' : null,
    coverage.buildTimeline ? 'build timeline' : null,
    coverage.casualtyTimeline ? 'casualty timeline' : null,
    coverage.combatCounters ? 'combat counters' : null,
  ].filter((value): value is string => value != null)
}

function pressureValue(pressure: MatchReview['pressure']): string {
  if (
    !pressure ||
    pressure.myFirstMilitaryLossTimeSec == null ||
    pressure.opponentFirstMilitaryLossTimeSec == null
  ) {
    return '-'
  }
  return `${formatDurationShort(pressure.myFirstMilitaryLossTimeSec)} / ${formatDurationShort(pressure.opponentFirstMilitaryLossTimeSec)}`
}

function pressureHint(review: MatchReview, tt: (value: string) => string): string {
  const pressure = review.pressure
  if (!pressure) return tt('First military-casualty timestamps unavailable.')
  if (
    pressure.myFirstMilitaryLossTimeSec == null ||
    pressure.opponentFirstMilitaryLossTimeSec == null
  ) {
    return tt('First military-casualty timestamps unavailable.')
  }
  const parts = [
    `${tt('you')} ${formatDurationShort(pressure.myFirstMilitaryLossTimeSec)}${casualtySuffix(review.me.firstMilitaryLoss)}`,
    `${tt('opponent')} ${formatDurationShort(pressure.opponentFirstMilitaryLossTimeSec)}${casualtySuffix(review.opponent?.firstMilitaryLoss ?? null)}`,
  ]
  if (pressure.firstEnemyMilitaryLossCausedTimeSec != null) {
    parts.push(
      `${tt('first enemy loss by you')} ${formatDurationShort(pressure.firstEnemyMilitaryLossCausedTimeSec)}`,
    )
  }
  if (pressure.responseLagSec != null) {
    const sign = pressure.responseLagSec >= 0 ? '+' : '−'
    parts.push(`${tt('response')} ${sign}${formatDurationShort(Math.abs(pressure.responseLagSec))}`)
  }
  return parts.join(' · ')
}

function casualtySuffix(event: MatchReviewPlayer['firstMilitaryLoss']): string {
  if (!event) return ''
  const label = event.targetUnitType
    .replace(/^unit_/, '')
    .replace(/_\d+_.+$/, '')
    .replace(/_\d+$/, '')
    .replace(/_/g, ' ')
  return label ? ` (${label})` : ''
}

function TeamReviewComparison({
  comparison,
}: {
  comparison: NonNullable<MatchReview['teamComparison']>
}) {
  const { tt } = useI18n()
  return (
    <div className="rounded-md border border-border/70 bg-secondary/10 p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {tt('Team comparison')}
          </h4>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {tt(
              'Aggregated from the decoded summary players; this is a side-level read for team games.',
            )}
          </p>
        </div>
        <span className="text-[10px] text-muted-foreground">
          {comparison.mine.playerCount} vs {comparison.enemy.playerCount} players
        </span>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[560px] text-xs">
          <thead className="text-[10px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-2 py-1.5 text-left">{tt('Metric')}</th>
              <th className="px-2 py-1.5 text-right">{tt('Your team')}</th>
              <th className="px-2 py-1.5 text-right">{tt('Enemy team')}</th>
            </tr>
          </thead>
          <tbody>
            {[
              [
                tt('Resources spent / gathered'),
                teamEconomy(comparison.mine),
                teamEconomy(comparison.enemy),
              ],
              [tt('Kills / troop losses'), teamTrade(comparison.mine), teamTrade(comparison.enemy)],
              [
                tt('Units produced / peak army'),
                `${teamInt(comparison.mine.unitsProduced)} / ${teamInt(comparison.mine.largestArmy)}`,
                `${teamInt(comparison.enemy.unitsProduced)} / ${teamInt(comparison.enemy.largestArmy)}`,
              ],
              [
                tt('Villager high / TC gaps'),
                `${teamInt(comparison.mine.villagerHigh)} / ${comparison.mine.tcIdleWindows}`,
                `${teamInt(comparison.enemy.villagerHigh)} / ${comparison.enemy.tcIdleWindows}`,
              ],
              [
                tt('Upgrades'),
                teamInt(comparison.mine.upgrades),
                teamInt(comparison.enemy.upgrades),
              ],
            ].map(([label, mine, enemy]) => (
              <tr key={label} className="border-t border-border/60">
                <td className="px-2 py-1.5 text-muted-foreground">{label}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{mine}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{enemy}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function teamInt(value: number | null): string {
  return value == null ? '-' : fmtInt(value)
}

function teamEconomy(side: MatchReviewTeamSide): string {
  return `${teamInt(side.spent)} / ${teamInt(side.gathered)}${side.conversionPct == null ? '' : ` · ${side.conversionPct}%`}`
}

function teamTrade(side: MatchReviewTeamSide): string {
  const ratio = side.tradeRatio == null ? '-' : `${side.tradeRatio.toFixed(2)} K/D`
  return `${teamInt(side.kills)} / ${teamInt(side.troopLosses)} · ${ratio}`
}

function tradeValue(player: MatchReviewPlayer): string {
  if (player.tradeRatio == null) return '-'
  return `${player.tradeRatio.toFixed(2)} K/D`
}

function signedMetric(value: number | null): string {
  if (value == null) return '-'
  return `${value > 0 ? '+' : ''}${fmtInt(value)}`
}

interface TableColumn<T> {
  key: string
  label: string
  align?: 'left' | 'right'
  better?: 'high' | 'low'
  value: (row: T) => number | string | null
  display?: (value: number | string | null, row: T) => string
}

function DataTable<T>({
  title,
  icon,
  rows,
  columns,
  rowKey,
  rowClassName,
  empty,
}: {
  title: string
  icon: ReactNode
  rows: T[]
  columns: TableColumn<T>[]
  rowKey: (row: T, i: number) => string
  rowClassName?: (row: T) => string | undefined
  empty?: string
}) {
  const { tt } = useI18n()
  const best = new Map<string, number>()
  for (const col of columns) {
    if (!col.better) continue
    const nums = rows
      .map((r) => finiteMetricValue(col.value(r)))
      .filter((n): n is number => n != null)
    if (nums.length === 0) continue
    best.set(col.key, col.better === 'low' ? Math.min(...nums) : Math.max(...nums))
  }
  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex items-center gap-1.5 border-b border-border px-4 py-3 text-sm font-semibold">
          {icon}
          {title}
        </div>
        {rows.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            {empty ?? tt('No data decoded for this table.')}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-border/70">
                  {columns.map((c) => (
                    <th
                      key={c.key}
                      className={cn(
                        'rts-ledger-head px-3 py-2',
                        c.align === 'right' ? 'text-right' : 'text-left',
                      )}
                    >
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr
                    key={rowKey(row, i)}
                    className={cn('border-b border-border/50 last:border-b-0', rowClassName?.(row))}
                  >
                    {columns.map((c) => {
                      const raw = c.value(row)
                      const n = finiteMetricValue(raw)
                      const isBest = c.better && n != null && n === best.get(c.key)
                      return (
                        <td
                          key={c.key}
                          className={cn(
                            'px-3 py-2 tabular-nums',
                            c.align === 'right' && 'text-right',
                            isBest && 'font-semibold text-primary',
                          )}
                        >
                          {c.display ? c.display(raw, row) : fmtCell(raw)}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ScoreTable({ players }: { players: PlayerSummary[] }) {
  const { tt } = useI18n()
  const rows = players
    .map((player) => ({ player, score: finalScore(player) }))
    .filter((r): r is { player: PlayerSummary; score: ScorePoint } => r.score != null)
  return (
    <DataTable
      title={tt('Scoreboard')}
      icon={<Trophy className="h-4 w-4 text-primary" />}
      rows={rows}
      rowKey={(r) => String(r.player.playerId)}
      columns={[
        {
          key: 'player',
          label: tt('Player'),
          value: (r) => playerLabel(r.player),
          display: (_, r) => playerLabel(r.player),
        },
        {
          key: 'total',
          label: tt('Total'),
          align: 'right',
          better: 'high',
          value: (r) => r.score.total,
        },
        {
          key: 'military',
          label: tt('Military'),
          align: 'right',
          better: 'high',
          value: (r) => r.score.military,
        },
        {
          key: 'economy',
          label: tt('Economy'),
          align: 'right',
          better: 'high',
          value: (r) => r.score.economy,
        },
        {
          key: 'technology',
          label: tt('Tech'),
          align: 'right',
          better: 'high',
          value: (r) => r.score.technology,
        },
        {
          key: 'society',
          label: tt('Society'),
          align: 'right',
          better: 'high',
          value: (r) => r.score.society,
        },
      ]}
    />
  )
}

function ResourceTable({ players }: { players: PlayerSummary[] }) {
  const { tt } = useI18n()
  const rows = players
    .map((player) => ({ player, resources: finalResources(player) }))
    .filter((r): r is { player: PlayerSummary; resources: ResourceAmounts } => r.resources != null)
  return (
    <DataTable
      title={tt('Economy')}
      icon={<Pickaxe className="h-4 w-4 text-primary" />}
      rows={rows}
      rowKey={(r) => String(r.player.playerId)}
      columns={[
        {
          key: 'player',
          label: tt('Player'),
          value: (r) => playerLabel(r.player),
          display: (_, r) => playerLabel(r.player),
        },
        // Whole numbers, like the game's own screen (raw values are floats).
        {
          key: 'total',
          label: tt('Total'),
          align: 'right',
          better: 'high',
          value: (r) => Math.round(totalResources(r.resources)),
        },
        {
          key: 'food',
          label: tt('Food'),
          align: 'right',
          better: 'high',
          value: (r) => Math.round(r.resources.food),
        },
        {
          key: 'wood',
          label: tt('Wood'),
          align: 'right',
          better: 'high',
          value: (r) => Math.round(r.resources.wood),
        },
        {
          key: 'stone',
          label: tt('Stone'),
          align: 'right',
          better: 'high',
          value: (r) => Math.round(r.resources.stone),
        },
        {
          key: 'gold',
          label: tt('Gold'),
          align: 'right',
          better: 'high',
          value: (r) => Math.round(r.resources.gold),
        },
        {
          key: 'foodRate',
          label: tt('Max food/min'),
          align: 'right',
          better: 'high',
          value: (r) => maxGatherRate(r.player, 'food'),
        },
        {
          key: 'woodRate',
          label: tt('Max wood/min'),
          align: 'right',
          better: 'high',
          value: (r) => maxGatherRate(r.player, 'wood'),
        },
      ]}
    />
  )
}

function AgeTable({
  players,
  myProfileId,
  myCiv,
}: {
  players: PlayerSummary[]
  myProfileId: number | null
  myCiv: string | null
}) {
  const { tt } = useI18n()
  const rows = players.map((player) => ({
    player,
    timings: ageTimings(
      player,
      isMe(player, myProfileId, myCiv) ? myCiv : civFromToken(player.civToken),
    ),
  }))
  return (
    <DataTable
      title={tt('Technology timing')}
      icon={<Activity className="h-4 w-4 text-primary" />}
      rows={rows}
      rowKey={(r) => String(r.player.playerId)}
      columns={[
        {
          key: 'player',
          label: tt('Player'),
          value: (r) => playerLabel(r.player),
          display: (_, r) => playerLabel(r.player),
        },
        {
          key: 'age2',
          label: tt('Age II'),
          align: 'right',
          better: 'low',
          value: (r) => r.timings.get(2) ?? null,
          display: (v) => formatDurationShort(typeof v === 'number' ? v : null),
        },
        {
          key: 'age3',
          label: tt('Age III'),
          align: 'right',
          better: 'low',
          value: (r) => r.timings.get(3) ?? null,
          display: (v) => formatDurationShort(typeof v === 'number' ? v : null),
        },
        {
          key: 'age4',
          label: tt('Age IV'),
          align: 'right',
          better: 'low',
          value: (r) => r.timings.get(4) ?? null,
          display: (v) => formatDurationShort(typeof v === 'number' ? v : null),
        },
        {
          key: 'upgrades',
          label: tt('Upgrades'),
          align: 'right',
          better: 'high',
          value: (r) =>
            r.player.totals?.techResearched ??
            r.player.buildOrder.filter((e) => e.category === 'upgrade').length,
        },
      ]}
    />
  )
}

function CombatTable({
  perPlayer,
  players,
  myProfileId,
}: {
  perPlayer: PerPlayerMatchStats[]
  players: PlayerSummary[]
  myProfileId: number | null
}) {
  const { tt } = useI18n()
  const labelByCiv = labelsByCiv(players)
  const rows = [...perPlayer].sort(
    (a, b) => Number(b.profileId === myProfileId) - Number(a.profileId === myProfileId),
  )
  // The game's "Largest Army" lives in the stat-summary header (Relic's counters
  // only carry units PRODUCED, a different stat) — join it in by profile id.
  const largestArmyFor = (profileId: number): number | null =>
    players.find((p) => p.profileId === profileId)?.totals?.largestArmy ?? null
  const villagerHighFor = (profileId: number): number | null =>
    players.find((p) => p.profileId === profileId)?.totals?.villagerHigh ?? null
  return (
    <DataTable
      title={tt('Military and production')}
      icon={<Swords className="h-4 w-4 text-primary" />}
      rows={rows}
      rowKey={(r) => String(r.profileId)}
      rowClassName={(r) => (r.profileId === myProfileId ? 'bg-primary/5' : undefined)}
      empty={tt('Relic comparison counters are not attached to this game yet.')}
      columns={[
        {
          key: 'player',
          label: tt('Player'),
          value: (r) => combatPlayerLabel(r, labelByCiv, myProfileId),
          display: (_, r) => combatPlayerLabel(r, labelByCiv, myProfileId),
        },
        {
          key: 'units',
          label: tt('Units made'),
          align: 'right',
          better: 'high',
          value: (r) => r.unitsProduced,
        },
        {
          key: 'army',
          label: tt('Largest army'),
          align: 'right',
          better: 'high',
          value: (r) => largestArmyFor(r.profileId),
        },
        {
          key: 'villHigh',
          label: tt('Vill high'),
          align: 'right',
          better: 'high',
          value: (r) => villagerHighFor(r.profileId),
        },
        {
          key: 'kills',
          label: tt('Killed'),
          align: 'right',
          better: 'high',
          value: (r) => r.kills,
        },
        { key: 'deaths', label: tt('Lost'), align: 'right', better: 'low', value: (r) => r.deaths },
        { key: 'kd', label: 'K/D', align: 'right', better: 'high', value: (r) => r.kd },
        {
          key: 'buildings',
          label: tt('Buildings'),
          align: 'right',
          better: 'high',
          value: (r) => r.buildingsProduced,
        },
        {
          key: 'blost',
          label: tt('Bldgs lost'),
          align: 'right',
          better: 'low',
          value: (r) => r.buildingsLost ?? null,
        },
        {
          key: 'struct',
          label: tt('Struct dmg'),
          align: 'right',
          better: 'high',
          value: (r) => r.structureDamage ?? null,
        },
        {
          key: 'techs',
          label: tt('Techs'),
          align: 'right',
          better: 'high',
          value: (r) => r.techsResearched,
        },
        { key: 'apm', label: 'APM', align: 'right', better: 'high', value: (r) => r.apm },
      ]}
    />
  )
}

/**
 * The STPD header is the authoritative post-game counter set. Keep this table
 * independent from `perPlayer`: local stats.rgs has these values even when the
 * Relic report-result counters were never attached to the match.
 */
function SummaryTotalsTable({ players }: { players: PlayerSummary[] }) {
  const { tt } = useI18n()
  const rows = players.flatMap((player) =>
    player.totals ? [{ player, totals: player.totals }] : [],
  )
  return (
    <DataTable
      title={tt('Relic summary totals')}
      icon={<Activity className="h-4 w-4 text-primary" />}
      rows={rows}
      rowKey={(r) => String(r.player.playerId)}
      empty={tt('The summary header totals were not decoded for this game.')}
      columns={[
        {
          key: 'player',
          label: tt('Player'),
          value: (r) => playerLabel(r.player),
          display: (_, r) => playerLabel(r.player),
        },
        {
          key: 'gathered',
          label: tt('Gathered'),
          align: 'right',
          better: 'high',
          value: (r) => Math.round(totalResources(r.totals.resourcesGathered)),
        },
        {
          key: 'spent',
          label: tt('Spent'),
          align: 'right',
          better: 'high',
          value: (r) => Math.round(totalResources(r.totals.resourcesSpent)),
        },
        {
          key: 'produced',
          label: tt('Units made'),
          align: 'right',
          better: 'high',
          value: (r) => r.totals.unitsProduced,
        },
        {
          key: 'lost',
          label: tt('Units lost'),
          align: 'right',
          better: 'low',
          value: (r) => r.totals.unitsLost,
        },
        {
          key: 'killed',
          label: tt('Units killed'),
          align: 'right',
          better: 'high',
          value: (r) => r.totals.unitsKilled,
        },
        {
          key: 'villagersLost',
          label: tt('Villagers lost'),
          align: 'right',
          better: 'low',
          value: (r) => r.player.villagersLost,
        },
        {
          key: 'buildingsLost',
          label: tt('Buildings lost'),
          align: 'right',
          better: 'low',
          value: (r) => r.totals.buildingsLost,
        },
        {
          key: 'buildingsRazed',
          label: tt('Buildings razed'),
          align: 'right',
          better: 'high',
          value: (r) => r.totals.buildingsRazed,
        },
        {
          key: 'techs',
          label: tt('Techs'),
          align: 'right',
          better: 'high',
          value: (r) => r.totals.techResearched,
        },
        {
          key: 'army',
          label: tt('Largest army'),
          align: 'right',
          better: 'high',
          value: (r) => r.totals.largestArmy,
        },
        {
          key: 'villHigh',
          label: tt('Villager high'),
          align: 'right',
          better: 'high',
          value: (r) => r.totals.villagerHigh,
        },
        {
          key: 'relics',
          label: tt('Relics'),
          align: 'right',
          better: 'high',
          value: (r) => r.totals.relicsCaptured,
        },
        {
          key: 'sacred',
          label: tt('Sacred'),
          align: 'right',
          value: (r) =>
            `${r.totals.sacredCaptured}/${r.totals.sacredLost}/${r.totals.sacredNeutralized}`,
        },
      ]}
    />
  )
}

function TeamContributionCard({
  breakdown,
  summaryPlayers,
}: {
  breakdown: TeamContributionBreakdown
  summaryPlayers: PlayerSummary[]
}) {
  const { tt } = useI18n()
  const showPressure = breakdown.coverage.pressure.reported > 0
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="flex items-center gap-1.5 text-sm font-semibold">
              <Users className="h-4 w-4 text-primary" /> {tt('Team contribution breakdown')}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {tt(
                'Raw counters and teammate comparisons stay separate — there is no combined carry score.',
              )}
            </p>
          </div>
          <span className="rounded bg-secondary px-2 py-1 text-[10px] text-muted-foreground">
            {tt(breakdown.basis)}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
          <CoverageLabel label={tt('Production')} coverage={breakdown.coverage.production} />
          <CoverageLabel label={tt('Military')} coverage={breakdown.coverage.military} />
          <CoverageLabel label={tt('Tech')} coverage={breakdown.coverage.technology} />
          <CoverageLabel label="APM" coverage={breakdown.coverage.activity} />
          <CoverageLabel label={tt('Pressure')} coverage={breakdown.coverage.pressure} />
          {breakdown.excludedUnknownTeamRows > 0 && (
            <span>
              {breakdown.excludedUnknownTeamRows} {tt('row(s) excluded: team unknown')}
            </span>
          )}
        </div>

        <div className="mt-3 overflow-x-auto rounded-md border border-border">
          <table className="w-full min-w-[760px] text-xs">
            <thead className="bg-secondary/60 text-[10px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">{tt('Player')}</th>
                <th className="px-3 py-2 text-right">{tt('Production')}</th>
                <th className="px-3 py-2 text-right">{tt('Military efficiency')}</th>
                <th className="px-3 py-2 text-right">{tt('Technology')}</th>
                <th className="px-3 py-2 text-right">{tt('Activity')}</th>
                {showPressure && <th className="px-3 py-2 text-right">{tt('Pressure')}</th>}
              </tr>
            </thead>
            <tbody>
              {breakdown.players.map((row) => (
                <tr
                  key={row.profileId}
                  className={cn(
                    'border-t border-border/60 first:border-t-0',
                    row.isMe && 'bg-primary/5',
                  )}
                >
                  <td className="px-3 py-2 font-medium">
                    {contributionPlayerLabel(row, summaryPlayers, tt)}
                  </td>
                  <MetricCell
                    raw={
                      row.production.value == null
                        ? '-'
                        : `${fmtInt(row.production.value)} ${tt('units')}`
                    }
                    detail={metricComparison(row.production, 'team total', tt)}
                  />
                  <MetricCell raw={militaryRaw(row, tt)} detail={militaryComparison(row, tt)} />
                  <MetricCell
                    raw={
                      row.technology.value == null
                        ? '-'
                        : `${fmtInt(row.technology.value)} ${tt('techs')}`
                    }
                    detail={metricComparison(row.technology, 'team total', tt)}
                  />
                  <MetricCell
                    raw={row.activity.value == null ? '-' : `${row.activity.value} APM`}
                    detail={metricComparison(row.activity, 'team average', tt, false)}
                  />
                  {showPressure && (
                    <MetricCell
                      raw={row.pressure.value == null ? '-' : fmtK(row.pressure.value)}
                      detail={metricComparison(row.pressure, 'team total', tt)}
                    />
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
          {tt(
            'Shares and averages use reported values from your known team only. Structure damage is shown as pressure when Relic supplies it; it is not the same as buildings razed.',
          )}
        </p>
      </CardContent>
    </Card>
  )
}

function CoverageLabel({ label, coverage }: { label: string; coverage: MetricCoverage }) {
  return (
    <span>
      {label} {coverage.reported}/{coverage.teamSize}
    </span>
  )
}

function MetricCell({ raw, detail }: { raw: string; detail: string }) {
  return (
    <td className="px-3 py-2 text-right tabular-nums">
      <div className="font-medium">{raw}</div>
      <div className="mt-0.5 text-[10px] text-muted-foreground">{detail}</div>
    </td>
  )
}

function contributionPlayerLabel(
  row: TeamContributionPlayer,
  summaryPlayers: PlayerSummary[],
  tt: (value: string) => string,
): string {
  const summary = summaryPlayers.find((player) => player.profileId === row.profileId)
  const civ = row.civ ? civDisplayName(row.civ) : null
  if (row.isMe) return civ ? `${tt('You')} — ${civ}` : tt('You')
  if (summary) return playerLabel(summary)
  return civ ?? `${tt('Profile')} ${row.profileId}`
}

function metricComparison(
  metric: NormalizedTeamMetric,
  denominator: 'team total' | 'team average',
  tt: (value: string) => string,
  includeShare = true,
): string {
  if (metric.value == null) return tt('Not reported')
  const parts: string[] = []
  if (includeShare && metric.teamSharePct != null) {
    parts.push(`${metric.teamSharePct}% ${tt('of reported')} ${tt(denominator)}`)
  }
  if (metric.vsTeamAveragePct != null) {
    const sign = metric.vsTeamAveragePct > 0 ? '+' : ''
    parts.push(`${sign}${metric.vsTeamAveragePct}% ${tt('vs reported team average')}`)
  }
  return parts.join(' · ') || tt('Reported; comparison unavailable')
}

function militaryRaw(row: TeamContributionPlayer, tt: (value: string) => string): string {
  const { kills, deaths, kd, zeroDeaths } = row.military
  if (kills == null && deaths == null) return '-'
  const raw = `${kills == null ? '?' : fmtInt(kills)} ${tt('kills')} · ${deaths == null ? '?' : fmtInt(deaths)} ${tt('lost')}`
  if (zeroDeaths) return raw
  return kd == null ? raw : `${raw} · ${kd.toFixed(2)} K/D`
}

function militaryComparison(row: TeamContributionPlayer, tt: (value: string) => string): string {
  const parts: string[] = []
  if (row.military.teamKillSharePct != null) {
    parts.push(`${row.military.teamKillSharePct}% ${tt('of reported team kills')}`)
  }
  if (row.military.zeroDeaths) parts.push(tt('Zero losses; K/D is not divided by zero'))
  return parts.join(' · ') || tt('Military efficiency unavailable')
}

function ChartCard({
  title,
  icon,
  children,
}: {
  title: string
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
          {icon}
          {title}
        </h3>
        {children}
      </CardContent>
    </Card>
  )
}

interface TimeRow {
  t: number
  [series: string]: number
}

/** Merge each player's (t,v) points into rows keyed by timestamp, one column per player. */
function mergeSeries(
  players: PlayerSummary[],
  pick: (p: PlayerSummary) => { t: number; v: number }[],
): TimeRow[] {
  const byTime = new Map<number, TimeRow>()
  for (const p of players) {
    for (const { t, v } of pick(p)) {
      const row = byTime.get(t) ?? ({ t } as TimeRow)
      row[`p${p.playerId}`] = v
      byTime.set(t, row)
    }
  }
  return [...byTime.values()].sort((a, b) => a.t - b.t)
}

function TimeChart({
  data,
  players,
  colorOf,
  meId,
}: {
  data: TimeRow[]
  players: PlayerSummary[]
  colorOf: Map<number, string>
  meId: number | null
}) {
  return (
    <div className="h-52 w-full overflow-hidden">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: -8 }}>
          <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="t"
            stroke={MUTED}
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatDurationShort}
          />
          <YAxis
            stroke={MUTED}
            fontSize={11}
            tickLine={false}
            axisLine={false}
            width={44}
            tickFormatter={fmtK}
          />
          <Tooltip
            contentStyle={{
              background: 'hsl(var(--popover))',
              color: 'hsl(var(--popover-foreground))',
              border: `1px solid ${GRID}`,
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: MUTED }}
            labelFormatter={(t) => formatDurationShort(Number(t))}
            formatter={(v, key) => {
              const pid = Number(String(key).slice(1))
              const p = players.find((x) => x.playerId === pid)
              return [formatCount(Number(v)), p ? playerLabel(p) : String(key)]
            }}
          />
          {players.map((p) => (
            <Line
              key={p.playerId}
              type="monotone"
              dataKey={`p${p.playerId}`}
              stroke={colorOf.get(p.playerId)}
              strokeWidth={p.playerId === meId ? 2.5 : 1.5}
              dot={false}
              connectNulls
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function BuildOrderColumn({
  player,
  me,
  color,
}: {
  player: PlayerSummary
  me: boolean
  color: string
}) {
  const rows = collapseRuns(player.buildOrder)
  const rhythm = villagerGaps(player)
  return (
    <div
      className={cn(
        'overflow-hidden rounded-md border border-border',
        me && 'ring-1 ring-primary/40',
      )}
    >
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        <span className="truncate text-sm font-medium">{playerLabel(player)}</span>
        {me && (
          <span className="rounded bg-primary/15 px-1 text-[9px] font-semibold uppercase text-primary">
            You
          </span>
        )}
        {rhythm && (
          <span className="ml-auto whitespace-nowrap text-[11px] text-muted-foreground">
            {rhythm.villagersMade} vills
          </span>
        )}
      </div>
      <div className="max-h-96 overflow-y-auto">
        {rows.map((r, i) => (
          <div key={i} className="flex items-baseline gap-2 px-3 py-1 text-xs">
            <span className="w-10 shrink-0 tabular-nums text-muted-foreground">
              {formatDurationShort(r.timeSec)}
            </span>
            <span className={cn('flex-1 truncate', CATEGORY_STYLE[r.category])}>
              {r.name}
              {r.count > 1 && <span className="text-muted-foreground"> x{r.count}</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

interface BuildRun {
  timeSec: number
  name: string
  category: BuildEvent['category']
  count: number
}

/** Merge consecutive same-name events into a single run with a count. */
function collapseRuns(events: BuildEvent[]): BuildRun[] {
  const out: BuildRun[] = []
  for (const e of events) {
    const last = out[out.length - 1]
    if (last && last.name === e.name && last.category === e.category) last.count++
    else out.push({ timeSec: e.timeSec, name: e.name, category: e.category, count: 1 })
  }
  return out
}

/** Profile-id match from the summary header when available; civ as fallback. */
function isMe(p: PlayerSummary, myProfileId: number | null, myCiv: string | null): boolean {
  if (myProfileId != null && p.profileId != null) return p.profileId === myProfileId
  if (!myCiv) return false
  return civFromToken(p.civToken) === myCiv
}

/** Exact end-game totals from the header; last timeline sample only as fallback. */
function finalResources(p: PlayerSummary): ResourceAmounts | null {
  if (p.totals && totalResources(p.totals.resourcesGathered) > 0) return p.totals.resourcesGathered
  const last = [...p.resources].sort((a, b) => a.timeSec - b.timeSec).at(-1)
  return last?.gathered ?? null
}

function finalScore(p: PlayerSummary): ScorePoint | null {
  return [...p.scores].sort((a, b) => a.timeSec - b.timeSec).at(-1) ?? null
}

function totalResources(r: ResourceAmounts): number {
  return RESOURCE_KEYS.reduce((sum, k) => sum + (r[k] ?? 0), 0)
}

/**
 * Peak gather rate — the max of the game's own per-minute series (what the
 * post-match screen calls "Max food/min"). Falls back to extrapolating deltas
 * between cumulative samples for summaries without the per-minute dict.
 */
function maxGatherRate(p: PlayerSummary, key: ResourceKey): number | null {
  let max = 0
  let sawPerMinute = false
  for (const point of p.resources) {
    if (point.perMinute) {
      sawPerMinute = true
      max = Math.max(max, point.perMinute[key])
    }
  }
  if (!sawPerMinute) {
    const points = [...p.resources].sort((a, b) => a.timeSec - b.timeSec)
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1]!
      const cur = points[i]!
      const dt = cur.timeSec - prev.timeSec
      if (dt <= 0) continue
      const delta = cur.gathered[key] - prev.gathered[key]
      if (delta > 0) max = Math.max(max, (delta / dt) * 60)
    }
  }
  return max > 0 ? Math.round(max) : null
}

function villagerHint(
  tc: VillagerProductionRhythm | null,
  villagerHigh: number | null,
  tt: (value: string) => string,
): string {
  const parts: string[] = []
  if (villagerHigh != null && tc) parts.push(`${tc.villagersMade} ${tt('trained')}`)
  if (tc) {
    parts.push(
      tc.idleWindows > 0
        ? `${tc.idleWindows} ${tt('long gap(s), longest')} ${formatDurationShort(tc.longestGapSec)}`
        : tt('no long villager gaps'),
    )
  }
  return parts.length > 0 ? parts.join(' · ') : tt('No villager production events decoded.')
}

/**
 * Age-up timings. Authoritative source: the summary header's per-age timestamps
 * (what AoE4World displays). Fallback for headerless summaries: first landmark
 * build event matching the civ's landmark options.
 */
function ageTimings(player: PlayerSummary, civ: string | null | undefined): Map<2 | 3 | 4, number> {
  const byAge = new Map<2 | 3 | 4, number>()
  if (player.totals) {
    if (player.totals.age2Sec != null) byAge.set(2, player.totals.age2Sec)
    if (player.totals.age3Sec != null) byAge.set(3, player.totals.age3Sec)
    if (player.totals.age4Sec != null) byAge.set(4, player.totals.age4Sec)
    return byAge
  }
  const plan = landmarksForCiv(civ)
  if (!plan) return byAge
  for (const choice of plan.ages) {
    const names = new Set(choice.options.map(normName))
    for (const e of player.buildOrder) {
      if (e.category !== 'building' || !names.has(normName(e.name))) continue
      const prev = byAge.get(choice.age)
      if (prev == null || e.timeSec < prev) byAge.set(choice.age, e.timeSec)
    }
  }
  return byAge
}

function normName(name: string): string {
  return name
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[\u2018\u2019'`]/g, '')
    .replace(/[^a-z0-9]+/g, '')
}

function strongestScoreLane(score: ScorePoint, tt: (value: string) => string): string {
  const entries = [
    ['Military', score.military],
    ['Economy', score.economy],
    ['Technology', score.technology],
    ['Society', score.society],
  ] as const
  const [label, value] = [...entries].sort((a, b) => b[1] - a[1])[0]!
  return `${tt(label)} ${tt('led your score split at')} ${fmtInt(value)}.`
}

function resourceLine(r: ResourceAmounts): string {
  return `F ${fmtK(r.food)} / W ${fmtK(r.wood)} / G ${fmtK(r.gold)} / S ${fmtK(r.stone)}`
}

function labelsByCiv(players: PlayerSummary[]): Map<string, string> {
  const seen = new Map<string, string | null>()
  for (const p of players) {
    const civ = civFromToken(p.civToken)
    if (!civ) continue
    seen.set(civ, seen.has(civ) ? null : playerLabel(p))
  }
  const out = new Map<string, string>()
  for (const [civ, label] of seen) if (label) out.set(civ, label)
  return out
}

function combatPlayerLabel(
  row: PerPlayerMatchStats,
  labelByCiv: Map<string, string>,
  myProfileId: number | null,
): string {
  if (row.profileId === myProfileId) return 'You'
  if (row.civ) return labelByCiv.get(row.civ) ?? civDisplayName(row.civ)
  return String(row.profileId)
}

function fmtCell(v: number | string | null): string {
  if (v == null) return '-'
  if (typeof v === 'string') return v
  return Number.isInteger(v) ? fmtInt(v) : String(Math.round(v * 10) / 10)
}

function fmtInt(n: number): string {
  return formatCount(Math.round(n))
}

function fmtK(n: number): string {
  return n >= 1000 ? `${Math.round(n / 100) / 10}k` : String(Math.round(n))
}
