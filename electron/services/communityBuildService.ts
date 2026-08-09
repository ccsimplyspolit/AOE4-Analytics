import { normalizeBuildOrder, type BuildOrder, type BuildStep } from '@domain/buildOrderSchema'
import { deriveBuildAgeTimings } from '@domain/buildOrderInsights'
import type { Aoe4GuidesBuildSummary, CommunityBuildSummary, IpcResult } from '@ipc/contract'
import { err, ok } from './result'

const AOE4_BUILDS_HOST = 'aoeivbuilds.com'
const AOE4_GUIDES_HOST = 'aoe4guides.com'
const AGE4_BUILDER_HOST = 'age4builder.com'
const BUILD_PATH = /\/build_orders\/(\d+)(?:\/|$)/i
const GUIDES_BUILD_PATH = /\/builds\/([A-Za-z0-9_-]+)(?:\/|$)/i
const STEP_LINE =
  /^\s*\*\s*\((\d+)\s*\/\s*(\d+)\s*\/\s*(\d+)\s*\/\s*(\d+)\)\s*(?:(~?\d+:[0-5]\d)\s+)?(.*)$/

type CommunityProvider = 'aoe4guides' | 'aoeivbuilds' | 'age4builder'

const GUIDES_CIVILIZATIONS: Record<string, string> = {
  ABB: 'Abbasid Dynasty',
  AYY: 'Ayyubids',
  BYZ: 'Byzantines',
  CHI: 'Chinese',
  DEL: 'Delhi Sultanate',
  ENG: 'English',
  FRE: 'French',
  HRE: 'Holy Roman Empire',
  JAP: 'Japanese',
  JDA: "Jeanne d'Arc",
  MAL: 'Malians',
  MON: 'Mongols',
  DRA: 'Order of the Dragon',
  OTT: 'Ottomans',
  RUS: 'Rus',
  ZXL: "Zhu Xi's Legacy",
  HOL: 'House of Lancaster',
  KTE: 'Knights of Cross and Rose',
  GOH: 'Golden Horde',
  MAC: 'Macedonian Dynasty',
  SEN: 'Sengoku Daimyo',
  TUG: 'Tughlaq Dynasty',
  JIN: 'Jin Dynasty',
}

const AGE4_BUILDER_CIVILIZATIONS: Record<string, string> = {
  AD: 'Abbasid Dynasty',
  CH: 'Chinese',
  DS: 'Delhi Sultanate',
  EN: 'English',
  FR: 'French',
  HR: 'Holy Roman Empire',
  MO: 'Mongols',
  RU: 'Rus',
  OT: 'Ottomans',
  MA: 'Malians',
}

export interface CommunityBuildCatalogPage {
  items: CommunityBuildSummary[]
}

export interface Aoe4GuidesCatalog {
  items: Aoe4GuidesBuildSummary[]
  sort: string
}

type Aoe4GuidesSort = 'score' | 'timeCreated' | 'views' | 'likes'

const AOE4_GUIDES_SORTS: Aoe4GuidesSort[] = ['score', 'timeCreated', 'views', 'likes']
const AOE4_GUIDES_CATALOG_CACHE_MS = 5 * 60_000

let aoe4GuidesCatalogCache: { items: Aoe4GuidesBuildSummary[]; loadedAt: number } | null = null
let aoe4GuidesCatalogInFlight: Promise<IpcResult<Aoe4GuidesBuildSummary[]>> | null = null

/**
 * Fetches the public AoE4Guides catalogue using the same typed civ/sort
 * boundary exposed by the `orda` client. Filtering stays local so the app
 * never executes provider page scripts.
 */
export async function listAoe4GuidesBuilds(input?: unknown): Promise<IpcResult<Aoe4GuidesCatalog>> {
  const options = normalizeAoe4GuidesCatalogInput(input)
  if (!options.ok) return options
  const catalog = await loadAllAoe4GuidesBuilds()
  if (!catalog.ok) return catalog

  const needle = options.query.toLocaleLowerCase()
  const items = catalog.data
    .filter(
      (item) =>
        !options.civilization || item.civilization === GUIDES_CIVILIZATIONS[options.civilization],
    )
    .filter((item) => matchesAoe4GuidesQuery(item, needle))
  return ok({ items: sortAoe4GuidesItems(items, options.sort), sort: options.sort })
}

