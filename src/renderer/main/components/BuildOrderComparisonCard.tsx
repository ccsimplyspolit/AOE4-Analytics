import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  ExternalLink,
  Info,
  XCircle,
} from 'lucide-react'
import { useMemo } from 'react'
import type { PerPlayerMatchStats } from '@domain/analysis'
import type { MatchSummary, PlayerSummary } from '@domain/statsSummary'
import type { VideoAnalysisRecord } from '@domain/videoAnalysis'
import type { TwitchVodReference } from '@domain/twitchVodFinder'
import {
  compareMatchPlayers,
  isPlayerSubject,
  type BuildAuditStatus,
  type PlayerBuildAudit,
} from '@domain/buildOrderComparison'
import { BUNDLED_BUILD_ORDERS } from '@data/buildOrders'
import { civDisplayName } from '@domain/civ'
import { formatDurationShort } from '@shared/format'
import { cn } from '@shared/lib/utils'
import { Badge } from '@shared/components/ui/badge'
import { Card, CardContent } from '@shared/components/ui/card'
import { useI18n } from '../../i18n'

const EMPTY_PLAYERS: PlayerSummary[] = []

export function BuildOrderComparisonCard({
  summary,
  myCiv,
  myProfileId,
  myPlayerId,
  myName,
  summaryLoading = false,
  map,
  format,
  patch,
  referenceBuildName,
  perPlayer,
  linkedVideoAnalysis,
  verifiedVod,
  showSubjectBadge = true,
}: {
  summary: MatchSummary | null
  myCiv: string | null
  myProfileId: number | null
  /** Stable summary row id used when the selected player has no profile id. */
  myPlayerId?: number | null
  myName?: string | null
  summaryLoading?: boolean
  map?: string | null
  format?: string | null
  patch?: string | null
  referenceBuildName?: string | null
  perPlayer?: PerPlayerMatchStats[] | null
  /** Exact VOD analysis linked to this game, when public captions were extracted. */
  linkedVideoAnalysis?: VideoAnalysisRecord
  /** Exact-game Twitch association, even before caption/build extraction. */
  verifiedVod?: TwitchVodReference | null
  /** Set false when a match viewer is focused on somebody other than its owner. */
  showSubjectBadge?: boolean
}) {
  const { tt, gameName } = useI18n()
  const players = summary?.players ?? EMPTY_PLAYERS
  // A metadata-only VOD record proves the source URL, but not the build. Only
  // caption-backed records with at least one recognized tactic may override
  // the observed replay-fit reference.
  const extractedVideoBuild =
    linkedVideoAnalysis?.transcriptStatus === 'available' &&
    (linkedVideoAnalysis.tactics?.length ?? 0) > 0
      ? linkedVideoAnalysis.build
      : null
  const audits = useMemo(
    () =>
      compareMatchPlayers({
        players,
        builds: BUNDLED_BUILD_ORDERS,
        myCiv,
        myProfileId,
        myPlayerId,
        myName,
        map,
        patch,
        referenceBuildName,
        perPlayer,
        preferredBuild: extractedVideoBuild,
      }),
    [
      extractedVideoBuild,
      map,
      myCiv,
      myName,
      myPlayerId,
      myProfileId,
      patch,
      perPlayer,
      players,
      referenceBuildName,
    ],
  )
  if (!summary) {
    return (
      <section id="build-order-audit" className="scroll-mt-4 space-y-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <ClipboardCheck className="h-4 w-4 text-primary" />
          {tt('Build-order audit · all players')}
        </h2>
        <Card>
          <CardContent className="space-y-2 p-4 text-sm">
            <p className="font-medium">
              {summaryLoading
                ? tt('Reading match evidence…')
                : tt('Detailed build comparison is unavailable for this game.')}
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {tt(
                'The game has no decoded stats.rgs or cached Relic summary yet, so actual player actions, landmark timings and build deviations cannot be verified.',
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              {tt(
                'Sync the match again, connect Steam for ranked summaries, or save the local replay and run replay analysis.',
              )}
            </p>
          </CardContent>
        </Card>
      </section>
    )
  }
  // Keep the anchor mounted even when the summary contains no player rows.
  // GameDetail's "Open build audit" action targets this id; returning null
  // here made the button appear inert for partially decoded/corrupt summaries.
  if (audits.length === 0) {
    return (
      <section id="build-order-audit" className="scroll-mt-4 space-y-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <ClipboardCheck className="h-4 w-4 text-primary" />
          {tt('Build-order audit · all players')}
        </h2>
        <Card>
          <CardContent className="space-y-2 p-4 text-sm">
            <p className="font-medium">{tt('No player rows were decoded for this match.')}</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {tt(
                'The match can still be reviewed after syncing its summary or importing the local replay.',
              )}
            </p>
          </CardContent>
        </Card>
      </section>
    )
  }
  const comparable = audits.filter((audit) => audit.reference != null)
  const withEvidence = audits.filter(
    (audit) =>
      audit.coverage.gradeableCheckpoints > 0 ||
      audit.coverage.matchedActions > 0 ||
      audit.coverage.eventCount > 0,
  )

  return (
    <section id="build-order-audit" className="scroll-mt-4 space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <ClipboardCheck className="h-4 w-4 text-primary" />
          {tt('Build-order audit · all players')}
        </h2>
        <span className="text-xs text-muted-foreground">
          {comparable.length}/{audits.length} {tt('players matched to a reference build')}
          {' · '}
          {withEvidence.length}/{audits.length} {tt('players with decoded evidence')}
          {map && <> · {map}</>}
          {format && <> · {format}</>}
        </span>
      </div>

      <Card>
        <CardContent className="space-y-3 p-4">
          {verifiedVod && (
            <ExactVodEvidence
              vod={verifiedVod}
              civilization={myCiv}
              extracted={Boolean(extractedVideoBuild)}
            />
          )}
          <div className="overflow-x-auto rounded-md border border-border/70">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-b border-border bg-background/40">
                  <th className="rts-ledger-head px-3 py-2 text-left">{tt('Player')}</th>
                  <th className="rts-ledger-head px-2 py-2 text-left">{tt('Civilization')}</th>
                  <th className="rts-ledger-head px-2 py-2 text-left">{tt('Reference build')}</th>
                  <th className="rts-ledger-head px-2 py-2 text-right">{tt('On plan')}</th>
                  <th className="rts-ledger-head px-2 py-2 text-right">{tt('Good')}</th>
                  <th className="rts-ledger-head px-3 py-2 text-right">{tt('Improve')}</th>
                </tr>
              </thead>
              <tbody>
                {audits.map((audit) => (
                  <AuditSummaryRow
                    key={audit.player.playerId}
                    audit={audit}
                    myProfileId={myProfileId}
                    myPlayerId={myPlayerId ?? null}
                    myCiv={myCiv}
                    myName={myName}
                    allPlayers={players}
                    showSubjectBadge={showSubjectBadge}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-2">
            {audits.map((audit) => (
              <AuditDetail
                key={audit.player.playerId}
                audit={audit}
                gameName={gameName}
                open={
                  (myPlayerId != null && audit.player.playerId === myPlayerId) ||
                  (myPlayerId == null &&
                    audit.player.profileId != null &&
                    audit.player.profileId === myProfileId)
                }
              />
            ))}
          </div>

          <p className="flex items-start gap-2 text-[11px] leading-relaxed text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {tt(
              'Confirmed errors use only decoded build events and landmark timings. Review items are not proof of a mistake. Villager assignment, rally points, scouting, and unrecorded commands are shown as unavailable, not guessed.',
            )}
          </p>
        </CardContent>
      </Card>
    </section>
  )
}

function ExactVodEvidence({
  vod,
  civilization,
  extracted,
}: {
  vod: TwitchVodReference
  civilization: string | null
  extracted: boolean
}) {
  const { tt } = useI18n()
  const url = safeExternalUrl(vod.url)
  if (!url) return null
  const civParam = civilization ? `&civilization=${encodeURIComponent(civilization)}` : ''
  const analyzeUrl = `#/tincture?tab=cellar&video=${encodeURIComponent(url)}&gameId=${encodeURIComponent(vod.gameId)}${civParam}`
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-violet-400/25 bg-violet-500/[0.06] px-3 py-2">
      <div className="min-w-0">
        <div className="text-xs font-medium text-violet-200">{tt('Verified exact-game VOD')}</div>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {extracted
            ? tt('The extracted video build is used as the preferred reference for your player.')
            : tt(
                'This confirms the video belongs to this game; the build is still inferred until the VOD is analyzed.',
              )}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <a
          href={analyzeUrl}
          className="inline-flex items-center gap-1.5 rounded-md border border-primary/35 px-2.5 py-1.5 text-[11px] font-medium text-primary hover:bg-primary/10"
        >
          {tt('Analyze exact VOD')}
        </a>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md bg-violet-500 px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-violet-400"
        >
          {vod.offsetSec != null
            ? tt('Watch VOD from {time}').replace('{time}', formatDurationShort(vod.offsetSec))
            : tt('Watch VOD')}
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  )
}

function AuditSummaryRow({
  audit,
  myProfileId,
  myPlayerId,
  myCiv,
  myName,
  allPlayers,
  showSubjectBadge,
}: {
  audit: PlayerBuildAudit
  myProfileId: number | null
  myPlayerId: number | null
  myCiv: string | null
  myName?: string | null
  allPlayers: PlayerSummary[]
  showSubjectBadge: boolean
}) {
  const { tt, gameName } = useI18n()
  const me = isPlayerSubject(audit.player, myProfileId, myCiv, myName, allPlayers, myPlayerId)
  const name = audit.player.name || `Player ${audit.player.playerId}`
  const score = audit.report?.score
  return (
    <tr className="border-b border-border/50 last:border-b-0">
      <td className="px-3 py-2 font-medium">
        {name}
        {me && showSubjectBadge && (
          <Badge className="ml-2 text-[10px]" variant="outline">
            {tt('You')}
          </Badge>
        )}
      </td>
      <td className="px-2 py-2 text-muted-foreground">
        {audit.civ ? gameName(civDisplayName(audit.civ)) : tt('Unknown')}
      </td>
      <td className="max-w-[250px] truncate px-2 py-2 text-muted-foreground">
        {audit.reference?.name ?? tt('No compatible build')}
      </td>
      <td className="px-2 py-2 text-right">
        <div className="flex flex-col items-end gap-0.5">
          {score == null ? <span className="text-muted-foreground">—</span> : <Score score={score} />}
          {audit.coverage.timedCheckpoints > 0 && (
            <span className="text-[10px] text-muted-foreground">
              {audit.coverage.gradeableCheckpoints}/{audit.coverage.timedCheckpoints}
            </span>
          )}
        </div>
      </td>
      <td className="px-2 py-2 text-right tabular-nums text-win">{audit.strengths.length}</td>
      <td className="px-3 py-2 text-right tabular-nums">
        <span className={audit.improvements.length > 0 ? 'text-loss' : 'text-win'}>
          {audit.improvements.length}
        </span>
      </td>
    </tr>
  )
}

function AuditDetail({
  audit,
  gameName,
  open = false,
}: {
  audit: PlayerBuildAudit
  gameName: (value: string) => string
  open?: boolean
}) {
  const { tt } = useI18n()
  const name = audit.player.name || `Player ${audit.player.playerId}`
  const title = audit.civ ? `${name} · ${gameName(civDisplayName(audit.civ))}` : name
  return (
    <details open={open} className="rounded-md border border-border/70 bg-background/20">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm font-medium [&::-webkit-details-marker]:hidden">
        <span className="truncate">{title}</span>
        <span className="flex shrink-0 items-center gap-2 text-xs">
          {audit.report?.score != null && <Score score={audit.report.score} />}
          <span className={audit.improvements.length > 0 ? 'text-loss' : 'text-win'}>
            {audit.improvements.length} {tt('improvements')}
          </span>
        </span>
      </summary>
      <div className="space-y-3 border-t border-border/70 p-3">
        {audit.reference && audit.report ? (
          <>
            <p className="text-xs text-muted-foreground">
              {tt('Compared with')}{' '}
              <span className="font-medium text-foreground">{audit.reference.name}</span>.{' '}
              {referenceSelectionText(audit, tt)}{' '}
              {audit.hasTimeline
                ? tt('The replay timeline is available.')
                : tt('The replay has no decoded build timeline.')}
            </p>
            {referenceUrl(audit) && (
              <a
                href={referenceUrl(audit)!}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                {tt(audit.reference.origin === 'video' ? 'Open source video' : 'Open build source')}
              </a>
            )}
            {audit.referenceReason === 'video' && (
              <p className="text-[11px] text-primary">
                {tt('This build was extracted from the VOD linked to this exact game.')}
              </p>
            )}
            {audit.referenceReason === 'observed' && audit.referenceFitScore != null && (
              <p className="text-[11px] text-muted-foreground">
                {tt('Inferred from the observed timeline')}: {audit.referenceFitScore}% ·{' '}
                {audit.referenceMatchedActions}/{audit.referenceExpectedActions}{' '}
                {tt('actions matched')} · {tt(`${audit.referenceConfidence} confidence`)}
              </p>
            )}
            <CoverageLine audit={audit} />
            {audit.strengths.length > 0 && <Strengths audit={audit} />}
            {audit.improvements.length > 0 ? (
              <div className="space-y-1.5">
                {audit.improvements.map((issue, index) => (
                  <div
                    key={`${issue.kind}-${index}`}
                    className={cn(
                      'flex items-start gap-2 rounded-md border p-2 text-xs',
                      issue.certainty === 'review'
                        ? 'border-warn/20 bg-warn/5'
                        : issue.severity === 'info'
                          ? 'border-primary/20 bg-primary/5'
                          : 'border-loss/20 bg-loss/5',
                    )}
                  >
                    <AlertTriangle
                      className={cn(
                        'mt-0.5 h-3.5 w-3.5 shrink-0',
                        issue.certainty === 'review' || issue.severity === 'info'
                          ? 'text-warn'
                          : 'text-loss',
                      )}
                    />
                    <div>
                      <div className="font-medium">
                        {issue.certainty === 'review' ? `${tt('Review')}: ` : ''}
                        {tt(issue.message)}
                      </div>
                      <div className="text-muted-foreground">{tt(issue.evidence)}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-md border border-win/20 bg-win/5 p-2 text-xs text-win">
                <CheckCircle2 className="h-3.5 w-3.5" />{' '}
                {tt('No confirmed build-order deviations in the decoded timeline.')}
              </div>
            )}
            <TimingTable audit={audit} />
            {audit.actions.length > 0 && <ActionTable audit={audit} />}
          </>
        ) : (
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warn" />
            <span>
            {audit.issues[0] != null
              ? tt(audit.issues[0].message)
              : tt('No compatible build is available for this player.')}
            </span>
          </div>
        )}
      </div>
    </details>
  )
}

function CoverageLine({ audit }: { audit: PlayerBuildAudit }) {
  const { tt } = useI18n()
  const c = audit.coverage
  const confidence =
    c.confidence === 'high'
      ? tt('high confidence')
      : c.confidence === 'medium'
        ? tt('medium confidence')
        : c.confidence === 'low'
          ? tt('low confidence')
          : tt('no gradeable data')
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 rounded-md border border-border/60 bg-secondary/20 px-2 py-1.5 text-[11px] text-muted-foreground">
      <span>
        {tt('Evidence')}: {c.eventCount} {tt('decoded events')}
      </span>
      <span>
        {c.gradeableCheckpoints}/{c.timedCheckpoints} {tt('timing checkpoints')}
      </span>
      {c.expectedActions > 0 && (
        <span>
          {c.matchedActions}/{c.expectedActions} {tt('actions matched')}
        </span>
      )}
      <span>{confidence}</span>
    </div>
  )
}

function Strengths({ audit }: { audit: PlayerBuildAudit }) {
  const { tt } = useI18n()
  return (
    <div className="space-y-1.5">
      <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-win">
        <CheckCircle2 className="h-3.5 w-3.5" /> {tt('What went well')}
      </h3>
      <div className="grid gap-1.5 md:grid-cols-2">
        {audit.strengths.map((finding, index) => (
          <div
            key={`${finding.kind}-${index}`}
            className="rounded-md border border-win/15 bg-win/5 p-2 text-xs"
          >
            <div className="font-medium text-win">{tt(finding.message)}</div>
            <div className="text-muted-foreground">{tt(finding.evidence)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function referenceSelectionText(audit: PlayerBuildAudit, tt: (value: string) => string): string {
  if (audit.referenceReason === 'pinned') return tt('Pinned build selected.')
  if (audit.referenceReason === 'video') return tt('Exact linked VOD build selected.')
  if (audit.referenceReason === 'observed')
    return `${tt('Selected by observed timeline fit')} (${audit.referenceCandidates}).`
  if (audit.referenceReason === 'matchup')
    return `${tt('Build selected for this matchup')} (${audit.referenceCandidates}).`
  if (audit.referenceReason === 'map')
    return `${tt('Best compatible build for this map')} (${audit.referenceCandidates}).`
  if (audit.referenceReason === 'patch')
    return `${tt('Build matching the current patch')} (${audit.referenceCandidates}).`
  return audit.referenceCandidates > 1
    ? `${tt('Best compatible build selected')} (${audit.referenceCandidates}).`
    : tt('The only compatible build was selected.')
}

function referenceUrl(audit: PlayerBuildAudit): string | null {
  const url = audit.reference?.video ?? audit.reference?.source ?? null
  if (!url) return null
  return safeExternalUrl(url)
}

function safeExternalUrl(value: string): string | null {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:' ? parsed.toString() : null
  } catch {
    return null
  }
}

function TimingTable({ audit }: { audit: PlayerBuildAudit }) {
  const { tt } = useI18n()
  const checkpoints = audit.report?.checkpoints ?? []
  if (checkpoints.length === 0) return null
  return (
    <div>
      <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
        {tt('Timing checkpoints')}
      </h3>
      <div className="overflow-x-auto rounded-md border border-border/70">
        <table className="w-full min-w-[540px] text-xs">
          <thead>
            <tr className="border-b border-border bg-background/40">
              <th className="px-2 py-1.5 text-left">{tt('Checkpoint')}</th>
              <th className="px-2 py-1.5 text-right">{tt('Target')}</th>
              <th className="px-2 py-1.5 text-right">{tt('Actual')}</th>
              <th className="px-2 py-1.5 text-right">{tt('Delta')}</th>
              <th className="px-2 py-1.5 text-right">{tt('Status')}</th>
            </tr>
          </thead>
          <tbody>
            {checkpoints.map((checkpoint, index) => {
              const actual =
                checkpoint.kind === 'villagers'
                  ? checkpoint.actualVillagers
                  : checkpoint.actualTimeSec
              const target =
                checkpoint.kind === 'villagers'
                  ? checkpoint.targetVillagers
                  : checkpoint.targetTimeSec
              const delta =
                checkpoint.kind === 'villagers' ? checkpoint.villagerDelta : checkpoint.deltaSec
              const status =
                checkpoint.ok == null
                  ? 'unknown'
                  : checkpoint.ok
                    ? 'ok'
                    : delta != null && delta > 0
                      ? 'late'
                      : 'early'
              return (
                <tr
                  key={`${checkpoint.kind}-${index}`}
                  className="border-b border-border/50 last:border-b-0"
                >
                  <td className="px-2 py-1.5">{tt(checkpoint.label)}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    {checkpoint.kind === 'villagers' ? target : formatDurationShort(target)}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    {actual == null
                      ? '—'
                      : checkpoint.kind === 'villagers'
                        ? actual
                        : formatDurationShort(actual)}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    {delta == null
                      ? '—'
                      : checkpoint.kind === 'villagers'
                        ? `${delta > 0 ? '+' : ''}${delta}`
                        : `${delta > 0 ? '+' : ''}${formatDurationShort(Math.abs(delta))}`}
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <Status status={status} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ActionTable({ audit }: { audit: PlayerBuildAudit }) {
  const { tt } = useI18n()
  return (
    <div>
      <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
        {tt('Action verification')}
      </h3>
      <div className="space-y-1">
        {audit.actions.map((action, index) => (
          <div
            key={`${action.stepIndex}-${index}`}
            className="grid gap-1 rounded-md border border-border/60 px-2 py-1.5 text-xs md:grid-cols-[1fr_1fr_auto] md:items-center"
          >
            <span className="text-muted-foreground">
              {formatDurationShort(action.targetTimeSec)} · {tt(action.note)}
            </span>
            <span>
              {action.actual
                ? `${tt(action.actual.name)} @ ${formatDurationShort(action.actual.timeSec)}`
                : tt('Not found in replay timeline')}
            </span>
            <Status status={action.status} />
          </div>
        ))}
      </div>
    </div>
  )
}

function Score({ score }: { score: number }) {
  return (
    <span
      className={cn(
        'rounded-sm px-1.5 py-0.5 font-semibold tabular-nums',
        score >= 80
          ? 'bg-win/15 text-win'
          : score >= 50
            ? 'bg-warn/15 text-warn'
            : 'bg-loss/15 text-loss',
      )}
    >
      {score}%
    </span>
  )
}

function Status({ status }: { status: BuildAuditStatus }) {
  const { tt } = useI18n()
  const label =
    status === 'ok'
      ? tt('OK')
      : status === 'late'
        ? tt('Late')
        : status === 'early'
          ? tt('Early')
          : status === 'missing'
            ? tt('Missing')
            : tt('Unavailable')
  return (
    <span
      className={cn(
        'font-medium',
        status === 'ok' ? 'text-win' : status === 'unknown' ? 'text-muted-foreground' : 'text-loss',
      )}
    >
      {label}
    </span>
  )
}
