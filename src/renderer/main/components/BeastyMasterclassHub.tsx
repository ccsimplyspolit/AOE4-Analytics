import { useMemo, useState } from 'react'
import {
  Clock,
  Compass,
  Crown,
  Eye,
  Flame,
  ListChecks,
  Play,
  PlayCircle,
  Search,
  Sparkles,
  Trophy,
} from 'lucide-react'
import {
  BEASTY_AOE4_VIDEOS,
  BEASTY_CATALOG_STATS,
  type BeastyVideoEntry,
} from '@data/beastyCatalog.generated'
import {
  BEASTY_VISUAL_MILESTONES,
  getBeastyMilestonesForCiv,
} from '@data/beastyVisualMilestones.generated'
import { CIV_SLUGS } from '@data/civs'
import { Badge } from '@shared/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@shared/components/ui/card'
import { VideoPlayer } from './VideoPlayer'
import { CreatorVideoLessonPanel } from './CreatorVideoLessonPanel'
import { CREATOR_VIDEO_LESSONS } from '@data/creatorVideoLessons.generated'
import { useI18n } from '../../i18n'

type CategoryFilter = 'all' | 'build_order' | 'civ_guide' | 'tier_list' | 'mechanics'

const CATEGORIES: { id: CategoryFilter; labelEn: string; labelRu: string; icon: typeof Flame }[] = [
  { id: 'all', labelEn: 'All Videos', labelRu: 'Все видео', icon: Flame },
  { id: 'build_order', labelEn: 'Build Orders', labelRu: 'Билд-ордеры', icon: ListChecks },
  { id: 'civ_guide', labelEn: 'Civ Masterclasses', labelRu: 'Гайды цивилизаций', icon: Crown },
  { id: 'tier_list', labelEn: 'Tier Lists', labelRu: 'Тир-листы', icon: Trophy },
  { id: 'mechanics', labelEn: 'Pro Mechanics', labelRu: 'Механики и микро', icon: Sparkles },
]

