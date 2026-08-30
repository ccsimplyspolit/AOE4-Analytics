import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Calculator, ExternalLink, Swords, Table2 } from 'lucide-react'
import { CIV_SLUGS, civCode } from '@data/civs'
import { DEFAULT_GATHER_RATES } from '@domain/productionCalculator'
import {
  armyCost,
  clubUnits,
  compareUnits,
  dpsPreview,
  findClubUnit,
  type ArmyLine,
} from '@domain/clubLab'
import { civDisplayName } from '@domain/civ'
import { Card, CardContent } from '@shared/components/ui/card'
import { cn } from '@shared/lib/utils'
import { useI18n } from '../../i18n'
import { ScreenTabs } from './ScreenTabs'

const LABS = ['compare', 'dps', 'cost'] as const
type LabKey = (typeof LABS)[number]

function formatSeconds(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return '—'
  return `${value.toFixed(1)}s`
}

export function ClubLab() {
  const { tt, gameName } = useI18n()
  const [searchParams, setSearchParams] = useSearchParams()
  const labParam = searchParams.get('lab')
  const lab: LabKey = LABS.includes(labParam as LabKey) ? (labParam as LabKey) : 'compare'
  const setLab = (next: LabKey) =>
    setSearchParams(
      (prev) => {
        const copy = new URLSearchParams(prev)
        copy.set('tab', 'club')
        copy.set('lab', next)
        return copy
      },
      { replace: true },
    )

  const [civ, setCiv] = useState('')
  const civDataCode = civ ? civCode(civ) : undefined
  const units = useMemo(() => clubUnits(civDataCode), [civDataCode])
  const defaultLeft = units.find((unit) => /spearman/i.test(unit.id))?.id ?? units[0]?.id ?? ''
  const defaultRight = units.find((unit) => /horseman|knight/i.test(unit.id))?.id ?? units[1]?.id ?? ''
  const [leftId, setLeftId] = useState(defaultLeft)
  const [rightId, setRightId] = useState(defaultRight)
  const [lines, setLines] = useState<ArmyLine[]>([{ unitId: defaultLeft, count: 5 }])
  const [foodSource, setFoodSource] = useState('sheep')

  const left = findClubUnit(leftId, civDataCode) ?? units[0] ?? null
  const right = findClubUnit(rightId, civDataCode) ?? units[1] ?? null
  const rows = left && right ? compareUnits(left, right) : []
  const preview = left && right ? dpsPreview(left, right) : null
  const bill = armyCost(lines, { civCode: civDataCode, foodSource })

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">{tt('AoE4 Club lab')}</div>
          <p className="mt-1 text-xs text-muted-foreground">
            {tt(
              'Unit compare, DPS/TTK and army cost from the bundled aoe4world/data snapshot. aoe4.club has no public API, so live pages stay as links.',
            )}
          </p>
        </div>
        <a
          href="https://www.aoe4.club/en/tools"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          {tt('Open aoe4.club tools')} <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      <ScreenTabs
        items={[
          { id: 'compare', label: 'Unit compare', icon: Table2 },
          { id: 'dps', label: 'DPS calculator', icon: Swords },
          { id: 'cost', label: 'Cost calculator', icon: Calculator },
        ]}
        value={lab}
        onChange={setLab}
        ariaLabel={tt('Club lab sections')}
        size="sm"
        trailing={
          <select
            value={civ}
            onChange={(event) => setCiv(event.target.value)}
            className="h-9 rounded-md border border-border bg-background px-3 text-sm"
          >
            <option value="">{tt('All civilizations')}</option>
            {CIV_SLUGS.map((slug) => (
              <option key={slug} value={slug}>
                {gameName(civDisplayName(slug))}
              </option>
            ))}
          </select>
        }
      />

      {lab !== 'cost' && left && right && (
        <div className="grid gap-3 sm:grid-cols-2">
          <UnitSelect
            label={tt('Left unit')}
            value={leftId}
            units={units}
            onChange={setLeftId}
          />
          <UnitSelect
            label={tt('Right unit')}
            value={rightId}
            units={units}
            onChange={setRightId}
          />
        </div>
      )}

      {lab === 'compare' && (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2">{tt('Stat')}</th>
                  <th className="px-3 py-2">{left?.name}</th>
                  <th className="px-3 py-2">{right?.name}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key} className="border-b border-border/60 last:border-0">
                    <td className="px-3 py-1.5 text-muted-foreground">{tt(row.key)}</td>
                    <td
                      className={cn(
                        'px-3 py-1.5 tabular-nums',
                        row.advantage === 'left' && 'text-win',
                      )}
                    >
                      {row.left}
                    </td>
                    <td
                      className={cn(
                        'px-3 py-1.5 tabular-nums',
                        row.advantage === 'right' && 'text-win',
                      )}
                    >
                      {row.right}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {lab === 'dps' && preview && (
        <Card>
          <CardContent className="space-y-3 p-4 text-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              <DpsStat
                name={preview.left.name}
                dps={preview.leftDps}
                ttk={preview.leftTtkSec}
                label={tt('Time to kill right')}
              />
              <DpsStat
                name={preview.right.name}
                dps={preview.rightDps}
                ttk={preview.rightTtkSec}
                label={tt('Time to kill left')}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {tt('Matchup')} {preview.relation} · {tt('Score')} {preview.matchupScore}
            </p>
            <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
              {preview.reasons.map((reason) => (
                <li key={reason}>{tt(reason)}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {lab === 'cost' && (
        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="flex flex-wrap gap-2">
              <select
                value={foodSource}
                onChange={(event) => setFoodSource(event.target.value)}
                className="h-9 rounded-md border border-border bg-background px-3 text-sm"
              >
                {Object.keys(DEFAULT_GATHER_RATES).map((source) => (
                  <option key={source} value={source}>
                    {tt(source)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="h-9 rounded-md border border-border px-3 text-sm hover:bg-secondary"
                onClick={() =>
                  setLines((current) => [...current, { unitId: units[0]?.id ?? '', count: 1 }])
                }
              >
                {tt('Add unit')}
              </button>
            </div>
            <div className="space-y-2">
              {lines.map((line, index) => (
                <div key={`${line.unitId}-${index}`} className="flex gap-2">
                  <select
                    value={line.unitId}
                    onChange={(event) =>
                      setLines((current) =>
                        current.map((row, rowIndex) =>
                          rowIndex === index ? { ...row, unitId: event.target.value } : row,
                        ),
                      )
                    }
                    className="h-9 min-w-0 flex-1 rounded-md border border-border bg-background px-3 text-sm"
                  >
                    {units.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    value={line.count}
                    onChange={(event) =>
                      setLines((current) =>
                        current.map((row, rowIndex) =>
                          rowIndex === index
                            ? { ...row, count: Number(event.target.value) || 0 }
                            : row,
                        ),
                      )
                    }
                    className="h-9 w-20 rounded-md border border-border bg-background px-3 text-sm"
                  />
                </div>
              ))}
            </div>
            <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
              <CostStat label={tt('Food')} value={bill.totals.food} />
              <CostStat label={tt('Wood')} value={bill.totals.wood} />
              <CostStat label={tt('Gold')} value={bill.totals.gold} />
              <CostStat label={tt('Stone')} value={bill.totals.stone} />
              <CostStat label={tt('Pop')} value={bill.totals.pop} />
              <CostStat label={tt('Train time')} value={bill.totals.trainTime} />
            </dl>
            <p className="text-xs text-muted-foreground">
              {tt('Villager-seconds at')} {foodSource}: F {bill.villagerSeconds.food.toFixed(0)} · W{' '}
              {bill.villagerSeconds.wood.toFixed(0)} · G {bill.villagerSeconds.gold.toFixed(0)} · S{' '}
              {bill.villagerSeconds.stone.toFixed(0)}
            </p>
          </CardContent>
        </Card>
      )}
    </section>
  )
}

function UnitSelect({
  label,
  value,
  units,
  onChange,
}: {
  label: string
  value: string
  units: ReturnType<typeof clubUnits>
  onChange: (value: string) => void
}) {
  return (
    <label className="space-y-1 text-xs text-muted-foreground">
      <span>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground"
      >
        {units.map((unit) => (
          <option key={unit.id} value={unit.id}>
            {unit.name}
          </option>
        ))}
      </select>
    </label>
  )
}

function DpsStat({
  name,
  dps,
  ttk,
  label,
}: {
  name: string
  dps: number
  ttk: number | null
  label: string
}) {
  return (
    <div className="rounded-md border border-border p-3">
      <div className="font-medium">{name}</div>
      <div className="mt-1 text-2xl tabular-nums">{dps.toFixed(1)}</div>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">DPS</div>
      <div className="mt-2 text-xs text-muted-foreground">
        {label}: {formatSeconds(ttk)}
      </div>
    </div>
  )
}

function CostStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border/70 px-3 py-2">
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="tabular-nums">{Math.round(value)}</dd>
    </div>
  )
}
