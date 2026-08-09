import { app } from 'electron'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { join } from 'node:path'
import { parseReplayHeader } from '@domain/replay'
import { parseReplayCommandStream, type ReplayAnalysisResult } from '@domain/replayCommand'
import {
  createReplayActionLogWriter,
  readCachedReplayAnalysis,
  writeCachedReplayAnalysis,
} from './replayAnalysisCacheService'

/** Full replay files are usually small, but a long team game can be large. */
export const MAX_CACHED_REPLAY_BYTES = 100 * 1024 * 1024

function cacheDir(): string {
  return join(app.getPath('userData'), 'replay-cache')
}

function replayPath(gameId: number): string | null {
  if (!Number.isSafeInteger(gameId) || gameId <= 0) return null
  return join(cacheDir(), `${gameId}.rec`)
}

export interface CachedReplayInfo {
  cached: boolean
  sizeBytes: number | null
  path: string | null
}

export function getCachedReplayInfo(gameId: number): CachedReplayInfo {
  const path = replayPath(gameId)
  if (!path || !existsSync(path)) return { cached: false, sizeBytes: null, path: null }
  try {
    const stat = statSync(path)
    if (!stat.isFile() || stat.size <= 0) return { cached: false, sizeBytes: null, path: null }
    return { cached: true, sizeBytes: stat.size, path }
  } catch {
    return { cached: false, sizeBytes: null, path: null }
  }
}

/** Writes an inflated replay atomically so a partial download is never exposed. */
export function writeCachedReplay(gameId: number, bytes: Uint8Array): CachedReplayInfo {
  const path = replayPath(gameId)
  if (!path) throw new Error('Invalid replay id.')
  if (bytes.byteLength <= 0) throw new Error('Replay download was empty.')
  if (bytes.byteLength > MAX_CACHED_REPLAY_BYTES) {
    throw new Error(
      `Replay is larger than the ${MAX_CACHED_REPLAY_BYTES / 1024 / 1024} MB cache limit.`,
    )
  }
  mkdirSync(cacheDir(), { recursive: true })
  const tempPath = `${path}.${process.pid}.${Date.now()}.tmp`
  try {
    writeFileSync(tempPath, bytes)
    renameSync(tempPath, path)
  } finally {
    // A failed write can leave a temporary file, but never the final cache file.
    try {
      if (existsSync(tempPath)) unlinkSync(tempPath)
    } catch {
      /* best-effort cleanup */
    }
  }
  return { cached: true, sizeBytes: bytes.byteLength, path }
}

/** Analyze one replay file and journal every decoded command without a memory-sized event array. */
export function analyzeReplayFile(
  id: string,
  source: 'local' | 'cached',
  sourcePath: string,
  recordedAtMs: number,
  bytes: Uint8Array,
  analysisKey = `${source}:${id}`,
): ReplayAnalysisResult {
  const actionLog = createReplayActionLogWriter(analysisKey)
  const commandStream = parseReplayCommandStream(bytes, undefined, {
    onEvent: (event) => actionLog.push(event),
  })
  const result: ReplayAnalysisResult = {
    id,
    source,
    sourcePath,
    recordedAtMs,
    info: parseReplayHeader(bytes),
    commandStream,
    actionLog: actionLog.finish(commandStream.coverage === 'full'),
  }
  writeCachedReplayAnalysis(analysisKey, result)
  return result
}

/** Analyze an authenticated replay already present in the local cache. */
export function analyzeCachedReplay(gameId: number): ReplayAnalysisResult | null {
  const cached = getCachedReplayInfo(gameId)
  if (!cached.cached || !cached.path) return null
  try {
    const stat = statSync(cached.path)
    const recordedAtMs = stat.mtimeMs
    const analysisKey = `cached:${gameId}`
    const previous = readCachedReplayAnalysis(analysisKey, cached.path, recordedAtMs)
    if (previous) return previous
    const bytes = new Uint8Array(readFileSync(cached.path))
    return analyzeReplayFile(
      `cached:${gameId}`,
      'cached',
      cached.path,
      recordedAtMs,
      bytes,
      analysisKey,
    )
  } catch {
    return null
  }
}
