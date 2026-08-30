import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Calculator, Download, FileUp, FlaskConical, Plus, Search, Trash2 } from 'lucide-react'
import type { StatsLeaderboard } from '@api/types'
import { BUNDLED_BUILD_ORDERS } from '@data/buildOrders'
import { BUILD_CATALOG } from '@data/buildCatalog'
import { CIV_SLUGS } from '@data/civs'
import {
  GAME_DATA_CAPTURED_AT,
  GAME_DATA_VERSION,
  type VendoredUnit,
  unitsForCiv,
} from '@data/gameData'
import tinctureHistoryJson from '@data/tinctureHistory.json'
import tinctureMetaJson from '@data/tinctureMeta.json'
import { buildCatalogEntries, type BuildCatalogEntry } from '@domain/buildCatalog'
import { matchesBuildArchiveTextFilters } from '@domain/buildLibraryFilters'
import type { BuildOrder } from '@domain/buildOrderSchema'
import { parseOverlayBuild, parseSimpleBuildOrder } from '@domain/overlayBuild'
import {
  validateBuildOrderFeasibility,
  type BuildValidationResult,
} from '@domain/buildOrderValidation'
import { civDisplayName } from '@domain/civ'
import { formatDuration } from '@domain/format'
import { formatCount, formatLeaderboard } from '@shared/format'
import { ipc } from '@shared/ipc'
import {
  isTinctureHistoryStale,
  tinctureDelta,
  type TinctureHistoryDocument,
  type TinctureMetaDocument,
} from '@domain/tinctureHistory'
import {
  calculateProduction,
  DEFAULT_GATHER_RATES,
  inferProductionUnitIds,
  PRODUCTION_RESOURCES,
  type ProductionLine,
  type ProductionMode,
  type ProductionModifier,
  type ProductionResource,
  type ProductionUnitLike,
  type ResourceAmounts,
} from '@domain/productionCalculator'
import { productionModifiersForCiv } from '@domain/productionModifiers'
import { PageHead } from '../components/PageHead'
import { ScreenTabs } from '../components/ScreenTabs'
import { BuildOrderViewer } from '../components/BuildOrderViewer'
import { BuildEditor } from '../components/BuildEditor'
import { VideoAnalysisImporter } from '../components/VideoAnalysisImporter'
import { VideoAnalysisPanel } from '../components/VideoAnalysisPanel'
import type { VideoAnalysisRecord } from '@domain/videoAnalysis'
import { LastMatchCoach } from '../components/LastMatchCoach'
import { EmptyBox } from '../components/feedback'
import { Card, CardContent } from '@shared/components/ui/card'
import { Badge } from '@shared/components/ui/badge'
import { Input } from '@shared/components/ui/input'
import { useVideoAnalyses } from '../queries/useVideoAnalyses'
import { cn } from '@shared/lib/utils'
import { useI18n } from '../../i18n'
import { useSettings } from '../queries/useProfile'
import { resolveAoE4Icon } from '@data/vendor/aoe4-icons/manifest'
import { essenceValidationForUnit } from '@data/essenceAttributes'

type TinctureTab = 'ledger' | 'production' | 'cellar' | 'editor' | 'coach'

const RESOURCE_LABELS: Record<ProductionResource, string> = {
  food: 'Food',
  wood: 'Wood',
  gold: 'Gold',
  stone: 'Stone',
}

const FOOD_SOURCES = Object.keys(DEFAULT_GATHER_RATES)
const TINCTURE_HISTORY = tinctureHistoryJson as TinctureHistoryDocument
const TINCTURE_META = tinctureMetaJson as TinctureMetaDocument
const TINCTURE_LADDERS: { label: string; value: StatsLeaderboard }[] = [
  { label: 'Ranked 1v1', value: 'rm_solo' },
  { label: 'Quick Match 1v1', value: 'qm_1v1' },
  { label: 'Ranked 2v2', value: 'rm_2v2' },
  { label: 'Quick Match 2v2', value: 'qm_2v2' },
  { label: 'Ranked 3v3', value: 'rm_3v3' },
  { label: 'Quick Match 3v3', value: 'qm_3v3' },
  { label: 'Ranked 4v4', value: 'rm_4v4' },
  { label: 'Quick Match 4v4', value: 'qm_4v4' },
]

function tinctureLeaderboard(value: string | null | undefined): StatsLeaderboard {
  return TINCTURE_LADDERS.some((entry) => entry.value === value)
    ? (value as StatsLeaderboard)
    : 'rm_solo'
}

function unitForCalculator(unit: VendoredUnit): ProductionUnitLike | null {
  if (!unit.costs || unit.costs.time <= 0 || unit.producedBy.length === 0) return null
  const hasCost = PRODUCTION_RESOURCES.some((resource) => unit.costs![resource] > 0)
  if (!hasCost || unit.displayClasses.some((item) => item === 'Worker')) return null
  return {
    id: unit.id,
    name: unit.name,
    time: unit.costs.time,
    costs: {
      food: unit.costs.food,
      wood: unit.costs.wood,
      gold: unit.costs.gold,
      stone: unit.costs.stone,
    },
    icon: unit.icon,
    classes: unit.classes,
    producedBy: unit.producedBy,
    minAge: unit.minAge,
  }
}

function calculatorUnitsForCiv(civ: string, age?: number): ProductionUnitLike[] {
  return unitsForCiv(civ)
    .filter((unit) => age === undefined || unit.minAge <= age)
    .map(unitForCalculator)
    .filter((unit): unit is ProductionUnitLike => unit !== null)
}

function norm(value: string): string {
  return value
    .toLocaleLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '')
}

function buildCivSlug(build: { civilization: string | string[] }): string | null {
  const labels = Array.isArray(build.civilization) ? build.civilization : [build.civilization]
  return (
    CIV_SLUGS.find((slug) => labels.some((label) => norm(label) === norm(civDisplayName(slug)))) ??
    null
  )
}

