import { REQUEST_TIMEOUT_MS, USER_AGENT } from '@api/client'
import { fetchWithTimeout } from '@api/fetchWithTimeout'
import type { BeastyNumberData, IpcResult } from '@ipc/contract'
import { err, ok } from './result'

const PLAYERS_URL = 'https://beastynumber.com/assets/players-1c8f740c.txt'
const PATHS_URL = 'https://beastynumber.com/assets/paths-96b4e615.txt'
let datasetPromise: Promise<{ names: Map<number, string>; paths: Map<number, number[]> }> | null = null
const resultCache = new Map<number, BeastyNumberData>()

async function loadText(url: string): Promise<string> {
  const response = await fetchWithTimeout(
    globalThis.fetch.bind(globalThis),
    url,
    { headers: { 'User-Agent': USER_AGENT, Accept: 'text/plain' } },
    REQUEST_TIMEOUT_MS,
  )
  if (!response.ok) throw new Error(`Beasty Number dataset returned ${response.status}`)
  return response.text()
}

function parseNames(value: string): Map<number, string> {
  const names = new Map<number, string>()
  for (const line of value.split(/\r?\n/)) {
    const separator = line.indexOf(' ')
    if (separator <= 0) continue
    const id = Number(line.slice(0, separator))
    const name = line.slice(separator + 1).trim()
    if (Number.isSafeInteger(id) && name) names.set(id, name)
  }
  return names
}

function parsePaths(value: string): Map<number, number[]> {
  const paths = new Map<number, number[]>()
  for (const line of value.split(/\r?\n/)) {
    const ids = line.trim().split(/\s+/).map(Number).filter(Number.isSafeInteger)
    if (ids.length > 0 && ids[0] !== undefined) paths.set(ids[0], ids.slice(1))
  }
  return paths
}

async function loadDataset() {
  if (!datasetPromise) {
    datasetPromise = Promise.all([loadText(PLAYERS_URL), loadText(PATHS_URL)]).then(([players, paths]) => ({
      names: parseNames(players),
      paths: parsePaths(paths),
    }))
  }
  return datasetPromise
}

export async function getBeastyNumber(profileId: number): Promise<IpcResult<BeastyNumberData>> {
  if (!Number.isSafeInteger(profileId) || profileId <= 0) {
    return err('validation', 'A positive AoE4World profile id is required.')
  }
  const cached = resultCache.get(profileId)
  if (cached) return ok(cached)
  try {
    const dataset = await loadDataset()
    const ids = dataset.paths.get(profileId)
    if (!ids) return err('not_found', 'This profile is not present in the current Beasty Number dataset.')
    const pathIds = [profileId, ...ids]
    const number = pathIds.length === 2 && pathIds[1] === 0 ? 0 : Math.max(0, pathIds.length - 1)
    const result: BeastyNumberData = {
      profileId,
      number,
      path: pathIds.filter((id) => id > 0).map((id) => ({ profileId: id, name: dataset.names.get(id) ?? null })),
      capturedAt: new Date().toISOString(),
    }
    resultCache.set(profileId, result)
    return ok(result)
  } catch (error) {
    return err('network', error instanceof Error ? error.message : String(error))
  }
}
