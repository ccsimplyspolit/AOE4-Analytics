/**
 * Pure production-planning math for the Tincture screen.
 *
 * The renderer supplies unit facts from the vendored AoE4World data snapshot;
 * this module deliberately knows nothing about Electron, React, or IO.
 */

export const PRODUCTION_RESOURCES = ['food', 'wood', 'gold', 'stone'] as const
export type ProductionResource = (typeof PRODUCTION_RESOURCES)[number]

export type ResourceAmounts = Record<ProductionResource, number>

export type ProductionMode = 'buildings' | 'unitsPerMinute'

export interface ProductionRuleTarget {
  unitIds?: string[]
  classes?: string[]
  producedBy?: string[]
}

export interface ProductionModifier {
  id: string
  label: string
  description: string
  kind: 'gathering' | 'speed' | 'cost' | 'dropOff' | 'passive'
  defaultSelected?: boolean
  age?: number
  foodSources?: string[]
  target?: ProductionRuleTarget
  multiplier?: number
  resourceMultiplier?: Partial<ResourceAmounts>
  dropOffPercent?: Partial<ResourceAmounts>
  passivePerMinute?: Partial<ResourceAmounts>
}

export interface ProductionUnitLike {
  id: string
  name: string
  time: number
  costs: ResourceAmounts
  icon?: string | null
  classes?: string[]
  producedBy?: string[]
  minAge?: number
}

export interface ProductionLine {
  unitId: string
  count: number
}

export interface GatherRates {
  food: number
  wood: number
  gold: number
  stone: number
}

export const DEFAULT_GATHER_RATES: Record<string, GatherRates> = {
  sheep: { food: 37.05, wood: 31, gold: 37, stone: 37 },
  deer: { food: 41.7, wood: 31, gold: 37, stone: 37 },
  berry: { food: 32.93, wood: 31, gold: 37, stone: 37 },
  farm: { food: 36.718, wood: 31, gold: 37, stone: 37 },
  cattle: { food: 40.78, wood: 31, gold: 37, stone: 37 },
  stockyard: { food: 38.67, wood: 31, gold: 37, stone: 37 },
}

export interface ProductionCalculatorInput {
  units: ProductionUnitLike[]
  lines: ProductionLine[]
  foodSource?: string
  gatherRates?: Record<string, GatherRates>
  speedPercent?: number
  discountPercent?: number
  passive?: Partial<ResourceAmounts>
  minFoodVillagers?: number
  mode?: ProductionMode
  age?: number
  customGatherRates?: GatherRates
  modifiers?: ProductionModifier[]
  selectedModifierIds?: string[]
}

export interface ProductionLineResult {
  unit: ProductionUnitLike
  count: number
  unitsPerMinute: number
  buildingsRequired: number
  perMinute: ResourceAmounts
}

export interface ProductionResult {
  rates: GatherRates
  lines: ProductionLineResult[]
  totals: ResourceAmounts
  net: ResourceAmounts
  villagers: ResourceAmounts
  totalVillagers: number
}

const ZERO_RESOURCES: ResourceAmounts = { food: 0, wood: 0, gold: 0, stone: 0 }

function nonNegative(value: number | undefined): number {
  return Math.max(0, Number.isFinite(value) ? value! : 0)
}

function clampPercent(value: number | undefined): number {
  return Math.min(100, nonNegative(value))
}

function emptyResources(): ResourceAmounts {
  return { ...ZERO_RESOURCES }
}

function matchesTarget(
  unit: ProductionUnitLike,
  target: ProductionRuleTarget | undefined,
): boolean {
  if (!target) return true
  if (target.unitIds && !target.unitIds.includes(unit.id)) return false
  if (target.classes && !target.classes.some((value) => unit.classes?.includes(value))) return false
  if (target.producedBy && !target.producedBy.some((value) => unit.producedBy?.includes(value)))
    return false
  return true
}

function selectedModifiers(input: ProductionCalculatorInput): ProductionModifier[] {
  const selected = input.selectedModifierIds
  return (input.modifiers ?? []).filter((modifier) => {
    if (input.age !== undefined && modifier.age !== undefined && modifier.age !== input.age)
      return false
    return selected ? selected.includes(modifier.id) : modifier.defaultSelected === true
  })
}

function applyResourceMultiplier(
  target: ResourceAmounts,
  multiplier: Partial<ResourceAmounts>,
): void {
  for (const resource of PRODUCTION_RESOURCES) {
    const value = multiplier[resource]
    if (value !== undefined) target[resource] *= Math.max(0, value)
  }
}

function passiveFromModifiers(modifiers: ProductionModifier[]): ResourceAmounts {
  const passive = emptyResources()
  for (const modifier of modifiers) {
    if (modifier.kind !== 'passive' || !modifier.passivePerMinute) continue
    for (const resource of PRODUCTION_RESOURCES)
      passive[resource] += nonNegative(modifier.passivePerMinute[resource])
  }
  return passive
}

