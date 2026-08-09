#!/usr/bin/env node
/**
 * Build the offline-first AoE4 icon catalogue.
 *
 * Inputs:
 *   - data/research/aoe4world-data/*.json (AoE4World/data snapshot)
 *   - optional decoded PNGs extracted from the game's UIArt.sga with
 *     AOEMods.Essence (see --native-png-root)
 *
 * Outputs:
 *   - src/data/vendor/aoe4-icons/images/* (AoE4World entity icons)
 *   - src/data/vendor/aoe4-icons/native/* (native UI icons, when supplied)
 *   - src/data/vendor/aoe4-icons/manifest.ts (static Vite asset imports + resolver)
 *   - src/data/vendor/aoe4-icons/metadata.json (compact provenance/coverage report)
 */
import { mkdir, readFile, readdir, copyFile, writeFile } from 'node:fs/promises'
import { existsSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = new Map()
for (let i = 2; i < process.argv.length; i += 1) {
  const arg = process.argv[i]
  if (arg?.startsWith('--')) args.set(arg, process.argv[i + 1] ?? true)
}

const sourceDir = path.resolve(root, String(args.get('--source-dir') ?? 'data/research/aoe4world-data'))
const outputDir = path.resolve(root, String(args.get('--output-dir') ?? 'src/data/vendor/aoe4-icons'))
const nativePngRoot = args.has('--native-png-root')
  ? path.resolve(String(args.get('--native-png-root')))
  : null
const includeEssenceReport = !args.has('--skip-essence-report')
const essenceReportPath = path.resolve(
  String(args.get('--essence-report') ?? 'data/research/essence/latest.json'),
)
const essenceReportReference = path.relative(root, essenceReportPath).replaceAll('\\', '/')
const download = !args.has('--no-download')
const kinds = ['units', 'buildings', 'technologies', 'upgrades']
const sourceCommit = 'b2cd38222deae40ba2db18171edf494f81410c69'
const cdnRoot = 'https://data.aoe4world.com/images'

let essenceReport = null
if (includeEssenceReport && existsSync(essenceReportPath)) {
  try {
    essenceReport = JSON.parse(await readFile(essenceReportPath, 'utf8'))
  } catch {
    essenceReport = null
  }
}

function json(value) {
  return JSON.stringify(value, null, 2) + '\n'
}

function canonical(value) {
  return String(value)
    .replace(/@/g, '')
    .replace(/\\/g, '/')
    .replace(/\.(?:png|jpe?g|webp|rrtex)$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9/]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/\/+$/, '')
}

function sourceRows(payload) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  return Object.values(payload ?? {}).flatMap((value) => (Array.isArray(value) ? value : []))
}

function iconPath(url) {
  try {
    const pathname = new URL(url).pathname
    const marker = '/images/'
    const at = pathname.indexOf(marker)
    if (at < 0) return null
    const relative = pathname.slice(at + marker.length)
    const parts = relative.split('/')
    const filename = parts.at(-1) ?? ''
    if (!filename || !parts[0]) return null
    if (!/\.[a-z0-9]+$/i.test(filename)) parts[parts.length - 1] = `${filename}.png`
    return parts.join('/')
  } catch {
    return null
  }
}

function assetImportName(index) {
  return `asset${String(index).padStart(4, '0')}`
}

async function ensureDir(directory) {
  await mkdir(directory, { recursive: true })
}

async function fetchWithRetry(url, attempts = 4) {
  let lastError
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { 'user-agent': 'AOE4-Analytics icon sync' } })
      if (response.ok) return Buffer.from(await response.arrayBuffer())
      lastError = new Error(`${response.status} ${response.statusText}`)
    } catch (error) {
      lastError = error
    }
    await new Promise((resolve) => setTimeout(resolve, 250 * attempt))
  }
  throw lastError ?? new Error(`Unable to fetch ${url}`)
}

async function walkPngs(directory) {
  const result = []
  if (!directory || !existsSync(directory)) return result
  async function walk(current) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name)
      if (entry.isDirectory()) await walk(full)
      else if (entry.isFile() && entry.name.toLowerCase().endsWith('.png')) result.push(full)
    }
  }
  await walk(directory)
  return result
}

