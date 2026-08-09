import { parseDuration } from './format'
import { parseNote, type BuildOrder } from './buildOrderSchema'

export type BuildValidationSeverity = 'error' | 'warning'

export interface BuildValidationIssue {
  severity: BuildValidationSeverity
  code:
    | 'invalid-time'
    | 'time-regression'
    | 'invalid-age'
    | 'age-regression'
    | 'age-gap'
    | 'invalid-count'
    | 'population-underflow'
    | 'resource-allocation'
    | 'villager-regression'
    | 'impossible-timing'
    | 'age-requirement'
    | 'resource-shortage'
  stepIndex: number
  message: string
}

export interface BuildValidationUnit {
  id: string
  name: string
  minAge: number
  costs?: { food: number; wood: number; gold: number; stone: number } | null
}

export interface BuildValidationContext {
  /** Optional versioned AoE4World unit projection for requirement checks. */
  units?: readonly BuildValidationUnit[]
  startingResources?: Partial<Record<(typeof RESOURCE_KEYS)[number], number>>
  gatherRates?: Partial<Record<(typeof RESOURCE_KEYS)[number], number>>
}

export interface BuildValidationResult {
  ok: boolean
  issues: BuildValidationIssue[]
  errors: BuildValidationIssue[]
  warnings: BuildValidationIssue[]
}

const RESOURCE_KEYS = ['food', 'wood', 'gold', 'stone'] as const
const DEFAULT_STARTING_RESOURCES = { food: 200, wood: 0, gold: 0, stone: 0 }
const DEFAULT_GATHER_RATES = { food: 37, wood: 31, gold: 37, stone: 37 }

