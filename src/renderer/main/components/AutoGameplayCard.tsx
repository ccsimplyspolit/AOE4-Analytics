import { useEffect, useRef } from 'react'
import {
  CheckCircle2,
  Download,
  ExternalLink,
  FileVideo,
  LoaderCircle,
  Search,
  XCircle,
} from 'lucide-react'
import type { GameplayAutoInput, GameplayAutoStage } from '@domain/gameplayAuto'
import { Card, CardContent } from '@shared/components/ui/card'
import { useI18n } from '../../i18n'
import { useGameplayAuto } from '../queries/useGameplayAuto'

function formatBytes(value: number | null): string | null {
  if (!value || value <= 0) return null
  if (value >= 1024 ** 3) return `${(value / 1024 ** 3).toFixed(1)} GB`
  return `${Math.round(value / 1024 ** 2)} MB`
}

function stageLabel(stage: GameplayAutoStage, tt: (value: string) => string): string {
  switch (stage) {
    case 'searching':
      return tt('Searching public gameplay…')
    case 'found':
      return tt('Gameplay found')
    case 'downloading':
      return tt('Downloading gameplay…')
    case 'downloaded':
      return tt('Gameplay downloaded')
    case 'analyzing':
      return tt('Extracting build and tactics…')
    case 'completed':
      return tt('Gameplay analyzed and saved')
    case 'not_found':
      return tt('No public gameplay found')
    default:
      return tt('Gameplay analysis failed')
  }
}

export function AutoGameplayCard({
  input,
  enabled,
  hasAnalysis,
}: {
  input: GameplayAutoInput
  enabled: boolean
  hasAnalysis: boolean
}) {
  const { tt } = useI18n()
  const auto = useGameplayAuto()
  const startedRef = useRef(false)
  const retryScheduledRef = useRef(false)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const run = (force = false) => {
    if (auto.isPending) return
    void auto.mutateAsync(force ? { ...input, force: true } : input).catch(() => undefined)
  }

  useEffect(() => {
    if (!enabled || hasAnalysis || startedRef.current) return
    startedRef.current = true
    run()
    // The workflow is intentionally started once per mounted match. The main
    // process deduplicates retries and keeps a short-lived result cache.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, hasAnalysis, input.gameId])

  // Public archives are often indexed after the match itself. If the first
  // lookup returns no candidate, retry once in the background so the user does
  // not have to press “Find again” just because the catalogue was late.
  useEffect(() => {
    if (
      !enabled ||
      hasAnalysis ||
      retryScheduledRef.current ||
      auto.data?.stage !== 'not_found'
    ) {
      return
    }
    retryScheduledRef.current = true
    retryTimerRef.current = setTimeout(() => {
      retryTimerRef.current = null
      run(true)
    }, 60_000)
    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
      retryTimerRef.current = null
    }
    // The retry is deliberately limited to one pass per mounted match.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, hasAnalysis, auto.data?.stage, input.gameId])

  useEffect(
    () => () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
    },
    [],
  )

  if (!enabled) return null
  const result = auto.data
  const pending = auto.isPending
  const candidate = result?.candidate
  const downloadedSize = formatBytes(result?.downloadedBytes ?? null)

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold tracking-tight">{tt('Automatic gameplay source')}</h2>
        <button
          type="button"
          onClick={() => run(true)}
          disabled={pending}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-primary/40 px-2.5 text-xs text-primary hover:bg-primary/10 disabled:pointer-events-none disabled:opacity-50"
        >
          {pending ? (
            <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Search className="h-3.5 w-3.5" />
          )}
          {pending ? tt('Working…') : tt('Find and analyze again')}
        </button>
      </div>
      <Card>
        <CardContent className="space-y-3 p-4">
          {pending && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <LoaderCircle className="h-4 w-4 animate-spin text-primary" />
              {tt('Searching, downloading and analyzing a public video…')}
            </div>
          )}
          {auto.error && <p className="text-sm text-destructive">{auto.error.message}</p>}
          {result && (
            <>
              <div className="flex items-start gap-2">
                {result.stage === 'completed' ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-win" />
                ) : result.stage === 'failed' || result.stage === 'not_found' ? (
                  <XCircle className="mt-0.5 h-4 w-4 text-warn" />
                ) : (
                  <LoaderCircle className="mt-0.5 h-4 w-4 animate-spin text-primary" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium">{stageLabel(result.stage, tt)}</p>
                  {candidate && (
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {candidate.title} {candidate.channel ? `· ${candidate.channel}` : ''}
                    </p>
                  )}
                </div>
              </div>
              {candidate && (
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <a
                    href={candidate.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 px-2.5 py-1.5 text-primary hover:bg-primary/10"
                  >
                    {candidate.provider === 'twitch' ? 'Twitch' : 'YouTube'}{' '}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  {candidate.exactGame && (
                    <span className="text-win">{tt('Exact game match')}</span>
                  )}
                </div>
              )}
              {result.downloadedPath && (
                <p className="flex items-center gap-1.5 text-[11px] text-win">
                  <FileVideo className="h-3.5 w-3.5" />
                  {tt('Saved locally')} {downloadedSize ? `· ${downloadedSize}` : ''}
                </p>
              )}
              {result.analysis && (
                <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Download className="h-3.5 w-3.5" />
                  {tt('Saved to the Cellar')}: {result.analysis.build.build_order.length}{' '}
                  {tt('steps')}
                </p>
              )}
              {result.warnings.map((warning) => (
                <p key={warning} className="text-[11px] text-amber-200">
                  {tt(warning)}
                </p>
              ))}
            </>
          )}
          {!pending && !result && !auto.error && (
            <p className="text-sm text-muted-foreground">
              {tt('Automatic search has not started yet.')}
            </p>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
