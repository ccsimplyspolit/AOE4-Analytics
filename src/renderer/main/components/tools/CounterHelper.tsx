import { useState } from 'react'
import { ArrowRight, Database, Gauge, ShieldCheck, SlidersHorizontal, Swords } from 'lucide-react'
import { CIV_SLUGS } from '@data/civs'
import { unitsForCiv } from '@data/gameData'
import {
  COUNTER_MATRIX,
  COUNTER_ROLES,
  counterFor,
  whatBeats,
  type UnitRole,
} from '@domain/counters'
import { civDisplayName } from '@domain/civ'
import {
  calculateContextualMatchup,
  counterGraphCoverage,
  counterRowsForCivs as buildCounterRows,
  type MatchupMicro,
  type MatchupMode,
  type MatchupTerrain,
  type ContextualMatchupResult,
} from '@domain/unitCounterModel'
import type { VendoredUnit } from '@data/gameData'
import { useCivMeta, useRankedMapPool } from '../../queries/useCivMeta'
import { useI18n } from '../../../i18n'
import { Card, CardContent } from '@shared/components/ui/card'
import { Badge } from '@shared/components/ui/badge'
import { formatCount, formatDurationShort } from '@shared/format'

function MapCounterCalculator() {
  const { tt, gameName } = useI18n()
  const [mapScope, setMapScope] = useState<'pool' | 'all'>('pool')
  const [mapId, setMapId] = useState<number | null>(null)
  const poolQuery = useRankedMapPool()
  const meta = useCivMeta({
    leaderboard: 'rm_solo',
    mapId: mapId ?? undefined,
    mapPoolOnly: mapScope === 'pool',
  })
  const data = meta.data?.ok ? meta.data.data : null
  const civs = data?.mapCivs ?? data?.civs ?? []
  const mapPool = data?.mapPool ?? (poolQuery.data?.ok ? poolQuery.data.data : null)
  const poolIsCurrent = mapPool?.status === 'current'
  const selection = mapId == null ? (mapScope === 'pool' ? '__pool__' : '__all__') : String(mapId)
  const maps = data?.maps ?? []
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="rts-section-title">{tt('Map Counter Calculator')}</div>
            <p className="text-xs text-muted-foreground">
              {tt(
                'The current solo map pool is selected by default. Choose one map for a map-specific ranking or switch to all maps for a broader comparison.',
              )}
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-1.5">
            <Badge variant="outline">{tt('Ranked 1v1')}</Badge>
            <Badge variant={poolIsCurrent ? 'secondary' : 'outline'}>
              {poolIsCurrent
                ? `${tt('Current solo map pool')} · ${mapPool?.maps.length ?? 0}`
                : tt('Map pool unavailable or stale')}
            </Badge>
          </div>
        </div>
        <select
          value={selection}
          onChange={(event) => {
            const value = event.target.value
            if (value === '__pool__') {
              setMapScope('pool')
              setMapId(null)
            } else if (value === '__all__') {
              setMapScope('all')
              setMapId(null)
            } else {
              // A named map is an explicit override, including maps outside
              // the current rotation when the user is in the all-maps mode.
              setMapScope('all')
              setMapId(Number(value))
            }
          }}
          className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
        >
          <option value="__pool__">
            {tt('Current solo map pool')} · {mapPool?.maps.length ?? 9} {tt('maps')}
          </option>
          <option value="__all__">{tt('All maps')}</option>
          {maps.map((map) => (
            <option key={map.mapId} value={map.mapId}>
              {map.map} · {formatCount(map.games)} {tt('games')}
            </option>
          ))}
        </select>
        {mapScope === 'pool' && poolIsCurrent && (
          <p className="text-[11px] text-muted-foreground">
            {tt('Using only the active ranked rotation')}:{' '}
            {mapPool?.maps.join(' · ')}
          </p>
        )}
        {meta.isLoading && (
          <p className="text-xs text-muted-foreground">{tt('Loading live meta…')}</p>
        )}
        {civs.length > 0 && (
          <div className="overflow-x-auto rounded-md border border-border/70">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="rts-ledger-head px-3 py-2 text-left">{tt('Civilization')}</th>
                  <th className="rts-ledger-head px-2 py-2 text-right">{tt('WR')}</th>
                  <th className="rts-ledger-head px-2 py-2 text-right">{tt('Pick')}</th>
                  <th className="rts-ledger-head px-3 py-2 text-right">{tt('Games')}</th>
                </tr>
              </thead>
              <tbody>
                {civs.slice(0, 8).map((civ, index) => (
                  <tr key={civ.civ} className="border-b border-border/60 last:border-0">
                    <td className="px-3 py-2">
                      <span className="mr-2 text-xs text-muted-foreground">#{index + 1}</span>
                      {gameName(civ.civName)}
                    </td>
                    <td className="px-2 py-2 text-right font-semibold tabular-nums">
                      {civ.winRate}%
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">
                      {civ.pickRate}%
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                      {formatCount(civ.games)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-[11px] text-muted-foreground">
          {tt(
            mapScope === 'pool'
              ? 'This ranking is weighted across the active ranked map pool, not a guaranteed matchup result; low-sample civilizations need caution.'
              : 'This is a map-level meta recommendation, not a guaranteed matchup result; low-sample civilizations need caution.',
          )}
        </p>
      </CardContent>
    </Card>
  )
}

/** Beginner counter helper: pick an enemy unit role → see what beats it and what it does. */
export function CounterHelper() {
  const { tt, gameName } = useI18n()
  const [role, setRole] = useState<UnitRole>('knight')
  const [yourCiv, setYourCiv] = useState('english')
  const [enemyCiv, setEnemyCiv] = useState('french')
  const [maxAge, setMaxAge] = useState('')
  const [attackerId, setAttackerId] = useState('spearman')
  const [defenderId, setDefenderId] = useState('knight')
  const [matchupMode, setMatchupMode] = useState<MatchupMode>('resources')
  const [budget, setBudget] = useState('720')
  const [count, setCount] = useState('10')
  const [terrain, setTerrain] = useState<MatchupTerrain>('open')
  const [micro, setMicro] = useState<MatchupMicro>('solid')
  const [upgradeAdvantage, setUpgradeAdvantage] = useState('0')
  const entry = counterFor(role)
  const beats = whatBeats(role)
  const unitRows = buildCounterRows(enemyCiv, yourCiv, 8, 4, {
    maxAge: maxAge ? Number(maxAge) : undefined,
  })
  const yourUnits = unitsForCiv(yourCiv)
  const enemyUnits = unitsForCiv(enemyCiv)
  const matchupAttackers = yourUnits.filter((unit) => unit.attack || unit.weapons?.length)
  const matchupDefenders = enemyUnits.filter((unit) => unit.attack || unit.weapons?.length)
  const attacker = matchupAttackers.find((unit) => unit.id === attackerId) ?? matchupAttackers[0]
  const defender = matchupDefenders.find((unit) => unit.id === defenderId) ?? matchupDefenders[0]
  const matchup = attacker && defender
    ? calculateContextualMatchup(attacker, defender, {
        mode: matchupMode,
        budget: Number(budget) || 720,
        count: Number(count) || 10,
        terrain,
        micro,
        upgradeAdvantage: Number(upgradeAdvantage) || 0,
      })
    : null
  const graph = counterGraphCoverage()

  return (
    <div className="space-y-5">
      <MapCounterCalculator />
      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Database className="h-4 w-4 text-primary" />
                {tt('Civ-to-civ unit counter explorer')}
              </div>
              <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted-foreground">
                {tt(
                  'Select the observed enemy roster and your civilization. Answers are ranked from the bundled AoE4World unit snapshot with War Room-style explainable role edges, age, cost and training-time signals.',
                )}
              </p>
            </div>
            <div className="flex flex-wrap justify-end gap-1.5">
              <Badge variant="outline">
                {yourUnits.length} {tt('available units')}
              </Badge>
              <Badge variant="outline">
                {graph.units} {tt('units')} · {formatCount(graph.directedPairs)} {tt('directed pairs')}
              </Badge>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <CivSelect label={tt('Your civilization')} value={yourCiv} onChange={setYourCiv} />
            <CivSelect label={tt('Enemy civilization')} value={enemyCiv} onChange={setEnemyCiv} />
            <label className="space-y-1 text-xs text-muted-foreground">
              <span>{tt('Answers available by age')}</span>
              <select
                value={maxAge}
                onChange={(event) => setMaxAge(event.target.value)}
                className="h-9 w-full rounded-sm border border-border bg-background px-2 text-sm text-foreground outline-none focus:border-primary"
              >
                <option value="">{tt('All ages')}</option>
                <option value="1">{tt('Age I')}</option>
                <option value="2">{tt('Age II')}</option>
                <option value="3">{tt('Age III')}</option>
                <option value="4">{tt('Age IV')}</option>
              </select>
            </label>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {unitRows.map((row) => (
              <div
                key={row.target.id}
                className="rounded-md border border-border/70 bg-background/40 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{gameName(row.target.name)}</div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                      {roleLabel(row.targetRole, tt)} · {tt('Age')} {row.target.minAge}
                    </div>
                  </div>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {row.candidates.length} {tt('answers')}
                  </span>
                </div>
                <div className="mt-2 space-y-1.5">
                  {row.candidates.map((candidate) => (
                    <div
                      key={candidate.unit.id}
                      className="rounded border border-primary/20 bg-primary/5 px-2 py-1.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                        <span className="text-xs font-medium text-primary">
                          {gameName(candidate.unit.name)}
                        </span>
                        <span className="text-[10px] tabular-nums text-muted-foreground">
                          {candidate.resourceTotal == null ? '—' : `${candidate.resourceTotal} ${tt('res')}`}
                          {' · '}
                          {candidate.trainingTimeSec == null
                            ? '—'
                            : formatDurationShort(candidate.trainingTimeSec)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">
                        {candidate.relation === 'hard' ? tt('Hard role answer') : tt('Role answer')}{' '}
                        · {candidate.reasons.map((reason) => tt(reason)).join(' · ')}
                      </p>
                    </div>
                  ))}
                  {row.candidates.length === 0 && (
                    <span className="text-xs text-muted-foreground">
                      {tt('No local unit answer')}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {tt(
              'This is a decision aid, not a combat simulator: civ bonuses, upgrades, terrain, formations and active abilities can change a close matchup. Costs are total resource points, not a predicted win probability.',
            )}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Gauge className="h-4 w-4 text-primary" />
                {tt('Contextual Matchup Lab')}
              </div>
              <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted-foreground">
                {tt(
                  'War Room-style evidence from versioned weapon data: compare a specific pair by budget or unit count, terrain, micro and relative upgrades.',
                )}
              </p>
            </div>
            <Badge variant="outline">{tt('Not a win probability')}</Badge>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <UnitSelect
              label={tt('Your unit')}
              value={attacker?.id ?? ''}
              units={matchupAttackers}
              onChange={setAttackerId}
              gameName={gameName}
            />
            <UnitSelect
              label={tt('Enemy unit')}
              value={defender?.id ?? ''}
              units={matchupDefenders}
              onChange={setDefenderId}
              gameName={gameName}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <label className="space-y-1 text-xs text-muted-foreground">
              <span>{tt('Comparison')}</span>
              <select
                value={matchupMode}
                onChange={(event) => setMatchupMode(event.target.value as MatchupMode)}
                className="h-9 w-full rounded-sm border border-border bg-background px-2 text-sm text-foreground"
              >
                <option value="resources">{tt('Equal resources')}</option>
                <option value="count">{tt('Equal unit count')}</option>
              </select>
            </label>
            <NumberField
              label={matchupMode === 'resources' ? tt('Resources per side') : tt('Units per side')}
              value={matchupMode === 'resources' ? budget : count}
              onChange={matchupMode === 'resources' ? setBudget : setCount}
              min={matchupMode === 'resources' ? 1 : 1}
              max={matchupMode === 'resources' ? 5000 : 100}
            />
            <label className="space-y-1 text-xs text-muted-foreground">
              <span>{tt('Terrain')}</span>
              <select
                value={terrain}
                onChange={(event) => setTerrain(event.target.value as MatchupTerrain)}
                className="h-9 w-full rounded-sm border border-border bg-background px-2 text-sm text-foreground"
              >
                <option value="open">{tt('Open field')}</option>
                <option value="choke">{tt('Choke')}</option>
                <option value="forest">{tt('Forest')}</option>
              </select>
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              <span>{tt('Micro')}</span>
              <select
                value={micro}
                onChange={(event) => setMicro(event.target.value as MatchupMicro)}
                className="h-9 w-full rounded-sm border border-border bg-background px-2 text-sm text-foreground"
              >
                <option value="amove">{tt('A-move')}</option>
                <option value="solid">{tt('Solid')}</option>
                <option value="strong">{tt('Strong')}</option>
              </select>
            </label>
            <NumberField
              label={tt('Upgrade advantage')}
              value={upgradeAdvantage}
              onChange={setUpgradeAdvantage}
              min={-2}
              max={2}
              step={1}
            />
          </div>
          {matchup && attacker && defender && (
            <MatchupResultCard
              attacker={attacker}
              defender={defender}
              result={matchup}
              gameName={gameName}
              tt={tt}
            />
          )}
        </CardContent>
      </Card>
      <div>
        <label className="mb-1.5 block text-sm font-medium">{tt('Enemy is massing…')}</label>
        <div className="flex flex-wrap gap-1.5">
          {COUNTER_ROLES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={`rounded-md border px-2.5 py-1 text-sm transition-colors ${
                r === role
                  ? 'border-primary bg-primary/15 text-primary'
                  : 'border-border bg-background text-muted-foreground hover:bg-secondary'
              }`}
            >
              {roleLabel(r, tt)}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-win/30 bg-win/5 p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-win">
          <ShieldCheck className="h-4 w-4" />
          {tt('Counter')} {roleLabel(entry.role, tt)} {tt('with')}
        </h3>
        {beats.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {beats.map((c) => (
              <button
                key={c.role}
                type="button"
                onClick={() => setRole(c.role)}
                className="rounded-md bg-win/15 px-2.5 py-1 text-sm font-medium text-win hover:bg-win/25"
              >
                {roleLabel(c.role, tt)}
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            {tt('No hard counter — out-position it and target it with focus fire.')}
          </p>
        )}
      </div>

      <div className="rounded-lg border border-border bg-card/50 p-4 text-sm">
        <h3 className="flex items-center gap-2 font-semibold">
          <Swords className="h-4 w-4 text-primary" />
          {tt('About')} {roleLabel(entry.role, tt)}
        </h3>
        <p className="mt-1.5 leading-relaxed text-muted-foreground">{tt(entry.advice)}</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <CounterList label={tt('Strong against')} roles={entry.strongVs} tone="good" />
          <CounterList label={tt('Weak against')} roles={entry.weakVs} tone="bad" />
        </div>
      </div>
    </div>
  )
}

function UnitSelect({
  label,
  value,
  units,
  onChange,
  gameName,
}: {
  label: string
  value: string
  units: VendoredUnit[]
  onChange: (value: string) => void
  gameName: (value: string) => string
}) {
  return (
    <label className="space-y-1 text-xs text-muted-foreground">
      <span>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full rounded-sm border border-border bg-background px-2 text-sm text-foreground outline-none focus:border-primary"
      >
        {units.map((unit) => (
          <option key={unit.id} value={unit.id}>
            {gameName(unit.name)} · {roleLabel(roleFromUnitSafe(unit), (value) => value)}
          </option>
        ))}
      </select>
    </label>
  )
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  min: number
  max: number
  step?: number
}) {
  return (
    <label className="space-y-1 text-xs text-muted-foreground">
      <span>{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full rounded-sm border border-border bg-background px-2 text-sm text-foreground outline-none focus:border-primary"
      />
    </label>
  )
}

function MatchupResultCard({
  attacker,
  defender,
  result,
  gameName,
  tt,
}: {
  attacker: VendoredUnit
  defender: VendoredUnit
  result: ContextualMatchupResult
  gameName: (value: string) => string
  tt: (value: string) => string
}) {
  const verdictLabels: Record<ContextualMatchupResult['verdict'], string> = {
    'hard-counter': tt('Clear counter'),
    'soft-counter': tt('Slight edge'),
    'skill-matchup': tt('Skill matchup'),
    'soft-loss': tt('Slight loss'),
    'hard-loss': tt('Hard loss'),
    'not-comparable': tt('Not comparable'),
  }
  const ratioPercent = Math.min(100, Math.max(8, Math.round((result.ratio / (1 + result.ratio)) * 100)))
  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <SlidersHorizontal className="h-4 w-4 text-primary" />
            {gameName(attacker.name)} <span className="text-muted-foreground">vs</span>{' '}
            {gameName(defender.name)}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {tt('Strength ratio')} {result.ratio.toFixed(2)} · {tt('Model confidence')} {result.confidencePct}%
          </div>
        </div>
        <Badge variant={result.verdict === 'hard-loss' || result.verdict === 'soft-loss' ? 'destructive' : 'outline'}>
          {verdictLabels[result.verdict]}
        </Badge>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${ratioPercent}%` }} />
      </div>
      <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
        <div className="rounded border border-border/70 bg-background/40 p-2">
          <div className="font-medium text-primary">{gameName(attacker.name)}</div>
          <div className="mt-1 text-muted-foreground">
            {tt('Units')} {result.attackerCount.toFixed(1)} · DPS {result.attackerWeapon.dps.toFixed(2)} · +{Math.round(result.attackerWeapon.bonus)} {tt('bonus')}
          </div>
        </div>
        <div className="rounded border border-border/70 bg-background/40 p-2">
          <div className="font-medium">{gameName(defender.name)}</div>
          <div className="mt-1 text-muted-foreground">
            {tt('Units')} {result.defenderCount.toFixed(1)} · DPS {result.defenderWeapon.dps.toFixed(2)} · +{Math.round(result.defenderWeapon.bonus)} {tt('bonus')}
          </div>
        </div>
      </div>
      <div className="mt-3 grid gap-1 text-[11px] leading-relaxed text-muted-foreground">
        {result.reasons.map((reason) => (
          <div key={reason}>• {reason}</div>
        ))}
      </div>
    </div>
  )
}

function roleFromUnitSafe(unit: VendoredUnit): UnitRole {
  const role = unit.displayClasses.join(' ').toLowerCase()
  if (role.includes('cavalry')) return role.includes('heavy') ? 'knight' : 'horseman'
  if (role.includes('ranged')) return 'archer'
  if (role.includes('infantry')) return role.includes('heavy') ? 'manatarms' : 'spearman'
  return 'scout'
}

function CivSelect({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  const { gameName } = useI18n()
  return (
    <label className="space-y-1 text-xs text-muted-foreground">
      <span>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full rounded-sm border border-border bg-background px-2 text-sm text-foreground outline-none focus:border-primary"
      >
        {CIV_SLUGS.map((civ) => (
          <option key={civ} value={civ}>
            {gameName(civDisplayName(civ))}
          </option>
        ))}
      </select>
    </label>
  )
}

function CounterList({
  label,
  roles,
  tone,
}: {
  label: string
  roles: UnitRole[]
  tone: 'good' | 'bad'
}) {
  const { tt } = useI18n()
  return (
    <div>
      <div className="mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
        <ArrowRight className="h-3 w-3" />
        {label}
      </div>
      <div className="flex flex-wrap gap-1">
        {roles.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
        {roles.map((r) => (
          <span
            key={r}
            className={`rounded px-1.5 py-0.5 text-xs ${
              tone === 'good' ? 'bg-win/15 text-win' : 'bg-destructive/15 text-destructive'
            }`}
          >
            {roleLabel(r, tt)}
          </span>
        ))}
      </div>
    </div>
  )
}

function roleLabel(role: UnitRole, tt: (value: string) => string): string {
  return tt(COUNTER_MATRIX[role].label).replace(/\s*\(.*\)/, '')
}