const entities = []
const sourcePaths = new Map()
for (const kind of kinds) {
  const payload = JSON.parse(await readFile(path.join(sourceDir, `${kind}.json`), 'utf8'))
  for (const row of sourceRows(payload)) {
    const relative = row?.icon ? iconPath(row.icon) : null
    if (!relative) continue
    const parts = relative.split('/')
    const category = parts[0]
    const filename = parts.at(-1)
    if (!category || !filename) continue
    const key = relative
    sourcePaths.set(key, { category, filename, relative, url: row.icon })
    entities.push({
      kind,
      id: row.id ?? null,
      name: row.name ?? null,
      slug: row.slug ?? null,
      civilization: row.civilization ?? null,
      icon: `${cdnRoot}/${relative}`,
      asset: `images/${relative}`,
    })
  }
}

const uniquePaths = [...sourcePaths.values()].sort((a, b) => a.relative.localeCompare(b.relative))
const imagesRoot = path.join(outputDir, 'images')
await ensureDir(imagesRoot)

// Older generated catalogues may contain a flat file where the current CDN
// layout now expects a directory (for example images/units/abbasid). Keep the
// sync recoverable without deleting user files: flatten only the conflicting
// nested asset path and use that same path everywhere in the generated manifest.
function assetRelativePath(relative) {
  const parts = relative.split('/')
  let current = imagesRoot
  for (const part of parts.slice(0, -1)) {
    current = path.join(current, part)
    if (existsSync(current) && statSync(current).isFile()) {
      return `${parts[0]}/${parts.slice(1).join('-')}`
    }
  }
  return relative
}

let downloaded = 0
let reused = 0
const queue = [...uniquePaths]
async function downloadWorker() {
  while (queue.length > 0) {
    const item = queue.shift()
    if (!item) return
    const relative = assetRelativePath(item.relative)
    const destination = path.join(imagesRoot, relative)
    await ensureDir(path.dirname(destination))
    if (existsSync(destination)) {
      reused += 1
      continue
    }
    if (!download) continue
    const bytes = await fetchWithRetry(item.url)
    await writeFile(destination, bytes)
    downloaded += 1
  }
}
await Promise.all(Array.from({ length: 10 }, () => downloadWorker()))

const nativeAssets = []
if (nativePngRoot) {
  for (const file of await walkPngs(nativePngRoot)) {
    const relative = path.relative(nativePngRoot, file).replaceAll('\\', '/')
    const parts = relative.split('/')
    const iconIndex = parts.findIndex((part) => part.toLowerCase() === 'icons')
    const nativeRelative = (iconIndex >= 0 ? parts.slice(iconIndex + 1) : parts).join('/')
    if (!nativeRelative) continue
    const destination = path.join(outputDir, 'native', nativeRelative)
    await ensureDir(path.dirname(destination))
    if (path.resolve(file) !== path.resolve(destination)) await copyFile(file, destination)
    nativeAssets.push({ source: relative, asset: `native/${nativeRelative}` })
  }
} else {
  // Preserve the previously generated native catalogue when a caller only
  // refreshes AoE4World/data entity icons. Without this fallback a plain
  // `sync:icons` silently regenerated a manifest with zero native aliases.
  const existingNativeRoot = path.join(outputDir, 'native')
  for (const file of await walkPngs(existingNativeRoot)) {
    const relative = path.relative(existingNativeRoot, file).replaceAll('\\', '/')
    if (!relative) continue
    nativeAssets.push({ source: `existing/${relative}`, asset: `native/${relative}` })
  }
}

const aliasMap = new Map()
function addAlias(key, asset, priority = 0) {
  const normalized = canonical(key)
  if (!normalized) return
  const current = aliasMap.get(normalized)
  if (!current || priority < current.priority) aliasMap.set(normalized, { asset, priority })
}

