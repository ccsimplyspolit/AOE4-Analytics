import { useEffect, useState, useRef } from 'react'
import { Users, Hammer } from 'lucide-react'
import type { BuildStep } from '@domain/buildOrderSchema'
import { RES_ICON, RES_GLYPH } from './resourceGlyphs'
import { useI18n } from '../i18n'
import { cn } from '@shared/lib/utils'

export function EcoSplitWidget({
  step,
  stepIndex,
  totalSteps,
  placement = false,
  miniHud = false,
}: {
  step: BuildStep | null
  stepIndex: number
  totalSteps: number
  placement?: boolean
  miniHud?: boolean
}) {
  const { tt } = useI18n()
  const [flash, setFlash] = useState(false)
  const lastIndex = useRef(stepIndex)

  // Flash highlight on step index advance
  useEffect(() => {
    if (stepIndex !== lastIndex.current) {
      lastIndex.current = stepIndex
      setFlash(true)
      const timer = setTimeout(() => setFlash(false), 1400)
      return () => clearTimeout(timer)
    }
  }, [stepIndex])

  const r = step?.resources ?? (placement ? { food: 8, wood: 3, gold: 4, stone: 0, builder: 1 } : null)
  const villCount = step?.villager_count ?? (placement ? 16 : 0)

  if (!r && !placement) return null

  return (
    <div
      className={cn(
        'select-none rounded-lg font-sans text-white shadow-xl transition-all duration-300 ring-1',
        flash
          ? 'bg-amber-950/90 ring-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.5)] scale-[1.03]'
          : 'bg-[#091122]/90 ring-cyan-500/30',
        miniHud ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-sm',
      )}
      style={{ textShadow: '0 1px 3px rgba(0,0,0,0.95)' }}
    >
      <div className="flex items-center gap-3">
        {/* Header / Step Tracker */}
        <div className="flex items-center gap-1.5 border-r border-white/15 pr-2.5 font-mono text-[11px] text-cyan-300">
          <span className="font-semibold">{tt('Eco Split')}</span>
          {totalSteps > 0 && (
            <span className="text-white/45 text-[10px]">
              {stepIndex + 1}/{totalSteps}
            </span>
          )}
        </div>

        {/* Resources Grid */}
        <div className="flex items-center gap-2.5 tabular-nums font-semibold">
          {/* Food */}
          <div className="flex items-center gap-1 text-amber-200">
            {RES_ICON.food ? (
              <img src={RES_ICON.food} alt="" className="h-3.5 w-3.5 object-contain" />
            ) : (
              <span>{RES_GLYPH.food}</span>
            )}
            <span>{r?.food ?? 0}</span>
          </div>

          {/* Wood */}
          <div className="flex items-center gap-1 text-emerald-300">
            {RES_ICON.wood ? (
              <img src={RES_ICON.wood} alt="" className="h-3.5 w-3.5 object-contain" />
            ) : (
              <span>{RES_GLYPH.wood}</span>
            )}
            <span>{r?.wood ?? 0}</span>
          </div>

          {/* Gold */}
          <div className="flex items-center gap-1 text-yellow-300">
            {RES_ICON.gold ? (
              <img src={RES_ICON.gold} alt="" className="h-3.5 w-3.5 object-contain" />
            ) : (
              <span>{RES_GLYPH.gold}</span>
            )}
            <span>{r?.gold ?? 0}</span>
          </div>

          {/* Stone (only if > 0 or in standard layout) */}
          {(r?.stone ?? 0) > 0 && (
            <div className="flex items-center gap-1 text-stone-300">
              {RES_ICON.stone ? (
                <img src={RES_ICON.stone} alt="" className="h-3.5 w-3.5 object-contain" />
              ) : (
                <span>{RES_GLYPH.stone}</span>
              )}
              <span>{r?.stone ?? 0}</span>
            </div>
          )}

          {/* Builder */}
          {r?.builder != null && r.builder > 0 && (
            <div className="flex items-center gap-1 text-orange-300 border-l border-white/15 pl-1.5">
              <Hammer className="h-3.5 w-3.5" />
              <span>{r.builder}</span>
            </div>
          )}

          {/* Total Villagers */}
          {villCount > 0 && (
            <div className="flex items-center gap-1 text-white/70 border-l border-white/15 pl-2 font-mono text-[11px]">
              <Users className="h-3.5 w-3.5 text-primary" />
              <span>{villCount}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
