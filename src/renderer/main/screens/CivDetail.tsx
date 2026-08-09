import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Check,
  X,
  Eye,
  Swords,
  TrendingUp,
  TrendingDown,
  Map as MapIcon,
} from 'lucide-react'
import { CIV_PROFILES } from '@data/civProfiles'
import { unitsForCiv, type VendoredUnit } from '@data/gameData'
import { BUNDLED_BUILD_ORDERS } from '@data/buildOrders'
import type { BuildOrder } from '@domain/buildOrderSchema'
import { roleFromUnit, counterFor } from '@domain/counters'
import { resultFromPerPlayer } from '@domain/analysis'
import type { CivMatchup } from '@domain/civDetailStats'
import { computePlayerStats, type StatGame } from '@domain/playerStats'
import { civDisplayName } from '@domain/civ'
import { formatCount, formatDurationShort, formatPercent } from '@shared/format'
import { Badge } from '@shared/components/ui/badge'
import { Card, CardContent } from '@shared/components/ui/card'
import { BuildOrderViewer } from '../components/BuildOrderViewer'
import { StatTile } from '../components/StatTile'
import { WinRateBar } from '../components/WinRateBar'
import { TierBadge } from '../components/TierBadge'
import { useCivDetailStats } from '../queries/useCivDetailStats'
import { LandmarkPlan } from '../components/LandmarkPlan'
import { useHistory } from '../queries/useHistory'
import { useSettings } from '../queries/useProfile'
import { ErrorBox } from '../components/feedback'
import { useQuery } from '@tanstack/react-query'
import { ipc } from '@shared/ipc'
import { resolveAoE4Icon } from '@data/vendor/aoe4-icons/manifest'
import { useI18n } from '../../i18n'

const DIFFICULTY_VARIANT = {
  easy: 'success',
  medium: 'default',
  hard: 'destructive',
} as const