function addEntityAliases(entity, relative) {
  const parts = relative.split('/')
  const category = parts.shift()
  const filename = parts.join('/')
  if (!category || !filename) return
  const stem = filename.replace(/\.[^.]+$/, '')
  const baseStem = stem.replace(/-\d+$/, '')
  const slug = entity.slug || stem
  const asset = `images/${assetRelativePath(relative)}`
  addAlias(`${category}/${stem}`, asset, 0)
  addAlias(`${category}/${baseStem}`, asset, 3)
  addAlias(`${category}/${slug}`, asset, 1)
  addAlias(entity.kind + '/' + stem, asset, 1)
  addAlias(entity.kind + '/' + baseStem, asset, 3)
  addAlias(entity.kind + '/' + slug, asset, 2)
  addAlias(stem, asset, 4)
  addAlias(slug, asset, 5)
  addAlias(entity.icon, asset, 0)
}

for (const entity of entities) {
  const relative = iconPath(entity.icon)
  if (relative) addEntityAliases(entity, relative)
}

function addNativeAliases(item) {
  const relative = item.asset.replace(/^native\//, '')
  const parts = relative.split('/')
  const file = parts.at(-1) ?? relative
  const stem = file.replace(/\.png$/i, '')
  const folder = parts.at(-2) ?? ''
  const asset = item.asset
  addAlias(`native/${relative}`, asset, 0)
  addAlias(stem, asset, 10)
  if (folder) addAlias(`${folder}/${stem}`, asset, 7)
  if (folder === 'resources') {
    const resource = stem.replace(/^resource_/, '').replace(/_icon$/, '')
    addAlias(`resource/${resource}`, asset, 2)
    addAlias(`resource/resource_${resource}`, asset, 1)
  }
  if (folder === 'age' || folder === 'highlights') {
    const match = stem.match(/(?:persistent_|highlight_|age_)([1-4])(?:_icon)?$/i)
    if (match) addAlias(`age/age_${match[1]}`, asset, 1)
  }
  if (folder === 'civ') {
    const civ = stem.replace(/^civ_icon_small_/, '')
    addAlias(`civilization_flag/${civ}`, asset, 1)
    addAlias(`flag/${civ}`, asset, 2)
  }
}
for (const item of nativeAssets) addNativeAliases(item)

const imports = []
const assetMap = new Map()
for (const item of uniquePaths) {
  const key = `images/${assetRelativePath(item.relative)}`
  const variable = assetImportName(imports.length)
  const importPath = `./${key}`
  imports.push({ variable, importPath, key })
  assetMap.set(key, variable)
}
for (const item of nativeAssets) {
  const key = item.asset
  const variable = assetImportName(imports.length)
  const importPath = `./${key}`
  imports.push({ variable, importPath, key })
  assetMap.set(key, variable)
}

const aliases = [...aliasMap.entries()]
  .map(([key, value]) => [key, value.asset])
  .sort(([a], [b]) => a.localeCompare(b))

const byKey = imports
  .map((item) => `  ${JSON.stringify(item.key)}: ${item.variable},`)
  .join('\n')
const byAlias = aliases
  .map(([key, asset]) => `  ${JSON.stringify(key)}: AOE4_ICON_ASSETS[${JSON.stringify(asset)}]!,`)
  .join('\n')
const importLines = imports.map((item) => `import ${item.variable} from ${JSON.stringify(item.importPath)}`).join('\n')

const manifestTs = `/** Generated by scripts/sync_aoe4_icons.mjs — do not edit by hand. */
${importLines}

export const AOE4_ICON_ASSETS: Record<string, string> = {
${byKey}
}

export const AOE4_ICON_ALIASES: Record<string, string> = {
${byAlias}
}

export function normalizeAoE4IconToken(value: string): string {
  return value
    .replace(/@/g, '')
    .replace(/\\\\/g, '/')
    .replace(/\\.(?:png|jpe?g|webp|rrtex)$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9/]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/\\/+$/, '')
}

export function resolveAoE4Icon(value: string): string | null {
  const normalized = normalizeAoE4IconToken(value)
  if (!normalized) return null
  const direct = AOE4_ICON_ALIASES[normalized]
  if (direct) return direct

  const parts = normalized.split('/')
  const stem = parts.at(-1) ?? normalized
  const category = parts.find((part) =>
    part === 'unit' ||
    part === 'units' ||
    part.startsWith('unit-') ||
    part === 'building' ||
    part === 'buildings' ||
    part.startsWith('building-') ||
    part === 'landmark' ||
    part.startsWith('landmark-') ||
    part === 'technology' ||
    part === 'technologies' ||
    part.startsWith('technology-') ||
    part === 'tech' ||
    part === 'upgrade' ||
    part === 'upgrades' ||
    part.startsWith('upgrade-') ||
    part === 'ability' ||
    part === 'abilities',
  )
  const categoryAliases: Record<string, string> = {
    unit: 'units',
    units: 'units',
    building: 'buildings',
    buildings: 'buildings',
    landmark: 'buildings',
    technology: 'technologies',
    technologies: 'technologies',
    tech: 'technologies',
    upgrade: 'upgrades',
    upgrades: 'upgrades',
    ability: 'abilities',
    abilities: 'abilities',
  }
  const categoryKey = category?.startsWith('unit-')
    ? 'units'
    : category?.startsWith('building-') || category?.startsWith('landmark-')
      ? 'buildings'
      : category?.startsWith('technology-')
        ? 'technologies'
        : category?.startsWith('upgrade-')
          ? 'upgrades'
          : category
  if (category) {
    const byCategory = AOE4_ICON_ALIASES[(categoryKey && (categoryAliases[categoryKey] ?? categoryKey)) + '/' + stem]
    if (byCategory) return byCategory
  }
  // The game uses a shared worker token (unit_worker/villager) while the
  // public catalogue stores civilization-specific villager art. Keep the
  // resolver deterministic and offline by selecting the canonical Abbasid
  // worker icon when no generic asset was published.
  if (stem === 'villager') {
    return AOE4_ICON_ALIASES['abbasid/villager-1'] ?? AOE4_ICON_ALIASES['gilded-villager-1'] ?? null
  }
  return AOE4_ICON_ALIASES[stem] ?? null
}
`

await ensureDir(outputDir)
await writeFile(path.join(outputDir, 'manifest.ts'), manifestTs)
await writeFile(
  path.join(outputDir, 'metadata.json'),
  json({
    generatedAt: new Date().toISOString(),
    source: 'aoe4world/data',
    sourceCommit,
    cdnRoot,
    entityCount: entities.length,
    uniqueEntityIcons: uniquePaths.length,
    nativeAssetCount: nativeAssets.length,
    aliasCount: aliases.length,
    downloaded,
    reused,
    essence: essenceReport
      ? {
          status: essenceReport.status ?? null,
          sourceRevision: essenceReport.sourceRevision ?? null,
          counts: essenceReport.counts ?? {},
          report: essenceReportReference,
        }
      : null,
  }),
)
await writeFile(
  path.join(outputDir, 'SOURCE.md'),
  [
    '# AoE4 icon catalogue',
    '',
    'Generated by `scripts/sync_aoe4_icons.mjs`.',
    '',
    '- Entity data and icon URLs: [aoe4world/data](https://github.com/aoe4world/data)',
    `- Pinned data commit: \`${sourceCommit}\``,
    `- Entity icons: ${uniquePaths.length} unique PNGs`,
    `- Native UI icons extracted with [AOEMods.Essence](https://github.com/aoemods/AOEMods.Essence): ${nativeAssets.length}`,
    essenceReport
      ? `- Essence adapter status: \`${essenceReport.status ?? 'unknown'}\` (${essenceReport.sourceRevision ?? 'unversioned'})`
      : '- Essence adapter report: not supplied for this run',
    `- Generated at: ${new Date().toISOString()}`,
    '',
    'The resolver is offline-first. It checks the bundled static catalogue before any caller may use a network CDN fallback.',
    '',
  ].join('\n'),
)

console.log(
  JSON.stringify(
    {
      outputDir,
      entityCount: entities.length,
      uniqueEntityIcons: uniquePaths.length,
      nativeAssetCount: nativeAssets.length,
      aliasCount: aliases.length,
      downloaded,
      reused,
    },
    null,
    2,
  ),
)
