import { useEffect, useMemo, useState, type ReactNode } from 'react'
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
import { formatDurationShort, formatLeaderboard, formatRating, relativeTime } from '@shared/format'
import { cn } from '@shared/lib/utils'
import { Card, CardContent } from '@shared/components/ui/card'
import { Badge } from '@shared/components/ui/badge'
import { ErrorBox, Spinner } from '../components/feedback'
import { PageHead } from '../components/PageHead'
import { GameSummaryPanel } from '../components/GameSummaryPanel'
import { VideoAnalysisPanel } from '../components/VideoAnalysisPanel'
import { TwitchVodCard } from '../components/TwitchVodCard'
import { BuildOrderComparisonCard } from '../components/BuildOrderComparisonCard'
import { CuratedMatchReviewCard } from '../components/CuratedMatchReviewCard'
import { ValdemarMatchCoachCard } from '../components/ValdemarMatchCoachCard'
import { MatchDiagnosticsPanel } from '../components/MatchDiagnosticsPanel'
import { MatchNarrativeCard } from '../components/MatchNarrativeCard'
import { buildCoachContextFromGame } from '@domain/coachContext'
import { buildSelfCoachReport } from '@domain/selfCoachReport'
import { buildOpponentCoachReport } from '@domain/opponentCoachReport'
import { buildTeamCoachReport } from '@domain/teamCoachReport'
import { CoachDossierPanel } from '../components/CoachDossierPanel'
import { ArrowLeft, BarChart3, Clock3, MapPinned, RefreshCw, Users } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { usePublicGame } from '../queries/usePublicGame'
import { useVideoAnalyses } from '../queries/useVideoAnalyses'
import { useTwitchVod } from '../queries/useTwitchVod'
import { useI18n } from '../../i18n'
import { cachePlayerArchiveOnce } from '../hooks/useAutoAction'

