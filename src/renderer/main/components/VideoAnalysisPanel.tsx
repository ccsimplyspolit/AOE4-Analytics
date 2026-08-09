import { FileText, ListChecks, Video } from 'lucide-react'
import type { VideoAnalysisRecord } from '@domain/videoAnalysis'
import { Card, CardContent } from '@shared/components/ui/card'
import { useI18n } from '../../i18n'

export function VideoAnalysisPanel({ record }: { record: VideoAnalysisRecord }) {
  const { tt } = useI18n()
  const tactics = record.tactics.slice(0, 12)
  return (
    <Card className="border-primary/25 bg-primary/[0.035]">
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-2.5">
            <span className="rounded-md bg-primary/10 p-1.5 text-primary">
              <Video className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold">{tt('Video-derived tactics')}</h2>
              <p className="truncate text-xs text-muted-foreground">
                {record.title} · {record.channel ?? record.provider}
              </p>
            </div>
          </div>
          <a
            href={record.url}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-primary hover:underline"
          >
            {tt('Open source')} ↗
          </a>
        </div>

        {tactics.length > 0 ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {tactics.map((tactic) => (
              <div
                key={`${tactic.id}:${tactic.timeSec ?? 'na'}`}
                className="rounded-md border border-border/80 bg-background/50 p-3"
              >
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <ListChecks className="h-3.5 w-3.5 text-primary" />
                  {tactic.title}
                  {tactic.timeSec != null && (
                    <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                      {formatTimestamp(tactic.timeSec)}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  {tactic.detail}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            {tt('No explicit tactical captions were detected.')}
          </p>
        )}

        {record.transcriptText && (
          <details className="rounded-md border border-border/80 bg-background/40">
            <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-xs font-medium">
              <FileText className="h-3.5 w-3.5 text-primary" />
              {tt('Transcript excerpt')}
              <span className="ml-auto text-[10px] text-muted-foreground">
                {record.transcriptLanguage ?? 'auto'} · {record.transcriptProvider}
              </span>
            </summary>
            <p className="max-h-52 overflow-y-auto border-t border-border px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
              {record.transcriptText}
            </p>
          </details>
        )}

        <p className="text-[10px] text-amber-200/80">
          {record.transcriptStatus === 'available'
            ? tt('Caption-backed inference; verify timings and worker counts against the source.')
            : tt('Metadata-only inference; captions were unavailable for this source.')}
        </p>
      </CardContent>
    </Card>
  )
}

function formatTimestamp(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(total / 60)
  return `${minutes}:${String(total % 60).padStart(2, '0')}`
}
