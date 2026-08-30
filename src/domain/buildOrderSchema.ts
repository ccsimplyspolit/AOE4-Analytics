/**
 * Parser/validator and rendering model for the CraftySalamander RTS_Overlay
 * AoE4 build-order JSON format (D14). Pure — used both to validate
 * bundled builds and to import user-pasted builds. Notes may embed icon tokens
 * of the form `@subfolder/image.webp@`, modelled by `parseNote`.
 */

export interface BuildStepResources {
  food: number
  wood: number
  gold: number
  stone: number
  builder?: number
}

export interface BuildStep {
  population_count: number
  villager_count: number
  age: number
  resources: BuildStepResources
  notes: string[]
  time?: string
  /** AoE4Guides prefixes worked-out timestamps with `~`. */
  timeProvenance?: 'stated' | 'derived'
}

/** Persisted age-arrival metadata inspired by AoE4Guides' age timeline model. */
export interface BuildAgeTiming {
  age: 2 | 3 | 4
  seconds: number
  derived: boolean
  stepIndex: number
}

export interface BuildOrder {
  /** Version of the normalized Tincture/RTS_Overlay-compatible schema. */
  schemaVersion?: 1
  name: string
  civilization: string | string[]
  /** Optional matchup tag used by the RTS Overlay-style faction filter. */
  opponentCivilization?: string | string[] | null
  author?: string
  source?: string
  /** Provider fields preserved when importing from aoe4guides.com. */
  description?: string | null
  video?: string | null
  map?: string | null
  strategy?: string | null
  provider?: string | null
  providerId?: string | null
  score?: number | null
  scoreAllTime?: number | null
  views?: number | null
  likes?: number | null
  upvotes?: number | null
  timeCreated?: string | null
  timeUpdated?: string | null
  season?: number
  /** Source classification used by the Tincture archive/import pipeline. */
  origin?: 'curated' | 'house' | 'imported' | 'video'
  /** Optional patch/update metadata supplied by an importer. */
  patch?: string
  /** Capture timestamp for provider snapshots; distinct from last edit time. */
  capturedAt?: string | null
  updatedAt?: string
  confidence?: number
  sampleSize?: number
  /** Curation metadata (bundled library): why this build earned its slot. */
  reasoning?: string
  // JSON imports widen literals to string, so accept both.
  difficulty?: 'easy' | 'medium' | 'hard' | (string & {})
  /** e.g. "Feudal aggression", "Economy boom", "Fast Castle", "Timing attack". */
  archetype?: string
  /** Derived, provenance-linked observations from recent public videos. */
  video_evidence?: BuildOrderVideoEvidence
  /** Local video-import analysis; omitted from curated builds. */
  tactics?: VideoTactic[]
  transcriptText?: string
  /** Optional precomputed age arrivals; the step list remains the source fallback. */
  ageTimings?: BuildAgeTiming[]
  build_order: BuildStep[]
}

import { parseDuration } from './format'
import { civDisplayName } from './civ'
import type { BuildOrderVideoEvidence, VideoTactic } from './videoEvidence'

export type NotePart = { type: 'text'; text: string } | { type: 'image'; path: string }

export type ValidationResult = { ok: true; value: BuildOrder } | { ok: false; errors: string[] }

export const BUILD_ORDER_SCHEMA_VERSION = 1 as const

function isNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}

/** Decodes provider HTML entities while keeping the result safe for React text rendering. */
export function decodeHtmlEntities(value: string): string {
  let decoded = value
  for (let pass = 0; pass < 3; pass += 1) {
    const next = decoded
      .replace(/&amp;/gi, '&')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;|&apos;/gi, "'")
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&#(\d+);/g, (_match, code: string) => {
        const point = Number(code)
        return point >= 0 && point <= 0x10ffff && Number.isSafeInteger(point)
          ? String.fromCodePoint(point)
          : _match
      })
      .replace(/&#x([0-9a-f]+);/gi, (_match, code: string) => {
        const point = Number.parseInt(code, 16)
        return point >= 0 && point <= 0x10ffff && Number.isSafeInteger(point)
          ? String.fromCodePoint(point)
          : _match
      })
    if (next === decoded) break
    decoded = next
  }
  return decoded
}

