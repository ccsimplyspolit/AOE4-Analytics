import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Clock3, ExternalLink, Map, Search, Trophy, Users } from 'lucide-react'
import type { StoredMatch } from '@store/historyStore'
import type { PerPlayerMatchStats } from '@domain/analysis'
import type { MatchSummary, PlayerSummary } from '@domain/statsSummary'
import type { SimilarMatchCandidate, SimilarMatchQuery } from '@domain/similarMatch'
import type { TwitchVodFinderInput } from '@domain/twitchVodFinder'
import { twitchVideoFinderUrl } from '@domain/twitchVodFinder'
import { VideoAnalysisPanel } from './VideoAnalysisPanel'
import { civDisplayName } from '@domain/civ'
import { formatDurationShort } from '@shared/format'
import { cn } from '@shared/lib/utils'
import { Card, CardContent } from '@shared/components/ui/card'
import { Badge } from '@shared/components/ui/badge'
import { usePublicGame } from '../queries/usePublicGame'
import { useSimilarMatches } from '../queries/useSimilarMatches'
import { EmptyBox, ErrorBox, Spinner } from './feedback'
import { useI18n } from '../../i18n'
import { useTwitchVod } from '../queries/useTwitchVod'
import { useVideoAnalyses } from '../queries/useVideoAnalyses'

interface SimilarMatchCardProps {
  match: StoredMatch
  summary: MatchSummary | null
  myProfileId: number | null
  query: SimilarMatchQuery
  enabled?: boolean
}

interface Metric {
  label: string
  current: number | null
  reference: number | null
  kind?: 'seconds' | 'number'
  lowerIsBetter?: boolean
}