export function BeastyMasterclassHub() {
  const { locale, gameName } = useI18n()
  const isRu = locale === 'ru'

  const [query, setQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all')
  const [selectedCiv, setSelectedCiv] = useState<string>('all')
  const [activeVideo, setActiveVideo] = useState<BeastyVideoEntry | null>(BEASTY_AOE4_VIDEOS[0] ?? null)

  const civsWithVideos = useMemo(() => {
    const set = new Set<string>()
    for (const v of BEASTY_AOE4_VIDEOS) {
      for (const c of v.primaryCivs) set.add(c)
    }
    return CIV_SLUGS.filter((s) => set.has(s))
  }, [])

  const filteredVideos = useMemo(() => {
    const q = query.trim().toLowerCase()
    return BEASTY_AOE4_VIDEOS.filter((video) => {
      if (selectedCategory !== 'all' && video.category !== selectedCategory) {
        return false
      }
      if (selectedCiv !== 'all') {
        const matches = video.primaryCivs.includes(selectedCiv)
        if (!matches) return false
      }
      if (q) {
        const titleMatch = video.title.toLowerCase().includes(q)
        const summaryMatch = video.summary.toLowerCase().includes(q)
        const tacticsMatch = video.keyTactics.some(
          (t) => t.name.toLowerCase().includes(q) || t.text.toLowerCase().includes(q),
        )
        if (!titleMatch && !summaryMatch && !tacticsMatch) return false
      }
      return true
    })
  }, [query, selectedCategory, selectedCiv])

  const civMilestones = useMemo(() => {
    if (selectedCiv === 'all') return BEASTY_VISUAL_MILESTONES
    return getBeastyMilestonesForCiv(selectedCiv)
  }, [selectedCiv])

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <Card className="border-primary/30 bg-gradient-to-r from-primary/10 via-background to-primary/5">
        <CardContent className="space-y-2 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="rounded-lg bg-primary/20 p-2.5 text-primary">
                <Trophy className="h-6 w-6" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold tracking-tight">
                    {isRu ? 'Beastyqt Masterclass & Pro Library' : 'Beastyqt Masterclass & Pro Library'}
                  </h2>
                  <Badge variant="outline" className="border-primary/40 text-primary">
                    {BEASTY_CATALOG_STATS.aoe4Relevant} AoE4 / {BEASTY_CATALOG_STATS.totalVideos}{' '}
                    {isRu ? 'за 3 года' : 'in 3 years'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {isRu
                    ? 'Авторитетные билд-ордеры, мастер-классы цивилизаций, тир-листы и разборы механик от Beastyqt.'
                    : 'Definitive build orders, civilization masterclasses, tier lists, and mechanics from World Champion Beastyqt.'}
                </p>
              </div>
            </div>

            <a
              href="https://www.youtube.com/@BeastyqtSC2/videos"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-background/80 px-3 py-1.5 text-xs font-semibold text-primary hover:border-primary dark:text-primary"
            >
              <PlayCircle className="h-4 w-4 text-red-500" />
              YouTube @BeastyqtSC2 ↗
            </a>
          </div>
        </CardContent>
      </Card>

      <CreatorVideoLessonPanel
        picks={CREATOR_VIDEO_LESSONS.filter((lesson) => lesson.creator === 'beastyqt').map((lesson) => ({
          lesson,
          catalogTitle: lesson.title,
          catalogUrl: lesson.url,
          creator: lesson.creator,
          reason: isRu ? 'Главы из NeoDLP / описания видео' : 'Chapters from NeoDLP / video description',
          side: 'shared' as const,
        }))}
        title={isRu ? 'Разбор каждого видео с транскриптом' : 'Per-video transcript breakdown'}
      />

      {/* Embedded Active Video Player */}
      {activeVideo && (
        <Card className="border-primary/40 bg-card/80 shadow-md">
          <CardContent className="space-y-4 p-5">
            <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border/60 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="capitalize text-[11px]">
                    {activeVideo.category.replace('_', ' ')}
                  </Badge>
                  <h3 className="text-base font-bold text-foreground">{activeVideo.title}</h3>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{activeVideo.summary}</p>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {activeVideo.formattedDuration}
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5" />
                  {activeVideo.viewCount.toLocaleString()}
                </span>
              </div>
            </div>

            <VideoPlayer url={activeVideo.url} title={activeVideo.title} className="max-w-4xl" />

            {/* Key Tactics Excerpt */}
            {activeVideo.keyTactics.length > 0 && (
              <div className="grid gap-2 sm:grid-cols-2">
                {activeVideo.keyTactics.map((tactic, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs"
                  >
                    <div className="font-semibold text-primary">
                      ⚡ {tactic.name}
                    </div>
                    <p className="mt-1 text-foreground/90">{tactic.text}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Visual Blueprint Section if civ selected */}
      {civMilestones.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Compass className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold">
              {isRu ? 'Покадровые схемы расстановки баз от Beastyqt' : 'Beastyqt Visual Base Blueprints'}
            </h3>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {civMilestones.map((m) => (
              <Card key={m.id} className="border-border/80 bg-background/60">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="font-mono text-xs font-bold text-primary">
                      {m.formattedTime} • {m.age}
                    </Badge>
                    <span className="text-xs font-semibold text-muted-foreground">{gameName(m.civ)}</span>
                  </div>
                  <CardTitle className="text-xs font-bold text-foreground pt-1">{m.videoTitle}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 p-4 pt-1 text-xs">
                  <p className="text-muted-foreground">{isRu ? m.directiveRu : m.directiveEn}</p>

                  {/* Worker Split */}
                  <div className="grid grid-cols-4 gap-1.5 text-center font-mono">
                    <div className="rounded bg-primary/10 p-1 text-primary">
                      <div className="text-[10px]">🌾 Food</div>
                      <div className="font-bold">{m.workers.food}</div>
                    </div>
                    <div className="rounded bg-emerald-500/10 p-1 text-emerald-600 dark:text-emerald-400">
                      <div className="text-[10px]">🪵 Wood</div>
                      <div className="font-bold">{m.workers.wood}</div>
                    </div>
                    <div className="rounded bg-yellow-500/10 p-1 text-yellow-600 dark:text-yellow-400">
                      <div className="text-[10px]">🪙 Gold</div>
                      <div className="font-bold">{m.workers.gold}</div>
                    </div>
                    <div className="rounded bg-slate-500/10 p-1 text-slate-600 dark:text-slate-400">
                      <div className="text-[10px]">👤 Total</div>
                      <div className="font-bold">{m.workers.total}</div>
                    </div>
                  </div>

                  {/* ASCII Diagram */}
                  <pre className="overflow-x-auto rounded bg-secondary/80 p-2 font-mono text-[10px] text-primary">
                    {m.layout.ascii}
                  </pre>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Filters and Search Workbench */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search bar */}
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={isRu ? 'Поиск по видео, цивилизациям и тактикам Beastyqt...' : 'Search Beastyqt videos, civs, and tactics...'}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-md border border-border bg-background py-1.5 pl-9 pr-3 text-xs placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
          </div>

          {/* Civ pills */}
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => setSelectedCiv('all')}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                selectedCiv === 'all'
                  ? 'bg-primary text-white'
                  : 'bg-secondary/70 text-muted-foreground hover:bg-secondary'
              }`}
            >
              {isRu ? 'Все цивилизации' : 'All Civs'}
            </button>
            {civsWithVideos.map((slug) => (
              <button
                key={slug}
                type="button"
                onClick={() => setSelectedCiv(slug)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  selectedCiv === slug
                    ? 'bg-primary text-white'
                    : 'bg-secondary/70 text-muted-foreground hover:bg-secondary'
                }`}
              >
                {gameName(slug)}
              </button>
            ))}
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-1.5 border-b border-border pb-3">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  selectedCategory === cat.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary/70 text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {isRu ? cat.labelRu : cat.labelEn}
              </button>
            )
          })}
        </div>
      </div>

      {/* Video Grid */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredVideos.map((video) => (
          <Card
            key={video.id}
            className={`flex flex-col justify-between border transition-all hover:border-primary/50 ${
              activeVideo?.id === video.id ? 'border-primary bg-primary/[0.03]' : 'border-border'
            }`}
          >
            <CardHeader className="p-4 pb-2">
              <div className="flex items-start justify-between gap-2">
                <Badge variant="outline" className="capitalize text-[10px]">
                  {video.category.replace('_', ' ')}
                </Badge>
                <span className="font-mono text-[11px] text-muted-foreground">{video.formattedDuration}</span>
              </div>
              <CardTitle className="line-clamp-2 text-xs font-bold leading-snug text-foreground pt-1">
                {video.title}
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-3 p-4 pt-1 text-xs">
              <p className="line-clamp-2 text-muted-foreground">{video.summary}</p>

              {/* Civ Tags */}
              {video.primaryCivs.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {video.primaryCivs.map((c) => (
                    <Badge key={c} variant="secondary" className="text-[10px]">
                      {gameName(c)}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between border-t border-border/50 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveVideo(video)}
                  className="inline-flex items-center gap-1 font-semibold text-primary hover:underline dark:text-primary"
                >
                  <Play className="h-3.5 w-3.5" />
                  {isRu ? 'Смотреть' : 'Watch in App'}
                </button>

                <a
                  href={video.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-muted-foreground hover:text-foreground hover:underline"
                >
                  YouTube ↗
                </a>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
