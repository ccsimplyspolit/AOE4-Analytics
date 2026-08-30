import { useEffect, useMemo, useRef } from 'react'
import { Bell, Eye, Landmark as LandmarkIcon, Users, Compass, ShieldAlert, Sparkles } from 'lucide-react'
import { BUNDLED_BUILD_ORDERS } from '@data/buildOrders'
import { buildIndexForCiv, type BuildOrder } from '@domain/buildOrderSchema'
import { getOpeningProTips } from '@domain/proTips'
import {
  type MacroCheckpoint,
  resolveActiveCheckpoints,
  getUpcomingCheckpoint,
} from '@domain/macroCheckpoints'
import { playAudioCue } from '@domain/overlayAudio'
import { cn } from '@shared/lib/utils'
import { useI18n } from '../i18n'
import { localizeOverlayCopy } from '../localizeOverlayCopy'

export function CoachWidget({
  elapsedSec,
  civ,
  activeBuild,
  timingCheckpoints = true,
  audioCues = true,
  audioCueVolume = 0.3,
  miniHud = false,
  placement,
}: {
  /** Match time in seconds (log clock preferred, wall-clock fallback). */
  elapsedSec: number | null
  /** Your live civ slug, to pick the bundled build if no active build is pinned. */
  civ: string | null
  /** Pinned or active build order object. */
  activeBuild?: BuildOrder | null
  /** Whether macro match checkpoints are enabled. */
  timingCheckpoints?: boolean
  /** Whether audio cues are enabled. */
  audioCues?: boolean
  /** Volume for audio cues [0, 1]. */
  audioCueVolume?: number
  /** Ultra-compact mini-HUD mode. */
  miniHud?: boolean
  /** Placement mode renders a static preview. */
  placement?: boolean
}) {
  const { tt, locale, gameName } = useI18n()
  const ox = (value: string) => {
    if (locale !== 'ru') return tt(value)
    const via = tt(value)
    if (via !== value) return via
    return localizeOverlayCopy(value, { gameName, terms: true })
  }
  const soundPlayedRef = useRef<Set<string>>(new Set())

  // Reset played sounds when match restarts
  useEffect(() => {
    if (elapsedSec == null || elapsedSec < 10) {
      soundPlayedRef.current.clear()
    }
  }, [elapsedSec])

  const bo = useMemo<BuildOrder | null>(() => {
    if (activeBuild) return activeBuild
    const idx = buildIndexForCiv(BUNDLED_BUILD_ORDERS, civ)
    return idx != null ? BUNDLED_BUILD_ORDERS[idx] ?? null : null
  }, [activeBuild, civ])

  const allCheckpoints = useMemo<MacroCheckpoint[]>(() => {
    return resolveActiveCheckpoints(bo, timingCheckpoints, civ)
  }, [bo, timingCheckpoints, civ])

  // Placement mode preview
  if (placement) {
    return (
      <Shell miniHud={miniHud}>
        <Chip
          icon={<Eye className="h-3.5 w-3.5" />}
          title={`${ox('Scout Enemy Gold & Wood')} — 2:30`}
          urgent
          miniHud={miniHud}
        >
          {ox('Check opponent gold mining: Fast Castle, 2TC or Feudal aggression')}
        </Chip>
        <Chip
          icon={<LandmarkIcon className="h-3.5 w-3.5" />}
          title={`${ox('Feudal Transition Check')} — 4:15`}
          miniHud={miniHud}
        >
          {ox('Landmark should begin or finish; scout military production buildings')}
        </Chip>
      </Shell>
    )
  }

  if (elapsedSec == null) return null

  const openingTip =
    elapsedSec < 300 && civ
      ? getOpeningProTips(civ, 1)[0]
      : null

  const upcoming = getUpcomingCheckpoint(allCheckpoints, elapsedSec, 90)
  if (!upcoming && !openingTip) return null

  const checkpoint = upcoming?.checkpoint
  const remainingSec = upcoming?.remainingSec ?? 0
  const isUrgent = remainingSec <= 15

  // Trigger audio cue when 10 seconds remain
  if (
    upcoming &&
    audioCues &&
    isUrgent &&
    remainingSec <= 10 &&
    !soundPlayedRef.current.has(checkpoint!.id)
  ) {
    soundPlayedRef.current.add(checkpoint!.id)
    playAudioCue(audioCueVolume, checkpoint!.priority === 'high' ? 'urgent' : 'checkpoint')
  }

  const getCategoryIcon = (category: MacroCheckpoint['category']) => {
    switch (category) {
      case 'scouting':
        return <Eye className="h-3.5 w-3.5" />
      case 'age':
        return <LandmarkIcon className="h-3.5 w-3.5" />
      case 'map_control':
        return <Compass className="h-3.5 w-3.5" />
      case 'economy':
        return <Users className="h-3.5 w-3.5" />
      case 'army':
        return <ShieldAlert className="h-3.5 w-3.5" />
      default:
        return <Sparkles className="h-3.5 w-3.5" />
    }
  }

  return (
    <Shell miniHud={miniHud}>
      {openingTip && (
        <Chip icon={<Sparkles className="h-3.5 w-3.5" />} title={`${tt('Opening')} — ${openingTip.timeFormatted}`} miniHud={miniHud}>
          {locale === 'ru' ? openingTip.shortTextRu : openingTip.shortText}
        </Chip>
      )}
      {upcoming && checkpoint && (
      <Chip
        icon={getCategoryIcon(checkpoint.category)}
        title={`${ox(checkpoint.title)} — ${formatSec(checkpoint.timeSec)}`}
        urgent={isUrgent}
        miniHud={miniHud}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="truncate">{ox(checkpoint.detail)}</span>
          <span className="shrink-0 font-mono font-bold text-amber-300">
            {countdown(remainingSec, tt)}
          </span>
        </div>
      </Chip>
      )}
    </Shell>
  )
}

function Shell({ children, miniHud }: { children: React.ReactNode; miniHud?: boolean }) {
  const { tt } = useI18n()
  return (
    <div
      className={cn('flex select-none flex-col gap-1.5 font-sans', miniHud ? 'w-56' : 'w-72')}
      style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}
    >
      {miniHud ? null : (
        <span className="flex items-center gap-1 font-display text-[9px] font-bold uppercase tracking-[0.2em] text-white/55">
          <Bell className="h-3 w-3" /> {tt('Macro Coach')}
        </span>
      )}
      {children}
    </div>
  )
}

function Chip({
  icon,
  title,
  children,
  urgent,
  miniHud,
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
  urgent?: boolean
  miniHud?: boolean
}) {
  return (
    <div
      className={cn(
        'overlay-panel bg-[#0a0e1a]/80',
        urgent ? 'border-l-2 border-amber-400' : '',
        miniHud ? 'px-2 py-1 text-[11px]' : 'px-2.5 py-1.5 text-xs',
      )}
    >
      <div className="flex items-center gap-1.5 font-bold text-white">
        <span className={urgent ? 'text-amber-300' : 'text-white/70'}>{icon}</span>
        <span className="truncate">{title}</span>
      </div>
      <div className="mt-0.5 text-white/80">{children}</div>
    </div>
  )
}

function formatSec(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function countdown(sec: number, tt: (value: string) => string): string {
  if (sec <= 0) return tt('now')
  const s = Math.round(sec)
  return `${tt('in')} ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
