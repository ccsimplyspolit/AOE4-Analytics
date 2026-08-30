import { useMemo, useState } from 'react'
import { CalendarDays, ExternalLink, Newspaper, RefreshCw, Rss, Search } from 'lucide-react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import type {
  PatchChangeKind,
  PatchNewsItem,
  PatchNewsSource,
  PatchNotes,
} from '@domain/patchNotes'
import { filterPatchChangesForCivilization } from '@domain/patchNotes'
import { CIV_CODE_TO_SLUG, CIV_SLUG_TO_CODE } from '@data/civs'
import { civDisplayName } from '@domain/civ'
import { resolveAoE4Icon } from '@data/vendor/aoe4-icons/manifest'
import { useI18n } from '../../i18n'
import { usePatchNotes } from '../queries/usePatchNotes'
import { CURRENT_META } from '@data/currentMeta'
import { PageHead } from '../components/PageHead'
import { ErrorBox } from '../components/feedback'
import { Card, CardContent, CardHeader, CardTitle } from '@shared/components/ui/card'
import { Skeleton } from '@shared/components/ui/skeleton'
import { cn } from '@shared/lib/utils'

const CHANGE_KINDS: Array<{ value: PatchChangeKind | ''; label: string }> = [
  { value: '', label: 'All change types' },
  { value: 'buff', label: 'Buffs' },
  { value: 'nerf', label: 'Nerfs' },
  { value: 'fix', label: 'Bug fixes' },
  { value: 'change', label: 'Changes' },
  { value: 'rework', label: 'Reworks' },
]

function formatDate(value: string | null, locale: string): string {
  if (!value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.valueOf())) return '—'
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(parsed)
}

function typeLabel(type: PatchNotes['type']): string {
  return type === 'server-side' ? 'Server-side' : type === 'hotfix' ? 'Hotfix' : 'Update'
}

function kindClass(kind: PatchChangeKind): string {
  if (kind === 'buff' || kind === 'add') return 'border-win/30 bg-win/10 text-win'
  if (kind === 'nerf' || kind === 'remove') return 'border-loss/30 bg-loss/10 text-loss'
  if (kind === 'fix') return 'border-sky-400/30 bg-sky-400/10 text-sky-300'
  return 'border-primary/30 bg-primary/10 text-primary'
}

const CIV_ICON_ALIAS_BY_CODE: Record<string, string> = {
  ab: 'civ-icon-small-abbasid',
  ay: 'civ-icon-small-ayy',
  by: 'civ-icon-small-byzantine',
  ch: 'civ-icon-small-chinese',
  de: 'civ-icon-small-sultinates',
  en: 'civ-icon-small-anglo-saxon-england',
  fr: 'civ-icon-small-french',
  gol: 'civ-icon-small-goh',
  hl: 'civ-icon-small-house-of-lancaster',
  hr: 'civ-icon-small-holy-roman-empirel',
  ja: 'civ-icon-small-japanese',
  je: 'civ-icon-small-jer',
  jin: 'civ-icon-small-historic-chi',
  kt: 'civ-icon-small-knights-templar',
  ma: 'civ-icon-small-malian',
  mac: 'civ-icon-small-mac',
  mo: 'civ-icon-small-mongols',
  od: 'civ-icon-small-teu',
  ot: 'civ-icon-small-ottoman',
  ru: 'civ-icon-small-rus',
  sen: 'civ-icon-small-sen',
  tug: 'civ-icon-small-tug',
  zx: 'civ-icon-small-chinese',
}

const PATCH_CIVILIZATIONS = Object.entries(CIV_CODE_TO_SLUG).map(([code, slug]) => ({
  code,
  slug,
  name: civDisplayName(slug),
  icon: resolveAoE4Icon(CIV_ICON_ALIAS_BY_CODE[code] ?? ''),
}))

