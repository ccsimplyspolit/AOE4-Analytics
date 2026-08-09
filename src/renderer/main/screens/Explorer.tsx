import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  Building2,
  Database,
  Download,
  ExternalLink,
  FlaskConical,
  History,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  Video,
} from 'lucide-react'
import { GAME_DATA_CAPTURED_AT, GAME_DATA_VERSION, UNITS, type VendoredUnit } from '@data/gameData'
import {
  EXPLORER_RECORDS_BY_KIND,
  EXPLORER_RECORDS,
  type ExplorerRecord,
  type ExplorerRecordKind,
} from '@data/explorerData'
import tinctureMetaJson from '@data/tinctureMeta.json'
import { BUNDLED_BUILD_ORDERS } from '@data/buildOrders'
import { buildPatchAudit } from '@domain/patchAudit'
import { VIDEO_EVIDENCE_BY_CIV } from '@data/videoEvidence.generated'
import { civDisplayName } from '@domain/civ'
import { PageHead } from '../components/PageHead'
import { Card, CardContent } from '@shared/components/ui/card'
import { Badge } from '@shared/components/ui/badge'
import { cn } from '@shared/lib/utils'
import { formatCount, formatDurationShort } from '@shared/format'
import { useI18n } from '../../i18n'
import { ExplorerQuiz } from '../components/tools/ExplorerQuiz'
import { VideoPlayer } from '../components/VideoPlayer'
import { CuratedMatchPack } from '../components/CuratedMatchReviewCard'
import { ipc } from '@shared/ipc'
import type { OnlineSearchData, OnlineSearchResult, PublicDumpCategory } from '@ipc/contract'
import { usePublicDumpCatalog } from '../queries/usePublicDumpCatalog'

type Tab = 'units' | ExplorerRecordKind | 'patches' | 'dumps' | 'videos' | 'quiz'

const TABS: { id: Tab; label: string; icon: typeof Search }[] = [
  { id: 'units', label: 'Unit Explorer', icon: Search },
  { id: 'building', label: 'Buildings', icon: Building2 },
  { id: 'technology', label: 'Technologies', icon: FlaskConical },
  { id: 'upgrade', label: 'Upgrades', icon: Shield },
  { id: 'patches', label: 'Patches', icon: History },
  { id: 'dumps', label: 'Dumps', icon: Database },
  { id: 'videos', label: 'Video Finder', icon: Video },
  { id: 'quiz', label: 'Explorer Quiz', icon: Sparkles },
]

type TinctureMetaSnapshot = {
  generatedAt: string
  patch?: string | null
}

const TINCTURE_META = tinctureMetaJson as TinctureMetaSnapshot

export function Explorer() {
  const { tt } = useI18n()
  const [tab, setTab] = useState<Tab>('units')

  return (
    <div className="animate-fade-in space-y-6">
      <PageHead
        kicker={tt('Explorer')}
        title={tt('Dumps & Evidence')}
        sub={tt(
          'Search the bundled AoE4World data snapshot, patch coverage, and video evidence extracted from public matches.',
        )}
        aside={<Badge variant="outline">{tt('Local-first')}</Badge>}
      />

      <div className="flex flex-wrap gap-1" role="tablist">
        {TABS.map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors',
                tab === t.id
                  ? 'bg-secondary text-foreground'
                  : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {tt(t.label)}
            </button>
          )
        })}
      </div>

      {tab === 'units' ? (
        <UnitExplorer />
      ) : tab === 'videos' ? (
        <VideoExplorer />
      ) : tab === 'quiz' ? (
        <ExplorerQuiz />
      ) : tab === 'patches' ? (
        <PatchExplorer />
      ) : tab === 'dumps' ? (
        <DumpExplorer />
      ) : (
        <RecordExplorer kind={tab} />
      )}
    </div>
  )
}

