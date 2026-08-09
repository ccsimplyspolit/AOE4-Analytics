import { EXPLORER_RECORDS } from '@data/explorerData'
import { UNITS } from '@data/gameData'
import { UNIT_NAMES_RU } from '@data/unitNames'
import { parseNote, type NotePart } from './buildOrderSchema'

export type AutoIconNotePart = {
  type: 'icon'
  path: string
  label: string
}

export type BuildOrderDisplayNotePart = NotePart | AutoIconNotePart

type IconCandidate = {
  phrase: string
  path: string
  label: string
  priority: number
}

const STATIC_ICON_CANDIDATES: IconCandidate[] = [
  { phrase: 'idle villagers', path: 'resource/idle-villager', label: 'Idle Villager', priority: 101 },
  { phrase: 'idle vills', path: 'resource/idle-villager', label: 'Idle Villager', priority: 101 },
  { phrase: 'idle villager', path: 'resource/idle-villager', label: 'Idle Villager', priority: 101 },
  { phrase: 'простой крестьянин', path: 'resource/idle-villager', label: 'Idle Villager', priority: 101 },
  { phrase: 'простой сельский житель', path: 'resource/idle-villager', label: 'Idle Villager', priority: 101 },
  { phrase: 'rally point', path: 'resource/villager', label: 'Rally point', priority: 100 },
  { phrase: 'rally', path: 'resource/villager', label: 'Rally point', priority: 99 },
  {
    phrase: 'repair',
    path: 'technologies/banco-repairs-2',
    label: 'Repair',
    priority: 99,
  },
  { phrase: 'villagers', path: 'resource/villager', label: 'Villager', priority: 98 },
  { phrase: 'villager', path: 'resource/villager', label: 'Villager', priority: 98 },
  { phrase: 'vills', path: 'resource/villager', label: 'Villager', priority: 98 },
  { phrase: 'vils', path: 'resource/villager', label: 'Villager', priority: 98 },
  { phrase: 'vill', path: 'resource/villager', label: 'Villager', priority: 98 },
  { phrase: 'vil', path: 'resource/villager', label: 'Villager', priority: 98 },
  { phrase: 'peasants', path: 'resource/villager', label: 'Villager', priority: 97 },
  { phrase: 'peasant', path: 'resource/villager', label: 'Villager', priority: 97 },
  { phrase: 'aldeanos', path: 'resource/villager', label: 'Villager', priority: 97 },
  { phrase: 'сельские жители', path: 'resource/villager', label: 'Villager', priority: 98 },
  { phrase: 'сельский житель', path: 'resource/villager', label: 'Villager', priority: 98 },
  { phrase: 'сельских жителей', path: 'resource/villager', label: 'Villager', priority: 98 },
  { phrase: 'сельских жителя', path: 'resource/villager', label: 'Villager', priority: 98 },
  { phrase: 'сельского жителя', path: 'resource/villager', label: 'Villager', priority: 98 },
  { phrase: 'крестьяне', path: 'resource/villager', label: 'Villager', priority: 97 },
  { phrase: 'крестьянин', path: 'resource/villager', label: 'Villager', priority: 97 },
  { phrase: 'крестьянина', path: 'resource/villager', label: 'Villager', priority: 97 },
  { phrase: 'крестьян', path: 'resource/villager', label: 'Villager', priority: 97 },
  { phrase: 'рабочие', path: 'resource/villager', label: 'Worker', priority: 97 },
  { phrase: 'рабочий', path: 'resource/villager', label: 'Worker', priority: 97 },
  { phrase: 'workers', path: 'resource/villager', label: 'Worker', priority: 97 },
  { phrase: 'worker', path: 'resource/villager', label: 'Worker', priority: 97 },
  { phrase: 'age up', path: 'ageup-building', label: 'Age up', priority: 97 },
  { phrase: 'переход в эпоху', path: 'ageup-building', label: 'Age up', priority: 97 },
  { phrase: 'town center', path: 'buildings/town-center', label: 'Town Center', priority: 84 },
  { phrase: 'tc', path: 'buildings/town-center', label: 'Town Center', priority: 84 },
  { phrase: 'городской центр', path: 'buildings/town-center', label: 'Town Center', priority: 84 },
  { phrase: 'тц', path: 'buildings/town-center', label: 'Town Center', priority: 84 },
  { phrase: 'population cap', path: 'resource/popcap', label: 'Population Cap', priority: 84 },
  { phrase: 'pop cap', path: 'resource/popcap', label: 'Population Cap', priority: 84 },
  { phrase: 'popcap', path: 'resource/popcap', label: 'Population Cap', priority: 84 },
  { phrase: 'лимит населения', path: 'resource/popcap', label: 'Population Cap', priority: 84 },
  { phrase: 'население', path: 'resource/popcap', label: 'Population', priority: 83 },
  { phrase: 'dark age', path: 'age/age_1', label: 'Dark Age', priority: 96 },
  { phrase: 'feudal age', path: 'age/age_2', label: 'Feudal Age', priority: 96 },
  { phrase: 'castle age', path: 'age/age_3', label: 'Castle Age', priority: 96 },
  { phrase: 'imperial age', path: 'age/age_4', label: 'Imperial Age', priority: 96 },
  { phrase: 'темная эпоха', path: 'age/age_1', label: 'Dark Age', priority: 96 },
  { phrase: 'тёмная эпоха', path: 'age/age_1', label: 'Dark Age', priority: 96 },
  { phrase: 'феодальная эпоха', path: 'age/age_2', label: 'Feudal Age', priority: 96 },
  { phrase: 'замковая эпоха', path: 'age/age_3', label: 'Castle Age', priority: 96 },
  { phrase: 'имперская эпоха', path: 'age/age_4', label: 'Imperial Age', priority: 96 },
  { phrase: 'эпоха 4', path: 'age/age_4', label: 'Imperial Age', priority: 95 },
  { phrase: 'эпоха 3', path: 'age/age_3', label: 'Castle Age', priority: 95 },
  { phrase: 'эпоха 2', path: 'age/age_2', label: 'Feudal Age', priority: 95 },
  { phrase: 'эпоха 1', path: 'age/age_1', label: 'Dark Age', priority: 95 },
  { phrase: 'эпоху 4', path: 'age/age_4', label: 'Imperial Age', priority: 95 },
  { phrase: 'эпоху 3', path: 'age/age_3', label: 'Castle Age', priority: 95 },
  { phrase: 'эпоху 2', path: 'age/age_2', label: 'Feudal Age', priority: 95 },
  { phrase: 'эпоху 1', path: 'age/age_1', label: 'Dark Age', priority: 95 },
  { phrase: 'age 4', path: 'age/age_4', label: 'Imperial Age', priority: 95 },
  { phrase: 'age 3', path: 'age/age_3', label: 'Castle Age', priority: 95 },
  { phrase: 'age 2', path: 'age/age_2', label: 'Feudal Age', priority: 95 },
  { phrase: 'age 1', path: 'age/age_1', label: 'Dark Age', priority: 95 },
  {
    phrase: 'scale barding 2',
    path: 'technologies/scale-barding-tier2-2',
    label: 'Scale Barding (2/6)',
    priority: 86,
  },
  {
    phrase: 'scale barding 1',
    path: 'technologies/scale-barding-tier1-2',
    label: 'Scale Barding (1/6)',
    priority: 86,
  },
  {
    phrase: 'scale barding 3',
    path: 'technologies/scale-barding-tier3-2',
    label: 'Scale Barding (3/6)',
    priority: 86,
  },
  { phrase: 'imperial', path: 'age/age_4', label: 'Imperial Age', priority: 94 },
  { phrase: 'castle', path: 'age/age_3', label: 'Castle Age', priority: 94 },
  { phrase: 'feudal', path: 'age/age_2', label: 'Feudal Age', priority: 94 },
  { phrase: 'dark', path: 'age/age_1', label: 'Dark Age', priority: 94 },
  { phrase: 'relics', path: 'resource/relics-held', label: 'Relics', priority: 90 },
  { phrase: 'relic', path: 'resource/relics-held', label: 'Relic', priority: 90 },
  { phrase: 'berries', path: 'resource/berry', label: 'Berries', priority: 90 },
  { phrase: 'berry', path: 'resource/berry', label: 'Berries', priority: 90 },
  { phrase: 'sheep', path: 'resource/sheep', label: 'Sheep', priority: 90 },
  { phrase: 'deer', path: 'resource/deer', label: 'Deer', priority: 90 },
  { phrase: 'boar', path: 'resource/boar', label: 'Boar', priority: 90 },
  { phrase: 'fish', path: 'resource/fish', label: 'Fish', priority: 90 },
  { phrase: 'fishing', path: 'resource/fish', label: 'Fish', priority: 90 },
  { phrase: 'farms', path: 'resource/farm', label: 'Farm', priority: 90 },
  { phrase: 'farm', path: 'resource/farm', label: 'Farm', priority: 90 },
  { phrase: 'фермы', path: 'resource/farm', label: 'Farm', priority: 90 },
  { phrase: 'ферма', path: 'resource/farm', label: 'Farm', priority: 90 },
  { phrase: 'food', path: 'resource/food', label: 'Food', priority: 89 },
  { phrase: 'еда', path: 'resource/food', label: 'Food', priority: 89 },
  { phrase: 'еду', path: 'resource/food', label: 'Food', priority: 89 },
  { phrase: 'еды', path: 'resource/food', label: 'Food', priority: 89 },
  { phrase: 'пища', path: 'resource/food', label: 'Food', priority: 89 },
  { phrase: 'wood', path: 'resource/wood', label: 'Wood', priority: 89 },
  { phrase: 'woodline', path: 'resource/wood', label: 'Wood', priority: 89 },
  { phrase: 'straggler', path: 'resource/wood', label: 'Wood', priority: 89 },
  { phrase: 'trees', path: 'resource/wood', label: 'Wood', priority: 89 },
  { phrase: 'tree', path: 'resource/wood', label: 'Wood', priority: 89 },
  { phrase: 'древесина', path: 'resource/wood', label: 'Wood', priority: 89 },
  { phrase: 'дерево', path: 'resource/wood', label: 'Wood', priority: 89 },
  { phrase: 'дерева', path: 'resource/wood', label: 'Wood', priority: 89 },
  { phrase: 'gold', path: 'resource/gold', label: 'Gold', priority: 89 },
  { phrase: 'золото', path: 'resource/gold', label: 'Gold', priority: 89 },
  { phrase: 'золота', path: 'resource/gold', label: 'Gold', priority: 89 },
  { phrase: 'stone', path: 'resource/stone', label: 'Stone', priority: 89 },
  { phrase: 'камень', path: 'resource/stone', label: 'Stone', priority: 89 },
  { phrase: 'камня', path: 'resource/stone', label: 'Stone', priority: 89 },
  { phrase: 'outpost', path: 'buildings/outpost', label: 'Outpost', priority: 80 },
  // Core Russian unit words are intentionally explicit. The automatic aliases
  // from the current data snapshot remain useful for the long tail, but these
  // two generic words occur in almost every Russian build and must not depend
  // on a duplicated localized-name entry across faction/unit variants.
  { phrase: 'лучник', path: 'units/archer', label: 'Лучник', priority: 93 },
  { phrase: 'рыцарь', path: 'units/knight', label: 'Рыцарь', priority: 93 },
]

