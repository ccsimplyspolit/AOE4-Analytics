import { UNIT_NAMES_RU } from '@data/unitNames'
import { CIV_AND_MAP_NAMES, lookupCivOrMapName } from '@domain/gameNameDictionary'
import { localizeGeneratedRu } from './localizeGeneratedCopy'

const AGE_RU: Record<string, string> = {
  'Feudal Age': 'феодальная эпоха',
  'Castle Age': 'замковая эпоха',
  'Imperial Age': 'имперская эпоха',
  'Dark Age': 'тёмная эпоха',
}

const RESOURCE_RU: Record<string, string> = {
  food: 'еду',
  wood: 'дерево',
  gold: 'золото',
  stone: 'камень',
}

const OVERLAY_TERMS: Array<[string, string]> = [
  ['Town Centers', 'Ратуши'],
  ['Town Center', 'Ратуша'],
  ['Lumber Camp', 'лесопилку'],
  ['Mining Camp', 'рудник'],
  ['Archery Range', 'стрельбище'],
  ['Blacksmith', 'кузницу'],
  ['Barracks', 'казарму'],
  ['Stable', 'конюшню'],
  ['Landmark', 'лендмарк'],
  ['Villagers', 'крестьяне'],
  ['Villager', 'крестьянин'],
  ['Feudal Age', 'феодальная эпоха'],
  ['Castle Age', 'замковая эпоха'],
  ['Imperial Age', 'имперская эпоха'],
  ['Dark Age', 'тёмная эпоха'],
  ['Fast Castle', 'быстрый замок'],
  ['Fast Feudal', 'быстрый феодал'],
  ['Sacred Sites', 'святыни'],
  ['House', 'дом'],
  ['Houses', 'дома'],
  ['Mill', 'мельницу'],
  ['Farm', 'ферму'],
  ['Farms', 'фермы'],
  ['Sheep', 'овцы'],
  ['Berries', 'ягоды'],
]

