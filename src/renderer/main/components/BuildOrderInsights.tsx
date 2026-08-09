import { useMemo, type ReactNode } from 'react'
import type { BuildAgeTiming, BuildOrder } from '@domain/buildOrderSchema'
import {
  BUILD_ECONOMY_RESOURCES,
  buildEconomyMax,
  buildEconomyPoints,
  deriveBuildOrderInsights,
  type BuildEconomyResource,
} from '@domain/buildOrderInsights'
import { formatDuration } from '@domain/format'
import { useI18n } from '../../i18n'

const AGE_NAMES: Record<number, string> = {
  1: 'Dark Age',
  2: 'Feudal Age',
  3: 'Castle Age',
  4: 'Imperial Age',
}

const AGE_COLORS: Record<number, string> = {
  1: 'rgb(120 113 108)',
  2: 'rgb(202 160 92)',
  3: 'rgb(96 165 250)',
  4: 'rgb(192 132 252)',
}

const RESOURCE_COLORS: Record<BuildEconomyResource, string> = {
  food: 'rgb(239 68 68)',
  wood: 'rgb(74 222 128)',
  gold: 'rgb(250 204 21)',
  stone: 'rgb(148 163 184)',
  builder: 'rgb(251 146 60)',
}

const RESOURCE_LABELS: Record<BuildEconomyResource, string> = {
  food: 'Food',
  wood: 'Wood',
  gold: 'Gold',
  stone: 'Stone',
  builder: 'Builders',
}

interface AgeSpan {
  age: number
  from: number
  to: number
}

function ageSpans(timings: BuildAgeTiming[], durationSec: number): AgeSpan[] {
  const ordered = [...timings].sort((a, b) => a.seconds - b.seconds || a.age - b.age)
  const spans: AgeSpan[] = []
  let from = 0
  let age = 1
  for (const timing of ordered) {
    const to = Math.max(from, Math.min(durationSec, timing.seconds))
    if (to > from) spans.push({ age, from, to })
    from = to
    age = timing.age
  }
  if (from < durationSec) spans.push({ age, from, to: durationSec })
  return spans
}

export function BuildOrderInsights({ bo }: { bo: BuildOrder }) {
  const { tt } = useI18n()
  const insights = useMemo(() => deriveBuildOrderInsights(bo), [bo])
  const scaleSeconds = Math.max(
    1,
    insights.durationSec ?? 0,
    ...insights.ageTimings.map((timing) => timing.seconds),
    ...insights.economy.map((point) => point.seconds),
  )
  const spans = ageSpans(insights.ageTimings, scaleSeconds)
  const maxEconomy = buildEconomyMax(insights.economy)
  const hasMetadata = Boolean(
    bo.description ||
      bo.season != null ||
      bo.map ||
      bo.strategy ||
      bo.score != null ||
      bo.views != null ||
      bo.likes != null,
  )

  if (!hasMetadata && spans.length === 0 && insights.economy.length < 2) return null

  return (
    <section className="border-b border-border bg-primary/[0.025] px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-medium uppercase tracking-wider text-primary">
          {tt('Build insights')}
        </h3>
        <span className="text-[11px] text-muted-foreground">
          {tt('AoE4Guides-compatible metadata and derived timeline')}
        </span>
      </div>

      {hasMetadata && (
        <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
          {bo.season != null && <Badge>{tt('Season')} {bo.season}</Badge>}
          {bo.map && <Badge>{tt('Map')}: {bo.map}</Badge>}
          {bo.strategy && <Badge>{tt('Strategy')}: {bo.strategy}</Badge>}
          {bo.score != null && <Badge>{tt('Community score')}: {bo.score}</Badge>}
          {bo.views != null && <Badge>{tt('Views')}: {bo.views.toLocaleString()}</Badge>}
          {bo.likes != null && <Badge>{tt('Likes')}: {bo.likes.toLocaleString()}</Badge>}
        </div>
      )}

      {bo.description && (
        <details className="mt-2 rounded-md border border-border/70 bg-background/30 px-3 py-2">
          <summary className="cursor-pointer text-xs font-medium text-primary">
            {tt('Author notes')}
          </summary>
          <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
            {bo.description}
          </p>
        </details>
      )}

      {spans.length > 0 && (
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{tt('Age timings')}</span>
            <span>{formatDuration(scaleSeconds)}</span>
          </div>
          <div className="relative h-3 overflow-hidden rounded-full border border-border/70 bg-secondary/50">
            {spans.map((span) => (
              <span
                key={`${span.age}-${span.from}`}
                className="absolute inset-y-0"
                style={{
                  left: `${(span.from / scaleSeconds) * 100}%`,
                  width: `${((span.to - span.from) / scaleSeconds) * 100}%`,
                  backgroundColor: AGE_COLORS[span.age] ?? AGE_COLORS[1],
                  opacity: 0.72,
                }}
              />
            ))}
            {insights.ageTimings.map((timing) => (
              <span
                key={`marker-${timing.age}`}
                className="absolute inset-y-[-2px] w-px bg-foreground/80"
                style={{ left: `${(timing.seconds / scaleSeconds) * 100}%` }}
                title={`${tt(AGE_NAMES[timing.age] ?? `Age ${timing.age}`)} · ${timing.derived ? '~' : ''}${formatDuration(timing.seconds)}`}
              />
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
            {insights.ageTimings.map((timing) => (
              <span key={`label-${timing.age}`} className="text-muted-foreground">
                <span style={{ color: AGE_COLORS[timing.age] ?? AGE_COLORS[1] }}>●</span>{' '}
                {tt(AGE_NAMES[timing.age] ?? `Age ${timing.age}`)}{' '}
                {timing.derived ? '~' : ''}{formatDuration(timing.seconds)}
              </span>
            ))}
          </div>
        </div>
      )}

      {insights.economy.length >= 2 && (
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{tt('Economy profile')}</span>
            <span>{insights.economy.length} {tt('checkpoints')}</span>
          </div>
          <svg
            viewBox="0 0 100 36"
            preserveAspectRatio="none"
            role="img"
            aria-label={tt('Villagers per resource over the build timeline')}
            className="h-20 w-full rounded-md border border-border/70 bg-background/30"
          >
            {BUILD_ECONOMY_RESOURCES.map((resource) => (
              <polyline
                key={resource}
                fill="none"
                stroke={RESOURCE_COLORS[resource]}
                strokeWidth="0.9"
                strokeLinejoin="round"
                strokeLinecap="round"
                points={buildEconomyPoints(insights.economy, resource, scaleSeconds, maxEconomy)}
              />
            ))}
          </svg>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            {BUILD_ECONOMY_RESOURCES.map((resource) => (
              <span key={resource}>
                <span style={{ color: RESOURCE_COLORS[resource] }}>●</span>{' '}
                {tt(RESOURCE_LABELS[resource])}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

function Badge({ children }: { children: ReactNode }) {
  return <span className="rounded border border-border/70 bg-background/35 px-2 py-1 text-muted-foreground">{children}</span>
}
