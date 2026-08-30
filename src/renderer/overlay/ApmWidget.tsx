import { cn } from '@shared/lib/utils'
import { panelBg } from './panelBg'

/**
 * The live APM counter card. Positioning is handled by OverlayApp's placement
 * wrapper so placement mode can move it independently.
 */
export function ApmWidget({ apm, compact = false }: { apm: number; compact?: boolean }) {
  return (
    <div className="pointer-events-none select-none" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>
      <div
        className={cn('overlay-panel flex items-baseline gap-1', compact ? 'px-1.5 py-0.5' : 'px-2 py-1')}
        style={{ background: panelBg(compact ? 0.5 : 0.7) }}
      >
        <span className={cn('font-semibold tabular-nums text-white', compact ? 'text-base' : 'text-xl')}>
          {apm}
        </span>
        <span className="text-[9px] uppercase tracking-wide text-white/50">APM</span>
      </div>
    </div>
  )
}
