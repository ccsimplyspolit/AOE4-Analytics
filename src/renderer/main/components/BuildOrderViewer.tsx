import { Download, ExternalLink, Monitor, MonitorX } from 'lucide-react'
import type { BuildOrder, BuildStep } from '@domain/buildOrderSchema'
import { parseNote, buildOrderCivLabel } from '@domain/buildOrderSchema'
import { serializeOverlayBuild } from '@domain/overlayBuild'
import { evidenceLabel } from '@domain/videoEvidence'
import { CIV_PROFILES } from '@data/civProfiles'
import { AGE_ICON, RES_ICON } from '@/overlay/resourceGlyphs'
import { resolveAoE4Icon } from '@data/vendor/aoe4-icons/manifest'
import { ipc } from '@shared/ipc'
import { useSettings, useUpdateSettings } from '../queries/useProfile'
import { useI18n } from '../../i18n'
import { VideoPlayer } from './VideoPlayer'

const AGE_NAMES: Record<number, string> = { 1: 'Dark', 2: 'Feudal', 3: 'Castle', 4: 'Imperial' }

/** The civ's one-line win condition (P14), matched from the build's civ label. */
function focusForBuild(bo: BuildOrder): string | null {
  const label = buildOrderCivLabel(bo).toLowerCase()
  return Object.values(CIV_PROFILES).find((p) => p.name.toLowerCase() === label)?.focus ?? null
}

/** Some provider exports put the sole YouTube URL in the description field. */
function guideVideoUrl(bo: BuildOrder): string | null {
  if (bo.video?.trim()) return bo.video
  return (
    bo.description?.match(/https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)\/[^\s)]+/i)?.[0] ?? null
  )
}

/** Renders a note's text with the same offline-first icon resolver used by the overlay. */
function renderNote(note: string) {
  return parseNote(note).map((part, i) =>
    part.type === 'text' ? (
      <span key={i}>{part.text}</span>
    ) : resolveAoE4Icon(part.path) ? (
      <img
        key={i}
        src={resolveAoE4Icon(part.path) ?? undefined}
        alt={
          part.path
            .split('/')
            .pop()
            ?.replace(/\.\w+$/, '')
            .replace(/[-_]/g, ' ') ?? 'icon'
        }
        title={part.path}
        className="mx-0.5 inline-block h-5 w-5 object-contain align-[-0.2em]"
      />
    ) : (
      <span key={i} className="font-medium text-primary">
        {part.path
          .split('/')
          .pop()
          ?.replace(/\.\w+$/, '')
          .replace(/[-_]/g, ' ')}
      </span>
    ),
  )
}

