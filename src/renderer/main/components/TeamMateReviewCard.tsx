import { AlertTriangle, CheckCircle2, ExternalLink, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { PerPlayerMatchStats, Severity, Signal } from '@domain/analysis'
import { comparisonSignals } from '@domain/gameCoaching'
import type { MatchSummary } from '@domain/statsSummary'
import { civFromToken, type PlayerSummary as SummaryPlayer } from '@domain/statsSummary'
import { summaryPlayerForMe, summarySignals, villagerGaps } from '@domain/summaryCoaching'
import { playerEvidenceCoverage } from '@domain/statsCoverage'
import { civDisplayName } from '@domain/civ'
import { formatDurationShort } from '@shared/format'
import { cn } from '@shared/lib/utils'
import { Card, CardContent } from '@shared/components/ui/card'
import { useI18n } from '../../i18n'

const SEVERITY_ORDER: Record<Severity, number> = { major: 0, minor: 1, info: 2, good: 3 }
const SEVERITY_STYLE: Record<Severity, string> = {
  major: 'bg-destructive/15 text-destructive',
  minor: 'bg-warn/15 text-warn',
  info: 'bg-secondary text-muted-foreground',
  good: 'bg-win/15 text-win',
}

interface TeamMateReviewCardProps {
  summary: MatchSummary
  perPlayer?: PerPlayerMatchStats[]
  myProfileId: number | null
  myPlayerId: number | null
  myCiv: string | null
  activePlayerId: number | null
  onSelectPlayer?: (playerId: number) => void
}

interface ReviewRow {
  player: SummaryPlayer | null
  counter: PerPlayerMatchStats
  signals: Signal[]
  isMe: boolean
  coverage: ReturnType<typeof playerEvidenceCoverage> | null
}

/**
 * Team review intentionally uses the Relic team id as the gate. A summary
 * without that id cannot prove who was an ally, so the component stays hidden
 * instead of treating the first rows as teammates.
 */
export function TeamMateReviewCard({
  summary,
  perPlayer = [],
  myProfileId,
  myPlayerId,
  myCiv,
  activePlayerId,
  onSelectPlayer,
}: TeamMateReviewCardProps) {
  const { tt, gameName } = useI18n()
  const self = summaryPlayerForMe(summary, myProfileId, myCiv, myPlayerId)
  const selfProfileId = self?.profileId ?? myProfileId
  const ownCounter =
    selfProfileId == null
      ? null
      : (perPlayer.find((row) => row.profileId === selfProfileId) ?? null)
  if (!ownCounter || ownCounter.teamId == null) return null

  const teamCounters = perPlayer.filter((row) => row.teamId === ownCounter.teamId)
  if (teamCounters.length < 2) return null
  const summaryByProfile = new Map(
    summary.players
      .filter((player) => player.profileId != null)
      .map((player) => [player.profileId as number, player]),
  )
  const rows: ReviewRow[] = teamCounters.map((counter) => {
    const player = summaryByProfile.get(counter.profileId) ?? null
    const playerCiv = player ? civFromToken(player.civToken) : counter.civ
    const signals = player
      ? summarySignals({
          summary,
          myProfileId: player.profileId,
          myCiv: playerCiv,
          myPlayerId: player.playerId,
          perPlayer,
        })
      : []
    const comparison = comparisonSignals(perPlayer, counter.profileId)
    return {
      player,
      counter,
      signals: dedupeSignals([...signals, ...comparison]).sort(
        (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
      ),
      isMe: counter.profileId === selfProfileId,
      coverage: player ? playerEvidenceCoverage(player, counter) : null,
    }
  })

  return (
    <section id="team-mate-review" className="scroll-mt-4 space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold tracking-tight">
          <Users className="mr-1.5 inline-block h-4 w-4 text-primary" />
          {tt('Team-mate review')}
        </h2>
        <span className="text-xs text-muted-foreground">
          {tt('Only recorded evidence is used; no combined carry score is inferred.')}
        </span>
      </div>
      <div className="grid gap-3 xl:grid-cols-2">
        {rows.map((row) => {
          const name = row.player?.name || `${tt('Player')} ${row.counter.profileId}`
          const civ = row.player ? civFromToken(row.player.civToken) : row.counter.civ
          const findings = row.signals.filter((signal) => signal.severity !== 'good')
          const strengths = row.signals.filter((signal) => signal.severity === 'good')
          const active = row.player?.playerId === activePlayerId
          return (
            <Card key={row.counter.profileId} className={cn(active && 'border-primary/60')}>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      {row.player ? (
                        <button
                          type="button"
                          onClick={() => onSelectPlayer?.(row.player!.playerId)}
                          className="truncate text-left text-sm font-semibold hover:text-primary hover:underline"
                          title={tt('Show this player’s full match evidence')}
                        >
                          {name}
                        </button>
                      ) : (
                        <div className="truncate text-sm font-semibold">{name}</div>
                      )}
                      <Link
                        to={`/profile/${row.counter.profileId}`}
                        title={tt('Open this player’s scout profile')}
                        className="shrink-0 text-primary hover:text-primary/80"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {civ ? gameName(civDisplayName(civ)) : tt('Civilization unavailable')}
                      {row.isMe && <span className="ml-1.5 text-primary">· {tt('You')}</span>}
                    </div>
                  </div>
                  <span
                    className={cn(
                      'rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase',
                      row.counter.result === 'win'
                        ? 'bg-win/15 text-win'
                        : row.counter.result === 'loss'
                          ? 'bg-destructive/15 text-destructive'
                          : 'bg-secondary text-muted-foreground',
                    )}
                  >
                    {row.counter.result === 'win'
                      ? tt('W')
                      : row.counter.result === 'loss'
                        ? tt('L')
                        : tt('Unknown')}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                  <Fact label={tt('Units')} value={formatNumber(row.counter.unitsProduced)} />
                  <Fact
                    label={tt('Kills / losses')}
                    value={`${formatNumber(row.counter.kills)} / ${formatNumber(row.counter.deaths)}`}
                  />
                  <Fact
                    label={tt('K/D')}
                    value={row.counter.kd == null ? '—' : row.counter.kd.toFixed(2)}
                  />
                  <Fact label="APM" value={formatNumber(row.counter.apm)} />
                </div>

                {row.player && <SummaryFacts player={row.player} />}

                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold">
                    <AlertTriangle className="h-3.5 w-3.5 text-warn" />
                    {tt('Confirmed findings')}{' '}
                    <span className="text-muted-foreground">({findings.length})</span>
                  </div>
                  {findings.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      {tt('No evidence-backed issues were found for this player.')}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {findings.slice(0, 4).map((signal) => (
                        <Finding key={signal.id} signal={signal} />
                      ))}
                    </div>
                  )}
                </div>

                {strengths.length > 0 && (
                  <div className="space-y-2 border-t border-border/60 pt-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-win">
                      <CheckCircle2 className="h-3.5 w-3.5" /> {tt('Strengths')}
                    </div>
                    {strengths.slice(0, 2).map((signal) => (
                      <Finding key={signal.id} signal={signal} />
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-x-3 gap-y-1 border-t border-border/60 pt-2 text-[10px] text-muted-foreground">
                  <span>
                    {tt('Relic counters')}:{' '}
                    {row.coverage
                      ? `${row.coverage.counterReported}/${row.coverage.counterTotal}`
                      : counterCoverage(row.counter)}
                  </span>
                  {row.coverage && (
                    <span>
                      {tt('Summary timeline')}: {row.coverage.summaryReported}/
                      {row.coverage.summaryTotal}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </section>
  )
}

function SummaryFacts({ player }: { player: SummaryPlayer }) {
  const { tt } = useI18n()
  const gaps = villagerGaps(player)
  const totals = player.totals
  return (
    <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
      <Fact label={tt('Villager high')} value={formatNumber(totals?.villagerHigh)} />
      <Fact label={tt('Feudal')} value={formatDurationShort(totals?.age2Sec)} />
      <Fact label={tt('TC gaps')} value={gaps ? formatNumber(gaps.count) : '—'} />
      <Fact label={tt('Villagers lost')} value={formatNumber(player.villagersLost)} />
    </div>
  )
}

function Finding({ signal }: { signal: Signal }) {
  const { tt } = useI18n()
  return (
    <div className="flex items-start gap-2">
      <span
        className={cn(
          'mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase',
          SEVERITY_STYLE[signal.severity],
        )}
      >
        {signal.severity === 'major'
          ? tt('Major')
          : signal.severity === 'minor'
            ? tt('Minor')
            : signal.severity === 'good'
              ? tt('Good')
              : tt('Info')}
      </span>
      <div className="min-w-0">
        <div className="text-xs font-medium">{tt(signal.title)}</div>
        <div className="text-[11px] leading-relaxed text-muted-foreground">{tt(signal.detail)}</div>
      </div>
    </div>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-border/60 bg-secondary/20 px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-medium tabular-nums">{value}</div>
    </div>
  )
}

function formatNumber(value: number | null | undefined): string {
  return value == null || !Number.isFinite(value) ? '—' : Math.round(value).toLocaleString()
}

function counterCoverage(row: PerPlayerMatchStats): string {
  const reported = [
    row.unitsProduced,
    row.kills,
    row.deaths,
    row.buildingsProduced,
    row.techsResearched,
    row.apm,
  ].filter((value) => value != null).length
  return `${reported}/6`
}

function dedupeSignals(signals: Signal[]): Signal[] {
  const seen = new Set<string>()
  return signals.filter((signal) => {
    if (seen.has(signal.id)) return false
    seen.add(signal.id)
    return true
  })
}