/**
 * AoE4Guides does not provide pagination. To recover more than the provider's
 * ten-row response, combine every documented sort with every civilization and
 * merge the overlapping sets locally. This is cached because a search query
 * changes much more often than the source catalogue.
 */
async function loadAllAoe4GuidesBuilds(): Promise<IpcResult<Aoe4GuidesBuildSummary[]>> {
  if (
    aoe4GuidesCatalogCache &&
    Date.now() - aoe4GuidesCatalogCache.loadedAt < AOE4_GUIDES_CATALOG_CACHE_MS
  ) {
    return ok(aoe4GuidesCatalogCache.items)
  }
  if (aoe4GuidesCatalogInFlight) return aoe4GuidesCatalogInFlight

  aoe4GuidesCatalogInFlight = fetchAllAoe4GuidesBuilds().finally(() => {
    aoe4GuidesCatalogInFlight = null
  })
  return aoe4GuidesCatalogInFlight
}

async function fetchAllAoe4GuidesBuilds(): Promise<IpcResult<Aoe4GuidesBuildSummary[]>> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 90_000)
  const requests = AOE4_GUIDES_SORTS.flatMap((sort) => [
    { sort, civilization: null },
    ...Object.keys(GUIDES_CIVILIZATIONS).map((civilization) => ({ sort, civilization })),
  ])

  try {
    const byUrl = new Map<string, Aoe4GuidesBuildSummary>()
    // Keep the source responsive while still trying every public catalogue
    // segment. There is deliberately no result-count cap here.
    for (let index = 0; index < requests.length; index += 4) {
      const group = await Promise.all(
        requests.slice(index, index + 4).map(async ({ sort, civilization }) => {
          const params = new URLSearchParams({ orderBy: sort, overlay: 'true' })
          if (civilization) params.set('civ', civilization)
          const response = await fetch(`https://${AOE4_GUIDES_HOST}/api/builds?${params}`, {
            headers: { Accept: 'application/json', 'User-Agent': 'RTSLytics/1.0' },
            signal: controller.signal,
          })
          if (!response.ok) throw new Error(`AoE4Guides returned HTTP ${response.status}.`)
          const body = (await response.json()) as unknown
          return extractGuidesBuilds(body)
            .map((raw, rowIndex) => normalizeAoe4GuidesRecord(raw, rowIndex))
            .filter((item): item is Aoe4GuidesBuildSummary => item !== null)
        }),
      )
      for (const items of group) {
        for (const item of items) byUrl.set(item.url, item)
      }
    }

    const items = [...byUrl.values()]
    aoe4GuidesCatalogCache = { items, loadedAt: Date.now() }
    return ok(items)
  } catch (error) {
    return err(
      'network',
      error instanceof Error ? error.message : 'Unable to load AoE4Guides builds.',
    )
  } finally {
    clearTimeout(timeout)
  }
}

function matchesAoe4GuidesQuery(item: Aoe4GuidesBuildSummary, needle: string): boolean {
  if (!needle) return true
  const text = [
    item.name,
    item.civilization,
    item.author,
    item.strategy,
    item.map,
    item.build.description,
    item.build.transcriptText,
  ]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase()
  return text.includes(needle)
}

function sortAoe4GuidesItems(
  items: Aoe4GuidesBuildSummary[],
  sort: Aoe4GuidesSort,
): Aoe4GuidesBuildSummary[] {
  const score = (item: Aoe4GuidesBuildSummary) => {
    if (sort === 'timeCreated') return item.updatedAt ? Date.parse(item.updatedAt) || 0 : 0
    if (sort === 'views') return item.views ?? 0
    if (sort === 'likes') return item.likes ?? 0
    return item.score ?? 0
  }
  return [...items].sort(
    (left, right) => score(right) - score(left) || left.name.localeCompare(right.name),
  )
}

function normalizeAoe4GuidesCatalogInput(
  input: unknown,
):
  | { ok: true; query: string; civilization: string | null; sort: Aoe4GuidesSort }
  | ReturnType<typeof err> {
  const value = input && typeof input === 'object' ? (input as Record<string, unknown>) : {}
  const query = typeof value.query === 'string' ? value.query.trim().slice(0, 80) : ''
  const rawCiv = typeof value.civilization === 'string' ? value.civilization.trim() : ''
  const civ = rawCiv ? rawCiv.toUpperCase() : null
  if (civ && !Object.prototype.hasOwnProperty.call(GUIDES_CIVILIZATIONS, civ)) {
    return err('validation', 'Unknown AoE4Guides civilization code.')
  }
  const rawSort = typeof value.sort === 'string' ? value.sort : 'score'
  if (!['score', 'timeCreated', 'views', 'likes'].includes(rawSort)) {
    return err('validation', 'AoE4Guides sort must be score, timeCreated, views, or likes.')
  }
  return { ok: true, query, civilization: civ, sort: rawSort as Aoe4GuidesSort }
}

