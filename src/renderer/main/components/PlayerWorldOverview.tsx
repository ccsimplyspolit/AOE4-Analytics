/**
 * Profile overview taken from AoE4World's player page: ladders, civs, maps,
 * teammates, opponents, rating history, previous seasons.
 * Challenges stay a live link — no public API.
 */

import { useMemo, useState } from 'react'
import { ExternalLink, History, Map as MapIcon, Swords, Trophy, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { CURRENT_META } from '@data/currentMeta'
import { foldEloIntoLadders } from '@domain/scouting'
import { groupLaddersBySeason } from '@domain/playerWorldOverview'
import type {
  MapUsage,
  ModeCivGroup,
  PlayerSocialLinks,
  PreviousSeason,
  RankInfo,
  RatingHistorySeries,
  TeammateStat,
} from '@domain/types'
import {
  formatLeaderboard,
  formatPercent,
  formatRankLevel,
  formatRating,
  rankColor,
  relativeTime,
  countryFlag,
} from '@shared/format'
import { FoldableCard } from './FoldableCard'
import { RatingChart } from './RatingChart'
import { WinRateBar } from './WinRateBar'
import { useI18n } from '../../i18n'
import { cn } from '@shared/lib/utils'

export function PlayerWorldOverview({
  profileId,
  name,
  country,
  avatarUrl,
  steamId,
  social,
  lastGameAt,
  siteUrl,
  modes,
  modeCivGroups,
  ratingHistories,
  teammates,
  opponents,
  maps,
  previousSeasons,
}: {
  profileId: number
  name: string
  country?: string | null
  avatarUrl?: string | null
  steamId?: string | null
  social?: PlayerSocialLinks
  lastGameAt?: string | null
  siteUrl: string | null
  modes: RankInfo[]
  modeCivGroups: ModeCivGroup[]
  ratingHistories: RatingHistorySeries[]
  teammates: TeammateStat[]
  opponents: TeammateStat[]
  maps: MapUsage[]
  previousSeasons: PreviousSeason[]
}) {
  const { tt, gameName } = useI18n()
  const worldUrl = siteUrl ?? `https://aoe4world.com/players/${profileId}`
  const modeRows = useMemo(() => foldEloIntoLadders(modes), [modes])
  const rankedModeRows = useMemo(
    () =>
      modeRows.filter(
        (row) => !row.leaderboard.startsWith('qm_') && !row.leaderboard.startsWith('Quick Match'),
      ),
    [modeRows],
  )
  const qmModeRows = useMemo(
    () =>
      modeRows.filter(
        (row) => row.leaderboard.startsWith('qm_') || row.leaderboard.startsWith('Quick Match'),
      ),
    [modeRows],
  )
  const liveSeason = useMemo(() => {
    const seasons = [
      ...new Set(
        rankedModeRows.map((row) => row.season).filter((season): season is number => season != null),
      ),
    ]
    return seasons[0] ?? CURRENT_META.season
  }, [rankedModeRows])
  const seasonGroups = useMemo(
    () => groupLaddersBySeason(rankedModeRows, previousSeasons, liveSeason),
    [rankedModeRows, previousSeasons, liveSeason],
  )
  const [civMode, setCivMode] = useState(modeCivGroups[0]?.mode ?? '')
  const [historyMode, setHistoryMode] = useState(ratingHistories[0]?.mode ?? '')
  const [seasonPick, setSeasonPick] = useState<number | null>(null)
  const civGroup = modeCivGroups.find((group) => group.mode === civMode) ?? modeCivGroups[0]
  const historySeries =
    ratingHistories.find((series) => series.mode === historyMode) ?? ratingHistories[0]
  const selectedSeason = seasonGroups.some((group) => group.season === seasonPick)
    ? seasonPick
    : liveSeason
  const activeGroup = seasonGroups.find((group) => group.season === selectedSeason) ?? seasonGroups[0]
  const showingLive = activeGroup?.live === true
  const socialEntries = useMemo(() => listedSocial(social), [social])

  return (
    <div className="space-y-4">
      {(avatarUrl || lastGameAt || steamId || socialEntries.length > 0) && (
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {avatarUrl && (
            <img
              src={avatarUrl}
              alt=""
              className="h-10 w-10 rounded-md border border-border object-cover"
            />
          )}
          <div className="min-w-0 space-y-0.5">
            {lastGameAt && (
              <div>
                {tt('Last game')} · {relativeTime(lastGameAt) || lastGameAt}
              </div>
            )}
            {country && <div>{countryFlag(country)}</div>}
            <div className="flex flex-wrap gap-2">
              {steamId && (
                <a
                  href={`https://steamcommunity.com/profiles/${steamId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline"
                >
                  Steam
                </a>
              )}
              {socialEntries.map(([label, href]) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline"
                >
                  {label}
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <WorldLink href={worldUrl} label={tt('Overview')} />
        <WorldLink href={`${worldUrl.replace(/\/$/, '')}/games`} label={tt('Games')} />
        <WorldLink href={`${worldUrl.replace(/\/$/, '')}/challenges`} label={tt('Challenges')} />
      </div>

      {(rankedModeRows.length > 0 || previousSeasons.length > 0) && (
        <FoldableCard
          id="world-overview-rated"
          icon={Trophy}
          title={tt('Rated modes')}
          trailing={
            seasonGroups.length > 1 ? (
              <SeasonPills
                seasons={seasonGroups.map((group) => group.season)}
                selected={selectedSeason}
                onSelect={setSeasonPick}
              />
            ) : null
          }
        >
          {showingLive ? (
            <div className="overflow-hidden rounded-md border border-border">
              {rankedModeRows.map((m) => (
                <div
                  key={m.leaderboard}
                  className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-border px-3 py-2 text-sm last:border-0"
                >
                  <div>
                    <div className="font-medium">{tt(formatLeaderboard(m.leaderboard))}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {m.streak != null && m.streak !== 0
                        ? `${m.streak > 0 ? `+${m.streak}` : m.streak} ${tt('streak')}`
                        : null}
                      {m.dropsCount ? ` · ${m.dropsCount} ${tt('drops')}` : ''}
                      {m.disputesCount ? ` · ${m.disputesCount} ${tt('disputes')}` : ''}
                      {m.maxRating != null ? ` · ${tt('Peak')} ${formatRating(m.maxRating)}` : ''}
                      {m.maxRating7d != null ? ` · ${tt('7d')} ${formatRating(m.maxRating7d)}` : ''}
                      {m.maxRating1m != null ? ` · ${tt('30d')} ${formatRating(m.maxRating1m)}` : ''}
                      {m.matchmakingElo != null && m.matchmakingElo !== m.rating
                        ? ` · ${tt('Matchmaking Elo')} ${formatRating(m.matchmakingElo)}`
                        : ''}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 text-xs text-muted-foreground">
                    <span style={{ color: rankColor(m.rankLevel) }}>{tt(formatRankLevel(m.rankLevel))}</span>
                    <span className="tabular-nums text-foreground">{formatRating(m.rating)}</span>
                    {m.rank != null && <span>#{m.rank}</span>}
                    <span className="tabular-nums">
                      {m.winsCount != null && m.lossesCount != null
                        ? `${m.winsCount}W ${m.lossesCount}L`
                        : `${m.gamesCount} ${tt('games')}`}
                      {' · '}
                      {formatPercent(m.winRate)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-hidden rounded-md border border-border">
              {(activeGroup?.rows ?? []).map((row) => (
                <div
                  key={`${row.mode}-${row.season}`}
                  className="flex flex-wrap items-center justify-between gap-x-4 border-b border-border px-3 py-2 text-xs last:border-0"
                >
                  <span>{tt(formatLeaderboard(row.mode))}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {tt(formatRankLevel(row.rankLevel))} · {formatRating(row.rating)}
                    {row.rank != null ? ` · #${row.rank}` : ''}
                    {row.winsCount != null && row.lossesCount != null
                      ? ` · ${row.winsCount}W ${row.lossesCount}L`
                      : ` · ${row.gamesCount} ${tt('games')}`}
                  </span>
                </div>
              ))}
            </div>
          )}
          {showingLive && qmModeRows.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {tt('Quick Match')}
              </h4>
              <div className="overflow-hidden rounded-md border border-border">
                {qmModeRows.map((m) => (
                  <div
                    key={m.leaderboard}
                    className="flex flex-wrap items-center justify-between gap-x-4 border-b border-border px-3 py-2 text-xs last:border-0"
                  >
                    <span className="font-medium">{tt(formatLeaderboard(m.leaderboard))}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {formatRating(m.rating)} · {m.gamesCount} {tt('games')}
                      {' · '}
                      {formatPercent(m.winRate)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {tt(
              'Ranked Team is the combined team ladder. 2v2 / 3v3 / 4v4 are the same ranked games split by size. Hidden matchmaking Elo is folded into each row — not a second rank.',
            )}
          </p>
        </FoldableCard>
      )}

      {historySeries && historySeries.points.length >= 2 && (
        <FoldableCard
          id="world-overview-history"
          icon={History}
          title={tt('Rating History')}
          trailing={
            ratingHistories.length > 1 ? (
              <ModePills
                modes={ratingHistories.map((series) => series.mode)}
                selected={historySeries.mode}
                onSelect={setHistoryMode}
              />
            ) : null
          }
        >
          <RatingChart points={historySeries.points.map((point) => ({ rating: point.rating }))} />
        </FoldableCard>
      )}

      {civGroup && civGroup.civs.length > 0 && (
        <FoldableCard
          id="world-overview-civs"
          icon={Swords}
          title={tt('Civilizations')}
          trailing={
            modeCivGroups.length > 1 ? (
              <ModePills
                modes={modeCivGroups.map((group) => group.mode)}
                selected={civGroup.mode}
                onSelect={setCivMode}
              />
            ) : null
          }
        >
          <div className="space-y-2">
            {civGroup.civs.map((civ) => (
              <div key={`${civ.mode}-${civ.civ}`}>
                <div className="mb-0.5 flex justify-between text-xs">
                  <span>{gameName(civ.civName)}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {formatPercent(civ.winRate)} · {civ.games} {tt('games')}
                    {civ.pickRate != null ? ` · ${civ.pickRate}% ${tt('pick')}` : ''}
                  </span>
                </div>
                <WinRateBar winRate={civ.winRate ?? 0} />
              </div>
            ))}
          </div>
        </FoldableCard>
      )}

      {maps.length > 0 && (
        <FoldableCard id="world-overview-maps" icon={MapIcon} title={tt('Maps')}>
          <div className="space-y-2">
            {maps.map((map) => (
              <div key={map.map} className="flex items-center justify-between text-xs">
                <span>{gameName(map.map)}</span>
                <span className="tabular-nums text-muted-foreground">
                  {map.wins}W {map.games - map.wins}L · {formatPercent(map.winRate)} · {map.games}{' '}
                  {tt('games')}
                </span>
              </div>
            ))}
          </div>
        </FoldableCard>
      )}

      {teammates.length > 0 && (
        <PartnerList id="world-overview-teammates" title={tt('Top teammates')} people={teammates} />
      )}
      {opponents.length > 0 && (
        <PartnerList id="world-overview-opponents" title={tt('Frequent opponents')} people={opponents} />
      )}

      <FoldableCard id="world-overview-challenges" title={tt('Challenges')}>
        <p className="text-xs text-muted-foreground">
          {tt(
            'Art of War, Historic Battles and The Crucible times are not in the public API. Open the live Challenges page on AoE4World.',
          )}
        </p>
        <a
          href={`https://aoe4world.com/players/${profileId}/challenges`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          {tt("{name}'s Challenges").replace('{name}', name)} <ExternalLink className="h-3 w-3" />
        </a>
      </FoldableCard>
    </div>
  )
}

function PartnerList({
  id,
  title,
  people,
}: {
  id: string
  title: string
  people: TeammateStat[]
}) {
  const { tt } = useI18n()
  return (
    <FoldableCard id={id} icon={Users} title={title}>
      <div className="space-y-1.5">
        {people.map((mate) => (
          <Link
            key={mate.profileId}
            to={`/profile/${mate.profileId}`}
            className="flex items-center justify-between rounded-md px-2 py-1.5 text-xs hover:bg-secondary/50"
          >
            <span className="font-medium">{mate.name}</span>
            <span className="tabular-nums text-muted-foreground">
              {mate.wins}W {mate.games - mate.wins}L · {mate.games} {tt('games')} ·{' '}
              {formatPercent(mate.winRate)}
            </span>
          </Link>
        ))}
      </div>
    </FoldableCard>
  )
}

function ModePills({
  modes,
  selected,
  onSelect,
}: {
  modes: string[]
  selected: string
  onSelect: (mode: string) => void
}) {
  const { tt } = useI18n()
  return (
    <div className="flex flex-wrap gap-1">
      {modes.map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => onSelect(mode)}
          className={cn(
            'rounded-md border px-2 py-0.5 text-[11px]',
            mode === selected
              ? 'border-primary/50 bg-primary/10 text-foreground'
              : 'border-border text-muted-foreground hover:text-foreground',
          )}
        >
          {tt(formatLeaderboard(mode))}
        </button>
      ))}
    </div>
  )
}

function SeasonPills({
  seasons,
  selected,
  onSelect,
}: {
  seasons: number[]
  selected: number | null
  onSelect: (season: number) => void
}) {
  const { tt } = useI18n()
  return (
    <div className="flex flex-wrap gap-1" role="tablist" aria-label={tt('Ranked season')}>
      {seasons.map((season) => (
        <button
          key={season}
          type="button"
          role="tab"
          aria-selected={season === selected}
          onClick={() => onSelect(season)}
          className={cn(
            'rounded-md border px-2 py-0.5 text-[11px]',
            season === selected
              ? 'border-primary/50 bg-primary/10 text-foreground'
              : 'border-border text-muted-foreground hover:text-foreground',
          )}
        >
          {tt('Season')} {season}
        </button>
      ))}
    </div>
  )
}

function WorldLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-muted-foreground hover:text-foreground"
    >
      {label} <ExternalLink className="h-3 w-3" />
    </a>
  )
}

function listedSocial(social: PlayerSocialLinks | undefined) {
  if (!social) return [] as [string, string][]
  const rows: [string, string][] = []
  if (social.twitch) rows.push(['Twitch', socialHref(social.twitch, 'https://twitch.tv/')])
  if (social.youtube) rows.push(['YouTube', socialHref(social.youtube, 'https://youtube.com/')])
  if (social.twitter) rows.push(['X', socialHref(social.twitter, 'https://x.com/')])
  if (social.instagram) rows.push(['Instagram', socialHref(social.instagram, 'https://instagram.com/')])
  if (social.liquipedia) rows.push(['Liquipedia', social.liquipedia])
  return rows
}

function socialHref(value: string, prefix: string) {
  if (/^https?:\/\//i.test(value)) return value
  return prefix + value.replace(/^@/, '')
}
