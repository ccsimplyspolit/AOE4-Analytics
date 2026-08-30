import { Gamepad2, Lightbulb, Radio, Play, Swords, Loader2, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { civDisplayName } from '@domain/civ'
import { getOpeningProTips, buildTipVideoUrl } from '@domain/proTips'
import { buildAdvisoryTeamPlan } from '@domain/teamInsights'
import { buildMatchBriefing } from '@domain/matchBriefing'
import { buildSelfCoachReport } from '@domain/selfCoachReport'
import { buildOpponentCoachReport } from '@domain/opponentCoachReport'
import { formatRankLevel, formatRating, rankColor } from '@shared/format'
import { useHistory } from '../queries/useHistory'
import { useLiveMatch, useLaunchGame } from '../queries/useLiveMatch'
import { useScoutHistory, useSettings } from '../queries/useProfile'
import { MatchBriefingPanel } from './MatchBriefingPanel'
import { CoachLiveChecklists } from './CoachDossierPanel'
import { useI18n } from '../../i18n'

/** Top-of-dashboard card: shows the CURRENT live matchup, or a Start AoE4 button. */
export function LiveMatchCard() {
  const { tt, gameName } = useI18n()
  const { data: live } = useLiveMatch()
  const { data: settings } = useSettings()
  const { data: history } = useHistory()
  const launch = useLaunchGame()
  const localMatches = history?.ok ? history.data : []
  const liveOppId =
    live?.isLive && live.opponent && live.opponent.profileId > 0
      ? live.opponent.profileId
      : live?.isLive && live.teams?.[1]?.[0] && live.teams[1][0]!.profileId > 0
        ? live.teams[1][0]!.profileId
        : null
  const oppHistory = useScoutHistory(liveOppId)

  if (!live) return null

  if (live.isLive) {
    const teamPlan = live.teams ? buildAdvisoryTeamPlan(live.teams) : null
    const myTeam = live.teams?.[0] ?? []
    const enemyTeam = live.teams?.[1] ?? []
    const me = myTeam.find((player) => player.isMe)
    const upcomingBriefing =
      me || live.myCiv
        ? buildMatchBriefing({
            phase: 'upcoming',
            format: live.kind ?? live.leaderboard ?? 'live',
            map: live.map,
            subject: {
              profileId: me?.profileId ?? settings?.profileId ?? 0,
              name: me?.name ?? settings?.playerName ?? 'You',
              civ: me?.civ ?? live.myCiv,
            },
            teammates: myTeam
              .filter((player) => !player.isMe)
              .map((player) => ({
                profileId: player.profileId,
                name: player.name,
                civ: player.civ,
              })),
            opponents: (enemyTeam.length > 0
              ? enemyTeam
              : live.opponent
                ? [
                    {
                      profileId: live.opponent.profileId,
                      name: live.opponent.name,
                      civ: live.opponent.civ,
                    },
                  ]
                : []
            ).map((player) => ({ ...player, isOpponent: true })),
          })
        : null
    return (
      <div className="rounded-lg border border-primary/40 bg-primary/5 p-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
          <Radio className="h-3.5 w-3.5 animate-pulse" />
          {tt('Live match')}
          {live.map && (
            <span className="font-normal text-muted-foreground">· {gameName(live.map)}</span>
          )}
          {live.patch && (
            <span className="font-normal text-muted-foreground">· patch {live.patch}</span>
          )}
        </div>

        {teamPlan && live.teams ? (
          <>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-primary" />
              <span className="font-medium">
                {myTeam.map((player) => gameName(civDisplayName(player.civ ?? ''))).join(' + ')}
              </span>
              <Swords className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-medium">
                {enemyTeam.map((player) => gameName(civDisplayName(player.civ ?? ''))).join(' + ')}
              </span>
            </div>
            <div className="mt-1 grid gap-x-4 text-[11px] text-muted-foreground sm:grid-cols-2">
              <span>
                {tt('Your side')}:{' '}
                {myTeam.map((player, index) => (
                  <span key={player.profileId}>
                    {index > 0 ? ' · ' : null}
                    {player.profileId > 0 ? (
                      <Link
                        to={`/profile/${player.profileId}`}
                        className="hover:text-primary hover:underline"
                      >
                        {player.name}
                      </Link>
                    ) : (
                      player.name
                    )}
                    {` (${gameName(civDisplayName(player.civ ?? ''))})`}
                  </span>
                ))}
              </span>
              <span>
                {tt('Opponents')}:{' '}
                {enemyTeam.map((player, index) => (
                  <span key={player.profileId}>
                    {index > 0 ? ' · ' : null}
                    {player.profileId > 0 ? (
                      <Link
                        to={`/profile/${player.profileId}`}
                        className="hover:text-primary hover:underline"
                      >
                        {player.name}
                      </Link>
                    ) : (
                      player.name
                    )}
                    {` (${gameName(civDisplayName(player.civ ?? ''))})`}
                  </span>
                ))}
              </span>
            </div>
            <div className="mt-3 rounded-md border border-border/70 bg-card/70 p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-primary">
                  {teamPlan.label}
                </span>
                <span className="text-[10px] text-muted-foreground">{teamPlan.basis}</span>
              </div>
              <p className="mt-1 text-sm font-semibold">{teamPlan.headline}</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {teamPlan.assignments.map((assignment) => (
                  <div
                    key={assignment.profileId}
                    className="rounded border border-border/60 px-2.5 py-2"
                  >
                    <div className="text-xs font-medium">
                      {assignment.name} · {assignment.role}
                    </div>
                    <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                      {assignment.rationale}
                    </p>
                  </div>
                ))}
              </div>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                {teamPlan.priorities.map((priority) => (
                  <li key={priority}>• {priority}</li>
                ))}
              </ul>
            </div>
          </>
        ) : live.opponent ? (
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <span>{live.myCiv ? gameName(civDisplayName(live.myCiv)) : tt('You')}</span>
              <Swords className="h-4 w-4 text-muted-foreground" />
              <span>{gameName(civDisplayName(live.opponent.civ))}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">{tt('vs')}</span>
              {live.opponent.profileId > 0 ? (
                <Link
                  to={`/profile/${live.opponent.profileId}`}
                  className="font-medium hover:text-primary hover:underline"
                >
                  {live.opponent.name}
                </Link>
              ) : (
                <span className="font-medium">{live.opponent.name}</span>
              )}
              <span style={{ color: rankColor(live.opponent.rankLevel) }}>
                {tt(formatRankLevel(live.opponent.rankLevel))}
              </span>
              <span className="tabular-nums text-muted-foreground">
                {formatRating(live.opponent.rating)}
              </span>
            </div>
          </div>
        ) : live.custom ? (
          <div className="mt-2 text-sm text-muted-foreground">
            {tt('Custom / AI game in progress.')}
            {(me?.civ ?? live.myCiv) ? (
              <span>
                {' '}
                · {tt('You')}: {gameName(civDisplayName((me?.civ ?? live.myCiv)!))}
              </span>
            ) : null}
          </div>
        ) : (
          <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {tt('Match detected — fetching opponent…')}
          </div>
        )}

        {live.myCiv && (
          <div className="mt-3 rounded-md border border-primary/30 bg-primary/[0.04] p-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
              <Lightbulb className="h-3.5 w-3.5" />
              {tt('Pre-game checklist')} · {gameName(civDisplayName(live.myCiv))}
            </div>
            <ul className="mt-2 space-y-1.5">
              {getOpeningProTips(live.myCiv, 3).map((tip) => (
                <li key={tip.id} className="text-[11px] leading-snug text-muted-foreground">
                  <a
                    href={buildTipVideoUrl(tip)}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-foreground hover:text-primary"
                  >
                    {tip.shortText}
                  </a>
                  <span className="ml-1 font-mono text-[10px] text-primary/80">
                    @ {tip.timeFormatted}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {upcomingBriefing && (
          <div className="mt-3">
            <MatchBriefingPanel briefing={upcomingBriefing} hideRoles={Boolean(teamPlan)} />
          </div>
        )}

        {settings?.profileId != null && !upcomingBriefing && (
          <CoachLiveChecklists
            self={buildSelfCoachReport({
              profileId: settings.profileId,
              playerName: settings.playerName ?? 'You',
              voice: 'you',
              localMatches,
              currentCiv: me?.civ ?? live.myCiv ?? null,
              inMatch: true,
            })}
            opponent={
              live.opponent || enemyTeam[0]
                ? buildOpponentCoachReport({
                    profileId: (live.opponent?.profileId ?? enemyTeam[0]?.profileId) as number,
                    playerName: live.opponent?.name ?? enemyTeam[0]?.name ?? 'Opponent',
                    knownCiv: live.opponent?.civ ?? enemyTeam[0]?.civ ?? null,
                    scoutGames: (oppHistory.data?.pages ?? []).flatMap((p) =>
                      p.ok && p.data.recent.ok ? (p.data.recent.data.matches ?? []) : [],
                    ),
                  })
                : null
            }
          />
        )}

        <p className="mt-2 text-xs text-muted-foreground">
          {tt('Detection')}:{' '}
          {live.source === 'ongoing' ? tt('AoE4World live roster') : tt('local AoE4 log')} ·{' '}
          {tt('The overlay shows your matchup — press')}{' '}
          <kbd className="rounded bg-secondary px-1 py-0.5 font-mono text-[10px]">
            {settings?.hotkeys.toggleOverlay ?? 'Alt+O'}
          </kbd>{' '}
          in-game.
        </p>
      </div>
    )
  }

  // Not in a live match. Offer to launch when the game is closed; while the game
  // is open there's nothing to say — detection is fast and reliable now, so the
  // old "looking for your match…" status card is gone.
  // `null` means Windows could not answer the process query yet; only an
  // explicit `false` is proof that the game is closed.
  const gameClosed = live.processRunning === false
  if (!gameClosed) return null
  // The launcher reports failure two ways: a rejected IPC call, or a resolved
  // LaunchResult with ok:false and the launcher's own message.
  const launchFailed = launch.isError || (launch.data != null && !launch.data.ok)
  const launchError =
    launch.data != null && !launch.data.ok && launch.data.message
      ? launch.data.message
      : tt("Couldn't launch the game — is it installed?")
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card/50 p-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Gamepad2 className="h-4 w-4" />
        {tt('Age of Empires IV is not running.')}
      </div>
      <button
        type="button"
        onClick={() => launch.mutate()}
        disabled={launch.isPending}
        className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
      >
        <Play className="h-3.5 w-3.5" />
        {tt('Start AoE4')}
      </button>
      {launchFailed && <p className="w-full text-xs text-destructive">{launchError}</p>}
    </div>
  )
}