function extractGuidesBuilds(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.filter(isRecord)
  if (!isRecord(value)) return []
  for (const key of ['builds', 'data', 'results']) {
    const candidate = value[key]
    if (Array.isArray(candidate)) return candidate.filter(isRecord)
  }
  return []
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function normalizeAoe4GuidesRecord(
  raw: Record<string, unknown>,
  index: number,
): Aoe4GuidesBuildSummary | null {
  const sourceValue = stringValue(raw.source)
  let sourceId: string | null = null
  if (sourceValue) {
    try {
      sourceId = GUIDES_BUILD_PATH.exec(new URL(sourceValue).pathname)?.[1] ?? null
    } catch {
      sourceId = null
    }
  }
  const id = stringValue(raw.id) ?? sourceId ?? `catalog-${index + 1}`
  const source = sourceValue ?? `https://${AOE4_GUIDES_HOST}/builds/${id}`
  const parsed = Array.isArray(raw.steps)
    ? parseAoe4GuidesBuild(raw, source)
    : (() => {
        // The current API returns the already-normalized `build_order` shape,
        // while older responses used grouped `steps`. Re-normalize provider
        // metadata here so Season 13 strings and video URLs do not leak into
        // the renderer with the wrong runtime types.
        const normalized = normalizeBuildOrder({
          ...raw,
          build_order: Array.isArray(raw.build_order)
            ? raw.build_order.map(normalizeAoe4GuidesStep)
            : raw.build_order,
          season: seasonNumber(raw.season),
          video: stringValue(raw.video),
          map: stringValue(raw.map),
          strategy: stringValue(raw.strategy),
          source,
          provider: 'aoe4guides',
          providerId: id,
          origin: 'imported',
          schemaVersion: 1,
        })
        return normalized.ok
          ? { ...normalized.value, ageTimings: deriveBuildAgeTimings(normalized.value) }
          : null
      })()
  if (!parsed) return null
  const civ = Array.isArray(parsed.civilization)
    ? (parsed.civilization[0] ?? 'Unknown')
    : parsed.civilization
  return {
    id,
    url: source,
    name: parsed.name,
    civilization: civ,
    author: parsed.author ?? null,
    strategy: parsed.strategy ?? null,
    map: parsed.map ?? null,
    video: parsed.video ?? null,
    score: parsed.score ?? null,
    views: parsed.views ?? null,
    likes: parsed.likes ?? null,
    season: parsed.season ?? null,
    updatedAt: parsed.updatedAt ?? parsed.capturedAt ?? null,
    stepCount: parsed.build_order.length,
    build: parsed,
  }
}

/**
 * Reads the public AOE4 Builds catalogue page. The provider does not expose a
 * documented JSON endpoint, so this intentionally parses only the stable
 * server-rendered `build-order` cards and never executes page scripts.
 */
export async function listCommunityBuilds(
  input?: unknown,
): Promise<IpcResult<CommunityBuildCatalogPage>> {
  const options = normalizeCatalogInput(input)
  if (!options.ok) return options

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 60_000)
  try {
    const byId = new Map<string, CommunityBuildSummary>()
    let page = 1
    let hasNext = true

    while (hasNext) {
      const response = await fetch(`https://${AOE4_BUILDS_HOST}/?page=${page}`, {
        headers: { Accept: 'text/html', 'User-Agent': 'RTSLytics/1.0' },
        signal: controller.signal,
      })
      if (!response.ok) return err('network', `AOE4 Builds returned HTTP ${response.status}.`)
      const html = await response.text()
      const parsed = parseCatalogHtml(html)
      const countBefore = byId.size
      for (const item of parsed) byId.set(item.id, item)

      // Stop on the site's explicit final page. The duplicate guard prevents
      // an infinite loop if a provider starts serving the same page twice.
      hasNext = hasNextCatalogPage(html, page)
      if (!hasNext || byId.size === countBefore) break
      page += 1
    }

    const needle = options.query.toLocaleLowerCase()
    const items = needle
      ? [...byId.values()].filter((item) =>
          [
            item.name,
            item.civilization,
            item.description,
            item.strategy,
            item.difficulty,
            item.author,
          ]
            .filter(Boolean)
            .some((value) => String(value).toLocaleLowerCase().includes(needle)),
        )
      : [...byId.values()]
    return ok({ items })
  } catch (error) {
    return err(
      'network',
      error instanceof Error ? error.message : 'Unable to load AOE4 Builds catalogue.',
    )
  } finally {
    clearTimeout(timeout)
  }
}

