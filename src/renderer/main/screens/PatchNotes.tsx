import { useMemo, useState } from 'react'
import { CalendarDays, ExternalLink, Newspaper, RefreshCw, Search } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import type { PatchChangeKind, PatchNotes } from '@domain/patchNotes'
import { useI18n } from '../../i18n'
import { usePatchNotes } from '../queries/usePatchNotes'
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

export function PatchNotes() {
  const { tt, locale } = useI18n()
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedId = searchParams.get('patch') ?? undefined
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<PatchChangeKind | ''>('')
  const [season, setSeason] = useState('')
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

  const selectPatch = (id: string) =>
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous)
        next.set('patch', id)
        return next
      },
      { replace: true },
    )

  return (
    <div className="animate-fade-in space-y-5">
      <PageHead
        kicker="AoE4World Explorer"
        title={tt('News & patches')}
        sub={tt(
          'Current and historical Age of Empires IV patch notes, balance changes, fixes, and official release links.',
        )}
      />

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

          <PatchDetail patch={catalog.selected} />
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
    </div>
  )
}

function PatchDetail({ patch }: { patch: PatchNotes | null }) {
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
  const grouped = new Map<string, PatchNotes['changes']>()
  for (const change of patch.changes) {
    const list = grouped.get(change.section) ?? []
    list.push(change)
    grouped.set(change.section, list)
  }
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
              {formatDate(patch.date, locale)} · {patch.changeCount} {tt('changes')}
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
      <CardContent className="space-y-5 p-5">
        {[...grouped.entries()].map(([section, changes]) => (
          <section key={section}>
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
                  <p className="text-sm leading-relaxed text-muted-foreground">{tt(change.text)}</p>
                </div>
              ))}
            </div>
          </section>
        ))}
        {patch.changes.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {tt('Detailed change rows are unavailable for this patch source.')}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
