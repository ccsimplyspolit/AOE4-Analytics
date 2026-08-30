import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowRight, ExternalLink, RefreshCw, Swords, Users } from 'lucide-react'
import type { PlayerSearchHit } from '@ipc/contract'
import { BUILD_CATALOG } from '@data/buildCatalog'
import { recommendBuildsForCoach } from '@domain/coachRecommendations'
import { civDisplayName } from '@domain/civ'
import { formatDuration } from '@domain/format'
import type { LastMatchCoachContext } from '@domain/coachContext'
import { Card, CardContent } from '@shared/components/ui/card'
import { Badge } from '@shared/components/ui/badge'
import { MatchDiagnosticsPanel } from './MatchDiagnosticsPanel'
import { MatchBriefingPanel } from './MatchBriefingPanel'
import { briefingFromCoachContext } from '@domain/matchBriefing'
import { PlayerSearch } from './PlayerSearch'
import { ErrorBox, EmptyBox, Spinner } from './feedback'
import { useLastMatchCoach } from '../queries/useCoach'
import { useSettings } from '../queries/useProfile'
import { cn } from '@shared/lib/utils'
import { useI18n } from '../../i18n'

function parseProfileId(value: string | null): number | null {
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null
}

function resultTone(result: LastMatchCoachContext['player']['result']): string {
  if (result === 'win') return 'bg-win/15 text-win'
  if (result === 'loss') return 'bg-loss/15 text-loss'
  return 'bg-secondary text-muted-foreground'
}

function ParticipantList({
  title,
  players,
}: {
  title: string
  players: LastMatchCoachContext['teammates']
}) {
  const { tt, gameName } = useI18n()
  return (
    <div className="space-y-2">
      <div className="rts-ledger-head">{title}</div>
      {players.length === 0 ? (
        <div className="text-xs text-muted-foreground">{tt('No additional players in this group.')}</div>
      ) : (
        players.map((player) => (
          <div
            key={player.profileId}
            className="flex items-center justify-between gap-3 rounded-md border border-border/60 bg-background/40 px-3 py-2"
          >
            {player.profileId > 0 ? (
              <Link
                to={`/profile/${player.profileId}`}
                className="min-w-0 truncate text-sm hover:text-primary hover:underline"
              >
                {player.name}
              </Link>
            ) : (
              <span className="min-w-0 truncate text-sm">{player.name}</span>
            )}
            <span className="shrink-0 text-xs text-muted-foreground">
              {gameName(civDisplayName(player.civilization))}
            </span>
          </div>
        ))
      )}
    </div>
  )
}

function CoachMatchHeader({ context }: { context: LastMatchCoachContext }) {
  const { tt, gameName } = useI18n()
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <CoachStat label={tt('Mode')} value={context.game.format} />
      <CoachStat label={tt('Map')} value={context.game.map ? gameName(context.game.map) : '—'} />
      <CoachStat
        label={tt('Duration')}
        value={context.game.durationSec == null ? '—' : formatDuration(context.game.durationSec)}
      />
      <CoachStat label={tt('Patch')} value={context.game.patch ?? tt('unknown')} />
    </div>
  )
}

function CoachStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-card/40 px-3 py-2">
      <div className="rts-ledger-head">{label}</div>
      <div className="mt-1 truncate text-sm font-medium">{value}</div>
    </div>
  )
}

