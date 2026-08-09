import { useMemo, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Database, RefreshCw, RotateCcw } from 'lucide-react'
import {
  aggregateDataStudioGames,
  DATA_STUDIO_LEGACY_UNKNOWN,
  DATA_STUDIO_LOCAL_UNKNOWN,
  DATA_STUDIO_SEARCH_PARAMS,
  DATA_STUDIO_UNKNOWN,
  dataStudioCoverage,
  dataStudioFilterOptions,
  dataStudioGameFromStored,
  DEFAULT_DATA_STUDIO_FILTERS,
  filterDataStudioGames,
  parseDataStudioFilters,
  type CountedOption,
  type DataStudioFilterOptions,
  type DataStudioFilters,
  type DataStudioGame,
  type DataStudioMetric,
} from '@domain/dataStudio'
import { civDisplayName } from '@domain/civ'
import { snapshotFreshness } from '@domain/sourceSnapshot'
import { DATA_SOURCE_REGISTRY } from '@data/dataSources'
import { filterPersonalHistory } from '@domain/historyFilters'
import { formatDurationShort } from '@shared/format'
import { cn } from '@shared/lib/utils'
import { Card, CardContent } from '@shared/components/ui/card'
import { PageHead } from '../components/PageHead'
import { EmptyBox, ErrorBox, Spinner } from '../components/feedback'
import { useFullHistory } from '../queries/useHistory'
import { useSettings } from '../queries/useProfile'
import { useI18n } from '../../i18n'
import { ipc } from '@shared/ipc'

type FilterKey = keyof DataStudioFilters

