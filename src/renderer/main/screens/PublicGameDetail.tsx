import { ArrowLeft, BarChart3, Clock3, MapPinned, Users } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import type { ReactNode } from 'react'
import type { Game, GamePlayer } from '@api/types'
import { normalizeTeams } from '@api/types'
import type { PerPlayerMatchStats } from '@domain/analysis'
import type { MatchSummary } from '@domain/statsSummary'
import type { VideoAnalysisRecord } from '@domain/videoAnalysis'
import type { TwitchVodFinderInput } from '@domain/twitchVodFinder'
import {
  CURATED_MATCH_REVIEWS_BY_GAME_ID,
  type CuratedMatchReview,
} from '@data/curatedMatchReviews'
import { civDisplayName } from '@domain/civ'
import { formatDurationShort, formatLeaderboard, formatRating, relativeTime } from '@shared/format'
import { cn } from '@shared/lib/utils'
import { Card, CardContent } from '@shared/components/ui/card'
import { Badge } from '@shared/components/ui/badge'
import { ErrorBox, Spinner } from '../components/feedback'
import { GameSummaryPanel } from '../components/GameSummaryPanel'
import { VideoAnalysisPanel } from '../components/VideoAnalysisPanel'
import { TwitchVodCard } from '../components/TwitchVodCard'
import { BuildOrderComparisonCard } from '../components/BuildOrderComparisonCard'
import { CuratedMatchReviewCard } from '../components/CuratedMatchReviewCard'
import { usePublicGame } from '../queries/usePublicGame'
import { useVideoAnalyses } from '../queries/useVideoAnalyses'
import { useTwitchVod } from '../queries/useTwitchVod'
import { useI18n } from '../../i18n'

export function PublicGameDetail() {
  const { tt } = useI18n()
  const { profileId: profileParam, gameId: gameParam } = useParams()
  const profileId = positiveInteger(profileParam)
  const gameId = positiveInteger(gameParam)
  const query = usePublicGame(profileId, gameId)
  const videoAnalyses = useVideoAnalyses()

  return (
    <div className="animate-fade-in space-y-6">
      <Link
        to={profileId != null ? `/profile/${profileId}` : '/explorer'}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> {tt('Back to player profile')}
      </Link>

      {profileId == null || gameId == null ? (
        <ErrorBox message={tt('This match link is invalid.')} />
      ) : query.isLoading ? (
        <Spinner label={tt('Loading public match analysis…')} />
      ) : query.error ? (
        <ErrorBox
          message={query.error instanceof Error ? query.error.message : String(query.error)}
        />
      ) : !query.data ? null : !query.data.ok ? (
        <ErrorBox message={query.data.error.message} onRetry={() => query.refetch()} />
      ) : (
        <PublicGameBody
          detail={query.data.data}
          curatedReview={CURATED_MATCH_REVIEWS_BY_GAME_ID.get(gameId)}
          videoAnalysis={
            videoAnalyses.data?.ok
              ? videoAnalyses.data.data.find((record) => record.gameId === String(gameId))
              : undefined
          }
        />
      )}
    </div>
  )
}