export function PublicGameDetail() {
  const { tt, gameName } = useI18n()
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
          onRefetch={() => void query.refetch()}
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
  onRefetch,
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
  onRefetch?: () => void
  curatedReview?: CuratedMatchReview
  videoAnalysis?: VideoAnalysisRecord
}) {
  const { tt, gameName } = useI18n()
  const teams = normalizeTeams(detail.game)
  const players = teams.flat()
  const viewedPlayer = players.find((player) => player.profile_id === detail.profileId)
  const viewedCiv = viewedPlayer?.civilization ?? null
  const twitchVodInput: TwitchVodFinderInput = {
    gameId: String(detail.game.game_id),
    profileId: detail.profileId,
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

  const matchCoachContext = useMemo(() => {
    if (!viewedPlayer) return null
    return buildCoachContextFromGame(detail.game, detail.profileId, {
      name: viewedPlayer.name,
      country: null,
    })
  }, [detail.game, detail.profileId, viewedPlayer])

  const coachPack = useMemo(() => {
    if (!viewedPlayer) return null
    const myTeam = teams.find((team) => team.some((p) => p.profile_id === detail.profileId)) ?? []
    const enemyTeam = teams.find((team) => team.every((p) => p.profile_id !== detail.profileId)) ?? []
    const scoutRow = {
      gameId: detail.game.game_id,
      startedAt: detail.game.started_at,
      durationSec: detail.game.duration,
      map: detail.game.map,
      format: detail.game.kind ?? detail.game.leaderboard ?? null,
      result: (viewedPlayer.result === 'win' || viewedPlayer.result === 'loss'
        ? viewedPlayer.result
        : 'unknown') as 'win' | 'loss' | 'unknown',
      civilization: viewedPlayer.civilization,
      opponentCivilizations: enemyTeam.map((p) => p.civilization),
      opponentNames: enemyTeam.map((p) => p.name),
    }
    const self = buildSelfCoachReport({
      profileId: detail.profileId,
      playerName: viewedPlayer.name,
      voice: 'third',
      scoutGames: [scoutRow],
      summariesByMatchId: detail.summary ? { [String(detail.game.game_id)]: detail.summary } : undefined,
      currentCiv: viewedPlayer.civilization,
      inMatch: true,
    })
    const opponents = enemyTeam.map((p) =>
      buildOpponentCoachReport({
        profileId: p.profile_id,
        playerName: p.name,
        knownCiv: p.civilization,
      }),
    )
    const team = buildTeamCoachReport({
      subjectProfileId: detail.profileId,
      subjectName: viewedPlayer.name,
      scoutGames: [scoutRow],
      liveRoster:
        myTeam.length >= 2 && enemyTeam.length >= 2
          ? [
              myTeam.map((p) => ({
                profileId: p.profile_id,
                name: p.name,
                civ: p.civilization,
                isMe: p.profile_id === detail.profileId,
              })),
              enemyTeam.map((p) => ({
                profileId: p.profile_id,
                name: p.name,
                civ: p.civilization,
              })),
            ]
          : undefined,
    })
    return { self, opponents, team }
  }, [detail, teams, viewedPlayer])

  const [downloadingReplay, setDownloadingReplay] = useState(false)
  const [downloadStatus, setDownloadStatus] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setDownloadingReplay(true)
    setDownloadStatus(null)
    void cachePlayerArchiveOnce(detail.profileId)
      .then((res) => {
        if (cancelled) return
        if (!res) {
          setDownloadingReplay(false)
          return
        }
        if (res.ok) {
          setDownloadStatus(
            tt('Loaded {replays} replays · {summaries} summaries · {analyzed} analyzed')
              .replace('{replays}', String(res.data.cachedReplays))
              .replace('{summaries}', String(res.data.cachedSummaries))
              .replace('{analyzed}', String(res.data.analyzedReplays)),
          )
          onRefetch?.()
        } else {
          setDownloadStatus(res.error.message)
        }
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setDownloadStatus(e instanceof Error ? e.message : tt('Could not load the player archive.'))
      })
      .finally(() => {
        if (!cancelled) setDownloadingReplay(false)
      })
    return () => {
      cancelled = true
    }
  }, [detail.profileId, onRefetch, tt])

  return (
    <div className="space-y-6">
      <PageHead
        kicker="Public archive"
        title={
          viewedPlayer
            ? `${viewedPlayer.name} · ${gameName(viewedPlayer.civilization)}`
            : tt('Public match analysis')
        }
        sub={`${tt(formatLeaderboard(detail.game.leaderboard || detail.game.kind))} · ${
          detail.game.map ? gameName(detail.game.map) : tt('Map unavailable')
        } · ${formatDurationShort(detail.game.duration)} · ${
          relativeTime(detail.game.started_at) || tt('Date unavailable')
        }`}
        raw
        aside={
          <div className="flex flex-wrap items-center gap-2">
            <ResultBadge result={result} />
            <Badge variant="outline">Game #{detail.game.game_id}</Badge>
          </div>
        }
      />

      <MatchFacts game={detail.game} viewedPlayer={viewedPlayer} />
      <TeamsCard teams={teams} gameId={detail.game.game_id} />
      <TwitchVodCard input={viewedCiv ? twitchVodInput : null} />
      {detail.summary ? (
        <MatchNarrativeCard
          summary={detail.summary}
          loading={false}
          myProfileId={detail.profileId}
          myCiv={viewedCiv}
          perPlayer={detail.perPlayer}
          coachContext={matchCoachContext}
        />
      ) : (
        matchCoachContext && <MatchDiagnosticsPanel context={matchCoachContext} />
      )}

      {detail.perPlayer.length > 0 ? (
        <ComparisonTable
          players={players}
          statsByProfile={statsByProfile}
          gameId={detail.game.game_id}
        />
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
        <Card className="border-emerald-500/20 bg-emerald-500/[0.03]">
          <CardContent className="space-y-3 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <BarChart3 className="h-4 w-4 text-primary" />
                {tt('Economy and build order')}
              </h2>
              {downloadingReplay ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  {tt('Downloading and analyzing replay…')}
                </span>
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground">
              {tt(
                'Public combat counters are available above. Build order, economy timeline, and TC idle metrics fill in automatically from the replay archive.',
              )}
            </p>
            {downloadStatus && (
              <div className="rounded-md border border-border bg-background/50 p-2 text-xs text-foreground">
                {downloadStatus}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {videoAnalysis && <VideoAnalysisPanel record={videoAnalysis} />}
      {curatedReview && <CuratedMatchReviewCard review={curatedReview} />}
      <ValdemarMatchCoachCard
        myCiv={viewedCiv}
        opponentCiv={
          players.find((player) => player.profile_id !== detail.profileId)?.civilization ?? null
        }
        showGenericTips={false}
      />
      {coachPack && (
        <CoachDossierPanel
          self={coachPack.self}
          opponents={coachPack.opponents}
          team={coachPack.team}
          compact
          foldable
          foldId="public-match-coach-dossier"
        />
      )}
    </div>
  )
}

function MatchFacts({ game, viewedPlayer }: { game: Game; viewedPlayer: GamePlayer | undefined }) {
  const { tt, gameName } = useI18n()
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Fact
        icon={<MapPinned className="h-4 w-4" />}
        label={tt('Map')}
        value={game.map ? gameName(game.map) : tt('Unavailable')}
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

function TeamsCard({ teams, gameId }: { teams: GamePlayer[][]; gameId: number }) {
  const { tt, gameName } = useI18n()
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
                    <div className="min-w-0 truncate">
                      {player.profile_id > 0 ? (
                        <Link
                          to={`/profile/${player.profile_id}`}
                          title={tt('Open this player’s stats')}
                          className="font-medium hover:text-primary"
                        >
                          {player.name}
                        </Link>
                      ) : (
                        <span className="font-medium">{player.name}</span>
                      )}
                      {player.profile_id > 0 && (
                        <Link
                          to={`/public-game/${player.profile_id}/${gameId}`}
                          title={tt('Open this player’s full match analysis')}
                          className="ml-2 text-[10px] text-muted-foreground hover:text-primary"
                        >
                          {tt('This match')}
                        </Link>
                      )}
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {gameName(player.civilization)}
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
  gameId,
}: {
  players: GamePlayer[]
  statsByProfile: Map<number, PerPlayerMatchStats>
  gameId: number
}) {
  const { tt, gameName } = useI18n()
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
                    <td className="max-w-48 truncate px-2 py-2 font-medium">
                      <Link
                        to={`/profile/${player.profile_id}`}
                        title={tt('Open this player’s stats')}
                        className="hover:text-primary hover:underline"
                      >
                        {player.name}
                      </Link>
                    </td>
                    <td className="px-2 py-2 text-muted-foreground">
                      {gameName(player.civilization)}
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