/** Exact overlay / coach / coverage strings that often miss UI.ru keys. */
const EXACT_RU: Record<string, string> = {
  'Initial Scouting': 'Начальная разведка',
  'Collect starting sheep and identify enemy base direction':
    'Сбор стартовых овец и разведка направления базы оппонента',
  'Scout Enemy Gold & Wood': 'Разведка золота и леса',
  'Check opponent gold mining: Fast Castle, 2TC or Feudal aggression':
    'Проверка золота соперника: фаст-кастл, 2 ТЦ или ранняя агрессия',
  'Feudal Transition Check': 'Тайминг Feudal',
  'Landmark should begin or finish; scout military production buildings':
    'Начало или завершение постройки достопримечательности; проверка зданий армии',
  'Sacred Sites & Relics Prep': 'Подготовка к реликвиям и святыням',
  'Prepare monastery and monks; sacred sites unlock at 10:00':
    'Подготовка монастыря и монахов; святыни активируются к 10:00',
  'Sacred Sites Activated': 'Священные места открыты',
  'Sacred sites are now capturable! Contest or secure victory timer':
    'Святыни доступны для захвата! Боритесь за контроль или запускайте таймер победы',
  'Neutral Resource Control': 'Контроль нейтральных ресурсов',
  'Check safe deer packs, boars, and outer gold/stone veins':
    'Контроль оленей, кабана и внешних жил золота/камня',
  'Delhi Sanctity & Sacred Sites': 'Дели Sanctity: захват святынь',
  'Capture sacred sites now with Scholars for +300 gold/min and vision':
    'Захватывайте святыни учеными для +300 зол/мин и обзора карты',
  'HRE 3-Relic Regnitz Priority': 'HRE: приоритет 3 реликвий (Regnitz)',
  'Produce Prelates immediately to claim 3 relics (+480 gold/min passive gold)':
    'Немедленно заказывайте прелатов для сбора 3 реликвий (+480 зол/мин)',
  'Rus Warrior Monk Relic Hunt': 'Русь: охота за реликвиями',
  'Deploy mounted Warrior Monks to grab contested relics and gain combat aura':
    'Отправляйте конных монахов за реликвиями для получения боевой ауры',
  'Build Target: Feudal Age': 'Цель билда: феодальная эпоха',
  'Build Target: Castle Age': 'Цель билда: замковая эпоха',
  'Build Target: Imperial Age': 'Цель билда: имперская эпоха',
  'Opponent civilization unavailable — no matchup branch inferred.':
    'Цивилизация соперника неизвестна — ветка матчапа не выведена.',
  'No static counter guidance is available for the known opponent civilization.':
    'Нет статической контры для известной цивилизации соперника.',
  'Kept villager production steady': 'Держали производство крестьян стабильным',
  'Spend resources before the next fight': 'Тратьте ресурсы перед следующим боем',
  'Keep making villagers nonstop.': 'Не останавливайте производство крестьян.',
  'Keep making villagers nonstop': 'Не останавливайте производство крестьян',
  'Start Building': 'Начните строить',
  'Until Age Up': 'до перехода в эпоху',
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function defaultGameName(value: string): string {
  return (
    UNIT_NAMES_RU[value] ??
    lookupCivOrMapName(CIV_AND_MAP_NAMES.ru as Record<string, string>, value) ??
    value
  )
}

function joinRu(items: string[], conjunction: 'или' | 'и'): string {
  if (items.length <= 1) return items[0] ?? ''
  if (items.length === 2) return `${items[0]} ${conjunction} ${items[1]}`
  return `${items.slice(0, -1).join(', ')} ${conjunction} ${items[items.length - 1]}`
}

function applyPhrases(input: string): string {
  return input
    .replace(/Start Building/gi, 'Начните строить')
    .replace(/Until Age Up/gi, 'до перехода в эпоху')
    .replace(/with Food Villager/gi, 'крестьянином на еде')
    .replace(/with Wood Villager/gi, 'крестьянином на дереве')
    .replace(/with Gold Villager/gi, 'крестьянином на золоте')
    .replace(/with Stone Villager/gi, 'крестьянином на камне')
    .replace(/Beginne zu [Bb]auen/g, 'Начните строить')
    .replace(/Bis zum Zeitalteraufstieg/gi, 'до перехода в эпоху')
    .replace(/\bKeep making villagers nonstop\b/gi, 'не останавливайте производство крестьян')
    .replace(/\bKeep making villagers\b/gi, 'продолжайте производить крестьян')
    .replace(/\bAge up\b/gi, 'переходите в эпоху')
    .replace(/\bRally to\b/gi, 'точка сбора на')
    .replace(
      /\bSend all (\d+) starting villagers to sheep and keep making villagers nonstop\.?/gi,
      'Отправьте всех $1 стартовых крестьян на овец и не останавливайте производство крестьян',
    )
    .replace(/\bSend (\d+) villagers to (food|wood|gold|stone)\b/gi, (_all, n: string, res: string) => {
      return `Отправьте ${n} крестьян на ${RESOURCE_RU[res] ?? res}`
    })
    .replace(/\bPut (\d+) villagers on (food|wood|gold|stone)\b/gi, (_all, n: string, res: string) => {
      return `Поставьте ${n} крестьян на ${RESOURCE_RU[res] ?? res}`
    })
    .replace(
      /\bBuild Houses as needed so you never get supply-blocked\.?/gi,
      'Стройте дома заранее, чтобы не упереться в лимит',
    )
    .replace(
      /\bScout to find sheep, berries, and your opponent's plan\.?/gi,
      'Разведайте овец, ягоды и план соперника',
    )
}

function applyTerms(input: string, gameName: (value: string) => string): string {
  const entries: Array<[string, string]> = [
    ...OVERLAY_TERMS,
    ...Object.entries(UNIT_NAMES_RU),
    ...Object.entries(CIV_AND_MAP_NAMES.ru as Record<string, string>),
  ]
  entries.sort((a, b) => b[0].length - a[0].length)
  let text = input
  for (const [english] of entries) {
    if (english.length < 4 && english !== 'TC' && english !== 'FC') continue
    const translated = OVERLAY_TERMS.find(([key]) => key === english)?.[1] ?? gameName(english)
    if (!translated || translated === english) continue
    text = text.replace(new RegExp(`\\b${escapeRegExp(english)}\\b`, 'gi'), translated)
  }
  return text.replace(/\s+,/g, ',').replace(/\s+/g, ' ').trim()
}

function localizeStructured(input: string, gameName: (value: string) => string): string | null {
  const exact = EXACT_RU[input]
  if (exact) return exact

  const buildTarget = /^Build Target: (Feudal Age|Castle Age|Imperial Age|Dark Age)$/.exec(input)
  if (buildTarget) return `Цель билда: ${AGE_RU[buildTarget[1]!] ?? buildTarget[1]}`

  const villTarget = /^(\d+) villagers target$/.exec(input)
  if (villTarget) return `Цель: ${villTarget[1]} крестьян`

  const unknownCivs =
    /^(\d+) opponent civilizations? unknown — matchup guidance covers known civilizations only\.$/.exec(
      input,
    )
  if (unknownCivs) {
    const n = Number(unknownCivs[1])
    return n === 1
      ? '1 цивилизация соперника неизвестна — подсказки матчапа только по известным цивилизациям.'
      : `${n} цивилизации соперника неизвестны — подсказки матчапа только по известным цивилизациям.`
  }

  const scoutIf = /^If you scout (.+):$/i.exec(input)
  if (scoutIf) {
    const units = scoutIf[1]!.split(/\s+or\s+/i).map((name) => gameName(name.trim()))
    return `Если разведка показывает ${joinRu(units, 'или')}:`
  }

  const keepBaseline = /^Keep (.+) as the baseline; prioritize (.+)\.$/i.exec(input)
  if (keepBaseline) {
    const counters = keepBaseline[2]!.split(/\s+and\s+/i).map((name) => gameName(name.trim()))
    return `Оставьте ${keepBaseline[1]} как основу; в приоритете ${joinRu(counters, 'и')}.`
  }

  return null
}

export function localizeOverlayTitleRemainder(remainder: string): string {
  return remainder
    .replace(/\bFast Castle\b/gi, 'быстрый замок')
    .replace(/\bFast Feudal\b/gi, 'быстрый феодал')
    .replace(/\bSchnellburg\b/gi, 'быстрый замок')
    .replace(/\(FC\)/gi, '(БЗ)')
    .replace(/\bFC\b/g, 'БЗ')
    .replace(/\b2\s*TC\b/gi, '2 ТЦ')
    .replace(/\b2TC\b/gi, '2 ТЦ')
    .replace(/\bAll-in\b/gi, 'олл-ин')
}

/**
 * Translate overlay HUD copy: checkpoints, imported build notes, coverage
 * strings, and leftover English/German fragments. Domain records stay English.
 */
export function localizeOverlayCopy(
  input: string,
  options?: { gameName?: (value: string) => string; terms?: boolean },
): string {
  const trimmed = input.trim()
  if (!trimmed) return input
  if (!/[A-Za-zÄÖÜäöüß]/.test(trimmed)) return input

  const gameName = options?.gameName ?? defaultGameName
  const generated = localizeGeneratedRu(trimmed)
  if (generated) return generated

  const structured = localizeStructured(trimmed, gameName)
  if (structured) return structured

  let text = applyPhrases(trimmed)
  if (options?.terms) text = applyTerms(text, gameName)
  return text.replace(/\s+,/g, ',').replace(/\s+/g, ' ').trim()
}
