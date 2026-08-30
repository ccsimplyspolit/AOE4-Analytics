import { type ReactNode } from 'react'
import { Activity, Clock3, Database, Gauge, Radio, Users } from 'lucide-react'
import { gameElapsedSec, todMsFromEpoch } from '@domain/localStats'
import { formatDurationShort } from '@shared/format'
import { useLiveTelemetry } from '../queries/useLiveMatch'
import { useI18n } from '../../i18n'

/** Main-window live telemetry: the same clock/APM stream that powers the overlay. */
export function LiveTelemetryCard() {
  const { tt, gameName } = useI18n()
  const { data: live, clock, apm } = useLiveTelemetry()

  if (!live?.isLive) return null

  const elapsed = clock ? gameElapsedSec(clock, todMsFromEpoch(Date.now())) : null
  const source = live.source === 'ongoing' ? tt('AoE4World live roster') : tt('local AoE4 log')
  const rosterSize = live.teams?.reduce((total, team) => total + team.length, 0) ?? 0

  return (
    <section className="rounded-lg border border-primary/30 bg-card/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
          <Radio className="h-3.5 w-3.5 animate-pulse" />
          {tt('Live data & stats')}
        </div>
        <span className="text-[11px] text-muted-foreground">
          {source} · {tt('polling every 8s')}
        </span>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-4">
        <TelemetryStat
          icon={<Clock3 className="h-4 w-4" />}
          label={tt('Game clock')}
          value={elapsed == null ? '—' : formatDurationShort(elapsed)}
        />
        <TelemetryStat
          icon={<Gauge className="h-4 w-4" />}
          label={tt('Live APM')}
          value={apm == null ? '—' : String(apm)}
        />
        <TelemetryStat
          icon={<Users className="h-4 w-4" />}
          label={tt('Players detected')}
          value={rosterSize > 0 ? String(rosterSize) : '—'}
        />
        <TelemetryStat
          icon={<Database className="h-4 w-4" />}
          label={tt('Map / patch')}
          value={
            [live.map ? gameName(live.map) : null, live.patch ? `P${live.patch}` : null]
              .filter(Boolean)
              .join(' · ') || '—'
          }
        />
      </div>

      <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
        <Activity className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
        {tt(
          'Live clock, roster and APM are available during the match. Population, resources and final combat counters appear after the game when AoE4 writes the local result or Relic summary.',
        )}
      </p>
    </section>
  )
}

function TelemetryStat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/70 bg-background/30 px-3 py-2">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
    </div>
  )
}
