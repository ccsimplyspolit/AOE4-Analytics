/**
 * Data-driven counter candidates inspired by War Room's explainable model.
 *
 * This is deliberately not a combat simulator: the bundled AoE4World unit
 * projection does not contain every active ability, formation or map effect.
 * It combines the curated role graph with real unit availability, age, cost and
 * training time so the UI can answer the useful question: "what can my civ
 * produce now that answers this observed threat?"
 */
import { UNITS, unitsForCiv, type VendoredUnit, type VendoredWeapon } from '@data/gameData'
import { COUNTER_MATRIX, roleFromUnit, whatBeats, type UnitRole } from './counters'

export type CounterRelation = 'hard' | 'soft'
export type CounterGraphRelation = 'hard' | 'soft' | 'even' | 'disadvantage'

export interface CounterGraphEdge {
  attacker: VendoredUnit
  defender: VendoredUnit
  relation: CounterGraphRelation
  /** Stable ranking score, not a win probability. */
  score: number
  confidencePct: number
  reasons: string[]
}

export interface CounterGraphCoverage {
  units: number
  directedPairs: number
  roleTaggedPairs: number
  hardCounterEdges: number
  disadvantageEdges: number
  source: 'war-room-role-model'
  sourceRevision: string
}

export interface UnitCounterOptions {
  /** Only return answers that can be trained by this age. */
  maxAge?: number
}

export interface UnitCounterCandidate {
  unit: VendoredUnit
  role: UnitRole
  score: number
  relation: CounterRelation
  resourceTotal: number | null
  trainingTimeSec: number | null
  reasons: string[]
}

export interface UnitCounterRow {
  target: VendoredUnit
  targetRole: UnitRole
  candidates: UnitCounterCandidate[]
}

function totalCost(unit: VendoredUnit): number {
  return unit.costs?.total && unit.costs.total > 0
    ? unit.costs.total
    : unit.costs
      ? unit.costs.food + unit.costs.wood + unit.costs.gold + unit.costs.stone
      : 0
}

function roleRelation(attacker: UnitRole | null, defender: UnitRole | null): CounterGraphRelation {
  if (!attacker || !defender) return 'even'
  const entry = COUNTER_MATRIX[attacker]
  if (entry.strongVs.includes(defender)) return 'hard'
  if (entry.weakVs.includes(defender)) return 'disadvantage'
  return 'even'
}

function effectiveDamage(attacker: VendoredUnit, defender: VendoredUnit): number {
  const damage = attacker.attack?.damage ?? 0
  const armorType = attacker.attack?.type === 'ranged' ? 'ranged' : 'melee'
  const armor = defender.armor?.[armorType] ?? 0
  return Math.max(1, damage - armor)
}

export type MatchupMode = 'resources' | 'count'
export type MatchupTerrain = 'open' | 'choke' | 'forest'
export type MatchupMicro = 'amove' | 'solid' | 'strong'

/** User-adjustable context for the War Room-style learning model. */
export interface MatchupContextOptions {
  mode?: MatchupMode
  /** Resources available to each side when mode is `resources`. */
  budget?: number
  /** Units per side when mode is `count`. */
  count?: number
  terrain?: MatchupTerrain
  micro?: MatchupMicro
  /** Relative upgrade lead: -2 means the attacker is two levels behind. */
  upgradeAdvantage?: number
}

export type MatchupVerdict =
  | 'hard-counter'
  | 'soft-counter'
  | 'skill-matchup'
  | 'soft-loss'
  | 'hard-loss'
  | 'not-comparable'

export interface MatchupWeaponEvidence {
  damage: number
  bonus: number
  armor: number
  dps: number
  range: number
  type: string
}

export interface ContextualMatchupResult {
  comparable: boolean
  verdict: MatchupVerdict
  /** Strength ratio for attacker / defender. This is not a win probability. */
  ratio: number
  confidencePct: number
  attackerCount: number
  defenderCount: number
  attackerStrength: number
  defenderStrength: number
  attackerWeapon: MatchupWeaponEvidence
  defenderWeapon: MatchupWeaponEvidence
  reasons: string[]
}

