import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { FileText, LoaderCircle, Save, Video } from 'lucide-react'
import { buildOrderCivLabel } from '@domain/buildOrderSchema'
import type { VideoAnalysisRecord } from '@domain/videoAnalysis'
import type { TwitchVodFinderInput } from '@domain/twitchVodFinder'
import { Card, CardContent } from '@shared/components/ui/card'
import { Input } from '@shared/components/ui/input'
import { ipc } from '@shared/ipc'
import { useI18n } from '../../i18n'

export function VideoAnalysisImporter({
  initialUrl = '',
  initialGameId = null,
  initialCivilization = '',
  onImported,
}: {
  initialUrl?: string
  /** Exact AoE4World game id carried from the Twitch Finder link. */
  initialGameId?: string | null
  /** Civ carried from the match so extraction can label the draft build. */
  initialCivilization?: string | null
  onImported: (record: VideoAnalysisRecord) => void
}) {
  const { tt, gameName } = useI18n()
  const queryClient = useQueryClient()
  const autoStartedUrlRef = useRef<string | null>(null)
  const [url, setUrl] = useState(initialUrl)
  const [civilization, setCivilization] = useState(initialCivilization ?? '')
  const [record, setRecord] = useState<VideoAnalysisRecord | null>(null)
  const [loading, setLoading] = useState(false)
  const [batchLoading, setBatchLoading] = useState(false)
  const [batchProgress, setBatchProgress] = useState<{
    current: number
    total: number
    linked: number
    analyzed: number
  } | null>(null)
  const [batchMessage, setBatchMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const extract = useCallback(
    async (candidate = url) => {
      if (!candidate.trim() || loading) return
      setLoading(true)
      setError(null)
      setRecord(null)
      const result = await ipc.extractVideoAnalysis({
        url: candidate.trim(),
        civilization: civilization.trim() || null,
        // Only carry the match id for the exact Finder URL. If the user edits
        // the field afterwards, do not attach an unrelated video to the game.
        gameId: candidate.trim() === initialUrl.trim() ? initialGameId : null,
      })
      setLoading(false)
      if (!result.ok) {
        setError(result.error.message)
        return
      }
      setRecord(result.data)
      void queryClient.invalidateQueries({ queryKey: ['videoAnalyses'] })
      onImported(result.data)
    },
    [civilization, initialGameId, initialUrl, loading, onImported, queryClient, url],
  )

  const analyzeLinkedVods = async () => {
    if (batchLoading || loading) return
    setBatchLoading(true)
    setBatchMessage(null)
    setError(null)
    try {
      // The store accepts up to 5,000 visible rows. Do not silently stop at a
      // small recent sample: the user asked to resolve every game that has a
      // public Twitch association.
      const history = await ipc.getHistory(5000)
      if (!history.ok) {
        setError(history.error.message)
        return
      }
      const candidates = history.data.filter(
        (match) => !match.custom && /^\d{1,16}$/.test(match.id) && Boolean(match.civ),
      )
      let analyzed = 0
      let linked = 0
      setBatchProgress({ current: 0, total: candidates.length, linked, analyzed })
      for (const [index, match] of candidates.entries()) {
        const finderInput: TwitchVodFinderInput = {
          gameId: match.id,
          civilization: match.civ,
          opponentCivilization: match.oppCiv,
          map: match.map,
          durationSec: match.durationSec,
        }
        const found = await ipc.findTwitchVod(finderInput)
        if (found.ok && found.data.vod) {
          linked += 1
          const extracted = await ipc.extractVideoAnalysis({
            url: found.data.vod.url,
            civilization: match.civ,
            gameId: match.id,
          })
          if (extracted.ok) {
            analyzed += 1
            void queryClient.invalidateQueries({ queryKey: ['videoAnalyses'] })
            onImported(extracted.data)
            setRecord(extracted.data)
          }
        }
        setBatchProgress({ current: index + 1, total: candidates.length, linked, analyzed })
      }
      setBatchMessage(`${tt('Linked VODs')}: ${linked} · ${tt('saved analyses')}: ${analyzed}`)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setBatchLoading(false)
      setBatchProgress(null)
    }
  }

  useEffect(() => {
    if (!initialUrl) return
    setUrl(initialUrl)
    if (initialCivilization) setCivilization(initialCivilization)
    if (autoStartedUrlRef.current !== initialUrl) {
      autoStartedUrlRef.current = initialUrl
      void extract(initialUrl)
    }
  }, [extract, initialCivilization, initialUrl])

  useEffect(() => {
    const candidate = url.trim()
    if (candidate === initialUrl.trim()) return
    if (candidate.length < 12 || !/^https?:\/\//i.test(candidate)) return
    const timer = window.setTimeout(() => void extract(candidate), 700)
    return () => window.clearTimeout(timer)
  }, [extract, initialUrl, url])

  useEffect(() => {
    if (initialUrl) return
    void analyzeLinkedVods()
    // One background pass when the Cellar opens without a deep-linked VOD.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Card className="border-primary/25 bg-primary/[0.035]">
      <CardContent className="space-y-4 p-4">
        <div className="flex items-start gap-3">
          <span className="rounded-lg border border-primary/30 bg-primary/10 p-2 text-primary">
            <Video className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="rts-section-title">{tt('Extract from video')}</div>
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted-foreground">
              {tt(
                'Paste a YouTube video or Twitch VOD. Public captions are converted into timings, tactics and a draft build order, then saved to this Cellar.',
              )}
            </p>
          </div>
        </div>
        <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_190px_auto]">
          <Input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void extract()
            }}
            placeholder="https://www.youtube.com/watch?v=… or https://www.twitch.tv/videos/…"
            className="h-9 text-xs"
            aria-label={tt('Video or VOD URL')}
          />
          <Input
            value={civilization}
            onChange={(event) => setCivilization(event.target.value)}
            placeholder={tt('Civilization (optional)')}
            className="h-9 text-xs"
            aria-label={tt('Civilization (optional)')}
          />
          {loading ? (
            <span className="inline-flex h-9 items-center gap-1.5 text-xs text-muted-foreground">
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
              {tt('Extracting…')}
            </span>
          ) : null}
        </div>
        {batchLoading && (
          <p className="inline-flex items-center gap-1.5 text-[11px] text-violet-200">
            <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
            {tt('Checking linked Twitch VODs…')}
          </p>
        )}
        {batchProgress && (
          <p className="text-[11px] text-muted-foreground">
            {tt('Processed')}: {batchProgress.current}/{batchProgress.total} · {tt('Linked VODs')}:{' '}
            {batchProgress.linked} · {tt('saved analyses')}: {batchProgress.analyzed}
          </p>
        )}
        {batchMessage && <p className="text-[11px] text-muted-foreground">{batchMessage}</p>}
        {error && <p className="text-xs text-destructive">{error}</p>}
        {record && (
          <div className="rounded-lg border border-win/30 bg-win/[0.06] p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-sm font-medium text-win">
                  <Save className="h-3.5 w-3.5" /> {tt('Saved to the Cellar')}
                </div>
                <p className="mt-1 truncate text-xs text-foreground">{record.title}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {record.channel ?? record.provider} · {gameName(buildOrderCivLabel(record.build))}{' '}
                  · {record.build.build_order.length} {tt('steps')}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5 text-[11px] text-muted-foreground">
                <FileText className="h-3.5 w-3.5" />
                {record.transcriptStatus === 'available'
                  ? `${record.transcriptText.split(/\s+/).filter(Boolean).length} ${tt('words')}`
                  : tt('metadata only')}
              </div>
            </div>
            {record.warnings.map((warning) => (
              <p key={warning} className="mt-2 text-[11px] text-amber-200">
                {warning}
              </p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
