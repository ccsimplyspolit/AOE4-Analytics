import { History, Swords } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { civDisplayName } from '@domain/civ'
import type {
  HeadToHeadData,
  IpcResult,
  ScoutHistoryData,
  ScoutMatchPage,
  ScoutMatchRow,
} from '@ipc/contract'
import { formatDurationShort, formatLeaderboard, formatPercent, relativeTime } from '@shared/format'
import { EmptyBox, ErrorBox, Spinner } from './feedback'
import { useI18n } from '../../i18n'

interface ScoutHistoryPanelProps {
  pages: IpcResult<ScoutHistoryData>[] | undefined
  isLoading: boolean
  error: unknown
  viewedName: string
  onRetry: () => void
  hasNextPage: boolean
  isFetchingNextPage: boolean
  onLoadMore: () => void
}

export function ScoutHistoryPanel({
  pages,
  isLoading,
  error,
  viewedName,
  onRetry,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}: ScoutHistoryPanelProps) {
  const { tt } = useI18n()
  if (isLoading) return <Spinner label={tt('Loading public match history…')} />

  if (error) {
    return <ErrorBox message={errorMessage(error)} onRetry={onRetry} />
  }
  const result = pages?.[0]
  if (!result) return null
  if (!result.ok) return <ErrorBox message={result.error.message} onRetry={onRetry} />

  const { headToHead, activeProfile, viewedProfileId } = result.data
  const mergedRecent = mergeRecentPages(pages)
  const viewingSelf = activeProfile?.profileId === viewedProfileId

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <section className="overflow-hidden rounded-lg border border-border bg-card/50">
        <SectionHeader
          icon={<History className="h-4 w-4" />}
          title={tt('Recent public matches')}
          detail={mergedRecent.ok ? sampleLabel(mergedRecent.data) : undefined}
        />
        <div className="p-4">
          {!mergedRecent.ok ? (
            <ErrorBox message={mergedRecent.error.message} onRetry={onRetry} />
          ) : mergedRecent.data.matches.length === 0 ? (
            <EmptyBox>
              <p>
                {tt('No public matches were returned for {name}.').replace('{name}', viewedName)}
              </p>
              <p className="text-xs">{tt('Their history may be private or not yet indexed.')}</p>
            </EmptyBox>
          ) : (
            <>
              <MatchList page={mergedRecent.data} profileId={viewedProfileId} />
              <LoadMoreMatches
                hasNextPage={hasNextPage}
                isFetchingNextPage={isFetchingNextPage}
                onLoadMore={onLoadMore}
              />
            </>
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-border bg-card/50">
        <SectionHeader
          icon={<Swords className="h-4 w-4" />}
          title={tt('Personal head-to-head')}
          detail={headToHead?.ok ? sampleLabel(headToHead.data) : undefined}
        />
        <div className="p-4">
          {activeProfile == null ? (
            <EmptyBox>
              <p>
                {tt('Link an account to see your matches against {name}.').replace(
                  '{name}',
                  viewedName,
                )}
              </p>
            </EmptyBox>
          ) : viewingSelf ? (
            <EmptyBox>
              <p>{tt('Head-to-head appears when you scout a different player.')}</p>
            </EmptyBox>
          ) : headToHead == null ? (
            <EmptyBox>
              <p>{tt('Head-to-head is unavailable for this profile.')}</p>
            </EmptyBox>
          ) : !headToHead.ok ? (
            <ErrorBox message={headToHead.error.message} onRetry={onRetry} />
          ) : headToHead.data.matches.length === 0 ? (
            <EmptyBox>
              <p>
                {tt('No public matches found between you and {name}.').replace(
                  '{name}',
                  viewedName,
                )}
              </p>
            </EmptyBox>
          ) : (
            <>
              <HeadToHeadSummary data={headToHead.data} />
              <MatchList page={headToHead.data} profileId={activeProfile.profileId} />
            </>
          )}
        </div>
      </section>
    </div>
  )
}

function mergeRecentPages(pages: IpcResult<ScoutHistoryData>[]): IpcResult<ScoutMatchPage> {
  const first = pages[0]
  if (!first) return { ok: false, error: { kind: 'unknown', message: 'History unavailable.' } }
  if (!first.ok) return first
  if (!first.data.recent.ok) return first.data.recent

  const byGameId = new Map<number, ScoutMatchRow>()
  let totalCount = first.data.recent.data.totalCount
  for (const page of pages) {
    if (!page.ok || !page.data.recent.ok) continue
    totalCount = Math.max(totalCount, page.data.recent.data.totalCount)
    for (const match of page.data.recent.data.matches) byGameId.set(match.gameId, match)
  }
  const matches = [...byGameId.values()]
  return {
    ok: true,
    data: { matches, sampleSize: matches.length, totalCount },
  }
}

function LoadMoreMatches({
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}: {
  hasNextPage: boolean
  isFetchingNextPage: boolean
  onLoadMore: () => void
}) {
  if (!hasNextPage && !isFetchingNextPage) return null
  return (
    <button
      type="button"
      className="mt-3 w-full rounded-md border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground disabled:cursor-wait disabled:opacity-60"
      disabled={isFetchingNextPage}
      onClick={onLoadMore}
    >
      {isFetchingNextPage ? 'Loading more matches…' : 'Load more public matches'}
    </button>
  )
}

function SectionHeader({
  icon,
  title,
  detail,
}: {
  icon: ReactNode
  title: string
  detail?: string
}) {
  return (
    <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <span className="text-primary">{icon}</span>
        {title}
      </h2>
      {detail && <span className="text-xs text-muted-foreground">{detail}</span>}
    </header>
  )
}

function HeadToHeadSummary({ data }: { data: HeadToHeadData }) {
  const unknown = data.sampleSize - data.decidedGames
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md bg-secondary/50 px-3 py-2 text-xs">
      <span className="font-semibold">
        <span className="text-win">{data.wins}W</span>
        {' – '}
        <span className="text-loss">{data.losses}L</span>
      </span>
      <span className="text-muted-foreground">
        {formatPercent(data.winRate)} across {data.decidedGames} decided in this sample
      </span>
      {unknown > 0 && <span className="text-muted-foreground">· {unknown} undecided</span>}
    </div>
  )
}