/** Splits a note into text and icon-token (`@path@`) parts for rendering. */
export function parseNote(note: string): NotePart[] {
  const segments = decodeHtmlEntities(note).split('@')
  const parts: NotePart[] = []
  segments.forEach((seg, i) => {
    if (i % 2 === 0) {
      if (seg) parts.push({ type: 'text', text: seg })
    } else if (seg) {
      parts.push({ type: 'image', path: seg })
    }
  })
  return parts
}

const ICON_LABEL_ALIASES: Record<string, string> = {
  villager: 'Villager',
  rally: 'Rally',
  sheep: 'Sheep',
  deer: 'Deer',
  food: 'Food',
  wood: 'Wood',
  gold: 'Gold',
  stone: 'Stone',
  house: 'House',
  'resource food': 'Food',
  'resource wood': 'Wood',
  'resource gold': 'Gold',
  'resource stone': 'Stone',
}

/** English label for an overlay icon path such as `unit_worker/villager.webp`. */
export function iconPathLabel(path: string): string {
  const file = path.split('/').pop() ?? path
  const stem = file
    .replace(/\.[^.]+$/, '')
    .replace(/-\d+$/, '')
    .replace(/[_-]+/g, ' ')
    .trim()
  const aliased = ICON_LABEL_ALIASES[stem.toLowerCase()]
  if (aliased) return aliased
  return stem.replace(/\b\w/g, (ch) => ch.toUpperCase())
}

/**
 * Turns a provider note into readable text by substituting icon tokens with
 * their names. Stripping icons instead produced broken English such as
 * "Build first with near supply cap, later build with".
 */