function normalizeCatalogInput(
  input: unknown,
): { ok: true; query: string } | ReturnType<typeof err> {
  const value = input && typeof input === 'object' ? (input as Record<string, unknown>) : {}
  const query = typeof value.query === 'string' ? value.query.trim().slice(0, 80) : ''
  return { ok: true, query }
}

function parseCatalogHtml(html: string): CommunityBuildSummary[] {
  const cards: CommunityBuildSummary[] = []
  const cardPattern =
    /<div\s+id=["']build_order_(\d+)["'][^>]*class=["'][^"']*build-order[^"']*["'][^>]*>([\s\S]*?)(?=<div\s+id=["']build_order_|<\/main>|$)/gi
  let match: RegExpExecArray | null
  while ((match = cardPattern.exec(html))) {
    const id = match[1]
    const block = match[2]
    if (!id || !block) continue
    const name = extractText(
      block,
      /<div\s+class=["'][^"']*build-order__title[^"']*["'][^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i,
    )
    if (!name) continue
    const description = extractText(
      block,
      /<div\s+class=["'][^"']*build-order__title[^"']*["'][^>]*>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i,
    )
    const civilization =
      decodeHtml((/<img[^>]+alt=["']([^"']+)["']/i.exec(block)?.[1] ?? '').trim()) || null
    const details = extractParagraphs(
      block,
      /<div\s+class=["'][^"']*build-order__details[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    )
    const creation = extractParagraphs(
      block,
      /<div\s+class=["'][^"']*build-order__creation-info[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    )
    const findDetail = (pattern: RegExp) => details.find((value) => pattern.test(value)) ?? null
    const findCreation = (pattern: RegExp) => creation.find((value) => pattern.test(value)) ?? null
    const author = cleanMetadata(findCreation(/^created by\s*:/i))
    const uploader = cleanMetadata(findCreation(/^uploaded by\s*:/i))
    const viewsText = cleanMetadata(findCreation(/^views\s*:/i))
    const likes = cleanMetadata(findCreation(/%|likes?/i))
    const views = viewsText ? Number(viewsText.replace(/[^\d]/g, '')) || null : null
    cards.push({
      id,
      url: `https://${AOE4_BUILDS_HOST}/build_orders/${id}`,
      name,
      civilization,
      description,
      openness: findDetail(/^(open|closed)$/i),
      strategy: findDetail(/^(economic|timing attack|military|defensive|hybrid)/i),
      difficulty: findDetail(/^(easy|medium|hard|expert)/i),
      author,
      uploader,
      views,
      likes,
    })
  }
  return cards
}

function extractText(block: string, pattern: RegExp): string | null {
  const value = pattern.exec(block)?.[1]
  if (!value) return null
  const text = decodeHtml(value.replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()
  return text || null
}

function extractParagraphs(block: string, wrapper: RegExp): string[] {
  const inner = wrapper.exec(block)?.[1] ?? ''
  return [...inner.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((match) => match[1])
    .filter((value): value is string => value != null)
    .map((value) =>
      decodeHtml(value.replace(/<[^>]+>/g, ' '))
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter(Boolean)
}

function cleanMetadata(value: string | null): string | null {
  if (!value) return null
  return value.replace(/^[^:]+:\s*/i, '').trim() || null
}

function hasNextCatalogPage(html: string, page: number): boolean {
  return new RegExp(`(?:\\?|&)page=${page + 1}(?:["'&]|$)`, 'i').test(html)
}

/** Fetches and normalizes the plain-text export exposed by AOE4 Builds. */
export async function importCommunityBuild(input: unknown): Promise<IpcResult<BuildOrder>> {
  if (typeof input !== 'string' || !input.trim()) return err('validation', 'Build URL is required.')
  let url: URL
  try {
    url = new URL(input.trim())
  } catch {
    return err('validation', 'Enter a valid AoE4 build URL.')
  }
  const provider = providerForHost(url.hostname)
  if (!provider) {
    return err(
      'validation',
      'Supported sources: aoe4guides.com, aoeivbuilds.com, and age4builder.com.',
    )
  }
  if (provider === 'aoe4guides') return importAoe4GuidesBuild(url)
  if (provider === 'age4builder') return importAge4BuilderBuild(url)

  const match = BUILD_PATH.exec(url.pathname)
  if (!match?.[1]) return err('validation', 'The AOE4 Builds link does not contain a build id.')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)
  try {
    const sourceUrl = `https://${AOE4_BUILDS_HOST}/build_orders/${match[1]}`
    const response = await fetch(`${sourceUrl}/download.txt`, {
      headers: { Accept: 'text/plain', 'User-Agent': 'RTSLytics/1.0' },
      signal: controller.signal,
    })
    if (!response.ok) return err('network', `AOE4 Builds returned HTTP ${response.status}.`)
    const text = await response.text()
    const build = parseTextExport(text, sourceUrl)
    return build ? ok(build) : err('validation', 'The AOE4 Builds export contains no steps.')
  } catch (error) {
    return err(
      'network',
      error instanceof Error ? error.message : 'Unable to load AOE4 Builds export.',
    )
  } finally {
    clearTimeout(timeout)
  }
}

function providerForHost(hostname: string): CommunityProvider | null {
  const host = hostname.toLocaleLowerCase()
  if (host === AOE4_GUIDES_HOST || host.endsWith(`.${AOE4_GUIDES_HOST}`)) return 'aoe4guides'
  if (host === AOE4_BUILDS_HOST || host.endsWith(`.${AOE4_BUILDS_HOST}`)) return 'aoeivbuilds'
  if (host === AGE4_BUILDER_HOST || host.endsWith(`.${AGE4_BUILDER_HOST}`)) return 'age4builder'
  return null
}

async function importAoe4GuidesBuild(url: URL): Promise<IpcResult<BuildOrder>> {
  const match = GUIDES_BUILD_PATH.exec(url.pathname)
  if (!match?.[1]) return err('validation', 'The AoE4Guides link does not contain a build id.')
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)
  try {
    const sourceUrl = `https://${AOE4_GUIDES_HOST}/builds/${match[1]}`
    const response = await fetch(`https://${AOE4_GUIDES_HOST}/api/builds/${match[1]}`, {
      headers: { Accept: 'application/json', 'User-Agent': 'RTSLytics/1.0' },
      signal: controller.signal,
    })
    if (!response.ok) return err('network', `AoE4Guides returned HTTP ${response.status}.`)
    const build = parseAoe4GuidesBuild(await response.json(), sourceUrl)
    return build ? ok(build) : err('validation', 'The AoE4Guides response contains no steps.')
  } catch (error) {
    return err(
      'network',
      error instanceof Error ? error.message : 'Unable to load AoE4Guides build.',
    )
  } finally {
    clearTimeout(timeout)
  }
}

export function parseAoe4GuidesBuild(input: unknown, source: string): BuildOrder | null {
  if (!input || typeof input !== 'object') return null
  const raw = input as Record<string, unknown>
  const groups = Array.isArray(raw.steps) ? raw.steps : []
  const steps: BuildStep[] = []
  let previousAge = 1
  let previousPopulation = 5

  for (const groupValue of groups) {
    if (!groupValue || typeof groupValue !== 'object') continue
    const group = groupValue as Record<string, unknown>
    const groupAge = numberValue(group.age) ?? previousAge
    const age = group.type === 'ageUp' ? Math.min(4, groupAge + 1) : groupAge
    const groupSteps = Array.isArray(group.steps) ? group.steps : []
    for (const stepValue of groupSteps) {
      if (!stepValue || typeof stepValue !== 'object') continue
      const step = stepValue as Record<string, unknown>
      const resources = {
        food: resourceValue(step.food),
        wood: resourceValue(step.wood),
        gold: resourceValue(step.gold),
        stone: resourceValue(step.stone),
      }
      const builders = resourceValueOrNull(step.builders)
      const explicitVillagers = resourceValueOrNull(step.villagers)
      const assigned = Object.values(resources).reduce((sum, value) => sum + value, 0)
      const villagerCount = explicitVillagers ?? assigned
      const population = Math.max(previousPopulation + 1, villagerCount + (builders ?? 0))
      const description = typeof step.description === 'string' ? step.description : ''
      const time = normalizedTime(step.time)
      steps.push({
        ...(time ? { time } : {}),
        ...(time ? { timeProvenance: timeProvenance(step.time) } : {}),
        population_count: population,
        villager_count: villagerCount,
        age,
        resources: { ...resources, ...(builders != null ? { builder: builders } : {}) },
        notes: [normalizeProviderHtml(description) || 'Continue the current plan'],
      })
      previousPopulation = population
      previousAge = age
    }
  }
  if (steps.length === 0) return null

  const civCode = stringValue(raw.civ) ?? ''
  const capturedAt =
    isoDate(raw.timeUpdated) ?? isoDate(raw.timeCreated) ?? new Date().toISOString()
  const build: BuildOrder = {
    schemaVersion: 1,
    name: stringValue(raw.title) ?? stringValue(raw.name) ?? 'Imported AoE4Guides build',
    civilization: GUIDES_CIVILIZATIONS[civCode] ?? (civCode || 'Unknown'),
    opponentCivilization:
      stringValue(raw.opponentCivilization) ?? stringValue(raw.opponent) ?? null,
    author: stringValue(raw.creatorName) ?? stringValue(raw.author) ?? 'AoE4Guides community',
    source,
    provider: 'aoe4guides',
    providerId: stringValue(raw.id),
    origin: 'imported',
    description: stringValue(raw.description),
    video: stringValue(raw.video),
    map: stringValue(raw.map),
    strategy: stringValue(raw.strategy),
    score: numberValue(raw.score),
    scoreAllTime: numberValue(raw.scoreAllTime),
    views: numberValue(raw.views),
    likes: numberValue(raw.likes),
    upvotes: numberValue(raw.upvotes),
    season: seasonNumber(raw.season),
    capturedAt,
    updatedAt: capturedAt,
    build_order: steps,
  }
  return { ...build, ageTimings: deriveBuildAgeTimings(build) }
}

async function importAge4BuilderBuild(url: URL): Promise<IpcResult<BuildOrder>> {
  const params = url.searchParams
  const civ = AGE4_BUILDER_CIVILIZATIONS[params.get('c')?.toUpperCase() ?? ''] ?? 'Unknown'
  const encoded = params.get('t') ?? params.get('s') ?? params.get('b')
  if (!encoded) {
    if (params.has('f')) {
      return err(
        'network',
        'This age4builder database link needs the provider session. Copy its Overlay JSON export into Cellar.',
      )
    }
    return err('validation', 'The age4builder link has no build payload (t, s, or b).')
  }
  const columns = params.has('t') ? 6 : 2
  const decoded =
    params.has('t') || params.has('s')
      ? decompressFromEncodedURIComponent(encoded)
      : safeDecode(encoded)
  if (!decoded) return err('validation', 'Could not decode the age4builder build URL.')
  const build = parseAge4BuilderPayload(decoded, civ, url.toString(), columns)
  return build ? ok(build) : err('validation', 'The age4builder payload contains no build steps.')
}

export function parseAge4BuilderPayload(
  payload: string,
  civilization: string,
  source: string,
  columns = 6,
): BuildOrder | null {
  const values = payload.split('|')
  const steps: BuildStep[] = []
  let previousPopulation = 5
  for (let offset = 0; offset + columns - 1 < values.length; offset += columns) {
    const time = normalizedTime(values[offset])
    const notesIndex = columns === 6 ? offset + 5 : offset + 1
    const notes = normalizeAge4BuilderText(values[notesIndex] ?? '')
    if (!time && !notes && values.slice(offset, offset + columns).every((value) => !value.trim()))
      continue
    const food = columns === 6 ? resourceValue(values[offset + 1]) : 0
    const wood = columns === 6 ? resourceValue(values[offset + 2]) : 0
    const stone = columns === 6 ? resourceValue(values[offset + 3]) : 0
    const gold = columns === 6 ? resourceValue(values[offset + 4]) : 0
    const villagerCount = food + wood + gold + stone
    previousPopulation = Math.max(previousPopulation + 1, villagerCount)
    steps.push({
      time,
      population_count: previousPopulation,
      villager_count: villagerCount,
      age: inferAge(notes, 1),
      resources: { food, wood, gold, stone },
      notes: [notes || 'Continue the current plan'],
    })
  }
  if (steps.length === 0) return null
  const now = new Date().toISOString()
  return {
    schemaVersion: 1,
    name: 'Imported age4builder build',
    civilization,
    author: 'age4builder community',
    source,
    provider: 'age4builder',
    origin: 'imported',
    capturedAt: now,
    updatedAt: now,
    build_order: steps,
  }
}

function normalizeAge4BuilderText(value: string): string {
  return value
    .replace(/\{(\d+)\}/g, 'action #$1')
    .replace(/&nbsp;/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeProviderHtml(value: string): string {
  const withTokens = value.replace(/<img\b([^>]+)>/gi, (_match, attrs: string) => {
    const source = /\bsrc\s*=\s*["']([^"']+)["']/i.exec(attrs)?.[1] ?? ''
    const title = /\b(?:title|alt)\s*=\s*["']([^"']+)["']/i.exec(attrs)?.[1]
    const token = iconTokenFromProviderPath(source)
    return token ? ` @${token}@ ` : title ? ` ${title} ` : ' '
  })
  return decodeHtml(withTokens.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()
}

function iconTokenFromProviderPath(value: string): string | null {
  const clean = value.replace(/\\/g, '/').replace(/\.(?:png|jpe?g|webp)$/i, '')
  const match =
    /(?:^|\/)((?:unit|building|landmark|technology|upgrade|ability|resource)[^/]*)\/([^/]+)$/i.exec(
      clean,
    )
  if (!match) return null
  const category = match[1]!.toLocaleLowerCase()
  const categoryName = category.startsWith('unit')
    ? 'units'
    : category.startsWith('building') || category.startsWith('landmark')
      ? 'buildings'
      : category.startsWith('technology') || category.startsWith('upgrade')
        ? 'technologies'
        : category.startsWith('resource')
          ? 'resource'
          : 'abilities'
  return `${categoryName}/${match[2]}`
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_match, code: string) => String.fromCodePoint(Number(code)))
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function numberValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value)))
    return Number(value)
  return null
}

function resourceValueOrNull(value: unknown): number | null {
  const parsed = numberValue(typeof value === 'string' ? value.replace(/\+$/, '') : value)
  return parsed == null ? null : Math.max(0, Math.round(parsed))
}

function resourceValue(value: unknown): number {
  return resourceValueOrNull(value) ?? 0
}

function normalizedTime(value: unknown): string | undefined {
  const text = stringValue(value)
  if (!text) return undefined
  const cleaned = text
    .replace(/<br\s*\/?\s*>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/[~≈]/g, '')
    .replace(/\s+/g, '')
    .trim()
  return cleaned || undefined
}

function timeProvenance(value: unknown): 'stated' | 'derived' {
  return typeof value === 'string' && /[~≈]/.test(value) ? 'derived' : 'stated'
}

function normalizeAoe4GuidesStep(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const step = value as Record<string, unknown>
  const time = normalizedTime(step.time)
  return {
    ...step,
    ...(time ? { time, timeProvenance: timeProvenance(step.time) } : {}),
  }
}

function seasonNumber(value: unknown): number | undefined {
  const parsed = numberValue(value)
  if (parsed != null) return Math.round(parsed)
  const match = typeof value === 'string' ? /\d+/.exec(value) : null
  return match ? Number(match[0]) : undefined
}

function isoDate(value: unknown): string | null {
  if (typeof value === 'string') {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date.toISOString()
  }
  if (value && typeof value === 'object' && '_seconds' in value) {
    const seconds = numberValue((value as Record<string, unknown>)._seconds)
    return seconds == null ? null : new Date(seconds * 1000).toISOString()
  }
  return null
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function decompressFromEncodedURIComponent(input: string): string | null {
  if (input === '') return ''
  const encoded = input.replace(/ /g, '+')
  return decompress(encoded.length, 32, (index) =>
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$'.indexOf(
      encoded.charAt(index),
    ),
  )
}

function decompress(
  length: number,
  resetValue: number,
  getNextValue: (index: number) => number,
): string | null {
  const dictionary: Array<string | number> = [0, 1, 2]
  let enlargeIn = 4
  let dictSize = 4
  let numBits = 3
  let entry: string
  const result: string[] = []
  let w: string
  let resb = 0
  const data = { val: getNextValue(0), position: resetValue, index: 1 }
  const readBits = (count: number): number => {
    let value = 0
    let power = 1
    const maxPower = 2 ** count
    while (power !== maxPower) {
      resb = data.val & data.position
      data.position >>= 1
      if (data.position === 0) {
        data.position = resetValue
        data.val = getNextValue(data.index++)
      }
      value |= (resb > 0 ? 1 : 0) * power
      power <<= 1
    }
    return value
  }
  const first = readBits(2)
  let c: string | number
  if (first === 0) c = String.fromCharCode(readBits(8))
  else if (first === 1) c = String.fromCharCode(readBits(16))
  else if (first === 2) return ''
  else return null
  dictionary[3] = c
  w = String(c)
  result.push(w)
  while (true) {
    if (data.index > length) return ''
    c = readBits(numBits)
    if (c === 0) {
      dictionary[dictSize++] = String.fromCharCode(readBits(8))
      c = dictSize - 1
      enlargeIn--
    } else if (c === 1) {
      dictionary[dictSize++] = String.fromCharCode(readBits(16))
      c = dictSize - 1
      enlargeIn--
    } else if (c === 2) return result.join('')
    if (enlargeIn === 0) {
      enlargeIn = 2 ** numBits
      numBits++
    }
    const numeric = typeof c === 'number' ? c : Number(c)
    if (dictionary[numeric] !== undefined) entry = String(dictionary[numeric])
    else if (numeric === dictSize) entry = w + w.charAt(0)
    else return null
    result.push(entry)
    dictionary[dictSize++] = w + entry.charAt(0)
    enlargeIn--
    if (enlargeIn === 0) {
      enlargeIn = 2 ** numBits
      numBits++
    }
    w = entry
  }
}

function parseTextExport(text: string, source: string): BuildOrder | null {
  const lines = text.split(/\r?\n/)
  const name = lines.find((line) => line.trim())?.trim() ?? 'Imported AOE4 Build'
  const steps: BuildStep[] = []
  let previousAge = 1
  let previousPopulation = 5
  for (const line of lines) {
    const match = STEP_LINE.exec(line)
    if (!match) continue
    const [, food, wood, gold, stone, rawTime, rawNote] = match
    const resources = {
      food: Number(food),
      wood: Number(wood),
      gold: Number(gold),
      stone: Number(stone),
    }
    const assigned = resources.food + resources.wood + resources.gold + resources.stone
    const note = (rawNote ?? '').trim() || 'Continue the current plan'
    const age = inferAge(note, previousAge)
    previousAge = age
    previousPopulation = Math.max(previousPopulation + 1, assigned + 1)
    steps.push({
      time: rawTime?.replace(/^~/, ''),
      population_count: previousPopulation,
      villager_count: assigned,
      age,
      resources,
      notes: [note],
    })
  }
  if (steps.length === 0) return null
  const createdBy = metadataLine(lines, 'Created By:')
  const uploadedBy = metadataLine(lines, 'Uploaded By:')
  return {
    schemaVersion: 1,
    name,
    civilization: inferCiv(lines) ?? 'Unknown',
    opponentCivilization: metadataLine(lines, 'Opponent:'),
    author: createdBy ?? uploadedBy ?? 'AOE4 Builds community',
    source,
    provider: 'aoeivbuilds',
    origin: 'imported',
    description:
      'Imported from the AOE4 Builds plain-text export. Population counts are conservative estimates because the provider export only exposes worker assignments.',
    updatedAt: new Date().toISOString(),
    build_order: steps,
  }
}

function inferAge(note: string, previous: number): number {
  const lower = note.toLocaleLowerCase()
  if (/(imperial|age iv|age 4)/.test(lower)) return 4
  if (/(castle|age iii|age 3)/.test(lower)) return 3
  if (/(feudal|age ii|age 2|age up)/.test(lower)) return Math.max(2, previous)
  return previous
}

function inferCiv(lines: string[]): string | null {
  const line = lines.find((item) => /^\s*(?:civilization|civ)\s*:/i.test(item))
  return line?.split(':').slice(1).join(':').trim() || null
}

function metadataLine(lines: string[], label: string): string | null {
  const line = lines.find((item) =>
    item.trimStart().toLocaleLowerCase().startsWith(label.toLocaleLowerCase()),
  )
  return (
    line
      ?.slice(line.toLocaleLowerCase().indexOf(label.toLocaleLowerCase()) + label.length)
      .trim() || null
  )
}
