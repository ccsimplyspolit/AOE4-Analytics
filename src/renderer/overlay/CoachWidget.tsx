import { useEffect, useMemo, useRef } from 'react'
import { Bell, Eye, Landmark as LandmarkIcon, Users, Compass, ShieldAlert, Sparkles } from 'lucide-react'
import { BUNDLED_BUILD_ORDERS } from '@data/buildOrders'
import { buildIndexForCiv, type BuildOrder } from '@domain/buildOrderSchema'
import {
  type MacroCheckpoint,
  resolveActiveCheckpoints,
  getUpcomingCheckpoint,
} from '@domain/macroCheckpoints'
import { playAudioCue } from '@domain/overlayAudio'
import { cn } from '@shared/lib/utils'
import { useI18n } from '../i18n'

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
  const { tt } = useI18n()
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
          title={`${tt('Scout Enemy Gold & Wood')} — 2:30`}
          urgent
          miniHud={miniHud}
        >
          {tt('Check opponent gold mining: Fast Castle, 2TC or Feudal aggression')}
        </Chip>
        <Chip
          icon={<LandmarkIcon className="h-3.5 w-3.5" />}
          title={`${tt('Feudal Transition Check')} — 4:15`}
          miniHud={miniHud}
        >
          {tt('Landmark should begin or finish; scout military production buildings')}
        </Chip>
      </Shell>
    )
  }

  if (elapsedSec == null) return null

  const upcoming = getUpcomingCheckpoint(allCheckpoints, elapsedSec, 90)
  if (!upcoming) return null

  const { checkpoint, remainingSec } = upcoming
  const isUrgent = remainingSec <= 15

  // Trigger audio cue when 10 seconds remain
  if (audioCues && isUrgent && remainingSec <= 10 && !soundPlayedRef.current.has(checkpoint.id)) {
    soundPlayedRef.current.add(checkpoint.id)
    playAudioCue(audioCueVolume, checkpoint.priority === 'high' ? 'urgent' : 'checkpoint')
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
      <Chip
        icon={getCategoryIcon(checkpoint.category)}
        title={`${tt(checkpoint.title)} — ${formatSec(checkpoint.timeSec)}`}
        urgent={isUrgent}
        miniHud={miniHud}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="truncate">{tt(checkpoint.detail)}</span>
          <span className="shrink-0 font-mono font-bold text-amber-300">
            {countdown(remainingSec, tt)}
          </span>
        </div>
      </Chip>
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
      <span className="flex items-center gap-1 font-display text-[9px] font-bold uppercase tracking-[0.2em] text-white/55">
        <Bell className="h-3 w-3" /> {tt('Macro Coach')}
      </span>
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
        'rounded-md bg-[#0a0e1a]/95 transition-all duration-300 ring-1',
        urgent ? 'rts-coach-pulse ring-amber-400/90 shadow-[0_0_15px_rgba(251,191,36,0.35)]' : 'ring-white/15 shadow-md',
        miniHud ? 'px-2 py-1 text-[11px]' : 'px-2.5 py-1.5 text-xs',
      )}
    >
      <div className="flex items-center gap-1.5 font-bold text-white">
        <span className={urgent ? 'text-amber-300' : 'text-cyan-400'}>{icon}</span>
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
