import React, { useMemo, useState } from 'react'
import { getMapStrategyAdvice } from '@domain/rankedMapAdvisor'

interface MapPoolAdvisorCardProps {
  currentMap?: string | null
  maps?: string[]
}

const DEFAULT_MAP_POOL = [
  'Nagari',
  'High View',
  'Highwoods',
  'Golden Heights',
  'Dry Arabia',
  'Cliffside',
  'Gorge',
  'Himeyama',
  'Forts',
]

export function MapPoolAdvisorCard({
  currentMap,
  maps = DEFAULT_MAP_POOL,
}: MapPoolAdvisorCardProps): React.JSX.Element {
  const [selectedMap, setSelectedMap] = useState<string>(currentMap || maps[0] || 'Nagari')
  const advice = useMemo(() => getMapStrategyAdvice(selectedMap), [selectedMap])

  return (
    <div className="rounded-xl border border-border/50 bg-card/60 p-4 backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">🗺️</span>
          <div>
            <h3 className="text-sm font-semibold tracking-wide text-foreground">
              Советник по пулу рейтинговых карт (Ranked Map Strategy Explorer)
            </h3>
            <p className="text-xs text-muted-foreground">
              Лучшие цивилизации, контр-пики и стратегия победы для каждой карты сезона
            </p>
          </div>
        </div>

        <select
          value={selectedMap}
          onChange={(e) => setSelectedMap(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {maps.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 space-y-4">
        {/* Map Type & Description */}
        <div className="rounded-lg border border-border/30 bg-muted/20 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-primary">{advice.mapName}</span>
            <span className="rounded bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
              {advice.archetypeLabel}
            </span>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">{advice.description}</p>
        </div>

        {/* Top Civilizations */}
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            🏆 Топ цивилизаций на карте:
          </div>
          <div className="mt-2 grid gap-2.5 sm:grid-cols-3">
            {advice.topCivilizations.map((civ) => (
              <div
                key={civ.civ}
                className="rounded-lg border border-border/40 bg-card/80 p-2.5 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">{civ.civName}</span>
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
                <div className="mt-1 text-[11px] text-muted-foreground">{civ.keyAdvantage}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Counter Matchups & Tips */}
        {advice.counterMatchups.length > 0 && (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs">
            <div className="font-semibold text-amber-300">🎯 Контр-пики и тактические советы:</div>
            <div className="mt-1.5 space-y-1.5">
              {advice.counterMatchups.map((cm, idx) => (
                <div key={idx} className="text-amber-200">
                  <span className="font-bold text-amber-100">{cm.dominantCiv}</span> уязвимы против{' '}
                  <span className="font-bold text-emerald-300">{cm.vulnerableTo}</span>: {cm.tacticalTip}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommended Build Styles */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Рекомендуемые билды:</span>
          {advice.recommendedBuildStyles.map((style, idx) => (
            <span
              key={idx}
              className="rounded-md border border-border/50 bg-muted/40 px-2 py-0.5 text-[11px] text-foreground"
            >
              ⚡ {style}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
