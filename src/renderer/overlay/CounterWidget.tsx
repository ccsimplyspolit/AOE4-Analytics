import { civDisplayName } from '@domain/civ'
import type { CivCounterPlan } from '@domain/civUnits'
import { cn } from '@shared/lib/utils'
import { useI18n } from '../i18n'

/**
 * Compact "how to beat this civ" cell: opponent civ and what to build.
 * Auto-targets a known ranked opponent; Ctrl+Alt+C cycles civs in custom/AI games.
 */
export function CounterWidget({
  plan,
  manual,
  matchupWinRate,
  myCivName,
  compact = false,
}: {
  plan: CivCounterPlan
  manual: boolean
  matchupWinRate?: number | null
  myCivName?: string | null
  compact?: boolean
}) {
  const { tt, gameName } = useI18n()
  return (
    <div className={cn('flex h-full flex-col justify-center text-[11px]', compact ? 'px-2 py-1' : 'px-3 py-2')}>
      <div className="flex items-center justify-between text-white/60">
        <span className="font-medium text-white/80">
          {tt('Counter')} {gameName(civDisplayName(plan.civSlug))}
        </span>
        {!compact && (
          <span className={manual ? 'text-warn' : 'text-win'}>
            {manual ? 'Ctrl+Alt+C' : tt('opp')}
          </span>
        )}
      </div>

      {!compact && matchupWinRate != null && myCivName && (
        <div className="mt-0.5 text-white/55">
          {myCivName} {tt('vs')} {gameName(civDisplayName(plan.civSlug))}:{' '}
          <span
            className={
              matchupWinRate >= 50 ? 'font-semibold text-win' : 'font-semibold text-loss'
            }
          >
            {Math.round(matchupWinRate)}%
          </span>
        </div>
      )}

      <div className="mt-0.5 leading-snug text-white/80">
        <span className="font-medium text-white/90">
          {plan.counters.map((c) => gameName(c.label)).join(' · ') || '—'}
        </span>
      </div>
    </div>
  )
}
