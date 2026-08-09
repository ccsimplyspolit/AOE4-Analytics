import { app } from 'electron'
import { createHash } from 'node:crypto'
import {
  closeSync,
  createReadStream,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
  writeSync,
} from 'node:fs'
import { createInterface } from 'node:readline'
import { join } from 'node:path'
import type {
  ReplayActionLog,
  ReplayActionPage,
  ReplayAnalysisResult,
  ReplayCommandEvent,
} from '@domain/replayCommand'

const SCHEMA_VERSION = 2

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

function actionLogPath(key: string): string {
  const hash = createHash('sha256').update(key).digest('hex')
  return join(cacheDir(), `${hash}.ndjson`)
}

export interface ReplayActionLogWriter {
  push(event: ReplayCommandEvent): void
  finish(complete: boolean): ReplayActionLog | undefined
}

/**
 * Creates a bounded-memory journal for every decoded command. The UI keeps a
 * small preview in JSON, while this NDJSON file remains the complete audit
 * stream and can be paged without loading the whole replay into renderer memory.
 */
export function createReplayActionLogWriter(key: string): ReplayActionLogWriter {
  const finalPath = actionLogPath(key)
  const temporary = `${finalPath}.${process.pid}.${Date.now()}.tmp`
  let fd: number | null = null
  let count = 0
  let failed = false
  try {
    mkdirSync(cacheDir(), { recursive: true })
    fd = openSync(temporary, 'w')
  } catch {
    failed = true
  }
  return {
    push(event) {
      if (failed || fd == null) return
      try {
        writeSync(fd, `${JSON.stringify(event)}\n`)
        count += 1
      } catch {
        failed = true
      }
    },
    finish(complete) {
      if (fd != null) {
        try {
          closeSync(fd)
        } catch {
          /* best effort */
        }
        fd = null
      }
      if (failed) {
        try {
          if (existsSync(temporary)) unlinkSync(temporary)
        } catch {
          /* best effort */
        }
        return undefined
      }
      try {
        renameSync(temporary, finalPath)
        return { path: finalPath, format: 'ndjson', eventCount: count, complete }
      } catch {
        try {
          if (existsSync(temporary)) unlinkSync(temporary)
        } catch {
          /* best effort */
        }
        return undefined
      }
    },
  }
}

function isAnalysis(value: unknown): value is ReplayAnalysisResult {
  if (!value || typeof value !== 'object') return false
  const result = value as Partial<ReplayAnalysisResult>
  const valid =
    typeof result.id === 'string' &&
    (result.source === 'local' || result.source === 'cached') &&
    typeof result.sourcePath === 'string' &&
    Number.isFinite(result.recordedAtMs) &&
    result.commandStream != null &&
    typeof result.commandStream === 'object'
  if (!valid) return false
  return (
    result.actionLog == null ||
    (result.actionLog.format === 'ndjson' &&
      typeof result.actionLog.path === 'string' &&
      existsSync(result.actionLog.path))
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

/** Read one bounded page from the complete action journal on disk. */
export async function readReplayActionPage(
  result: ReplayAnalysisResult,
  requestedOffset = 0,
  requestedLimit = 100,
  playerId: number | null = null,
): Promise<ReplayActionPage | null> {
  const log = result.actionLog
  if (!log || log.format !== 'ndjson' || !existsSync(log.path)) return null
  const offset = Math.max(0, Math.floor(requestedOffset))
  const limit = Math.max(1, Math.min(500, Math.floor(requestedLimit)))
  const events: ReplayCommandEvent[] = []
  let total = 0
  try {
    const input = createReadStream(log.path, { encoding: 'utf8' })
    const lines = createInterface({ input, crlfDelay: Infinity })
    try {
      for await (const line of lines) {
        if (!line.trim()) continue
        let event: ReplayCommandEvent
        try {
          event = JSON.parse(line) as ReplayCommandEvent
        } catch {
          continue
        }
        if (playerId != null && event.playerId !== playerId) continue
        if (total >= offset && events.length < limit) events.push(event)
        total += 1
      }
    } finally {
      lines.close()
      input.destroy()
    }
    return { events, offset, limit, total, playerId, complete: log.complete }
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
