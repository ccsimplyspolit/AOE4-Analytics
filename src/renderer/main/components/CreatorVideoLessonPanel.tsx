import { ExternalLink, Play } from 'lucide-react'
import type { CreatorVideoPick } from '@domain/creatorVideoCoach'
import type { CreatorVideoLesson } from '@data/creatorVideoLessons.generated'
import { lessonWatchUrl } from '@domain/creatorVideoCoach'
import { Card, CardContent } from '@shared/components/ui/card'
import { Badge } from '@shared/components/ui/badge'
import { useI18n } from '../../i18n'

function BeatList({
  title,
  beats,
  lesson,
}: {
  title: string
  beats: CreatorVideoLesson['builds']
  lesson: CreatorVideoLesson
}) {
  if (beats.length === 0) return null
  return (
    <div className="space-y-1">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</div>
      <ul className="space-y-1">
        {beats.slice(0, 4).map((beat) => (
          <li key={`${beat.name}-${beat.timeSec}`}>
            <a
              href={lessonWatchUrl(lesson, beat.timeSec)}
              target="_blank"
              rel="noreferrer"
              className="block rounded border border-border/50 px-2 py-1.5 hover:border-primary/40"
            >
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <span className="font-medium">{beat.name}</span>
                <span className="font-mono text-[10px] text-primary">{beat.timeFormatted}</span>
              </div>
              <p className="mt-0.5 text-[11px] italic text-muted-foreground">“{beat.quote}”</p>
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function CreatorVideoLessonCard({ pick }: { pick: CreatorVideoPick }) {
  const { tt } = useI18n()
  const lesson = pick.lesson
  return (
    <div className="rounded-md border border-border/70 bg-background/40 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className="text-[10px]">
              {pick.creator === 'beastyqt' ? 'Beastyqt' : 'Valdemar'}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {pick.side === 'opponent'
                ? tt('Opponent video')
                : pick.side === 'shared'
                  ? tt('Shared fundamentals')
                  : tt('Your video')}
            </Badge>
          </div>
          <a
            href={pick.catalogUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-sm font-medium hover:text-primary"
          >
            {pick.catalogTitle}
            <ExternalLink className="h-3 w-3" />
          </a>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{pick.reason}</p>
        </div>
      </div>
      {lesson ? (
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <BeatList title={tt('Builds from transcript')} beats={lesson.builds} lesson={lesson} />
          <BeatList title={tt('Mechanics from transcript')} beats={lesson.mechanics} lesson={lesson} />
        </div>
      ) : (
        <p className="mt-2 text-[11px] text-muted-foreground">
          {tt('No on-disk transcript for this video — title and catalog only.')}
        </p>
      )}
    </div>
  )
}

export function CreatorVideoLessonPanel({
  picks,
  title,
}: {
  picks: CreatorVideoPick[]
  title?: string
}) {
  const { tt } = useI18n()
  if (picks.length === 0) return null
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <Play className="h-4 w-4 text-primary" />
          {title ?? tt('Per-video coaching')}
        </h3>
        <p className="text-[11px] text-muted-foreground">
          {tt('Quotes are taken only from downloaded captions or video chapters.')}
        </p>
        <div className="space-y-2">
          {picks.map((pick, index) => (
            <CreatorVideoLessonCard
              key={`${pick.creator}-${pick.lesson?.id ?? pick.catalogUrl}-${index}`}
              pick={pick}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