export function DataStudio() {
  const { tt } = useI18n()
  const { data, isLoading, refetch } = useFullHistory()
  const { data: settings } = useSettings()
  const [searchParams, setSearchParams] = useSearchParams()
  const [nowMs] = useState(() => Date.now())
  const search = searchParams.toString()
  const filters = useMemo(() => parseDataStudioFilters(new URLSearchParams(search)), [search])
  const excludePractice = settings?.localData.excludeAiFromStats ?? false
  const matches = useMemo(
    () => filterPersonalHistory(data?.ok ? data.data : [], excludePractice),
    [data, excludePractice],
  )
  const games = useMemo(
    () => matches.map((match) => dataStudioGameFromStored(match, settings?.profileId ?? null)),
    [matches, settings?.profileId],
  )
  const filtered = useMemo(
    () => filterDataStudioGames(games, filters, nowMs),
    [filters, games, nowMs],
  )
  const aggregate = useMemo(() => aggregateDataStudioGames(filtered), [filtered])
  const options = useMemo(() => dataStudioFilterOptions(games), [games])
  const coverage = useMemo(() => dataStudioCoverage(games), [games])

  function setFilter(key: FilterKey, value: string) {
    const next = new URLSearchParams(searchParams)
    const param = DATA_STUDIO_SEARCH_PARAMS[key]
    if (!value || value === DEFAULT_DATA_STUDIO_FILTERS[key]) next.delete(param)
    else next.set(param, value)
    setSearchParams(next, { replace: true })
  }

  function resetFilters() {
    setSearchParams(new URLSearchParams(), { replace: true })
  }

  const hasFilters = searchParams.size > 0

  return (
    <div className="animate-fade-in space-y-6">
      <PageHead
        kicker="Personal match lab"
        title="Data Studio"
        sub="Filter your own synced history and inspect the sample behind every average."
        aside={
          <button
            type="button"
            onClick={resetFilters}
            disabled={!hasFilters}
            className="inline-flex items-center gap-2 rounded-sm border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {tt('Reset view')}
          </button>
        }
      />

      <DataSourcePanel />

      {isLoading && <Spinner label={tt('Loading personal match data...')} />}
      {!isLoading && data && !data.ok && (
        <ErrorBox message={data.error.message} onRetry={() => refetch()} />
      )}
      {!isLoading && data?.ok && games.length === 0 && (
        <EmptyBox>
          <div className="space-y-1">
            <p>{tt('No synced matches to explore yet.')}</p>
            <p className="text-xs">{tt('Sync recent games from My Stats, then return here.')}</p>
          </div>
        </EmptyBox>
      )}

      {!isLoading && data?.ok && games.length > 0 && (
        <>
          <FilterPanel filters={filters} options={options} onChange={setFilter} />

          <p className="rounded-sm border border-border/70 bg-background/40 px-3 py-2 text-xs text-muted-foreground">
            {tt(
              'Personal history only: {publicPatchKnown}/{publicGames} loaded public matches include a stored patch and {publicSeasonKnown}/{publicGames} include a season. {legacyPatchUnknown} legacy public matches lack patch metadata and {legacySeasonUnknown} lack season metadata{localSuffix} Filters show correlation in your matches, not patch causality or global performance.{practiceSuffix}',
            )
              .replace('{publicPatchKnown}', String(coverage.publicPatchKnown))
              .replace('{publicGames}', String(coverage.publicGames))
              .replace('{publicSeasonKnown}', String(coverage.publicSeasonKnown))
              .replace('{legacyPatchUnknown}', String(coverage.legacyPatchUnknown))
              .replace('{legacySeasonUnknown}', String(coverage.legacySeasonUnknown))
              .replace(
                '{localSuffix}',
                coverage.localGames > 0
                  ? ` ${coverage.localGames} ${tt('local/custom matches cannot be assigned a public patch.')}`
                  : '.',
              )
              .replace(
                '{practiceSuffix}',
                excludePractice ? ` ${tt('Practice games are hidden by your Settings preference.')}` : '',
              )}
          </p>

          <section className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">
                  {tt('Filtered performance')}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {tt('{shown} of {total} loaded matches fit this view.')
                    .replace('{shown}', String(aggregate.games))
                    .replace('{total}', String(games.length))}
                </p>
              </div>
              <span className="text-[11px] text-muted-foreground">
                {tt('Each tile uses only games where that metric was observed.')}
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <MetricCard
                label={tt('Win rate')}
                metric={aggregate.winRate}
                value={formatPercent(aggregate.winRate.value)}
                detail={`${aggregate.wins}W-${aggregate.losses}L${aggregate.unknownResults > 0 ? `; ${aggregate.unknownResults} unknown` : ''}`}
              />
              <MetricCard
                label={tt('Average duration')}
                metric={aggregate.averageDurationSec}
                value={formatDurationShort(aggregate.averageDurationSec.value)}
                detail={tt('Mean of matches with a recorded duration')}
              />
              <MetricCard
                label={tt('Rating change')}
                metric={aggregate.averageRatingChange}
                value={formatSigned(aggregate.averageRatingChange.value)}
                detail={
                  aggregate.totalRatingChange.value == null
                    ? tt('No rating delta recorded')
                    : `${formatSigned(aggregate.totalRatingChange.value)} ${tt('net across the same sample')}`
                }
              />
              <MetricCard
                label={tt('APM')}
                metric={aggregate.averageApm}
                value={formatNumber(aggregate.averageApm.value, 1)}
                detail={tt('Mean observed actions per minute')}
              />
              <MetricCard
                label={tt('Resources / min')}
                metric={aggregate.averageResourcesPerMinute}
                value={formatNumber(aggregate.averageResourcesPerMinute.value, 0)}
                detail={tt('Mean observed resource-gather rate')}
              />
              <MetricCard
                label={tt('Villagers / min')}
                metric={aggregate.averageVillagersPerMinute}
                value={formatNumber(aggregate.averageVillagersPerMinute.value, 1)}
                detail={tt('Mean observed villager-production rate')}
              />
            </div>
          </section>

          <MatchTable games={filtered} />
        </>
      )}
    </div>
  )
}