export function flattenNote(note: string): string {
  return parseNote(note)
    .map((part) => (part.type === 'text' ? part.text : ` ${iconPathLabel(part.path)} `))
    .join('')
    .replace(/\s+,/g, ',')
    .replace(/\s+\./g, '.')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Validates an unknown value as an RTS_Overlay build order, collecting errors. */
export function validateBuildOrder(input: unknown): ValidationResult {
  const errors: string[] = []
  const o = input as Record<string, unknown>

  if (!o || typeof o !== 'object') return { ok: false, errors: ['Build order must be an object'] }
  if (typeof o['name'] !== 'string' || !o['name']) errors.push('`name` must be a non-empty string')

  const civ = o['civilization']
  const civOk =
    typeof civ === 'string' || (Array.isArray(civ) && civ.every((c) => typeof c === 'string'))
  if (!civOk) errors.push('`civilization` must be a string or array of strings')
  const opponentCiv = o['opponentCivilization']
  const opponentCivOk =
    opponentCiv == null ||
    typeof opponentCiv === 'string' ||
    (Array.isArray(opponentCiv) && opponentCiv.every((c) => typeof c === 'string'))
  if (!opponentCivOk) {
    errors.push('`opponentCivilization` must be null, a string, or an array of strings')
  }

  const steps = o['build_order']
  if (!Array.isArray(steps) || steps.length === 0) {
    errors.push('`build_order` must be a non-empty array')
  } else {
    steps.forEach((raw, i) => {
      const s = raw as Record<string, unknown>
      const where = `build_order[${i}]`
      if (!isNumber(s['population_count']))
        errors.push(`${where}.population_count must be a number`)
      if (!isNumber(s['villager_count'])) errors.push(`${where}.villager_count must be a number`)
      if (!isNumber(s['age'])) errors.push(`${where}.age must be a number`)
      if (!Array.isArray(s['notes']) || !s['notes'].every((n) => typeof n === 'string')) {
        errors.push(`${where}.notes must be an array of strings`)
      }
      const r = s['resources'] as Record<string, unknown> | undefined
      if (!r || typeof r !== 'object') {
        errors.push(`${where}.resources must be an object`)
      } else {
        for (const key of ['food', 'wood', 'gold', 'stone'] as const) {
          if (!isNumber(r[key])) errors.push(`${where}.resources.${key} must be a number`)
        }
        if (r['builder'] !== undefined && !isNumber(r['builder'])) {
          errors.push(`${where}.resources.builder must be a number when present`)
        }
      }
      if (s['time'] !== undefined && typeof s['time'] !== 'string') {
        errors.push(`${where}.time must be a string when present`)
      }
      if (
        s['timeProvenance'] !== undefined &&
        s['timeProvenance'] !== 'stated' &&
        s['timeProvenance'] !== 'derived'
      ) {
        errors.push(`${where}.timeProvenance must be stated or derived when present`)
      }
    })
  }

  const evidence = o['video_evidence']
  if (evidence !== undefined) {
    if (!evidence || typeof evidence !== 'object') {
      errors.push('`video_evidence` must be an object when present')
    } else {
      const e = evidence as Record<string, unknown>
      if (e['schemaVersion'] !== 1) errors.push('`video_evidence.schemaVersion` must be 1')
      if (typeof e['windowStart'] !== 'string')
        errors.push('`video_evidence.windowStart` must be a string')
      if (typeof e['windowEnd'] !== 'string')
        errors.push('`video_evidence.windowEnd` must be a string')
      if (!isNumber(e['sampleSize'])) errors.push('`video_evidence.sampleSize` must be a number')
      if (!isNumber(e['requestedSampleSize']))
        errors.push('`video_evidence.requestedSampleSize` must be a number')
      if (!Array.isArray(e['sources'])) errors.push('`video_evidence.sources` must be an array')
    }
  }

  if (
    o['origin'] !== undefined &&
    !['curated', 'house', 'imported', 'video'].includes(String(o['origin']))
  ) {
    errors.push('`origin` must be curated, house, imported, or video when present')
  }
  if (o['schemaVersion'] !== undefined && o['schemaVersion'] !== BUILD_ORDER_SCHEMA_VERSION) {
    errors.push('`schemaVersion` must be 1 when present')
  }
  for (const key of ['patch', 'updatedAt'] as const) {
    if (o[key] !== undefined && typeof o[key] !== 'string')
      errors.push(`\`${key}\` must be a string when present`)
  }
  if (
    o['capturedAt'] !== undefined &&
    o['capturedAt'] !== null &&
    typeof o['capturedAt'] !== 'string'
  ) {
    errors.push('`capturedAt` must be a string or null when present')
  }
  for (const key of ['description', 'video', 'strategy', 'provider', 'providerId'] as const) {
    if (o[key] !== undefined && o[key] !== null && typeof o[key] !== 'string')
      errors.push(`\`${key}\` must be a string when present`)
  }
  if (o['map'] !== undefined && o['map'] !== null && typeof o['map'] !== 'string') {
    errors.push('`map` must be a string or null when present')
  }
  if (o['ageTimings'] !== undefined) {
    if (!Array.isArray(o['ageTimings'])) {
      errors.push('`ageTimings` must be an array when present')
    } else {
      o['ageTimings'].forEach((raw, index) => {
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
          errors.push(`ageTimings[${index}] must be an object`)
          return
        }
        const timing = raw as Record<string, unknown>
        if (![2, 3, 4].includes(timing['age'] as number)) {
          errors.push(`ageTimings[${index}].age must be 2, 3, or 4`)
        }
        if (!isNumber(timing['seconds']) || (timing['seconds'] as number) < 0) {
          errors.push(`ageTimings[${index}].seconds must be a non-negative number`)
        }
        if (typeof timing['derived'] !== 'boolean') {
          errors.push(`ageTimings[${index}].derived must be a boolean`)
        }
        if (!Number.isInteger(timing['stepIndex']) || (timing['stepIndex'] as number) < 0) {
          errors.push(`ageTimings[${index}].stepIndex must be a non-negative integer`)
        }
      })
    }
  }
  for (const key of ['score', 'scoreAllTime', 'views', 'likes', 'upvotes'] as const) {
    if (o[key] !== undefined && o[key] !== null && !isNumber(o[key]))
      errors.push(`\`${key}\` must be a number when present`)
  }
  for (const key of ['timeCreated', 'timeUpdated'] as const) {
    if (o[key] !== undefined && o[key] !== null && typeof o[key] !== 'string')
      errors.push(`\`${key}\` must be a string when present`)
  }
  for (const key of ['confidence', 'sampleSize'] as const) {
    if (o[key] !== undefined && !isNumber(o[key]))
      errors.push(`\`${key}\` must be a number when present`)
  }

  if (errors.length > 0) return { ok: false, errors }
  return { ok: true, value: input as BuildOrder }
}

