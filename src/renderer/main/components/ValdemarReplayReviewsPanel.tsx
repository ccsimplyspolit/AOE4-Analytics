import { useMemo, useState } from 'react'
import { Play, Search, Trophy } from 'lucide-react'
import {
  VALDEMAR_MATCH_ANALYSES,
  type ValdemarVideoEntry,
} from '@data/valdemarCatalog.generated'
import { CIV_SLUGS } from '@data/civs'
import { civDisplayName } from '@domain/civ'
import { formatDurationShort } from '@shared/format'
import { Badge } from '@shared/components/ui/badge'
import { Card, CardContent } from '@shared/components/ui/card'
import { VideoPlayer } from './VideoPlayer'
import { useI18n } from '../../i18n'

export function ValdemarReplayReviewsPanel() {
  const { locale, gameName } = useI18n()
  const isRu = locale === 'ru'

  const [query, setQuery] = useState('')
  const [selectedCiv, setSelectedCiv] = useState<string>('all')
  const [activeVideo, setActiveVideo] = useState<ValdemarVideoEntry | null>(null)

  const filteredAnalyses = useMemo(() => {
    const q = query.trim().toLowerCase()
    return VALDEMAR_MATCH_ANALYSES.filter((video) => {
      if (selectedCiv !== 'all') {
        const matchesCiv =
          video.primaryCivs.includes(selectedCiv) || video.opponentCivs.includes(selectedCiv)
        if (!matchesCiv) return false
      }
      if (q) {
        const titleMatch = video.title.toLowerCase().includes(q)
        const summaryMatch = video.summary.toLowerCase().includes(q)
        const playerMatch = video.proPlayers.some((p) => p.toLowerCase().includes(q))
        const tacticsMatch = video.keyTactics.some(
          (t) => t.name.toLowerCase().includes(q) || t.text.toLowerCase().includes(q),
        )
        if (!titleMatch && !summaryMatch && !playerMatch && !tacticsMatch) {
          return false
        }
      }
      return true
    })
  }, [query, selectedCiv])

  return (
    <div className="space-y-4">
      <Card className="border-primary/30 bg-primary/[0.04]">
        <CardContent className="space-y-2 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-primary/15 p-1.5 text-primary">
                <Trophy className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-sm font-bold">
                  {isRu
                    ? 'Разборы профессиональных матчей и коучинг от Valdemar1902'
                    : 'Valdemar1902 Pro Match Analysis & Replay Coaching'}
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {isRu
                    ? 'Анализ турнирных игр про-игроков (MarineLorD, Beastyqt, LoueMT, LucifroN, Corvinus) и коучинг реплеев уровня Conqueror/Diamond.'
                    : 'Tournament pro game breakdowns and Conqueror/Diamond coaching replay reviews with exact timestamped turning points.'}
                </p>
              </div>
            </div>
            <Badge variant="outline" className="border-primary/40 text-primary">
              {VALDEMAR_MATCH_ANALYSES.length} {isRu ? 'разборов матчей' : 'match reviews'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Active Video Player */}
      {activeVideo && (
        <Card className="border-primary/50 bg-background/90 shadow-md">
          <CardContent className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <Badge variant="secondary" className="text-[10px]">
                  {isRu ? 'РАЗБОР МАТЧА' : 'MATCH ANALYSIS'}
                </Badge>
                <h4 className="mt-1 text-sm font-bold text-foreground">{activeVideo.title}</h4>
              </div>
              <button
                type="button"
                onClick={() => setActiveVideo(null)}
                className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
              >
                ✕
              </button>
            </div>

            <VideoPlayer url={activeVideo.url} title={activeVideo.title} className="max-w-4xl" />

            {/* Tactical Key Timestamps */}
            {activeVideo.keyTactics.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <div className="text-xs font-semibold text-foreground">
                  {isRu ? 'Ключевые поворотные моменты:' : 'Key Turning Points & Timings:'}
                </div>
                <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                  {activeVideo.keyTactics.map((tactic) => (
                    <a
                      key={`${tactic.name}-${tactic.timeSec}`}
                      href={`${activeVideo.url}&t=${tactic.timeSec}s`}
                      target="_blank"
                      rel="noreferrer"
                      className="group flex items-start justify-between rounded border border-border/80 bg-card/60 p-2 text-xs transition-colors hover:border-primary/50 hover:bg-primary/5"
                    >
                      <div>
                        <div className="font-semibold group-hover:text-primary">{tactic.name}</div>
                        <p className="line-clamp-1 text-[11px] text-muted-foreground">{tactic.text}</p>
                      </div>
                      <Badge variant="outline" className="ml-1 font-mono text-[9px]">
                        {tactic.timeFormatted}
                      </Badge>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              isRu
                ? 'Поиск по игрокам (LoueMT, Beasty), ошибкам, картам или матчапам...'
                : 'Search players (LoueMT, Beasty), mistakes, maps or matchups...'
            }
            className="w-full rounded-md border border-border bg-background py-1.5 pl-8 pr-3 text-xs placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
        </div>

        <select
          value={selectedCiv}
          onChange={(e) => setSelectedCiv(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
        >
          <option value="all">{isRu ? 'Все цивилизации' : 'All Civilizations'}</option>
          {CIV_SLUGS.map((slug) => (
            <option key={slug} value={slug}>
              {gameName(civDisplayName(slug))}
            </option>
          ))}
        </select>
      </div>

      {/* Matches Grid */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filteredAnalyses.map((video) => (
          <Card
            key={video.id}
            className="flex flex-col justify-between border-border/80 bg-card/40 transition-colors hover:border-primary/40"
          >
            <CardContent className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-1.5">
                <div className="flex flex-wrap gap-1">
                  {video.primaryCivs.map((civ) => (
                    <Badge key={civ} variant="outline" className="text-[9px] text-primary">
                      {civDisplayName(civ)}
                    </Badge>
                  ))}
                  {video.opponentCivs.map((civ) => (
                    <Badge key={civ} variant="outline" className="text-[9px] text-destructive">
                      vs {civDisplayName(civ)}
                    </Badge>
                  ))}
                </div>
                {video.durationSec > 0 && (
                  <span className="font-mono text-[9px] text-muted-foreground">
                    {formatDurationShort(video.durationSec)}
                  </span>
                )}
              </div>

              <div>
                <h4 className="line-clamp-2 text-xs font-semibold text-foreground">
                  {video.title}
                </h4>
                <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                  {video.summary}
                </p>
              </div>

              {/* Player mentions & Subtitle badge */}
              <div className="flex flex-wrap items-center gap-1">
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

              {/* Key Timestamps */}
              {video.keyTactics.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {video.keyTactics.slice(0, 2).map((tactic) => (
                    <a
                      key={tactic.name}
                      href={`${video.url}&t=${tactic.timeSec}s`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 text-[9px] text-muted-foreground hover:text-primary"
                    >
                      <span>{tactic.name}</span>
                      <span className="font-mono opacity-75">{tactic.timeFormatted}</span>
                    </a>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between border-t border-border/50 pt-2 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveVideo(video)}
                  className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                >
                  <Play className="h-3 w-3" />
                  {isRu ? 'Смотреть разбор' : 'Watch Breakdown'}
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