function exportOverlayBuild(bo: BuildOrder): void {
  const blob = new Blob([serializeOverlayBuild(bo)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${
    bo.name
      .toLocaleLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'build'
  }.overlay.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

function ResourceSplit({ r }: { r: BuildStep['resources'] }) {
  const items: [keyof typeof RES_ICON, number, string, string][] = [
    ['food', r.food, 'F', 'text-emerald-400'],
    ['wood', r.wood, 'W', 'text-lime-500'],
    ['gold', r.gold, 'G', 'text-amber-400'],
    ['stone', r.stone, 'S', 'text-stone-400'],
  ]
  if (r.builder) items.push(['builder', r.builder, 'B', 'text-sky-400'])
  return (
    <span className="flex gap-1.5">
      {items
        .filter(([, n]) => n > 0)
        .map(([key, n, fallback, color]) => (
          <span key={key} className={`tabular-nums ${color}`}>
            {RES_ICON[key] ? (
              <img
                src={RES_ICON[key] ?? undefined}
                alt=""
                aria-hidden="true"
                className="mr-0.5 inline-block h-3.5 w-3.5 object-contain align-[-0.15em]"
              />
            ) : (
              fallback
            )}
            {n}
          </span>
        ))}
    </span>
  )
}

function transcriptStatusLabel(status: string | undefined, source: 'manual' | 'auto' | 'none') {
  if (status === 'available' || source !== 'none') return 'captions available'
  if (status === 'rate-limited') return 'captions pending · rate limited'
  if (status === 'missing') return 'captions unavailable'
  return 'metadata only'
}

function formatTimestamp(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(total / 60)
  return `${minutes}:${String(total % 60).padStart(2, '0')}`
}

export function BuildOrderViewer({ bo }: { bo: BuildOrder }) {
  const { tt } = useI18n()
  const focus = focusForBuild(bo)
  const guideVideo = guideVideoUrl(bo)
  const transcriptAvailable =
    bo.video_evidence?.sources.filter(
      (source) => source.transcriptStatus === 'available' || source.transcriptSource !== 'none',
    ).length ?? 0
  const transcriptRateLimited =
    bo.video_evidence?.sources.filter((source) => source.transcriptStatus === 'rate-limited')
      .length ?? 0
  const { data: settings } = useSettings()
  const update = useUpdateSettings()
  // Bundled builds are keyed by their unique name (validated by the test suite).
  const inOverlay = settings?.overlay.buildOrderId === bo.name
  const toggleOverlayPin = () => {
    update.mutate(
      { overlay: { buildOrderId: inOverlay ? null : bo.name } },
      { onSuccess: () => void ipc.applyOverlaySettings() },
    )
  }
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <div className="truncate font-semibold">{bo.name}</div>
          <div className="text-xs text-muted-foreground">
            {buildOrderCivLabel(bo)}
            {bo.author ? ` · ${bo.author}` : ''}
            {safeExternalUrl(bo.source) && (
              <a
                href={safeExternalUrl(bo.source) ?? undefined}
                target="_blank"
                rel="noreferrer"
                className="ml-2 inline-flex items-center gap-1 text-primary hover:underline"
              >
                {tt('Open source')} <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={() => exportOverlayBuild(bo)}
            title={tt('Export this build as an RTS_Overlay-compatible JSON file')}
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <Download className="h-4 w-4" />
            .overlay.json
          </button>
          <button
            type="button"
            disabled={!settings}
            onClick={toggleOverlayPin}
            title={
              inOverlay
                ? tt('Stop showing this build on the in-game overlay')
                : tt('Show this build step-by-step on the in-game overlay during matches')
            }
            className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors disabled:opacity-50 ${
              inOverlay
                ? 'border-primary bg-primary/10 text-primary hover:bg-primary/20'
                : 'border-border text-muted-foreground hover:bg-secondary hover:text-foreground'
            }`}
          >
            {inOverlay ? <MonitorX className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
            {inOverlay ? tt('Remove from overlay') : tt('Show in overlay')}
          </button>
          <span className="text-[11px] text-muted-foreground">
            {bo.build_order.length} {tt('steps')}
          </span>
        </div>
      </div>
      {focus && (
        <div className="border-b border-border bg-primary/5 px-4 py-2 text-xs text-muted-foreground">
          <span className="font-medium text-primary">{tt('Win condition:')}</span> {focus}
        </div>
      )}
      {guideVideo && (
        <div className="border-b border-border bg-secondary/20 px-4 py-3">
          <VideoPlayer url={guideVideo} title={bo.name} className="max-w-2xl" />
        </div>
      )}
      {bo.video_evidence && (
        <div className="border-b border-border bg-secondary/30 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-medium uppercase tracking-wider text-primary">
              {tt('Video evidence')}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {evidenceLabel(bo.video_evidence)}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {bo.video_evidence.windowStart} → {bo.video_evidence.windowEnd}
            {bo.video_evidence.coverageNote ? ` · ${bo.video_evidence.coverageNote}` : ''}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {tt('Captions')}: {transcriptAvailable}/{bo.video_evidence.sources.length}{' '}
            {tt('available')}
            {transcriptRateLimited > 0
              ? ` · ${transcriptRateLimited} pending after YouTube rate limit`
              : ''}
          </p>
          {(bo.video_evidence.commonActions.length > 0 ||
            bo.video_evidence.commonResources.length > 0 ||
            bo.video_evidence.commonTopics.length > 0 ||
            bo.video_evidence.commonOpponents.length > 0 ||
            bo.video_evidence.commonMilitaryMentions.length > 0) && (
            <div className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
              {bo.video_evidence.commonTopics.length > 0 && (
                <div>
                  <span className="text-muted-foreground">{tt('Analysis focus:')} </span>
                  <span>{bo.video_evidence.commonTopics.join(' · ')}</span>
                </div>
              )}
              {bo.video_evidence.commonActions.length > 0 && (
                <div>
                  <span className="text-muted-foreground">{tt('Common actions:')} </span>
                  <span>{bo.video_evidence.commonActions.join(' · ')}</span>
                </div>
              )}
              {bo.video_evidence.commonResources.length > 0 && (
                <div>
                  <span className="text-muted-foreground">{tt('Resource signals:')} </span>
                  <span>{bo.video_evidence.commonResources.join(' · ')}</span>
                </div>
              )}
              {bo.video_evidence.commonOpponents.length > 0 && (
                <div>
                  <span className="text-muted-foreground">{tt('Opponent context:')} </span>
                  <span>{bo.video_evidence.commonOpponents.join(' · ')}</span>
                </div>
              )}
              {bo.video_evidence.commonMilitaryMentions.length > 0 && (
                <div>
                  <span className="text-muted-foreground">{tt('Military mentions:')} </span>
                  <span>{bo.video_evidence.commonMilitaryMentions.join(' · ')}</span>
                </div>
              )}
            </div>
          )}
          {bo.video_evidence.timingSignals.length > 0 && (
            <div className="mt-2 text-xs">
              <span className="text-muted-foreground">{tt('Observed timing signals:')} </span>
              <span>
                {bo.video_evidence.timingSignals
                  .slice(0, 5)
                  .map((timing) => `${timing.label} (${timing.mentions}×)`)
                  .join(' · ')}
              </span>
            </div>
          )}
          {bo.video_evidence.sources.length > 0 && (
            <details className="mt-3 rounded-md border border-border/70 bg-background/30 px-3 py-2">
              <summary className="cursor-pointer text-xs font-medium text-primary">
                Per-source analysis · showing {Math.min(5, bo.video_evidence.sources.length)} of{' '}
                {bo.video_evidence.sources.length}
              </summary>
              <div className="mt-2 space-y-2">
                {bo.video_evidence.sources.slice(0, 5).map((source) => (
                  <div
                    key={source.id}
                    className="border-t border-border/60 pt-2 first:border-0 first:pt-0"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-[11px]">
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-primary hover:underline"
                      >
                        {source.title}
                      </a>
                      <span className="text-muted-foreground">
                        {transcriptStatusLabel(source.transcriptStatus, source.transcriptSource)} ·
                        confidence {Math.round(source.signals.confidence * 100)}%
                      </span>
                    </div>
                    <div className="mt-1 grid gap-1 text-[11px] text-muted-foreground sm:grid-cols-2">
                      {source.signals.topics.length > 0 && (
                        <span>Focus: {source.signals.topics.join(' · ')}</span>
                      )}
                      {source.signals.opponentCivs.length > 0 && (
                        <span>Opponents: {source.signals.opponentCivs.join(' · ')}</span>
                      )}
                      {source.signals.militaryMentions.length > 0 && (
                        <span>Military: {source.signals.militaryMentions.join(' · ')}</span>
                      )}
                      {source.signals.timings.length > 0 && (
                        <span>
                          Timings:{' '}
                          {source.signals.timings
                            .slice(0, 3)
                            .map((timing) => timing.label)
                            .join(' · ')}
                        </span>
                      )}
                    </div>
                    <VideoPlayer url={source.url} title={source.title} className="mt-2 max-w-xl" />
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
      {bo.tactics && bo.tactics.length > 0 && (
        <div className="border-b border-border bg-primary/[0.035] px-4 py-3">
          <div className="text-xs font-medium uppercase tracking-wider text-primary">
            {tt('Extracted tactics')}
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {bo.tactics.slice(0, 12).map((tactic) => (
              <div
                key={tactic.id}
                className="rounded-md border border-border/70 bg-background/30 p-2.5"
              >
                <div className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="font-medium">{tactic.title}</span>
                  {tactic.timeSec != null && (
                    <span className="shrink-0 font-mono text-[10px] text-primary">
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
        </div>
      )}
      {bo.transcriptText && (
        <details className="border-b border-border bg-background/20 px-4 py-3">
          <summary className="cursor-pointer text-xs font-medium text-primary">
            {tt('Transcript used for extraction')}
          </summary>
          <p className="mt-2 max-h-72 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
            {bo.transcriptText}
          </p>
        </details>
      )}
      <ol className="divide-y divide-border">
        {bo.build_order.map((step, i) => (
          <li key={i} className="flex gap-3 px-4 py-2.5 text-sm">
            <div className="flex w-14 shrink-0 flex-col items-center gap-1">
              <span className="font-mono text-xs text-muted-foreground">
                {step.time ?? `#${i + 1}`}
              </span>
              <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
                {AGE_ICON[step.age] && (
                  <img
                    src={AGE_ICON[step.age] ?? undefined}
                    alt=""
                    aria-hidden="true"
                    className="mr-0.5 inline-block h-3.5 w-3.5 object-contain align-[-0.15em]"
                  />
                )}
                {AGE_NAMES[step.age] ?? `Age ${step.age}`}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                <span className="tabular-nums">{step.villager_count} vills</span>
                <ResourceSplit r={step.resources} />
              </div>
              <ul className="space-y-0.5 leading-snug">
                {step.notes.map((n, j) => (
                  <li key={j}>{renderNote(n)}</li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}

function safeExternalUrl(value: string | null | undefined): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' ? url.toString() : null
  } catch {
    return null
  }
}