const MATCHUP_DEFAULTS: Required<MatchupContextOptions> = {
  mode: 'resources',
  budget: 720,
  count: 10,
  terrain: 'open',
  micro: 'solid',
  upgradeAdvantage: 0,
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function unitClasses(unit: VendoredUnit): Set<string> {
  return new Set(unit.classes.map((value) => value.toLowerCase()))
}

function hasClass(unit: VendoredUnit, ...names: string[]): boolean {
  const classes = unitClasses(unit)
  return names.some((name) => classes.has(name))
}

function isRanged(unit: VendoredUnit): boolean {
  return hasClass(unit, 'ranged', 'ranged_infantry', 'cavalry_archer') || unit.attack?.type === 'ranged'
}

function isCavalry(unit: VendoredUnit): boolean {
  return hasClass(unit, 'cavalry', 'military_cavalry', 'horse')
}

function isInfantry(unit: VendoredUnit): boolean {
  return hasClass(unit, 'infantry', 'melee_infantry', 'ranged_infantry')
}

function isSiege(unit: VendoredUnit): boolean {
  return hasClass(unit, 'siege', 'siege_engine', 'siege_weapon') || roleFromUnit(unit) === 'mangonel'
}

function isNaval(unit: VendoredUnit): boolean {
  return hasClass(unit, 'naval', 'water', 'ship')
}

function weaponList(unit: VendoredUnit): VendoredWeapon[] {
  if (unit.weapons && unit.weapons.length > 0) return unit.weapons
  if (!unit.attack) return []
  return [
    {
      name: 'Primary attack',
      type: unit.attack.type,
      damage: unit.attack.damage,
      speed: unit.attack.type === 'ranged' ? 2.2 : 1.8,
      range: unit.attack.type === 'ranged' ? 5 : 0.3,
      modifiers: [],
    },
  ]
}

function matchesWeaponGroup(target: VendoredUnit, group: string[]): boolean {
  const classes = unitClasses(target)
  return group.every((token) => classes.has(token.toLowerCase()))
}

function weaponBonus(weapon: VendoredWeapon, target: VendoredUnit): number {
  return weapon.modifiers.reduce((total, modifier) => {
    const matches = modifier.groups.some((group) => matchesWeaponGroup(target, group))
    return matches ? total + modifier.value : total
  }, 0)
}

function contextualWeapon(attacker: VendoredUnit, defender: VendoredUnit): MatchupWeaponEvidence {
  const weapons = weaponList(attacker)
  const candidate = weapons
    .map((weapon) => {
      const bonus = weaponBonus(weapon, defender)
      const armorType = weapon.type === 'ranged' ? 'ranged' : 'melee'
      const armor = defender.armor?.[armorType] ?? 0
      const damage = Math.max(1, weapon.damage + bonus - armor)
      return {
        damage: weapon.damage,
        bonus,
        armor,
        dps: damage / Math.max(0.5, weapon.speed),
        range: weapon.range,
        type: weapon.type,
      }
    })
    .sort((a, b) => b.dps - a.dps)[0]
  return candidate ?? { damage: 0, bonus: 0, armor: 0, dps: 0.05, range: 0, type: 'melee' }
}

function terrainMultiplier(unit: VendoredUnit, terrain: MatchupTerrain): number {
  if (terrain === 'choke') {
    if (isSiege(unit)) return 1.12
    if (isRanged(unit)) return 1.08
    if (isCavalry(unit)) return 0.88
  }
  if (terrain === 'open') {
    if (isCavalry(unit)) return 1.08
    if (isRanged(unit)) return 1.04
  }
  if (terrain === 'forest') {
    if (isRanged(unit)) return 0.93
    if (isInfantry(unit)) return 1.05
  }
  return 1
}

function microMultiplier(unit: VendoredUnit, opponent: VendoredUnit, micro: MatchupMicro): number {
  if (micro === 'amove') return 1
  let multiplier = 1
  if (isRanged(unit)) multiplier += micro === 'strong' ? 0.14 : 0.07
  if (isCavalry(unit)) multiplier += micro === 'strong' ? 0.08 : 0.04
  const speed = unit.movementSpeed ?? (isCavalry(unit) ? 1.6 : 1.1)
  const opponentSpeed = opponent.movementSpeed ?? (isCavalry(opponent) ? 1.6 : 1.1)
  if (isRanged(unit) && speed > opponentSpeed && !isRanged(opponent)) {
    multiplier += micro === 'strong' ? 0.1 : 0.04
  }
  return multiplier
}

function contextualVerdict(ratio: number, sameUnit: boolean): MatchupVerdict {
  if (sameUnit) return 'skill-matchup'
  if (ratio >= 1.52) return 'hard-counter'
  if (ratio >= 1.16) return 'soft-counter'
  if (ratio > 0.86) return 'skill-matchup'
  if (ratio > 0.66) return 'soft-loss'
  return 'hard-loss'
}

function contextualReasons(
  attacker: VendoredUnit,
  defender: VendoredUnit,
  a: MatchupWeaponEvidence,
  b: MatchupWeaponEvidence,
  options: Required<MatchupContextOptions>,
  attackerCount: number,
  defenderCount: number,
  ratio: number,
): string[] {
  const reasons: string[] = []
  const attackerRole = roleFromUnit(attacker)
  const defenderRole = roleFromUnit(defender)
  const relation = roleRelation(attackerRole, defenderRole)
  if (relation === 'hard') reasons.push('Role graph: hard counter.')
  else if (relation === 'soft') reasons.push('Role graph: soft answer.')
  else if (relation === 'disadvantage') reasons.push('Role graph: disadvantage.')
  else reasons.push('Role graph: no explicit edge.')
  if (a.bonus > 0) reasons.push(`+${Math.round(a.bonus)} bonus damage against the target classes.`)
  if (b.bonus > 0) reasons.push(`The target has +${Math.round(b.bonus)} bonus damage against the attacker classes.`)
  if (options.mode === 'resources') {
    reasons.push(
      `At ${Math.round(options.budget)} resources: ${attackerCount.toFixed(1)} vs ${defenderCount.toFixed(1)} units.`,
    )
  } else {
    reasons.push(`At equal count: ${attackerCount.toFixed(0)} vs ${defenderCount.toFixed(0)} units.`)
  }
  if (options.terrain === 'choke') reasons.push('Choke: frontage, ranged fire and siege matter more.')
  if (options.terrain === 'forest') reasons.push('Forest: shortened sight lines reduce ranged efficiency.')
  if (options.terrain === 'open') reasons.push('Open field: mobility and kiting have more room.')
  if (options.micro === 'strong') reasons.push('Strong micro rewards range, speed and focus fire.')
  if (options.micro === 'amove') reasons.push('A-move: control-dependent advantages are reduced.')
  if (options.upgradeAdvantage !== 0) {
    reasons.push(
      `Relative upgrade advantage: ${options.upgradeAdvantage > 0 ? '+' : ''}${options.upgradeAdvantage}.`,
    )
  }
  if (reasons.length < 4) {
    reasons.push(
      ratio >= 1
        ? 'Damage, durability and economy align better in this scenario.'
        : 'Without a class edge, positioning, support and focus fire remain decisive.',
    )
  }
  reasons.push('Learning model only: not a frame-accurate simulator or win probability.')
  return reasons.slice(0, 6)
}

/**
 * Evaluate a pair with War Room-style context controls while staying inside
 * the compact, versioned AoE4World snapshot. This is intentionally separate
 * from `evaluateUnitMatchup`, which remains the stable role-graph API.
 */
export function calculateContextualMatchup(
  attacker: VendoredUnit,
  defender: VendoredUnit,
  input: MatchupContextOptions = {},
): ContextualMatchupResult {
  const options = { ...MATCHUP_DEFAULTS, ...input }
  if (isNaval(attacker) !== isNaval(defender)) {
    const empty = { damage: 0, bonus: 0, armor: 0, dps: 0, range: 0, type: 'melee' }
    return {
      comparable: false,
      verdict: 'not-comparable',
      ratio: 1,
      confidencePct: 0,
      attackerCount: 0,
      defenderCount: 0,
      attackerStrength: 0,
      defenderStrength: 0,
      attackerWeapon: empty,
      defenderWeapon: empty,
      reasons: ['Land and naval units are evaluated in separate domains.'],
    }
  }
  const attackerWeapon = contextualWeapon(attacker, defender)
  const defenderWeapon = contextualWeapon(defender, attacker)
  const attackerCost = Math.max(1, totalCost(attacker))
  const defenderCost = Math.max(1, totalCost(defender))
  const attackerCount = options.mode === 'resources'
    ? Math.max(0.35, options.budget / attackerCost)
    : clamp(options.count, 1, 100)
  const defenderCount = options.mode === 'resources'
    ? Math.max(0.35, options.budget / defenderCost)
    : clamp(options.count, 1, 100)
  const attackerHp = Math.max(20, attacker.hitpoints ?? 75)
  const defenderHp = Math.max(20, defender.hitpoints ?? 75)
  const attackerTactical =
    terrainMultiplier(attacker, options.terrain) *
    microMultiplier(attacker, defender, options.micro) *
    (1 + clamp(options.upgradeAdvantage, -2, 2) * 0.075)
  const defenderTactical =
    terrainMultiplier(defender, options.terrain) * microMultiplier(defender, attacker, options.micro)
  const attackerRole = roleRelation(roleFromUnit(attacker), roleFromUnit(defender))
  const defenderRole = roleRelation(roleFromUnit(defender), roleFromUnit(attacker))
  const roleMultiplier = (relation: CounterGraphRelation) =>
    relation === 'hard' ? 1.25 : relation === 'soft' ? 1.1 : relation === 'disadvantage' ? 0.78 : 1
  const attackerStrength =
    Math.sqrt(Math.max(0.05, attackerWeapon.dps) * attackerHp) *
    attackerCount * attackerTactical * roleMultiplier(attackerRole)
  const defenderStrength =
    Math.sqrt(Math.max(0.05, defenderWeapon.dps) * defenderHp) *
    defenderCount * defenderTactical * roleMultiplier(defenderRole)
  const ratio = attackerStrength / Math.max(0.01, defenderStrength)
  const confidencePct = Math.min(96, Math.round(54 + Math.abs(Math.log2(ratio)) * 24))
  return {
    comparable: true,
    verdict: contextualVerdict(ratio, attacker.id === defender.id),
    ratio,
    confidencePct,
    attackerCount,
    defenderCount,
    attackerStrength,
    defenderStrength,
    attackerWeapon,
    defenderWeapon,
    reasons: contextualReasons(
      attacker,
      defender,
      attackerWeapon,
      defenderWeapon,
      options,
      attackerCount,
      defenderCount,
      ratio,
    ),
  }
}

/**
 * Evaluate one directed unit pair using the War Room role graph plus the
 * compact AoE4World combat snapshot. This deliberately returns a ranking and
 * confidence, never a simulated win probability.
 */
export function evaluateUnitMatchup(
  attacker: VendoredUnit,
  defender: VendoredUnit,
): CounterGraphEdge {
  const relation = roleRelation(roleFromUnit(attacker), roleFromUnit(defender))
  const attackerCost = Math.max(1, totalCost(attacker))
  const defenderCost = Math.max(1, totalCost(defender))
  const attackerDurability = Math.max(1, attacker.hitpoints ?? 1)
  const defenderDurability = Math.max(1, defender.hitpoints ?? 1)
  const damageRatio = effectiveDamage(attacker, defender) / effectiveDamage(defender, attacker)
  const durabilityRatio = attackerDurability / defenderDurability
  const resourceRatio = defenderCost / attackerCost
  const roleScore = relation === 'hard' ? 42 : relation === 'soft' ? 18 : relation === 'disadvantage' ? -34 : 0
  const score = Math.round((roleScore + damageRatio * 8 + durabilityRatio * 4 + resourceRatio * 3) * 10) / 10
  const reasons: string[] = []
  if (relation === 'hard') reasons.push('War Room role graph marks this as a hard counter.')
  else if (relation === 'disadvantage') reasons.push('War Room role graph marks this as a disadvantage.')
  else if (relation === 'soft') reasons.push('War Room role graph marks this as a soft answer.')
  else reasons.push('No explicit role edge was found.')
  if (resourceRatio >= 1.1) reasons.push('The attacker has a lower total resource cost.')
  if (damageRatio >= 1.1) reasons.push('The compact damage-versus-armor estimate favors the attacker.')
  if (attacker.minAge <= defender.minAge) reasons.push('Available by the same or earlier age.')
  reasons.push('Bonuses, upgrades, formations, terrain and active abilities are not simulated.')
  return {
    attacker,
    defender,
    relation,
    score,
    confidencePct: relation === 'hard' || relation === 'disadvantage' ? 86 : relation === 'soft' ? 72 : 55,
    reasons,
  }
}

let coverageCache: CounterGraphCoverage | null = null

/** Returns the auditable 205×205 directed pair-space represented by the model. */
export function counterGraphCoverage(): CounterGraphCoverage {
  if (coverageCache) return coverageCache
  let roleTaggedPairs = 0
  let hardCounterEdges = 0
  let disadvantageEdges = 0
  const allUnits = unitsForCivAll()
  for (const attacker of allUnits) {
    for (const defender of allUnits) {
      const edge = evaluateUnitMatchup(attacker, defender)
      if (!roleFromUnit(attacker) || !roleFromUnit(defender)) continue
      roleTaggedPairs += 1
      if (edge.relation === 'hard') hardCounterEdges += 1
      if (edge.relation === 'disadvantage') disadvantageEdges += 1
    }
  }
  coverageCache = {
    units: allUnits.length,
    directedPairs: allUnits.length * allUnits.length,
    roleTaggedPairs,
    hardCounterEdges,
    disadvantageEdges,
    source: 'war-room-role-model',
    sourceRevision: 'bfc9660a71180c91ea99748e2b0f4d70bfa3445d',
  }
  return coverageCache
}

function unitsForCivAll(): VendoredUnit[] {
  // `unitsForCiv` intentionally requires a civilization slug while the
  // vendored records store short data codes. Iterate the already-normalized
  // snapshot directly so a code/slug mismatch can never collapse coverage to
  // zero units.
  const seen = new Map<string, VendoredUnit>()
  for (const unit of UNITS) seen.set(unit.id, unit)
  return [...seen.values()]
}

function counterScore(
  unit: VendoredUnit,
  target: VendoredUnit,
  counterRole: UnitRole,
  roleIndex: number,
): number {
  const agePenalty = Math.max(0, unit.minAge - target.minAge) * 7
  const cost = totalCost(unit)
  const time = unit.costs?.time ?? 0
  const affordability = cost > 0 ? Math.max(0, 12 - cost / 80) : 0
  const production = time > 0 ? Math.max(0, 8 - time / 20) : 0
  const rolePriority = Math.max(0, 20 - roleIndex * 6)
  const sameRoleBonus = COUNTER_MATRIX[counterRole].strongVs.includes(roleFromUnit(target)!) ? 4 : 0
  // Stable tie-break ingredients; this is a ranking score, not a probability.
  return rolePriority + affordability + production - agePenalty + sameRoleBonus
}

function reasonsFor(unit: VendoredUnit, target: VendoredUnit, targetRole: UnitRole): string[] {
  const reasons = [`${unit.name} is a ${roleFromUnit(unit) ?? 'role'} answer to ${target.name}`]
  if (unit.minAge <= target.minAge) reasons.push('available by the same age')
  else reasons.push(`available in age ${unit.minAge}`)
  if (totalCost(unit) > 0 && totalCost(unit) <= totalCost(target))
    reasons.push('lower resource cost')
  if ((unit.costs?.time ?? 0) > 0 && (unit.costs?.time ?? 0) <= (target.costs?.time ?? 0)) {
    reasons.push('faster training line')
  }
  if (targetRole === 'mangonel' || targetRole === 'springald') reasons.push('anti-siege role')
  return reasons
}

/** Rank available units from one responding civ against one target unit. */
export function counterCandidatesForTarget(
  target: VendoredUnit,
  available: VendoredUnit[],
  maxCandidates = 4,
  options: UnitCounterOptions = {},
): UnitCounterCandidate[] {
  const targetRole = roleFromUnit(target)
  if (!targetRole) return []
  const counters = whatBeats(targetRole)
  return available
    .map((unit) => {
      const role = roleFromUnit(unit)
      const roleIndex = role ? counters.findIndex((counter) => counter.role === role) : -1
      if (
        !role ||
        roleIndex < 0 ||
        unit.id === target.id ||
        (options.maxAge != null && unit.minAge > options.maxAge)
      )
        return null
      return {
        unit,
        role,
        score: Math.round((counterScore(unit, target, role, roleIndex) + evaluateUnitMatchup(unit, target).score / 20) * 10) / 10,
        relation: COUNTER_MATRIX[role].strongVs.includes(targetRole) ? 'hard' : 'soft',
        resourceTotal: totalCost(unit) || null,
        trainingTimeSec: unit.costs?.time ?? null,
        reasons: reasonsFor(unit, target, targetRole),
      }
    })
    .filter((candidate): candidate is UnitCounterCandidate => candidate !== null)
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.unit.minAge - b.unit.minAge ||
        a.unit.name.localeCompare(b.unit.name),
    )
    .slice(0, Math.max(1, maxCandidates))
}

/** Build a compact threat→answer matrix for two civilizations. */
export function counterRowsForCivs(
  targetCiv: string,
  respondingCiv: string,
  maxThreats = 8,
  maxCandidates = 3,
  options: UnitCounterOptions = {},
): UnitCounterRow[] {
  const targetUnits = unitsForCiv(targetCiv)
    .filter((unit) => roleFromUnit(unit) !== null)
    .sort((a, b) => a.minAge - b.minAge || a.name.localeCompare(b.name))
  const threats: VendoredUnit[] = []
  const seenRoles = new Set<UnitRole>()
  for (const unit of targetUnits) {
    const role = roleFromUnit(unit)
    if (!role || seenRoles.has(role)) continue
    seenRoles.add(role)
    threats.push(unit)
    if (threats.length >= maxThreats) break
  }
  const available = unitsForCiv(respondingCiv)
  return threats.map((target) => ({
    target,
    targetRole: roleFromUnit(target)!,
    candidates: counterCandidatesForTarget(target, available, maxCandidates, options),
  }))
}