function normalized(value: string): string {
  return value
    .toLocaleLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function noteText(notes: string[]): string {
  return notes
    .flatMap((note) => parseNote(note))
    .map((part) => (part.type === 'text' ? part.text : part.path.replace(/[-_/]/g, ' ')))
    .join(' ')
    .toLocaleLowerCase()
}

function mentionedUnits(
  text: string,
  units: readonly BuildValidationUnit[],
): BuildValidationUnit[] {
  return units.filter((unit) => {
    const aliases = [unit.id, unit.name].map(normalized).filter((alias) => alias.length >= 4)
    return aliases.some((alias) => text.includes(alias))
  })
}

function mentionCount(text: string, unit: BuildValidationUnit): number {
  const alias = [unit.id, unit.name]
    .map(normalized)
    .filter((value) => value.length >= 4)
    .sort((left, right) => right.length - left.length)[0]
  if (!alias) return 1
  const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = text.match(new RegExp(`(?:^|\\D)(\\d+)\\s*(?:x\\s*)?${escaped}(?:s)?(?:\\D|$)`))
  return match ? Math.max(1, Number(match[1])) : 1
}

/**
 * Checks the parts that a structural JSON schema cannot: monotonic clock/age,
 * feasible villager allocation, population relationships and known unit-age
 * requirements. Economic checks are deliberately conservative because an
 * RTS_Overlay step stores worker assignments, not an exact bank ledger.
 */
export function validateBuildOrderFeasibility(
  build: BuildOrder,
  context: BuildValidationContext = {},
): BuildValidationResult {
  const issues: BuildValidationIssue[] = []
  let previousTime: number | null = null
  let previousAge: number | null = null
  let previousVillagers: number | null = null
  let previousAssignments: Record<(typeof RESOURCE_KEYS)[number], number> | null = null
  const bank = { ...DEFAULT_STARTING_RESOURCES, ...(context.startingResources ?? {}) }
  const gatherRates = { ...DEFAULT_GATHER_RATES, ...(context.gatherRates ?? {}) }

  const add = (
    severity: BuildValidationSeverity,
    code: BuildValidationIssue['code'],
    stepIndex: number,
    message: string,
  ) => issues.push({ severity, code, stepIndex, message })

  build.build_order.forEach((step, index) => {
    const time = step.time == null ? null : parseDuration(step.time)
    if (step.time != null && time == null) {
      add('error', 'invalid-time', index, `Invalid time label “${step.time}”. Use M:SS.`)
    } else if (time != null && previousTime != null) {
      if (time < previousTime) {
        add('error', 'time-regression', index, 'Step time moves backwards.')
      }
      if (time >= previousTime && previousAssignments) {
        const minutes = (time - previousTime) / 60
        for (const key of RESOURCE_KEYS) {
          bank[key] += previousAssignments[key] * gatherRates[key] * minutes
        }
      }
      if (
        step.villager_count >= 0 &&
        previousVillagers != null &&
        previousVillagers >= 0 &&
        step.villager_count - previousVillagers > Math.max(3, Math.ceil((time - previousTime) / 12))
      ) {
        add(
          'warning',
          'impossible-timing',
          index,
          'Villager count jumps faster than a normal Town Center production window; check the timestamp or skipped steps.',
        )
      }
    }
    if (time != null) previousTime = time

    if (!Number.isInteger(step.age) || (step.age !== -1 && (step.age < 1 || step.age > 4))) {
      add(
        'error',
        'invalid-age',
        index,
        'Age must be 1–4, or -1 when the provider left it unspecified.',
      )
    } else if (step.age >= 1 && previousAge != null) {
      if (step.age < previousAge) add('error', 'age-regression', index, 'Age moves backwards.')
      if (step.age - previousAge > 1) {
        add(
          'warning',
          'age-gap',
          index,
          'The build skips an age checkpoint; verify the requirement chain.',
        )
      }
    }
    if (step.age >= 1) previousAge = step.age

    for (const key of ['population_count', 'villager_count'] as const) {
      const value = step[key]
      if (!Number.isInteger(value) || value < -1) {
        add(
          'error',
          'invalid-count',
          index,
          `${key} must be a non-negative integer or -1 when unknown.`,
        )
      }
    }
    if (
      step.population_count >= 0 &&
      step.villager_count >= 0 &&
      step.population_count < step.villager_count
    ) {
      add('error', 'population-underflow', index, 'Population is smaller than villager count.')
    }
    if (
      step.villager_count >= 0 &&
      previousVillagers != null &&
      step.villager_count < previousVillagers
    ) {
      add(
        'warning',
        'villager-regression',
        index,
        'Villager count decreases; verify this is intentional.',
      )
    }
    if (step.villager_count >= 0) previousVillagers = step.villager_count

    const assignmentValues = RESOURCE_KEYS.map((key) => step.resources[key])
    for (const key of RESOURCE_KEYS) {
      const value = step.resources[key]
      if (!Number.isInteger(value) || value < -1) {
        add(
          'error',
          'invalid-count',
          index,
          `resources.${key} must be a non-negative integer or -1.`,
        )
      }
    }
    if (
      step.resources.builder !== undefined &&
      (!Number.isInteger(step.resources.builder) || step.resources.builder < -1)
    ) {
      add(
        'error',
        'invalid-count',
        index,
        'resources.builder must be a non-negative integer or -1.',
      )
    }
    const knownAssignments = assignmentValues.every((value) => value >= 0)
    const buildersKnown = step.resources.builder === undefined || step.resources.builder >= 0
    if (step.villager_count >= 0 && knownAssignments && buildersKnown) {
      const assigned =
        assignmentValues.reduce((sum, value) => sum + value, 0) +
        Math.max(0, step.resources.builder ?? 0)
      if (assigned > step.villager_count) {
        add(
          'error',
          'resource-allocation',
          index,
          'Resource assignments and builders exceed the villager count.',
        )
      }
      if (step.resources.builder != null && step.resources.builder > step.villager_count) {
        add('error', 'resource-allocation', index, 'Builder count exceeds the villager count.')
      }
    }

    const text = noteText(step.notes)
    const units = mentionedUnits(text, context.units ?? [])
    for (const unit of units) {
      if (step.age >= 1 && unit.minAge > step.age) {
        add(
          'error',
          'age-requirement',
          index,
          `${unit.name} requires age ${unit.minAge}, but this step is age ${step.age}.`,
        )
      }
      if (unit.costs && time != null) {
        const count = mentionCount(text, unit)
        for (const resource of RESOURCE_KEYS) {
          bank[resource] -= Math.max(0, unit.costs[resource]) * count
          if (bank[resource] < -0.01) {
            add(
              'warning',
              'resource-shortage',
              index,
              `${unit.name} appears to require ${Math.ceil(-bank[resource])} more ${resource} than the timed economy can supply.`,
            )
            bank[resource] = 0
          }
        }
      } else if (unit.costs && knownAssignments && step.villager_count >= 0) {
        const available = assignmentValues.reduce((sum, value) => sum + Math.max(0, value), 0)
        const cost = Object.values(unit.costs).reduce((sum, value) => sum + Math.max(0, value), 0)
        if (cost > 0 && available === 0) {
          add(
            'warning',
            'resource-shortage',
            index,
            `${unit.name} is scheduled with no active resource assignment; check the bank before production.`,
          )
        }
      }
    }
    if (time != null && knownAssignments) {
      previousAssignments = Object.fromEntries(
        RESOURCE_KEYS.map((key) => [key, Math.max(0, step.resources[key])]),
      ) as Record<(typeof RESOURCE_KEYS)[number], number>
    }
  })

  const errors = issues.filter((issue) => issue.severity === 'error')
  const warnings = issues.filter((issue) => issue.severity === 'warning')
  return { ok: errors.length === 0, issues, errors, warnings }
}
