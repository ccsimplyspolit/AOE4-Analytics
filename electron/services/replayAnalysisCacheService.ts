import { app } from 'electron'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { ReplayAnalysisResult } from '@domain/replayCommand'

const SCHEMA_VERSION = 1

interface CachedReplayAnalysis {
  schemaVersion: typeof SCHEMA_VERSION
  key: string
  sourcePath: string
  recordedAtMs: number
  result: ReplayAnalysisResult
}

function cacheDir(): string {
  return join(app.getPath('userData'), 'replay-analysis-cache')
}

function cachePath(key: string): string {
  const hash = createHash('sha256').update(key).digest('hex')
  return join(cacheDir(), `${hash}.json`)
}

function isAnalysis(value: unknown): value is ReplayAnalysisResult {
  if (!value || typeof value !== 'object') return false
  const result = value as Partial<ReplayAnalysisResult>
  return (
    typeof result.id === 'string' &&
    (result.source === 'local' || result.source === 'cached') &&
    typeof result.sourcePath === 'string' &&
    Number.isFinite(result.recordedAtMs) &&
    result.commandStream != null &&
    typeof result.commandStream === 'object'
  )
}

function isCachedAnalysis(
  value: unknown,
  key: string,
  sourcePath: string,
  recordedAtMs: number,
): value is CachedReplayAnalysis {
  if (!value || typeof value !== 'object') return false
  const entry = value as Partial<CachedReplayAnalysis>
  return (
    entry.schemaVersion === SCHEMA_VERSION &&
    entry.key === key &&
    entry.sourcePath === sourcePath &&
    entry.recordedAtMs === recordedAtMs &&
    isAnalysis(entry.result)
  )
}

/**
 * A result is usable only for the exact replay file revision that produced it.
 * Replacing a `.rec` changes its mtime, so the next request safely re-parses it.
 */
export function readCachedReplayAnalysis(
  key: string,
  sourcePath: string,
  recordedAtMs: number,
): ReplayAnalysisResult | null {
  const path = cachePath(key)
  if (!existsSync(path)) return null
  try {
    const value = JSON.parse(readFileSync(path, 'utf8')) as unknown
    return isCachedAnalysis(value, key, sourcePath, recordedAtMs) ? value.result : null
  } catch {
    return null
  }
}

/** Persists a complete decoded command stream atomically for subsequent launches. */
export function writeCachedReplayAnalysis(key: string, result: ReplayAnalysisResult): void {
  const path = cachePath(key)
  const entry: CachedReplayAnalysis = {
    schemaVersion: SCHEMA_VERSION,
    key,
    sourcePath: result.sourcePath,
    recordedAtMs: result.recordedAtMs,
    result,
  }
  const temporary = `${path}.${process.pid}.${Date.now()}.tmp`
  try {
    mkdirSync(cacheDir(), { recursive: true })
    writeFileSync(temporary, JSON.stringify(entry), 'utf8')
    renameSync(temporary, path)
  } catch {
    // Replay analysis is still useful for the current session if disk persistence fails.
  }
}
