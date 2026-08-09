import { app } from 'electron'
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { VideoAnalysisRecord } from '@domain/videoAnalysis'

const STORE_FILE = 'video-analyses.json'
const MAX_RECORDS = 500

function storePath(): string {
  return join(app.getPath('userData'), STORE_FILE)
}

function isRecord(value: unknown): value is VideoAnalysisRecord {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<VideoAnalysisRecord>
  return (
    item.schemaVersion === 1 &&
    typeof item.id === 'string' &&
    typeof item.url === 'string' &&
    typeof item.capturedAt === 'string' &&
    Boolean(item.build && typeof item.build === 'object')
  )
}

function readRecords(): VideoAnalysisRecord[] {
  try {
    const parsed = JSON.parse(readFileSync(storePath(), 'utf8')) as unknown
    return Array.isArray(parsed) ? parsed.filter(isRecord).slice(0, MAX_RECORDS) : []
  } catch {
    return []
  }
}

function writeRecords(records: VideoAnalysisRecord[]): boolean {
  const path = storePath()
  const temporary = `${path}.tmp`
  try {
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(temporary, JSON.stringify(records.slice(0, MAX_RECORDS), null, 2), 'utf8')
    renameSync(temporary, path)
    return true
  } catch (error) {
    console.warn('[video-analysis] could not persist local archive', error)
    return false
  }
}

/** Returns newest-first locally persisted video/VOD analysis records. */
export function listVideoAnalyses(): VideoAnalysisRecord[] {
  return readRecords().sort((left, right) => right.capturedAt.localeCompare(left.capturedAt))
}

/** Upserts one extraction by stable provider/video id. */
export function saveVideoAnalysis(record: VideoAnalysisRecord): boolean {
  const next = [record, ...readRecords().filter((item) => item.id !== record.id)]
  return writeRecords(next)
}