export function Tincture({ embedded = false }: { embedded?: boolean } = {}) {
  const { tt } = useI18n()
  const { data: settings } = useSettings()
  const [searchParams, setSearchParams] = useSearchParams()
  const rawTab = searchParams.get('tab')
  const tab: TinctureTab =
    rawTab === 'production' ||
    rawTab === 'cellar' ||
    rawTab === 'editor' ||
    rawTab === 'coach'
      ? rawTab
      : 'ledger'
  const setTab = (next: TinctureTab) =>
    setSearchParams(
      (prev) => {
        const nextParams = new URLSearchParams(prev)
        if (next === 'ledger') nextParams.delete('tab')
        else nextParams.set('tab', next)
        return nextParams
      },
      { replace: true },
    )
  const configuredLeaderboard = tinctureLeaderboard(settings?.leaderboard)
  const leaderboard = tinctureLeaderboard(searchParams.get('ladder') ?? configuredLeaderboard)
  const setLeaderboard = (next: StatsLeaderboard) =>
    setSearchParams(
      (prev) => {
        const nextParams = new URLSearchParams(prev)
        if (next === configuredLeaderboard) nextParams.delete('ladder')
        else nextParams.set('ladder', next)
        return nextParams
      },
      { replace: true },
    )

  return (
    <div className={embedded ? 'space-y-6' : 'animate-fade-in space-y-6'}>
      <PageHead
        embedded={embedded}
        kicker="AoE4 decision ledger"
        title="Tincture"
        sub="Distilled meta, build coverage, and production demand on top of RTSLytics data layers."
        aside={
          <Badge variant="outline" className="gap-1.5">
            <FlaskConical className="h-3.5 w-3.5" />
            {tt('AoE4World + local builds')}
          </Badge>
        }
      />

      <ScreenTabs
        items={[
          { id: 'ledger', label: 'Decision Summary' },
          { id: 'production', label: 'Production Calculator' },
          { id: 'cellar', label: 'Cellar' },
          { id: 'editor', label: 'Build Builder' },
          { id: 'coach', label: 'Match Coach' },
        ]}
        value={tab}
        onChange={setTab}
        ariaLabel={tt('Tincture sections')}
        trailing={
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{tt('Mode')}</span>
            <select
              value={leaderboard}
              onChange={(event) => setLeaderboard(event.target.value as StatsLeaderboard)}
              aria-label={tt('Tincture mode')}
              className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {TINCTURE_LADDERS.map((entry) => (
                <option key={entry.value} value={entry.value}>
                  {tt(formatLeaderboard(entry.value))}
                </option>
              ))}
            </select>
          </label>
        }
      />

      {tab === 'ledger' ? (
        <DecisionSummary leaderboard={leaderboard} />
      ) : tab === 'cellar' ? (
        <BuildCellar />
      ) : tab === 'editor' ? (
        <BuildEditor />
      ) : tab === 'coach' ? (
        <LastMatchCoach />
      ) : (
        <ProductionCalculator />
      )}
    </div>
  )
}

