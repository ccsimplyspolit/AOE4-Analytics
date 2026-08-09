import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  BookOpen,
  Clock,
  Keyboard,
  ListOrdered,
  Search,
  Shield,
  Sparkles,
  Network,
  ExternalLink,
  Loader2,
  PlayCircle,
} from 'lucide-react'
import { GUIDE_RESOURCES, GUIDES, type Guide } from '@data/guides'
import { LEARNING_RESOURCES } from '@data/learningResources'
import { BUILD_CATALOG } from '@data/buildCatalog'
import {
  CURATED_CONTENT_COUNTS,
  CURATED_CONTENT_SOURCE,
  searchCuratedContent,
} from '@data/curatedContent'
import { CIV_SLUGS, civCode } from '@data/civs'
import type { BuildCatalogEntry } from '@domain/buildCatalog'
import type { BuildOrder } from '@domain/buildOrderSchema'
import { buildOrderCivLabel } from '@domain/buildOrderSchema'
import { civDisplayName } from '@domain/civ'
import {
  hasBuildVideo,
  matchesBuildArchiveTextFilters,
  matchesBuildLibraryFilters,
  type BuildMapPoolFilter,
  type BuildPatchFilter,
  type BuildSeasonFilter,
} from '@domain/buildLibraryFilters'
import { CURRENT_RANKED_MAP_POOL } from '@domain/rankedMapPool'
import type { Aoe4GuidesBuildSummary } from '@ipc/contract'
import { ipc } from '@shared/ipc'
import { Markdown } from '@shared/components/Markdown'
import { Card, CardContent } from '@shared/components/ui/card'
import { Badge } from '@shared/components/ui/badge'
import { PageHead } from '../components/PageHead'
import { BuildOrderViewer } from '../components/BuildOrderViewer'
import { CommunityBuildSources } from '../components/CommunityBuildSources'
import { CounterHelper } from '../components/tools/CounterHelper'
import { CivQuiz } from '../components/tools/CivQuiz'
import { ShortcutTrainer } from '../components/tools/ShortcutTrainer'
import { BeastyNumber } from '../components/tools/BeastyNumber'
import { useI18n } from '../../i18n'
import { useRankedMapPool } from '../queries/useCivMeta'

type Tab = 'guides' | 'builds' | 'counters' | 'quiz' | 'trainer' | 'beasty'

/** AoE4Guides uses its own civ abbreviations (e.g. HRE/JDA/ZXL). */
const GUIDES_CODE_BY_DATA_CODE: Record<string, string> = {
  ab: 'ABB',
  ay: 'AYY',
  de: 'DEL',
  en: 'ENG',
  fr: 'FRE',
  hr: 'HRE',
  ja: 'JAP',
  je: 'JDA',
  ma: 'MAL',
  mac: 'MAC',
  mo: 'MON',
  od: 'DRA',
  ot: 'OTT',
  ru: 'RUS',
  zx: 'ZXL',
  hl: 'HOL',
  kt: 'KTE',
  gol: 'GOH',
  sen: 'SEN',
  tug: 'TUG',
  jin: 'JIN',
  by: 'BYZ',
  ch: 'CHI',
}

const TABS = [
  { id: 'guides', label: 'Guides', icon: BookOpen },
  { id: 'builds', label: 'Build Orders', icon: ListOrdered },
  { id: 'counters', label: 'Counter Helper', icon: Shield },
  { id: 'quiz', label: 'Civ Quiz', icon: Sparkles },
  { id: 'trainer', label: 'Shortcut Trainer', icon: Keyboard },
  { id: 'beasty', label: 'Beasty Number', icon: Network },
] as const

export function Guides() {
  const { tt } = useI18n()
  // Tab lives in the URL so a refresh or deep link restores it.
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const tab: Tab = TABS.some((t) => t.id === tabParam) ? (tabParam as Tab) : 'guides'
  const setTab = (id: Tab) =>
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set('tab', id)
        return next
      },
      { replace: true },
    )

  return (
    <div className="animate-fade-in space-y-6">
      <PageHead
        kicker="Library"
        title="Guides & Tools"
        sub="Beginner tactics, build orders, a counter helper, and a civ-picker quiz."
      />

      <div className="flex gap-1 border-b border-border" role="tablist">
        {TABS.map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm transition-colors ${
                tab === t.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tt(t.label)}
            </button>
          )
        })}
      </div>

      <div role="tabpanel">
        {tab === 'guides' && <GuideLibrary />}
        {tab === 'builds' && <BuildLibrary />}
        {tab === 'counters' && <CounterHelper />}
        {tab === 'quiz' && <CivQuiz />}
        {tab === 'trainer' && <ShortcutTrainer />}
        {tab === 'beasty' && <BeastyNumber />}
      </div>
    </div>
  )
}