export function CivDetail() {
  const { slug = '' } = useParams()
  const { tt, gameName } = useI18n()
  const [visibleBuildCount, setVisibleBuildCount] = useState(6)
  const [loadHeavySections, setLoadHeavySections] = useState(false)
  const profile = CIV_PROFILES[slug]

  // Let the first paint settle before starting the public stats and landmark
  // queries. Deep-linking to a civ should never monopolise the renderer.
  useEffect(() => {
    setVisibleBuildCount(6)
    setLoadHeavySections(false)
    const timer = window.setTimeout(() => setLoadHeavySections(true), 250)
    return () => window.clearTimeout(timer)
  }, [slug])

  if (!profile) {
    return (
      <div className="animate-fade-in space-y-4">
        <BackLink />
        <p className="text-sm text-muted-foreground">
          {tt('Unknown civilization: {slug}').replace('{slug}', slug)}
        </p>
      </div>
    )
  }

  const builds = BUNDLED_BUILD_ORDERS.filter(
    (bo) => String(bo.civilization).toLowerCase() === profile.name.toLowerCase(),
  ) as unknown as BuildOrder[]
  const visibleBuilds = builds.slice(0, visibleBuildCount)
  const units = unitsForCiv(slug)
  const keyUnits = pickKeyUnits(units)

  return (
    <div className="animate-fade-in space-y-6">
      <BackLink />

      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{gameName(profile.name)}</h1>
          <Badge variant={DIFFICULTY_VARIANT[profile.difficulty]}>{tt(profile.difficulty)}</Badge>
        </div>
        <p className="text-sm text-primary">{profile.focus}</p>
        <p className="text-sm leading-relaxed text-muted-foreground">{profile.summary}</p>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {profile.tags.map((t) => (
            <span
              key={t}
              className="rounded bg-secondary px-2 py-0.5 text-xs text-muted-foreground"
            >
              {t}
            </span>
          ))}
        </div>
      </header>

      <CivMetaSection slug={slug} enabled={loadHeavySections} />

      <LandmarkPlan civ={slug} />

      <LandmarkStatsCard civ={slug} enabled={loadHeavySections} />

      <LandmarkRecordCard civ={slug} enabled={loadHeavySections} />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="space-y-2 p-4">
            <h3 className="text-sm font-semibold text-win">{tt('Strengths')}</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {profile.strengths.map((s, i) => (
                <li key={i} className="flex gap-2">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-win" />
                  {s}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-2 p-4">
            <h3 className="text-sm font-semibold text-destructive">{tt('Weaknesses')}</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {profile.weaknesses.map((s, i) => (
                <li key={i} className="flex gap-2">
                  <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
                  {s}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <InfoCard title={tt('Recommended opening')}>{profile.opening}</InfoCard>
        <InfoCard title={tt('Game plan')}>{profile.gamePlan}</InfoCard>
      </div>

      <Card>
        <CardContent className="space-y-2 p-4">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold">
            <Eye className="h-4 w-4 text-primary" />
            {tt('Facing {civ}? Watch for').replace('{civ}', gameName(profile.name))}
          </h3>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {profile.watchFor.map((w, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                {w}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {builds.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">{tt('Recommended build orders')}</h2>
          {visibleBuilds.map((bo, i) => (
            <BuildOrderViewer key={i} bo={bo} />
          ))}
          {builds.length > visibleBuilds.length && (
            <button
              type="button"
              onClick={() => setVisibleBuildCount((count) => Math.min(count + 6, builds.length))}
              className="w-full rounded-lg border border-border bg-card/60 px-4 py-3 text-sm text-primary transition-colors hover:bg-secondary"
            >
              {tt('Show more build orders')} ({visibleBuilds.length}/{builds.length})
            </button>
          )}
        </section>
      )}

      {keyUnits.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <Swords className="h-4 w-4" />
            {tt('Key units')}
          </h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {keyUnits.map((u) => (
              <UnitCard key={u.id} unit={u} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function BackLink() {
  const { tt } = useI18n()
  return (
    <Link
      to="/civ-meta"
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" /> {tt('Back to Civ Meta')}
    </Link>
  )
}

/** Live meta stats for the civ: global + your personal win rate, matchups, maps. */
function CivMetaSection({ slug, enabled }: { slug: string; enabled: boolean }) {
  const { tt, gameName } = useI18n()
  const { data, isLoading, refetch } = useCivDetailStats(slug, enabled)
  const { data: history } = useHistory()
  const { data: settings } = useSettings()
  const profileId = settings?.profileId ?? null

  const stats = data?.ok ? data.data : null

  // Your personal win rate with this civ, from synced history.
  const mine = useMemo(() => {
    const matches = history?.ok ? history.data : []
    const games: StatGame[] = matches.map((m) => ({
      result: m.result ?? resultFromPerPlayer(m.perPlayer, profileId),
      civ: m.civ,
      oppCiv: m.oppCiv,
      map: m.map,
      durationSec: m.durationSec,
      ratingDiff: m.ratingDiff,
      format: m.format,
      playedAt: m.playedAt,
    }))
    return computePlayerStats(games).byCiv.find((b) => b.key === slug) ?? null
  }, [history, slug, profileId])

  if (!enabled || isLoading) {
    return (
      <div className="h-24 animate-pulse rounded-lg border border-border bg-card/40" aria-hidden />
    )
  }

  if (data && !data.ok) {
    return <ErrorBox message={data.error.message} onRetry={() => refetch()} />
  }

  const hasMeta = stats != null && stats.winRate != null
  if (!hasMeta && !mine) return null

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          label={tt('Win rate (ranked)')}
          value={
            stats?.winRate != null ? (
              <span className="flex items-center gap-2">
                {formatPercent(stats.winRate)}
                {stats.tier && <TierBadge tier={stats.tier} />}
              </span>
            ) : (
              '—'
            )
          }
          sub={stats?.games ? `${formatCount(stats.games)} ${tt('games')}` : tt('no meta data')}
        />
        <StatTile
          label={tt('Pick rate')}
          value={stats?.pickRate != null ? `${stats.pickRate}%` : '—'}
        />
        <StatTile
          label={tt('Your win rate')}
          value={formatPercent(mine?.winRate)}
          sub={mine ? `${mine.games} ${tt('of your games')}` : tt('play it to track')}
        />
        <StatTile
          label={tt('Your record')}
          value={mine ? `${mine.wins}–${mine.losses}` : '—'}
          sub={mine ? tt('W–L with this civ') : undefined}
        />
      </div>

      {stats && (stats.best.length > 0 || stats.worst.length > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          <MatchupList
            title={tt('Best matchups')}
            icon={<TrendingUp className="h-4 w-4 text-win" />}
            rows={stats.best}
          />
          <MatchupList
            title={tt('Toughest matchups')}
            icon={<TrendingDown className="h-4 w-4 text-loss" />}
            rows={stats.worst}
          />
        </div>
      )}

      {stats && stats.strongMaps.length > 0 && (
        <Card>
          <CardContent className="space-y-2 p-4">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold">
              <MapIcon className="h-4 w-4 text-primary" />
              {tt('Strongest on these maps')}
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {stats.strongMaps.map((m) => (
                <span
                  key={m}
                  className="rounded bg-secondary px-2 py-0.5 text-xs text-muted-foreground"
                >
                  {m}
                </span>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {tt('Maps where {civ} has the highest win rate of any civ.').replace(
                '{civ}',
                gameName(civDisplayName(slug)),
              )}
            </p>
          </CardContent>
        </Card>
      )}
    </section>
  )
}

function MatchupList({
  title,
  icon,
  rows,
}: {
  title: string
  icon: React.ReactNode
  rows: CivMatchup[]
}) {
  if (rows.length === 0) return null
  return (
    <Card>
      <CardContent className="space-y-2 p-4">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          {icon}
          {title}
        </h3>
        <div className="space-y-0.5">
          {rows.map((r) => (
            <Link
              key={r.civ}
              to={`/civ/${r.civ}`}
              className="-mx-2 flex items-baseline justify-between gap-2 rounded-md px-2 py-1 text-sm transition-colors hover:bg-secondary/70 hover:text-primary"
            >
              <span>{r.civName}</span>
              <span className="flex items-center gap-2 tabular-nums">
                <span className="text-xs text-muted-foreground">{formatCount(r.games)}g</span>
                <WinRateBar winRate={r.winRate} className="w-28 shrink-0" />
              </span>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="space-y-1.5 p-4">
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">{children}</p>
      </CardContent>
    </Card>
  )
}

function UnitCard({ unit }: { unit: VendoredUnit }) {
  const { tt } = useI18n()
  const role = roleFromUnit(unit)
  const counter = role ? counterFor(role) : null
  const icon = resolveAoE4Icon(unit.icon ?? `units/${unit.name}`)
  return (
    <div className="rounded-lg border border-border bg-card/60 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2 truncate text-sm font-medium">
          {icon && (
            <img src={icon} alt="" aria-hidden className="h-7 w-7 shrink-0 object-contain" />
          )}
          <span className="truncate">{unit.name}</span>
        </span>
        {unit.unique && <Badge variant="outline">{tt('unique')}</Badge>}
      </div>
      <div className="mt-0.5 text-xs text-muted-foreground">{unit.displayClasses[0] ?? '—'}</div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
        {unit.hitpoints != null && <span>{unit.hitpoints} HP</span>}
        {unit.attack && (
          <span>
            {unit.attack.damage} {unit.attack.type} atk
          </span>
        )}
        {unit.costs && unit.costs.total > 0 && <span>{unit.costs.total} res</span>}
      </div>
      {counter && counter.weakVs.length > 0 && (
        <div className="mt-1.5 text-[11px] text-muted-foreground">
          {tt('Countered by:')}{' '}
          <span className="text-destructive/90">{counter.weakVs.slice(0, 3).join(', ')}</span>
        </div>
      )}
    </div>
  )
}

/** Picks a beginner-friendly set of a civ's units: a few per age, prioritising core combat roles. */
function pickKeyUnits(units: VendoredUnit[]): VendoredUnit[] {
  const seen = new Set<string>()
  const out: VendoredUnit[] = []
  for (const u of units) {
    const role = roleFromUnit(u)
    if (!role) continue
    if (seen.has(role) && out.length > 6) continue
    seen.add(role)
    out.push(u)
    if (out.length >= 9) break
  }
  return out
}

/**
 * YOUR per-landmark record, computed from the landmark build events decoded out
 * of your own games' stat files. Shown because no public dataset tracks global
 * landmark win rates (AoE4World aggregates at civ level only) — this is the
 * honest, personal version.
 */
function LandmarkRecordCard({ civ, enabled }: { civ: string; enabled: boolean }) {
  const { tt, gameName } = useI18n()
  const { data } = useQuery({
    queryKey: ['landmarkRecord', civ],
    queryFn: () => ipc.getLandmarkRecord(civ),
    staleTime: 60_000,
    enabled,
  })
  const rows = data?.ok ? data.data : []
  if (rows.length === 0) return null
  const totalGames = Math.max(...rows.map((r) => r.games))
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm">{tt('Your landmark record')}</h3>
          <span className="text-[11px] text-muted-foreground">
            {`из синхронизированных игр за ${gameName(civDisplayName(civ))} — маленькая, но реальная выборка`}
          </span>
        </div>
        <div className="overflow-x-auto rounded-sm border border-border/70">
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="border-b border-border/70 bg-background/40">
                <th className="rts-ledger-head px-3 py-2 text-left">{tt('Landmark')}</th>
                <th className="rts-ledger-head px-2 py-2 text-left">{tt('Age')}</th>
                <th className="rts-ledger-head px-2 py-2 text-left">{tt('Results')}</th>
                <th className="rts-ledger-head px-3 py-2 text-right">{tt('Record')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.landmark} className="border-b border-border/50 last:border-b-0">
                  <td className="px-3 py-2 font-medium">{gameName(r.landmark)}</td>
                  <td className="px-2 py-2 text-muted-foreground">
                    {gameName(r.age === 2 ? 'Feudal' : r.age === 3 ? 'Castle' : 'Imperial')}
                  </td>
                  <td className="px-2 py-2">
                    <div className="min-w-28">
                      <WinRateBar winRate={r.games >= 2 ? r.winRate : null} />
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {r.wins}W–{r.losses}L
                    {r.games >= 2 && (
                      <span className="ml-1.5 text-xs text-muted-foreground">
                        {formatPercent(r.winRate)}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalGames < 5 && (
          <p className="text-[11px] text-muted-foreground">
            {tt(
              'Win rates firm up as you play more games with this civ — under ~5 games per landmark is a hint, not a verdict.',
            )}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * GLOBAL landmark pick & win rates from AoE4World's ageup analytics — real
 * ladder data (ranked 1v1, current-patch sampled dataset). Aggregated across
 * every age-up path so each landmark's record covers all games that built it.
 */
function LandmarkStatsCard({ civ, enabled }: { civ: string; enabled: boolean }) {
  const { tt, gameName } = useI18n()
  const { data } = useQuery({
    queryKey: ['landmarkStats', civ],
    queryFn: () => ipc.getLandmarkStats(civ),
    staleTime: 60 * 60_000,
    enabled,
  })
  const rows = data?.ok ? data.data : []
  if (rows.length === 0) return null
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm">{tt('Landmark pick & win rates')}</h3>
          <span className="text-[11px] text-muted-foreground">
            {tt('AoE4World analytics · ranked 1v1 · current patch (sampled dataset)')}
          </span>
        </div>
        <div className="overflow-x-auto rounded-sm border border-border/70">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-border/70 bg-background/40">
                <th className="rts-ledger-head px-3 py-2 text-left">{tt('Landmark')}</th>
                <th className="rts-ledger-head px-2 py-2 text-left">{tt('Age')}</th>
                <th className="rts-ledger-head px-2 py-2 text-right">{tt('Pick rate')}</th>
                <th className="rts-ledger-head px-2 py-2 text-left">{tt('Win rate')}</th>
                <th className="rts-ledger-head px-2 py-2 text-right">{tt('Games')}</th>
                <th className="rts-ledger-head px-3 py-2 text-right">{tt('Avg age-up')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={`${r.age}-${r.name}`}
                  className="border-b border-border/50 last:border-b-0"
                >
                  <td className="px-3 py-2">
                    <span className="flex items-center gap-2 font-medium">
                      {(() => {
                        const icon =
                          resolveAoE4Icon(`buildings/${r.name}`) ??
                          (r.icon ? resolveAoE4Icon(r.icon) : null)
                        return icon ? (
                          <img
                            src={icon}
                            alt=""
                            aria-hidden
                            className="h-6 w-6 rounded-sm object-contain"
                          />
                        ) : null
                      })()}
                      {gameName(r.name)}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-muted-foreground">
                    {gameName(r.age === 2 ? 'Feudal' : r.age === 3 ? 'Castle' : 'Imperial')}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">{r.pickRate}%</td>
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-2">
                      <div className="min-w-24 flex-1">
                        <WinRateBar winRate={r.winRate} />
                      </div>
                      <span className="w-12 text-right tabular-nums text-xs">
                        {formatPercent(r.winRate)}
                      </span>
                    </div>
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">
                    {formatCount(r.games)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatDurationShort(r.avgAgeUpSec)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-muted-foreground">
          {tt(
            'A low-pick landmark with a high win rate is often a hidden gem for specific matchups — pick rate measures popularity, not strength.',
          )}
        </p>
      </CardContent>
    </Card>
  )
}
