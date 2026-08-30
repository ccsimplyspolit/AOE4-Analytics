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
    <div className="grid items-start gap-6 xl:grid-cols-2">
      <section className="overflow-hidden rounded-lg border border-border bg-card/50">
        <SectionHeader
          icon={<History className="h-4 w-4" />}
          title={tt('Recent public matches')}
          detail={mergedRecent.ok ? sampleLabel(mergedRecent.data, tt) : undefined}
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
          detail={headToHead?.ok ? sampleLabel(headToHead.data, tt) : undefined}
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
  const { tt } = useI18n()
  if (!hasNextPage && !isFetchingNextPage) return null
  return (
    <button
      type="button"
      className="mt-3 w-full rounded-md border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground disabled:cursor-wait disabled:opacity-60"
      disabled={isFetchingNextPage}
      onClick={onLoadMore}
    >
      {isFetchingNextPage ? tt('Loading more matches…') : tt('Load more public matches')}
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
    <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <span className="text-primary">{icon}</span>
        {title}
      </h2>
      {detail && <span className="text-xs text-muted-foreground">{detail}</span>}
    </header>
  )
}

function HeadToHeadSummary({ data }: { data: HeadToHeadData }) {
  const { tt } = useI18n()
  const unknown = data.sampleSize - data.decidedGames
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md bg-secondary/50 px-3 py-2 text-xs">
      <span className="font-semibold">
        <span className="text-win">{data.wins}W</span>
        {' – '}
        <span className="text-loss">{data.losses}L</span>
      </span>
      <span className="text-muted-foreground">
        {formatPercent(data.winRate)}{' '}
        {tt('across {count} decided in this sample').replace('{count}', String(data.decidedGames))}
      </span>
      {unknown > 0 && (
        <span className="text-muted-foreground">
          · {unknown} {tt('undecided')}
        </span>
      )}
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
  const { tt, gameName } = useI18n()
  const opponentCivs = match.opponentCivilizations
    .map((civ) => gameName(civDisplayName(civ)))
    .join(' + ')
  const matchup = `${displayCiv(match.civilization, tt, gameName)} ${tt('vs')} ${opponentCivs || tt('Unknown')}`
  const when = relativeTime(match.startedAt) || tt('Date unavailable')

  return (
    <Link
      to={`/public-game/${profileId}/${match.gameId}`}
      className="block border-b border-border px-3 py-2.5 text-xs transition-colors hover:bg-secondary/40 last:border-b-0"
      title={
        match.opponentNames.length > 0
          ? `${tt('Opponents')}: ${match.opponentNames.join(', ')}`
          : undefined
      }
      aria-label={tt('Open full analysis for match {id}').replace('{id}', String(match.gameId))}
    >
      <div className="flex min-w-0 items-start gap-2">
        <ResultBadge result={match.result} />
        <span className="min-w-0 flex-1 break-words font-medium leading-snug text-foreground">
          {matchup}
        </span>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        <span className="break-words">{match.map ? gameName(match.map) : tt('Map unavailable')}</span>
        <span>
          {match.kind
            ? tt(formatLeaderboard(match.kind))
            : match.format
              ? tt(formatLeaderboard(match.format))
              : tt('Format unavailable')}
        </span>
        <span>{formatDurationShort(match.durationSec)}</span>
        {match.rating != null && <span className="tabular-nums">{match.rating}</span>}
        {match.ratingDiff != null && (
          <span className={match.ratingDiff >= 0 ? 'text-win' : 'text-loss'}>
            {match.ratingDiff >= 0 ? '+' : ''}
            {match.ratingDiff}
          </span>
        )}
        {match.ratingDiff == null && match.mmrDiff != null && (
          <span className={match.mmrDiff >= 0 ? 'text-win' : 'text-loss'}>
            MMR {match.mmrDiff >= 0 ? '+' : ''}
            {match.mmrDiff}
          </span>
        )}
        {match.opponentNames.length > 0 && (
          <span>
            {tt('vs')} {match.opponentNames.join(', ')}
          </span>
        )}
        {match.teammateNames && match.teammateNames.length > 0 && (
          <span>
            {tt('played with')} {match.teammateNames.join(', ')}
          </span>
        )}
        {match.averageRating != null && (
          <span>
            {tt('Lobby')} {match.averageRating}
          </span>
        )}
        {match.patch != null && (
          <span>
            {tt('Patch')} {match.patch}
          </span>
        )}
        {match.inputType === 'controller' && <span>{tt('Controller')}</span>}
        {match.server && <span>{match.server}</span>}
        <time dateTime={match.startedAt} title={absoluteDate(match.startedAt)}>
          {when}
        </time>
      </div>
    </Link>
  )
}

function ResultBadge({ result }: { result: ScoutMatchRow['result'] }) {
  const { tt } = useI18n()
  const style =
    result === 'win'
      ? 'bg-win/15 text-win'
      : result === 'loss'
        ? 'bg-loss/15 text-loss'
        : 'bg-secondary text-muted-foreground'
  return (
    <span
      className={`shrink-0 rounded px-1.5 py-0.5 text-center font-semibold uppercase whitespace-nowrap ${style}`}
    >
      {result === 'unknown' ? '—' : tt(result === 'win' ? 'Win' : 'Loss')}
    </span>
  )
}

function displayCiv(
  civilization: string | null,
  tt: (value: string) => string,
  gameName: (value: string) => string,
): string {
  return civilization ? gameName(civDisplayName(civilization)) : tt('Unknown')
}

function sampleLabel(page: ScoutMatchPage, tt: (value: string) => string): string {
  if (page.totalCount > page.sampleSize) {
    return tt('Showing {shown} of {total}')
      .replace('{shown}', String(page.sampleSize))
      .replace('{total}', String(page.totalCount))
  }
  return `${page.sampleSize} ${tt(page.sampleSize === 1 ? 'match' : 'matches')}`
}

function absoluteDate(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleString()
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