function UnitExplorer() {
  const { tt, gameName } = useI18n()
  const [query, setQuery] = useState('')
  const [age, setAge] = useState<'all' | '1' | '2' | '3' | '4'>('all')
  const [civFilter, setCivFilter] = useState('all')

  const civs = useMemo(() => {
    const values = new Set<string>()
    for (const unit of UNITS) for (const civ of unit.civs) values.add(civ)
    return [...values].sort((a, b) => civDisplayName(a).localeCompare(civDisplayName(b)))
  }, [])

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase()
    return UNITS.filter((unit) => {
      if (age !== 'all' && unit.minAge !== Number(age)) return false
      if (civFilter !== 'all' && !unit.civs.includes(civFilter)) return false
      if (!needle) return true
      return [unit.name, unit.id, ...unit.displayClasses, ...unit.classes]
        .join(' ')
        .toLocaleLowerCase()
        .includes(needle)
    })
  }, [age, civFilter, query])

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-3">
          <label className="space-y-1">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              {tt('Search')}
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={tt('Unit name, class, id...')}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              {tt('Age')}
            </span>
            <select
              value={age}
              onChange={(e) => setAge(e.target.value as typeof age)}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            >
              <option value="all">{tt('All ages')}</option>
              <option value="1">{tt('Dark')}</option>
              <option value="2">{tt('Feudal')}</option>
              <option value="3">{tt('Castle')}</option>
              <option value="4">{tt('Imperial')}</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              {tt('Civilization')}
            </span>
            <select
              value={civFilter}
              onChange={(e) => setCivFilter(e.target.value)}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            >
              <option value="all">{tt('All civilizations')}</option>
              {civs.map((civ) => (
                <option key={civ} value={civ}>
                  {gameName(civDisplayName(civ))}
                </option>
              ))}
            </select>
          </label>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="rts-ledger-head px-4 py-2.5 text-left">{tt('Unit')}</th>
                  <th className="rts-ledger-head px-2 py-2.5 text-left">{tt('Age')}</th>
                  <th className="rts-ledger-head px-2 py-2.5 text-left">{tt('Classes')}</th>
                  <th className="rts-ledger-head px-4 py-2.5 text-right">{tt('Civs')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((unit) => (
                  <tr
                    key={unit.id}
                    className="border-b border-border/60 last:border-0 hover:bg-secondary/40"
                  >
                    <td className="px-4 py-2">
                      <div className="font-medium">{unit.name}</div>
                      <div className="text-[11px] text-muted-foreground">{unit.id}</div>
                    </td>
                    <td className="px-2 py-2 text-muted-foreground">{unit.minAge}</td>
                    <td className="px-2 py-2 text-muted-foreground">
                      {unit.displayClasses.slice(0, 3).join(', ')}
                    </td>
                    <td className="px-4 py-2 text-right text-muted-foreground">
                      {unit.civs.length}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">{tt('Snapshot details')}</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              {tt(
                'This explorer reads the bundled AoE4World unit dump. It is useful for browsing unit availability, civ ownership, ages, and roles without leaving the app.',
              )}
            </p>
            <div className="grid gap-2 text-sm">
              <Detail label={tt('Units loaded')} value={String(UNITS.length)} />
              <Detail label={tt('Visible results')} value={String(filtered.length)} />
              <Detail label={tt('Civs represented')} value={String(civs.length)} />
            </div>
            {filtered[0] && <UnitDetail unit={filtered[0]} />}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function UnitDetail({ unit }: { unit: VendoredUnit }) {
  const { tt } = useI18n()
  return (
    <div className="rounded-md border border-border bg-background/40 p-3 text-sm">
      <div className="font-medium">{unit.name}</div>
      <div className="mt-1 text-xs text-muted-foreground">{unit.displayClasses.join(' · ')}</div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
        <Detail label={tt('HP')} value={unit.hitpoints == null ? '—' : String(unit.hitpoints)} />
        <Detail label={tt('Time')} value={unit.costs == null ? '—' : `${unit.costs.time}s`} />
        <Detail
          label={tt('Attack')}
          value={unit.attack ? `${unit.attack.damage} ${unit.attack.type}` : '—'}
        />
        <Detail label={tt('Armor')} value={`${unit.armor.melee}/${unit.armor.ranged}`} />
      </div>
    </div>
  )
}

function RecordExplorer({ kind }: { kind: ExplorerRecordKind }) {
  const { tt, gameName } = useI18n()
  const records = EXPLORER_RECORDS_BY_KIND[kind]
  const [query, setQuery] = useState('')
  const [age, setAge] = useState<'all' | '1' | '2' | '3' | '4'>('all')
  const [civFilter, setCivFilter] = useState('all')

  const civs = useMemo(() => {
    const values = new Set<string>()
    for (const record of records) for (const civ of record.civs) values.add(civ)
    return [...values].sort((a, b) => civDisplayName(a).localeCompare(civDisplayName(b)))
  }, [records])

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase()
    return records.filter((record) => {
      if (age !== 'all' && record.minAge !== Number(age)) return false
      if (civFilter !== 'all' && !record.civs.includes(civFilter)) return false
      if (!needle) return true
      return [
        record.name,
        record.id,
        record.description,
        ...record.displayClasses,
        ...record.classes,
        ...record.producedBy,
      ]
        .join(' ')
        .toLocaleLowerCase()
        .includes(needle)
    })
  }, [age, civFilter, query, records])

  const label = TABS.find((tab) => tab.id === kind)?.label ?? kind

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-3">
          <label className="space-y-1">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              {tt('Search')}
            </span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={tt('Name, class, producer...')}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              {tt('Age')}
            </span>
            <select
              value={age}
              onChange={(event) => setAge(event.target.value as typeof age)}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            >
              <option value="all">{tt('All ages')}</option>
              <option value="1">{tt('Dark')}</option>
              <option value="2">{tt('Feudal')}</option>
              <option value="3">{tt('Castle')}</option>
              <option value="4">{tt('Imperial')}</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              {tt('Civilization')}
            </span>
            <select
              value={civFilter}
              onChange={(event) => setCivFilter(event.target.value)}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            >
              <option value="all">{tt('All civilizations')}</option>
              {civs.map((civ) => (
                <option key={civ} value={civ}>
                  {gameName(civDisplayName(civ))}
                </option>
              ))}
            </select>
          </label>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="text-sm font-semibold">{tt(label)}</div>
              <Badge variant="outline">
                {filtered.length} / {records.length}
              </Badge>
            </div>
            <div className="max-h-[620px] overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b border-border">
                    <th className="rts-ledger-head px-4 py-2.5 text-left">{tt('Name')}</th>
                    <th className="rts-ledger-head px-2 py-2.5 text-left">{tt('Age')}</th>
                    <th className="rts-ledger-head px-2 py-2.5 text-left">{tt('Role')}</th>
                    <th className="rts-ledger-head px-4 py-2.5 text-right">{tt('Civs')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((record) => (
                    <tr
                      key={`${record.kind}:${record.id}`}
                      className="border-b border-border/60 last:border-0 hover:bg-secondary/40"
                    >
                      <td className="px-4 py-2">
                        <div className="font-medium">{record.name}</div>
                        <div className="text-[11px] text-muted-foreground">{record.id}</div>
                      </td>
                      <td className="px-2 py-2 text-muted-foreground">{record.minAge}</td>
                      <td className="px-2 py-2 text-muted-foreground">
                        {record.displayClasses.slice(0, 2).join(', ') || '—'}
                      </td>
                      <td className="px-4 py-2 text-right text-muted-foreground">
                        {record.civs.length}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                  {tt('No matching records.')}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">{tt('Record details')}</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              {tt(
                'The first result is shown with its compact data snapshot, cost, timing, availability, and producer information.',
              )}
            </p>
            {filtered[0] ? <RecordDetail record={filtered[0]} /> : <EmptyRecord />}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function RecordDetail({ record }: { record: ExplorerRecord }) {
  const { tt, gameName } = useI18n()
  const costs = record.costs
  return (
    <div className="space-y-3 rounded-md border border-border bg-background/40 p-3 text-sm">
      <div>
        <div className="font-medium">{record.name}</div>
        <div className="mt-1 text-xs text-muted-foreground">
          {record.displayClasses.join(' · ') || record.id}
        </div>
      </div>
      {record.description && (
        <p className="leading-relaxed text-muted-foreground">{record.description}</p>
      )}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <Detail label={tt('Age')} value={String(record.minAge)} />
        <Detail label={tt('Unique')} value={record.unique ? tt('Yes') : tt('No')} />
        <Detail label={tt('Time')} value={costs ? `${costs.time}s` : '—'} />
        <Detail
          label={tt('HP')}
          value={record.hitpoints == null ? '—' : String(record.hitpoints)}
        />
      </div>
      {costs && (
        <div className="grid grid-cols-4 gap-1.5 text-xs">
          {(['food', 'wood', 'gold', 'stone'] as const).map((resource) => (
            <div key={resource} className="rounded border border-border/70 px-2 py-1.5 text-center">
              <div className="text-[10px] uppercase text-muted-foreground">{resource}</div>
              <div className="font-medium tabular-nums">{costs[resource]}</div>
            </div>
          ))}
        </div>
      )}
      <div className="space-y-1 text-xs">
        <div className="text-muted-foreground">{tt('Produced at')}</div>
        <div>
          {record.producedBy.length > 0 ? record.producedBy.map(humanize).join(' · ') : '—'}
        </div>
      </div>
      <div className="space-y-1 text-xs">
        <div className="text-muted-foreground">{tt('Civilizations')}</div>
        <div>
          {record.civs.length > 0
            ? record.civs.map((civ) => gameName(civDisplayName(civ))).join(' · ')
            : '—'}
        </div>
      </div>
    </div>
  )
}

function PatchExplorer() {
  const { tt } = useI18n()
  const sourcePatch = TINCTURE_META.patch ?? null
  const patchIds = (sourcePatch ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
  const audit = buildPatchAudit({
    sourcePatch,
    buildPatches: BUNDLED_BUILD_ORDERS.map((build) => build.patch),
  })
  const generatedAt = new Date(TINCTURE_META.generatedAt)
  const generatedLabel = Number.isNaN(generatedAt.getTime())
    ? TINCTURE_META.generatedAt
    : generatedAt.toLocaleString()

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Detail label={tt('Source snapshot')} value={GAME_DATA_VERSION} />
        <Detail
          label={tt('Records')}
          value={String(
            EXPLORER_RECORDS_BY_KIND.building.length +
              EXPLORER_RECORDS_BY_KIND.technology.length +
              EXPLORER_RECORDS_BY_KIND.upgrade.length,
          )}
        />
        <Detail label={tt('Builds covered')} value={String(audit.builds.covered)} />
        <Detail label={tt('Snapshot time')} value={generatedLabel} />
      </div>
      <Card>
        <CardContent className="space-y-4 p-4">
          <div>
            <div className="rts-section-title">{tt('Patch coverage')}</div>
            <p className="mt-1 text-sm text-muted-foreground">
              {tt(
                'The patch tab keeps the local dump and build archive honest: it shows which patch identifiers were captured and which build entries are covered, legacy, or unversioned.',
              )}
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <Detail label={tt('Covered')} value={String(audit.builds.covered)} />
            <Detail label={tt('Legacy')} value={String(audit.builds.legacy)} />
            <Detail label={tt('Unversioned')} value={String(audit.builds.unversioned)} />
          </div>
          <div className="flex flex-wrap gap-2">
            {patchIds.map((patch) => (
              <Badge key={patch} variant="secondary">
                {patch}
              </Badge>
            ))}
            {patchIds.length === 0 && (
              <span className="text-sm text-muted-foreground">
                {tt('No patch identifiers in the saved snapshot.')}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3 text-xs text-muted-foreground">
            <span>
              {tt(`AoE4World data captured ${new Date(GAME_DATA_CAPTURED_AT).toLocaleString()}.`)}
            </span>
            <a
              href="https://aoe4world.com/explorer/patches"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-primary hover:underline"
            >
              {tt('Open full patch explorer')} <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function EmptyRecord() {
  const { tt } = useI18n()
  return (
    <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
      {tt('No record selected.')}
    </div>
  )
}

function humanize(value: string): string {
  return value.replace(/[-_]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function DumpExplorer() {
  const { tt } = useI18n()
  const catalogQuery = usePublicDumpCatalog()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<'all' | PublicDumpCategory>('all')
  const catalog = catalogQuery.data?.ok ? catalogQuery.data.data : null
  const needle = search.trim().toLocaleLowerCase()
  const entries = useMemo(
    () =>
      (catalog?.entries ?? []).filter((entry) => {
        if (category !== 'all' && entry.category !== category) return false
        return !needle || entry.title.toLocaleLowerCase().includes(needle)
      }),
    [catalog?.entries, category, needle],
  )

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="rts-section-title">{tt('Official data dumps')}</div>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                {tt(
                  'Live catalog of the public AoE4World archives. Large files open from the official storage source instead of being mirrored into the app.',
                )}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void catalogQuery.refetch()}
                disabled={catalogQuery.isFetching}
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs hover:bg-secondary disabled:opacity-50"
              >
                <RefreshCw
                  className={cn('h-3.5 w-3.5', catalogQuery.isFetching && 'animate-spin')}
                />
                {tt('Refresh')}
              </button>
              <a
                href="https://aoe4world.com/dumps"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 px-3 py-2 text-xs text-primary hover:bg-primary/10"
              >
                {tt('Open source page')} <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={tt('Filter dumps...')}
              className="min-w-[220px] flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            {(['all', 'games', 'leaderboards'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setCategory(value)}
                className={cn(
                  'rounded-md border px-3 py-2 text-xs transition-colors',
                  category === value
                    ? 'border-primary/40 bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:bg-secondary',
                )}
              >
                {tt(value === 'all' ? 'All dumps' : value === 'games' ? 'Games' : 'Leaderboards')}
              </button>
            ))}
          </div>

          {catalogQuery.isPending ? (
            <div className="rounded-md border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
              {tt('Loading official dump catalog...')}
            </div>
          ) : catalogQuery.data && !catalogQuery.data.ok ? (
            <div className="rounded-md border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
              {catalogQuery.data.error.message}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>
                  {entries.length} {tt('dumps shown')}
                </span>
                {catalog && (
                  <span>
                    {tt('Captured')} {formatDumpDate(catalog.capturedAt)}
                  </span>
                )}
              </div>
              {entries.length === 0 ? (
                <div className="rounded-md border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
                  {tt('No official dumps match this filter.')}
                </div>
              ) : (
                entries.map((entry) => (
                  <div
                    key={entry.url}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border/70 bg-secondary/20 px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{entry.title}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {entry.size ?? tt('Size unavailable')} ·{' '}
                        {entry.age ?? tt('Age unavailable')}
                      </div>
                    </div>
                    <a
                      href={entry.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs text-primary hover:bg-primary/10"
                    >
                      <Download className="h-3.5 w-3.5" /> {tt('Open archive')}
                    </a>
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-wrap items-start justify-between gap-3 p-4">
          <div>
            <div className="rts-section-title">{tt('Local dump exports')}</div>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              {tt(
                'Export the exact compact snapshots used by this app for spreadsheets, research, or custom tools. Full historical AoE4World dumps remain available from the official source.',
              )}
            </p>
          </div>
          <a
            href="https://aoe4world.com/dumps"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 px-3 py-2 text-xs text-primary hover:bg-primary/10"
          >
            {tt('Open full dumps')} <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        <DumpCard
          title={tt('Game entities')}
          description={tt(
            'Military units plus buildings, technologies, and upgrades used by Explorer and Tincture.',
          )}
          count={`${UNITS.length} ${tt('units')} · ${EXPLORER_RECORDS.length} ${tt('records')}`}
          onJson={() =>
            downloadSnapshot('rtslytics-game-entities.json', {
              units: UNITS,
              records: EXPLORER_RECORDS,
            })
          }
          onCsv={() => downloadRecordsCsv('rtslytics-game-entities.csv', EXPLORER_RECORDS)}
        />
        <DumpCard
          title={tt('Video evidence')}
          description={tt(
            'Harvested public-video metadata and derived signals, with provenance links preserved.',
          )}
          count={`${Object.keys(VIDEO_EVIDENCE_BY_CIV).length} ${tt('civilizations')}`}
          onJson={() => downloadSnapshot('rtslytics-video-evidence.json', VIDEO_EVIDENCE_BY_CIV)}
          onCsv={() => downloadVideoCsv()}
        />
      </div>
      <div className="text-xs text-muted-foreground">
        {tt(
          'Exports contain metadata and compact projections only; they do not include raw replay files or copied video transcripts.',
        )}
      </div>
    </div>
  )
}

function formatDumpDate(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

function DumpCard({
  title,
  description,
  count,
  onJson,
  onCsv,
}: {
  title: string
  description: string
  count: string
  onJson: () => void
  onCsv: () => void
}) {
  const { tt } = useI18n()
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div>
          <div className="text-sm font-semibold">{title}</div>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="text-xs text-muted-foreground">{count}</div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onJson}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs hover:bg-secondary"
          >
            <Download className="h-3.5 w-3.5" /> JSON
          </button>
          <button
            type="button"
            onClick={onCsv}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs hover:bg-secondary"
          >
            <Download className="h-3.5 w-3.5" /> CSV
          </button>
        </div>
        <div className="text-[11px] text-muted-foreground">
          {tt('Generated from the bundled snapshot')}
        </div>
      </CardContent>
    </Card>
  )
}

function downloadSnapshot(filename: string, value: unknown): void {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' })
  downloadBlob(filename, blob)
}

function downloadRecordsCsv(filename: string, records: ExplorerRecord[]): void {
  const header = ['kind', 'id', 'name', 'age', 'unique', 'civs', 'classes', 'description']
  const rows = records.map((record) => [
    record.kind,
    record.id,
    record.name,
    record.minAge,
    record.unique,
    record.civs.join('|'),
    record.displayClasses.join('|'),
    record.description,
  ])
  downloadBlob(filename, new Blob([toCsv([header, ...rows])], { type: 'text/csv;charset=utf-8' }))
}

function downloadVideoCsv(): void {
  const rows: Array<Array<string | number | null>> = [
    [
      'civ',
      'video_id',
      'title',
      'channel',
      'published_at',
      'url',
      'topics',
      'opponents',
      'confidence',
    ],
  ]
  const seen = new Set<string>()
  for (const [civ, evidence] of Object.entries(VIDEO_EVIDENCE_BY_CIV)) {
    for (const source of evidence.sources) {
      if (seen.has(source.id)) continue
      seen.add(source.id)
      rows.push([
        civ,
        source.id,
        source.title,
        source.channel,
        source.publishedAt,
        source.url,
        source.signals.topics.join('|'),
        source.signals.opponentCivs.join('|'),
        source.signals.confidence,
      ])
    }
  }
  downloadBlob(
    'rtslytics-video-evidence.csv',
    new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' }),
  )
}

function toCsv(rows: Array<Array<unknown>>): string {
  return rows
    .map((row) => row.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(','))
    .join('\n')
}

function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function VideoExplorer() {
  const { tt, gameName } = useI18n()
  const queryClient = useQueryClient()
  const [query, setQuery] = useState('')
  const [civFilter, setCivFilter] = useState('all')
  const [opponentFilter, setOpponentFilter] = useState('all')
  const [sort, setSort] = useState<'recent' | 'views'>('recent')
  const [onlineQuery, setOnlineQuery] = useState('')
  const [onlineProvider, setOnlineProvider] = useState<'all' | 'twitch' | 'youtube'>('all')
  const [onlineLiveOnly, setOnlineLiveOnly] = useState(false)
  const [onlineLoading, setOnlineLoading] = useState(false)
  const [onlineData, setOnlineData] = useState<OnlineSearchData | null>(null)
  const [onlineError, setOnlineError] = useState<string | null>(null)
  const [onlineAnalysisId, setOnlineAnalysisId] = useState<string | null>(null)
  const [onlineAnalysisMessage, setOnlineAnalysisMessage] = useState<string | null>(null)
  const sources = useMemo(() => {
    const byId = new Map<
      string,
      {
        source: (typeof VIDEO_EVIDENCE_BY_CIV)[string]['sources'][number]
        civs: string[]
      }
    >()
    for (const [civ, evidence] of Object.entries(VIDEO_EVIDENCE_BY_CIV)) {
      for (const source of evidence.sources) {
        const existing = byId.get(source.id)
        if (existing) {
          if (!existing.civs.includes(civ)) existing.civs.push(civ)
        } else {
          byId.set(source.id, { source, civs: [civ] })
        }
      }
    }
    return [...byId.values()]
  }, [])
  const civs = Object.keys(VIDEO_EVIDENCE_BY_CIV).sort((a, b) =>
    civDisplayName(a).localeCompare(civDisplayName(b)),
  )
  const opponents = useMemo(
    () =>
      [...new Set(sources.flatMap(({ source }) => source.signals.opponentCivs))].sort((a, b) =>
        civDisplayName(a).localeCompare(civDisplayName(b)),
      ),
    [sources],
  )
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase()
    return sources
      .filter(({ source, civs: sourceCivs }) => {
        if (civFilter !== 'all' && !sourceCivs.includes(civFilter)) return false
        if (opponentFilter !== 'all' && !source.signals.opponentCivs.includes(opponentFilter))
          return false
        if (!needle) return true
        return [
          source.title,
          source.channel ?? '',
          ...source.signals.topics,
          ...source.signals.actions,
          ...source.signals.militaryMentions,
          ...source.signals.opponentCivs,
        ]
          .join(' ')
          .toLocaleLowerCase()
          .includes(needle)
      })
      .sort((left, right) => {
        if (sort === 'views') return (right.source.viewCount ?? -1) - (left.source.viewCount ?? -1)
        return right.source.publishedAt.localeCompare(left.source.publishedAt)
      })
  }, [civFilter, opponentFilter, query, sort, sources])

  const runOnlineSearch = useCallback(async () => {
    if (onlineQuery.trim().length < 2) return
    setOnlineLoading(true)
    setOnlineError(null)
    try {
      const result = await ipc.searchOnline({
        query: onlineQuery,
        provider: onlineProvider,
        liveOnly: onlineLiveOnly,
        limit: 12,
      })
      if (result.ok) setOnlineData(result.data)
      else setOnlineError(result.error.message)
    } catch (error) {
      setOnlineError(error instanceof Error ? error.message : String(error))
    } finally {
      setOnlineLoading(false)
    }
  }, [onlineLiveOnly, onlineProvider, onlineQuery])

  const analyzeOnlineVideo = useCallback(
    async (result: OnlineSearchResult) => {
      if (result.kind !== 'video' || onlineAnalysisId != null) return
      setOnlineAnalysisId(`${result.provider}:${result.id}`)
      setOnlineAnalysisMessage(null)
      const extracted = await ipc.extractVideoAnalysis({ url: result.url })
      if (extracted.ok) {
        void queryClient.invalidateQueries({ queryKey: ['videoAnalyses'] })
        setOnlineAnalysisMessage(
          `${tt('Saved analysis')}: ${extracted.data.build.build_order.length} ${tt('steps')} · ${extracted.data.tactics.length} ${tt('tactics')}`,
        )
      } else {
        setOnlineAnalysisMessage(extracted.error.message)
      }
      setOnlineAnalysisId(null)
    },
    [onlineAnalysisId, queryClient, tt],
  )

  // Search is intentionally automatic after a short pause so the live finder
  // behaves like the linked AoE4World tool: typing a player/channel is enough,
  // while the explicit button and Enter key remain available for accessibility.
  useEffect(() => {
    if (onlineQuery.trim().length < 2) return
    const timer = window.setTimeout(() => void runOnlineSearch(), 650)
    return () => window.clearTimeout(timer)
  }, [onlineQuery, onlineProvider, onlineLiveOnly, runOnlineSearch])

  return (
    <div className="space-y-4">
      <CuratedMatchPack />
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <p className="max-w-3xl text-sm text-muted-foreground">
              {tt(
                'Browse the local public-video evidence corpus or search current AoE4World VODs and linked streamers online. Optional provider keys add direct Twitch and YouTube results.',
              )}
            </p>
            <a
              href="https://aoe4world.com/tools/twitch-video-finder"
              target="_blank"
              rel="noreferrer"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-primary/30 px-3 py-2 text-xs text-primary hover:bg-primary/10"
            >
              {tt('Open live finder')} <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
          <div className="rounded-md border border-primary/20 bg-primary/5 p-3">
            <div className="flex flex-wrap items-end gap-2">
              <label className="min-w-52 flex-1 space-y-1">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  {tt('Live online search')}
                </span>
                <input
                  value={onlineQuery}
                  onChange={(event) => setOnlineQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') void runOnlineSearch()
                  }}
                  placeholder={tt('Player, channel, or build topic...')}
                  className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </label>
              <select
                value={onlineProvider}
                onChange={(event) => setOnlineProvider(event.target.value as typeof onlineProvider)}
                className="h-9 rounded-md border border-border bg-background px-2 text-sm"
                aria-label={tt('Provider')}
              >
                <option value="all">{tt('All providers')}</option>
                <option value="twitch">{tt('Twitch')}</option>
                <option value="youtube">{tt('YouTube')}</option>
              </select>
              <label className="flex h-9 items-center gap-1.5 px-1 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={onlineLiveOnly}
                  onChange={(event) => setOnlineLiveOnly(event.target.checked)}
                />{' '}
                {tt('Live only')}
              </label>
              <button
                type="button"
                disabled={onlineLoading || onlineQuery.trim().length < 2}
                onClick={() => void runOnlineSearch()}
                className="h-9 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground disabled:opacity-50"
              >
                {onlineLoading ? tt('Searching…') : tt('Search online')}
              </button>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              {tt(
                'AoE4World live data works without keys; configured Twitch/YouTube API keys add direct provider results.',
              )}
            </p>
            {onlineError && <p className="mt-2 text-xs text-destructive">{onlineError}</p>}
            {onlineAnalysisMessage && (
              <p className="mt-2 text-xs text-primary">{onlineAnalysisMessage}</p>
            )}
            {onlineData && (
              <div className="mt-3 space-y-3">
                <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                  <span>
                    {onlineData.results.length} {tt('online results')}
                  </span>
                  <span>
                    · {tt('Twitch')}: {onlineData.providers.twitch}
                  </span>
                  <span>
                    · {tt('YouTube')}: {onlineData.providers.youtube}
                  </span>
                </div>
                {onlineData.results.length > 0 && (
                  <div className="grid gap-2 md:grid-cols-2">
                    {onlineData.results.map((result) => (
                      <div
                        key={`${result.provider}:${result.id}`}
                        className="flex gap-2 rounded-md border border-border/70 p-2 hover:border-primary/60"
                      >
                        <a
                          href={result.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex min-w-0 flex-1 gap-2"
                        >
                          <div className="h-12 w-20 shrink-0 overflow-hidden rounded bg-secondary">
                            {result.thumbnailUrl && (
                              <img
                                src={result.thumbnailUrl}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <div className="min-w-0 truncate text-xs font-medium">
                                {result.title}
                              </div>
                              <Badge
                                variant={result.kind === 'streamer' ? 'success' : 'secondary'}
                                className="shrink-0 text-[9px] uppercase"
                              >
                                {result.kind === 'streamer' ? tt('Streamer') : tt('Video')}
                              </Badge>
                              {result.live && (
                                <Badge
                                  variant="destructive"
                                  className="shrink-0 text-[9px] uppercase"
                                >
                                  {tt('Live')}
                                </Badge>
                              )}
                            </div>
                            <div className="truncate text-[11px] text-muted-foreground">
                              {result.channel} · {result.provider}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {result.publishedAt ? formatOnlineDate(result.publishedAt) : null}
                              {result.viewCount != null
                                ? ` · ${formatCount(result.viewCount)} ${tt('views')}`
                                : ''}
                              {result.durationSec != null
                                ? ` · ${formatDurationShort(result.durationSec)}`
                                : ''}
                            </div>
                          </div>
                        </a>
                        {result.kind === 'video' && (
                          <button
                            type="button"
                            disabled={onlineAnalysisId != null}
                            onClick={() => void analyzeOnlineVideo(result)}
                            className="self-center rounded-md border border-primary/40 px-2 py-1.5 text-[10px] text-primary hover:bg-primary/10 disabled:cursor-wait disabled:opacity-50"
                          >
                            {onlineAnalysisId === `${result.provider}:${result.id}`
                              ? tt('Extracting…')
                              : tt('Analyze')}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {onlineData.fallbackLinks.map((link) => (
                    <a
                      key={`${link.provider}:${link.url}`}
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-primary hover:underline"
                    >
                      {link.label} ↗
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <label className="space-y-1 md:col-span-2">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                {tt('Search')}
              </span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={tt('Title, channel, topic...')}
                className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                {tt('Civ')}
              </span>
              <select
                value={civFilter}
                onChange={(event) => setCivFilter(event.target.value)}
                className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
              >
                <option value="all">{tt('All civilizations')}</option>
                {civs.map((civ) => (
                  <option key={civ} value={civ}>
                    {gameName(civDisplayName(civ))}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                {tt('Opponent')}
              </span>
              <select
                value={opponentFilter}
                onChange={(event) => setOpponentFilter(event.target.value)}
                className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
              >
                <option value="all">{tt('All opponents')}</option>
                {opponents.map((civ) => (
                  <option key={civ} value={civ}>
                    {gameName(civDisplayName(civ))}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>
              {filtered.length} {tt('matching videos')}
            </span>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as typeof sort)}
              className="h-8 rounded-md border border-border bg-background px-2"
              aria-label={tt('Sort videos')}
            >
              <option value="recent">{tt('Most recent')}</option>
              <option value="views">{tt('Most viewed')}</option>
            </select>
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-3 lg:grid-cols-2">
        {filtered.slice(0, 80).map(({ source, civs: sourceCivs }) => (
          <Card key={source.id}>
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold">{source.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {source.channel ?? tt('Unknown channel')} ·{' '}
                    {formatVideoDate(source.publishedAt)}
                  </div>
                </div>
                <Badge variant="secondary">{source.signals.archetype ?? tt('evidence')}</Badge>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {sourceCivs.slice(0, 3).map((civ) => (
                  <Badge key={civ} variant="outline">
                    {gameName(civDisplayName(civ))}
                  </Badge>
                ))}
                {source.signals.opponentCivs.slice(0, 3).map((civ) => (
                  <Badge key={`opponent:${civ}`} variant="outline">
                    {tt('vs')} {gameName(civDisplayName(civ))}
                  </Badge>
                ))}
                {source.signals.topics.slice(0, 3).map((topic) => (
                  <Badge key={topic} variant="outline">
                    {topic}
                  </Badge>
                ))}
              </div>
              <VideoPlayer url={source.url} title={source.title} />
              <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span>
                  {source.viewCount == null
                    ? tt('Views unavailable')
                    : `${source.viewCount.toLocaleString()} ${tt('views')}`}{' '}
                  · confidence {Math.round(source.signals.confidence * 100)}%
                </span>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  {tt('Watch')} <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {filtered.length === 0 && <EmptyRecord />}
      {filtered.length > 80 && (
        <div className="text-center text-xs text-muted-foreground">
          {tt('Showing the first 80 matches. Refine the filters to narrow the corpus.')}
        </div>
      )}
    </div>
  )
}

function formatVideoDate(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString()
}

function formatOnlineDate(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString()
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/70 bg-background/30 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-medium">{value}</div>
    </div>
  )
}
