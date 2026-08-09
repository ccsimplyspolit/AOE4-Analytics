import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, ExternalLink, ScanLine, Trash2 } from 'lucide-react'
import type { StoredMatch } from '@store/historyStore'
import type { AppSettings } from '@store/settings'
import type { FullReplayAnalysis } from '@ipc/contract'
import type { VideoAnalysisRecord } from '@domain/videoAnalysis'
import type { TwitchVodFinderInput } from '@domain/twitchVodFinder'
import {
  CURATED_MATCH_REVIEWS_BY_GAME_ID,
  type CuratedMatchReview,
} from '@data/curatedMatchReviews'
import type { PerPlayerMatchStats, Severity, Signal } from '@domain/analysis'
import { resultFromPerPlayer, sanitizeStoredSignals, villagersPerMinute } from '@domain/analysis'
import { comparisonSignals } from '@domain/gameCoaching'
import { summarySignals } from '@domain/summaryCoaching'
import { civFromToken, type MatchSummary, type PlayerSummary } from '@domain/statsSummary'
import { buildIndexForCiv, condenseBuildOrder } from '@domain/buildOrderSchema'
import { parseDuration } from '@domain/format'
import { BUNDLED_BUILD_ORDERS } from '@data/buildOrders'
import { civDisplayName } from '@domain/civ'
import { CIV_FLAGS } from '@data/vendor/aoe4world-overlay/flags'
import { formatDurationShort, relativeTime } from '@shared/format'
import { cn } from '@shared/lib/utils'
import { Card, CardContent } from '@shared/components/ui/card'
import { Badge } from '@shared/components/ui/badge'
import { useDeleteMatch, useGameSummary, useHistory } from '../queries/useHistory'
import { useDownloadAndAnalyzeReplay, useReplayAnalysis } from '../queries/useReplays'
import { useSettings } from '../queries/useProfile'
import { GameSummaryPanel } from '../components/GameSummaryPanel'
import { BuildOrderComparisonCard } from '../components/BuildOrderComparisonCard'
import { BuildTrainerCard } from '../components/BuildTrainerCard'
import { ReplayAnalysisPanel } from './ReplayLab'
import { TurningPointStory } from '../components/TurningPointStory'
import { TwitchVodCard } from '../components/TwitchVodCard'
import { VideoAnalysisPanel } from '../components/VideoAnalysisPanel'
import { AutoGameplayCard } from '../components/AutoGameplayCard'
import { CuratedMatchReviewCard } from '../components/CuratedMatchReviewCard'
import { useVideoAnalyses } from '../queries/useVideoAnalyses'
import { useTwitchVod } from '../queries/useTwitchVod'
import { SimilarMatchCard } from '../components/SimilarMatchCard'
import { TeamMateReviewCard } from '../components/TeamMateReviewCard'
import { inferGameKind, type SimilarMatchQuery } from '@domain/similarMatch'
import { playerEvidenceCoverage } from '@domain/statsCoverage'
import { EmptyBox, ErrorBox, Spinner } from '../components/feedback'
import { useI18n } from '../../i18n'

const SEVERITY_STYLE: Record<Severity, string> = {
  major: 'bg-destructive/15 text-destructive',
  minor: 'bg-warn/15 text-warn',
  info: 'bg-secondary text-muted-foreground',
  good: 'bg-win/15 text-win',
}
const SEVERITY_ORDER: Record<Severity, number> = { major: 0, minor: 1, info: 2, good: 3 }

/**
 * The full post-game breakdown for one stored match (opened from a history card):
 * a per-player comparison of the real Relic counters (production, kills, deaths,
 * K/D, buildings, tech, APM — the numbers behind AoE4World's Comparison table) and
 * auto-generated coaching on what to improve. Economy (resources/villagers/score)
 * shows when the local stats are available; it's honestly labelled otherwise.
 */
export function GameDetail() {
  const { tt } = useI18n()
  const { matchId } = useParams()
  const { data, isLoading, refetch } = useHistory()
  const { data: settings } = useSettings()

  return (
    <div className="animate-fade-in space-y-6">
      <Link
        to="/stats"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> {tt('My Stats')}
      </Link>

      {isLoading && <Spinner label={tt('Loading game…')} />}
      {!isLoading && data && !data.ok && (
        <ErrorBox message={data.error.message} onRetry={() => refetch()} />
      )}
      {!isLoading && data?.ok && (
        <Resolve matchId={matchId} matches={data.data} settings={settings} />
      )}
    </div>
  )
}

function Resolve({
  matchId,
  matches,
  settings,
}: {
  matchId: string | undefined
  matches: StoredMatch[]
  settings: AppSettings | undefined
}) {
  const { tt } = useI18n()
  const match = matches.find((m) => m.id === matchId)
  const videoAnalyses = useVideoAnalyses()
  const linkedVideoAnalysis =
    match && videoAnalyses.data?.ok
      ? videoAnalyses.data.data.find((record) => record.gameId === match.id)
      : undefined
  const curatedReview = match ? CURATED_MATCH_REVIEWS_BY_GAME_ID.get(Number(match.id)) : undefined
  if (!match) {
    return (
      <EmptyBox>
        <div className="space-y-1">
          <p>{tt('This game isn’t in your synced history.')}</p>
          <p className="text-xs">{tt('Head to My Stats and click “Sync recent games”.')}</p>
        </div>
      </EmptyBox>
    )
  }
  return (
    <Detail
      match={match}
      myProfileId={settings?.profileId ?? null}
      myName={settings?.playerName ?? null}
      referenceBuildName={settings?.overlay.buildOrderId ?? null}
      curatedReview={curatedReview}
      linkedVideoAnalysis={linkedVideoAnalysis}
    />
  )
}

