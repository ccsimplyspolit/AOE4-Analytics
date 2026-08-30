import { useMemo, useState } from 'react'
import { ListChecks, Play, Swords } from 'lucide-react'
import {
  VALDEMAR_VIDEOS,
  type ValdemarVideoEntry,
} from '@data/valdemarCatalog.generated'
import {
  getBeastyVideosForCiv,
  type BeastyVideoEntry,
} from '@data/beastyCatalog.generated'
import { formatDurationShort } from '@shared/format'
import { Badge } from '@shared/components/ui/badge'
import { Card, CardContent } from '@shared/components/ui/card'
import { VideoPlayer } from './VideoPlayer'
import { VisualMilestoneCoachCard } from './VisualMilestoneCoachCard'
import { ProTipsMiniPanel } from './ProTipsMiniPanel'
import { useI18n } from '../../i18n'

export function ValdemarMatchCoachCard({
  myCiv,
  opponentCiv,
  showGenericTips = true,
}: {
  myCiv: string | null
  opponentCiv: string | null
  showGenericTips?: boolean
}) {
  const { locale, gameName } = useI18n()
  const isRu = locale === 'ru'
  const [activeVideo, setActiveVideo] = useState<ValdemarVideoEntry | null>(null)
  const [activeBeasty, setActiveBeasty] = useState<BeastyVideoEntry | null>(null)

  const beastyVideos = useMemo(() => getBeastyVideosForCiv(myCiv).slice(0, 2), [myCiv])

  const relevantVideos = useMemo(() => {
    if (!myCiv) return []

    // 1. Direct matchup analysis
    const exactMatchup = VALDEMAR_VIDEOS.filter((v) => {
      const hasMyCiv = v.primaryCivs.includes(myCiv) || v.opponentCivs.includes(myCiv)
      const hasOppCiv =
        opponentCiv &&
        (v.primaryCivs.includes(opponentCiv) || v.opponentCivs.includes(opponentCiv))
      return hasMyCiv && hasOppCiv
    })

    // 2. Pro match analyses for myCiv
    const myCivAnalyses = VALDEMAR_VIDEOS.filter(
      (v) =>
        (v.primaryCivs.includes(myCiv) || v.opponentCivs.includes(myCiv)) &&
        v.category === 'match_analysis' &&
        !exactMatchup.some((m) => m.id === v.id),
    )

    // 3. Build orders and civ guides for myCiv
    const myCivGuides = VALDEMAR_VIDEOS.filter(
      (v) =>
        v.primaryCivs.includes(myCiv) &&
        (v.category === 'build_order' || v.category === 'civ_guide') &&
        !exactMatchup.some((m) => m.id === v.id) &&
        !myCivAnalyses.some((m) => m.id === v.id),
    )

    return [...exactMatchup, ...myCivAnalyses, ...myCivGuides].slice(0, 4)
  }, [myCiv, opponentCiv])

  if (!myCiv || (relevantVideos.length === 0 && beastyVideos.length === 0)) {
    return null
  }

  return (
    <Card className="border-primary/25 bg-primary/[0.035]">
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-start gap-2.5">
            <span className="rounded-md bg-primary/10 p-1.5 text-primary">
              <Swords className="h-4 w-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold">
                  {isRu
                    ? 'Анализ матчапа и коучинг от Valdemar1902'
                    : 'Valdemar1902 Matchup & Pro Video Analysis'}
                </h3>
                <Badge variant="outline" className="text-[9px]">
                  {gameName(myCiv)}
                  {opponentCiv ? ` vs ${gameName(opponentCiv)}` : ''}
                </Badge>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {isRu
                  ? 'Тактические разборы, тайминги и рекомендации профессиональных матчей для этого противостояния.'
                  : 'Pro match breakdowns, timings, and tactical advice from Valdemar for this matchup.'}
              </p>
            </div>
          </div>

          <a
            href="https://www.youtube.com/@Valdemar1902/videos"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-primary hover:underline"
          >
            Valdemar1902 ↗
          </a>
        </div>

        {/* Active Embedded Player */}
        {activeVideo && (
          <div className="space-y-2 rounded-md border border-primary/40 bg-background/80 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">{activeVideo.title}</span>
              <button
                type="button"
                onClick={() => setActiveVideo(null)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>
            <VideoPlayer url={activeVideo.url} title={activeVideo.title} className="max-w-2xl" />
          </div>
        )}

        {/* Video Cards List */}
        {relevantVideos.length > 0 && (
        <div className="grid gap-2.5 md:grid-cols-2">
          {relevantVideos.map((video) => (
            <div
              key={video.id}
              className="flex flex-col justify-between rounded-md border border-border/80 bg-background/50 p-3 transition-colors hover:border-primary/40"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-1">
                  <Badge variant="secondary" className="text-[9px]">
                    {video.category === 'match_analysis'
                      ? isRu
                        ? 'Анализ матча'
                        : 'Match Review'
                      : video.category === 'build_order'
                        ? isRu
                          ? 'Билд'
                          : 'Build Order'
                        : isRu
                          ? 'Гайд'
                          : 'Masterclass'}
                  </Badge>
                  {video.durationSec > 0 && (
                    <span className="font-mono text-[9px] text-muted-foreground">
                      {formatDurationShort(video.durationSec)}
                    </span>
                  )}
                </div>

                <h4 className="line-clamp-2 text-xs font-semibold text-foreground">
                  {video.title}
                </h4>

                <p className="line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                  {video.summary}
                </p>

                {/* Key Tactics Timings */}
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
                        <ListChecks className="h-2.5 w-2.5" />
                        <span>{tactic.name}</span>
                        <span className="font-mono opacity-75">{tactic.timeFormatted}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-2.5 flex items-center justify-between border-t border-border/50 pt-2 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveVideo(video)}
                  className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                >
                  <Play className="h-3 w-3" />
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
            </div>
          ))}
        </div>
        )}

        {beastyVideos.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {isRu ? 'Beastyqt — макро и микро' : 'Beastyqt — macro & micro'}
            </div>
            {activeBeasty && (
              <div className="space-y-2 rounded-md border border-primary/40 bg-background/80 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">{activeBeasty.title}</span>
                  <button
                    type="button"
                    onClick={() => setActiveBeasty(null)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    ✕
                  </button>
                </div>
                <VideoPlayer url={activeBeasty.url} title={activeBeasty.title} className="max-w-2xl" />
              </div>
            )}
            <div className="grid gap-2 md:grid-cols-2">
              {beastyVideos.map((video) => (
                <div
                  key={video.id}
                  className="rounded-md border border-border/80 bg-background/50 p-3"
                >
                  <h4 className="line-clamp-2 text-xs font-semibold">{video.title}</h4>
                  <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{video.summary}</p>
                  <button
                    type="button"
                    onClick={() => setActiveBeasty(video)}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                  >
                    <Play className="h-3 w-3" />
                    {isRu ? 'Смотреть' : 'Watch in App'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {showGenericTips && (
          <ProTipsMiniPanel
            civ={myCiv}
            title={isRu ? 'Ключевые советы Beastyqt' : 'Key Beastyqt tips'}
          />
        )}

        {/* Frame Milestone Blueprint */}
        <VisualMilestoneCoachCard civ={myCiv} />
      </CardContent>
    </Card>
  )
}
