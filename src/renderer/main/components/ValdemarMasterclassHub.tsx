import { useMemo, useState } from 'react'
import {
  BookOpen,
  Clock,
  Compass,
  ExternalLink,
  Flame,
  ListOrdered,
  Play,
  Search,
  Swords,
  Video,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import {
  VALDEMAR_CATALOG_STATS,
  VALDEMAR_VIDEOS,
  type ValdemarVideoCategory,
  type ValdemarVideoEntry,
} from '@data/valdemarCatalog.generated'
import { CIV_SLUGS } from '@data/civs'
import { civDisplayName } from '@domain/civ'
import { formatDurationShort } from '@shared/format'
import { Badge } from '@shared/components/ui/badge'
import { Card, CardContent } from '@shared/components/ui/card'
import { VideoPlayer } from './VideoPlayer'
import { VisualMilestoneCoachCard } from './VisualMilestoneCoachCard'
import { useI18n } from '../../i18n'

type CategoryFilter = 'all' | 'visual_blueprints' | ValdemarVideoCategory

const CATEGORIES: { id: CategoryFilter; labelEn: string; labelRu: string; icon: LucideIcon }[] = [
  { id: 'all', labelEn: 'All Videos', labelRu: 'Все видео', icon: Video },
  { id: 'visual_blueprints', labelEn: 'Visual Blueprints & Frame Milestones', labelRu: 'Покадровые схемы и майлстоуны', icon: Compass },
  { id: 'match_analysis', labelEn: 'Match Analysis & Coaching', labelRu: 'Анализ матчей и коучинг', icon: Swords },
  { id: 'build_order', labelEn: 'Build Orders', labelRu: 'Билд-ордеры', icon: ListOrdered },
  { id: 'civ_guide', labelEn: 'Civ Masterclasses', labelRu: 'Гайды по цивилизациям', icon: BookOpen },
  { id: 'mechanics_fundamentals', labelEn: 'Fundamentals & Mechanics', labelRu: 'Механики и основы', icon: Zap },
  { id: 'tier_list_meta', labelEn: 'Tier Lists & Meta', labelRu: 'Тир-листы и мета', icon: Flame },
]

export function ValdemarMasterclassHub() {
  const { locale } = useI18n()
  const isRu = locale === 'ru'

  const [query, setQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all')
  const [selectedCiv, setSelectedCiv] = useState<string>('all')
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null)

  const activeVideo = useMemo(
    () => (activeVideoId ? VALDEMAR_VIDEOS.find((v) => v.id === activeVideoId) : null),
    [activeVideoId],
  )

  const filteredVideos = useMemo(() => {
    const q = query.trim().toLowerCase()
    return VALDEMAR_VIDEOS.filter((video) => {
      // Category filter
      if (
        selectedCategory !== 'all' &&
        selectedCategory !== 'visual_blueprints' &&
        video.category !== selectedCategory
      ) {
        return false
      }
      // Civ filter
      if (selectedCiv !== 'all') {
        const matchesCiv =
          video.primaryCivs.includes(selectedCiv) || video.opponentCivs.includes(selectedCiv)
        if (!matchesCiv) return false
      }
      // Text query
      if (q) {
        const titleMatch = video.title.toLowerCase().includes(q)
        const summaryMatch = video.summary.toLowerCase().includes(q)
        const playerMatch = video.proPlayers.some((p) => p.toLowerCase().includes(q))
        const tacticsMatch = video.keyTactics.some(
          (t) => t.name.toLowerCase().includes(q) || t.text.toLowerCase().includes(q),
        )
        const transcriptMatch = video.transcriptExcerpt?.toLowerCase().includes(q)
        if (!titleMatch && !summaryMatch && !playerMatch && !tacticsMatch && !transcriptMatch) {
          return false
        }
      }
      return true
    })
  }, [query, selectedCategory, selectedCiv])

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <Card className="border-primary/30 bg-primary/[0.04]">
        <CardContent className="space-y-3 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-primary/15 p-1.5 text-primary">
                  <Video className="h-5 w-5" />
                </span>
                <h2 className="text-lg font-bold">
                  {isRu
                    ? 'База знаний и видео-аналитика Valdemar1902'
                    : 'Valdemar1902 Video Analytics & Masterclass Hub'}
                </h2>
                <Badge variant="outline" className="border-primary/40 text-primary">
                  {VALDEMAR_CATALOG_STATS.totalVideos} {isRu ? 'видео (3 года)' : 'videos (3 years)'}
                </Badge>
              </div>
              <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted-foreground">
                {isRu
                  ? 'Полный каталог видео, разборов про-матчей, коучинг-сессий, авторских билд-ордеров и транскрипций с канала Valdemar1902. Поиск по цивилизациям, тактикам и ключевым таймкодам.'
                  : 'Complete catalog of match analyses, coaching sessions, build orders, civ masterclasses, and transcripts from Valdemar1902. Search across civilizations, tactics, and exact timestamps.'}
              </p>
            </div>

            <a
              href="https://www.youtube.com/@Valdemar1902/videos"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
            >
              YouTube Channel <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 gap-2 pt-2 sm:grid-cols-3 md:grid-cols-5">
            <div className="rounded-md border border-border/80 bg-background/50 p-2 text-center">
              <div className="text-sm font-bold text-foreground">
                {VALDEMAR_CATALOG_STATS.categories.match_analysis}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {isRu ? 'Анализ матчей / Коучинг' : 'Match Analyses'}
              </div>
            </div>
            <div className="rounded-md border border-border/80 bg-background/50 p-2 text-center">
              <div className="text-sm font-bold text-foreground">
                {VALDEMAR_CATALOG_STATS.categories.build_order}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {isRu ? 'Билд-ордеры' : 'Build Orders'}
              </div>
            </div>
            <div className="rounded-md border border-border/80 bg-background/50 p-2 text-center">
              <div className="text-sm font-bold text-foreground">
                {VALDEMAR_CATALOG_STATS.categories.civ_guide}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {isRu ? 'Гайды цивилизаций' : 'Civ Masterclasses'}
              </div>
            </div>
            <div className="rounded-md border border-border/80 bg-background/50 p-2 text-center">
              <div className="text-sm font-bold text-foreground">
                {VALDEMAR_CATALOG_STATS.categories.tier_list_meta}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {isRu ? 'Тир-листы и Мета' : 'Tier Lists & Meta'}
              </div>
            </div>
            <div className="rounded-md border border-border/80 bg-background/50 p-2 text-center">
              <div className="text-sm font-bold text-foreground">
                {VALDEMAR_CATALOG_STATS.categories.mechanics_fundamentals}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {isRu ? 'Основы и механики' : 'Fundamentals'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Video Player Modal / Box */}
      {activeVideo && (
        <Card className="border-primary/50 bg-background/90 shadow-lg">
          <CardContent className="space-y-4 p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <Badge variant="secondary" className="text-[10px]">
                  {activeVideo.category.replace('_', ' ').toUpperCase()}
                </Badge>
                <h3 className="mt-1 text-base font-bold text-foreground">{activeVideo.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveVideoId(null)}
                className="rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted"
              >
                {isRu ? 'Закрыть плеер' : 'Close Player'} ✕
              </button>
            </div>

            <VideoPlayer url={activeVideo.url} title={activeVideo.title} className="max-w-4xl" />

            {/* Tactical Timestamps */}
            {activeVideo.keyTactics.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-foreground">
                  {isRu ? 'Ключевые тактические таймкоды:' : 'Key Tactical Timestamps:'}
                </h4>
                <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                  {activeVideo.keyTactics.map((tactic) => (
                    <a
                      key={`${tactic.name}-${tactic.timeSec}`}
                      href={`${activeVideo.url}&t=${tactic.timeSec}s`}
                      target="_blank"
                      rel="noreferrer"
                      className="group flex items-start justify-between rounded-md border border-border/80 bg-card/60 p-2.5 transition-colors hover:border-primary/50 hover:bg-primary/5"
                    >
                      <div>
                        <div className="text-xs font-semibold group-hover:text-primary">
                          {tactic.name}
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
                          {tactic.text}
                        </p>
                      </div>
                      <Badge variant="outline" className="ml-2 font-mono text-[10px]">
                        {tactic.timeFormatted}
                      </Badge>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {activeVideo.transcriptExcerpt && (
              <details className="rounded-md border border-border/80 bg-background/50">
                <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground">
                  {isRu ? 'Фрагмент транскрипции (субтитры)' : 'Transcript Excerpt'}
                </summary>
                <p className="max-h-60 overflow-y-auto border-t border-border px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                  {activeVideo.transcriptExcerpt}
                </p>
              </details>
            )}
          </CardContent>
        </Card>
      )}

      {/* Filters and Search Bar */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[260px] flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                isRu
                  ? 'Поиск по названию, тактике, игроку (LoueMT, Beasty) или ключевому слову...'
                  : 'Search by title, tactic, player (LoueMT, Beasty) or keyword...'
              }
              className="w-full rounded-md border border-border bg-background py-2 pl-9 pr-3 text-xs placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-2.5 top-2 text-xs text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            )}
          </div>

          {/* Civ Dropdown */}
          <select
            value={selectedCiv}
            onChange={(e) => setSelectedCiv(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
          >
            <option value="all">{isRu ? 'Все цивилизации' : 'All Civilizations'}</option>
            {CIV_SLUGS.map((slug) => (
              <option key={slug} value={slug}>
                {civDisplayName(slug)}
              </option>
            ))}
          </select>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon
            const isSelected = selectedCategory === cat.id
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  isSelected
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'border border-border/80 bg-background/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {isRu ? cat.labelRu : cat.labelEn}
              </button>
            )
          })}
        </div>
      </div>

      {/* Visual Milestone Blueprints */}
      {(selectedCategory === 'visual_blueprints' || selectedCiv !== 'all') && (
        <div className="space-y-4">
          <VisualMilestoneCoachCard
            civ={selectedCiv !== 'all' ? selectedCiv : 'byzantines'}
          />
          {selectedCategory === 'visual_blueprints' && selectedCiv === 'all' && (
            <div className="grid gap-4 md:grid-cols-2">
              <VisualMilestoneCoachCard civ="english" />
              <VisualMilestoneCoachCard civ="french" />
              <VisualMilestoneCoachCard civ="rus" />
              <VisualMilestoneCoachCard civ="holy_roman_empire" />
            </div>
          )}
        </div>
      )}

      {/* Video Grid */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {isRu
              ? `Найдено видео: ${filteredVideos.length}`
              : `Showing ${filteredVideos.length} videos`}
          </span>
          {(query || selectedCategory !== 'all' || selectedCiv !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setQuery('')
                setSelectedCategory('all')
                setSelectedCiv('all')
              }}
              className="text-primary hover:underline"
            >
              {isRu ? 'Сбросить фильтры' : 'Reset filters'}
            </button>
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filteredVideos.map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              isRu={isRu}
              isActive={activeVideoId === video.id}
              onSelect={() => setActiveVideoId(video.id)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function VideoCard({
  video,
  isRu,
  isActive,
  onSelect,
}: {
  video: ValdemarVideoEntry
  isRu: boolean
  isActive: boolean
  onSelect: () => void
}) {
  return (
    <Card
      className={`transition-all hover:border-primary/50 ${
        isActive ? 'border-primary bg-primary/5' : 'border-border/80 bg-card/50'
      }`}
    >
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <Badge
            variant={
              video.category === 'match_analysis'
                ? 'default'
                : video.category === 'build_order'
                  ? 'secondary'
                  : 'outline'
            }
            className="text-[10px]"
          >
            {video.category === 'match_analysis'
              ? isRu
                ? 'Анализ матча'
                : 'Match Analysis'
              : video.category === 'build_order'
                ? isRu
                  ? 'Билд-ордер'
                  : 'Build Order'
                : video.category === 'civ_guide'
                  ? isRu
                    ? 'Гайд цивилизации'
                    : 'Civ Masterclass'
                  : video.category === 'tier_list_meta'
                    ? isRu
                      ? 'Тир-лист / Мета'
                      : 'Tier List / Meta'
                    : isRu
                      ? 'Механики'
                      : 'Fundamentals'}
          </Badge>

          {video.durationSec > 0 && (
            <span className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
              <Clock className="h-3 w-3" />
              {formatDurationShort(video.durationSec)}
            </span>
          )}
        </div>

        <div>
          <h4 className="line-clamp-2 text-xs font-semibold leading-snug text-foreground">
            {video.title}
          </h4>
          <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
            {video.summary}
          </p>
        </div>

        {/* Civ and Player Badges */}
        <div className="flex flex-wrap items-center gap-1">
          {video.primaryCivs.map((civ) => (
            <Badge key={civ} variant="outline" className="border-primary/30 text-[9px] text-primary">
              {civDisplayName(civ)}
            </Badge>
          ))}
          {video.opponentCivs.map((civ) => (
            <Badge key={civ} variant="outline" className="text-[9px] text-destructive">
              vs {civDisplayName(civ)}
            </Badge>
          ))}
          {video.proPlayers.map((player) => (
            <Badge key={player} variant="secondary" className="text-[9px]">
              {player}
            </Badge>
          ))}
          {video.transcriptStatus === 'available' && (
            <Badge variant="outline" className="border-win/30 text-[9px] text-win">
              ✓ Subtitles
            </Badge>
          )}
        </div>

        {/* Tactical Timestamps Pills */}
        {video.keyTactics.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {video.keyTactics.slice(0, 3).map((tactic) => (
              <a
                key={tactic.name}
                href={`${video.url}&t=${tactic.timeSec}s`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded bg-secondary/80 px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-primary"
              >
                <span>{tactic.name}</span>
                <span className="font-mono text-[9px] opacity-75">{tactic.timeFormatted}</span>
              </a>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-border/60 pt-2 text-xs">
          <button
            type="button"
            onClick={onSelect}
            className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
          >
            <Play className="h-3 w-3" />
            {isRu ? 'Смотреть в приложении' : 'Watch in App'}
          </button>

          <a
            href={video.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground hover:underline"
          >
            YouTube <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </CardContent>
    </Card>
  )
}