export function LastMatchCoach() {
  const { tt, gameName } = useI18n()
  const [searchParams, setSearchParams] = useSearchParams()
  const settings = useSettings()
  const profileId = parseProfileId(searchParams.get('profile')) ?? settings.data?.profileId ?? null
  const query = useLastMatchCoach(profileId)
  const context = query.data?.ok ? query.data.data : null
  const recommendations = useMemo(
    () => (context ? recommendBuildsForCoach(context, BUILD_CATALOG) : []),
    [context],
  )

  const selectProfile = (hit: PlayerSearchHit) => {
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous)
        next.set('tab', 'coach')
        next.set('profile', String(hit.profileId))
        return next
      },
      { replace: true },
    )
  }

  const openBuild = (entryId: string, tab: 'cellar' | 'production') => {
    const entry = BUILD_CATALOG.find((candidate) => candidate.id === entryId)
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous)
        next.set('tab', tab)
        next.set('build', tab === 'cellar' ? entryId : (entry?.build.name ?? entryId))
        return next
      },
      { replace: true },
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3 p-4">
          <div>
            <div className="rts-section-title">{tt('Player context')}</div>
            <p className="text-xs text-muted-foreground">
              {tt('Resolve a profile, load the cached AoE4World last-game endpoint, and turn it into a build and production plan.')}
            </p>
          </div>
          <PlayerSearch
            placeholder={tt('Search a player for last-match coaching…')}
            onSelect={selectProfile}
          />
          {!profileId && (
            <p className="text-xs text-muted-foreground">
              {tt('Search any player, or set an active profile in Settings to coach your own latest game.')}
            </p>
          )}
        </CardContent>
      </Card>

      {query.isLoading && <Spinner label={tt('Loading the latest public match…')} />}
      {!query.isLoading && query.data && !query.data.ok && (
        <ErrorBox message={query.data.error.message} onRetry={() => void query.refetch()} />
      )}
      {!query.isLoading && profileId && !query.data && (
        <EmptyBox>{tt('AoE4World did not return a last-match context.')}</EmptyBox>
      )}
      {context && (
        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-4 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="rts-section-title">{context.profile.name}</div>
                    <Badge className={cn('border-0', resultTone(context.player.result))}>
                      {context.player.result ?? 'unknown'}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Last public match #{context.game.gameId} ·{' '}
                    {new Date(context.game.startedAt).toLocaleString()}
                  </p>
                </div>
                <a
                  href={`https://aoe4world.com/players/${context.profile.profileId}-${encodeURIComponent(context.profile.name)}/games/${context.game.gameId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  View on AoE4World <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <CoachMatchHeader context={context} />
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-3 rounded-md border border-primary/20 bg-primary/5 p-3">
                  <div className="flex items-center gap-2">
                    <Swords className="h-4 w-4 text-primary" />
                    <span className="rts-ledger-head">{tt('Your side')}</span>
                  </div>
                  <div className="text-sm font-medium">
                    {gameName(civDisplayName(context.player.civilization))}
                  </div>
                  <ParticipantList
                    title={context.teammates.length > 0 ? tt('Teammates') : tt('Team')}
                    players={context.teammates}
                  />
                </div>
                <div className="space-y-3 rounded-md border border-border bg-card/40 p-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="rts-ledger-head">{tt('Opposition')}</span>
                  </div>
                  <ParticipantList
                    title={context.game.isFfa ? tt('FFA roster') : tt('Opponents')}
                    players={context.opponents}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 p-4">
              <div className="flex items-center gap-2">
                <Swords className="h-4 w-4 text-primary" />
                <div>
                  <div className="rts-section-title">{tt('Build recommendations')}</div>
                  <p className="text-xs text-muted-foreground">
                    {tt("Ranked from the local Cellar for the civ in this match; this is guidance, not a claim that AoE4World detected the player's build.")}
                  </p>
                </div>
              </div>
                {recommendations.length === 0 ? (
                  <EmptyBox>{tt('No local Cellar build matches this civilization yet.')}</EmptyBox>
                ) : (
                  <div className="space-y-2">
                    {recommendations.map((recommendation) => (
                      <div
                        key={recommendation.entry.id}
                        className="rounded-md border border-border/70 bg-background/40 p-3"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <div className="font-medium">{recommendation.entry.build.name}</div>
                            <div className="mt-1 flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
                              {recommendation.reasons.map((reason) => (
                                <span key={reason} className="rounded bg-secondary px-1.5 py-0.5">
                                  {reason}
                                </span>
                              ))}
                            </div>
                          </div>
                          <span className="text-xs tabular-nums text-primary">
                            score {recommendation.score}
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openBuild(recommendation.entry.id, 'cellar')}
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            {tt('Open build')} <ArrowRight className="h-3 w-3" />
                          </button>
                          {recommendation.entry.videoUrl && (
                            <a
                              href={recommendation.entry.videoUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                              {tt('Watch build video')} <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => openBuild(recommendation.entry.id, 'production')}
                            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                          >
                            {tt('Production demand')} <ArrowRight className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          <MatchBriefingPanel briefing={briefingFromCoachContext(context, 'historical')} />
          <MatchDiagnosticsPanel context={context} embedded />
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <RefreshCw className="h-3 w-3" />
            {tt('Data is cached in the main process and refreshes on the AoE4World last-game TTL.')}
          </div>
        </div>
      )}
    </div>
  )
}
