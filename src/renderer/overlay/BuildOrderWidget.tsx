// Re-activated (2026-07-07): mounted by OverlayApp as a placeable widget, driven
// by the live game clock + the build order pinned from Guides ("Show in overlay").
import { useState } from 'react'
import { decodeHtmlEntities, type BuildOrder } from '@domain/buildOrderSchema'
import { parseBuildOrderDisplayNote } from '@domain/buildOrderNotes'
import { liveBuildForkPlan } from '@domain/adaptiveBuild'
import { formatDuration } from '@domain/format'
import {
  AGE_ICON,
  AGE_ROMAN,
  RES_GLYPH,
  RES_ICON,
  TIME_GLYPH,
  noteTokenGlyph,
  noteTokenIcon,
} from './resourceGlyphs'
import { extractBuildTargets, type BuildTarget } from './buildIcons'
import { useI18n } from '../i18n'

/** A resource entry on the villager-split line: glyph + value, hidden when negative. */
function Res({
  glyph,
  icon,
  value,
}: {
  glyph: string
  icon: string | null
  value: number | undefined
}) {
  if (value == null || value < 0) return null
  return (
    <span className="whitespace-nowrap">
      {icon ? (
        <img
          src={icon}
          alt=""
          aria-hidden="true"
          className="inline-block h-3.5 w-3.5 object-contain align-[-0.15em]"
        />
      ) : (
        glyph
      )}{' '}
      {value}
    </span>
  )
}

/** A building/unit thumbnail from the CDN, falling back to its name if the image fails. */
function BuildIcon({ target, size = 30 }: { target: BuildTarget; size?: number }) {
  const [broken, setBroken] = useState(false)
  if (broken) {
    return (
      <span
        title={target.label}
        className="inline-flex items-center rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-white/85"
      >
        {target.label}
      </span>
    )
  }
  return (
    <img
      src={target.url}
      alt={target.label}
      title={target.label}
      onError={() => setBroken(true)}
      className="rounded bg-black/40 ring-1 ring-white/10"
      style={{ width: size, height: size, objectFit: 'contain' }}
    />
  )
}

function renderNote(note: string) {
  return parseBuildOrderDisplayNote(note).map((part, i) => {
    if (part.type === 'text') return <span key={i}>{part.text}</span>
    const icon = noteTokenIcon(part.path)
    const label = part.type === 'icon' ? part.label : part.path.split('/').pop()?.replace(/\.\w+$/, '') ?? 'icon'
    return (
      <span key={i} className="mx-0.5 inline-flex align-[-0.2em]">
        {icon ? (
          <img
            src={icon}
            alt={label}
            title={label}
            className="inline-block h-5 w-5 object-contain"
          />
        ) : (
          <span title={label} className="rounded bg-white/10 px-1 text-[10px] text-white/80">
            {noteTokenGlyph(part.path) ?? label}
          </span>
        )}
      </span>
    )
  })
}

/** First sentence of a note, trimmed — used for the dim "next" preview. */
function firstClause(s: string | undefined): string {
  if (!s) return ''
  const t = decodeHtmlEntities(s).split(/[.!]/)[0] ?? s
  return t.length > 44 ? `${t.slice(0, 42).trimEnd()}…` : t
}