function dropOffFromModifiers(modifiers: ProductionModifier[]): ResourceAmounts {
  const dropOff = emptyResources()
  for (const modifier of modifiers) {
    if (modifier.kind !== 'dropOff' || !modifier.dropOffPercent) continue
    for (const resource of PRODUCTION_RESOURCES)
      dropOff[resource] += nonNegative(modifier.dropOffPercent[resource])
  }
  return dropOff
}

/** Calculate continuous production demand and the villagers needed to sustain it. */
export function calculateProduction(input: ProductionCalculatorInput): ProductionResult {
  const foodSource = input.foodSource ?? 'sheep'
  const modifiers = selectedModifiers(input)
  const rates = {
    ...(input.customGatherRates ??
      input.gatherRates?.[foodSource] ??
      DEFAULT_GATHER_RATES[foodSource] ??
      DEFAULT_GATHER_RATES.sheep!),
  }
  const dropOff = dropOffFromModifiers(modifiers)
  for (const resource of PRODUCTION_RESOURCES) rates[resource] *= 1 + dropOff[resource] / 100
  for (const modifier of modifiers) {
    if (modifier.kind !== 'gathering') continue
    if (modifier.foodSources && !modifier.foodSources.includes(foodSource)) continue
    applyResourceMultiplier(rates, modifier.resourceMultiplier ?? {})
  }
  const byId = new Map(input.units.map((unit) => [unit.id, unit]))
  const totals = emptyResources()
  const globalSpeedMultiplier = 1 + clampPercent(input.speedPercent) / 100
  const globalCostMultiplier = 1 - clampPercent(input.discountPercent) / 100
  const mode = input.mode ?? 'buildings'
  const modifierPassive = passiveFromModifiers(modifiers)

  const lines = input.lines
    .map((line) => {
      const unit = byId.get(line.unitId)
      const count = nonNegative(line.count)
      if (!unit || count === 0 || unit.time <= 0) return null

      const speedMultiplier =
        globalSpeedMultiplier *
        modifiers
          .filter((modifier) => modifier.kind === 'speed' && matchesTarget(unit, modifier.target))
          .reduce((value, modifier) => value * Math.max(0, modifier.multiplier ?? 1), 1)
      const costMultiplier =
        globalCostMultiplier *
        modifiers
          .filter((modifier) => modifier.kind === 'cost' && matchesTarget(unit, modifier.target))
          .reduce((value, modifier) => value * Math.max(0, modifier.multiplier ?? 1), 1)
      const unitsPerBuildingPerMinute = (60 / unit.time) * speedMultiplier
      const unitsPerMinute = mode === 'unitsPerMinute' ? count : unitsPerBuildingPerMinute * count
      const buildingsRequired =
        mode === 'unitsPerMinute' ? count / Math.max(0.001, unitsPerBuildingPerMinute) : count
      const perMinute = emptyResources()
      for (const resource of PRODUCTION_RESOURCES) {
        perMinute[resource] = unit.costs[resource] * costMultiplier * unitsPerMinute
        totals[resource] += perMinute[resource]
      }
      return { unit, count, unitsPerMinute, buildingsRequired, perMinute }
    })
    .filter((line): line is ProductionLineResult => line !== null)

  const net = emptyResources()
  const villagers = emptyResources()
  for (const resource of PRODUCTION_RESOURCES) {
    net[resource] = Math.max(
      0,
      totals[resource] - nonNegative(input.passive?.[resource]) - modifierPassive[resource],
    )
    villagers[resource] = net[resource] / Math.max(0.001, rates[resource])
  }
  villagers.food = Math.max(villagers.food, nonNegative(input.minFoodVillagers))

  return {
    rates,
    lines,
    totals,
    net,
    villagers,
    totalVillagers: PRODUCTION_RESOURCES.reduce((sum, resource) => sum + villagers[resource], 0),
  }
}

function normalized(value: string): string {
  return value
    .toLocaleLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** Best-effort extraction of unit mentions from an RTS_Overlay build order. */
export function inferProductionUnitIds(
  build: { build_order: Array<{ notes: string[] }> },
  units: ProductionUnitLike[],
  maxUnits = 8,
): string[] {
  const noteText = normalized(build.build_order.flatMap((step) => step.notes).join(' '))
  const found: string[] = []
  for (const unit of units) {
    const rawAliases = [
      unit.id,
      unit.name,
      unit.id.replace(/man$/i, 'men'),
      unit.name.replace(/man$/i, 'men'),
    ]
    const aliases = rawAliases
      .flatMap((alias) => [alias, `${alias}s`])
      .map(normalized)
      .filter((alias) => alias.length >= 4)
    if (aliases.some((alias) => noteText.includes(alias)) && !found.includes(unit.id)) {
      found.push(unit.id)
    }
    if (found.length >= maxUnits) break
  }
  return found
}