function DecisionSummary({ leaderboard }: { leaderboard: StatsLeaderboard }) {
  const { tt } = useI18n()
  const data =
    TINCTURE_META.slices.find(
      (slice) => slice.leaderboard === leaderboard && slice.rankLevel == null,
    ) ?? null
  const historySnapshot = [...TINCTURE_HISTORY.snapshots]
    .sort((left, right) => right.capturedAt.localeCompare(left.capturedAt))
    .find((snapshot) =>
      snapshot.slices.some(
        (slice) => slice.leaderboard === leaderboard && slice.rankLevel == null,
      ),
    )
  const historyStale = isTinctureHistoryStale(TINCTURE_META.generatedAt)
  const civMetaHref =
    leaderboard === 'rm_solo'
      ? '/civ-meta?tab=stats'
      : `/civ-meta?tab=stats&ladder=${encodeURIComponent(leaderboard)}`
  const notableDeltas = useMemo(
    () => {
      const civs = data?.civs ?? []
      return historySnapshot
        ? civs
            .map((civ) => ({
              civ,
              delta: tinctureDelta(
                TINCTURE_HISTORY,
                historySnapshot,
                leaderboard,
                null,
                civ.civ,
              ),
            }))
            .filter(({ delta }) => delta.winRate != null || delta.pickRate != null)
            .sort(
              (left, right) =>
                Math.abs(right.delta.winRate ?? 0) - Math.abs(left.delta.winRate ?? 0),
            )
            .slice(0, 3)
        : []
    },
    [data, historySnapshot, leaderboard],
  )

  if (!data) return <EmptyBox>{tt('AoE4World meta is unavailable.')}</EmptyBox>

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <LedgerStat
          label={tt('Saved games in snapshot')}
          value={formatCount(data.totalGames)}
        />
        <LedgerStat label={tt('Civilizations')} value={String(data.civs.length)} />
        <LedgerStat
          label={tt('Build coverage')}
          value={`${BUNDLED_BUILD_ORDERS.length} ${tt('builds')}`}
        />
        <LedgerStat
          label={tt('Snapshot history')}
          value={
            historyStale ? tt('stale') : `${TINCTURE_HISTORY.snapshots.length} ${tt('points')}`
          }
        />
      </div>
      <div
        className={cn(
          'rounded-md border px-3 py-2 text-xs',
          historyStale
            ? 'border-amber-500/30 bg-amber-500/5 text-amber-200'
            : 'border-border bg-card/40 text-muted-foreground',
        )}
      >
        {historyStale
          ? tt('Historical snapshot is stale or unavailable; open Civ Meta for current values.')
          : tt('Last distill: {date}. Deltas compare against the previous saved snapshot.').replace(
              '{date}',
              new Date(TINCTURE_META.generatedAt!).toLocaleString(),
            )}
      </div>
      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="rts-section-title">{tt('Decision summary')}</div>
              <p className="text-xs text-muted-foreground">
                {tt('Saved snapshot context plus local build coverage.')}
              </p>
            </div>
            <Link
              to={civMetaHref}
              className="inline-flex items-center rounded-md border border-primary/40 px-3 py-1.5 text-xs text-primary hover:bg-primary/10"
            >
              {tt('Open full Civ Meta')}
            </Link>
          </div>
          <div className="grid gap-3 text-sm sm:grid-cols-3">
            <div className="rounded-md border border-border/70 bg-background/30 p-3">
              <div className="rts-ledger-head">{tt('Meta scope')}</div>
              <div className="mt-1 font-medium">{tt(formatLeaderboard(data.leaderboard))}</div>
              <div className="text-xs text-muted-foreground">
                {data.rankLevel ?? tt('All ranks')} · {tt('All maps')}
              </div>
            </div>
            <div className="rounded-md border border-border/70 bg-background/30 p-3">
              <div className="rts-ledger-head">{tt('Coverage signal')}</div>
              <div className="mt-1 font-medium">{data.civs.length} {tt('civilizations')}</div>
              <div className="text-xs text-muted-foreground">
                {formatCount(data.totalGames)} {tt('games in the saved snapshot')}
              </div>
            </div>
            <div className="rounded-md border border-border/70 bg-background/30 p-3">
              <div className="rts-ledger-head">{tt('Next action')}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {tt('Use Civ Meta for sortable civ rows, patch and map filters.')}
              </div>
            </div>
          </div>
          {notableDeltas.length > 0 && (
            <div className="rounded-md border border-border/70 bg-background/30 p-3">
              <div className="rts-ledger-head">{tt('Largest snapshot movements')}</div>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {notableDeltas.map(({ civ, delta }) => (
                  <div key={civ.civ} className="text-xs">
                    <div className="font-medium">{civ.civName}</div>
                    <div className="mt-0.5 text-muted-foreground">
                      {tt('WR')} <span className={delta.winRate != null && delta.winRate >= 0 ? 'text-win' : 'text-loss'}>
                        {delta.winRate == null ? '—' : `${delta.winRate > 0 ? '+' : ''}${delta.winRate.toFixed(1)} pp`}
                      </span>
                      {' · '}
                      {tt('Pick')} {delta.pickRate == null ? '—' : `${delta.pickRate > 0 ? '+' : ''}${delta.pickRate.toFixed(1)} pp`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3 text-xs text-muted-foreground">
            <span>{tt('Patch compatibility is maintained in Explorer.')}</span>
            <Link to="/explorer?tab=patches" className="text-primary hover:underline">
              {tt('Open patch coverage')} →
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function LedgerStat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="rts-ledger-head">{label}</div>
        <div className="mt-1 text-xl font-semibold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  )
}

const CELLAR_ORIGINS = [
  { value: '', label: 'All sources' },
  { value: 'curated', label: 'Curated' },
  { value: 'house', label: 'RTSLytics house' },
  { value: 'imported', label: 'Imported' },
  { value: 'video', label: 'Video-derived' },
] as const
const SESSION_IMPORTED_BUILDS_KEY = 'rtslytics.tincture.importedBuilds.v1'
const SESSION_VIDEO_ANALYSES_KEY = 'rtslytics.tincture.videoAnalyses.v1'

function cellarOriginLabel(
  origin: BuildCatalogEntry['origin'],
  tt: (value: string) => string,
): string {
  const label = CELLAR_ORIGINS.find((item) => item.value === origin)?.label ?? origin
  return tt(label)
}

function downloadCellarFile(filename: string, content: string, type: string): void {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function csvCell(value: unknown): string {
  const text = value == null ? '' : String(value)
  return `"${text.replace(/"/g, '""')}"`
}

function BuildCellar() {
  const { tt } = useI18n()
  const archivedVideoAnalyses = useVideoAnalyses()
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [civilization, setCivilization] = useState('')
  const [opponentCivilization, setOpponentCivilization] = useState('')
  const [origin, setOrigin] = useState('')
  const [sort, setSort] = useState<'updated' | 'name' | 'confidence'>('updated')
  const [sessionEntries, setSessionEntries] = useState<BuildCatalogEntry[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const raw = window.localStorage.getItem(SESSION_IMPORTED_BUILDS_KEY)
      const builds = raw ? (JSON.parse(raw) as unknown) : []
      return Array.isArray(builds) ? buildCatalogEntries(builds as BuildOrder[]) : []
    } catch {
      return []
    }
  })
  const [videoAnalyses, setVideoAnalyses] = useState<VideoAnalysisRecord[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const raw = window.localStorage.getItem(SESSION_VIDEO_ANALYSES_KEY)
      const parsed = raw ? (JSON.parse(raw) as unknown) : []
      return Array.isArray(parsed)
        ? parsed.filter((item): item is VideoAnalysisRecord =>
            Boolean(item && typeof item === 'object' && 'build' in item),
          )
        : []
    } catch {
      return []
    }
  })
  useEffect(() => {
    const archivedResult = archivedVideoAnalyses.data
    if (!archivedResult?.ok) return
    setVideoAnalyses((current) => {
      const byId = new Map<string, VideoAnalysisRecord>()
      for (const record of [...current, ...archivedResult.data]) byId.set(record.id, record)
      const next = [...byId.values()].sort((left, right) =>
        right.capturedAt.localeCompare(left.capturedAt),
      )
      window.localStorage.setItem(SESSION_VIDEO_ANALYSES_KEY, JSON.stringify(next))
      return next
    })
  }, [archivedVideoAnalyses.data])
  const [importError, setImportError] = useState<string | null>(null)
  const [communityBuildUrl, setCommunityBuildUrl] = useState('')
  const [communityBuildStatus, setCommunityBuildStatus] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoEntries = useMemo(
    () => buildCatalogEntries(videoAnalyses.map((analysis) => analysis.build)),
    [videoAnalyses],
  )
  const activeId = searchParams.get('build')
  const referenceEntries = useMemo(
    () =>
      activeId && BUILD_CATALOG.some((entry) => entry.id === activeId) ? BUILD_CATALOG : [],
    [activeId],
  )
  const allEntries = useMemo(
    () => [...videoEntries, ...sessionEntries, ...referenceEntries],
    [referenceEntries, sessionEntries, videoEntries],
  )
  const active = allEntries.find((entry) => entry.id === activeId) ?? null
  const civilizations = useMemo(
    () =>
      [...new Set(allEntries.flatMap((entry) => entry.civilizationLabels))].sort((a, b) =>
        a.localeCompare(b),
      ),
    [allEntries],
  )
  const opponentCivilizations = useMemo(
    () =>
      [...new Set(allEntries.flatMap((entry) => entry.opponentCivilizationLabels))].sort((a, b) =>
        a.localeCompare(b),
      ),
    [allEntries],
  )
  const filtered = useMemo(() => {
    return allEntries
      .filter((entry) => {
        return matchesBuildArchiveTextFilters(entry, {
          query,
          civilization,
          opponentCivilization,
          origin,
        })
      })
      .sort((left, right) => {
        if (sort === 'name') return left.build.name.localeCompare(right.build.name)
        if (sort === 'confidence') return (right.confidence ?? -1) - (left.confidence ?? -1)
        return (
          (right.updatedAt ?? '').localeCompare(left.updatedAt ?? '') ||
          left.build.name.localeCompare(right.build.name)
        )
      })
  }, [allEntries, civilization, opponentCivilization, origin, query, sort])

  const addSessionBuild = (build: BuildOrder) => {
    setSessionEntries((current) => {
      const imported = buildCatalogEntries([build]).filter(
        (entry) => !current.some((existing) => existing.id === entry.id),
      )
      const next = [...imported, ...current]
      window.localStorage.setItem(
        SESSION_IMPORTED_BUILDS_KEY,
        JSON.stringify(next.map((entry) => entry.build)),
      )
      return next
    })
  }

  const clearSessionEntries = () => {
    setSessionEntries([])
    window.localStorage.removeItem(SESSION_IMPORTED_BUILDS_KEY)
    setActive(null)
  }

  const removeSessionBuild = (entryId: string) => {
    setSessionEntries((current) => {
      const next = current.filter((entry) => entry.id !== entryId)
      window.localStorage.setItem(
        SESSION_IMPORTED_BUILDS_KEY,
        JSON.stringify(next.map((entry) => entry.build)),
      )
      return next
    })
    if (activeId === entryId) setActive(null)
  }

  const importOverlayFile = async (file: File | undefined) => {
    if (!file) return
    const text = await file.text()
    const jsonResult = parseOverlayBuild(text)
    const result = jsonResult.ok
      ? jsonResult
      : parseSimpleBuildOrder(text, file.name.replace(/\.[^.]+$/, ''))
    if (!result.ok) {
      setImportError(result.errors.join('; '))
      return
    }
    setImportError(null)
    addSessionBuild(result.value)
  }

  const importCommunityBuildUrl = async (url: string) => {
    setCommunityBuildStatus(null)
    const result = await ipc.importCommunityBuild(url)
    if (!result.ok) {
      setCommunityBuildStatus(result.error.message)
      return
    }
    setImportError(null)
    addSessionBuild(result.data)
    setCommunityBuildStatus(tt('Build imported'))
  }

  const importCommunityBuild = async () => {
    await importCommunityBuildUrl(communityBuildUrl)
    setCommunityBuildUrl('')
  }

  const saveVideoAnalysis = (record: VideoAnalysisRecord) => {
    setVideoAnalyses((current) => {
      const next = [record, ...current.filter((item) => item.id !== record.id)]
      window.localStorage.setItem(SESSION_VIDEO_ANALYSES_KEY, JSON.stringify(next))
      return next
    })
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous)
        next.delete('video')
        return next
      },
      { replace: true },
    )
  }

  const setActive = (entry: BuildCatalogEntry | null) => {
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous)
        if (entry) next.set('build', entry.id)
        else next.delete('build')
        return next
      },
      { replace: true },
    )
  }

  const exportJson = () => {
    const payload = filtered.map((entry) => ({
      ...entry.build,
      catalog: {
        id: entry.id,
        origin: entry.origin,
        stepCount: entry.stepCount,
        durationSec: entry.durationSec,
        timedSteps: entry.timedSteps,
        confidence: entry.confidence,
        sampleSize: entry.sampleSize,
      },
    }))
    downloadCellarFile(
      'aoe4-tincture-cellar.json',
      JSON.stringify(payload, null, 2),
      'application/json',
    )
  }

  const exportCsv = () => {
    const header = [
      'id',
      'name',
      'civilizations',
      'origin',
      'author',
      'patch',
      'steps',
      'duration',
      'timed steps',
      'confidence',
      'sample size',
      'source',
    ]
    const rows = filtered.map((entry) => [
      entry.id,
      entry.build.name,
      entry.civilizationLabels.join(' | '),
      entry.origin,
      entry.build.author ?? '',
      entry.patch ?? '',
      entry.stepCount,
      entry.durationSec ?? '',
      entry.timedSteps,
      entry.confidence ?? '',
      entry.sampleSize ?? '',
      entry.sourceUrl ?? '',
    ])
    const csv = [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n')
    downloadCellarFile('aoe4-tincture-cellar.csv', csv, 'text/csv;charset=utf-8')
  }

  const activeValidation = useMemo<BuildValidationResult | null>(() => {
    if (!active) return null
    const civ = buildCivSlug(active.build)
    const units = civ
      ? unitsForCiv(civ).map((unit) => ({
          id: unit.id,
          name: unit.name,
          minAge: unit.minAge,
          costs: unit.costs
            ? {
                food: unit.costs.food,
                wood: unit.costs.wood,
                gold: unit.costs.gold,
                stone: unit.costs.stone,
              }
            : null,
        }))
      : []
    return validateBuildOrderFeasibility(active.build, { units })
  }, [active])

  if (active) {
    const activeVideoAnalysis =
      active.origin === 'video'
        ? videoAnalyses.find((record) => record.build.providerId === active.build.providerId)
        : null
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setActive(null)}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to Cellar
        </button>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="rts-section-title">{active.build.name}</div>
            <p className="text-xs text-muted-foreground">
              {active.civilizationLabels.join(' · ')} · {cellarOriginLabel(active.origin, tt)}
            </p>
          </div>
          {active.sourceUrl && (
            <a
              href={active.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-primary hover:underline"
            >
              {tt('Open source')} ↗
            </a>
          )}
        </div>
        {activeValidation && <BuildValidationCard result={activeValidation} />}
        {activeVideoAnalysis && <VideoAnalysisPanel record={activeVideoAnalysis} />}
        <BuildOrderViewer bo={active.build} />
      </div>
    )
  }

  const timed = allEntries.filter((entry) => entry.timedSteps > 0).length
  const civCount = new Set(allEntries.flatMap((entry) => entry.civilizationLabels)).size

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <LedgerStat label={tt('Builds in archive')} value={formatCount(allEntries.length)} />
        <LedgerStat label={tt('Civilization labels')} value={formatCount(civCount)} />
        <LedgerStat label={tt('Timed build orders')} value={formatCount(timed)} />
      </div>
      <VideoAnalysisImporter
        initialUrl={searchParams.get('video') ?? ''}
        initialGameId={searchParams.get('gameId') ?? null}
        initialCivilization={searchParams.get('civilization') ?? ''}
        onImported={saveVideoAnalysis}
      />
      {videoAnalyses.length > 0 && (
        <p className="text-xs text-primary">
          {videoAnalyses.length}{' '}
          {tt(videoAnalyses.length === 1 ? 'video analysis' : 'video analyses')}{' '}
          {tt('saved locally and included in the Cellar.')}
        </p>
      )}
      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="rts-section-title">{tt('The Cellar')}</div>
              <p className="text-xs text-muted-foreground">
                {tt('Personal imports, video evidence, provenance and exportable raw orders.')}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                to="/guides?tab=builds"
                className="inline-flex h-9 items-center rounded-md border border-primary/40 px-3 text-xs text-primary hover:bg-primary/10"
              >
                {tt('Open public Build Library')}
              </Link>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.overlay.json,.txt,application/json,text/plain"
                className="hidden"
                onChange={(event) => {
                  void importOverlayFile(event.target.files?.[0])
                  event.currentTarget.value = ''
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-xs hover:bg-secondary"
              >
                <FileUp className="h-3.5 w-3.5" /> {tt('Import .overlay.json or .txt')}
              </button>
              <button
                type="button"
                onClick={exportCsv}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-xs hover:bg-secondary"
              >
                <Download className="h-3.5 w-3.5" /> CSV
              </button>
              <button
                type="button"
                onClick={exportJson}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-xs hover:bg-secondary"
              >
                <Download className="h-3.5 w-3.5" /> JSON
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-2 rounded-md border border-primary/20 bg-primary/5 p-3 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold">{tt('Import community build')}</div>
              <div className="text-[11px] text-muted-foreground">
                {tt(
                  'Paste an AoE4Guides, AOE4 Builds, or age4builder link; the source is normalized into the Cellar.',
                )}
              </div>
            </div>
            <input
              value={communityBuildUrl}
              onChange={(event) => setCommunityBuildUrl(event.target.value)}
              placeholder="https://aoe4guides.com/builds/..."
              className="h-9 min-w-0 flex-1 rounded-md border border-border bg-background px-3 text-xs sm:max-w-md"
            />
            <button
              type="button"
              onClick={() => void importCommunityBuild()}
              className="h-9 shrink-0 rounded-md border border-primary/40 px-3 text-xs text-primary hover:bg-primary/10"
            >
              {tt('Fetch build')}
            </button>
          </div>
          {communityBuildStatus && (
            <p className="text-xs text-muted-foreground">{communityBuildStatus}</p>
          )}
          {importError && (
            <p className="text-xs text-destructive">
              {tt('Import rejected')}: {importError}
            </p>
          )}
          {sessionEntries.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-primary">
              <span>
                {sessionEntries.length}{' '}
                {tt(sessionEntries.length === 1 ? 'imported build' : 'imported builds')}{' '}
                {tt('added to this session. Export it to persist or share it.')}
              </span>
              <button
                type="button"
                onClick={clearSessionEntries}
                className="inline-flex items-center gap-1 rounded border border-destructive/30 px-2 py-1 text-[11px] text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-3 w-3" /> {tt('Clear imported session')}
              </button>
            </div>
          )}
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_180px_180px_150px_150px]">
            <label className="relative block">
              <span className="sr-only">{tt('Search cellar')}</span>
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={tt('Search name, civ, author, patch…')}
                className="h-9 pl-8 text-xs"
              />
            </label>
            <select
              value={civilization}
              onChange={(event) => setCivilization(event.target.value)}
              className="control-select"
            >
              <option value="">{tt('All civilizations')}</option>
              {civilizations.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <select
              value={opponentCivilization}
              onChange={(event) => setOpponentCivilization(event.target.value)}
              className="control-select"
            >
              <option value="">{tt('All opponent civilizations')}</option>
              {opponentCivilizations.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <select
              value={origin}
              onChange={(event) => setOrigin(event.target.value)}
              className="control-select"
            >
              {CELLAR_ORIGINS.map((item) => (
                <option key={item.value} value={item.value}>
                  {tt(item.label)}
                </option>
              ))}
            </select>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as typeof sort)}
              className="control-select"
            >
              <option value="updated">{tt('Newest first')}</option>
              <option value="confidence">{tt('Confidence')}</option>
              <option value="name">{tt('Name')}</option>
            </select>
          </div>
          <div className="text-xs text-muted-foreground">
            {tt('Showing {shown} of {total} builds.')
              .replace('{shown}', formatCount(filtered.length))
              .replace('{total}', formatCount(allEntries.length))}
          </div>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full min-w-[800px] text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="rts-ledger-head px-3 py-2 text-left">{tt('Build')}</th>
                  <th className="rts-ledger-head px-2 py-2 text-left">{tt('Civilization')}</th>
                  <th className="rts-ledger-head px-2 py-2 text-left">{tt('Matchup')}</th>
                  <th className="rts-ledger-head px-2 py-2 text-left">{tt('Source')}</th>
                  <th className="rts-ledger-head px-2 py-2 text-right">{tt('Steps')}</th>
                  <th className="rts-ledger-head px-2 py-2 text-right">{tt('Duration')}</th>
                  <th className="rts-ledger-head px-3 py-2 text-right">{tt('Confidence')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-b border-border/60 last:border-0 hover:bg-secondary/30"
                  >
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => setActive(entry)}
                        className="text-left font-medium text-primary hover:underline"
                      >
                        {entry.build.name}
                      </button>
                      {sessionEntries.some((sessionEntry) => sessionEntry.id === entry.id) && (
                        <button
                          type="button"
                          title={tt('Remove from session')}
                          aria-label={tt('Remove from session')}
                          onClick={(event) => {
                            event.stopPropagation()
                            removeSessionBuild(entry.id)
                          }}
                          className="ml-2 inline-flex h-6 w-6 items-center justify-center rounded border border-border text-muted-foreground hover:border-destructive/40 hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                      <div className="text-[11px] text-muted-foreground">
                        {entry.build.author ?? tt('unknown author')}
                        {entry.patch ? ` · ${entry.patch}` : ''}
                      </div>
                      {(entry.provider || entry.strategy || entry.map || entry.score != null) && (
                        <div className="text-[10px] text-muted-foreground/80">
                          {entry.provider ?? tt('local')}
                          {entry.strategy ? ` · ${entry.strategy}` : ''}
                          {entry.map ? ` · ${entry.map}` : ''}
                          {entry.score != null
                            ? ` · ${tt('score')} ${Math.round(entry.score)}`
                            : ''}
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-2 text-xs text-muted-foreground">
                      {entry.civilizationLabels.join(', ')}
                    </td>
                    <td className="px-2 py-2 text-xs text-muted-foreground">
                      {entry.opponentCivilizationLabels.length > 0
                        ? `${tt('vs')} ${entry.opponentCivilizationLabels.join(', ')}`
                        : '—'}
                    </td>
                    <td className="px-2 py-2 text-xs text-muted-foreground">
                      <div>{cellarOriginLabel(entry.origin, tt)}</div>
                      {entry.views != null && (
                        <div className="text-[10px] text-muted-foreground/80">
                          {formatCount(entry.views)} {tt('views')}
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">
                      {entry.stepCount}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">
                      {entry.durationSec == null ? '—' : formatDuration(entry.durationSec)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {entry.confidence == null ? '—' : `${Math.round(entry.confidence * 100)}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function BuildValidationCard({ result }: { result: BuildValidationResult }) {
  const { tt } = useI18n()
  return (
    <Card>
      <CardContent className="space-y-2 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="rts-section-title">{tt('Build validation')}</div>
            <p className="text-xs text-muted-foreground">
              {tt(
                'Clock, age, worker allocation and known unit requirements from the versioned game data.',
              )}
            </p>
          </div>
          <Badge
            variant="outline"
            className={
              result.ok ? 'border-win/40 text-win' : 'border-destructive/40 text-destructive'
            }
          >
            {result.ok
              ? tt('structurally feasible')
              : `${result.errors.length} ${tt(result.errors.length === 1 ? 'error' : 'errors')}`}
          </Badge>
        </div>
        {result.issues.length === 0 ? (
          <p className="text-xs text-win">
            {tt('No timing, allocation or known requirement conflicts found.')}
          </p>
        ) : (
          <ul className="space-y-1 text-xs">
            {result.issues.slice(0, 8).map((issue) => (
              <li
                key={`${issue.code}-${issue.stepIndex}-${issue.message}`}
                className={issue.severity === 'error' ? 'text-destructive' : 'text-amber-200'}
              >
                {tt('Step')} {issue.stepIndex + 1}: {issue.message}
              </li>
            ))}
            {result.issues.length > 8 && (
              <li className="text-muted-foreground">
                +{result.issues.length - 8} {tt('more issues')}
              </li>
            )}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function ProductionCalculator() {
  const { tt, gameName } = useI18n()
  const [searchParams] = useSearchParams()
  const requestedBuild = searchParams.get('build')
  const requestedBuildRef = useRef<string | null>(null)
  const [civ, setCiv] = useState('english')
  const [age, setAge] = useState(2)
  const [mode, setMode] = useState<ProductionMode>('buildings')
  const [foodSource, setFoodSource] = useState('sheep')
  const [speedPercent, setSpeedPercent] = useState(0)
  const [discountPercent, setDiscountPercent] = useState(0)
  const [minFoodVillagers, setMinFoodVillagers] = useState(0)
  const [passive, setPassive] = useState<ResourceAmounts>({ food: 0, wood: 0, gold: 0, stone: 0 })
  const [useCustomGatherRates, setUseCustomGatherRates] = useState(false)
  const [customGatherRates, setCustomGatherRates] = useState<ResourceAmounts>(
    DEFAULT_GATHER_RATES.sheep!,
  )
  const [selectedModifierState, setSelectedModifierState] = useState<string[] | null>(null)
  const [lines, setLines] = useState<ProductionLine[]>(() => {
    const initial = calculatorUnitsForCiv('english', 2).slice(0, 2)
    return initial.map((unit) => ({ unitId: unit.id, count: 1 }))
  })
  const [selectedBuild, setSelectedBuild] = useState(() => requestedBuild ?? '')
  const units = useMemo(() => calculatorUnitsForCiv(civ, age), [age, civ])
  const essenceValidation = useMemo(() => {
    const rows = units.map((unit) => essenceValidationForUnit(unit.id)).filter(Boolean)
    return {
      checked: rows.length,
      conflicts: rows.filter((row) => row!.status === 'conflict').length,
      variants: rows.filter((row) => row!.status === 'partial').length,
      missing: rows.filter((row) => row!.status === 'missing').length,
    }
  }, [units])
  const modifiers = useMemo(() => productionModifiersForCiv(civ), [civ])
  const defaultModifierIds = useMemo(
    () => modifiers.filter((modifier) => modifier.defaultSelected).map((modifier) => modifier.id),
    [modifiers],
  )
  const selectedModifierIds = selectedModifierState ?? defaultModifierIds
  const visibleModifiers = modifiers.filter(
    (modifier) => modifier.age === undefined || modifier.age === age,
  )
  const result = useMemo(
    () =>
      calculateProduction({
        units,
        lines,
        mode,
        age,
        foodSource,
        speedPercent,
        discountPercent,
        passive,
        minFoodVillagers,
        customGatherRates: useCustomGatherRates ? customGatherRates : undefined,
        modifiers,
        selectedModifierIds,
      }),
    [
      age,
      customGatherRates,
      discountPercent,
      foodSource,
      lines,
      minFoodVillagers,
      mode,
      modifiers,
      passive,
      selectedModifierIds,
      speedPercent,
      units,
      useCustomGatherRates,
    ],
  )

  const resetForCiv = (nextCiv: string) => {
    const nextUnits = calculatorUnitsForCiv(nextCiv, age)
    setCiv(nextCiv)
    setSelectedBuild('')
    setSelectedModifierState(null)
    setLines(nextUnits.slice(0, 2).map((unit) => ({ unitId: unit.id, count: 1 })))
  }

  const resetForAge = (nextAge: number) => {
    const nextUnits = calculatorUnitsForCiv(civ, nextAge)
    setAge(nextAge)
    setLines(nextUnits.slice(0, 2).map((unit) => ({ unitId: unit.id, count: 1 })))
  }

  const applyBuild = useCallback(
    (buildName: string) => {
      const build = BUNDLED_BUILD_ORDERS.find((item) => item.name === buildName)
      if (!build) return
      const buildCiv = buildCivSlug(build)
      const nextCiv = buildCiv ?? civ
      const nextUnits = calculatorUnitsForCiv(nextCiv, age)
      const inferred = inferProductionUnitIds(build, nextUnits)
      setSelectedBuild(buildName)
      if (buildCiv) setCiv(buildCiv)
      if (buildCiv) setSelectedModifierState(null)
      setLines(
        (inferred.length > 0 ? inferred : nextUnits.slice(0, 2).map((unit) => unit.id)).map(
          (unitId) => ({ unitId, count: 1 }),
        ),
      )
    },
    [age, civ],
  )

  useEffect(() => {
    if (!requestedBuild || requestedBuildRef.current === requestedBuild) return
    if (!BUNDLED_BUILD_ORDERS.some((build) => build.name === requestedBuild)) return
    requestedBuildRef.current = requestedBuild
    applyBuild(requestedBuild)
  }, [applyBuild, requestedBuild])

  const updateLine = (index: number, patch: Partial<ProductionLine>) =>
    setLines((current) =>
      current.map((line, lineIndex) => (lineIndex === index ? { ...line, ...patch } : line)),
    )

  const toggleModifier = (modifier: ProductionModifier) => {
    setSelectedModifierState((current) => {
      const next = new Set(current ?? defaultModifierIds)
      if (next.has(modifier.id)) next.delete(modifier.id)
      else next.add(modifier.id)
      return [...next]
    })
  }

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.16fr)_minmax(360px,0.84fr)]">
      <Card className="overflow-hidden">
        <div className="border-b border-border/70 bg-secondary/20 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Calculator className="h-4 w-4 text-primary" />
                <div className="rts-section-title">{tt('Production plan')}</div>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {tt('Tune continuous queues and see the villager demand behind them.')}
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground/80">
                {tt('Versioned game data')} · {GAME_DATA_VERSION} ·{' '}
                {new Date(GAME_DATA_CAPTURED_AT).toLocaleDateString()}
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground/70">
                {tt('Local Essence check')} · {essenceValidation.checked} {tt('units checked')}
                {essenceValidation.conflicts > 0
                  ? ` · ${essenceValidation.conflicts} ${tt('attribute conflicts')}`
                  : ''}
                {essenceValidation.variants > 0
                  ? ` · ${essenceValidation.variants} ${tt('variant groups')}`
                  : ''}
                {essenceValidation.missing > 0
                  ? ` · ${essenceValidation.missing} ${tt('unmatched units')}`
                  : ''}
              </p>
            </div>
            <Badge variant="outline" className="border-primary/30 text-[10px] text-primary">
              {tt('live model')}
            </Badge>
          </div>
        </div>
        <CardContent className="space-y-5 p-5">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <div className="rts-ledger-head">{tt('Scenario')}</div>
              <span className="text-[10px] text-muted-foreground">
                {tt('Start with civ + age')}
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <Field label={tt('Civilization')}>
                <select
                  value={civ}
                  onChange={(event) => resetForCiv(event.target.value)}
                  className="control-select"
                >
                  {CIV_SLUGS.map((slug) => (
                    <option key={slug} value={slug}>
                      {gameName(civDisplayName(slug))}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={tt('Age')}>
                <select
                  value={age}
                  onChange={(event) => resetForAge(Number(event.target.value))}
                  className="control-select"
                >
                  <option value={1}>{tt('Dark Age')}</option>
                  <option value={2}>{tt('Feudal Age')}</option>
                  <option value={3}>{tt('Castle Age')}</option>
                  <option value={4}>{tt('Imperial Age')}</option>
                </select>
              </Field>
              <Field label={tt('Calculation')}>
                <select
                  value={mode}
                  onChange={(event) => setMode(event.target.value as ProductionMode)}
                  className="control-select"
                >
                  <option value="buildings">{tt('Production buildings')}</option>
                  <option value="unitsPerMinute">{tt('Target units / minute')}</option>
                </select>
              </Field>
              <Field label={tt('Build order')} className="sm:col-span-2 xl:col-span-1">
                <select
                  value={selectedBuild}
                  onChange={(event) => applyBuild(event.target.value)}
                  className="control-select"
                >
                  <option value="">{tt('Manual composition')}</option>
                  {BUNDLED_BUILD_ORDERS.map((build) => (
                    <option key={build.name} value={build.name}>
                      {build.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-border/70 bg-background/25 p-3">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <div className="rts-ledger-head">{tt('Production lines')}</div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {mode === 'buildings'
                    ? tt('How many buildings run each queue.')
                    : tt('Target continuous output per minute.')}
                </p>
              </div>
              <Badge variant="secondary" className="text-[10px]">
                {lines.length} {lines.length === 1 ? tt('line') : tt('lines')}
              </Badge>
            </div>
            {lines.map((line, index) => (
              <div
                key={`${index}-${line.unitId}`}
                className="grid grid-cols-[auto_minmax(0,1fr)_88px_36px] items-center gap-2 rounded-md border border-border/60 bg-card/70 p-2"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-md border border-border/70 bg-secondary/50">
                  {(() => {
                    const selectedUnit = units.find((unit) => unit.id === line.unitId)
                    const icon = selectedUnit?.icon ? resolveAoE4Icon(selectedUnit.icon) : null
                    return icon ? (
                      <img src={icon} alt="" className="h-7 w-7 rounded-sm object-contain" />
                    ) : (
                      <span className="text-xs font-semibold text-primary">{index + 1}</span>
                    )
                  })()}
                </div>
                <select
                  value={line.unitId}
                  onChange={(event) => updateLine(index, { unitId: event.target.value })}
                  className="control-select min-w-0"
                >
                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {gameName(unit.name)} · {unit.time}s
                    </option>
                  ))}
                </select>
                <Input
                  type="number"
                  min={0}
                  max={1000}
                  step={mode === 'buildings' ? 1 : 0.1}
                  value={line.count}
                  onChange={(event) =>
                    updateLine(index, { count: Math.max(0, Number(event.target.value) || 0) })
                  }
                  className="px-2 text-center tabular-nums"
                  aria-label={
                    mode === 'buildings'
                      ? tt('Production buildings')
                      : tt('Target units per minute')
                  }
                />
                <button
                  type="button"
                  onClick={() =>
                    setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))
                  }
                  className="flex h-9 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
                  aria-label={tt('Remove production line')}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                units[0] && setLines((current) => [...current, { unitId: units[0]!.id, count: 1 }])
              }
              className="flex h-9 w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-primary/35 text-xs font-medium text-primary transition-colors hover:border-primary/70 hover:bg-primary/5"
              disabled={units.length === 0}
            >
              <Plus className="h-3.5 w-3.5" /> {tt('Add production line')}
            </button>
          </div>

          <div className="space-y-3 rounded-lg border border-border/70 p-3">
            <div>
              <div className="rts-ledger-head">{tt('Economy assumptions')}</div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {tt('Income and passive resources are subtracted from the queue demand.')}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label={tt('Food source')}>
                <select
                  value={foodSource}
                  onChange={(event) => setFoodSource(event.target.value)}
                  className="control-select"
                >
                  {FOOD_SOURCES.map((source) => (
                    <option key={source} value={source}>
                      {tt(source)}
                    </option>
                  ))}
                </select>
              </Field>
              <NumberField label={tt('Speed %')} value={speedPercent} onChange={setSpeedPercent} />
              <NumberField
                label={tt('Discount %')}
                value={discountPercent}
                onChange={setDiscountPercent}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <NumberField
                label={tt('Minimum food vills')}
                value={minFoodVillagers}
                onChange={setMinFoodVillagers}
              />
              {PRODUCTION_RESOURCES.slice(0, 2).map((resource) => (
                <NumberField
                  key={resource}
                  label={`${tt('Passive')}: ${tt(RESOURCE_LABELS[resource])}`}
                  value={passive[resource]}
                  onChange={(value) => setPassive((current) => ({ ...current, [resource]: value }))}
                />
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {PRODUCTION_RESOURCES.slice(2).map((resource) => (
                <NumberField
                  key={resource}
                  label={`${tt('Passive')}: ${tt(RESOURCE_LABELS[resource])}`}
                  value={passive[resource]}
                  onChange={(value) => setPassive((current) => ({ ...current, [resource]: value }))}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2 rounded-md border border-border/70 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="rts-ledger-head">{tt('Gathering rates')}</div>
                <p className="text-[11px] text-muted-foreground">
                  {tt('Use the selected food source or enter a custom rate snapshot.')}
                </p>
              </div>
              <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={useCustomGatherRates}
                  onChange={(event) => setUseCustomGatherRates(event.target.checked)}
                />
                {tt('Custom rates')}
              </label>
            </div>
            {useCustomGatherRates && (
              <div className="grid gap-3 sm:grid-cols-4">
                {PRODUCTION_RESOURCES.map((resource) => (
                  <NumberField
                    key={resource}
                    label={`${tt(RESOURCE_LABELS[resource])} / ${tt('min')}`}
                    value={customGatherRates[resource]}
                    onChange={(value) =>
                      setCustomGatherRates((current) => ({ ...current, [resource]: value }))
                    }
                  />
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2 rounded-md border border-border/70 p-3">
            <div>
              <div className="rts-ledger-head">{tt('Civilization modifiers')}</div>
              <p className="text-[11px] text-muted-foreground">
                {tt('Optional bonuses modeled from the current production-calculator ruleset.')}
              </p>
            </div>
            {visibleModifiers.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {tt('No additional modifiers are modeled for this civilization yet.')}
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {visibleModifiers.map((modifier) => (
                  <label
                    key={modifier.id}
                    className="flex cursor-pointer gap-2 rounded-md border border-border/60 p-2 text-xs hover:bg-secondary/40"
                  >
                    <input
                      type="checkbox"
                      checked={selectedModifierIds.includes(modifier.id)}
                      onChange={() => toggleModifier(modifier)}
                      className="mt-0.5"
                    />
                    <span>
                      <strong className="font-medium text-foreground">{tt(modifier.label)}</strong>
                      <span className="mt-0.5 block text-muted-foreground">
                        {tt(modifier.description)}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden lg:sticky lg:top-4">
        <div className="border-b border-border/70 bg-secondary/20 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="rts-section-title">{tt('Demand summary')}</div>
              <p className="mt-1 text-xs text-muted-foreground">
                {tt('Villagers needed to sustain every queue continuously.')}
              </p>
            </div>
            <div className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-right">
              <div className="text-[10px] uppercase tracking-wide text-primary/80">
                {tt('Total vills')}
              </div>
              <div className="text-2xl font-semibold tabular-nums text-primary">
                {Math.ceil(result.totalVillagers)}
              </div>
              <div className="text-[10px] text-muted-foreground">
                ≈ {result.totalVillagers.toFixed(1)} {tt('calculated')}
              </div>
            </div>
          </div>
        </div>
        <CardContent className="space-y-4 p-5">
          {result.lines.length === 0 ? (
            <EmptyBox>{tt('Add at least one production line.')}</EmptyBox>
          ) : (
            <>
              <div className="grid gap-2 sm:grid-cols-2">
                {PRODUCTION_RESOURCES.map((resource) => (
                  <div
                    key={resource}
                    className="rounded-md border border-border/70 bg-background/30 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{tt(RESOURCE_LABELS[resource])}</span>
                      <strong className="text-lg tabular-nums text-primary">
                        {result.villagers[resource].toFixed(1)}
                      </strong>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                      <span>{tt('villagers needed')}</span>
                      <span className="tabular-nums">
                        {result.net[resource].toFixed(1)} / {tt('min')}
                      </span>
                    </div>
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-primary/75 transition-all"
                        style={{
                          width: `${Math.min(100, (result.villagers[resource] / Math.max(1, result.totalVillagers)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="rts-ledger-head">{tt('Queue breakdown')}</div>
                  <span className="text-[10px] text-muted-foreground">
                    {tt('continuous output')}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {result.lines.map((line) => {
                    const icon = line.unit.icon ? resolveAoE4Icon(line.unit.icon) : null
                    return (
                      <div
                        key={line.unit.id}
                        className="flex items-center gap-2 rounded-md border border-border/60 bg-secondary/20 px-2.5 py-2 text-xs"
                      >
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-border/60 bg-background/50">
                          {icon ? (
                            <img src={icon} alt="" className="h-5 w-5 rounded-sm object-contain" />
                          ) : (
                            <span className="text-[10px] text-primary">•</span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium text-foreground">
                            {gameName(line.unit.name)}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {mode === 'buildings'
                              ? `${line.count} ${tt(line.count === 1 ? 'building' : 'buildings')}`
                              : `${line.unitsPerMinute.toFixed(2)} ${tt('units/min')} · ${line.buildingsRequired.toFixed(2)} ${tt('buildings')}`}
                            {' · '}
                            {line.unit.time}s {tt('cycle')}
                          </div>
                        </div>
                        <div className="text-right tabular-nums text-muted-foreground">
                          <div className="font-medium text-foreground">
                            {line.unitsPerMinute.toFixed(2)} / {tt('min')}
                          </div>
                          <div className="text-[10px]">{tt('output')}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="rounded-md border border-border/70 bg-background/25 p-3">
                <div className="rts-ledger-head">{tt('Gathering snapshot')}</div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                  {PRODUCTION_RESOURCES.map((resource) => (
                    <div key={resource}>
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        {tt(RESOURCE_LABELS[resource])}
                      </div>
                      <div className="mt-0.5 font-medium tabular-nums">
                        {result.rates[resource].toFixed(resource === 'food' ? 2 : 0)}
                        <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                          {tt('/ vill')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Field({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <label className={cn('flex flex-col gap-1', className)}>
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (value: number) => void
}) {
  return (
    <Field label={label}>
      <Input
        type="number"
        min={0}
        step={1}
        value={value}
        onChange={(event) => onChange(Math.max(0, Number(event.target.value) || 0))}
      />
    </Field>
  )
}