function patchFragment(value: string): string {
  const slug = value.replace(/^#/, '').trim().toLocaleLowerCase()
  return CIV_SLUG_TO_CODE[slug] ? slug : ''
}

function sectionAnchor(value: string): string {
  return `patch-section-${value
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')}`
}

export function PatchNotes({ embedded = false }: { embedded?: boolean } = {}) {
  const { tt, locale } = useI18n()
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const selectedId = searchParams.get('patch') ?? undefined
  const selectedCivSlug = patchFragment(location.hash)
  const selectedCivCode = CIV_SLUG_TO_CODE[selectedCivSlug] ?? null
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<PatchChangeKind | ''>('')
  const [season, setSeason] = useState('')
  const [source, setSource] = useState<PatchNewsSource | ''>('')
  const [refreshNonce, setRefreshNonce] = useState(0)
  const { data, isLoading, isFetching, refetch } = usePatchNotes(selectedId, refreshNonce)

  const catalog = data?.ok ? data.data : null
  const seasons = useMemo(() => {
    const values = new Set(
      (catalog?.patches ?? [])
        .map((patch) => patch.season)
        .filter((value): value is number => value != null),
    )
    return [...values].sort((left, right) => right - left)
  }, [catalog?.patches])
  const patches = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase()
    return (catalog?.patches ?? []).filter((patch) => {
      if (season && String(patch.season ?? '') !== season) return false
      if (
        normalized &&
        !`${patch.name} ${patch.buildId} ${patch.summary ?? ''}`
          .toLocaleLowerCase()
          .includes(normalized)
      )
        return false
      if (!kind) return true
      return patch.changeKinds.includes(kind)
    })
  }, [catalog, kind, query, season])
  const news = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase()
    return (catalog?.news ?? []).filter((item) => {
      if (source && item.source !== source) return false
      if (!normalized) return true
      return `${item.title} ${item.excerpt ?? ''}`.toLocaleLowerCase().includes(normalized)
    })
  }, [catalog?.news, query, source])

  const selectPatch = (id: string) => {
    const next = new URLSearchParams(searchParams)
    next.set('patch', id)
    navigate(`${location.pathname}?${next.toString()}`, { replace: true })
  }

  const selectCiv = (slug: string) => {
    const next = new URLSearchParams(searchParams)
    const search = next.toString()
    const nestedFragment = slug ? `#${slug}` : ''
    navigate(`${location.pathname}${search ? `?${search}` : ''}${nestedFragment}`, {
      replace: true,
    })
  }

  return (
    <div className={embedded ? 'space-y-6' : 'animate-fade-in space-y-6'}>
      <PageHead
        embedded={embedded}
        kicker="AoE4World Explorer"
        title="News & patches"
        sub={tt(
          'Current and historical Age of Empires IV patch notes, balance changes, fixes, and official release links.',
        )}
      />

      <section className="rts-menu-card space-y-3 border border-primary/25 bg-card p-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <div className="rts-ledger-head">{tt('Live patch window')}</div>
            <h2 className="mt-1 text-base font-semibold">{CURRENT_META.patchLabel}</h2>
          </div>
          <div className="text-[11px] text-muted-foreground">
            {tt('Captured')} {CURRENT_META.capturedAt.slice(0, 10)}
          </div>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">{tt(CURRENT_META.summary)}</p>
        <ol className="grid gap-2 md:grid-cols-2">
          {CURRENT_META.patches.map((patch) => (
            <li key={patch.id}>
              <a
                href={patch.url}
                target="_blank"
                rel="noreferrer"
                className="block rounded-sm border border-border/70 bg-background/40 px-3 py-2 hover:border-primary/40"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-medium">{patch.title}</span>
                  <span className="text-[11px] tabular-nums text-muted-foreground">{patch.date}</span>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">{tt(patch.summary)}</p>
              </a>
            </li>
          ))}
        </ol>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Newspaper className="h-4 w-4 text-primary" />
          {catalog
            ? `${catalog.patches.length} ${tt('patches loaded')}`
            : tt('Loading patch archive…')}
        </div>
        <button
          type="button"
          onClick={() => {
            setRefreshNonce((value) => value + 1)
          }}
          disabled={isFetching}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-sm transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
          {tt('Refresh')}
        </button>
      </div>

      {isLoading ? (
        <Skeleton className="h-[32rem]" />
      ) : data && !data.ok ? (
        <ErrorBox message={data.error.message} onRetry={() => refetch()} />
      ) : catalog ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(15rem,0.85fr)_minmax(0,1.8fr)]">
          <Card className="min-h-0">
            <CardHeader className="space-y-3 pb-3">
              <CardTitle className="text-base">{tt('Patch archive')}</CardTitle>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={tt('Search patch, season, or build')}
                  aria-label={tt('Search patch, season, or build')}
                  className="h-9 w-full rounded-md border border-border bg-background pl-9 pr-2 text-sm outline-none focus:border-primary/60"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={season}
                  onChange={(event) => setSeason(event.target.value)}
                  aria-label={tt('Season')}
                  className="h-9 min-w-0 rounded-md border border-border bg-background px-2 text-xs"
                >
                  <option value="">{tt('All seasons')}</option>
                  {seasons.map((value) => (
                    <option key={value} value={value}>
                      {tt('Season')} {value}
                    </option>
                  ))}
                </select>
                <select
                  value={kind}
                  onChange={(event) => setKind(event.target.value as PatchChangeKind | '')}
                  aria-label={tt('Change type')}
                  className="h-9 min-w-0 rounded-md border border-border bg-background px-2 text-xs"
                >
                  {CHANGE_KINDS.map((entry) => (
                    <option key={entry.value} value={entry.value}>
                      {tt(entry.label)}
                    </option>
                  ))}
                </select>
              </div>
            </CardHeader>
            <CardContent className="max-h-[43rem] space-y-1 overflow-y-auto pt-0">
              {patches.map((patch) => (
                <button
                  key={patch.id}
                  type="button"
                  onClick={() => selectPatch(patch.id)}
                  className={cn(
                    'w-full rounded-md border px-3 py-2 text-left transition-colors',
                    patch.id === catalog.selected?.id
                      ? 'border-primary/50 bg-primary/10'
                      : 'border-transparent hover:border-border hover:bg-secondary/60',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="min-w-0 truncate text-sm font-medium">{tt(patch.name)}</span>
                    <span className="shrink-0 text-[10px] uppercase text-muted-foreground">
                      {tt(typeLabel(patch.type))}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                    <span>{patch.buildId}</span>
                    <span>{formatDate(patch.date, locale)}</span>
                  </div>
                </button>
              ))}
              {patches.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {tt('No patches match these filters.')}
                </p>
              )}
            </CardContent>
          </Card>

          <PatchDetail
            patch={catalog.selected}
            selectedCiv={selectedCivCode}
            selectedCivSlug={selectedCivSlug}
            onCivChange={selectCiv}
          />
        </div>
      ) : null}

      {catalog && (
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          {tt('Updated')} {formatDate(catalog.capturedAt, locale)} ·{' '}
          <a
            href={catalog.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline"
          >
            {tt('AoE4World Explorer')}
          </a>{' '}
          · {tt('Patch data is loaded from the public aoe4world/explorer archive.')}
        </p>
      )}

      {catalog && <NewsSources items={news} source={source} onSourceChange={setSource} />}
    </div>
  )
}

