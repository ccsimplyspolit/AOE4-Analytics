import { ExternalLink, Lightbulb } from 'lucide-react'
import { getCivProTips, buildTipVideoUrl, type ProTip } from '@domain/proTips'
import { Badge } from '@shared/components/ui/badge'
import { useI18n } from '../../i18n'

export function ProTipsMiniPanel({
  civ,
  title,
  limit = 3,
}: {
  civ: string | null
  title?: string
  limit?: number
}) {
  const { locale } = useI18n()
  const isRu = locale === 'ru'
  const tips = getCivProTips(civ, limit)
  if (tips.length === 0) return null

  return (
    <div className="space-y-2 rounded-md border border-primary/25 bg-primary/[0.04] p-3">
      <div className="flex items-center gap-2">
        <Lightbulb className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-semibold">
          {title ?? (isRu ? 'Советы Beastyqt' : 'Beastyqt Pro Tips')}
        </span>
      </div>
      <div className="space-y-1.5">
        {tips.map((tip) => (
          <MiniTipRow key={tip.id} tip={tip} isRu={isRu} />
        ))}
      </div>
    </div>
  )
}

function MiniTipRow({ tip, isRu }: { tip: ProTip; isRu: boolean }) {
  return (
    <div className="flex items-start justify-between gap-2 rounded border border-border/60 bg-background/40 px-2 py-1.5">
      <div className="min-w-0 space-y-0.5">
        <div className="flex flex-wrap items-center gap-1">
          <Badge variant="secondary" className="text-[8px]">
            {tip.category}
          </Badge>
          <span className="font-mono text-[9px] text-muted-foreground">{tip.timeFormatted}</span>
        </div>
        <p className="text-[11px] leading-snug">{isRu ? tip.shortTextRu : tip.shortText}</p>
      </div>
      <a
        href={buildTipVideoUrl(tip)}
        target="_blank"
        rel="noreferrer"
        className="shrink-0 text-primary hover:text-primary/80"
        title={isRu ? 'Смотреть в видео' : 'Watch in video'}
      >
        <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  )
}