function DataSourcePanel() {
  const { tt } = useI18n()
  const active = DATA_SOURCE_REGISTRY.filter((source) => source.status === 'active').length
  const patchAware = DATA_SOURCE_REGISTRY.filter((source) => source.patchAware).length
  const [syncing, setSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState<string | null>(null)
  const [syncOutput, setSyncOutput] = useState<string | null>(null)

  async function runSourceSync(dryRun: boolean) {
    if (syncing) return
    setSyncing(true)
    setSyncStatus(null)
    setSyncOutput(null)
    const result = await ipc.syncExternalSources({ dryRun })
    if (!result.ok) {
      setSyncStatus(result.error.message)
      setSyncing(false)
      return
    }
    const completed = result.data.completed.length
      ? result.data.completed.join(', ')
      : tt('No source steps reported')
    setSyncStatus(
      `${dryRun ? tt('Source check completed') : tt('Source refresh completed')}: ${completed}${
        result.data.restartRequired ? ` · ${tt('Restart the app to load refreshed bundled snapshots.')}` : ''
      }`,
    )
    setSyncOutput(result.data.output.trim().slice(-4_000) || null)
    setSyncing(false)
  }

  return (
    <div className="rounded-sm border border-border bg-card/50">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2 text-sm font-medium">
          <Database className="h-4 w-4 shrink-0 text-primary" />
          <span className="truncate">{tt('Data sources and coverage')}</span>
          <span className="shrink-0 text-[11px] font-normal text-muted-foreground">
            {active} {tt('active')} · {patchAware} {tt('patch-aware')}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => runSourceSync(true)}
            disabled={syncing}
            className="inline-flex items-center gap-1.5 rounded-sm border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:cursor-wait disabled:opacity-50"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', syncing && 'animate-spin')} />
            {tt('Check sources')}
          </button>
          <button
            type="button"
            onClick={() => runSourceSync(false)}
            disabled={syncing}
            className="inline-flex items-center gap-1.5 rounded-sm bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-wait disabled:opacity-50"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', syncing && 'animate-spin')} />
            {tt('Refresh snapshots')}
          </button>
        </div>
      </div>
      {(syncStatus || syncOutput) && (
        <div className="border-t border-border px-4 py-2">
          {syncStatus && <p className="text-xs text-muted-foreground">{syncStatus}</p>}
          {syncOutput && (
            <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap rounded-sm bg-background/60 p-2 text-[10px] leading-relaxed text-muted-foreground">
              {syncOutput}
            </pre>
          )}
        </div>
      )}
      <details className="group border-t border-border">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
          <span>{tt('Show source coverage')}</span>
          <span className="text-[11px] font-normal text-muted-foreground">{tt('provenance')}</span>
        </summary>
        <div className="border-t border-border px-4 py-3">
        <p className="mb-3 max-w-4xl text-xs leading-relaxed text-muted-foreground">
          {tt(
            'Every number in this screen is tagged by its data boundary: live API, bundled snapshot, local files, or an optional research adapter. Optional sources are not silently treated as current game truth.',
          )}
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-xs">
            <thead className="border-b border-border text-left text-muted-foreground">
              <tr>
                <th className="px-2 py-2 font-medium">{tt('Source')}</th>
                <th className="px-2 py-2 font-medium">{tt('Mode')}</th>
                <th className="px-2 py-2 font-medium">{tt('Coverage')}</th>
                <th className="px-2 py-2 text-right font-medium">{tt('Records')}</th>
                <th className="px-2 py-2 font-medium">{tt('Version / capture')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {DATA_SOURCE_REGISTRY.map((source) => (
                <tr key={source.id} className="align-top">
                  <td className="px-2 py-2">
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-primary hover:underline"
                    >
                      {tt(source.label)}
                    </a>
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">
                      {tt(source.integration)}
                    </span>
                  </td>
                  <td className="px-2 py-2">
                    <span
                      className={cn(
                        'rounded-sm px-1.5 py-0.5 font-medium',
                        source.status === 'active'
                          ? 'bg-win/15 text-win'
                          : source.status === 'optional'
                            ? 'bg-warn/15 text-warn'
                            : 'bg-secondary text-muted-foreground',
                      )}
                    >
                      {tt(source.mode)}
                    </span>
                    {source.patchAware && (
                      <span className="mt-1 block text-[10px] text-primary">{tt('patch-aware')}</span>
                    )}
                  </td>
                  <td className="max-w-[360px] px-2 py-2 text-muted-foreground">
                    {localizedSourceText(source.coverage, tt)}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">
                    {source.records == null ? '—' : source.records.toLocaleString()}
                  </td>
                  <td className="px-2 py-2 text-muted-foreground">
                    {tt(source.version ?? 'live / external')}
                    {source.revision && (
                      <span className="mt-0.5 block text-[10px]">
                        rev {source.revision.slice(0, 12)}
                      </span>
                    )}
                    {source.capturedAt && (
                      <span className="mt-0.5 block text-[10px]">
                        {source.capturedAt.slice(0, 10)}
                      </span>
                    )}
                    <span className="mt-0.5 block text-[10px]">
                      {sourceFreshnessLabel(snapshotFreshness(source.capturedAt), tt)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </div>
      </details>
    </div>
  )
}

function sourceFreshnessLabel(
  freshness: ReturnType<typeof snapshotFreshness>,
  tt: (value: string) => string,
): string {
  return tt(
    freshness === 'fresh'
      ? 'fresh snapshot'
      : freshness === 'aging'
        ? 'aging snapshot'
        : freshness === 'stale'
          ? 'stale snapshot'
          : 'snapshot age unknown',
  )
}

function localizedSourceText(value: string, tt: (value: string) => string): string {
  const roleGraph = value.match(/^role graph over (\d+) units \(([\d,]+) directed pairs; ([\d,]+) hard edges\)$/)
  if (roleGraph) {
    return tt('role graph over {units} units ({pairs} directed pairs; {edges} hard edges)')
      .replace('{units}', roleGraph[1] ?? '')
      .replace('{pairs}', roleGraph[2] ?? '')
      .replace('{edges}', roleGraph[3] ?? '')
  }
  const gameData = value.match(/^(\d+) military units \+ (\d+) buildings\/tech\/upgrades$/)
  if (gameData) {
    return `${gameData[1] ?? ''} ${tt('military units')} + ${gameData[2] ?? ''} ${tt('buildings/tech/upgrades')}`
  }
  return tt(value)
}

function FilterPanel({
  filters,
  options,
  onChange,
}: {
  filters: DataStudioFilters
  options: DataStudioFilterOptions
  onChange: (key: FilterKey, value: string) => void
}) {
  const { tt } = useI18n()
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">{tt('Saved-view filters')}</h2>
          <span className="text-[11px] text-muted-foreground">
            {tt('The current view is stored in the page address.')}
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <FilterSelect
            label={tt('Civilization')}
            value={filters.civilization}
            onChange={(value) => onChange('civilization', value)}
          >
            {categoryOptions(options.civilizations, filters.civilization, (value) => civOptionLabel(value, tt))}
          </FilterSelect>
          <FilterSelect
            label={tt('Opponent civilization')}
            value={filters.opponentCivilization}
            onChange={(value) => onChange('opponentCivilization', value)}
          >
            {categoryOptions(
              options.opponentCivilizations,
              filters.opponentCivilization,
              (value) => civOptionLabel(value, tt),
            )}
          </FilterSelect>
          <FilterSelect
            label={tt('Map')}
            value={filters.map}
            onChange={(value) => onChange('map', value)}
          >
            {categoryOptions(options.maps, filters.map, (value) => plainOptionLabel(value, tt))}
          </FilterSelect>
          <FilterSelect
            label={tt('Format')}
            value={filters.format}
            onChange={(value) => onChange('format', value)}
          >
            {categoryOptions(options.formats, filters.format, (value) => plainOptionLabel(value, tt))}
          </FilterSelect>
          <FilterSelect
            label={tt('Patch')}
            value={filters.patch}
            onChange={(value) => onChange('patch', value)}
          >
            {categoryOptions(options.patches, filters.patch, (value) => patchOptionLabel(value, tt))}
          </FilterSelect>
          <FilterSelect
            label={tt('Season')}
            value={filters.season}
            onChange={(value) => onChange('season', value)}
          >
            {categoryOptions(options.seasons, filters.season, (value) => seasonOptionLabel(value, tt))}
          </FilterSelect>
          <FilterSelect
            label={tt('Result')}
            value={filters.result}
            onChange={(value) => onChange('result', value)}
          >
            <option value="win">{tt('Win')}</option>
            <option value="loss">{tt('Loss')}</option>
            <option value="unknown">{tt('Unknown result')}</option>
          </FilterSelect>
          <FilterSelect
            label={tt('Duration')}
            value={filters.duration}
            onChange={(value) => onChange('duration', value)}
          >
            <option value="under-15">{tt('Under 15 minutes')}</option>
            <option value="15-25">{tt('15-25 minutes')}</option>
            <option value="25-40">{tt('25-40 minutes')}</option>
            <option value="40-plus">{tt('40+ minutes')}</option>
            <option value="unknown">{tt('Unknown duration')}</option>
          </FilterSelect>
          <FilterSelect
            label={tt('Recent window')}
            value={filters.window}
            allLabel={tt('Default: 90 days')}
            onChange={(value) => onChange('window', value)}
          >
            <option value="7d">{tt('Last 7 days')}</option>
            <option value="30d">{tt('Last 30 days')}</option>
            <option value="90d">{tt('Last 90 days')}</option>
            <option value="180d">{tt('Last 180 days')}</option>
            <option value="365d">{tt('Last year')}</option>
            <option value="all">{tt('All loaded history')}</option>
          </FilterSelect>
        </div>
      </CardContent>
    </Card>
  )
}

function FilterSelect({
  label,
  value,
  allLabel = 'All',
  onChange,
  children,
}: {
  label: string
  value: string
  allLabel?: string
  onChange: (value: string) => void
  children: ReactNode
}) {
  const { tt } = useI18n()
  return (
    <label className="space-y-1 text-xs text-muted-foreground">
      <span>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full rounded-sm border border-border bg-background px-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
      >
        <option value="">{allLabel === 'All' ? tt('All') : allLabel}</option>
        {children}
      </select>
    </label>
  )
}

function categoryOptions(
  options: CountedOption[],
  selected: string,
  label: (value: string) => string,
): ReactNode {
  const selectedIsMissing = selected && !options.some((option) => option.value === selected)
  return (
    <>
      {selectedIsMissing && <option value={selected}>{label(selected)} (not loaded)</option>}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {label(option.value)} ({option.games})
        </option>
      ))}
    </>
  )
}

function civOptionLabel(value: string, tt: (value: string) => string): string {
  return value === DATA_STUDIO_UNKNOWN ? tt('Unknown') : civDisplayName(value)
}

function plainOptionLabel(value: string, tt: (value: string) => string): string {
  return value === DATA_STUDIO_UNKNOWN ? tt('Unknown') : value
}

function patchOptionLabel(value: string, tt: (value: string) => string): string {
  if (value === DATA_STUDIO_LEGACY_UNKNOWN) return tt('Legacy public - unrecorded')
  if (value === DATA_STUDIO_LOCAL_UNKNOWN) return tt('Local/custom - unknown')
  return `${tt('Patch')} ${value}`
}

function seasonOptionLabel(value: string, tt: (value: string) => string): string {
  if (value === DATA_STUDIO_LEGACY_UNKNOWN) return tt('Legacy public - unrecorded')
  if (value === DATA_STUDIO_LOCAL_UNKNOWN) return tt('Local/custom - unknown')
  return `${tt('Season')} ${value}`
}

function MetricCard({
  label,
  metric,
  value,
  detail,
}: {
  label: string
  metric: DataStudioMetric
  value: string
  detail: string
}) {
  const { tt } = useI18n()
  return (
    <Card>
      <CardContent className="space-y-1 p-4">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
        <p className="text-xs text-muted-foreground">{detail}</p>
        <p className="text-[11px] tabular-nums text-primary/80">
          n={metric.sampleSize} {tt('observed')} {metric.sampleSize === 1 ? tt('game') : tt('games')}
        </p>
      </CardContent>
    </Card>
  )
}

function MatchTable({ games }: { games: DataStudioGame[] }) {
  const { tt } = useI18n()
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold tracking-tight">{tt('Matching games')}</h2>
      {games.length === 0 ? (
        <EmptyBox>
          <div className="space-y-1">
            <p>{tt('No games fit every selected filter.')}</p>
            <p className="text-xs">{tt('Broaden the view or reset the filters.')}</p>
          </div>
        </EmptyBox>
      ) : (
        <Card className="overflow-hidden">
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[900px] text-left text-xs">
              <thead className="border-b border-border bg-secondary/40 text-muted-foreground">
                <tr>
                  <TableHead>{tt('Date')}</TableHead>
                  <TableHead>{tt('Result')}</TableHead>
                  <TableHead>{tt('Matchup')}</TableHead>
                  <TableHead>{tt('Map / format')}</TableHead>
                  <TableHead>{tt('Patch / season')}</TableHead>
                  <TableHead align="right">{tt('Duration')}</TableHead>
                  <TableHead align="right">{tt('Rating')}</TableHead>
                  <TableHead align="right">{tt('APM')}</TableHead>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {games.map((game) => (
                  <tr key={game.id} className="transition-colors hover:bg-secondary/25">
                    <TableCell>
                      <Link to={`/game/${game.id}`} className="font-medium hover:text-primary">
                      {formatDate(game.playedAt, tt)}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <ResultLabel result={game.result} />
                    </TableCell>
                    <TableCell>
                      {civDisplayName(game.civilization)}
                      <span className="text-muted-foreground">
                        {' '}
                        vs{' '}
                        {game.opponentCivilizations.length > 0
                          ? game.opponentCivilizations.map(civDisplayName).join(' + ')
                          : 'Unknown'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {game.map || tt('Unknown')}
                        <span className="text-muted-foreground"> · {game.format ?? tt('Unknown')}</span>
                    </TableCell>
                    <TableCell>
                      {game.patch != null
                          ? `${tt('Patch')} ${game.patch}`
                        : game.custom
                          ? tt('Local - unknown')
                          : tt('Legacy - unrecorded')}
                      <span className="text-muted-foreground">
                        {' '}
                        ·{' '}
                        {game.season != null
                          ? `${tt('Season')} ${game.season}`
                          : game.custom
                            ? tt('local season unknown')
                            : tt('legacy season unrecorded')}
                      </span>
                    </TableCell>
                    <TableCell align="right">{formatDurationShort(game.durationSec)}</TableCell>
                    <TableCell align="right">{formatSigned(game.ratingDiff)}</TableCell>
                    <TableCell align="right">{formatNumber(game.apm, 0)}</TableCell>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </section>
  )
}

function TableHead({ children, align }: { children: ReactNode; align?: 'right' }) {
  return (
    <th className={cn('px-3 py-2 font-medium', align === 'right' && 'text-right')}>{children}</th>
  )
}

function TableCell({ children, align }: { children: ReactNode; align?: 'right' }) {
  return (
    <td
      className={cn(
        'whitespace-nowrap px-3 py-2.5',
        align === 'right' && 'text-right tabular-nums',
      )}
    >
      {children}
    </td>
  )
}

function ResultLabel({ result }: { result: DataStudioGame['result'] }) {
  const { tt } = useI18n()
  return (
    <span
      className={cn(
        'inline-flex min-w-12 justify-center rounded-sm px-1.5 py-0.5 font-semibold',
        result === 'win'
          ? 'bg-win/15 text-win'
          : result === 'loss'
            ? 'bg-loss/15 text-loss'
            : 'bg-secondary text-muted-foreground',
      )}
    >
      {result === 'win' ? tt('Win') : result === 'loss' ? tt('Loss') : tt('Unknown')}
    </span>
  )
}

function formatDate(iso: string, tt: (value: string) => string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? tt('Date unavailable') : date.toLocaleDateString()
}

function formatSigned(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return '-'
  const rounded = Math.round(value * 10) / 10
  return `${rounded > 0 ? '+' : ''}${rounded}`
}

function formatNumber(value: number | null, decimals: number): string {
  if (value == null || !Number.isFinite(value)) return '-'
  return value.toFixed(decimals).replace(/\.0$/, '')
}

function formatPercent(value: number | null): string {
  return value == null ? '-' : `${value}%`
}