/**
 * Applies the one normalized envelope used by imported, curated and house
 * builds. The source JSON stays compatible with the overlay; this function is
 * the runtime boundary that makes older files behave like current snapshots.
 */
export function normalizeBuildOrder(input: unknown): ValidationResult {
  const result = validateBuildOrder(input)
  if (!result.ok) return result
  return {
    ok: true,
    value: { ...result.value, schemaVersion: BUILD_ORDER_SCHEMA_VERSION },
  }
}

/** Civilization label for display (the format allows a string or array). */
export function buildOrderCivLabel(bo: BuildOrder): string {
  return Array.isArray(bo.civilization) ? bo.civilization.join(', ') : bo.civilization
}

/** Collapse a civ name/slug to a comparison key (lowercase, alphanumerics only). */
function normCiv(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

/**
 * Index of the bundled build whose civilization matches the player's civ, or
 * `null` when the civ is unknown or no bundled build covers it.
 *
 * `civSlug` is an AoE4World slug (`english`, `holy_roman_empire`, `hre`,
 * `house_of_lancaster`…), but build orders store civ **display names**, so we
 * bridge slug→name via `civDisplayName` before comparing. Variant civs
 * (house_of_lancaster, order_of_the_dragon…) have no bundled build of their own
 * and intentionally return `null` — the overlay then leaves the current
 * selection as-is rather than snapping to a wrong/unrelated build.
 */
export function buildIndexForCiv(
  builds: BuildOrder[],
  civSlug: string | null | undefined,
): number | null {
  if (!civSlug) return null
  const want = normCiv(civDisplayName(civSlug))
  if (!want) return null
  const idx = builds.findIndex((b) => {
    const labels = Array.isArray(b.civilization) ? b.civilization : [b.civilization]
    return labels.some((c) => normCiv(c) === want)
  })
  return idx >= 0 ? idx : null
}

/**
 * The build-order step the player should be on at `elapsedSec` of the match —
 * the latest step whose `time` has been reached. Lets the overlay auto-advance
 * the build using the real match clock (we know the live game's start time even
 * though we have no in-game telemetry). Returns 0 before the first timed step.
 */
export function stepIndexForElapsed(steps: BuildStep[], elapsedSec: number): number {
  let idx = 0
  for (let i = 0; i < steps.length; i++) {
    const raw = steps[i]?.time
    const t = raw ? parseDuration(raw) : null
    if (t != null && t <= elapsedSec) idx = i
  }
  return idx
}

/** One row of the condensed "key timings" view: the opening plus each age-up. */
export interface BuildKeyTiming {
  /** The age this checkpoint enters (2–4), or null for the opening step. */
  ageUpTo: 2 | 3 | 4 | null
  /** The step's optional time label (e.g. "5:10"), verbatim. */
  time: string | null
  villagers: number
  population: number
  /** First non-empty note of the step with `@icon@` tokens stripped, or null. */
  note: string | null
}

/**
 * Reduces a full build order (~40 equal-weight steps) to the 1–4 checkpoints a
 * player actually memorizes: the opening step and the first step of each new
 * age. The full step list stays available via BuildOrderViewer.
 */
export function condenseBuildOrder(bo: BuildOrder): BuildKeyTiming[] {
  const out: BuildKeyTiming[] = []
  let maxAge = 1
  bo.build_order.forEach((s, i) => {
    const agedUp = i !== 0 && s.age > maxAge && s.age >= 2
    if (i !== 0 && !agedUp) return
    out.push({
      ageUpTo: agedUp ? (Math.min(s.age, 4) as 2 | 3 | 4) : null,
      time: s.time ?? null,
      villagers: s.villager_count,
      population: s.population_count,
      note: plainNote(s.notes),
    })
    maxAge = Math.max(maxAge, s.age)
  })
  return out
}

function plainNote(notes: string[]): string | null {
  for (const n of notes) {
    const text = parseNote(n)
      .filter((p): p is Extract<NotePart, { type: 'text' }> => p.type === 'text')
      .map((p) => p.text)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
    if (text) return text
  }
  return null
}
