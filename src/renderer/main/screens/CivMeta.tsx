import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ArrowLeftRight,
  ArrowUpDown,
  BookOpen,
  Calculator,
  ChevronRight,
  ExternalLink,
  History,
  Info,
  ListOrdered,
  Map as MapIcon,
  RefreshCw,
  ShieldHalf,
  Swords,
  Table2,
} from 'lucide-react'
import type { RankLevel, StatsLeaderboard } from '@api/types'
import type { PoolMapCivRanking } from '@ipc/contract'
import type { CivTier, Tier } from '@domain/tierList'
import { TIERS } from '@domain/tierList'
import type { MapStat } from '@domain/mapStats'
import type { RankedMapPoolResolution } from '@domain/rankedMapPool'
import { isMapInPool } from '@domain/rankedMapPool'
import {
  RANK_FILTERS,
  rankLevelFilterable,
  ratingFiltersForLeaderboard,
} from '@domain/statsFilters'
import { CIV_PROFILES } from '@data/civProfiles'
import { BUNDLED_BUILD_ORDERS } from '@data/buildOrders'
import { counterPlanForCiv } from '@domain/civUnits'
import { buildIndexForCiv } from '@domain/buildOrderSchema'
import { COUNTER_MATRIX } from '@domain/counters'
import { counterRowsForCivs } from '@domain/unitCounterModel'
import { civDisplayName } from '@domain/civ'
import { buildPersonalMatchup, isGlobalMatchupLeaderboard } from '@domain/matchupLab'
import { filterPersonalHistory } from '@domain/historyFilters'
import {
  formatDurationShort,
  formatCount,
  formatLeaderboard,
  formatPercent,
  formatRankLevel,
  relativeTime,
} from '@shared/format'
import { cn } from '@shared/lib/utils'
import { PageHead } from '../components/PageHead'
import { WorkspaceNav } from '../components/WorkspaceNav'
import { Card, CardContent } from '@shared/components/ui/card'
import { Skeleton } from '@shared/components/ui/skeleton'
import { useCivMeta, useMatchupLab } from '../queries/useCivMeta'
import { useFullHistory } from '../queries/useHistory'
import { useSettings } from '../queries/useProfile'
import { TierBadge } from '../components/TierBadge'
import { EmptyBox, ErrorBox } from '../components/feedback'
import { useI18n } from '../../i18n'

const LADDERS: { label: string; value: StatsLeaderboard }[] = [
  { label: 'Ranked 1v1', value: 'rm_solo' },
  { label: 'Quick Match 1v1', value: 'qm_1v1' },
  { label: 'Ranked 2v2', value: 'rm_2v2' },
  { label: 'Ranked 3v3', value: 'rm_3v3' },
  { label: 'Ranked 4v4', value: 'rm_4v4' },
]

const PATCHES = [
  { label: 'Current patch', value: undefined },
  { label: '16.2.10604–11308', value: '10604,10884,11214,11308' },
  { label: '16.1.10056', value: '10056' },
] as const

const TABS = [
  { key: 'tier', label: 'Tier list', icon: ListOrdered },
  { key: 'stats', label: 'Civ stats', icon: Table2 },
  { key: 'matchups', label: 'Counter Lab', icon: Swords },
  { key: 'counter', label: 'Counter Calculator', icon: Calculator },
  { key: 'maps', label: 'Maps', icon: MapIcon },
] as const
type TabKey = (typeof TABS)[number]['key']

function rankedMapPoolFilterable(lb: StatsLeaderboard): boolean {
  return lb === 'rm_solo' || /^rm_[234]v[234]$/.test(lb)
}

type SortKey = 'civName' | 'winRate' | 'pickRate' | 'games'