function NewsSources({
  items,
  source,
  onSourceChange,
}: {
  items: PatchNewsItem[]
  source: PatchNewsSource | ''
  onSourceChange: (source: PatchNewsSource | '') => void
}) {
  const { tt, locale } = useI18n()
  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Rss className="h-4 w-4 text-primary" />
            {tt('Official news sources')}
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            {tt('Patch notes are normalized from AoE4World; news comes from official RSS feeds.')}
          </p>
        </div>
        <select
          value={source}
          onChange={(event) => onSourceChange(event.target.value as PatchNewsSource | '')}
          aria-label={tt('News source')}
          className="h-9 rounded-md border border-border bg-background px-2 text-xs"
        >
          <option value="">{tt('All news sources')}</option>
          <option value="official">{tt('Age of Empires official news')}</option>
          <option value="steam">{tt('Steam announcements')}</option>
        </select>
      </CardHeader>
      <CardContent className="grid gap-2 pt-0 md:grid-cols-2">
        {items.slice(0, 8).map((item) => (
          <a
            key={item.id}
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="group rounded-md border border-border/70 bg-background/35 p-3 transition-colors hover:border-primary/40 hover:bg-secondary/50"
          >
            <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-wide text-primary">
              <span>{tt(item.sourceName)}</span>
              <span>{tt(newsKindLabel(item.kind))}</span>
            </div>
            <h3 className="mt-1 line-clamp-2 text-sm font-medium group-hover:text-primary">
              {tt(item.title)}
            </h3>
            <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
              <span>{formatDate(item.date, locale)}</span>
              <ExternalLink className="h-3 w-3 shrink-0" />
            </div>
          </a>
        ))}
        {items.length === 0 && (
          <p className="py-5 text-sm text-muted-foreground">{tt('No official news found.')}</p>
        )}
      </CardContent>
    </Card>
  )
}