function Detail({
  match,
  myProfileId,
  myName,
  referenceBuildName,
  curatedReview,
  linkedVideoAnalysis,
}: {
  match: StoredMatch
  myProfileId: number | null
  myName: string | null
  referenceBuildName: string | null
  curatedReview?: CuratedMatchReview
  linkedVideoAnalysis?: VideoAnalysisRecord
}) {
  const { tt, gameName } = useI18n()
  const navigate = useNavigate()
  const deleteMatch = useDeleteMatch()
  // Summary player ids exist for local/AI rows even when Relic did not attach
  // an AoE4World profile id. Use that stable row id for focus so every decoded
  // participant remains selectable.
  const [focusedPlayerId, setFocusedPlayerId] = useState<number | null>(null)
  useEffect(() => {
    setFocusedPlayerId(null)
  }, [match.id])
  // Keep the exact-game lookup here as well as in TwitchVodCard. React Query
  // de-duplicates the request, while this screen can attach the verified VOD
  // to the build-order audit and preserve it as evidence for the inferred
  // reference build.
  const twitchVodInput: TwitchVodFinderInput = {
    gameId: match.id,
    profileId: myProfileId,
    civilization: match.civ,
    opponentCivilization: match.oppCiv,
    map: match.map,
    durationSec: match.durationSec,
  }
  const isPublicGame = !match.custom && /^\d{1,16}$/.test(match.id)
  const twitchVodLookup = useTwitchVod(twitchVodInput, isPublicGame)
  const verifiedVod = twitchVodLookup.data?.ok ? twitchVodLookup.data.data.vod : null
  const removeGame = () => {
    if (!window.confirm(tt('Remove this game from your history? This cannot be undone.'))) return
    deleteMatch.mutate(match.id, { onSuccess: () => navigate('/stats') })
  }
  const ownResult = match.result ?? resultFromPerPlayer(match.perPlayer, myProfileId)

  const nameByCiv = buildNameByCiv(match)
  const rows = orderRows(match.perPlayer ?? [], myProfileId)
  const { data: summaryRes, isLoading: summaryLoading } = useGameSummary(match.id)
  const summary = summaryRes?.ok ? summaryRes.data : null
  const openBuildAudit = () => {
    document.getElementById('build-order-audit')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }
  const ownSummaryPlayer =
    (myProfileId != null
      ? summary?.players.find((player) => player.profileId === myProfileId)
      : undefined) ??
    (summary?.players.filter((player) => civFromToken(player.civToken) === match.civ).length === 1
      ? summary.players.find((player) => civFromToken(player.civToken) === match.civ)
      : undefined)
  const subjectPlayerId = focusedPlayerId ?? ownSummaryPlayer?.playerId ?? null
  const subjectSummaryPlayer =
    focusedPlayerId != null
      ? (summary?.players.find((player) => player.playerId === focusedPlayerId) ?? null)
      : (ownSummaryPlayer ?? null)
  const subjectProfileId =
    subjectSummaryPlayer?.profileId ?? (focusedPlayerId == null ? myProfileId : null)
  const subjectStats =
    subjectProfileId != null
      ? (rows.find((player) => player.profileId === subjectProfileId) ?? null)
      : null
  // Team review follows the focused player, not the signed-in account. This
  // matters as soon as a user clicks an ally/opponent in the match roster:
  // the same Relic team id must drive both the eligibility gate and the card.
  const subjectCounter =
    subjectProfileId == null
      ? null
      : ((match.perPlayer ?? []).find((row) => row.profileId === subjectProfileId) ?? null)
  const teamReviewEligible =
    subjectCounter?.teamId != null &&
    (match.perPlayer ?? []).filter((row) => row.teamId === subjectCounter.teamId).length > 1
  // Per-player Relic data carries the exact variant (for example Order of the
  // Dragon), while the STPD summary can serialize that variant as generic HRE.
  // Prefer the exact row and the match civ before falling back to the summary
  // token so the selected player is never relabelled as the base civilization.
  const subjectCiv =
    subjectStats?.civ ??
    (focusedPlayerId == null ? match.civ : null) ??
    (subjectSummaryPlayer ? civFromToken(subjectSummaryPlayer.civToken) : null) ??
    match.civ
  const subjectName =
    subjectSummaryPlayer?.name ??
    (subjectProfileId === myProfileId ? myName : null) ??
    (subjectStats?.civ ? nameByCiv.get(subjectStats.civ) : null)
  const isOwnFocus =
    focusedPlayerId == null ||
    (ownSummaryPlayer?.playerId != null
      ? focusedPlayerId === ownSummaryPlayer.playerId
      : subjectProfileId === myProfileId)
  const displayedResult = isOwnFocus ? ownResult : (subjectStats?.result ?? null)
  const win = displayedResult === 'win'
  const loss = displayedResult === 'loss'
  const resultWord = win ? tt('Victory') : loss ? tt('Defeat') : tt('Result unknown')
  // Relic's "deaths" counter includes villagers; the stat file's lost list lets
  // us split them out so the number squares with the game's military tab.
  const villagersLostByProfile = new Map<number, number>(
    (summary?.players ?? [])
      .filter((p) => p.profileId != null && p.villagersLost != null)
      .map((p) => [p.profileId!, p.villagersLost!]),
  )

  // Feudal target from the civ's bundled build, for the age-up coaching read.
  const buildIdx = buildIndexForCiv(BUNDLED_BUILD_ORDERS, subjectCiv)
  const feudalTargetSec =
    buildIdx != null
      ? (condenseBuildOrder(BUNDLED_BUILD_ORDERS[buildIdx]!)
          .find((t) => t.ageUpTo === 2)
          ?.time?.trim() ?? null)
      : null

  const coaching = dedupeSignals([
    ...(summary
      ? summarySignals({
          summary,
          myProfileId: subjectProfileId,
          myCiv: subjectCiv,
          myPlayerId: subjectPlayerId,
          perPlayer: match.perPlayer ?? [],
          feudalTargetSec: feudalTargetSec ? parseDuration(feudalTargetSec) : null,
        })
      : []),
    ...comparisonSignals(match.perPlayer, subjectProfileId ?? -1),
    ...(isOwnFocus ? sanitizeStoredSignals(match.analysis.signals) : []),
  ]).sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
  const summaryText = isOwnFocus
    ? effectiveSummary(match.analysis.summary, ownResult)
    : tt(
        'This view is focused on the selected player. Only evidence decoded from this match is shown.',
      )

  const vpm = villagersPerMinute(match.local)

  return (
    <div className="space-y-6">
      <header id="match-overview" className="scroll-mt-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={cn(
              'inline-flex h-9 items-center rounded-md px-3 text-sm font-bold uppercase tracking-wide',
              win
                ? 'bg-win/20 text-win'
                : loss
                  ? 'bg-destructive/20 text-destructive'
                  : 'bg-secondary text-muted-foreground',
            )}
          >
            {resultWord}
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">{matchTitle(match, gameName)}</h1>
          {match.custom && (
            <Badge variant="secondary" className="text-[10px]">
              {match.vsAI ? tt('vs AI') : tt('Custom')}
            </Badge>
          )}
          {isOwnFocus && match.ratingDiff != null && (
            <span
              className={cn(
                'tabular-nums text-sm font-semibold',
                match.ratingDiff >= 0 ? 'text-win' : 'text-destructive',
              )}
            >
              {match.ratingDiff >= 0 ? '+' : ''}
              {match.ratingDiff}
            </span>
          )}
          {isOwnFocus && match.analysis.grade != null && (
            <span className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/5 px-2 py-1 text-xs font-semibold tabular-nums text-primary">
              {tt('Economy grade')} {match.analysis.grade}
            </span>
          )}
          <button
            type="button"
            onClick={removeGame}
            disabled={deleteMatch.isPending}
            title={tt(
              'Remove this game from your history — for desynced matches the game itself never recorded',
            )}
            className="ml-auto inline-flex items-center gap-1.5 rounded-sm border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-loss/50 hover:text-loss disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {tt('Remove')}
          </button>
        </div>
        <p className="text-sm text-muted-foreground">
          {match.format ? `${match.format} · ` : ''}
          {match.map} · {formatDurationShort(match.durationSec)} · {relativeTime(match.playedAt)}
        </p>
        <button
          type="button"
          onClick={openBuildAudit}
          className="inline-flex w-fit items-center rounded-sm border border-primary/30 bg-primary/5 px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
        >
          {tt('Open build audit')}
        </button>
      </header>

      <MatchSectionNav
        isPublicGame={isPublicGame}
        hasSummary={summary != null}
        hasVerifiedVod={verifiedVod != null}
        hasTeamReview={teamReviewEligible}
        onReplay={() =>
          document
            .getElementById('replay-command-analysis')
            ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      />

      {summary && summary.players.length > 1 && (
        <MatchPlayerFocus
          players={summary.players}
          civByProfile={new Map(rows.map((row) => [row.profileId, row.civ]))}
          perPlayer={match.perPlayer}
          ownProfileId={myProfileId}
          activePlayerId={subjectPlayerId}
          onSelect={(playerId) => {
            const ownId = ownSummaryPlayer?.playerId ?? null
            setFocusedPlayerId(playerId === ownId ? null : playerId)
          }}
        />
      )}

      {summary && summary.players.length > 1 && teamReviewEligible && (
        <TeamMateReviewCard
          summary={summary}
          perPlayer={match.perPlayer}
          myProfileId={myProfileId}
          focusProfileId={subjectProfileId}
          focusPlayerId={subjectPlayerId}
          focusCiv={subjectCiv}
          activePlayerId={subjectPlayerId}
          onSelectPlayer={(playerId) => {
            const ownId = ownSummaryPlayer?.playerId ?? null
            setFocusedPlayerId(playerId === ownId ? null : playerId)
          }}
        />
      )}

      {isOwnFocus && (
        <SimilarMatchCard
          match={match}
          summary={summary}
          myProfileId={myProfileId}
          query={similarMatchQuery(match, myProfileId)}
          enabled
        />
      )}

      {rows.length > 0 ? (
        <ComparisonTable
          rows={rows}
          myProfileId={myProfileId}
          activeProfileId={subjectProfileId}
          onSelectPlayer={(profileId) => {
            const selected = summary?.players.find((player) => player.profileId === profileId)
            const ownId = ownSummaryPlayer?.playerId ?? null
            setFocusedPlayerId(
              selected?.playerId != null && selected.playerId !== ownId ? selected.playerId : null,
            )
          }}
          nameByCiv={nameByCiv}
          myName={myName}
          villagersLostByProfile={villagersLostByProfile}
        />
      ) : (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            {tt('No per-player breakdown for this game yet. Click')}{' '}
            <span className="font-medium text-foreground">{tt('Sync recent games')}</span>{' '}
            {tt('on My Stats to pull the production, combat and tech numbers from Relic.')}
          </CardContent>
        </Card>
      )}

      <TurningPointStory
        summary={summary}
        loading={summaryLoading}
        myProfileId={subjectProfileId}
        myPlayerId={subjectPlayerId}
        myCiv={subjectCiv}
      />

      <TwitchVodCard match={match} profileId={myProfileId} />
      {curatedReview && <CuratedMatchReviewCard review={curatedReview} />}
      {linkedVideoAnalysis && <VideoAnalysisPanel record={linkedVideoAnalysis} />}

      <section className="space-y-2">
        <h2 className="text-lg font-semibold tracking-tight">{tt('What to improve')}</h2>
        <Card>
          <CardContent className="space-y-3 p-4">
            <p className="text-sm text-muted-foreground">{tt(summaryText)}</p>
            {coaching.length === 0 && (
              <p className="text-xs text-muted-foreground">
                {tt('No standout issues this game — a clean, balanced performance.')}
              </p>
            )}
            {coaching.map((sig) => (
              <div key={sig.id} className="flex items-start gap-2">
                <span
                  className={cn(
                    'mt-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase',
                    SEVERITY_STYLE[sig.severity],
                  )}
                >
                  {sig.severity}
                </span>
                <div>
                  <div className="text-sm font-medium">{tt(sig.title)}</div>
                  <div className="text-xs text-muted-foreground">{tt(sig.detail)}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <BuildOrderComparisonCard
        summary={summary}
        summaryLoading={summaryLoading}
        myCiv={subjectCiv}
        myProfileId={subjectProfileId}
        myPlayerId={subjectPlayerId}
        myName={subjectName}
        map={match.map}
        format={match.format}
        patch={match.patch}
        referenceBuildName={isOwnFocus ? referenceBuildName : null}
        perPlayer={match.perPlayer}
        linkedVideoAnalysis={isOwnFocus ? linkedVideoAnalysis : undefined}
        verifiedVod={isOwnFocus ? verifiedVod : null}
        showSubjectBadge={isOwnFocus}
      />

      <ReplayCommandAnalysis
        key={'replay-evidence-' + match.id}
        match={match}
        knownPlayers={summary?.players}
      />

      <AutoGameplayCard
        key={'auto-gameplay-' + match.id}
        enabled={isOwnFocus && isPublicGame}
        hasAnalysis={Boolean(linkedVideoAnalysis)}
        input={{
          gameId: match.id,
          profileId: myProfileId,
          civilization: match.civ,
          opponentCivilization: match.oppCiv,
          map: match.map,
          durationSec: match.durationSec,
          playedAt: match.playedAt,
        }}
      />

      {summary && isOwnFocus && (
        <BuildTrainerCard
          summary={summary}
          myCiv={match.civ}
          myProfileId={myProfileId}
          referenceBuildName={referenceBuildName}
        />
      )}

      <section id="game-summary-evidence" className="scroll-mt-4 space-y-2">
        <h2 className="text-lg font-semibold tracking-tight">{tt('Economy & build order')}</h2>
        {summary && summary.players.length > 0 ? (
          <GameSummaryPanel
            summary={summary}
            myCiv={subjectCiv}
            perPlayer={match.perPlayer}
            myProfileId={subjectProfileId}
            myPlayerId={subjectPlayerId}
          />
        ) : (
          <Card>
            <CardContent className="space-y-2 p-4 text-sm">
              {vpm != null && (
                <Metric
                  label={tt('Villagers / min')}
                  value={String(vpm)}
                  hint={tt('your economy pace — the AoE4 CS/min')}
                />
              )}
              <p className="text-muted-foreground">
                {summaryLoading
                  ? tt('Reading the game’s stat file…')
                  : tt(
                      'No stat file is available for this game yet. Summaries for multiplayer games are uploaded by the players themselves — for lobbies with AI no one may upload one, uploads can lag a few minutes behind the game, and desynced/abandoned matches never get one. Check back shortly; old games also age out of Relic’s window. Ranked/custom summaries need Steam connected in Settings.',
                    )}
              </p>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  )
}

function similarMatchQuery(match: StoredMatch, profileId: number | null): SimilarMatchQuery {
  const targetTeamCivs = [match.civ, ...(match.myTeam ?? []).map((player) => player.civ)]
  const enemyTeamCivs = match.oppTeam?.length
    ? match.oppTeam.map((player) => player.civ)
    : match.oppCiv
      ? [match.oppCiv]
      : []
  return {
    profileId,
    gameId: /^\d+$/.test(match.id) ? Number(match.id) : null,
    map: match.map,
    kind: inferGameKind(match.format, targetTeamCivs.length),
    patch: match.patch ?? null,
    playedAt: match.playedAt,
    targetCiv: match.civ,
    targetTeamCivs,
    enemyTeamCivs,
    // Coaching references must have the complete same CIV composition. A loss
    // is still useful evidence, so winning examples are preferred by ranking
    // but are not the only eligible references.
    exactCivsOnly: true,
    winsOnly: false,
    ratingAbove: match.rating,
    durationMaxSec: match.durationSec,
    limit: 5,
    // The background account archive can contain years of games; let the
    // local-first search use the full supported two-year comparison window.
    lookbackDays: 730,
  }
}

function MatchSectionNav({
  isPublicGame,
  hasSummary,
  hasVerifiedVod,
  hasTeamReview,
  onReplay,
}: {
  isPublicGame: boolean
  hasSummary: boolean
  hasVerifiedVod: boolean
  hasTeamReview: boolean
  onReplay: () => void
}) {
  const { tt } = useI18n()
  const links = [
    ...(hasTeamReview ? [{ id: 'team-mate-review', label: tt('Team review') }] : []),
    { id: 'turning-point-story', label: tt('Turning points') },
    { id: 'build-order-audit', label: tt('Build audit') },
    { id: 'game-summary-evidence', label: tt('Economy & build order') },
  ]
  return (
    <nav
      aria-label={tt('Match evidence navigation')}
      className="sticky top-0 z-20 -mx-1 flex flex-wrap items-center gap-1 rounded-md border border-border/70 bg-background/95 p-1.5 shadow-sm backdrop-blur"
    >
      <span className="px-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {tt('Evidence')}
      </span>
      {links.map((link) => (
        <button
          key={link.id}
          type="button"
          onClick={() =>
            document.getElementById(link.id)?.scrollIntoView({
              behavior: 'smooth',
              block: 'start',
            })
          }
          className="rounded px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          {link.label}
        </button>
      ))}
      <button
        type="button"
        onClick={onReplay}
        className="rounded px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      >
        {tt('Command stream')}
      </button>
      <span className="ml-auto flex items-center gap-2 px-2 text-[10px] text-muted-foreground">
        <span className={cn('inline-flex items-center gap-1', hasSummary ? 'text-win' : '')}>
          <CheckCircle2 className="h-3 w-3" />{' '}
          {hasSummary ? tt('Summary ready') : tt('Summary pending')}
        </span>
        {isPublicGame && (
          <span className={cn('inline-flex items-center gap-1', hasVerifiedVod ? 'text-win' : '')}>
            <ExternalLink className="h-3 w-3" />{' '}
            {hasVerifiedVod ? tt('VOD linked') : tt('VOD search')}
          </span>
        )}
      </span>
    </nav>
  )
}

function ReplayCommandAnalysis({
  match,
  knownPlayers,
}: {
  match: StoredMatch
  knownPlayers?: MatchSummary['players']
}) {
  const { tt } = useI18n()
  const [open, setOpen] = useState(false)
  const [checked, setChecked] = useState(false)
  const [fullResult, setFullResult] = useState<FullReplayAnalysis | null>(null)
  const analysis = useReplayAnalysis()
  const fullAnalysis = useDownloadAndAnalyzeReplay()
  const isOnlineGame = /^\d{1,16}$/.test(match.id) && !match.custom
  const target = isOnlineGame ? { gameId: Number(match.id) } : { localId: match.id }
  const displayedAnalysis = fullResult?.replay ?? analysis.data
  const run = () => {
    setChecked(false)
    if (isOnlineGame) {
      void fullAnalysis
        .mutateAsync(Number(match.id))
        .then((result) => {
          setFullResult(result)
          setChecked(true)
          setOpen(result.replay != null)
        })
        .catch(() => setChecked(true))
      return
    }
    void analysis
      .mutateAsync(target)
      .then(() => {
        setChecked(true)
        setOpen(true)
      })
      .catch(() => setChecked(true))
  }

  // Opening a match is already an explicit request to inspect it. Start the
  // replay path automatically so decoded commands and evidence are available
  // without another click. Main-process caching keeps repeat visits cheap.
  const autoStartedRef = useRef<string | null>(null)
  useEffect(() => {
    if (autoStartedRef.current === match.id) return
    autoStartedRef.current = match.id
    setOpen(false)
    setChecked(false)
    setFullResult(null)
    analysis.reset()
    fullAnalysis.reset()
    run()
    // The effect is scoped to one mounted match; mutation updates must not
    // restart the workflow.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match.id])

  return (
    <section id="replay-command-analysis" className="scroll-mt-4 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold tracking-tight">{tt('Replay evidence')}</h2>
        <button
          type="button"
          onClick={run}
          disabled={analysis.isPending || fullAnalysis.isPending}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-primary/40 px-2.5 text-xs text-primary hover:bg-primary/10 disabled:opacity-40"
        >
          <ScanLine className="h-3.5 w-3.5" />
          {fullAnalysis.isPending
            ? tt('Downloading and analyzing…')
            : analysis.isPending
              ? tt('Analyzing…')
              : isOnlineGame
                ? tt('Download + analyze replay')
                : tt('Analyze replay')}
        </button>
      </div>
      {analysis.error && !isOnlineGame && (
        <p className="text-xs text-loss">{analysis.error.message}</p>
      )}
      {fullAnalysis.error && <p className="text-xs text-loss">{fullAnalysis.error.message}</p>}
      {fullResult && (
        <p className="border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
          {tt('Online replay')}: {fullResult.download.status} · {tt('Replay stream')}{' '}
          {tt(fullResult.coverage.replay)} · {tt('Summary')}{' '}
          {fullResult.coverage.summary ? tt('available') : tt('unavailable')}
        </p>
      )}
      {displayedAnalysis && (
        <Card>
          <CardContent className="p-4">
            <ReplayAnalysisPanel
              result={displayedAnalysis}
              target={target}
              knownPlayers={knownPlayers}
              open={open}
              onToggle={() => setOpen((value) => !value)}
            />
          </CardContent>
        </Card>
      )}
      {checked && displayedAnalysis == null && !analysis.error && !fullAnalysis.error && (
        <p className="text-xs text-muted-foreground">
          {isOnlineGame
            ? tt('Relic did not return an available replay for this game.')
            : tt('No local replay file is available for this game.')}
        </p>
      )}
    </section>
  )
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  )
}

function MatchPlayerFocus({
  players,
  civByProfile,
  perPlayer,
  ownProfileId,
  activePlayerId,
  onSelect,
}: {
  players: PlayerSummary[]
  civByProfile: Map<number, string | null>
  perPlayer?: PerPlayerMatchStats[]
  ownProfileId: number | null
  activePlayerId: number | null
  onSelect: (playerId: number) => void
}) {
  const { tt, gameName } = useI18n()
  const selectable = players
  const countersByProfile = new Map((perPlayer ?? []).map((row) => [row.profileId, row]))
  if (selectable.length < 2) return null
  return (
    <section className="space-y-2" aria-label={tt('Match player focus')}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold tracking-tight">{tt('Match player focus')}</h2>
        <span className="text-xs text-muted-foreground">
          {tt('Select any player to update the detailed match evidence below.')}
        </span>
      </div>
      <div className="grid gap-3 rounded-md border border-border/70 bg-secondary/20 p-3 sm:grid-cols-2 xl:grid-cols-3">
        {selectable.map((player) => {
          const profileId = player.profileId
          const active = player.playerId === activePlayerId
          const counter = profileId != null ? countersByProfile.get(profileId) : undefined
          const civ =
            (profileId != null ? civByProfile.get(profileId) : undefined) ??
            civFromToken(player.civToken)
          const coverage = playerEvidenceCoverage(
            player,
            profileId != null ? countersByProfile.get(profileId) : null,
          )
          const result = counter?.result
          const resultLabel =
            result === 'win'
              ? tt('Victory')
              : result === 'loss'
                ? tt('Defeat')
                : tt('Result unknown')
          return (
            <article
              // profileId is optional for local/AI rows; playerId is the
              // stable identity and prevents duplicate React keys in those
              // matches.
              key={player.playerId}
              className={cn(
                'rounded-md border p-3 text-xs transition-colors',
                active
                  ? 'border-primary/60 bg-primary/10 ring-1 ring-primary/20'
                  : 'border-border/70 bg-background/20 hover:border-primary/40',
              )}
            >
              <div className="flex items-start gap-2">
                <Flag civ={civ ?? null} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      aria-pressed={active}
                      onClick={() => onSelect(player.playerId)}
                      title={tt('Focus this player in the match review')}
                      className="truncate text-left font-semibold hover:text-primary hover:underline"
                    >
                      {player.name || `Player ${player.playerId}`}
                    </button>
                    {profileId != null && profileId === ownProfileId && (
                      <span className="rounded bg-primary/15 px-1 text-[9px] font-semibold uppercase text-primary">
                        {tt('You')}
                      </span>
                    )}
                  </div>
                  <div className="truncate text-[11px] text-muted-foreground">
                    {civ ? gameName(civDisplayName(civ)) : tt('Civilization unavailable')}
                  </div>
                </div>
                <span
                  className={cn(
                    'shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase',
                    result === 'win'
                      ? 'bg-win/15 text-win'
                      : result === 'loss'
                        ? 'bg-destructive/15 text-destructive'
                        : 'bg-secondary text-muted-foreground',
                  )}
                >
                  {resultLabel}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 border-y border-border/50 py-2 text-[11px]">
                <PlayerCardStat
                  label="APM"
                  value={counter?.apm == null ? '—' : counter.apm.toFixed(1)}
                />
                <PlayerCardStat
                  label={tt('Units')}
                  value={counter?.unitsProduced == null ? '—' : String(counter.unitsProduced)}
                />
                <PlayerCardStat
                  label={tt('K/D')}
                  value={counter?.kd == null ? '—' : counter.kd.toFixed(2)}
                />
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <span
                  className={cn(
                    'rounded px-1.5 py-0.5 text-[9px] font-medium uppercase',
                    coverage.level === 'full'
                      ? 'bg-win/15 text-win'
                      : coverage.level === 'unavailable'
                        ? 'bg-secondary text-muted-foreground'
                        : 'bg-warn/15 text-warn',
                  )}
                  title={`${tt('Summary')}: ${coverage.summaryReported}/${coverage.summaryTotal} · ${tt('Relic counters')}: ${coverage.counterReported}/${coverage.counterTotal}${coverage.missing.length > 0 ? ` · ${tt('Missing')}: ${coverage.missing.map((field) => tt(field)).join(', ')}` : ''}`}
                >
                  {tt('Evidence')}: {coverage.summaryReported + coverage.counterReported}/
                  {coverage.summaryTotal + coverage.counterTotal}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onSelect(player.playerId)}
                    className="text-primary hover:underline"
                  >
                    {active ? tt('Viewing') : tt('Open match analysis')}
                  </button>
                  {profileId != null ? (
                    <Link
                      to={`/profile/${profileId}`}
                      title={tt('Open this player’s scout profile')}
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" /> {tt('Scout profile')}
                    </Link>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">{tt('Local / AI')}</span>
                  )}
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function PlayerCardStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="truncate text-[9px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 font-semibold tabular-nums text-foreground">{value}</div>
    </div>
  )
}

const COLS: { key: keyof PerPlayerMatchStats; label: string; title: string }[] = [
  {
    key: 'unitsProduced',
    label: 'Units',
    title:
      "Units produced across the whole game — NOT the game's 'Largest Army' (peak size at once); that's in Military and production below",
  },
  { key: 'kills', label: 'Kills', title: 'Enemy units killed' },
  { key: 'deaths', label: 'Deaths', title: 'Your units lost' },
  { key: 'kd', label: 'K/D', title: 'Kills ÷ deaths' },
  { key: 'buildingsProduced', label: 'Buildings', title: 'Buildings constructed' },
  { key: 'techsResearched', label: 'Techs', title: 'Upgrades / technologies researched' },
  { key: 'apm', label: 'APM', title: 'Actions per minute' },
]

function ComparisonTable({
  rows,
  myProfileId,
  activeProfileId,
  onSelectPlayer,
  nameByCiv,
  myName,
  villagersLostByProfile,
}: {
  rows: PerPlayerMatchStats[]
  myProfileId: number | null
  activeProfileId: number | null
  onSelectPlayer: (profileId: number) => void
  nameByCiv: Map<string, string>
  myName: string | null
  villagersLostByProfile?: Map<number, number>
}) {
  const { tt, gameName } = useI18n()
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold tracking-tight">{tt('Comparison')}</h2>
      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="rts-ledger-head px-3 py-2 text-left">{tt('Player')}</th>
                {COLS.map((c) => (
                  <th
                    key={c.key}
                    title={tt(c.title)}
                    className="rts-ledger-head px-3 py-2 text-right"
                  >
                    {tt(c.label)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const isOwner = r.profileId === myProfileId
                const isActive = r.profileId === activeProfileId
                const name = isOwner ? (myName ?? 'You') : r.civ ? nameByCiv.get(r.civ) : undefined
                return (
                  <tr
                    key={r.profileId}
                    className={cn(
                      'border-b border-border/60 last:border-b-0',
                      isActive && 'bg-primary/5',
                    )}
                  >
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Flag civ={r.civ} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => onSelectPlayer(r.profileId)}
                              title={tt('Show this player’s full match evidence')}
                              className="truncate font-medium text-left hover:text-primary hover:underline"
                            >
                              {name ?? civLabel(r.civ, gameName, tt('Unknown'))}
                            </button>
                            <Link
                              to={`/profile/${r.profileId}`}
                              title={tt('Open this player’s scout profile')}
                              className="shrink-0 text-primary hover:text-primary/80"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                            {isOwner && (
                              <span className="rounded bg-primary/15 px-1 text-[9px] font-semibold uppercase text-primary">
                                {tt('You')}
                              </span>
                            )}
                            {isActive && !isOwner && (
                              <span className="rounded bg-primary/15 px-1 text-[9px] font-semibold uppercase text-primary">
                                {tt('Viewing')}
                              </span>
                            )}
                            {r.result === 'win' && (
                              <span className="text-[10px] font-semibold text-win">{tt('W')}</span>
                            )}
                            {r.result === 'loss' && (
                              <span className="text-[10px] font-semibold text-destructive">
                                {tt('L')}
                              </span>
                            )}
                          </div>
                          {name && (
                            <div className="truncate text-[11px] text-muted-foreground">
                              {civLabel(r.civ, gameName, tt('Unknown'))}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    {COLS.map((c) => {
                      const vills =
                        c.key === 'deaths' ? villagersLostByProfile?.get(r.profileId) : undefined
                      return (
                        <td key={c.key} className="px-3 py-2 text-right tabular-nums">
                          {fmt(r[c.key])}
                          {vills != null && vills > 0 && (
                            <span
                              className="ml-1 text-[10px] text-muted-foreground"
                              title={tt(
                                "Villagers included in the deaths count — the game's military tab counts only troops",
                              )}
                            >
                              ({vills} {tt('vills')})
                            </span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
      <p className="text-[11px] text-muted-foreground">
        {tt(
          "Production, combat, tech and APM from Relic (the same source AoE4World reads). Deaths include villagers — the game's military tab counts troops only. Economy isn't in this feed, so it isn't shown as a column.",
        )}
      </p>
      <p className="text-[11px] text-muted-foreground">
        {tt('Click a player name to focus every detailed panel on that player.')}
      </p>
    </section>
  )
}

function Flag({ civ }: { civ: string | null }) {
  const { gameName, tt } = useI18n()
  const entry = civ ? CIV_FLAGS[civ] : undefined
  if (!entry) {
    return (
      <span className="flex h-5 w-9 shrink-0 items-center justify-center rounded-sm bg-secondary text-[8px] font-bold uppercase text-muted-foreground">
        {civ ? gameName(civDisplayName(civ)).slice(0, 3) : '—'}
      </span>
    )
  }
  return (
    <img
      src={entry.flag}
      alt={civ ? gameName(civDisplayName(civ)) : tt('Civilization')}
      style={{ outlineColor: entry.color }}
      className="h-5 w-9 shrink-0 rounded-sm object-cover outline outline-1"
    />
  )
}

function fmt(v: number | string | null | undefined): string {
  if (v == null) return '—'
  return String(v)
}

/** civDisplayName that tolerates a null slug (unknown civ). */
function civLabel(
  civ: string | null,
  gameName: (value: string) => string,
  unknown: string,
): string {
  return civ ? gameName(civDisplayName(civ)) : unknown
}

/** A "Civ vs Civ" (or team) title for the game header. */
function matchTitle(match: StoredMatch, gameName: (value: string) => string): string {
  const mine = gameName(civDisplayName(match.civ))
  const opp =
    match.oppTeam && match.oppTeam.length > 0
      ? match.oppTeam.map((p) => gameName(civDisplayName(p.civ))).join(' + ')
      : match.oppCiv
        ? gameName(civDisplayName(match.oppCiv))
        : 'Unknown'
  const myTeam =
    match.myTeam && match.myTeam.length > 0
      ? [mine, ...match.myTeam.map((p) => gameName(civDisplayName(p.civ)))].join(' + ')
      : mine
  return `${myTeam} vs ${opp}`
}

/** Rows grouped as (my team, me first) then the enemy team. */
function orderRows(
  perPlayer: PerPlayerMatchStats[],
  myProfileId: number | null,
): PerPlayerMatchStats[] {
  const me = perPlayer.find((p) => p.profileId === myProfileId)
  const myTeamId = me?.teamId ?? null
  return [...perPlayer].sort((a, b) => {
    const aSide = a.teamId === myTeamId ? 0 : 1
    const bSide = b.teamId === myTeamId ? 0 : 1
    if (aSide !== bSide) return aSide - bSide
    const aMe = a.profileId === myProfileId ? 0 : 1
    const bMe = b.profileId === myProfileId ? 0 : 1
    return aMe - bMe
  })
}

/**
 * A civ→name map from the stored roster, so the comparison table can label the
 * enemy/ally rows (the counters feed has profile ids, the roster has names). Only
 * unambiguous civs are kept — a civ that two players share resolves to no name
 * rather than the wrong one.
 */
function buildNameByCiv(match: StoredMatch): Map<string, string> {
  const seen = new Map<string, string | null>()
  const add = (civ: string | null, name: string | null) => {
    if (!civ || !name) return
    seen.set(civ, seen.has(civ) ? null : name) // second sighting → ambiguous
  }
  for (const p of match.myTeam ?? []) add(p.civ, p.name)
  for (const p of match.oppTeam ?? []) add(p.civ, p.name)
  if ((match.oppTeam?.length ?? 0) === 0) add(match.oppCiv, match.oppName)
  const out = new Map<string, string>()
  for (const [civ, name] of seen) if (name) out.set(civ, name)
  return out
}

function dedupeSignals(signals: Signal[]): Signal[] {
  const seen = new Set<string>()
  return signals.filter((s) => (seen.has(s.id) ? false : (seen.add(s.id), true)))
}

function effectiveSummary(summary: string, result: 'win' | 'loss' | null): string {
  if (result === 'win') return summary.replace(/^Game as /, 'Win as ')
  if (result === 'loss') return summary.replace(/^Game as /, 'Loss as ')
  return summary
}
