import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Download, RefreshCw } from 'lucide-react'
import {
  countryFlag,
  formatLeaderboard,
  formatPercent,
  formatRating,
} from '@shared/format'
import { buildPlayerDossier, scoutRowsToStatGames } from '@domain/playerDossier'
import { buildSelfCoachReport } from '@domain/selfCoachReport'
import { buildOpponentCoachReport } from '@domain/opponentCoachReport'
import { buildTeamCoachReport } from '@domain/teamCoachReport'
import { selectCreatorMatchCoach } from '@domain/creatorVideoCoach'
import { useScout } from '../queries/useScout'
import { useScoutHistory, useSettings } from '../queries/useProfile'
import { ScoutReportCard } from '../components/ScoutReportCard'
import { ScoutHistoryPanel } from '../components/ScoutHistoryPanel'
import {
  analyticsIdentityFromScout,
  PlayerAnalyticsCard,
} from '../components/PlayerAnalyticsCard'
import { CoachDossierPanel } from '../components/CoachDossierPanel'
import { CreatorVideoLessonPanel } from '../components/CreatorVideoLessonPanel'
import { RankBadge } from '../components/RankBadge'
import { StatTile } from '../components/StatTile'
import { PageHead } from '../components/PageHead'
import { EmptyBox, ErrorBox, Spinner } from '../components/feedback'
import { OwnPlayerStats } from './Stats'
import { PlayerWorldOverview } from '../components/PlayerWorldOverview'
import { useI18n } from '../../i18n'
import { cachePlayerArchiveOnce } from '../hooks/useAutoAction'

/**
 * One player-stats endpoint for any profile. Scout, match roster, live overlay,
 * and leaderboards all land here. The signed-in account reuses My Stats.
 */
export function PlayerProfile() {
  const { tt } = useI18n()
  const { profileId: raw } = useParams()
  const parsed = raw ? Number(raw) : NaN
  const profileId = Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null
  const { data: settings } = useSettings()
  const isOwn = profileId != null && settings?.profileId === profileId

  if (isOwn) return <OwnPlayerStats />

  return <PublicPlayerStats profileId={profileId} />
}