function PublicGameBody({
  detail,
  curatedReview,
  videoAnalysis,
}: {
  detail: {
    game: Game
    profileId: number
    perPlayer: PerPlayerMatchStats[]
    summary: MatchSummary | null
    summaryStatus: 'available' | 'unavailable'
  }
  curatedReview?: CuratedMatchReview
  videoAnalysis?: VideoAnalysisRecord
}) {
  const { tt } = useI18n()
  const teams = normalizeTeams(detail.game)
  const players = teams.flat()
  const viewedPlayer = players.find((player) => player.profile_id === detail.profileId)
  const viewedCiv = viewedPlayer?.civilization ?? null
  const twitchVodInput: TwitchVodFinderInput = {
    gameId: String(detail.game.game_id),
    civilization: viewedCiv ?? 'english',
    opponentCivilization:
      players.find((player) => player.profile_id !== detail.profileId)?.civilization ?? null,
    map: detail.game.map,
    durationSec: detail.game.duration,
  }
  const twitchVodLookup = useTwitchVod(twitchVodInput, viewedCiv != null)
  const verifiedVod = twitchVodLookup.data?.ok ? twitchVodLookup.data.data.vod : null
  const result = viewedPlayer?.result ?? null
  const statsByProfile = new Map(detail.perPlayer.map((stats) => [stats.profileId, stats]))

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <ResultBadge result={result} />
          <h1 className="text-2xl font-semibold tracking-tight">
            {viewedPlayer
              ? `${viewedPlayer.name} · ${civDisplayName(viewedPlayer.civilization)}`
              : tt('Public match analysis')}
          </h1>
          <Badge variant="outline">Game #{detail.game.game_id}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {tt(formatLeaderboard(detail.game.leaderboard || detail.game.kind))} ·{' '}
          {detail.game.map || tt('Map unavailable')} · {formatDurationShort(detail.game.duration)} ·{' '}
          {relativeTime(detail.game.started_at) || tt('Date unavailable')}
        </p>
      </header>

      <MatchFacts game={detail.game} viewedPlayer={viewedPlayer} />
      <TeamsCard teams={teams} />
      <TwitchVodCard input={viewedCiv ? twitchVodInput : null} />
      {curatedReview && <CuratedMatchReviewCard review={curatedReview} />}

      {detail.perPlayer.length > 0 ? (
        <ComparisonTable players={players} statsByProfile={statsByProfile} />
      ) : (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            {tt('No public combat counters were returned for this match.')}
          </CardContent>
        </Card>
      )}

      {detail.summary ? (
        <>
          <BuildOrderComparisonCard
            summary={detail.summary}
            myCiv={viewedCiv}
            myProfileId={detail.profileId}
            myName={viewedPlayer?.name ?? null}
            map={detail.game.map}
            format={detail.game.kind}
            patch={detail.game.patch == null ? null : String(detail.game.patch)}
            perPlayer={detail.perPlayer}
            linkedVideoAnalysis={videoAnalysis}
            verifiedVod={verifiedVod}
          />
          <GameSummaryPanel
            summary={detail.summary}
            myCiv={viewedCiv}
            perPlayer={detail.perPlayer}
            myProfileId={detail.profileId}
          />
        </>
      ) : (
        <Card>
          <CardContent className="space-y-2 p-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <BarChart3 className="h-4 w-4 text-primary" />
              {tt('Economy and build order')}
            </h2>
            <p className="text-sm text-muted-foreground">
              {tt(
                'Public combat counters are available above. Economy, score timeline and build order require a Relic stats summary upload and Steam access; no unavailable values are fabricated.',
              )}
            </p>
            {detail.summaryStatus === 'unavailable' && (
              <p className="text-xs text-muted-foreground">
                {tt(
                  'The summary may be absent for custom/AI games or outside Relic&apos;s recent window.',
                )}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {videoAnalysis && <VideoAnalysisPanel record={videoAnalysis} />}
    </div>
  )
}

function MatchFacts({ game, viewedPlayer }: { game: Game; viewedPlayer: GamePlayer | undefined }) {
  const { tt } = useI18n()
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Fact
        icon={<MapPinned className="h-4 w-4" />}
        label={tt('Map')}
        value={game.map || tt('Unavailable')}
      />
      <Fact
        icon={<Clock3 className="h-4 w-4" />}
        label={tt('Duration')}
        value={formatDurationShort(game.duration)}
      />
      <Fact
        icon={<Users className="h-4 w-4" />}
        label={tt('Players')}
        value={String((game.teams ?? []).flat().length)}
      />
      <Fact
        icon={<BarChart3 className="h-4 w-4" />}
        label={tt('Rating')}
        value={formatRating(viewedPlayer?.rating ?? viewedPlayer?.mmr)}
      />
    </div>
  )
}

function Fact({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <span className="text-primary">{icon}</span>
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="truncate text-sm font-semibold">{value}</div>
        </div>
      </CardContent>
    </Card>
  )
}

function TeamsCard({ teams }: { teams: GamePlayer[][] }) {
  const { tt } = useI18n()
  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <h2 className="text-sm font-semibold">{tt('Teams and players')}</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {teams.map((team, index) => (
            <div key={index} className="rounded-md border border-border bg-secondary/30 p-3">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {tt('Team')} {index + 1}
              </div>
              <div className="space-y-2">
                {team.map((player) => (
                  <div
                    key={player.profile_id}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <Link
                      to={`/profile/${player.profile_id}`}
                      className="min-w-0 truncate font-medium hover:text-primary"
                    >
                      {player.name}
                    </Link>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {civDisplayName(player.civilization)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function ComparisonTable({
  players,
  statsByProfile,
}: {
  players: GamePlayer[]
  statsByProfile: Map<number, PerPlayerMatchStats>
}) {
  const { tt } = useI18n()
  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">{tt('Public combat comparison')}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-2 py-2">{tt('Player')}</th>
                <th className="px-2 py-2">{tt('Civ')}</th>
                <th className="px-2 py-2">{tt('Result')}</th>
                <th className="px-2 py-2 text-right">{tt('Units')}</th>
                <th className="px-2 py-2 text-right">{tt('Kills')}</th>
                <th className="px-2 py-2 text-right">{tt('Deaths')}</th>
                <th className="px-2 py-2 text-right">K/D</th>
                <th className="px-2 py-2 text-right">{tt('Tech')}</th>
                <th className="px-2 py-2 text-right">APM</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player) => {
                const stats = statsByProfile.get(player.profile_id)
                return (
                  <tr key={player.profile_id} className="border-b border-border/70 last:border-0">
                    <td className="max-w-48 truncate px-2 py-2 font-medium">{player.name}</td>
                    <td className="px-2 py-2 text-muted-foreground">
                      {civDisplayName(player.civilization)}
                    </td>
                    <td className="px-2 py-2">
                      <ResultBadge result={player.result} compact />
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">
                      {display(stats?.unitsProduced)}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">{display(stats?.kills)}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{display(stats?.deaths)}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{display(stats?.kd)}</td>
                    <td className="px-2 py-2 text-right tabular-nums">
                      {display(stats?.techsResearched)}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">{display(stats?.apm)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

function ResultBadge({
  result,
  compact = false,
}: {
  result: GamePlayer['result']
  compact?: boolean
}) {
  const label = result === 'win' ? 'Victory' : result === 'loss' ? 'Defeat' : 'Unknown'
  return (
    <span
      className={cn(
        'inline-flex rounded px-2 py-1 text-center text-[10px] font-semibold uppercase tracking-wide',
        compact && 'px-1.5 py-0.5',
        result === 'win'
          ? 'bg-win/15 text-win'
          : result === 'loss'
            ? 'bg-loss/15 text-loss'
            : 'bg-secondary text-muted-foreground',
      )}
    >
      {compact ? (result === null ? '—' : result) : label}
    </span>
  )
}

function display(value: number | null | undefined): string {
  return value == null || !Number.isFinite(value) ? '—' : String(value)
}

function positiveInteger(value: string | undefined): number | null {
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null
}
