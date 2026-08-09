/**
 * Turns a build step's prose notes into the buildings/units it's telling you to
 * make, with real icon URLs — so the overlay can show IMAGES of what to build
 * (like a League item path) instead of a wall of text. Keyword-matched against
 * the existing note prose, so no build-order data has to be re-authored.
 *
 * Icons are bundled (vendored from data.aoe4world.com — see
 * scripts/vendor-unit-icons.mjs), so they render instantly and offline; the
 * CDN (still CSP-allow-listed) is only the fallback for a slug added here
 * before the next vendoring run. Missing icons fall back to the name text.
 */
import { BUILDING_ICONS } from '@data/vendor/aoe4world-overlay/buildings'
import { UNIT_ICONS } from '@data/vendor/aoe4world-overlay/units'
import { parseBuildOrderDisplayNote } from '@domain/buildOrderNotes'
import {
  normalizeAoE4IconToken,
  resolveAoE4Icon,
} from '@data/vendor/aoe4-icons/manifest'

export interface BuildTarget {
  label: string
  kind: 'building' | 'unit'
  url: string
}

const CDN = 'https://data.aoe4world.com/images'
const b = (slug: string): string =>
  BUILDING_ICONS[slug] ?? resolveAoE4Icon(`buildings/${slug}`) ?? `${CDN}/buildings/${slug}-1.png`
const u = (slug: string): string =>
  UNIT_ICONS[slug] ?? resolveAoE4Icon(`units/${slug}`) ?? `${CDN}/units/${slug}-1.png`