function newsKindLabel(kind: PatchNewsItem['kind']): string {
  if (kind === 'map-pool') return 'Map pool'
  if (kind === 'patch') return 'Patch'
  if (kind === 'release') return 'Release'
  return 'Announcement'
}

function PatchDetail({
  patch,
  selectedCiv,
  selectedCivSlug,
  onCivChange,
}: {
  patch: PatchNotes | null
  selectedCiv: string | null
  selectedCivSlug: string
  onCivChange: (slug: string) => void
}) {
  const { tt, locale } = useI18n()
  if (!patch) {
    return (
      <Card className="min-h-[32rem]">
        <CardContent className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground">
          {tt('Select a patch to read its notes.')}
        </CardContent>
      </Card>
    )
  }

  const filteredChanges = filterPatchChangesForCivilization(patch.changes, selectedCiv)
  const grouped = new Map<string, PatchNotes['changes']>()
  for (const change of filteredChanges) {
    const list = grouped.get(change.section) ?? []
    list.push(change)
    grouped.set(change.section, list)
  }
  const sections = [...grouped.entries()]
  const selectedCivName = PATCH_CIVILIZATIONS.find((civ) => civ.slug === selectedCivSlug)?.name
  return (
    <Card>
      <CardHeader className="border-b border-border/70">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wide text-primary">
              {patch.season != null && (
                <span>
                  {tt('Season')} {patch.season}
                </span>
              )}
              <span>{tt(typeLabel(patch.type))}</span>
              <span>{patch.buildId}</span>
            </div>
            <CardTitle className="text-xl">{tt(patch.name)}</CardTitle>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" />
              {formatDate(patch.date, locale)} ·{' '}
              {selectedCiv ? `${filteredChanges.length} / ${patch.changeCount}` : patch.changeCount}{' '}
              {tt('changes')}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={patch.aoe4WorldUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs hover:bg-secondary"
            >
              {tt('Open in AoE4World')} <ExternalLink className="h-3 w-3" />
            </a>
            {patch.officialUrl && (
              <a
                href={patch.officialUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-primary/30 px-2.5 text-xs text-primary hover:bg-primary/10"
              >
                {tt('Official release notes')} <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
        {patch.summary && (
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{tt(patch.summary)}</p>
        )}
      </CardHeader>
      <CardContent className="p-5">
        <div className="grid gap-6 lg:grid-cols-[8rem_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <div className="sticky top-4 space-y-2">
              <div className="text-xs font-semibold text-foreground">{tt('Jump to')}</div>
              <nav className="space-y-1 border-l border-border/70 pl-3" aria-label={tt('Jump to')}>
                {sections.map(([section]) => (
                  <button
                    key={section}
                    type="button"
                    onClick={() =>
                      document.getElementById(sectionAnchor(section))?.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start',
                      })
                    }
                    className="block w-full truncate py-1 text-left text-xs text-muted-foreground transition-colors hover:text-primary"
                  >
                    {tt(section)}
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          <div className="min-w-0 space-y-5">
            <div className="space-y-3">
              <div className="text-sm font-semibold">{tt('Filter updates by civilization')}</div>
              <div
                className="flex flex-wrap items-center gap-2"
                role="group"
                aria-label={tt('Filter updates by civilization')}
              >
                <button
                  type="button"
                  aria-pressed={!selectedCiv}
                  onClick={() => onCivChange('')}
                  className={cn(
                    'inline-flex h-8 min-w-10 items-center justify-center rounded-md border px-2 text-xs font-semibold transition-colors',
                    !selectedCiv
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background/40 text-muted-foreground hover:border-primary/50 hover:text-foreground',
                  )}
                >
                  ALL
                </button>
                {PATCH_CIVILIZATIONS.map((civ) => {
                  const active = selectedCivSlug === civ.slug
                  return (
                    <button
                      key={civ.code}
                      type="button"
                      title={tt(civ.name)}
                      aria-label={tt(civ.name)}
                      aria-pressed={active}
                      onClick={() => onCivChange(civ.slug)}
                      className={cn(
                        'group relative inline-flex h-8 w-11 items-center justify-center overflow-hidden rounded-md border bg-background/40 p-0.5 transition-all hover:border-primary/70 hover:ring-1 hover:ring-primary/30',
                        active ? 'border-primary ring-2 ring-primary/50' : 'border-border/70',
                      )}
                    >
                      {civ.icon ? (
                        <img src={civ.icon} alt="" className="h-full w-full rounded object-cover" />
                      ) : (
                        <span className="text-[10px] font-semibold uppercase">{civ.code}</span>
                      )}
                    </button>
                  )
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                {tt('Click on different units or technologies to learn more about them.')}
              </p>
              {selectedCiv && selectedCivName && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-primary/25 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
                  <span>
                    {tt('Showing notes for the')}{' '}
                    <strong className="text-foreground">{tt(selectedCivName)}</strong>.{' '}
                    {tt('Other patch notes are hidden.')}
                  </span>
                  <button
                    type="button"
                    onClick={() => onCivChange('')}
                    className="text-primary hover:underline"
                  >
                    {tt('View the full notes')}
                  </button>
                </div>
              )}
            </div>

            {sections.map(([section, changes]) => (
              <section key={section} id={sectionAnchor(section)} className="scroll-mt-4">
                <h2 className="mb-2 text-sm font-semibold">{tt(section)}</h2>
                <div className="space-y-2">
                  {changes.map((change, index) => (
                    <div
                      key={`${change.kind}-${index}`}
                      className="flex items-start gap-3 rounded-md border border-border/70 bg-background/35 p-3"
                    >
                      <span
                        className={cn(
                          'mt-0.5 shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase',
                          kindClass(change.kind),
                        )}
                      >
                        {tt(
                          change.kind === 'buff'
                            ? 'Buffs'
                            : change.kind === 'nerf'
                              ? 'Nerfs'
                              : change.kind === 'fix'
                                ? 'Bug fixes'
                                : change.kind === 'rework'
                                  ? 'Reworks'
                                  : 'Changes',
                        )}
                      </span>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {tt(change.text)}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            ))}
            {filteredChanges.length === 0 && (
              <p className="text-sm text-muted-foreground">
                {selectedCiv
                  ? tt('No changes for this civilization.')
                  : tt('Detailed change rows are unavailable for this patch source.')}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