/** Plain-text counterpart of the icon-token note renderer used by the legacy TXT view. */
function plainNote(s: string | undefined): string {
  if (!s) return ''
  return parseBuildOrderDisplayNote(s)
    .map((part) =>
      part.type === 'text'
        ? part.text
        : part.type === 'icon'
          ? part.label
          : part.path
              .split('/')
              .pop()
              ?.replace(/\.[^.]+$/, '')
              .replace(/[-_]/g, ' ') ?? '',
    )
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * The build-order centerpiece of the overlay. Shows the build ONE STEP AT A TIME
 * (current + a dim "next" preview) image-first — the buildings/units to make as
 * thumbnails with a single key instruction — instead of dumping the whole list
 * as prose. The build clock auto-advances the step (works in custom games too).
 */
export function BuildOrderWidget({
  bo,
  stepIndex,
  elapsedSec,
  auto,
  fontSize = 14,
  iconSize = 30,
  viewMode = 'illustrated',
  showNext = true,
  showResources = true,
  showNotes = true,
  showResponsePlan = true,
  showTitle = true,
  noBuildCiv,
  opponentCivs = [],
}: {
  bo: BuildOrder
  stepIndex: number
  elapsedSec: number | null
  auto: boolean
  /** Base text size for the widget, controlled from overlay settings. */
  fontSize?: number
  /** Main unit/building thumbnail size, controlled from overlay settings. */
  iconSize?: number
  /** Rich icon view or compact plain-text view compatible with classic RTS overlays. */
  viewMode?: 'illustrated' | 'text'
  /** Keep the dim next-step preview below the active step. */
  showNext?: boolean
  /** Show resource/villager requirements in the active step. */
  showResources?: boolean
  /** Show the active step's instruction text. */
  showNotes?: boolean
  /** Show the contextual counter/scouting response plan. */
  showResponsePlan?: boolean
  /** Keep the build name/header line visible. */
  showTitle?: boolean
  /** Player's civ name when no bundled build matches it — the shown build is a reference. */
  noBuildCiv?: string | null
  /** Known lobby civilizations only; null entries preserve honest team coverage. */
  opponentCivs?: (string | null | undefined)[]
}) {
  const { tt, gameName } = useI18n()
  const step = bo.build_order[stepIndex]
  const next = bo.build_order[stepIndex + 1]
  const r = step?.resources
  const targets = extractBuildTargets(step?.notes)
  const nextTargets = extractBuildTargets(next?.notes, 3)
  const responsePlan = liveBuildForkPlan({ reference: bo, opponentCivs })

  return (
    <div
      className="flex h-full flex-col justify-center px-2.5 py-1 text-white"
      style={{ fontSize }}
    >
      {/* header */}
      {showTitle && (
        <div className="flex items-center gap-2 text-[11px] text-white/55">
          <span className="max-w-[180px] truncate font-medium text-white/80">{bo.name}</span>
          {elapsedSec != null && (
            <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 font-mono text-cyan-300">
              {formatDuration(elapsedSec)}
            </span>
          )}
          {step && AGE_ROMAN[step.age] && (
            <span className="flex items-center gap-0.5 rounded bg-white/10 px-1 text-[10px]">
              {AGE_ICON[step.age] && (
                <img
                  src={AGE_ICON[step.age] ?? undefined}
                  alt=""
                  aria-hidden="true"
                  className="h-3.5 w-3.5 object-contain"
                />
              )}
              {AGE_ROMAN[step.age]}
            </span>
          )}
          <span className="ml-auto tabular-nums">
            {stepIndex + 1}/{bo.build_order.length}
          </span>
          <span className="rounded bg-white/10 px-1 text-[9px] uppercase tracking-wide text-white/45">
            {viewMode === 'text' ? 'TXT' : 'ICON'}
          </span>
          <span className={auto ? 'text-win' : 'text-warn'}>{auto ? tt('auto') : tt('manual')}</span>
        </div>
      )}

      {noBuildCiv && (
        <div className="mt-0.5 inline-block w-fit rounded bg-warn/10 px-1.5 py-0.5 text-[10px] text-warn/90">
          {tt('reference build — no bundled build for')} {gameName(noBuildCiv)}
        </div>
      )}

      {step && (
        <div className="mt-0.5 rounded-md bg-[#0b1530] px-2 py-1 ring-1 ring-cyan-500/25">
          {/* hero: what to build (images) + villager split */}
          <div className="flex items-center gap-2">
            {viewMode === 'illustrated' && targets.length > 0 && (
              <div className="flex items-center gap-1.5">
                {targets.map((t) => (
                  <BuildIcon key={t.url} target={t} size={iconSize} />
                ))}
              </div>
            )}
            {showNotes && viewMode === 'text' && (
              <div className="min-w-0 flex-1 text-sm font-medium leading-snug text-white/90">
                {plainNote(step.notes[0]) || tt('No instruction for this step')}
              </div>
            )}
            {showResources && (
              <div className="ml-auto flex items-center gap-2 text-[12px] tabular-nums text-white/85">
                <Res glyph={RES_GLYPH.food} icon={RES_ICON.food} value={r?.food} />
                <Res glyph={RES_GLYPH.wood} icon={RES_ICON.wood} value={r?.wood} />
                <Res glyph={RES_GLYPH.gold} icon={RES_ICON.gold} value={r?.gold} />
                <Res glyph={RES_GLYPH.stone} icon={RES_ICON.stone} value={r?.stone} />
                <Res
                  glyph={RES_GLYPH.villager}
                  icon={RES_ICON.villager}
                  value={step.villager_count}
                />
                {step.time && (
                  <span className="whitespace-nowrap text-white/45">
                    {TIME_GLYPH} {step.time}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* the single key instruction for this step */}
          {showNotes && viewMode === 'illustrated' && step.notes[0] && (
            <div className="mt-1 flex items-center gap-[5px] text-sm font-medium leading-snug">
              {renderNote(step.notes[0])}
            </div>
          )}
        </div>
      )}

      {/* dim "next" preview — keeps you one step ahead without the full list */}
      {showNext && next && (
        <div className="mt-1 flex items-center gap-1.5 px-1 text-[11px] text-white/45">
          <span className="uppercase tracking-wide">{tt('next')}</span>
          {viewMode === 'illustrated' && nextTargets.length > 0 ? (
            nextTargets.map((t) => (
              <BuildIcon key={t.url} target={t} size={Math.max(14, Math.round(iconSize * 0.6))} />
            ))
          ) : (
            <span className="truncate">{firstClause(next.notes[0])}</span>
          )}
        </div>
      )}

      {showResponsePlan && (responsePlan.forks.length > 0 || responsePlan.coverageNote) && (
        <div className="mt-1 border-t border-white/10 px-1 pt-1">
          <div className="text-[9px] font-semibold uppercase tracking-wider text-cyan-300/70">
            {tt('Response forks · scout first')}
          </div>
          <div className="mt-0.5 space-y-0.5 text-[10px] leading-tight text-white/65">
            {responsePlan.forks.map((fork) => (
              <p key={`${fork.source}-${fork.condition}`}>
                <span className="font-semibold text-white/85">{fork.condition}</span> {fork.advice}
              </p>
            ))}
            {responsePlan.coverageNote && (
              <p className="text-white/40">{responsePlan.coverageNote}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
