export type PatchChangeKind =
  'buff' | 'nerf' | 'fix' | 'change' | 'rework' | 'add' | 'remove' | 'unknown'

export interface PatchChange {
  section: string
  kind: PatchChangeKind
  text: string
}

export interface PatchNotesSummary {
  id: string
  buildId: string
  name: string
  season: number | null
  type: 'update' | 'hotfix' | 'server-side' | 'unknown'
  date: string | null
  officialUrl: string | null
  aoe4WorldUrl: string
  summary: string | null
  changeCount: number
  changeKinds: PatchChangeKind[]
}

export interface PatchNotes extends PatchNotesSummary {
  introduction: string | null
  changes: PatchChange[]
}

export interface PatchNotesCatalog {
  sourceUrl: string
  sourceRepository: string
  capturedAt: string
  patches: PatchNotesSummary[]
  selected: PatchNotes | null
}

const CHANGE_KINDS = new Set<PatchChangeKind>([
  'buff',
  'nerf',
  'fix',
  'change',
  'rework',
  'add',
  'remove',
])

function unescapeSourceString(value: string): string {
  return value
    .replace(/\\([`"'\\])/g, '$1')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\s+$/g, '')
    .trim()
}

function sourceProperty(source: string, property: string): string | null {
  const pattern = new RegExp(
    `\\b${property}\\s*:\\s*(?:"((?:\\\\.|[^"\\\\])*)"|\\x60([\\s\\S]*?)\\x60)`,
  )
  const match = pattern.exec(source)
  const value = match?.[1] ?? match?.[2]
  return value == null ? null : unescapeSourceString(value)
}

function patchIdFromFileName(fileName: string): string {
  return fileName
    .replace(/\.tsx$/i, '')
    .replace(/^patch-/, 'patch-')
    .replace(/\./g, '-')
}

export function patchSummaryFromFileName(fileName: string): PatchNotesSummary {
  const base = fileName.replace(/\.tsx$/i, '')
  const buildId = base.match(/^patch-((?:\d+\.)+\d+)/i)?.[1] ?? base.replace(/^patch-/, '')
  const seasonMatch = base.match(/season[- ]?(\d+)/i)
  const type: PatchNotesSummary['type'] = /server-side/i.test(base)
    ? 'server-side'
    : /hotfix|hotpatch/i.test(base)
      ? 'hotfix'
      : /patch-/i.test(base)
        ? 'update'
        : 'unknown'
  const slug = base.replace(/^patch-/i, '')
  return {
    id: patchIdFromFileName(fileName),
    buildId,
    name: seasonMatch ? `Season ${seasonMatch[1]} update` : `Patch ${buildId}`,
    season: seasonMatch ? Number(seasonMatch[1]) : null,
    type,
    date: null,
    officialUrl: null,
    aoe4WorldUrl: `https://aoe4world.com/explorer/patches/${slug}`,
    summary: null,
    changeCount: 0,
    changeKinds: [],
  }
}

function changeKind(value: string): PatchChangeKind {
  return CHANGE_KINDS.has(value as PatchChangeKind) ? (value as PatchChangeKind) : 'unknown'
}

function cleanChangeText(value: string): string {
  return value.replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\s+/g, ' ').trim()
}

/**
 * Projects AoE4World Explorer's PatchNotes TSX into a renderer-safe model.
 * The upstream files are data declarations, not executable content; only
 * quoted metadata and diff tuples are accepted here.
 */
export function parsePatchSource(
  source: string,
  fileName: string,
  sourceBaseUrl = 'https://aoe4world.com/explorer/patches',
): PatchNotes {
  const fallback = patchSummaryFromFileName(fileName)
  const id = sourceProperty(source, 'id') ?? fallback.id
  const buildId = sourceProperty(source, 'buildId') ?? fallback.buildId
  const name = sourceProperty(source, 'name') ?? fallback.name
  const seasonValue = source.match(/\bseason\s*:\s*(\d+)/)?.[1]
  const season = seasonValue ? Number(seasonValue) : fallback.season
  const rawType = sourceProperty(source, 'type')
  const type: PatchNotesSummary['type'] =
    rawType === 'update' || rawType === 'hotfix' || rawType === 'server-side'
      ? rawType
      : fallback.type
  const rawDate = source.match(/\bdate\s*:\s*new Date\(["']([^"']+)["']\)/)?.[1]
  const parsedDate =
    rawDate && !Number.isNaN(Date.parse(rawDate)) ? new Date(rawDate).toISOString() : null
  const officialUrl = sourceProperty(source, 'officialUrl')
  const summary = sourceProperty(source, 'summary')
  const introduction = sourceProperty(source, 'introduction')
  const titleMatches = [...source.matchAll(/\btitle\s*:\s*["']((?:\\.|[^"'\\])*)["']/g)].map(
    (match) => ({ position: match.index ?? 0, title: unescapeSourceString(match[1] ?? '') }),
  )
  const changes: PatchChange[] = []
  const diffPattern =
    /\[\s*["'](buff|nerf|fix|change|rework|add|remove)["']\s*,\s*(?:"((?:\\.|[^"\\])*)"|`([\s\S]*?)`)\s*\]/g
  for (const match of source.matchAll(diffPattern)) {
    const section =
      [...titleMatches].reverse().find((title) => title.position < (match.index ?? 0))?.title ||
      'General changes'
    const text = cleanChangeText(match[2] ?? match[3] ?? '')
    if (text) changes.push({ section, kind: changeKind(match[1] ?? 'unknown'), text })
  }
  return {
    id,
    buildId,
    name,
    season: Number.isSafeInteger(season) ? season : null,
    type,
    date: parsedDate,
    officialUrl: officialUrl?.startsWith('https://') ? officialUrl : null,
    aoe4WorldUrl:
      fallback.aoe4WorldUrl ||
      `${sourceBaseUrl}/${fileName.replace(/\.tsx$/i, '').replace(/^patch-/i, '')}`,
    summary: summary || introduction?.split(/\n\s*\n/)[0]?.trim() || null,
    introduction,
    changes,
    changeCount: changes.length,
    changeKinds: [...new Set(changes.map((change) => change.kind))],
  }
}

export function toPatchSummary(patch: PatchNotes): PatchNotesSummary {
  const { introduction: _introduction, changes: _changes, ...summary } = patch
  void _introduction
  void _changes
  return summary
}

export function sortPatchNotes<T extends PatchNotesSummary>(patches: T[]): T[] {
  return [...patches].sort((left, right) => {
    const dateDiff = Date.parse(right.date ?? '') - Date.parse(left.date ?? '')
    if (Number.isFinite(dateDiff) && dateDiff !== 0) return dateDiff
    return right.buildId.localeCompare(left.buildId, undefined, { numeric: true })
  })
}
