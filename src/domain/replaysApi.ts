/**
 * Normalizes the JSON returned by the optional AoE4World replays-api service.
 *
 * The service exposes two shapes: `/Summary/new` returns `gameSummary` plus
 * the raw parsed summary, while `/Summary` returns a legacy compatibility
 * array. Keeping the conversion pure lets the Electron main process use the
 * service without leaking network access into the renderer and gives us a
 * safe fallback for a future STPD version that the bundled parser does not
 * understand yet.
 */
import { makeReplayParserProvenance } from './replayParserCompatibility'
import {
  prettyName,
  type BuildCategory,
  type BuildEvent,
  type CasualtyEvent,
  type MatchSummary,
  type PlayerSummary,
  type ResourceAmounts,
  type ResourcePoint,
  type ScorePoint,
} from './statsSummary'

type JsonRecord = Record<string, unknown>

function record(value: unknown): JsonRecord | null {
  return value != null && typeof value === 'object' && !Array.isArray(value)
    ? (value as JsonRecord)
    : null
}

function field(value: JsonRecord | null, name: string): unknown {
  if (!value) return undefined
  if (name in value) return value[name]
  const pascal = name.charAt(0).toUpperCase() + name.slice(1)
  return value[pascal]
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function numberValue(value: unknown): number | null {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
  return Number.isFinite(n) ? n : null
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function numberArray(value: unknown): number[] {
  return list(value).map(numberValue).filter((n): n is number => n != null)
}

function resources(value: unknown): ResourceAmounts {
  const source = record(value)
  return {
    food: numberValue(field(source, 'food')) ?? 0,
    wood: numberValue(field(source, 'wood')) ?? 0,
    gold: numberValue(field(source, 'gold')) ?? 0,
    stone: numberValue(field(source, 'stone')) ?? 0,
  }
}

function addResources(a: ResourceAmounts, b: ResourceAmounts): ResourceAmounts {
  return {
    food: a.food + b.food,
    wood: a.wood + b.wood,
    gold: a.gold + b.gold,
    stone: a.stone + b.stone,
  }
}

function categoryFrom(value: unknown): BuildCategory {
  if (typeof value === 'number') {
    if (value === 0) return 'unit'
    if (value === 1) return 'building'
    if (value === 2) return 'upgrade'
    return 'other'
  }
  const token = String(value ?? '').toLowerCase()
  if (token.includes('building')) return 'building'
  if (token.includes('upgrade')) return 'upgrade'
  if (token.includes('unit') || token.includes('animal')) return 'unit'
  return 'other'
}

function iconCategory(icon: string | null): BuildCategory {
  const token = icon?.toLowerCase() ?? ''
  if (token.includes('/buildings/') || token.includes('building_')) return 'building'
  if (token.includes('/upgrades/') || token.includes('upgrade_')) return 'upgrade'
  if (token.includes('/units/') || token.includes('unit_')) return 'unit'
  return 'other'
}

function normalizeBlueprintName(icon: string | null, label: string | null): string {
  const cleanLabel = label?.replace(/^\$+|\$+$/g, '').trim()
  return cleanLabel || (icon ? prettyName(icon) : 'Unknown event')
}

function eventFromRawUnit(value: unknown, fallbackPlayerId: number): BuildEvent | null {
  const raw = record(value)
  const timeSec = numberValue(field(raw, 'timestamp')) ?? numberValue(field(raw, 'spawnTimestamp'))
  if (timeSec == null) return null
  const playerId = numberValue(field(raw, 'playerId')) ?? fallbackPlayerId
  const icon = stringValue(field(raw, 'unitIcon'))
  const label = stringValue(field(raw, 'unitLabel'))
  const entityType = stringValue(field(raw, 'entityType'))
  const blueprint = icon ?? entityType ?? label ?? 'unknown'
  return {
    timeSec,
    playerId,
    category: icon ? iconCategory(icon) : categoryFrom(entityType),
    blueprint,
    name: normalizeBlueprintName(icon ?? entityType, label),
  }
}

function eventFromLegacy(value: unknown, fallbackPlayerId: number): BuildEvent[] {
  const raw = record(value)
  if (!raw) return []
  const id = stringValue(field(raw, 'id')) ?? stringValue(field(raw, 'icon')) ?? 'unknown'
  const icon = stringValue(field(raw, 'icon'))
  const category = categoryFrom(field(raw, 'type'))
  const timestamps = [
    ...numberArray(field(raw, 'finished')),
    ...numberArray(field(raw, 'constructed')),
    ...numberArray(field(raw, 'unpacked')),
    ...numberArray(field(raw, 'transformed')),
    ...numberArray(field(raw, 'packed')),
  ]
  return [...new Set(timestamps)].map((timeSec) => ({
    timeSec,
    playerId: fallbackPlayerId,
    category: category === 'other' ? iconCategory(icon) : category,
    blueprint: icon ?? id,
    name: normalizeBlueprintName(icon, id),
  }))
}

function timelineFromPlayer(value: unknown): {
  resources: ResourcePoint[]
  scores: ScorePoint[]
} {
  const player = record(value)
  const resourcesOut: ResourcePoint[] = []
  const scoresOut: ScorePoint[] = []
  for (const pointValue of list(field(player, 'timeline'))) {
    const point = record(pointValue)
    const timeSec = numberValue(field(point, 'timestamp'))
    if (timeSec == null) continue
    const bank = resources(field(point, 'resourcesCurrent'))
    const spentValue = field(point, 'resourcesCumulative')
    const hasSpent = record(spentValue) != null
    const spent = hasSpent ? resources(spentValue) : null
    resourcesOut.push({
      timeSec,
      bank,
      spent,
      gathered: spent ? addResources(bank, spent) : bank,
      perMinute: record(field(point, 'resourcesPerMinute'))
        ? resources(field(point, 'resourcesPerMinute'))
        : null,
    })
    scoresOut.push({
      timeSec,
      economy: numberValue(field(point, 'scoreEconomy')) ?? 0,
      military: numberValue(field(point, 'scoreMilitary')) ?? 0,
      society: numberValue(field(point, 'scoreSociety')) ?? 0,
      technology: numberValue(field(point, 'scoreTechnology')) ?? 0,
      total: numberValue(field(point, 'scoreTotal')) ?? 0,
    })
  }
  return { resources: resourcesOut, scores: scoresOut }
}

function rawReplayPlayerById(root: JsonRecord): Map<number, JsonRecord> {
  const replaySummary = record(field(root, 'replaySummary'))
  const result = new Map<number, JsonRecord>()
  for (const item of list(field(replaySummary, 'players'))) {
    const player = record(item)
    const details = record(field(player, 'playerDetails'))
    const id = numberValue(field(details, 'playerId'))
    if (id != null && player) result.set(id, player)
  }
  return result
}

function casualtiesByPlayer(root: JsonRecord): Map<number, CasualtyEvent[]> {
  const replaySummary = record(field(root, 'replaySummary'))
  const stls = record(field(replaySummary, 'dataSTLS'))
  const result = new Map<number, CasualtyEvent[]>()
  for (const item of list(field(stls, 'lostEntities'))) {
    const raw = record(item)
    const targetPlayerId = numberValue(field(raw, 'targetPlayerId'))
    if (targetPlayerId == null) continue
    const event: CasualtyEvent = {
      timeSec: numberValue(field(raw, 'timestamp')) ?? 0,
      targetPlayerId,
      targetUnitType: stringValue(field(raw, 'targetUnitType')) ?? 'unknown',
      attackerPlayerId: numberValue(field(raw, 'attackerPlayerId')),
      attackerUnitType: stringValue(field(raw, 'attackerUnitType')),
    }
    const events = result.get(targetPlayerId) ?? []
    events.push(event)
    result.set(targetPlayerId, events)
  }
  return result
}

function playerFromGameSummary(
  value: unknown,
  rawPlayer: JsonRecord | undefined,
  casualties: Map<number, CasualtyEvent[]>,
): PlayerSummary | null {
  const player = record(value)
  const playerId = numberValue(field(player, 'playerId'))
  if (playerId == null) return null
  const timeline = timelineFromPlayer(player)
  const details = record(field(rawPlayer ?? null, 'playerDetails'))
  const rawEvents = list(field(details, 'unitTimeline'))
    .map((event) => eventFromRawUnit(event, playerId))
    .filter((event): event is BuildEvent => event != null)
  const fallbackEvents = list(field(player, 'units'))
    .map((event) => eventFromRawUnit(event, playerId))
    .filter((event): event is BuildEvent => event != null)
  const buildOrder = rawEvents.length > 0 ? rawEvents : fallbackEvents
  const losses = casualties.get(playerId)
  const gathered = resources(field(player, 'totalResourcesGathered'))
  const spent = resources(field(player, 'totalResourcesSpent'))
  const totals = {
    resourcesGathered: gathered,
    resourcesSpent: spent,
    unitsProduced: numberValue(field(player, 'unitsProduced')) ?? 0,
    unitsLost: numberValue(field(player, 'unitsLost')) ?? 0,
    unitsKilled: numberValue(field(player, 'unitsKilled')) ?? 0,
    buildingsLost: numberValue(field(player, 'buildingsLost')) ?? 0,
    buildingsRazed: numberValue(field(player, 'buildingsRazed')) ?? 0,
    techResearched: numberValue(field(player, 'techResearched')) ?? 0,
    largestArmy: null,
    sacredCaptured: numberValue(field(player, 'sacredSitesCaptured')) ?? 0,
    sacredLost: numberValue(field(player, 'sacredSitesLost')) ?? 0,
    sacredNeutralized: numberValue(field(player, 'sacredSitesNeutralized')) ?? 0,
    relicsCaptured: numberValue(field(player, 'relicsCaptured')),
    villagerHigh: null,
    age2Sec: numberValue(field(player, 'age2Timestamp')),
    age3Sec: numberValue(field(player, 'age3Timestamp')),
    age4Sec: numberValue(field(player, 'age4Timestamp')),
  }
  return {
    playerId,
    name: stringValue(field(player, 'playerName')),
    profileId: (numberValue(field(player, 'playerProfileId')) ?? 0) > 0
      ? numberValue(field(player, 'playerProfileId'))
      : null,
    civToken: stringValue(field(player, 'civ')),
    totals,
    villagersLost: losses ? losses.filter((event) => /villager/i.test(event.targetUnitType)).length : null,
    casualties: losses,
    buildOrder,
    resources: timeline.resources,
    scores: timeline.scores,
  }
}

function normalizeNewSummary(root: JsonRecord): MatchSummary | null {
  const gameSummary = record(field(root, 'gameSummary'))
  const players = list(field(gameSummary, 'players'))
  if (!gameSummary || players.length === 0) return null
  const rawById = rawReplayPlayerById(root)
  const casualties = casualtiesByPlayer(root)
  const normalized = players
    .map((player) => {
      const id = numberValue(field(record(player), 'playerId'))
      return playerFromGameSummary(player, id == null ? undefined : rawById.get(id), casualties)
    })
    .filter((player): player is PlayerSummary => player != null)
  if (normalized.length === 0) return null
  const stls = record(field(record(field(root, 'replaySummary')), 'dataSTLS'))
  const gameLengthSec = numberValue(field(stls, 'gameLength')) ??
    Math.max(0, ...normalized.flatMap((player) => player.buildOrder.map((event) => event.timeSec)))
  return {
    gameLengthSec: Number.isFinite(gameLengthSec) ? gameLengthSec : null,
    players: normalized,
    parser: makeReplayParserProvenance({
      stpdVersions: [],
      strictPlayers: normalized.length,
      totalPlayers: normalized.length,
      remote: true,
    }),
  }
}

function normalizeLegacyPlayer(value: unknown): PlayerSummary | null {
  const player = record(value)
  const playerId = numberValue(field(player, 'playerId')) ?? -1
  const rawResources = record(field(player, 'resources'))
  const timestamps = numberArray(field(rawResources, 'timestamps'))
  const resourcesOut: ResourcePoint[] = timestamps.map((timeSec, index) => {
    const at = (name: string): number => numberArray(field(rawResources, name))[index] ?? 0
    const bank = { food: at('food'), wood: at('wood'), gold: at('gold'), stone: at('stone') }
    const spent = {
      food: at('food_gathered') - bank.food,
      wood: at('wood_gathered') - bank.wood,
      gold: at('gold_gathered') - bank.gold,
      stone: at('stone_gathered') - bank.stone,
    }
    const hasGathered = ['food_gathered', 'wood_gathered', 'gold_gathered', 'stone_gathered'].some(
      (name) => numberArray(field(rawResources, name)).length > index,
    )
    return {
      timeSec,
      bank,
      gathered: hasGathered ? addResources(bank, spent) : bank,
      spent: hasGathered ? spent : null,
      perMinute: {
        food: at('food_per_min'),
        wood: at('wood_per_min'),
        gold: at('gold_per_min'),
        stone: at('stone_per_min'),
      },
    }
  })
  const scoreAt = (name: string, index: number): number => numberArray(field(rawResources, name))[index] ?? 0
  const scores = timestamps.map((timeSec, index) => ({
    timeSec,
    economy: scoreAt('economy', index),
    military: scoreAt('military', index),
    society: scoreAt('society', index),
    technology: scoreAt('technology', index),
    total: scoreAt('total', index),
  }))
  const buildOrder = list(field(player, 'buildOrder')).flatMap((entry) =>
    eventFromLegacy(entry, playerId),
  )
  const gathered = resources(field(player, 'totalResourcesGathered'))
  const spent = resources(field(player, 'totalResourcesSpent'))
  return {
    playerId,
    name: stringValue(field(player, 'name')),
    profileId: numberValue(field(player, 'profileId')),
    civToken: stringValue(field(player, 'civilizationAttrib')),
    totals: {
      resourcesGathered: gathered,
      resourcesSpent: spent,
      unitsProduced: 0,
      unitsLost: 0,
      unitsKilled: 0,
      buildingsLost: 0,
      buildingsRazed: 0,
      techResearched: 0,
      largestArmy: null,
      sacredCaptured: 0,
      sacredLost: 0,
      sacredNeutralized: 0,
      relicsCaptured: null,
      villagerHigh: null,
      age2Sec: null,
      age3Sec: null,
      age4Sec: null,
    },
    villagersLost: null,
    buildOrder,
    resources: resourcesOut,
    scores,
  }
}

/** Converts either `/Summary/new` or legacy `/Summary` JSON into our schema. */
export function normalizeReplaysApiSummary(input: unknown): MatchSummary | null {
  const root = record(input)
  const modern = root ? normalizeNewSummary(root) : null
  if (modern) return modern
  const legacyPlayers = Array.isArray(input) ? input : root ? list(field(root, 'players')) : []
  const players = legacyPlayers
    .map(normalizeLegacyPlayer)
    .filter((player): player is PlayerSummary => player != null)
  if (players.length === 0) return null
  return {
    gameLengthSec: Math.max(0, ...players.flatMap((player) => [
      ...player.resources.map((point) => point.timeSec),
      ...player.buildOrder.map((event) => event.timeSec),
    ])),
    players,
    parser: makeReplayParserProvenance({
      stpdVersions: [],
      strictPlayers: players.length,
      totalPlayers: players.length,
      remote: true,
    }),
  }
}