export function CivMeta() {
  const { tt } = useI18n()
  const { data: settings } = useSettings()
  // Tab lives in the URL so a refresh or deep link restores it.
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const tab: TabKey = TABS.some((t) => t.key === tabParam) ? (tabParam as TabKey) : 'tier'
  const setTab = (key: TabKey) =>
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set('tab', key)
        return next
      },
      { replace: true },
    )
  const ladderParam = searchParams.get('ladder')
  const configuredLeaderboard = settings?.leaderboard
  const defaultLeaderboard: StatsLeaderboard = LADDERS.some(
    (entry) => entry.value === configuredLeaderboard,
  )
    ? (configuredLeaderboard as StatsLeaderboard)
    : 'rm_solo'
  const leaderboard: StatsLeaderboard = LADDERS.some((l) => l.value === ladderParam)
    ? (ladderParam as StatsLeaderboard)
    : defaultLeaderboard
  const rankParam = searchParams.get('rank')
  const rankLevel = rankLevelFilterable(leaderboard)
    ? RANK_FILTERS.find((b) => b.value === rankParam)?.value
    : undefined
  const ratingParam = searchParams.get('rating')
  const ratingOptions = ratingFiltersForLeaderboard(leaderboard)
  const rating = ratingOptions.some((entry) => entry.value === ratingParam)
    ? ratingParam || undefined
    : undefined
  const patchParam = searchParams.get('patch')
  const patch = PATCHES.some((entry) => entry.value === patchParam)
    ? patchParam || undefined
    : undefined
  const mapPoolOnly = rankedMapPoolFilterable(leaderboard) && searchParams.get('mapPool') !== 'all'
  const rawMapId = Number(searchParams.get('map'))
  const selectedMapId = Number.isSafeInteger(rawMapId) && rawMapId > 0 ? rawMapId : undefined
  const setLeaderboard = (value: StatsLeaderboard) =>
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value === 'rm_solo') next.delete('ladder')
        else next.set('ladder', value)
        if (!rankLevelFilterable(value)) next.delete('rank')
        if (!ratingFiltersForLeaderboard(value).some((entry) => entry.value === next.get('rating'))) {
          next.delete('rating')
        }
        return next
      },
      { replace: true },
    )
  const setRankLevel = (value: RankLevel | undefined) =>
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value) next.set('rank', value)
        else next.delete('rank')
        return next
      },
      { replace: true },
    )
  const setRating = (value: string | undefined) =>
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value) next.set('rating', value)
        else next.delete('rating')
        return next
      },
      { replace: true },
    )
  const setPatch = (value: string | undefined) =>
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value) next.set('patch', value)
        else next.delete('patch')
        return next
      },
      { replace: true },
    )
  const setMapPoolOnly = (value: boolean) =>
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value) next.delete('mapPool')
        else next.set('mapPool', 'all')
        return next
      },
      { replace: true },
    )
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({
    key: 'winRate',
    dir: 'desc',
  })

  const { data, isLoading, isFetching, refetch } = useCivMeta({
    leaderboard,
    rankLevel,
    rating,
    patch,
    mapId: tab === 'counter' ? selectedMapId : undefined,
    mapPoolOnly,
  })

  const maps = useMemo(() => (data?.ok ? data.data.maps : []), [data])
  const mapPool = data?.ok ? (data.data.mapPool ?? null) : null

  // The first active map is a useful default for the calculator. Without this
  // URL sync the map list rendered correctly, but the map-specific civ slice
  // stayed empty until the user made a second selection manually.
  useEffect(() => {
    if (tab !== 'counter' || maps.length === 0) return
    if (selectedMapId != null && maps.some((map) => map.mapId === selectedMapId)) return
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set('map', String(maps[0]!.mapId))
        return next
      },
      { replace: true },
    )
  }, [maps, selectedMapId, setSearchParams, tab])

  const sortedCivs = useMemo(() => {
    const civs = data?.ok ? data.data.civs : []
    const dir = sort.dir === 'asc' ? 1 : -1
    return [...civs].sort((a, b) => {
      if (sort.key === 'civName') return dir * a.civName.localeCompare(b.civName)
      return dir * (a[sort.key] - b[sort.key])
    })
  }, [data, sort])

  const byTier = useMemo(() => {
    const civs = data?.ok ? data.data.civs : []
    const grouped = Object.fromEntries(TIERS.map((t) => [t, [] as CivTier[]])) as Record<
      Tier,
      CivTier[]
    >
    for (const c of civs) grouped[c.tier].push(c)
    return grouped
  }, [data])

  const toggleSort = (key: SortKey) =>
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: key === 'civName' ? 'asc' : 'desc' },
    )

  return (
    <div className="animate-fade-in space-y-5">
      <PageHead
        kicker="The living meta"
        title="Civ Meta"
        sub="Live tier list, win/pick rates, matchups, and maps from AoE4World."
      />

      <WorkspaceNav workspace="intel" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors',
                tab === t.key
                  ? 'bg-secondary text-foreground'
                  : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
              )}
            >
              <t.icon className="h-3.5 w-3.5" />
              {tt(t.label)}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={leaderboard}
            onChange={(e) => setLeaderboard(e.target.value as StatsLeaderboard)}
            aria-label={tt('Leaderboard')}
            className="h-9 rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {LADDERS.map((l) => (
              <option key={l.value} value={l.value}>
                {tt(l.label)}
              </option>
            ))}
          </select>
          <select
            value={rankLevel ?? ''}
            disabled={!rankLevelFilterable(leaderboard)}
            onChange={(e) => setRankLevel((e.target.value || undefined) as RankLevel | undefined)}
            aria-label={tt('Rank bracket')}
            className="h-9 rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          >
            {RANK_FILTERS.map((b) => (
              <option key={b.label} value={b.value ?? ''}>
                {tt(b.label)}
              </option>
            ))}
          </select>
          <select
            value={rating ?? ''}
            onChange={(e) => setRating(e.target.value || undefined)}
            aria-label={tt('Rating range')}
            className="h-9 rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {ratingOptions.map((entry) => (
              <option key={entry.label} value={entry.value ?? ''}>
                {entry.label === 'All ratings' ? tt(entry.label) : entry.label}
              </option>
            ))}
          </select>
          <select
            value={patch ?? ''}
            onChange={(e) => setPatch(e.target.value || undefined)}
            aria-label={tt('Patch')}
            className="h-9 rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {PATCHES.map((entry) => (
              <option key={entry.label} value={entry.value ?? ''}>
                {entry.label === 'Current patch' ? tt(entry.label) : entry.label}
              </option>
            ))}
          </select>
          {rankedMapPoolFilterable(leaderboard) && (
            <button
              type="button"
              onClick={() => setMapPoolOnly(!mapPoolOnly)}
              aria-pressed={mapPoolOnly}
              className={cn(
                'inline-flex h-9 items-center rounded-md border px-3 text-sm transition-colors',
                mapPoolOnly
                  ? 'border-primary/50 bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:bg-secondary hover:text-foreground',
              )}
              title={tt('Show only maps in the active ranked rotation')}
            >
              {mapPoolOnly ? tt('Current map pool') : tt('All patch maps')}
            </button>
          )}
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-sm transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
            title={tt('Refresh')}
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
            {tt('Refresh')}
          </button>
        </div>
      </div>

      {!rankLevelFilterable(leaderboard) && (
        <p className="text-xs text-muted-foreground">
          {tt('Rank-band filtering isn’t available for team ladders — showing all ranks.')}
        </p>
      )}

      <div role="tabpanel">
        {tab === 'matchups' ? (
          <MatchupsTab
            leaderboard={leaderboard}
            rankLevel={rankLevel}
            rating={rating}
            patch={patch}
            mapPoolOnly={mapPoolOnly}
            mapPool={mapPool}
          />
        ) : isLoading ? (
          <Skeleton className="h-96" />
        ) : data && !data.ok ? (
          <ErrorBox message={data.error.message} onRetry={() => refetch()} />
        ) : data?.ok ? (
          <div className={cn('space-y-5', isFetching && 'opacity-60')}>
            {rankedMapPoolFilterable(leaderboard) && mapPool && (
              <MapPoolNotice mapPool={mapPool} filtered={mapPoolOnly} />
            )}
            {mapPoolOnly && data.data.metaScope === 'ranked-map-pool' && (
              <div className="rounded-lg border border-primary/25 bg-primary/5 p-3 text-xs text-muted-foreground">
                {tt('Civ meta is weighted across {maps} active ranked maps.').replace(
                  '{maps}',
                  String(data.data.metaPoolMapCount ?? 0),
                )}
              </div>
            )}
            {mapPoolOnly && data.data.metaScope === 'all-maps' && mapPool?.status === 'current' && (
              <div className="rounded-lg border border-warn/30 bg-warn/5 p-3 text-xs text-warn">
                {tt(
                  'The active map list is filtered, but per-map civ slices were unavailable; win and pick rates use the full current-patch dataset.',
                )}
              </div>
            )}
            {tab === 'tier' &&
              data.data.metaScope === 'ranked-map-pool' &&
              data.data.poolMapRankings && (
                <PoolBestCivPanel civs={data.data.civs} maps={data.data.poolMapRankings} />
              )}
            {tab === 'tier' && <TierTab byTier={byTier} />}
            {tab === 'stats' && <CivStatsTable civs={sortedCivs} sort={sort} onSort={toggleSort} />}
            {tab === 'maps' && <MapTable maps={maps} mapPool={mapPool} />}
            {tab === 'counter' && (
              <CounterCalculator
                maps={maps}
                selectedMapId={selectedMapId}
                civs={data.data.mapCivs ?? []}
                leaderboard={leaderboard}
                rankLevel={rankLevel}
                rating={rating}
                patch={patch}
                onMapChange={(mapId) =>
                  setSearchParams(
                    (prev) => {
                      const next = new URLSearchParams(prev)
                      next.set('map', String(mapId))
                      return next
                    },
                    { replace: true },
                  )
                }
              />
            )}

            <div className="flex items-start gap-2 rounded-lg border border-border bg-card/50 p-4 text-xs text-muted-foreground">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="leading-relaxed">
                {tt(
                  'Live aggregates from AoE4World ({games} games in this slice). Win rate near 50% is normal — a few points is a real edge across many games, but at beginner level your own fundamentals matter far more than civ choice. Per-patch history isn’t exposed by the API, so this reflects the current dataset.',
                ).replace('{games}', formatCount(data.data.totalCivGames))}
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function TierTab({ byTier }: { byTier: Record<Tier, CivTier[]> }) {
  const { tt, gameName } = useI18n()
  return (
    <div className="space-y-2">
      {TIERS.map((tier) => (
        <div
          key={tier}
          className="flex items-stretch gap-3 rounded-lg border border-border bg-card/40 p-2"
        >
          <div className="flex w-14 shrink-0 items-center justify-center">
            <TierBadge tier={tier} size="lg" />
          </div>
          <div className="flex flex-1 flex-wrap content-start gap-1.5">
            {byTier[tier].length === 0 && (
              <span className="self-center text-xs text-muted-foreground">{tt('— none —')}</span>
            )}
            {byTier[tier].map((c) => (
              <Link
                key={c.civ}
                to={`/civ/${c.civ}`}
                className="group flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1.5 text-sm transition-colors hover:border-primary/40 hover:bg-secondary"
                title={`${c.winRate}% win · ${c.pickRate}% pick · ${formatCount(c.games)} games`}
              >
                <span className="font-medium group-hover:text-primary">{gameName(c.civName)}</span>
                <span className="tabular-nums text-xs text-muted-foreground">{c.winRate}%</span>
                {c.lowSample && (
                  <span className="text-[10px] text-warn" title={tt('Low sample size')}>
                    ⚠
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function PoolBestCivPanel({ civs, maps }: { civs: CivTier[]; maps: PoolMapCivRanking[] }) {
  const { tt, gameName } = useI18n()
  return (
    <Card className="border-primary/25 bg-primary/[0.035]">
      <CardContent className="space-y-4 p-4">
        <div>
          <h3 className="text-sm font-semibold">{tt('Best civilizations for current map pool')}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {tt(
              'Pool-weighted ranking uses every active ranked map and the selected rank, rating, and patch filters.',
            )}
          </p>
        </div>

        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {tt('Overall pool ranking')}
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {civs.slice(0, 6).map((civ, index) => (
              <Link
                key={civ.civ}
                to={`/civ/${civ.civ}`}
                className="rounded-md border border-border bg-background/50 p-3 transition-colors hover:border-primary/40 hover:bg-secondary/50"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">
                    #{index + 1} {gameName(civ.civName)}
                  </span>
                  <TierBadge tier={civ.tier} />
                </div>
                <div className="mt-2 flex items-baseline justify-between text-xs">
                  <span className={civ.winRate >= 50 ? 'text-win' : 'text-loss'}>
                    {civ.winRate}% WR
                  </span>
                  <span className="text-muted-foreground">
                    {civ.pickRate}% {tt('pick')} · {formatCount(civ.games)} {tt('games')}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {tt('Best by map')}
          </p>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {maps.map((map) => (
              <div key={map.mapId} className="rounded-md border border-border bg-background/35 p-3">
                <p className="text-sm font-semibold">{gameName(map.map)}</p>
                <div className="mt-2 space-y-1.5">
                  {map.civs.map((civ, index) => (
                    <div key={civ.civ} className="flex items-center justify-between gap-2 text-xs">
                      <Link to={`/civ/${civ.civ}`} className="truncate hover:text-primary">
                        #{index + 1} {gameName(civ.civName)}
                      </Link>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {civ.winRate}% · {formatCount(civ.games)}
                        {civ.lowSample && <span className="ml-1 text-warn">⚠</span>}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function CivStatsTable({
  civs,
  sort,
  onSort,
}: {
  civs: CivTier[]
  sort: { key: SortKey; dir: 'asc' | 'desc' }
  onSort: (k: SortKey) => void
}) {
  const { tt } = useI18n()
  return (
    <Card>
      <CardContent className="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="rts-ledger-head px-4 py-2.5 text-left">
                <SortBtn label={tt('Civilization')} col="civName" sort={sort} onClick={onSort} />
              </th>
              <th className="rts-ledger-head px-2 py-2.5 text-center">{tt('Tier')}</th>
              <th className="rts-ledger-head px-2 py-2.5 text-right">
                <SortBtn label={tt('Win %')} col="winRate" sort={sort} onClick={onSort} right />
              </th>
              <th className="rts-ledger-head px-2 py-2.5 text-right">
                <SortBtn label={tt('Pick %')} col="pickRate" sort={sort} onClick={onSort} right />
              </th>
              <th className="rts-ledger-head px-4 py-2.5 text-right">
                <SortBtn label={tt('Games')} col="games" sort={sort} onClick={onSort} right />
              </th>
            </tr>
          </thead>
          <tbody>
            {civs.map((c) => (
              <CivRow key={c.civ} c={c} />
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}

function SortBtn({
  label,
  col,
  sort,
  onClick,
  right,
}: {
  label: string
  col: SortKey
  sort: { key: SortKey; dir: 'asc' | 'desc' }
  onClick: (k: SortKey) => void
  right?: boolean
}) {
  const active = sort.key === col
  return (
    <button
      type="button"
      onClick={() => onClick(col)}
      className={cn(
        'inline-flex items-center gap-1 hover:text-foreground',
        right && 'flex-row-reverse',
        active && 'text-foreground',
      )}
    >
      {label}
      <ArrowUpDown className={cn('h-3 w-3', active ? 'opacity-100' : 'opacity-40')} />
    </button>
  )
}

function CivRow({ c }: { c: CivTier }) {
  const { tt, gameName } = useI18n()
  const wrColor = c.winRate >= 52 ? 'text-win' : c.winRate < 48 ? 'text-loss' : ''
  return (
    <tr className="border-b border-border/60 last:border-0 hover:bg-secondary/40">
      <td className="px-4 py-2">
        <Link to={`/civ/${c.civ}`} className="font-medium hover:text-primary">
          {gameName(c.civName)}
        </Link>
        {c.lowSample && (
          <span className="ml-1.5 text-[10px] text-warn" title={tt('Low sample size')}>
            ⚠
          </span>
        )}
      </td>
      <td className="px-2 py-2 text-center">
        <div className="flex justify-center">
          <TierBadge tier={c.tier} />
        </div>
      </td>
      <td className={cn('px-2 py-2 text-right font-semibold tabular-nums', wrColor)}>
        {c.winRate}%
      </td>
      <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">{c.pickRate}%</td>
      <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
        {formatCount(c.games)}
      </td>
    </tr>
  )
}

function MapPoolNotice({
  mapPool,
  filtered,
}: {
  mapPool: RankedMapPoolResolution
  filtered: boolean
}) {
  const { tt } = useI18n()
  const captured = new Date(mapPool.snapshot.capturedAt).toLocaleDateString()
  const until = new Date(`${mapPool.snapshot.effectiveUntil}T00:00:00Z`).toLocaleDateString()
  const refresh = mapPool.autoRefresh
  const refreshSuffix =
    refresh?.status === 'error'
      ? ` · ${tt('auto refresh failed')}`
      : refresh?.lastCheckedAt
        ? ` · ${tt('auto checked')} ${new Date(refresh.lastCheckedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
        : ''
  const message =
    mapPool.status === 'current'
      ? filtered
        ? `${tt('Showing only the active ranked map pool')} · ${mapPool.maps.length} ${tt('maps')} · ${tt('as of')} ${captured} · ${tt('through')} ${until}${refreshSuffix}`
        : `${tt('Active ranked map pool available')} · ${mapPool.maps.length} ${tt('maps')} · ${tt('as of')} ${captured} · ${tt('filter disabled')}${refreshSuffix}`
      : `${tt('Map pool snapshot needs refresh')} · ${tt('showing the full AoE4World patch map list')}${refreshSuffix}`
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs">
      <span
        className={cn(mapPool.status === 'current' ? 'text-primary' : 'text-warn', refresh?.status === 'error' && 'text-warn')}
        title={refresh?.lastError ?? undefined}
      >
        {message}
      </span>
      <a
        href={mapPool.snapshot.sourceUrl}
        target="_blank"
        rel="noreferrer"
        className="text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
      >
        {tt('Map pool source')}
      </a>
    </div>
  )
}

function MapTable({ maps, mapPool }: { maps: MapStat[]; mapPool: RankedMapPoolResolution | null }) {
  const { tt, gameName } = useI18n()
  if (maps.length === 0) {
    return <EmptyBox>{tt('No map stats for this leaderboard yet — try another ladder.')}</EmptyBox>
  }
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <MapIcon className="h-4 w-4 text-primary" />
          {tt(mapPool?.status === 'current' ? 'Current ranked map pool' : 'Map pool')}
        </h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="rts-ledger-head py-2 pr-2 text-left">{tt('Map')}</th>
              <th className="rts-ledger-head px-2 py-2 text-right">{tt('Play %')}</th>
              <th className="rts-ledger-head px-2 py-2 text-right">{tt('Avg length')}</th>
              <th className="rts-ledger-head py-2 pl-2 text-right">{tt('Strongest civ')}</th>
            </tr>
          </thead>
          <tbody>
            {maps.map((m) => (
              <tr key={m.mapId} className="border-b border-border/60 last:border-0">
                <td className="py-2 pr-2 font-medium">{gameName(m.map)}</td>
                <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">
                  {m.pickRate}%
                </td>
                <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">
                  {formatDurationShort(m.durationAverageSec)}
                </td>
                <td className="py-2 pl-2 text-right text-muted-foreground">
                  {m.bestCivName ? gameName(m.bestCivName) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-[11px] text-muted-foreground">
          {tt(
            '“Strongest civ” is the single highest-win-rate civ per map (all the API exposes) — not a full civ×map table.',
          )}
        </p>
      </CardContent>
    </Card>
  )
}

/** Full map-aware replacement for AoE4World's Counter Calculator. */
function CounterCalculator({
  maps,
  selectedMapId,
  civs,
  leaderboard,
  rankLevel,
  rating,
  patch,
  onMapChange,
}: {
  maps: MapStat[]
  selectedMapId: number | undefined
  civs: CivTier[]
  leaderboard: StatsLeaderboard
  rankLevel: RankLevel | undefined
  rating: string | undefined
  patch: string | undefined
  onMapChange: (mapId: number) => void
}) {
  const { tt, gameName } = useI18n()
  const [opponentCiv, setOpponentCiv] = useState('french')
  const selected = maps.find((map) => map.mapId === selectedMapId) ?? maps[0]
  const sorted = [...civs].sort((a, b) => b.winRate - a.winRate || b.games - a.games)
  const leadingCiv = sorted[0]?.civ ?? 'english'
  const matchupQuery = useMatchupLab({
    civilization: leadingCiv,
    opponentCivilization: opponentCiv,
    leaderboard,
    rankLevel,
    rating,
    patch,
  })
  const matchup = matchupQuery.data?.ok ? matchupQuery.data.data : null
  const officialUrl = useMemo(() => {
    if (!selected) return null
    const url = new URL('https://aoe4world.com/tools/counter_calculator')
    url.searchParams.set('counter_map', selected.map)
    url.searchParams.set('counter_civilization', opponentCiv)
    if (rating) url.searchParams.set('counter_rating', rating)
    if (patch) url.searchParams.set('counter_patch', patch)
    return url.toString()
  }, [opponentCiv, patch, rating, selected])

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                <Calculator className="h-4 w-4 text-primary" />
                {tt('Best civilization by map')}
              </h3>
              <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
                {tt(
                  'Map ranking plus a directional matchup check. The official calculator link below keeps the exact AoE4World map/opponent/rating/patch query.',
                )}
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <label className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {tt('Map')}
                </span>
                <select
                  value={selectedMapId ?? ''}
                  onChange={(event) => onMapChange(Number(event.target.value))}
                  aria-label={tt('Map')}
                  className="h-9 min-w-48 rounded-md border border-border bg-background px-3 text-sm"
                >
                  <option value="" disabled>
                    {tt('Select a map')}
                  </option>
                  {maps.map((map) => (
                    <option key={map.mapId} value={map.mapId}>
                      {map.map}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {tt('Opponent civilization')}
                </span>
                <select
                  value={opponentCiv}
                  onChange={(event) => setOpponentCiv(event.target.value)}
                  aria-label={tt('Opponent civilization')}
                  className="h-9 min-w-44 rounded-md border border-border bg-background px-3 text-sm"
                >
                  {CIVS.map((civ) => (
                    <option key={civ.slug} value={civ.slug}>
                      {civ.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs">
            <span className="text-muted-foreground">
              {tt('Exact source filters')}: {selected?.map ?? '—'} · {civDisplayName(opponentCiv)} ·{' '}
              {rating ?? tt('All ratings')} · {patch ?? tt('Current patch')}
            </span>
            {officialUrl && (
              <a
                href={officialUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
              >
                {tt('Open exact AoE4World calculator')} <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
          {!selectedMapId ? (
            <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
              {tt('Select a map to load the complete civilization ranking.')}
            </p>
          ) : sorted.length === 0 ? (
            <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
              {tt('Loading map-specific civilization data…')}
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {sorted.map((civ, index) => (
                <div key={civ.civ} className="rounded-md border border-border bg-background/40 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">
                      #{index + 1} {gameName(civ.civName)}
                    </span>
                    <TierBadge tier={civ.tier} />
                  </div>
                  <div className="mt-2 flex items-baseline justify-between text-sm">
                    <span className={civ.winRate >= 50 ? 'text-win' : 'text-loss'}>
                      {civ.winRate}% WR
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatCount(civ.games)} {tt('games')}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div
                      className={cn(
                        'h-full rounded-full',
                        civ.winRate >= 50 ? 'bg-win' : 'bg-loss',
                      )}
                      style={{ width: `${Math.max(4, Math.min(100, civ.winRate))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
          {selected && sorted.length > 0 && (
            <div className="rounded-md border border-border bg-background/40 p-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">
                  {tt('Directional matchup for the current leader')}: {civDisplayName(leadingCiv)}{' '}
                  vs {civDisplayName(opponentCiv)}
                </span>
                {matchupQuery.isFetching && (
                  <span className="text-muted-foreground">{tt('Loading…')}</span>
                )}
              </div>
              {matchup ? (
                <div className="mt-2 flex flex-wrap gap-3 text-muted-foreground">
                  <span
                    className={
                      matchup.winRate != null && matchup.winRate >= 50 ? 'text-win' : 'text-loss'
                    }
                  >
                    {matchup.winRate != null ? `${matchup.winRate.toFixed(1)}% WR` : '—'}
                  </span>
                  <span>
                    {formatCount(matchup.games)} {tt('games')}
                  </span>
                  {matchup.durationMedianSec != null && (
                    <span>Med {formatDurationShort(matchup.durationMedianSec)}</span>
                  )}
                </div>
              ) : (
                <p className="mt-2 text-muted-foreground">
                  {tt('No directional matchup row for this filter slice.')}
                </p>
              )}
            </div>
          )}
          {selected && (
            <p className="text-[11px] text-muted-foreground">
              {selected.map} · {formatCount(selected.games)} {tt('games')} ·{' '}
              {tt('ranked sample from AoE4World')}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

const CIVS = Object.values(CIV_PROFILES)
  .map((c) => ({ slug: c.slug, name: c.name }))
  .sort((a, b) => a.name.localeCompare(b.name))

function CivSelect({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <label className="flex flex-1 flex-col gap-1">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {CIVS.map((c) => (
          <option key={c.slug} value={c.slug}>
            {c.name}
          </option>
        ))}
      </select>
    </label>
  )
}

function MatchupsTab({
  leaderboard,
  rankLevel,
  rating,
  patch,
  mapPoolOnly,
  mapPool,
}: {
  leaderboard: StatsLeaderboard
  rankLevel: RankLevel | undefined
  rating: string | undefined
  patch: string | undefined
  mapPoolOnly: boolean
  mapPool: RankedMapPoolResolution | null
}) {
  const { tt, gameName } = useI18n()
  const [myCiv, setMyCiv] = useState('english')
  const [oppCiv, setOppCiv] = useState('french')
  const [mapFilter, setMapFilter] = useState('')
  const [formatFilter, setFormatFilter] = useState('')

  const global = useMatchupLab({
    civilization: myCiv,
    opponentCivilization: oppCiv,
    leaderboard,
    rankLevel,
    rating,
    patch,
  })
  const history = useFullHistory()
  const { data: settings } = useSettings()
  const excludePractice = settings?.localData.excludeAiFromStats ?? false
  const matchup = global.data?.ok ? global.data.data : null
  const wr = matchup?.winRate ?? null
  const isFetching = global.isFetching
  const globalMatchupsAvailable = isGlobalMatchupLeaderboard(leaderboard)

  const plan = useMemo(() => counterPlanForCiv(oppCiv), [oppCiv])
  const unitCounterRows = useMemo(() => counterRowsForCivs(oppCiv, myCiv), [myCiv, oppCiv])
  const buildIndex = useMemo(() => buildIndexForCiv(BUNDLED_BUILD_ORDERS, myCiv), [myCiv])
  const build = buildIndex != null ? BUNDLED_BUILD_ORDERS[buildIndex]! : null
  const personalHistory = useMemo(() => {
    const base = filterPersonalHistory(history.data?.ok ? history.data.data : [], excludePractice)
    if (!mapPoolOnly) return base
    return base.filter((match) => isMapInPool(match.map, mapPool))
  }, [excludePractice, history.data, mapPool, mapPoolOnly])
  const personal = useMemo(
    () =>
      buildPersonalMatchup(personalHistory, {
        civilization: myCiv,
        opponentCivilization: oppCiv,
        map: mapFilter || undefined,
        format: formatFilter || undefined,
      }),
    [formatFilter, mapFilter, myCiv, oppCiv, personalHistory],
  )
  const mirror = myCiv === oppCiv

  useEffect(() => {
    setMapFilter('')
    setFormatFilter('')
  }, [myCiv, oppCiv])

  return (
    <div className="space-y-5">
      {mapPool && <MapPoolNotice mapPool={mapPool} filtered={mapPoolOnly} />}
      <div className="flex items-end gap-3 rounded-lg border border-border bg-card/50 p-4">
        <CivSelect label={tt('Your civ')} value={myCiv} onChange={setMyCiv} />
        <button
          type="button"
          onClick={() => {
            setMyCiv(oppCiv)
            setOppCiv(myCiv)
          }}
          className="mb-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          title={tt('Swap')}
        >
          <ArrowLeftRight className="h-4 w-4" />
        </button>
        <CivSelect label={tt('Opponent civ')} value={oppCiv} onChange={setOppCiv} />
      </div>

      <section className="rounded-lg border border-border bg-card/60 p-5 text-center">
        <div className="flex flex-wrap items-center justify-center gap-3 text-lg font-semibold">
          <span>{gameName(civDisplayName(myCiv))}</span>
          <Swords className="h-4 w-4 text-muted-foreground" />
          <span>{gameName(civDisplayName(oppCiv))}</span>
          {globalMatchupsAvailable && (
            <button
              type="button"
              onClick={() => void global.refetch()}
              disabled={isFetching}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs font-normal transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
              title={tt('Refresh')}
            >
              <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
              {tt('Refresh')}
            </button>
          )}
        </div>
        {!globalMatchupsAvailable ? (
          <p className="mt-3 text-left text-sm text-muted-foreground">
            {tt(
              'AoE4World does not publish a global matchup matrix for team queues. Your stored history below remains available.',
            )}
          </p>
        ) : global.data && !global.data.ok ? (
          <div className="mt-4 text-left">
            <ErrorBox message={global.data.error.message} onRetry={() => global.refetch()} />
          </div>
        ) : wr == null ? (
          <p className="mt-2 text-sm text-muted-foreground">
            {isFetching ? tt('Loading matchup…') : tt('No matchup data for this pairing.')}
          </p>
        ) : (
          <>
            <div
              className={cn(
                'mt-2 text-4xl font-bold tabular-nums',
                wr >= 50 ? 'text-win' : 'text-loss',
              )}
            >
              {Math.round(wr)}%
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {mirror
                ? tt('Mirror match — it comes down to play, not the civ.')
                : tt('{civ} directional win rate vs {opponent}')
                    .replace('{civ}', gameName(civDisplayName(myCiv)))
                    .replace('{opponent}', gameName(civDisplayName(oppCiv)))}
            </p>
          </>
        )}
        {matchup && (
          <>
            <div className="mt-5 grid gap-2 text-left sm:grid-cols-3">
              <Metric label={tt('Games in sample')} value={formatCount(matchup.games)} />
              {matchup.durationMedianSec != null && (
                <Metric
                  label={tt('Median duration')}
                  value={formatDurationShort(matchup.durationMedianSec)}
                />
              )}
              {matchup.durationAverageSec != null && (
                <Metric
                  label={tt('Average duration')}
                  value={formatDurationShort(matchup.durationAverageSec)}
                />
              )}
            </div>
            <div className="mt-4 flex items-start gap-2 rounded-md bg-background/60 p-3 text-left text-xs text-muted-foreground">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <p>
                {tt(formatLeaderboard(matchup.source.leaderboard))} /{' '}
                {matchup.source.rankLevel
                  ? tt(formatRankLevel(matchup.source.rankLevel))
                  : tt('All ranks')}{' '}
                / {tt('source patch')}{' '}
                {matchup.source.patch?.replace(/,/g, ', ') || tt('not reported')}.{' '}
                {tt(
                  "AoE4World's matchup endpoint does not expose a map filter, so this global sample is not map-filtered.",
                )}
              </p>
            </div>
          </>
        )}
      </section>

      <PersonalMatchupSection
        civilization={myCiv}
        opponentCivilization={oppCiv}
        history={history}
        personal={personal}
        mapFilter={mapFilter}
        formatFilter={formatFilter}
        onMapFilter={setMapFilter}
        onFormatFilter={setFormatFilter}
        excludePractice={excludePractice}
      />

      {plan ? (
        <section className="space-y-3 rounded-lg border border-border bg-card/50 p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <ShieldHalf className="h-4 w-4 text-primary" />
            {tt('How to beat')} {gameName(civDisplayName(oppCiv))}
          </h2>
          <div className="text-sm text-muted-foreground">
            {tt('They rely on')}{' '}
            <span className="font-medium text-foreground">
              {plan.keyUnits.map((u) => gameName(u.name)).join(', ')}
            </span>
            .
          </div>
          <div>
            <div className="text-sm">
              {tt('Build')}{' '}
              <span className="font-semibold text-foreground">
                {plan.counters.map((c) => tt(c.label)).join(' + ') || '—'}
              </span>
            </div>
            <ul className="mt-2 space-y-1.5">
              {plan.counters.map((c) => (
                <li key={c.role} className="flex gap-2 text-sm text-muted-foreground">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                  <span>
                    <span className="font-medium text-foreground">{tt(c.label)}</span> —{' '}
                    {tt(COUNTER_MATRIX[c.role].advice)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : (
        <p className="text-sm text-muted-foreground">
          {tt('No counter data for')} {gameName(civDisplayName(oppCiv))} {tt('yet')}.
        </p>
      )}

      {unitCounterRows.length > 0 && (
        <section className="space-y-3 rounded-lg border border-border bg-card/50 p-5">
          <div>
            <h2 className="text-sm font-semibold">{tt('Unit-level counter candidates')}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {tt(
                'War Room-inspired ranking over the vendored AoE4World unit snapshot. It combines role counters with age, cost and training time; active abilities and map effects are not simulated.',
              )}
            </p>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {unitCounterRows.map((row) => (
              <div
                key={row.target.id}
                className="rounded-md border border-border/70 bg-background/40 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{gameName(row.target.name)}</span>
                  <span className="text-[11px] text-muted-foreground">{tt('Age')} {row.target.minAge}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {row.candidates.map((candidate) => (
                    <span
                      key={candidate.unit.id}
                      className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] text-primary"
                      title={candidate.reasons.join(' · ')}
                    >
                      {gameName(candidate.unit.name)}
                    </span>
                  ))}
                  {row.candidates.length === 0 && (
                    <span className="text-xs text-muted-foreground">
                      {tt('No local unit answer')}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {build && buildIndex != null && (
        <section className="rounded-lg border border-border bg-card/50 p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <BookOpen className="h-4 w-4 text-primary" />
            {tt('Bundled build for')} {gameName(civDisplayName(myCiv))}
          </h2>
          <div className="mt-2 font-semibold">{build.name}</div>
          <p className="mt-1 text-xs text-muted-foreground">{buildMetadata(build)}</p>
          <Link
            to={`/guides?tab=builds&build=${buildIndex}`}
            className="mt-3 inline-flex items-center gap-0.5 text-xs font-medium text-primary hover:underline"
          >
            {tt('Open full build')}
            <ChevronRight className="h-3 w-3" />
          </Link>
        </section>
      )}
    </div>
  )
}

function buildMetadata(build: { name: string }): string {
  const details: string[] = []
  if ('archetype' in build && typeof build.archetype === 'string') {
    details.push(build.archetype)
  }
  if ('difficulty' in build && typeof build.difficulty === 'string') {
    details.push(build.difficulty)
  }
  return details.join(' / ')
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background/50 p-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-bold tabular-nums">{value}</div>
    </div>
  )
}

function PersonalMatchupSection({
  civilization,
  opponentCivilization,
  history,
  personal,
  mapFilter,
  formatFilter,
  onMapFilter,
  onFormatFilter,
  excludePractice,
}: {
  civilization: string
  opponentCivilization: string
  history: ReturnType<typeof useFullHistory>
  personal: ReturnType<typeof buildPersonalMatchup>
  mapFilter: string
  formatFilter: string
  onMapFilter: (value: string) => void
  onFormatFilter: (value: string) => void
  excludePractice: boolean
}) {
  const { tt, gameName } = useI18n()
  if (history.isLoading) return <Skeleton className="h-48" />
  if (history.data && !history.data.ok) {
    return <ErrorBox message={history.data.error.message} onRetry={() => history.refetch()} />
  }

  return (
    <section className="space-y-4 rounded-lg border border-border bg-card/50 p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <History className="h-4 w-4 text-primary" />
            Your stored history
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {tt('Exact')} {gameName(civDisplayName(civilization))} {tt('vs')}{' '}
            {gameName(civDisplayName(opponentCivilization))} {tt('results')}. These local filters do
            not change the global sample above.
            {excludePractice ? ' Practice games are hidden by your Settings preference.' : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={mapFilter}
            onChange={(event) => onMapFilter(event.target.value)}
            aria-label={tt('Personal history map')}
            className="h-8 rounded-md border border-border bg-background px-2 text-xs"
          >
            <option value="">{tt('All local maps')}</option>
            {personal.availableMaps.map((map) => (
              <option key={map} value={map}>
                {map}
              </option>
            ))}
          </select>
          <select
            value={formatFilter}
            onChange={(event) => onFormatFilter(event.target.value)}
            aria-label={tt('Personal history format')}
            className="h-8 rounded-md border border-border bg-background px-2 text-xs"
          >
            <option value="">{tt('All local formats')}</option>
            {personal.availableFormats.map((format) => (
              <option key={format} value={format}>
                {format}
              </option>
            ))}
          </select>
        </div>
      </header>

      {personal.sampleSize === 0 ? (
        <EmptyBox>
          {tt('No matching games in your stored history for these local filters.')}
        </EmptyBox>
      ) : (
        <>
          <div className="flex flex-wrap gap-4 text-sm">
            <span>
              <strong className="tabular-nums">{personal.sampleSize}</strong>{' '}
              <span className="text-muted-foreground">{tt('games')}</span>
            </span>
            <span className="text-win">
              <strong className="tabular-nums">{personal.wins}</strong> wins
            </span>
            <span className="text-loss">
              <strong className="tabular-nums">{personal.losses}</strong> losses
            </span>
            <span>
              <strong className="tabular-nums">{formatPercent(personal.winRate)}</strong>{' '}
              <span className="text-muted-foreground">{tt('decided win rate')}</span>
            </span>
          </div>

          <div className="divide-y divide-border rounded-md border border-border">
            {personal.matches.map((match) => (
              <Link
                key={match.id}
                to={`/game/${encodeURIComponent(match.id)}`}
                className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-secondary/50"
              >
                <span
                  className={cn(
                    'w-5 shrink-0 font-bold',
                    match.result === 'win'
                      ? 'text-win'
                      : match.result === 'loss'
                        ? 'text-loss'
                        : 'text-muted-foreground',
                  )}
                >
                  {match.result === 'win' ? 'W' : match.result === 'loss' ? 'L' : '-'}
                </span>
                <span className="min-w-36 flex-1 font-medium">{match.map}</span>
                <span className="text-xs text-muted-foreground">
                  {match.format ?? 'Unknown format'} / {formatDurationShort(match.durationSec)} /{' '}
                  {relativeTime(match.playedAt) || 'Date unavailable'}
                </span>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
