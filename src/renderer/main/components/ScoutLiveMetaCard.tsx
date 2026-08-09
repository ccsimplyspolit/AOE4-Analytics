import { Clock3, Gauge, Globe2, Info, Map as MapIcon, Radio, Swords, Trophy, UsersRound } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import type {
  ScoutAgeupFlow,
  ScoutAgeupLandmark,
  ScoutMetaContext,
} from '@domain/scoutMeta'
import { Card, CardContent } from '@shared/components/ui/card'
import {
  formatDurationShort,
  formatLeaderboard,
  formatRankLevel,
  formatPercent,
  formatRating,
  formatCount,
} from '@shared/format'
import { civDisplayName } from '@domain/civ'
import { useI18n } from '../../i18n'

export function ScoutLiveMetaCard({ context }: { context: ScoutMetaContext }) {
  const { tt, gameName } = useI18n()
  const [nowMs, setNowMs] = useState(() => Date.now())
  const firstTeam = context.teams[0]
  const secondTeam = context.teams[1]
  const ageupScopeLabel = [
    context.scope.ageupScope.patchApplied ? tt('Current patch') : tt('Patch scope unavailable'),
    context.scope.ageupScope.rankLevelApplied && context.scope.ageupScope.ratingApplied
      ? tt('Requested bracket')
      : tt('All ratings/ranks'),
    tt('All maps'),
  ].join(' · ')
  useEffect(() => {
    if (!context.match.startedAt || context.match.durationSec != null) return
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [context.match.durationSec, context.match.startedAt])
  const elapsedSec = context.match.durationSec ?? elapsedFrom(context.match.startedAt, nowMs)
  return (
    <Card className="overflow-hidden border-primary/30 bg-primary/[0.03]">
      <CardContent className="space-y-5 p-5">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
              <Radio className="h-3.5 w-3.5 animate-pulse" />
              {tt('Live match meta')}
            </div>
            <h2 className="mt-1 text-lg font-semibold">{tt('What this map and matchup usually look like')}</h2>
          </div>
          <div className="flex max-w-full flex-wrap justify-end gap-1.5 text-[10px] text-muted-foreground">
            <ScopeChip value={tt(formatLeaderboard(context.scope.leaderboard))} />
            <ScopeChip value={context.scope.rankLevel ?? tt('All ranks')} />
            <ScopeChip value={context.scope.rating ?? tt('All ratings')} />
            <ScopeChip value={context.scope.patch ? `P${context.scope.patch}` : tt('Current patch')} />
            {context.scope.map && <ScopeChip value={context.scope.map} />}
          </div>
        </header>

        <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <MatchFact icon={<MapIcon className="h-3.5 w-3.5" />} label={tt('Map')} value={context.match.map ?? tt('Unknown')} />
          <MatchFact icon={<Swords className="h-3.5 w-3.5" />} label={tt('Mode')} value={tt(formatLeaderboard(context.match.leaderboard))} />
          <MatchFact icon={<Gauge className="h-3.5 w-3.5" />} label={tt('Average MMR')} value={formatRating(context.match.averageMmr)} />
          <MatchFact icon={<Clock3 className="h-3.5 w-3.5" />} label={tt('Game time')} value={formatDurationShort(elapsedSec)} />
          <MatchFact icon={<Globe2 className="h-3.5 w-3.5" />} label={tt('Server')} value={context.match.server ?? '—'} />
        </section>

        {firstTeam && secondTeam && (
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-card/60 px-3 py-2 text-sm">
            <span className="font-medium">
              {firstTeam.players.map((player) => gameName(civDisplayName(player.civ ?? 'Unknown'))).join(' + ')}
            </span>
            <Swords className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-medium">
              {secondTeam.players.map((player) => gameName(civDisplayName(player.civ ?? 'Unknown'))).join(' + ')}
            </span>
          </div>
        )}

        <section className="grid gap-2 md:grid-cols-2">
          {context.teams.map((team) => (
            <div key={team.teamIndex} className="rounded-md border border-border bg-card/50 p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                <span>{team.teamIndex === 0 ? tt('Your side') : tt('Opponents')}</span>
                <span className="font-normal normal-case tabular-nums">
                  {tt('Avg MMR')} {formatRating(team.averageMmr)} · {tt('Avg ELO')} {formatRating(team.averageElo)}
                </span>
              </div>
              <div className="space-y-2">
                {team.players.map((player) => (
                  <div key={player.profileId} className="flex items-start justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <div className="truncate font-medium">
                        {player.name}{player.isMe ? ` · ${tt('You')}` : ''}
                      </div>
                      <div className="mt-0.5 truncate text-[10px] text-muted-foreground">
                        {player.favoriteCivStats?.length
                          ? player.favoriteCivStats.slice(0, 5).map((civ) => gameName(civDisplayName(civ.civ))).join(' · ')
                          : player.favoriteCivs?.slice(0, 5).map((civ) => gameName(civDisplayName(civ))).join(' · ') || tt('Favourite civs unavailable')}
                      </div>
                      {player.favoriteCivStats && player.favoriteCivStats.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {player.favoriteCivStats.slice(0, 5).map((civ) => (
                            <span
                              key={civ.civ}
                              className="rounded border border-border/70 bg-background/30 px-1.5 py-0.5 text-[9px] text-muted-foreground"
                              title={`${gameName(civDisplayName(civ.civ))}: ${civ.games} ${tt('games')} · ${formatPercent(civ.winRate)}`}
                            >
                              {gameName(civDisplayName(civ.civ))} {civ.games}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 text-right tabular-nums text-muted-foreground">
                      <div>{tt(formatRankLevel(player.rankLevel))} · {tt('ELO')} {formatRating(player.elo ?? player.rating)}</div>
                      <div className="mt-0.5 text-[10px]">{tt('MMR')} {formatRating(player.mmr)}</div>
                      <div className="mt-0.5 text-[10px]">
                        {formatPercent(player.winRate)} · {player.winsCount ?? 0}W/{player.lossesCount ?? 0}L · {player.gamesCount ?? 0}g
                      </div>
                      {team.teamIndex > 0 && context.teamPartners.find((partner) => partner.profileId === player.profileId)?.likelyPremade && (
                        <div className="mt-0.5 text-[9px] text-amber-300">{tt('Likely premade')}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        {context.teamPartners.length > 0 && (
          <div className="rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs">
            <div className="font-semibold text-amber-200">{tt('Team coordination signal')}</div>
            <div className="mt-1 text-muted-foreground">
              {context.teamPartners
                .filter((partner) => partner.sharedGames > 0)
                .map((partner) => `${partner.name}: ${partner.sharedGames} ${tt('shared public games')}${partner.likelyPremade ? ` · ${tt('likely recurring duo')}` : ''}`)
                .join(' · ')}
            </div>
            <div className="mt-1 text-[10px] text-muted-foreground">
              {tt('Heuristic from public history, not direct matchmaking data.')}
            </div>
          </div>
        )}

        <section>
          <SectionHeading icon={<MapIcon className="h-3.5 w-3.5" />} title={tt('Civilization meta on this map')} />
          <div className="grid gap-2 sm:grid-cols-2">
            {context.civs.map((civ) => (
              <CivMetaRow key={civ.civ} civ={civ} />
            ))}
          </div>
        </section>

        <section>
          <SectionHeading icon={<Swords className="h-3.5 w-3.5" />} title={tt('Exact matchup')} />
          {context.matchups.length === 0 ? (
            <p className="rounded-md border border-border bg-card/50 px-3 py-2 text-xs text-muted-foreground">
              {tt('No matchup row was returned for this civilization pair.')}
            </p>
          ) : (
            <div className="space-y-2">
              {context.matchups.map((matchup) => (
                <div
                  key={`${matchup.civilization}-${matchup.opponentCivilization}`}
                  className="grid gap-2 rounded-md border border-border bg-card/50 px-3 py-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center"
                >
                  <div className="text-sm font-medium">{gameName(matchup.civilizationName)}</div>
                  <div className="text-center">
                    <div className="text-lg font-semibold tabular-nums">
                      {matchup.reliable ? formatPercent(matchup.winRate) : tt('Not enough data')}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {formatCount(matchup.games)} {tt('games')} · {formatDurationShort(matchup.durationMedianSec)} {tt('median')}
                    </div>
                  </div>
                  <div className="text-right text-sm font-medium">{gameName(matchup.opponentCivilizationName)}</div>
                </div>
              ))}
            </div>
          )}
        </section>

        {context.teamCompositions.length > 0 && (
          <section>
            <SectionHeading icon={<UsersRound className="h-3.5 w-3.5" />} title={tt('Exact team composition')} />
            <div className="grid gap-2 sm:grid-cols-2">
              {context.teamCompositions.map((composition) => (
                <div key={composition.teamIndex} className="rounded-md border border-border bg-card/50 px-3 py-2">
                  <div className="flex items-center justify-between gap-2 text-sm font-medium">
                    <span>{composition.civilizationNames.map(gameName).join(' + ')}</span>
                    <span className="text-xs text-muted-foreground">{composition.teamIndex === 0 ? tt('Your side') : tt('Opponents')}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs tabular-nums text-muted-foreground">
                    <span className="font-semibold text-foreground">{composition.reliable ? formatPercent(composition.winRate) : tt('Not enough data')}</span>
                    <span>{formatCount(composition.games)} {tt('games')}</span>
                    <span>{formatDurationShort(composition.durationMedianSec)} {tt('median')}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <SectionHeading icon={<Trophy className="h-3.5 w-3.5" />} title={tt('Age-up flow')} />
            <span className="text-[10px] text-muted-foreground">{ageupScopeLabel}</span>
          </div>
          <div className="space-y-4">
            {context.ageups.map((flow) => (
              <AgeupFlow key={flow.civ} flow={flow} />
            ))}
          </div>
        </section>

        <div className="flex gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          <span>
            {tt('Aggregate public meta only. It describes the bracket and map, not the personal build or live units of an opponent.')}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

function ScopeChip({ value }: { value: string }) {
  return <span className="rounded border border-primary/20 bg-primary/5 px-1.5 py-0.5">{value}</span>
}

function MatchFact({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-card/50 px-3 py-2">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
        <span className="text-primary">{icon}</span>
        {label}
      </div>
      <div className="mt-1 truncate text-sm font-semibold tabular-nums">{value}</div>
    </div>
  )
}

function SectionHeading({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <h3 className="rts-ledger-head mb-2 flex items-center gap-1.5">
      <span className="text-primary">{icon}</span>
      {title}
    </h3>
  )
}

function CivMetaRow({ civ }: { civ: ScoutMetaContext['civs'][number] }) {
  const { tt, gameName } = useI18n()
  return (
    <div className="rounded-md border border-border bg-card/50 px-3 py-2">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-medium">{gameName(civ.civName)}</span>
        <span className="tabular-nums text-muted-foreground">
          {civ.onMap?.reliable ? formatPercent(civ.onMap.winRate) : civ.onMap ? tt('Not enough data') : '—'}
          {civ.mapDelta != null && (
            <span className={civ.mapDelta >= 0 ? 'ml-1 text-win' : 'ml-1 text-loss'}>
              ({signed(civ.mapDelta)}%)
            </span>
          )}
        </span>
      </div>
      <div className="mt-1 text-[10px] text-muted-foreground">
        {tt('overall')} {formatPercent(civ.overall?.winRate)} · {civ.onMap?.games ?? 0} {tt('map games')}
      </div>
    </div>
  )
}

function AgeupFlow({ flow }: { flow: ScoutAgeupFlow }) {
  const { tt, gameName } = useI18n()
  return (
    <div className="rounded-md border border-border bg-card/50 p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="text-sm font-semibold">{gameName(flow.civName)}</h4>
        <span className="text-[10px] text-muted-foreground">
          {flow.games} {tt('sample games')} · {flow.reliable ? tt('reliable sample') : tt('Not enough data')}
        </span>
      </div>
      {flow.reliable && <div className="mt-2 grid gap-2 md:grid-cols-3">
        {flow.ages.map((age) => (
          <AgeColumn key={age.age} age={age} />
        ))}
      </div>}
      {flow.reliable && flow.paths.length > 0 && (
        <div className="mt-3 border-t border-border/70 pt-3">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {tt('Most common landmark paths')}
          </div>
          <div className="space-y-1">
            {flow.paths.slice(0, 5).map((path) => (
              <div key={`${path.age2}-${path.age3}-${path.age4}`} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 text-[11px]">
                <span className="truncate text-muted-foreground">
                  {[path.age2, path.age3, path.age4].filter(Boolean).join(' → ')}
                </span>
                <span className="tabular-nums">{path.share}%</span>
                <span className="tabular-nums text-muted-foreground">{formatPercent(path.winRate)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function AgeColumn({ age }: { age: ScoutAgeupFlow['ages'][number] }) {
  const { tt } = useI18n()
  return (
    <div className="rounded border border-border/70 px-2.5 py-2">
      <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide">
        <span>{ageLabel(age.age, tt)}</span>
        <span className="text-muted-foreground">{age.completedGames}/{age.totalGames}</span>
      </div>
      {age.endedBeforeGames > 0 && (
        <div className="mt-1 text-[10px] text-muted-foreground">
          {age.endedBeforeGames} {tt('ended before this age')}
        </div>
      )}
      <div className="mt-2 space-y-1.5">
        {age.landmarks.slice(0, 3).map((landmark) => (
          <LandmarkRow key={landmark.name} landmark={landmark} />
        ))}
        {age.landmarks.length === 0 && <div className="text-[10px] text-muted-foreground">—</div>}
      </div>
    </div>
  )
}

function ageLabel(age: 2 | 3 | 4, tt: (value: string) => string): string {
  return age === 2 ? tt('Feudal') : age === 3 ? tt('Castle') : tt('Imperial')
}

function signed(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}`
}

function elapsedFrom(startedAt: string | null, nowMs: number): number | null {
  if (!startedAt) return null
  const started = Date.parse(startedAt)
  if (!Number.isFinite(started)) return null
  return Math.max(0, Math.floor((nowMs - started) / 1000))
}

function LandmarkRow({ landmark }: { landmark: ScoutAgeupLandmark }) {
  const { tt } = useI18n()
  return (
    <div>
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <span className="flex min-w-0 items-center gap-1.5 truncate font-medium">
          {landmark.icon && <img src={landmark.icon} alt="" className="h-5 w-5 shrink-0 rounded object-contain" />}
          <span className="truncate">{landmark.name}</span>
        </span>
        <span className="shrink-0 tabular-nums">{landmark.pickRate}%</span>
      </div>
      <div className="mt-0.5 flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
        <span>{formatPercent(landmark.winRate)} · {landmark.games}g</span>
        <span title={tt('Typical / fastest age-up')}>
          {formatDurationShort(landmark.typicalSec)} / {formatDurationShort(landmark.fastestSec)}
        </span>
      </div>
    </div>
  )
}