function cleanPhrase(value: string): string {
  return value
    .toLocaleLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[()[\],]/g, ' ')
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function addCandidate(
  candidates: Map<string, IconCandidate>,
  phrase: string,
  path: string,
  label: string,
  priority: number,
): void {
  const cleaned = cleanPhrase(phrase)
  if (!cleaned || cleaned.length < 2) return
  const existing = candidates.get(cleaned)
  if (!existing || priority > existing.priority) {
    candidates.set(cleaned, { phrase: cleaned, path, label, priority })
  }
}

function recordAliases(name: string, id: string): { phrase: string; priority: number }[] {
  const aliases = new Map<string, number>([
    [name, 70],
    [id, 75],
  ])
  const words = cleanPhrase(name).split(' ')
  const idWords = cleanPhrase(id).split(' ')
  if (words.length > 1) aliases.set(words.at(-1) ?? '', 45)
  if (idWords.length > 1) aliases.set(idWords.at(-1) ?? '', 45)
  return [...aliases.entries()].map(([phrase, priority]) => ({ phrase, priority }))
}

function localizedUnitAliases(name: string): string[] {
  const cleaned = cleanPhrase(name)
  const aliases = new Set([cleaned])
  const words = cleaned.split(' ')
  if (words.length !== 1) return [...aliases]

  const word = words[0] ?? ''
  if (word.endsWith('ь') || word.endsWith('й')) {
    aliases.add(`${word.slice(0, -1)}я`)
  } else if (!/[аеёиоуыэюя]$/u.test(word)) {
    aliases.add(`${word}а`)
  }
  return [...aliases]
}

