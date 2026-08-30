import { useMemo, useState, type JSX } from 'react'
import { ChevronDown } from 'lucide-react'
import { getMapStrategyAdvice } from '@domain/rankedMapAdvisor'
import { cn } from '@shared/lib/utils'
import { useI18n } from '../../i18n'
import { useSectionFold } from '../hooks/useSectionFold'

interface MapPoolAdvisorCardProps {
  currentMap?: string | null
  maps?: string[]
  /** Dashboard stacks this under other coaching; Explorer keeps it open. */
  foldedByDefault?: boolean
  foldId?: string
}

const DEFAULT_MAP_POOL = [
  'Ancient Spires',
  'Dry Arabia',
  'Flankwoods',
  'Golden Heights',
  'Gorge',
  'Hidden Valley',
  'Ocean Gateway',
  'Relic River',
  'West Lake',
]

export function MapPoolAdvisorCard({
  currentMap,
  maps = DEFAULT_MAP_POOL,
  foldedByDefault = false,
  foldId = 'map-pool-advisor',
}: MapPoolAdvisorCardProps): JSX.Element {
  const { tt, gameName } = useI18n()
  const [selectedMap, setSelectedMap] = useState<string>(currentMap || maps[0] || 'Nagari')
  const advice = useMemo(() => getMapStrategyAdvice(selectedMap), [selectedMap])
  const { collapsed, toggle } = useSectionFold(foldId, foldedByDefault)

  return (
    <div className="rounded-xl border border-border/50 bg-card/60 p-4 backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-3">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={!collapsed}
          className="flex min-w-0 items-center gap-2 text-left"
        >
          <span className="text-xl">🗺️</span>
          <div>
            <h3 className="flex items-center gap-1.5 text-sm font-semibold tracking-wide text-foreground">
              {tt('Ranked map pool advisor')}
              <ChevronDown
                className={cn(
                  'h-3.5 w-3.5 text-muted-foreground transition-transform',
                  collapsed && '-rotate-90',
                )}
              />
            </h3>
            <p className="text-xs text-muted-foreground">
              {tt('Best civilizations, counter-picks, and a win plan for each map in the season pool')}
            </p>
          </div>
        </button>

        {collapsed ? (
          <span className="text-xs text-muted-foreground">{gameName(selectedMap)}</span>
        ) : (
          <select
            value={selectedMap}
            onChange={(e) => setSelectedMap(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {maps.map((m) => (
              <option key={m} value={m}>
                {gameName(m)}
              </option>
            ))}
          </select>
        )}
      </div>

      {collapsed ? null : (
      <div className="mt-4 space-y-4">
        <div className="rounded-lg border border-border/30 bg-muted/20 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-primary">{gameName(advice.mapName)}</span>
            <span className="rounded bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
              {tt(advice.archetypeLabel)}
            </span>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">{tt(advice.description)}</p>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {tt('Top civilizations on this map')}
          </div>
          <div className="mt-2 grid gap-2.5 sm:grid-cols-3">
            {advice.topCivilizations.map((civ) => (
              <div
                key={civ.civ}
                className="rounded-lg border border-border/40 bg-card/80 p-2.5 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">{gameName(civ.civName)}</span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-extrabold ${
                      civ.tier === 'S'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-blue-500/20 text-blue-300'
                    }`}
                  >
                    {civ.tier} ({civ.winRate}%)
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">{tt(civ.keyAdvantage)}</div>
              </div>
            ))}
          </div>
        </div>

        {advice.counterMatchups.length > 0 && (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs">
            <div className="font-semibold text-amber-300">{tt('Counter-picks and tactical tips')}</div>
            <div className="mt-1.5 space-y-1.5">
              {advice.counterMatchups.map((cm, idx) => (
                <div key={idx} className="text-amber-200">
                  {tt('{dominant} is vulnerable to {answer}: {tip}')
                    .replace('{dominant}', gameName(cm.dominantCiv))
                    .replace('{answer}', gameName(cm.vulnerableTo))
                    .replace('{tip}', tt(cm.tacticalTip))}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{tt('Recommended builds')}</span>
          {advice.recommendedBuildStyles.map((style, idx) => (
            <span
              key={idx}
              className="rounded-md border border-border/50 bg-muted/40 px-2 py-0.5 text-[11px] text-foreground"
            >
              {tt(style)}
            </span>
          ))}
        </div>
      </div>
      )}
    </div>
  )
}
