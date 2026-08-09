import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { AccountReplayItem } from '@ipc/contract'

const SCHEMA_VERSION = 1

export interface AccountReplayArchiveSnapshot {
  schemaVersion: typeof SCHEMA_VERSION
  profileId: number
  cachedAt: string
  aoe4WorldCount: number
  relicCount: number
  relicOnlyCount: number
  items: AccountReplayItem[]
}

function archiveDir(): string {
  return join(app.getPath('userData'), 'account-replay-archive')
}

function archivePath(profileId: number): string | null {
  return Number.isSafeInteger(profileId) && profileId > 0
    ? join(archiveDir(), `${profileId}.json`)
    : null
}

function isSnapshot(value: unknown, profileId: number): value is AccountReplayArchiveSnapshot {
  if (!value || typeof value !== 'object') return false
  const snapshot = value as Partial<AccountReplayArchiveSnapshot>
  return (
    snapshot.schemaVersion === SCHEMA_VERSION &&
    snapshot.profileId === profileId &&
    typeof snapshot.cachedAt === 'string' &&
    Number.isFinite(snapshot.aoe4WorldCount) &&
    Number.isFinite(snapshot.relicCount) &&
    Number.isFinite(snapshot.relicOnlyCount) &&
    Array.isArray(snapshot.items) &&
    snapshot.items.every(
      (item) =>
        item != null &&
        typeof item === 'object' &&
        typeof item.game?.game_id === 'number' &&
        typeof item.game.started_at === 'string' &&
        (item.historySource === 'aoe4world' ||
          item.historySource === 'relic' ||
          item.historySource === 'merged') &&
        typeof item.replayAvailable === 'boolean' &&
        typeof item.summaryAvailable === 'boolean',
    )
  )
}

/** Reads the last complete account-history response without contacting either service. */
export function readAccountReplayArchive(profileId: number): AccountReplayArchiveSnapshot | null {
  const path = archivePath(profileId)
  if (!path || !existsSync(path)) return null
  try {
    const value = JSON.parse(readFileSync(path, 'utf8')) as unknown
    return isSnapshot(value, profileId) ? value : null
  } catch {
    return null
  }
}

/** Atomically stores a full account-history snapshot for offline Replay Lab use. */
export function writeAccountReplayArchive(
  profileId: number,
  snapshot: Omit<AccountReplayArchiveSnapshot, 'schemaVersion' | 'profileId' | 'cachedAt'>,
): void {
  const path = archivePath(profileId)
  if (!path) return
  const value: AccountReplayArchiveSnapshot = {
    schemaVersion: SCHEMA_VERSION,
    profileId,
    cachedAt: new Date().toISOString(),
    ...snapshot,
  }
  const temporary = `${path}.${process.pid}.${Date.now()}.tmp`
  try {
    mkdirSync(archiveDir(), { recursive: true })
    writeFileSync(temporary, JSON.stringify(value), 'utf8')
    renameSync(temporary, path)
  } catch {
    // A cache write must never prevent the current online history from rendering.
  }
}