function buildIconCandidates(): IconCandidate[] {
  const candidates = new Map<string, IconCandidate>()
  for (const candidate of STATIC_ICON_CANDIDATES) {
    addCandidate(candidates, candidate.phrase, candidate.path, candidate.label, candidate.priority)
  }

  for (const unit of UNITS) {
    const iconPath = unit.icon ?? `units/${unit.id}`
    for (const alias of recordAliases(unit.name, unit.id)) {
      addCandidate(
        candidates,
        alias.phrase,
        iconPath,
        unit.name,
        alias.priority,
      )
    }
    const localizedName = UNIT_NAMES_RU[unit.name]
    if (localizedName) {
      for (const alias of localizedUnitAliases(localizedName)) {
        addCandidate(candidates, alias, iconPath, localizedName, 74)
      }
    }
  }

  for (const record of EXPLORER_RECORDS) {
    const category = record.kind === 'building' ? 'buildings' : 'technologies'
    for (const alias of recordAliases(record.name, record.id)) {
      addCandidate(
        candidates,
        alias.phrase,
        record.icon ?? `${category}/${record.id}`,
        record.name,
        alias.priority,
      )
    }
  }

  return [...candidates.values()].sort(
    (a, b) => b.phrase.length - a.phrase.length || b.priority - a.priority,
  )
}