export function SimilarMatchCard({
  match,
  summary,
  myProfileId,
  query,
  enabled = true,
}: SimilarMatchCardProps) {
  const { tt } = useI18n()
  const search = useSimilarMatches(query, enabled)
  const candidates = useMemo(() => (search.data?.ok ? search.data.data : []), [search.data])
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null)
  const selected =
    candidates.find((candidate) => candidate.gameId === selectedGameId) ?? candidates[0] ?? null
  const publicGame = usePublicGame(selected?.referenceProfileId ?? null, selected?.gameId ?? null)
  const referenceDetail = publicGame.data?.ok ? publicGame.data.data : null

  useEffect(() => {
    if (
      candidates.length > 0 &&
      !candidates.some((candidate) => candidate.gameId === selectedGameId)
    ) {
      setSelectedGameId(candidates[0]!.gameId)
    }
  }, [candidates, selectedGameId])

  const currentPlayer = selectSummaryPlayer(summary, myProfileId, match.civ)
  const currentPerPlayer = selectPerPlayer(match.perPlayer ?? [], myProfileId, match.civ)
  const referencePlayer = selectSummaryPlayer(
    referenceDetail?.summary ?? null,
    selected?.referenceProfileId ?? null,
    selected?.referenceCiv ?? match.civ,
  )
  const referencePerPlayer = selectPerPlayer(
    referenceDetail?.perPlayer ?? [],
    selected?.referenceProfileId ?? null,
    selected?.referenceCiv ?? match.civ,
  )
  const vodInput: TwitchVodFinderInput = selected
    ? {
        gameId: String(selected.gameId),
        civilization: selected.referenceCiv,
        opponentCivilization: selected.teams
          .filter((team) => team.index !== selected.targetTeamIndex)
          .flatMap((team) => team.players)[0]?.civilization,
        map: selected.map,
        durationSec: selected.durationSec,
      }
    : { gameId: '0', civilization: match.civ }
  const vodLookup = useTwitchVod(vodInput, selected != null)
  const verifiedVod = vodLookup.data?.ok ? vodLookup.data.data.vod : null
  const videoAnalyses = useVideoAnalyses()
  const linkedVideoAnalysis =
    selected && videoAnalyses.data?.ok
      ? videoAnalyses.data.data.find((record) => record.gameId === String(selected.gameId))
      : undefined
  const metrics = useMemo(
    () =>
      buildMetrics(
        currentPlayer,
        currentPerPlayer,
        referencePlayer,
        referencePerPlayer,
        match.durationSec,
        selected?.durationSec ?? null,
      ),
    [
      currentPlayer,
      currentPerPlayer,
      referencePlayer,
      referencePerPlayer,
      match.durationSec,
      selected?.durationSec,
    ],
  )
  const lessons = useMemo(() => buildLessons(metrics, selected), [metrics, selected])

  if (!enabled) return null
  return (
    <section className="space-y-2" id="similar-match">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold tracking-tight">
          {tt('Show me how to play this matchup')}
        </h2>
        <span className="text-xs text-muted-foreground">
          {tt('Top 5 by average rating')}
          {query.ratingAbove != null && ` · >${Math.round(query.ratingAbove)}`}
        </span>
      </div>
      <Card>
        <CardContent className="space-y-4 p-4">
          <p className="text-sm text-muted-foreground">
            {tt(
              'The app searches your complete cached account archive first, then the available public-game window (up to 1,000 recent matches), and compares detailed checkpoints for the best matching winner.',
            )}
          </p>

          {search.isLoading && <Spinner label={tt('Searching for similar winning games…')} />}
          {search.data && !search.data.ok && (
            <ErrorBox
              message={tt(search.data.error.message)}
              onRetry={() => void search.refetch()}
            />
          )}
          {!search.isLoading && search.data?.ok && candidates.length === 0 && (
            <EmptyBox>
              <div className="space-y-1">
                <p>
                  {tt(
                    'No match with this exact map and civilization composition was found in the cached account archive or available public-game window.',
                  )}
                </p>
                <p className="text-xs">
                  {tt(
                    'Try again after more games are indexed, or use the build-order comparison below.',
                  )}
                </p>
              </div>
            </EmptyBox>
          )}

          {candidates.length > 0 && (
            <div className="grid gap-3 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
              <div className="space-y-2">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {tt('Reference games')}
                </div>
                {candidates.map((candidate) => (
                  <ReferenceGameButton
                    key={candidate.gameId}
                    candidate={candidate}
                    selected={candidate.gameId === selected?.gameId}
                    onClick={() => setSelectedGameId(candidate.gameId)}
                  />
                ))}
              </div>

              {selected && (
                <div className="space-y-3 rounded-md border border-border/70 bg-secondary/20 p-3">
                  <ReferenceHeader candidate={selected} />
                  <TeamLayout candidate={selected} />
                  {publicGame.isLoading && <Spinner label={tt('Loading reference statistics…')} />}
                  {publicGame.data && !publicGame.data.ok && (
                    <p className="text-xs text-loss">{publicGame.data.error.message}</p>
                  )}
                  {!publicGame.isLoading &&
                  referenceDetail?.summary &&
                  currentPlayer &&
                  referencePlayer ? (
                    <>
                      <ComparisonTable metrics={metrics} />
                      <BuildOrderSnippet current={currentPlayer} reference={referencePlayer} />
                    </>
                  ) : (
                    !publicGame.isLoading && (
                      <p className="text-xs text-muted-foreground">
                        {tt(
                          'The public match was found, but its detailed statistics are not available yet.',
                        )}
                      </p>
                    )
                  )}
                  {lessons.length > 0 && (
                    <div className="space-y-2 border-t border-border/60 pt-3">
                      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {tt('What to copy from the reference')}
                      </div>
                      {lessons.map((lesson) => (
                        <div key={lesson} className="text-xs text-muted-foreground">
                          <span className="mr-1 text-primary">→</span>
                          {tt(lesson)}
                        </div>
                      ))}
                    </div>
                  )}
                  <a
                    href={
                      verifiedVod
                        ? `#/tincture?tab=cellar&video=${encodeURIComponent(verifiedVod.url)}&gameId=${selected.gameId}&civilization=${encodeURIComponent(selected.referenceCiv)}`
                        : twitchVideoFinderUrl(vodInput)
                    }
                    target={verifiedVod ? undefined : '_blank'}
                    rel={verifiedVod ? undefined : 'noreferrer'}
                    className="inline-flex items-center gap-1.5 text-xs text-violet-200 hover:underline"
                  >
                    <Search className="h-3.5 w-3.5" />
                    {verifiedVod ? tt('Analyze exact VOD') : tt('Find exact Twitch VOD')}
                  </a>
                  {verifiedVod && (
                    <a
                      href={verifiedVod.url}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-3 inline-flex items-center gap-1.5 text-xs text-violet-200 hover:underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> {tt('Watch VOD')}
                    </a>
                  )}
                  <Link
                    to={`/public-game/${selected.referenceProfileId}/${selected.gameId}`}
                    className="ml-3 inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> {tt('Open full public analysis')}
                  </Link>
                  <a
                    href={youtubeSearchUrl(selected)}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <Search className="h-3.5 w-3.5" /> {tt('Search YouTube context')}
                  </a>
                  {linkedVideoAnalysis && <VideoAnalysisPanel record={linkedVideoAnalysis} />}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  )
}

function ReferenceGameButton({
  candidate,
  selected,
  onClick,
}: {
  candidate: SimilarMatchCandidate
  selected: boolean
  onClick: () => void
}) {
  const { tt } = useI18n()
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full rounded-md border p-3 text-left transition-colors',
        selected ? 'border-primary/60 bg-primary/10' : 'border-border/70 hover:bg-secondary/60',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <Trophy
              className={cn(
                'h-3.5 w-3.5',
                candidate.targetTeamWon ? 'text-win' : 'text-muted-foreground',
              )}
            />
            <span className="truncate text-sm font-medium">
              {candidate.referenceCiv
                ? civDisplayName(candidate.referenceCiv)
                : tt('Reference player')}
            </span>
            <Badge variant="outline" className="text-[10px]">
              {tt(candidate.quality)}
            </Badge>
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            {new Date(candidate.startedAt).toLocaleDateString()} ·{' '}
            {formatDurationShort(candidate.durationSec)}
          </div>
        </div>
        <span className="shrink-0 text-xs tabular-nums text-primary">
          {candidate.averageRating != null
            ? `${candidate.averageRating} ${tt('average rating')}`
            : tt('rating unavailable')}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Map className="h-3 w-3" />
          {candidate.map}
        </span>
        <span className="inline-flex items-center gap-1">
          <Users className="h-3 w-3" />
          {candidate.kind}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock3 className="h-3 w-3" />
          {candidate.patch ?? tt('patch unknown')}
        </span>
        <span className="tabular-nums">
          {candidate.score.toFixed(0)} {tt('match score')}
        </span>
      </div>
    </button>
  )
}

function ReferenceHeader({ candidate }: { candidate: SimilarMatchCandidate }) {
  const { tt } = useI18n()
  return (
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div>
        <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
          <Trophy
            className={
              candidate.targetTeamWon ? 'h-4 w-4 text-win' : 'h-4 w-4 text-muted-foreground'
            }
          />
          {tt('Reference game')} · {civDisplayName(candidate.referenceCiv)}
          {candidate.targetTeamWon && (
            <Badge className="border-win/30 bg-win/10 text-win">{tt('win')}</Badge>
          )}
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          {candidate.map} · {candidate.kind} · {new Date(candidate.startedAt).toLocaleString()}
        </div>
      </div>
      <div className="text-right text-xs text-muted-foreground">
        <div>
          {candidate.referenceRating != null
            ? `${candidate.referenceRating} ${tt('rating')}`
            : tt('rating unavailable')}
        </div>
        {candidate.averageRating != null && (
          <div className="mt-0.5">
            {candidate.averageRating} {tt('average rating')}
          </div>
        )}
      </div>
    </div>
  )
}

function TeamLayout({ candidate }: { candidate: SimilarMatchCandidate }) {
  const { tt } = useI18n()
  return (
    <div className="space-y-1 rounded border border-border/60 bg-background/30 p-2 text-xs">
      <div className="text-[11px] text-muted-foreground">
        {tt(
          'Team sides and civilization order are compared. Exact spawn coordinates are not published by AoE4World.',
        )}
      </div>
      <div className="grid gap-1 sm:grid-cols-2">
        {candidate.teams.map((team) => (
          <div
            key={team.index}
            className={cn(
              'rounded px-2 py-1.5',
              team.index === candidate.targetTeamIndex ? 'bg-primary/10' : 'bg-secondary/50',
            )}
          >
            <div className="mb-1 font-medium">
              {team.index === candidate.targetTeamIndex
                ? tt('Target civilization side')
                : tt('Opposing side')}{' '}
              ·{' '}
              {team.result === 'win'
                ? tt('win')
                : team.result === 'loss'
                  ? tt('loss')
                  : tt('unknown')}
            </div>
            <div className="text-muted-foreground">
              {team.players.map((player) => civDisplayName(player.civilization)).join(' + ')}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ComparisonTable({ metrics }: { metrics: Metric[] }) {
  const { tt } = useI18n()
  return (
    <div className="overflow-x-auto rounded border border-border/60">
      <table className="w-full min-w-[520px] text-xs">
        <thead className="bg-secondary/50 text-left text-muted-foreground">
          <tr>
            <th className="px-2 py-1.5 font-medium">{tt('Checkpoint')}</th>
            <th className="px-2 py-1.5 font-medium">{tt('Your game')}</th>
            <th className="px-2 py-1.5 font-medium">{tt('Reference')}</th>
            <th className="px-2 py-1.5 font-medium">{tt('Difference')}</th>
          </tr>
        </thead>
        <tbody>
          {metrics.map((metric) => {
            const delta =
              metric.current != null && metric.reference != null
                ? metric.reference - metric.current
                : null
            const better =
              delta == null || delta === 0 ? null : metric.lowerIsBetter ? delta < 0 : delta > 0
            return (
              <tr key={metric.label} className="border-t border-border/50">
                <td className="px-2 py-1.5 font-medium">{tt(metric.label)}</td>
                <td className="px-2 py-1.5 tabular-nums">
                  {formatMetric(metric.current, metric.kind)}
                </td>
                <td className="px-2 py-1.5 tabular-nums">
                  {formatMetric(metric.reference, metric.kind)}
                </td>
                <td
                  className={cn(
                    'px-2 py-1.5 tabular-nums',
                    better === true
                      ? 'text-win'
                      : better === false
                        ? 'text-loss'
                        : 'text-muted-foreground',
                  )}
                >
                  {formatDelta(delta, metric.kind)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function BuildOrderSnippet({
  current,
  reference,
}: {
  current: PlayerSummary
  reference: PlayerSummary
}) {
  const { tt } = useI18n()
  return (
    <div className="grid gap-3 border-t border-border/60 pt-3 md:grid-cols-2">
      <OpeningColumn label={tt('Your opening')} player={current} />
      <OpeningColumn label={tt('Reference opening')} player={reference} />
    </div>
  )
}

function OpeningColumn({ label, player }: { label: string; player: PlayerSummary }) {
  return (
    <div className="space-y-1.5 rounded border border-border/60 bg-background/30 p-2">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <ol className="space-y-1 text-[11px]">
        {player.buildOrder.slice(0, 10).map((event, index) => (
          <li key={`${event.timeSec}-${event.blueprint}-${index}`} className="flex gap-2">
            <span className="w-10 shrink-0 tabular-nums text-muted-foreground">
              {formatDurationShort(event.timeSec)}
            </span>
            <span className="truncate">{event.name}</span>
          </li>
        ))}
        {player.buildOrder.length === 0 && <li className="text-muted-foreground">—</li>}
      </ol>
    </div>
  )
}

function selectSummaryPlayer(
  summary: MatchSummary | null,
  profileId: number | null,
  civ: string,
): PlayerSummary | null {
  if (!summary) return null
  return (
    summary.players.find((player) => profileId != null && player.profileId === profileId) ??
    summary.players.find((player) => normalizeCiv(player.civToken) === normalizeCiv(civ)) ??
    null
  )
}

function selectPerPlayer(
  rows: PerPlayerMatchStats[],
  profileId: number | null,
  civ: string,
): PerPlayerMatchStats | null {
  return (
    rows.find((row) => profileId != null && row.profileId === profileId) ??
    rows.find((row) => normalizeCiv(row.civ) === normalizeCiv(civ)) ??
    null
  )
}

function normalizeCiv(value: string | null | undefined): string {
  return (value ?? '').toLocaleLowerCase().replace(/[^a-z0-9]/g, '')
}

function buildMetrics(
  current: PlayerSummary | null,
  currentPer: PerPlayerMatchStats | null,
  reference: PlayerSummary | null,
  referencePer: PerPlayerMatchStats | null,
  currentDuration: number | null,
  referenceDuration: number | null,
): Metric[] {
  return [
    {
      label: 'Game length',
      current: currentDuration,
      reference: referenceDuration,
      kind: 'seconds',
      lowerIsBetter: false,
    },
    {
      label: 'Feudal timing',
      current: current?.totals?.age2Sec ?? null,
      reference: reference?.totals?.age2Sec ?? null,
      kind: 'seconds',
      lowerIsBetter: true,
    },
    {
      label: 'Castle timing',
      current: current?.totals?.age3Sec ?? null,
      reference: reference?.totals?.age3Sec ?? null,
      kind: 'seconds',
      lowerIsBetter: true,
    },
    {
      label: 'Villager high',
      current: current?.totals?.villagerHigh ?? null,
      reference: reference?.totals?.villagerHigh ?? null,
    },
    {
      label: 'Resources gathered',
      current: resourceTotal(current),
      reference: resourceTotal(reference),
    },
    {
      label: 'Military units produced',
      current: current?.totals?.unitsProduced ?? currentPer?.unitsProduced ?? null,
      reference: reference?.totals?.unitsProduced ?? referencePer?.unitsProduced ?? null,
    },
    {
      label: 'Largest army',
      current: current?.totals?.largestArmy ?? null,
      reference: reference?.totals?.largestArmy ?? null,
    },
    {
      label: 'Units killed',
      current: current?.totals?.unitsKilled ?? currentPer?.kills ?? null,
      reference: reference?.totals?.unitsKilled ?? referencePer?.kills ?? null,
    },
    {
      label: 'Units lost',
      current: current?.totals?.unitsLost ?? currentPer?.deaths ?? null,
      reference: reference?.totals?.unitsLost ?? referencePer?.deaths ?? null,
      lowerIsBetter: true,
    },
    {
      label: 'Technologies researched',
      current: current?.totals?.techResearched ?? currentPer?.techsResearched ?? null,
      reference: reference?.totals?.techResearched ?? referencePer?.techsResearched ?? null,
    },
    { label: 'APM', current: currentPer?.apm ?? null, reference: referencePer?.apm ?? null },
  ]
}

function resourceTotal(player: PlayerSummary | null): number | null {
  const resources = player?.totals?.resourcesGathered
  return resources
    ? Math.round(resources.food + resources.wood + resources.gold + resources.stone)
    : null
}

function buildLessons(metrics: Metric[], candidate: SimilarMatchCandidate | null): string[] {
  if (!candidate) return []
  const lessons: string[] = []
  const metric = (label: string) => metrics.find((item) => item.label === label)
  const feudal = metric('Feudal timing')
  if (feudal?.current != null && feudal.reference != null && feudal.reference < feudal.current - 5)
    lessons.push(
      'The reference reached Feudal earlier — protect the opening resource plan and avoid idle Town Center time.',
    )
  const villagers = metric('Villager high')
  if (
    villagers?.current != null &&
    villagers.reference != null &&
    villagers.reference > villagers.current + 2
  )
    lessons.push(
      'The reference kept more villagers alive — copy the safer worker production and defensive reactions.',
    )
  const army = metric('Largest army')
  if (army?.current != null && army.reference != null && army.reference > army.current + 3)
    lessons.push(
      'The reference reached a larger army — spend resources sooner and keep production buildings active.',
    )
  const losses = metric('Units lost')
  if (losses?.current != null && losses.reference != null && losses.reference < losses.current - 3)
    lessons.push(
      'The reference lost fewer units — avoid exposed fights and trade only with vision or a timing advantage.',
    )
  if (lessons.length === 0 && candidate.targetTeamWon)
    lessons.push(
      'Use the reference replay as a timing template: compare the first age-up, first army, and first decisive fight.',
    )
  return lessons.slice(0, 4)
}

function youtubeSearchUrl(candidate: SimilarMatchCandidate): string {
  const civs = candidate.teams.flatMap((team) => team.players.map((player) => player.civilization))
  const query = [candidate.map, ...civs, 'Age of Empires IV build order'].join(' ')
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`
}

function formatMetric(value: number | null, kind: Metric['kind']): string {
  if (value == null || !Number.isFinite(value)) return '—'
  if (kind === 'seconds') return formatDurationShort(value)
  return Math.round(value).toLocaleString()
}

function formatDelta(value: number | null, kind: Metric['kind']): string {
  if (value == null || !Number.isFinite(value)) return '—'
  const sign = value > 0 ? '+' : value < 0 ? '−' : ''
  return kind === 'seconds'
    ? `${sign}${formatDurationShort(Math.abs(value))}`
    : `${sign}${Math.round(Math.abs(value)).toLocaleString()}`
}
