import type { SessionSummary } from '@domain/session'
import { cn } from '@shared/lib/utils'
import { panelBg } from './panelBg'
import { useI18n } from '../i18n'

/**
 * Today's ladder session at a glance — "TODAY 3W–1L +42" — so a losing streak
 * (or a good stopping point) is visible without leaving the game. Rendered
 * only when there is at least one finished game today; the MMR figure is
 * omitted when no game carried a rating change (custom/vs-AI only sessions).
 */
export function SessionWidget({
  session,
  compact = false,
}: {
  session: SessionSummary
  compact?: boolean
}) {
  const { tt } = useI18n()
  const delta = session.ratingDelta
  return (
    <div
      className={cn(
        'overlay-panel pointer-events-none flex select-none items-center gap-1.5 font-sans text-white',
        compact ? 'px-1.5 py-0.5' : 'px-2 py-1',
      )}
      style={{ background: panelBg(compact ? 0.5 : 0.7), textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}
    >
      {!compact && (
        <span className="text-[9px] font-medium uppercase tracking-wider text-white/45">{tt('Today')}</span>
      )}
      <span className="text-[13px] font-semibold tabular-nums leading-none">
        <span className="text-win">{session.wins}W</span>
        <span className="text-white/45"> – </span>
        <span className="text-loss">{session.losses}L</span>
      </span>
      {delta != null && (
        <span
          className={cn(
            'text-[13px] font-bold tabular-nums leading-none',
            delta >= 0 ? 'text-win' : 'text-loss',
          )}
        >
          {delta >= 0 ? `+${delta}` : delta}
        </span>
      )}
    </div>
  )
}