function tokenTarget(token: string): BuildTarget | null {
  const normalized = normalizeAoE4IconToken(token)
  const parts = normalized.split('/')
  const category = parts.find((part) => part.startsWith('unit') || part.startsWith('building') || part.startsWith('landmark'))
  if (!category) return null
  const kind: BuildTarget['kind'] = category.startsWith('unit') ? 'unit' : 'building'
  const url = resolveAoE4Icon(token)
  if (!url) return null
  const rawStem = parts.at(-1) ?? normalized
  const label = rawStem
    .replace(/-\d+$/, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
  return { label, kind, url }
}

function autoIconTarget(path: string, label: string): BuildTarget | null {
  const normalized = normalizeAoE4IconToken(path)
  const parts = normalized.split('/')
  const category = parts.find(
    (part) =>
      part === 'unit' ||
      part === 'units' ||
      part.startsWith('unit-') ||
      part === 'building' ||
      part === 'buildings' ||
      part.startsWith('building-') ||
      part === 'landmark' ||
      part.startsWith('landmark-'),
  )
  if (!category) return null
  const kind: BuildTarget['kind'] = category.startsWith('unit') ? 'unit' : 'building'
  const url = resolveAoE4Icon(path)
  return url ? { label, kind, url } : null
}

function targetKey(target: BuildTarget): string {
  const label = target.label
    .toLocaleLowerCase()
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const canonicalLabels: Record<string, string> = {
    'городской центр': 'town center',
    дом: 'house',
    казармы: 'barracks',
    конюшня: 'stable',
    стрельбище: 'archery range',
    кузница: 'blacksmith',
    рынок: 'market',
    'военная школа': 'military school',
    'осадная мастерская': 'siege workshop',
    док: 'dock',
    копейщик: 'spearman',
    всадник: 'horseman',
    мечник: 'man-at-arms',
    лучник: 'archer',
    арбалетчик: 'crossbowman',
    'ручной стрелок': 'handcannoneer',
    рыцарь: 'knight',
    разведчик: 'scout',
    янычар: 'janissary',
    'верблюжий всадник': 'camel rider',
  }
  return `${target.kind}:${canonicalLabels[label] ?? label}`
}

/**
 * Common beginner-relevant buildings + units, matched word-boundary so "Archery
 * Range" doesn't also trip the "archer" unit. Longer/more-specific phrases sit
 * before generic ones. Villagers are intentionally absent — they're the resource
 * line, not a build target.
 */
const DICT: { re: RegExp; target: BuildTarget }[] = [
  // buildings
  { re: /\btown cent(?:er|re)s?\b/i, target: { label: 'Town Center', kind: 'building', url: b('town-center') } },
  { re: /\bhouses?\b/i, target: { label: 'House', kind: 'building', url: b('house') } },
  { re: /\bmills?\b/i, target: { label: 'Mill', kind: 'building', url: b('mill') } },
  { re: /\blumber camps?\b/i, target: { label: 'Lumber Camp', kind: 'building', url: b('lumber-camp') } },
  { re: /\bmining camps?\b/i, target: { label: 'Mining Camp', kind: 'building', url: b('mining-camp') } },
  { re: /\bbarracks\b/i, target: { label: 'Barracks', kind: 'building', url: b('barracks') } },
  { re: /\bstables?\b/i, target: { label: 'Stable', kind: 'building', url: b('stable') } },
  { re: /\barchery ranges?\b/i, target: { label: 'Archery Range', kind: 'building', url: b('archery-range') } },
  { re: /\bblacksmiths?\b/i, target: { label: 'Blacksmith', kind: 'building', url: b('blacksmith') } },
  { re: /\bmarkets?\b/i, target: { label: 'Market', kind: 'building', url: b('market') } },
  { re: /\bmilitary schools?\b/i, target: { label: 'Military School', kind: 'building', url: b('military-school') } },
  { re: /\bsiege workshops?\b/i, target: { label: 'Siege Workshop', kind: 'building', url: b('siege-workshop') } },
  { re: /\bdocks?\b/i, target: { label: 'Dock', kind: 'building', url: b('dock') } },
  // units
  { re: /\bspearm[ae]n\b/i, target: { label: 'Spearman', kind: 'unit', url: u('spearman') } },
  { re: /\bhorsem[ae]n\b/i, target: { label: 'Horseman', kind: 'unit', url: u('horseman') } },
  { re: /\bm[ae]n-at-arms\b/i, target: { label: 'Man-at-Arms', kind: 'unit', url: u('man-at-arms') } },
  { re: /\barchers?\b/i, target: { label: 'Archer', kind: 'unit', url: u('archer') } },
  { re: /\bcrossbow(?:m[ae]n)?\b/i, target: { label: 'Crossbow', kind: 'unit', url: u('crossbowman') } },
  { re: /\bhandcannon(?:eers?)?\b/i, target: { label: 'Handcannoneer', kind: 'unit', url: u('handcannoneer') } },
  { re: /\bknights?\b/i, target: { label: 'Knight', kind: 'unit', url: u('knight') } },
  { re: /\bscouts?\b/i, target: { label: 'Scout', kind: 'unit', url: u('scout') } },
  { re: /\bjanissar(?:y|ies)\b/i, target: { label: 'Janissary', kind: 'unit', url: u('janissary') } },
  { re: /\bcamel(?:\s*riders?)?\b/i, target: { label: 'Camel Rider', kind: 'unit', url: u('camel-rider') } },
  // Russian names used by localized build-order notes.
  { re: /городск(?:ой|ого|ому|им)\s+центр(?:а|ы|ом)?|(?<![\p{L}\p{N}])тц(?![\p{L}\p{N}])/iu, target: { label: 'Городской центр', kind: 'building', url: b('town-center') } },
  { re: /(?<![\p{L}\p{N}])дом(?:а|ов)?(?![\p{L}\p{N}])/iu, target: { label: 'Дом', kind: 'building', url: b('house') } },
  { re: /мельниц(?:а|ы|у|е)|(?<![\p{L}\p{N}])мельн(?:ю|ей)(?![\p{L}\p{N}])/iu, target: { label: 'Мельница', kind: 'building', url: b('mill') } },
  { re: /лесопил(?:ка|ки|ке|ку)|лесн(?:ой|ая)\s+лагер/iu, target: { label: 'Лесопилка', kind: 'building', url: b('lumber-camp') } },
  { re: /рудник|горн(?:ый|ого)\s+лагер|шахт(?:а|ы|у|е)/iu, target: { label: 'Шахта', kind: 'building', url: b('mining-camp') } },
  { re: /казарм(?:а|ы|у|е)|\bказарме\b/iu, target: { label: 'Казармы', kind: 'building', url: b('barracks') } },
  { re: /конюшн(?:я|и|ю|е)|\bконюшне\b/iu, target: { label: 'Конюшня', kind: 'building', url: b('stable') } },
  { re: /стрельбищ(?:е|а|у|ем)|(?<![\p{L}\p{N}])тир(?:а|у|е)?(?![\p{L}\p{N}])/iu, target: { label: 'Стрельбище', kind: 'building', url: b('archery-range') } },
  { re: /кузниц(?:а|ы|у|е)|(?<![\p{L}\p{N}])кузне(?![\p{L}\p{N}])/iu, target: { label: 'Кузница', kind: 'building', url: b('blacksmith') } },
  { re: /рын(?:ок|ка|ку|ке)|(?<![\p{L}\p{N}])рыне(?![\p{L}\p{N}])/iu, target: { label: 'Рынок', kind: 'building', url: b('market') } },
  { re: /военн(?:ая|ой|ую)\s+школ(?:а|ы|у|е)/iu, target: { label: 'Военная школа', kind: 'building', url: b('military-school') } },
  { re: /осадн(?:ая|ой|ую)\s+мастерск(?:ая|ой|ую|е)/iu, target: { label: 'Осадная мастерская', kind: 'building', url: b('siege-workshop') } },
  { re: /(?<![\p{L}\p{N}])док(?:и|ов)?(?![\p{L}\p{N}])/iu, target: { label: 'Док', kind: 'building', url: b('dock') } },
  { re: /копейщик(?:а|и|ов|ами)?/iu, target: { label: 'Копейщик', kind: 'unit', url: u('spearman') } },
  { re: /всадник(?:а|и|ов|ами)?/iu, target: { label: 'Всадник', kind: 'unit', url: u('horseman') } },
  { re: /мечник(?:а|и|ов|ами)?/iu, target: { label: 'Мечник', kind: 'unit', url: u('man-at-arms') } },
  { re: /лучник(?:а|и|ов|ами)?/iu, target: { label: 'Лучник', kind: 'unit', url: u('archer') } },
  { re: /арбалетчик(?:а|и|ов|ами)?/iu, target: { label: 'Арбалетчик', kind: 'unit', url: u('crossbowman') } },
  { re: /ручн(?:ой|ого|ому)\s+стрел(?:ок|ка|ки|ку)/iu, target: { label: 'Ручной стрелок', kind: 'unit', url: u('handcannoneer') } },
  { re: /рыцар(?:ь|я|и|ей|ями)/iu, target: { label: 'Рыцарь', kind: 'unit', url: u('knight') } },
  { re: /разведчик(?:а|и|ов|ами)?/iu, target: { label: 'Разведчик', kind: 'unit', url: u('scout') } },
  { re: /янычар(?:а|ы|ей|ами)?/iu, target: { label: 'Янычар', kind: 'unit', url: u('janissary') } },
  { re: /верблюж(?:ий|его|ему)\s+всадник(?:а|и|ов)?/iu, target: { label: 'Верблюжий всадник', kind: 'unit', url: u('camel-rider') } },
]

/** Buildings/units named in a step's notes, de-duplicated, in dictionary order. */
export function extractBuildTargets(notes: string[] | undefined, max = 4): BuildTarget[] {
  if (!notes || notes.length === 0) return []
  const text = notes.join('   ')
  const found: BuildTarget[] = []
  const seen = new Set<string>()
  for (const token of text.matchAll(/@([^@]+)@/g)) {
    if (found.length >= max) break
    const target = tokenTarget(token[1] ?? '')
    if (target && !seen.has(targetKey(target))) {
      seen.add(targetKey(target))
      found.push(target)
    }
  }
  for (const { re, target } of DICT) {
    if (found.length >= max) break
    const key = targetKey(target)
    if (re.test(text) && !seen.has(key)) {
      seen.add(key)
      found.push(target)
    }
  }
  for (const part of parseBuildOrderDisplayNote(text)) {
    if (found.length >= max) break
    if (part.type !== 'icon') continue
    const target = autoIconTarget(part.path, part.label)
    if (target && !seen.has(targetKey(target))) {
      seen.add(targetKey(target))
      found.push(target)
    }
  }
  return found
}
