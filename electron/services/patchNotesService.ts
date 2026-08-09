import { REQUEST_TIMEOUT_MS, USER_AGENT } from '@api/client'
import { fetchWithTimeout } from '@api/fetchWithTimeout'
import {
  parsePatchSource,
  patchSummaryFromFileName,
  sortPatchNotes,
  toPatchSummary,
  type PatchNotes,
  type PatchNotesCatalog,
  type PatchNotesSummary,
} from '@domain/patchNotes'
import type { IpcResult } from '@ipc/contract'
import { err, ok } from './result'

const PATCH_PAGE_URL = 'https://aoe4world.com/explorer/patches'
const PATCH_DIRECTORY_URL =
  'https://api.github.com/repos/aoe4world/explorer/contents/src/data/patches?ref=main'
const PATCH_SOURCE_BASE_URL = 'https://aoe4world.com/explorer/patches'
const PATCH_REPOSITORY_URL = 'https://github.com/aoe4world/explorer/tree/main/src/data/patches'
const CACHE_TTL_MS = 30 * 60_000

interface GitHubPatchFile {
  name: string
  type: string
  download_url: string | null
}

let cached: { expiresAt: number; value: PatchNotesCatalog } | null = null
let cachedDetails = new Map<string, PatchNotes>()

async function getText(url: string, accept: string): Promise<string> {
  const response = await fetchWithTimeout(
    globalThis.fetch.bind(globalThis),
    url,
    { headers: { 'User-Agent': USER_AGENT, Accept: accept } },
    REQUEST_TIMEOUT_MS,
  )
  if (!response.ok) throw new Error(`AoE4World patch source returned ${response.status}.`)
  return response.text()
}

function validPatchFile(value: unknown): value is GitHubPatchFile {
  if (!value || typeof value !== 'object') return false
  const file = value as Record<string, unknown>
  return (
    typeof file.name === 'string' &&
    /^patch-.*\.tsx$/i.test(file.name) &&
    file.type === 'file' &&
    (file.download_url == null || typeof file.download_url === 'string')
  )
}

async function listPatchFiles(): Promise<GitHubPatchFile[]> {
  const body = await getText(PATCH_DIRECTORY_URL, 'application/vnd.github+json')
  const parsed: unknown = JSON.parse(body)
  if (!Array.isArray(parsed)) throw new Error('AoE4World patch directory returned an invalid list.')
  return parsed.filter(validPatchFile)
}

async function loadPatch(file: GitHubPatchFile): Promise<PatchNotes> {
  if (!file.download_url || !file.download_url.startsWith('https://raw.githubusercontent.com/')) {
    return parsePatchSource('', file.name, PATCH_SOURCE_BASE_URL)
  }
  try {
    return parsePatchSource(
      await getText(file.download_url, 'text/plain'),
      file.name,
      PATCH_SOURCE_BASE_URL,
    )
  } catch {
    return parsePatchSource('', file.name, PATCH_SOURCE_BASE_URL)
  }
}

function selectedPatchId(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length === 0 || value.length > 120) return undefined
  return value
}

export async function getPatchNotes(
  patchId?: unknown,
  forceRefresh = false,
): Promise<IpcResult<PatchNotesCatalog>> {
  if (!forceRefresh && cached && cached.expiresAt > Date.now()) {
    const selected = selectedPatchId(patchId)
    return ok({
      ...cached.value,
      selected: selected == null ? cached.value.selected : (cachedDetails.get(selected) ?? null),
    })
  }

  try {
    const files = await listPatchFiles()
    if (files.length === 0) return err('api', 'AoE4World did not publish any patch notes.')
    const details = await Promise.all(files.map(loadPatch))
    const patches = sortPatchNotes(details.map(toPatchSummary))
    const requested = selectedPatchId(patchId)
    const selected =
      details.find((patch) => patch.id === requested) ??
      details.find((patch) => patch.id === patches[0]?.id) ??
      null
    const value: PatchNotesCatalog = {
      sourceUrl: PATCH_PAGE_URL,
      sourceRepository: PATCH_REPOSITORY_URL,
      capturedAt: new Date().toISOString(),
      patches,
      selected,
    }
    cachedDetails = new Map(details.map((patch) => [patch.id, patch]))
    cached = { expiresAt: Date.now() + CACHE_TTL_MS, value }
    return ok(value)
  } catch (error) {
    if (cached) {
      const requested = selectedPatchId(patchId)
      return ok({
        ...cached.value,
        selected:
          requested == null ? cached.value.selected : (cachedDetails.get(requested) ?? null),
      })
    }
    return err('network', error instanceof Error ? error.message : String(error))
  }
}

export function resetPatchNotesCache(): void {
  cached = null
  cachedDetails = new Map()
}

/** Exposed for unit tests and diagnostics without requiring an Electron app. */
export function fallbackPatchSummary(fileName: string): PatchNotesSummary {
  return patchSummaryFromFileName(fileName)
}