function PublicPlayerStats({ profileId }: { profileId: number | null }) {
  const { tt } = useI18n()
  const { data, isLoading, refetch } = useScout(profileId)
  const history = useScoutHistory(profileId)

  const [archiveStatus, setArchiveStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [archiveMsg, setArchiveMsg] = useState<string | null>(null)

  useEffect(() => {
    if (profileId == null) return
    setArchiveStatus('loading')
    void cachePlayerArchiveOnce(profileId)
      .then((res) => {
        if (!res) {
          setArchiveStatus('done')
          return
        }
        if (res.ok) {
          const { cachedReplays, cachedSummaries, analyzedReplays } = res.data
          setArchiveMsg(
            tt('Loaded {replays} replays · {summaries} summaries · {analyzed} analyzed')
              .replace('{replays}', String(cachedReplays))
              .replace('{summaries}', String(cachedSummaries))
              .replace('{analyzed}', String(analyzedReplays)),
          )
          setArchiveStatus('done')
          void history.refetch()
        } else {
          setArchiveStatus('error')
          setArchiveMsg(res.error.message ?? tt('Could not load the player archive.'))
        }
      })
      .catch((e: unknown) => {
        setArchiveStatus('error')
        setArchiveMsg(e instanceof Error ? e.message : tt('Could not load the player archive.'))
      })
  }, [profileId, tt]) // eslint-disable-line react-hooks/exhaustive-deps

  const allScoutGames = useMemo(
    () =>
      (history.data?.pages ?? []).flatMap((p) =>
        p.ok && p.data.recent.ok ? (p.data.recent.data.matches ?? []) : [],
      ),
    [history.data],
  )

  const lastGame = allScoutGames[0]

  const dossier = useMemo(() => {
    if (profileId == null) return null
    return buildPlayerDossier(scoutRowsToStatGames(allScoutGames), profileId)
  }, [allScoutGames, profileId])

  const selfCoach = useMemo(() => {
    if (profileId == null) return null
    const name = data?.ok ? data.data.name : 'Player'
    return buildSelfCoachReport({
      profileId,
      playerName: name,
      voice: 'third',
      scoutGames: allScoutGames,
    })
  }, [allScoutGames, data, profileId])

  const opponentCoach = useMemo(() => {
    if (profileId == null || !data?.ok) return null
    return buildOpponentCoachReport({
      profileId,
      playerName: data.data.name,
      knownCiv: lastGame?.civilization ?? null,
      scoutGames: allScoutGames,
    })
  }, [allScoutGames, data, lastGame, profileId])

  const teamCoach = useMemo(() => {
    if (profileId == null || !data?.ok) return null
    return buildTeamCoachReport({
      subjectProfileId: profileId,
      subjectName: data.data.name,
      scoutGames: allScoutGames,
    })
  }, [allScoutGames, data, profileId])

  const videoCoach = useMemo(() => {
    const civ = lastGame?.civilization ?? dossier?.civPool[0]?.key ?? null
    const opp = lastGame?.opponentCivilizations[0] ?? null
    return selectCreatorMatchCoach(civ, opp)
  }, [dossier, lastGame])

  return (
    <div className="animate-fade-in space-y-6">
      <Link
        to="/scout"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> {tt('Scout')}
      </Link>
      <p className="text-[11px] text-muted-foreground">
        {tt('Same analytics surface as My Stats — open this URL for any player from scout, a match roster, or live overlay.')}
      </p>

      {profileId == null && (
        <EmptyBox>
          <p>{tt('Player not found.')}</p>
        </EmptyBox>
      )}

      {isLoading && <Spinner label={tt('Loading profile…')} />}
      {!isLoading && data && !data.ok && (
        <ErrorBox message={data.error.message} onRetry={() => refetch()} />
      )}

      {!isLoading && data?.ok && (
        <>
          <PageHead
            kicker="Chronicle"
            title={data.data.name}
            sub="Same analytics surface as My Stats — public history, dossier, and video coaching."
            aside={
              <Link to="/lab?section=studio" className="rts-btn">
                {tt('Data Studio')}
              </Link>
            }
          />
          <PlayerAnalyticsCard
            identity={analyticsIdentityFromScout(data.data)}
            scoutGames={allScoutGames}
          />
          <ProfileBody report={data.data} />
          <PlayerWorldOverview
            profileId={data.data.profileId}
            name={data.data.name}
            country={data.data.country}
            avatarUrl={data.data.avatarUrl}
            steamId={data.data.steamId}
            social={data.data.social}
            lastGameAt={data.data.lastGameAt}
            siteUrl={data.data.siteUrl}
            modes={data.data.modes}
            modeCivGroups={data.data.modeCivGroups}
            ratingHistories={data.data.ratingHistories}
            teammates={data.data.teammates}
            opponents={data.data.opponents}
            maps={data.data.topMaps}
            previousSeasons={data.data.previousSeasons}
          />
          <ScoutReportCard report={data.data} insightsOnly />

          {archiveStatus === 'loading' && (
            <div className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/[0.06] px-3 py-2 text-xs text-emerald-400">
              <RefreshCw className="h-3.5 w-3.5 animate-spin shrink-0" />
              <span>{tt('Downloading and analyzing opponent replays / summaries…')}</span>
            </div>
          )}
          {archiveStatus === 'done' && archiveMsg && (
            <div className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/[0.06] px-3 py-2 text-xs text-emerald-400">
              <Download className="h-3.5 w-3.5 shrink-0" />
              <span>{archiveMsg}</span>
            </div>
          )}
          {archiveStatus === 'error' && archiveMsg && (
            <div className="rounded-md border border-destructive/30 bg-destructive/[0.06] px-3 py-2 text-xs text-destructive">
              {archiveMsg}
            </div>
          )}

          {selfCoach && (
            <CoachDossierPanel
              self={selfCoach}
              opponents={opponentCoach ? [opponentCoach] : []}
              team={teamCoach}
              foldable
              foldId="profile-coach-dossier"
            />
          )}
          <CreatorVideoLessonPanel
            picks={[...videoCoach.forPlayer, ...videoCoach.forOpponent, ...videoCoach.sharedFundamentals]}
            title={tt('Valdemar & Beastyqt lessons for this player')}
          />
          <ScoutHistoryPanel
            pages={history.data?.pages}
            isLoading={history.isLoading}
            error={history.error}
            viewedName={data.data.name}
            onRetry={() => void history.refetch()}
            hasNextPage={history.hasNextPage}
            isFetchingNextPage={history.isFetchingNextPage}
            onLoadMore={() => void history.fetchNextPage()}
          />
        </>
      )}
    </div>
  )
}

function ProfileBody({ report }: { report: Parameters<typeof ScoutReportCard>[0]['report'] }) {
  const { tt } = useI18n()
  const { primary } = report
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center gap-3">
        <span className="text-2xl" aria-hidden>
          {countryFlag(report.country)}
        </span>
        <RankBadge rank={primary} />
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          label={tt('Rating')}
          value={formatRating(primary?.rating)}
          sub={primary ? tt(formatLeaderboard(primary.leaderboard)) : undefined}
        />
        <StatTile label={tt('Peak')} value={formatRating(primary?.maxRating)} />
        <StatTile label={tt('Rank')} value={primary?.rank != null ? `#${primary.rank}` : '—'} />
        <StatTile
          label={tt('Win rate')}
          value={formatPercent(primary?.winRate)}
          sub={
            primary?.winsCount != null && primary.lossesCount != null
              ? `${primary.winsCount}W ${primary.lossesCount}L`
              : primary
                ? `${primary.gamesCount} ${tt('games')}`
                : undefined
          }
          accent={primary?.winRate == null ? undefined : primary.winRate >= 50 ? 'win' : 'loss'}
        />
      </div>
    </div>
  )
}
