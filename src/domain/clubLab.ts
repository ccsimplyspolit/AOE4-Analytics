import { UNITS, type VendoredUnit } from '@data/gameData'
import { DEFAULT_GATHER_RATES, type ResourceAmounts } from './productionCalculator'
import { evaluateUnitMatchup } from './unitCounterModel'

export interface ArmyLine {
  unitId: string
  count: number
}

export interface ArmyCostResult {
  lines: Array<{
    unit: VendoredUnit
    count: number
    food: number
    wood: number
    gold: number
    stone: number
    pop: number
    trainTime: number
  }>
  totals: ResourceAmounts & { pop: number; trainTime: number }
  villagerSeconds: ResourceAmounts
  foodSource: string
}

export interface UnitCompareRow {
  key: string
  left: string
  right: string
  advantage: 'left' | 'right' | 'even'
}

export interface DpsPreview {
  left: VendoredUnit
  right: VendoredUnit
  leftDps: number
  rightDps: number
  leftTtkSec: number | null
  rightTtkSec: number | null
  matchupScore: number
  relation: string
  reasons: string[]
}

function costsOf(unit: VendoredUnit): ResourceAmounts {
  return {
    food: unit.costs?.food ?? 0,
    wood: unit.costs?.wood ?? 0,
    gold: unit.costs?.gold ?? 0,
    stone: unit.costs?.stone ?? 0,
  }
}

function attackInterval(unit: VendoredUnit): number {
  const speed = unit.weapons?.[0]?.speed
  return speed && speed > 0 ? speed : 1.25
}

function attackDamage(unit: VendoredUnit): number {
  return unit.attack?.damage ?? unit.weapons?.[0]?.damage ?? 0
}

function armorAgainst(defender: VendoredUnit, attacker: VendoredUnit): number {
  const kind = attacker.attack?.type === 'ranged' ? 'ranged' : 'melee'
  return defender.armor?.[kind] ?? 0
}

function damagePerHit(attacker: VendoredUnit, defender: VendoredUnit): number {
  return Math.max(1, attackDamage(attacker) - armorAgainst(defender, attacker))
}

export function unitDps(unit: VendoredUnit): number {
  return attackDamage(unit) / attackInterval(unit)
}

export function timeToKillSec(attacker: VendoredUnit, defender: VendoredUnit): number | null {
  const hp = defender.hitpoints
  if (hp == null || hp <= 0) return null
  const dps = damagePerHit(attacker, defender) / attackInterval(attacker)
  return dps > 0 ? hp / dps : null
}

/** Distinct combat units, optionally limited to one AoE4World data civ code. */
export function clubUnits(civCode?: string): VendoredUnit[] {
  const pool = civCode ? UNITS.filter((unit) => unit.civs.includes(civCode)) : UNITS
  const unique = new Map<string, VendoredUnit>()
  for (const unit of pool) {
    if (!unique.has(unit.id)) unique.set(unit.id, unit)
  }
  return [...unique.values()].sort((left, right) => left.name.localeCompare(right.name))
}

export function findClubUnit(unitId: string, civCode?: string): VendoredUnit | null {
  return clubUnits(civCode).find((unit) => unit.id === unitId) ?? null
}

/** One-shot army bill, matching the AoE4 Club cost-calculator workflow. */
export function armyCost(
  lines: ArmyLine[],
  options: { civCode?: string; foodSource?: string } = {},
): ArmyCostResult {
  const foodSource = options.foodSource ?? 'sheep'
  const rates = DEFAULT_GATHER_RATES[foodSource] ?? DEFAULT_GATHER_RATES.sheep!
  const byId = new Map(clubUnits(options.civCode).map((unit) => [unit.id, unit]))
  const resolved = lines
    .map((line) => {
      const unit = byId.get(line.unitId)
      const count = Math.max(0, Math.floor(line.count))
      if (!unit || count === 0) return null
      const costs = costsOf(unit)
      return {
        unit,
        count,
        food: costs.food * count,
        wood: costs.wood * count,
        gold: costs.gold * count,
        stone: costs.stone * count,
        pop: (unit.costs?.popcap ?? 1) * count,
        trainTime: (unit.costs?.time ?? 0) * count,
      }
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)

  const totals = resolved.reduce(
    (acc, row) => ({
      food: acc.food + row.food,
      wood: acc.wood + row.wood,
      gold: acc.gold + row.gold,
      stone: acc.stone + row.stone,
      pop: acc.pop + row.pop,
      trainTime: acc.trainTime + row.trainTime,
    }),
    { food: 0, wood: 0, gold: 0, stone: 0, pop: 0, trainTime: 0 },
  )
  return {
    lines: resolved,
    totals,
    foodSource,
    villagerSeconds: {
      food: rates.food > 0 ? (totals.food / rates.food) * 60 : 0,
      wood: rates.wood > 0 ? (totals.wood / rates.wood) * 60 : 0,
      gold: rates.gold > 0 ? (totals.gold / rates.gold) * 60 : 0,
      stone: rates.stone > 0 ? (totals.stone / rates.stone) * 60 : 0,
    },
  }
}

function fmt(value: number | null | undefined, digits = 1): string {
  if (value == null || !Number.isFinite(value)) return '—'
  return value.toFixed(digits).replace(/\.0$/, '')
}

export function compareUnits(left: VendoredUnit, right: VendoredUnit): UnitCompareRow[] {
  const pairs: Array<[string, number | null | undefined, number | null | undefined, boolean]> = [
    ['Hit points', left.hitpoints, right.hitpoints, true],
    ['Melee armor', left.armor.melee, right.armor.melee, true],
    ['Ranged armor', left.armor.ranged, right.armor.ranged, true],
    ['Attack', attackDamage(left), attackDamage(right), true],
    ['DPS', unitDps(left), unitDps(right), true],
    ['Move speed', left.movementSpeed ?? null, right.movementSpeed ?? null, true],
    ['Food', left.costs?.food ?? 0, right.costs?.food ?? 0, false],
    ['Wood', left.costs?.wood ?? 0, right.costs?.wood ?? 0, false],
    ['Gold', left.costs?.gold ?? 0, right.costs?.gold ?? 0, false],
    ['Stone', left.costs?.stone ?? 0, right.costs?.stone ?? 0, false],
    ['Pop', left.costs?.popcap ?? 1, right.costs?.popcap ?? 1, false],
    ['Train time', left.costs?.time ?? 0, right.costs?.time ?? 0, false],
    ['Age', left.minAge, right.minAge, false],
  ]
  return pairs.map(([key, l, r, higherWins]) => {
    const leftN = l ?? Number.NaN
    const rightN = r ?? Number.NaN
    let advantage: UnitCompareRow['advantage'] = 'even'
    if (Number.isFinite(leftN) && Number.isFinite(rightN) && leftN !== rightN) {
      const leftBetter = higherWins ? leftN > rightN : leftN < rightN
      advantage = leftBetter ? 'left' : 'right'
    }
    return { key, left: fmt(l), right: fmt(r), advantage }
  })
}

export function dpsPreview(left: VendoredUnit, right: VendoredUnit): DpsPreview {
  const edge = evaluateUnitMatchup(left, right)
  return {
    left,
    right,
    leftDps: unitDps(left),
    rightDps: unitDps(right),
    leftTtkSec: timeToKillSec(left, right),
    rightTtkSec: timeToKillSec(right, left),
    matchupScore: edge.score,
    relation: edge.relation,
    reasons: edge.reasons,
  }
}