const ICON_CANDIDATES = buildIconCandidates()

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function candidatePattern(phrase: string): RegExp {
  const words = phrase.split(' ').map(escapeRegExp)
  const body = words.join('[\\s-]+')
  return new RegExp(`(?<![\\p{L}\\p{N}])${body}(?![\\p{L}\\p{N}])`, 'giu')
}

const ICON_MATCHERS = ICON_CANDIDATES.map((candidate) => ({
  candidate,
  matcher: candidatePattern(candidate.phrase),
}))
const DISPLAY_NOTE_CACHE = new Map<string, BuildOrderDisplayNotePart[]>()
const MAX_DISPLAY_NOTE_CACHE = 2048

function expandText(text: string): BuildOrderDisplayNotePart[] {
  const matches: { start: number; end: number; candidate: IconCandidate }[] = []
  for (const { candidate, matcher } of ICON_MATCHERS) {
    for (const match of text.matchAll(matcher)) {
      const value = match[0]
      const start = match.index
      if (start == null || !value) continue
      matches.push({ start, end: start + value.length, candidate })
    }
  }

  matches.sort(
    (a, b) =>
      a.start - b.start ||
      b.candidate.phrase.length - a.candidate.phrase.length ||
      b.candidate.priority - a.candidate.priority,
  )

  const parts: BuildOrderDisplayNotePart[] = []
  let cursor = 0
  for (const match of matches) {
    if (match.start < cursor) continue
    if (match.start > cursor) parts.push({ type: 'text', text: text.slice(cursor, match.start) })
    parts.push({
      type: 'icon',
      path: match.candidate.path,
      label: match.candidate.label,
    })
    cursor = match.end
  }
  if (cursor < text.length) parts.push({ type: 'text', text: text.slice(cursor) })
  return parts.length > 0 ? parts : [{ type: 'text', text }]
}

/** Parses explicit provider tokens and adds icons to ordinary build-order prose. */
export function parseBuildOrderDisplayNote(note: string): BuildOrderDisplayNotePart[] {
  const cached = DISPLAY_NOTE_CACHE.get(note)
  if (cached) return cached

  const parsed = parseNote(note).flatMap((part) =>
    part.type === 'text' ? expandText(part.text) : [part],
  )
  if (DISPLAY_NOTE_CACHE.size >= MAX_DISPLAY_NOTE_CACHE) {
    const oldest = DISPLAY_NOTE_CACHE.keys().next().value
    if (oldest) DISPLAY_NOTE_CACHE.delete(oldest)
  }
  DISPLAY_NOTE_CACHE.set(note, parsed)
  return parsed
}