function GuideLibrary() {
  const { locale, tt } = useI18n()
  // The open guide lives in the URL (`?guide=slug`) so it survives a refresh.
  const [searchParams, setSearchParams] = useSearchParams()
  const guideSlug = searchParams.get('guide')
  const active = guideSlug != null ? (GUIDES.find((g) => g.slug === guideSlug) ?? null) : null
  const setActive = (g: Guide | null) =>
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (g) next.set('guide', g.slug)
        else next.delete('guide')
        return next
      },
      { replace: true },
    )

  if (active) {
    const title = locale === 'ru' ? (active.titleRu ?? active.title) : tt(active.title)
    const category = tt(active.category)
    const body = locale === 'ru' ? (active.bodyRu ?? active.body) : active.body
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setActive(null)}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> {tt('All guides')}
        </button>
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary">{category}</Badge>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {active.readMinutes} {tt('min')}
            </span>
          </div>
        </div>
        <Card>
          <CardContent className="p-5">
            <Markdown content={body} />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <LearningShelf locale={locale} />
      <div className="grid gap-3 sm:grid-cols-2">
        {GUIDES.map((g) => {
          const title = locale === 'ru' ? (g.titleRu ?? g.title) : tt(g.title)
          const summary = locale === 'ru' ? (g.summaryRu ?? g.summary) : tt(g.summary)
          return (
            <button key={g.slug} type="button" onClick={() => setActive(g)} className="text-left">
              <Card className="h-full transition-colors hover:border-primary/40">
                <CardContent className="space-y-1.5 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold">{title}</h3>
                    <Badge variant="secondary">{tt(g.category)}</Badge>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">{summary}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {g.readMinutes} {tt('min read')}
                  </div>
                </CardContent>
              </Card>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function LearningShelf({ locale }: { locale: string }) {
  const isRussian = locale === 'ru'
  const dateFormatter = new Intl.DateTimeFormat(isRussian ? 'ru-RU' : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  // The general learning shelf stays current, while these retained references
  // add patch history and longer civilization context without duplicating URLs.
  const resources = [
    ...LEARNING_RESOURCES,
    ...GUIDE_RESOURCES.filter(
      (resource) => !LEARNING_RESOURCES.some((current) => current.url === resource.url),
    ),
  ].toSorted((left, right) => (right.publishedAt ?? '').localeCompare(left.publishedAt ?? ''))

  return (
    <section className="space-y-3" aria-label={isRussian ? 'Свежие материалы' : 'Fresh resources'}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">
            {isRussian ? 'Свежие материалы' : 'Fresh resources'}
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {isRussian
              ? 'Статьи и видео, отобранные для текущей версии игры. Точные билды и баланс всегда сверяйте с патчем.'
              : 'Articles and videos selected for the current game. Always check exact builds and balance against the patch notes.'}
          </p>
        </div>
        <span className="text-[11px] text-muted-foreground">
          {isRussian
            ? `${resources.length} материалов · проверено 9 авг. 2026`
            : `${resources.length} references · checked Aug 9, 2026`}
        </span>
      </div>
      <div className="grid gap-2 lg:grid-cols-2">
        {resources.map((resource) => {
          const isVideo = resource.kind === 'video'
          const title = isRussian ? resource.titleRu : resource.title
          const description = isRussian ? resource.descriptionRu : resource.description
          const published = resource.publishedAt
            ? dateFormatter.format(new Date(`${resource.publishedAt}T12:00:00Z`))
            : null
          const kindLabel = isRussian
            ? (
                {
                  video: 'Видео',
                  article: 'Статья',
                  patch: 'Патчноут',
                  catalogue: 'Каталог',
                } as const
              )[resource.kind]
            : (
                {
                  video: 'Video',
                  article: 'Article',
                  patch: 'Patch notes',
                  catalogue: 'Catalogue',
                } as const
              )[resource.kind]
          return (
            <a
              key={resource.id}
              href={resource.url}
              target="_blank"
              rel="noreferrer"
              className="group rounded-lg border border-border bg-card p-3 transition-colors hover:border-primary/60 hover:bg-primary/5"
            >
              <div className="flex gap-2">
                {isVideo ? (
                  <PlayCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                ) : (
                  <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                )}
                <div className="min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-medium leading-snug group-hover:text-primary">
                      {title}
                    </h3>
                    <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-primary" />
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {description}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-x-2 text-[11px] text-muted-foreground">
                    <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                      {kindLabel}
                    </Badge>
                    <span>{resource.source}</span>
                    {published && (
                      <span>
                        {isRussian ? 'опубликовано' : 'published'} {published}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </a>
          )
        })}
      </div>
    </section>
  )
}

const DIFFICULTY_TONE: Record<string, string> = {
  easy: 'bg-win/15 text-win',
  medium: 'bg-warn/15 text-warn',
  hard: 'bg-loss/15 text-loss',
}

/**
 * The build library, organized BY CIV. The primary builds are curated from
 * aoe4guides' top-scored community builds (research pass, authors credited);
 * each carries a reasoning line for why it earned its slot.
 */
function BuildLibrary() {
  const { tt, gameName } = useI18n()
  const entries = BUILD_CATALOG
  const builds = entries.map((entry) => entry.build)
  const mapPoolQuery = useRankedMapPool()
  const mapPool = mapPoolQuery.data?.ok ? mapPoolQuery.data.data : null
  const mapPoolSnapshot = mapPool?.snapshot ?? CURRENT_RANKED_MAP_POOL
  const currentPatch = mapPoolSnapshot.patch ?? CURRENT_RANKED_MAP_POOL.patch
  const currentSeason = mapPoolSnapshot.season ?? CURRENT_RANKED_MAP_POOL.season ?? 13
  const [query, setQuery] = useState('')
  const [civilization, setCivilization] = useState('')
  const [opponentCivilization, setOpponentCivilization] = useState('')
  const [origin, setOrigin] = useState('')
  const [patchFilter, setPatchFilter] = useState<BuildPatchFilter>('all')
  const [seasonFilter, setSeasonFilter] = useState<BuildSeasonFilter>('all')
  const [mapPoolFilter, setMapPoolFilter] = useState<BuildMapPoolFilter>('all')
  const [sort, setSort] = useState<'library' | 'score' | 'updated'>('library')
  const [onlineSearch, setOnlineSearch] = useState(false)
  const [onlineItems, setOnlineItems] = useState<Aoe4GuidesBuildSummary[]>([])
  const [onlineSelected, setOnlineSelected] = useState<Aoe4GuidesBuildSummary | null>(null)
  const [onlineLoading, setOnlineLoading] = useState(false)
  const [onlineError, setOnlineError] = useState<string | null>(null)
  // The selected build lives in the URL (`?build=index`) so it survives a refresh.
  const [searchParams, setSearchParams] = useSearchParams()
  const rawIdx = Number(searchParams.get('build'))
  const idx = Number.isInteger(rawIdx) && rawIdx >= 0 && rawIdx < builds.length ? rawIdx : 0
  const setIdx = (i: number) =>
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set('build', String(i))
        return next
      },
      { replace: true },
    )
  const active = builds[idx]

  const onlineCivCode = civilization
    ? CIV_SLUGS.map((slug) => ({ slug, label: civDisplayName(slug) })).find(
        (entry) => entry.label === civilization,
      )?.slug
    : undefined
  const onlineGuidesCiv = onlineCivCode
    ? (GUIDES_CODE_BY_DATA_CODE[civCode(onlineCivCode) ?? ''] ?? undefined)
    : undefined
  const curatedVideos = useMemo(
    () =>
      searchCuratedContent(query, onlineCivCode ?? 'all').filter(
        (item) => item.type === 'Video' || item.type === 'Shorts',
      ),
    [onlineCivCode, query],
  )

  useEffect(() => {
    if (!onlineSearch) return
    let cancelled = false
    const timer = window.setTimeout(() => {
      setOnlineLoading(true)
      setOnlineError(null)
      void ipc
        .listAoe4GuidesBuilds(
          query,
          onlineGuidesCiv,
          sort === 'updated' ? 'timeCreated' : sort === 'library' ? 'score' : sort,
        )
        .then((result) => {
          if (cancelled) return
          if (!result.ok) {
            setOnlineError(result.error.message)
            setOnlineItems([])
            return
          }
          setOnlineItems(result.data.items)
          setOnlineSelected((current) =>
            current && result.data.items.some((item) => item.id === current.id) ? current : null,
          )
        })
        .catch((error: unknown) => {
          if (!cancelled) {
            setOnlineError(error instanceof Error ? error.message : 'Unable to load online builds.')
            setOnlineItems([])
          }
        })
        .finally(() => {
          if (!cancelled) setOnlineLoading(false)
        })
    }, 420)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [onlineGuidesCiv, onlineSearch, query, sort])

  const civilizations = [...new Set(entries.flatMap((entry) => entry.civilizationLabels))].sort(
    (a, b) => gameName(a).localeCompare(gameName(b)),
  )
  const opponentCivilizations = [
    ...new Set(entries.flatMap((entry) => entry.opponentCivilizationLabels)),
  ].sort((a, b) => gameName(a).localeCompare(gameName(b)))

  const seasons = useMemo(
    () =>
      [
        ...new Set(
          entries
            .map((entry) => entry.build.season)
            .filter((value): value is number => value != null),
        ),
      ].sort((a, b) => b - a),
    [entries],
  )
  const patches = useMemo(
    () =>
      [
        ...new Set(
          entries.map((entry) => entry.patch).filter((value): value is string => Boolean(value)),
        ),
      ].sort((a, b) => b.localeCompare(a)),
    [entries],
  )
  const videoEntriesCount = useMemo(
    () => entries.filter((entry) => hasBuildVideo(entry)).length,
    [entries],
  )

  // The catalog is deduplicated and provenance-aware. Keep the selected URL
  // index stable while allowing the visible list to be filtered/sorted.
  const visibleEntries = entries
    .map((entry, i) => ({ entry, i }))
    .filter(({ entry }) => {
      if (
        !matchesBuildArchiveTextFilters(entry, {
          query,
          civilization,
          opponentCivilization,
          origin: origin === 'video' ? '' : origin,
        })
      ) {
        return false
      }
      if (origin === 'video' && !hasBuildVideo(entry)) return false
      if (
        !matchesBuildLibraryFilters(
          entry,
          { patch: patchFilter, season: seasonFilter, mapPool: mapPoolFilter },
          {
            currentPatch,
            currentSeason,
            soloMaps: mapPoolSnapshot.solo,
            teamMaps: mapPoolSnapshot.team,
          },
        )
      )
        return false
      return true
    })
    .sort((left, right) => {
      if (sort === 'score') {
        return (right.entry.score ?? -Infinity) - (left.entry.score ?? -Infinity)
      }
      if (sort === 'updated') {
        return (right.entry.updatedAt ?? '').localeCompare(left.entry.updatedAt ?? '')
      }
      return left.i - right.i
    })
  const groups = new Map<string, { bo: BuildOrder; i: number }[]>()
  visibleEntries.forEach(({ entry, i }) => {
    const civ = buildOrderCivLabel(entry.build)
    const list = groups.get(civ) ?? []
    list.push({ bo: entry.build, i })
    groups.set(civ, list)
  })
  const civNames = [...groups.keys()].sort((a, b) => gameName(a).localeCompare(gameName(b)))

  const selectedMap = mapPoolFilter.startsWith('map:') ? mapPoolFilter.slice('map:'.length) : null
  const allPoolMaps = [...new Set([...mapPoolSnapshot.solo, ...mapPoolSnapshot.team])]
  const scopedMapCount = selectedMap
    ? 1
    : mapPoolFilter === 'team'
      ? mapPoolSnapshot.team.length
      : mapPoolFilter === 'solo'
        ? mapPoolSnapshot.solo.length
        : allPoolMaps.length
  const mapPoolName = selectedMap
    ? `${tt('Map')}: ${selectedMap}`
    : mapPoolFilter === 'team'
      ? tt('Current team map pool')
      : mapPoolFilter === 'solo'
        ? tt('Current solo map pool')
        : tt('All maps / map tags')

  return (
    <div className="space-y-4">
      <CommunityBuildSources />
      <label className="relative block max-w-lg">
        <span className="sr-only">{tt('Search build orders')}</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={tt('Search by civilization, build, style, or author…')}
          className="h-10 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </label>

      <div className="grid max-w-5xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="space-y-1 text-xs text-muted-foreground">
          <span>{tt('Civilization')}</span>
          <select
            value={civilization}
            onChange={(event) => setCivilization(event.target.value)}
            className="h-9 w-full rounded-sm border border-border bg-background px-2 text-sm text-foreground outline-none focus:border-primary"
          >
            <option value="">{tt('All civilizations')}</option>
            {civilizations.map((value) => (
              <option key={value} value={value}>
                {gameName(value)}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-xs text-muted-foreground">
          <span>{tt('Opponent civilization')}</span>
          <select
            value={opponentCivilization}
            onChange={(event) => setOpponentCivilization(event.target.value)}
            className="h-9 w-full rounded-sm border border-border bg-background px-2 text-sm text-foreground outline-none focus:border-primary"
          >
            <option value="">{tt('All opponents')}</option>
            {opponentCivilizations.map((value) => (
              <option key={value} value={value}>
                {gameName(value)}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-xs text-muted-foreground">
          <span>{tt('Source')}</span>
          <select
            value={origin}
            onChange={(event) => setOrigin(event.target.value)}
            className="h-9 w-full rounded-sm border border-border bg-background px-2 text-sm text-foreground outline-none focus:border-primary"
          >
            <option value="">{tt('All sources')}</option>
            <option value="curated">{tt('Curated / AoE4Guides')}</option>
            <option value="house">{tt('RTSLytics house')}</option>
            <option value="imported">{tt('Imported')}</option>
            <option value="video">
              {tt('Video evidence')} · {videoEntriesCount}
            </option>
          </select>
        </label>
        <label className="space-y-1 text-xs text-muted-foreground">
          <span>{tt('Order')}</span>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as typeof sort)}
            className="h-9 w-full rounded-sm border border-border bg-background px-2 text-sm text-foreground outline-none focus:border-primary"
          >
            <option value="library">{tt('Recommended library order')}</option>
            <option value="score">{tt('Community score')}</option>
            <option value="updated">{tt('Most recently updated')}</option>
          </select>
        </label>
      </div>

      <div className="grid max-w-5xl gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="space-y-1 text-xs text-muted-foreground">
          <span>{tt('Patch context')}</span>
          <select
            value={patchFilter}
            onChange={(event) => setPatchFilter(event.target.value as BuildPatchFilter)}
            className="h-9 w-full rounded-sm border border-border bg-background px-2 text-sm text-foreground outline-none focus:border-primary"
          >
            <option value="all">{tt('All patch versions')}</option>
            <option value="current" disabled={!currentPatch}>
              {tt('Current patch')} · {currentPatch ?? tt('unavailable')}
            </option>
            <option value="unversioned">{tt('No patch metadata')}</option>
            <option value="legacy">{tt('Other / legacy patch')}</option>
            {patches
              .filter((patch) => patch !== currentPatch)
              .map((patch) => (
                <option key={patch} value={`patch:${patch}`}>
                  {patch}
                </option>
              ))}
          </select>
        </label>
        <label className="space-y-1 text-xs text-muted-foreground">
          <span>{tt('Season')}</span>
          <select
            value={seasonFilter}
            onChange={(event) => setSeasonFilter(event.target.value as BuildSeasonFilter)}
            className="h-9 w-full rounded-sm border border-border bg-background px-2 text-sm text-foreground outline-none focus:border-primary"
          >
            <option value="all">{tt('All seasons')}</option>
            <option value="current">
              {tt('Current season')} · {currentSeason == null ? tt('unavailable') : currentSeason}
            </option>
            <option value="unversioned">{tt('No season metadata')}</option>
            {seasons
              .filter((season) => season !== currentSeason)
              .map((season) => (
                <option key={season} value={`season:${season}`}>
                  {tt('Season')} {season}
                </option>
              ))}
          </select>
        </label>
        <label className="space-y-1 text-xs text-muted-foreground">
          <span>{tt('Ranked map pool')}</span>
          <select
            value={mapPoolFilter}
            onChange={(event) => setMapPoolFilter(event.target.value as BuildMapPoolFilter)}
            className="h-9 w-full rounded-sm border border-border bg-background px-2 text-sm text-foreground outline-none focus:border-primary"
          >
            <option value="all">{tt('All maps / map tags')}</option>
            <optgroup label={`${tt('Current solo map pool')} · ${mapPoolSnapshot.solo.length}`}>
              <option value="solo">{tt('All current solo maps')}</option>
              {mapPoolSnapshot.solo.map((map) => (
                <option key={`solo-${map}`} value={`map:${map}`}>
                  {map}
                </option>
              ))}
            </optgroup>
            <optgroup label={`${tt('Current team map pool')} · ${mapPoolSnapshot.team.length}`}>
              <option value="team">{tt('All current team maps')}</option>
              {mapPoolSnapshot.team.map((map) => (
                <option key={`team-${map}`} value={`map:${map}`}>
                  {map}
                </option>
              ))}
            </optgroup>
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-border/70 bg-card/40 px-3 py-2 text-[11px] text-muted-foreground">
        <span>
          {tt('Current context')}: {currentPatch ?? tt('patch unavailable')} · {tt('Season')}{' '}
          {currentSeason ?? tt('unavailable')}
        </span>
        <span>
          {tt('Map pool snapshot')}: {mapPoolQuery.isLoading ? tt('loading') : mapPoolName} ·{' '}
          {scopedMapCount} {tt('maps')}
        </span>
        {mapPool?.autoRefresh?.lastCheckedAt && (
          <span>
            {tt('checked')} {new Date(mapPool.autoRefresh.lastCheckedAt).toLocaleDateString()}
          </span>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground">
        {visibleEntries.length} / {entries.length} {tt('builds shown')} ·{' '}
        {tt('deduplicated by civ, timing and notes')}
      </p>

      <section className="rounded-md border border-primary/25 bg-primary/5 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Network className="h-4 w-4 text-primary" />
              {tt('Live AoE4Guides catalogue')}
            </div>
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted-foreground">
              {tt(
                'Search the public AoE4Guides API with typed civilization and sort filters; results keep their original source link and can be previewed before import.',
              )}
            </p>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={onlineSearch}
              onChange={(event) => {
                setOnlineSearch(event.target.checked)
                if (!event.target.checked) {
                  setOnlineItems([])
                  setOnlineSelected(null)
                  setOnlineError(null)
                }
              }}
              className="h-4 w-4 accent-[hsl(var(--primary))]"
            />
            {tt('Search online automatically')}
          </label>
        </div>
        {onlineSearch && (
          <div className="mt-3">
            {onlineLoading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> {tt('Loading online builds…')}
              </div>
            )}
            {onlineError && <p className="text-xs text-loss">{onlineError}</p>}
            {!onlineLoading && !onlineError && onlineItems.length === 0 && (
              <p className="text-xs text-muted-foreground">
                {tt('No online builds match the filters.')}
              </p>
            )}
            {onlineItems.length > 0 && (
              <div className="grid gap-2 md:grid-cols-2">
                {onlineItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setOnlineSelected(item)}
                    className={`rounded-md border px-3 py-2 text-left transition-colors ${
                      onlineSelected?.id === item.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-background/40 hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="min-w-0 truncate text-sm font-medium">{item.name}</span>
                      <span className="shrink-0 text-[10px] tabular-nums text-primary">
                        {item.score == null ? '—' : item.score}
                      </span>
                    </div>
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      {gameName(item.civilization)} · {item.author ?? tt('community')} ·{' '}
                      {item.stepCount} {tt('steps')}
                    </div>
                    {item.video && (
                      <div className="mt-1 inline-flex items-center gap-1 text-[10px] text-primary">
                        <PlayCircle className="h-3 w-3" /> {tt('Video linked')}
                      </div>
                    )}
                    <span className="mt-1 inline-flex items-center gap-1 text-[10px] text-primary">
                      {tt('Preview build')} <ExternalLink className="h-3 w-3" />
                    </span>
                  </button>
                ))}
              </div>
            )}
            {onlineSelected && <BuildOrderViewer bo={onlineSelected.build} />}
          </div>
        )}
      </section>

      <section className="rounded-md border border-border bg-card/30 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold">
              <PlayCircle className="h-4 w-4 text-primary" />
              {tt('AoE4World curated videos')}
            </div>
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted-foreground">
              {tt(
                'Approved videos and Shorts from the AoE4World catalogue are matched to the selected civilization and search.',
              )}
            </p>
          </div>
          <a
            href={CURATED_CONTENT_SOURCE}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            {tt('Open source catalogue')} <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          {curatedVideos.length} / {CURATED_CONTENT_COUNTS.videos} {tt('videos shown')}
        </p>
        {curatedVideos.length === 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">
            {tt('No curated videos match the selected civilization and search.')}
          </p>
        ) : (
          <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {curatedVideos.map((item) => (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-border bg-background/40 px-3 py-2 transition-colors hover:border-primary/50 hover:bg-primary/5"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="line-clamp-2 text-sm font-medium">{item.title}</span>
                  <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                </div>
                <div className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">
                  {item.civilizations.map((civ) => gameName(civ)).join(' · ')} ·{' '}
                  {item.creator ?? tt('community')}
                </div>
                <div className="mt-1 text-[10px] uppercase tracking-wide text-primary">
                  {item.type === 'Shorts' ? 'YouTube Shorts' : 'YouTube'}
                </div>
              </a>
            ))}
          </div>
        )}
      </section>

      {civNames.length === 0 && (
        <div className="rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          {tt('No bundled build orders match “{query}”.').replace('{query}', query.trim())}
        </div>
      )}

      <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2 xl:grid-cols-3">
        {civNames.map((civ) => (
          <div key={civ} className="space-y-1">
            <div className="rts-ledger-head">{gameName(civ)}</div>
            {groups.get(civ)!.map(({ bo, i }) => (
              <button
                key={i}
                type="button"
                onClick={() => setIdx(i)}
                className={`flex w-full items-center gap-2 rounded-sm border px-2.5 py-1.5 text-left text-sm transition-colors ${
                  i === idx
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-background text-muted-foreground hover:bg-secondary'
                }`}
              >
                <span className="min-w-0 flex-1 truncate">{bo.name}</span>
                {bo.archetype && (
                  <span className="shrink-0 rounded-sm bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {bo.archetype}
                  </span>
                )}
                {bo.difficulty && (
                  <span
                    className={`shrink-0 rounded-sm px-1.5 py-0.5 text-[10px] font-medium ${DIFFICULTY_TONE[bo.difficulty] ?? ''}`}
                  >
                    {bo.difficulty}
                  </span>
                )}
                {hasBuildVideo(entries[i]!) && (
                  <PlayCircle
                    className="h-3.5 w-3.5 shrink-0 text-primary"
                    aria-label={tt('Video linked')}
                  />
                )}
              </button>
            ))}
          </div>
        ))}
      </div>

      {active?.reasoning && (
        <div className="rounded-sm border border-border bg-card/60 px-4 py-3">
          <div className="rts-ledger-head mb-1">{tt('Why this build')}</div>
          <p className="text-sm leading-relaxed text-muted-foreground">{active.reasoning}</p>
          <CatalogMetadata entry={entries[idx]} tt={tt} />
          {active.source && (
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              {tt('Build by')}{' '}
              <span className="text-foreground">{active.author ?? tt('community')}</span> —
              {tt('curated from')}{' '}
              <a
                href={active.source}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline"
              >
                aoe4guides.com
              </a>
              .{' '}
              {tt(
                'Curation: we pull only the top-scored builds that match proven meta archetypes; step timings are the author’s.',
              )}
            </p>
          )}
        </div>
      )}

      {active && <BuildOrderViewer bo={active} />}
    </div>
  )
}

function CatalogMetadata({
  entry,
  tt,
}: {
  entry: BuildCatalogEntry | undefined
  tt: (value: string) => string
}) {
  if (!entry) return null
  const bits = [
    entry.patch ? `${tt('Patch')} ${entry.patch}` : null,
    entry.score != null ? `Score ${entry.score}` : null,
    entry.sampleSize != null ? `n=${entry.sampleSize}` : null,
    entry.confidence != null ? `${Math.round(entry.confidence * 100)}% ${tt('confidence')}` : null,
    entry.videoUrl ? tt('Video linked') : entry.hasVideoEvidence ? tt('Video evidence') : null,
  ].filter((bit): bit is string => Boolean(bit))
  if (bits.length === 0) return null
  return (
    <p className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-[11px] text-primary/80">
      {bits.map((bit) => (
        <span key={bit}>{bit}</span>
      ))}
      {entry.videoUrl && (
        <a
          href={entry.videoUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-primary hover:underline"
        >
          {tt('Open video')} <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </p>
  )
}