function MatchList({ page, profileId }: { page: ScoutMatchPage; profileId: number }) {
  return (
    <div className="overflow-hidden rounded-md border border-border">
      {page.matches.map((match) => (
        <MatchRow key={match.gameId} match={match} profileId={profileId} />
      ))}
    </div>
  )
}

function MatchRow({ match, profileId }: { match: ScoutMatchRow; profileId: number }) {
  const opponentCivs = match.opponentCivilizations.map(civDisplayName).join(' + ')
  const matchup = `${displayCiv(match.civilization)} vs ${opponentCivs || 'Unknown'}`
  const when = relativeTime(match.startedAt) || 'Date unavailable'

  return (
    <Link
      to={`/public-game/${profileId}/${match.gameId}`}
      className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-border px-3 py-2.5 text-xs transition-colors hover:bg-secondary/40 last:border-b-0"
      title={
        match.opponentNames.length > 0 ? `Opponents: ${match.opponentNames.join(', ')}` : undefined
      }
      aria-label={`Open full analysis for match ${match.gameId}`}
    >
      <ResultBadge result={match.result} />
      <span className="min-w-48 flex-1 font-medium text-foreground">{matchup}</span>
      <span className="min-w-28 text-muted-foreground">{match.map ?? 'Map unavailable'}</span>
      <span className="min-w-28 text-muted-foreground">
        {match.format ? formatLeaderboard(match.format) : 'Format unavailable'}
      </span>
      <span className="text-muted-foreground">{formatDurationShort(match.durationSec)}</span>
      <time
        className="min-w-16 text-right text-muted-foreground"
        dateTime={match.startedAt}
        title={absoluteDate(match.startedAt)}
      >
        {when}
      </time>
    </Link>
  )
}

function ResultBadge({ result }: { result: ScoutMatchRow['result'] }) {
  const style =
    result === 'win'
      ? 'bg-win/15 text-win'
      : result === 'loss'
        ? 'bg-loss/15 text-loss'
        : 'bg-secondary text-muted-foreground'
  return (
    <span className={`w-12 rounded px-1.5 py-0.5 text-center font-semibold uppercase ${style}`}>
      {result === 'unknown' ? '—' : result}
    </span>
  )
}

function displayCiv(civilization: string | null): string {
  return civilization ? civDisplayName(civilization) : 'Unknown'
}

function sampleLabel(page: ScoutMatchPage): string {
  if (page.totalCount > page.sampleSize) {
    return `Showing ${page.sampleSize} of ${page.totalCount}`
  }
  return `${page.sampleSize} ${page.sampleSize === 1 ? 'match' : 'matches'}`
}

function absoluteDate(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleString()
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
