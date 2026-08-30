// Re-activated (2026-07-07): mounted by OverlayApp as a placeable widget, driven
// by the live game clock + the pace brackets for the player's rank.
import type { Benchmarks, Bracket } from '@domain/benchmarks'
import { cn } from '@shared/lib/utils'
import { useI18n } from '../i18n'

function mmss(sec: number): string {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
}

/**
 * Age-up pace targets as a compact horizontal cell for the overlay bar: target
 * Feudal/Castle/Imperial times for the player's rank, the next age highlighted.
 * Honest by design — AoE4's ToS rules out reading real age-ups, so these are
 * pace targets next to the match clock, never a live "you aged at X" reading.
 */
export function AgeTargetsWidget({
  benchmarks,
  bracket,
  elapsedSec,
  compact = false,
}: {
  benchmarks: Benchmarks
  bracket: Bracket
  elapsedSec: number | null
  compact?: boolean
}) {
  const { tt } = useI18n()
  const ages = [
    { name: tt('Feud'), sec: benchmarks.feudalSec },
    { name: tt('Cstl'), sec: benchmarks.castleSec },
    { name: tt('Imp'), sec: benchmarks.imperialSec },
  ]
  const nextIdx = elapsedSec == null ? -1 : ages.findIndex((a) => elapsedSec < a.sec)

  return (
    <div className={cn('flex h-full flex-col justify-center', compact ? 'px-2 py-1' : 'px-3 py-2')}>
      {!compact && (
        <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-wide text-white/40">
          <span>{tt('Age targets')} · {bracket}</span>
          {elapsedSec != null && (
            <span className="tabular-nums text-white/60">{mmss(elapsedSec)}</span>
          )}
        </div>
      )}
      <div className="flex gap-1">
        {ages.map((a, i) => {
          const passed = elapsedSec != null && elapsedSec >= a.sec
          const isNext = i === nextIdx
          return (
            <div
              key={a.name}
              className={cn(
                'flex-1 px-1 py-0.5 text-center',
                isNext ? 'text-white' : passed ? 'text-white/40' : 'text-white/70',
              )}
            >
              <div className="text-[9px] text-white/45">{a.name}</div>
              <div className="text-[11px] font-medium tabular-nums">{mmss(a.sec)}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
