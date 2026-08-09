import {
  normalizeBuildOrder,
  parseNote,
  type BuildOrder,
  type ValidationResult,
} from './buildOrderSchema'
import { parseDuration } from './format'

/** Serializes only the normalized JSON contract understood by RTS_Overlay. */
export function serializeOverlayBuild(build: BuildOrder): string {
  const normalized = normalizeBuildOrder(build)
  if (!normalized.ok) throw new Error(normalized.errors.join('; '))
  return `${JSON.stringify(normalized.value, null, 2)}\n`
}

/**
 * Serializes a compact, human-readable TXT build order compatible with the
 * original RTS_Overlay workflow. Metadata stays on the first lines; each
 * subsequent line contains a time, age, villager/resource hints and the
 * instruction text. Icon tokens are reduced to their readable file names so
 * the export remains useful outside the app.
 */
export function serializeSimpleBuildOrder(build: BuildOrder): string {
  const normalized = normalizeBuildOrder(build)
  if (!normalized.ok) throw new Error(normalized.errors.join('; '))
  const value = normalized.value
  const civ = Array.isArray(value.civilization) ? value.civilization.join(', ') : value.civilization
  const lines = [value.name, `# Civilization: ${civ}`]
  if (value.strategy) lines.push(`# Strategy: ${value.strategy}`)
  if (value.map) lines.push(`# Map: ${value.map}`)
  value.build_order.forEach((step, index) => {
    const hints = [
      step.villager_count > 0 ? `vills: ${step.villager_count}` : '',
      step.population_count > 0 ? `pop: ${step.population_count}` : '',
      step.resources.food > 0 ? `food: ${step.resources.food}` : '',
      step.resources.wood > 0 ? `wood: ${step.resources.wood}` : '',
      step.resources.gold > 0 ? `gold: ${step.resources.gold}` : '',
      step.resources.stone > 0 ? `stone: ${step.resources.stone}` : '',
      step.resources.builder && step.resources.builder > 0
        ? `builders: ${step.resources.builder}`
        : '',
    ].filter(Boolean)
    const note = step.notes
      .map((item) =>
        parseNote(item)
          .map((part) =>
            part.type === 'text'
              ? part.text
              : part.path
                  .split('/')
                  .pop()
                  ?.replace(/\.[^.]+$/, '')
                  .replace(/[-_]/g, ' ') ?? '',
          )
          .join(''),
      )
      .join(' · ')
      .replace(/\s+/g, ' ')
      .trim()
    const prefix = step.time?.trim() || `Step ${index + 1}`
    const details = [`Age ${step.age}`, ...hints, note].filter(Boolean).join(' · ')
    lines.push(`${prefix} ${details}`.trim())
  })
  return `${lines.join('\n')}\n`
}

/** Parses an exported .overlay.json file without allowing arbitrary payloads in the catalog. */
export function parseOverlayBuild(input: string): ValidationResult {
  try {
    return normalizeBuildOrder(JSON.parse(input) as unknown)
  } catch {
    return { ok: false, errors: ['Overlay JSON is not valid JSON'] }
  }
}

/**
 * Imports the simple line-oriented TXT format used by the original
 * AoE4_Overlay. The format intentionally has no rigid schema: a line may be
 * `5:10 Build a stable`, `7 vills to gold`, or a plain instruction. We keep the
 * instruction as a note and extract the timing/resource/population hints that
 * are unambiguous, then send the result through the same normalizer as JSON.
 */
export function parseSimpleBuildOrder(
  input: string,
  fallbackName = 'Imported TXT build',
): ValidationResult {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(
      (line) =>
        line.length > 0 && !line.startsWith('#') && !line.startsWith(';') && !line.startsWith('['),
    )
  if (lines.length === 0) return { ok: false, errors: ['TXT build order is empty'] }

  const firstLooksLikeHeading = lines.length > 1 && !/\d{1,2}:\d{2}(?::\d{2})?/.test(lines[0] ?? '')
  const name = firstLooksLikeHeading
    ? lines
        .shift()!
        .replace(/^name\s*:\s*/i, '')
        .trim()
    : fallbackName
  const steps = lines.map((raw, index) => {
    const timeMatch = raw.match(/^((?:\d{1,2}:)?\d{1,2}:\d{2})\s*(?:[-|]\s*)?(.*)$/)
    const time = timeMatch?.[1]
    const text = (timeMatch?.[2] ?? raw).replace(/^\s*(?:[-*]|\d+[.)])\s*/, '').trim()
    const age = ageFromText(text)
    const resources = {
      food: hintNumber(text, /(?:food|sheep|berries|farms?)\s*[:=]?\s*(\d+)/i) ?? 0,
      wood: hintNumber(text, /wood\s*[:=]?\s*(\d+)/i) ?? 0,
      gold: hintNumber(text, /gold\s*[:=]?\s*(\d+)/i) ?? 0,
      stone: hintNumber(text, /stone\s*[:=]?\s*(\d+)/i) ?? 0,
      builder: hintNumber(text, /builders?\s*[:=]?\s*(\d+)/i) ?? 0,
    }
    const villagerCount =
      hintNumber(text, /(?:vills?|villagers?)\s*[:=]?\s*(\d+)/i) ??
      hintNumber(text, /^(\d+)\s+(?:vills?|villagers?)\b/i) ??
      0
    const population = hintNumber(text, /(?:pop|population|supply)\s*[:=]?\s*(\d+)/i) ?? 0
    return {
      population_count: population,
      villager_count: villagerCount,
      age,
      resources,
      notes: [text || `Step ${index + 1}`],
      ...(time && parseDuration(time) != null ? { time } : {}),
    }
  })

  const build: BuildOrder = {
    schemaVersion: 1,
    name: name || fallbackName,
    civilization: 'Unknown',
    origin: 'imported',
    build_order: steps,
  }
  if (steps.length === 0) return { ok: false, errors: ['TXT build order has no steps'] }
  return normalizeBuildOrder(build)
}

function hintNumber(value: string, pattern: RegExp): number | undefined {
  const match = value.match(pattern)
  if (!match?.[1]) return undefined
  const parsed = Number(match[1])
  return Number.isFinite(parsed) ? parsed : undefined
}

function ageFromText(value: string): number {
  const match = value.match(/(?:age|tier)\s*[:=]?\s*(?:([1-4])|I{1,3}|IV)\b/i)
  if (!match) return 1
  const token = match[1] ?? value.match(/(?:age|tier)\s*[:=]?\s*(I{1,3}|IV)\b/i)?.[1]
  if (token === 'IV' || token === 'iv') return 4
  if (token === 'III' || token === 'iii') return 3
  if (token === 'II' || token === 'ii') return 2
  return Number(token) || 1
}
