import { app } from 'electron'
import { join } from 'node:path'
import type { StatsLeaderboard } from '@api/types'
import { getClient } from './appContext'
import { fetchWithTimeout } from '@api/fetchWithTimeout'
import { USER_AGENT } from '@api/client'
import {
  CURRENT_RANKED_MAP_POOL,
  normalizeMapName,
  resolveSnapshotForLeaderboard,
  type RankedMapPoolRefreshInfo,
  type RankedMapPoolResolution,
  type RankedMapPoolSnapshot,
} from '@domain/rankedMapPool'
import { parseOfficialMapPoolPost, type OfficialMapPoolPost } from '@domain/rankedMapPoolParser'
import { JsonStore } from '@store/jsonStore'
import type { IpcResult } from '@ipc/contract'
import { ok } from './result'

const REFRESH_INTERVAL_MS = 6 * 60 * 60_000
const REQUEST_TIMEOUT_MS = 15_000
const SEARCH_URL =
  'https://www.ageofempires.com/wp-json/wp/v2/search?search=ranked%20map%20pool&per_page=20&orderby=date&order=desc'
const POSTS_URL = 'https://www.ageofempires.com/wp-json/wp/v2/posts/'

interface PersistedState {
  snapshot: RankedMapPoolSnapshot | null
  lastCheckedAt: string | null
  lastError: string | null
  refreshStatus: RankedMapPoolRefreshInfo['status']
}

interface OfficialSearchHit {
  id: number
  subtype?: string
}

interface OfficialPostResponse {
  id: number
  link: string
  date: string
  title?: { rendered?: string }
  content?: { rendered?: string }
}

let store: JsonStore | null = null
let state: PersistedState | null = null
let inFlight: Promise<void> | null = null
let timer: ReturnType<typeof setInterval> | null = null

function getStore(): JsonStore {
  if (!store) store = new JsonStore(join(app.getPath('userData'), 'ranked-map-pool.json'))
  return store
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object'
}

function validDate(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value))
}

function validMapList(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length === 9 &&
    value.every((map) => typeof map === 'string' && map.trim().length > 0) &&
    new Set(value.map(normalizeMapName)).size === 9
  )
}

function isSnapshot(value: unknown): value is RankedMapPoolSnapshot {
  if (!isRecord(value)) return false
  return (
    value.schemaVersion === 1 &&
    typeof value.snapshotId === 'string' &&
    (value.source === 'official-rotation-notice' || value.source === 'community-verified') &&
    typeof value.sourceUrl === 'string' &&
    typeof value.supportingSourceUrl === 'string' &&
    validDate(value.capturedAt) &&
    /^\d{4}-\d{2}-\d{2}$/.test(String(value.effectiveFrom)) &&
    /^\d{4}-\d{2}-\d{2}$/.test(String(value.effectiveUntil)) &&
    (value.patch == null || typeof value.patch === 'string') &&
    validMapList(value.solo) &&
    validMapList(value.team)
  )
}

function loadState(): PersistedState {
  if (state) return state
  const persisted = getStore().get<Partial<PersistedState>>('state')
  state = {
    snapshot: isSnapshot(persisted?.snapshot) ? persisted.snapshot : null,
    lastCheckedAt: validDate(persisted?.lastCheckedAt) ? persisted.lastCheckedAt : null,
    lastError: typeof persisted?.lastError === 'string' ? persisted.lastError : null,
    refreshStatus:
      persisted?.refreshStatus === 'updated' ||
      persisted?.refreshStatus === 'checked' ||
      persisted?.refreshStatus === 'error' ||
      persisted?.refreshStatus === 'cached'
        ? persisted.refreshStatus
        : 'bundled',
  }
  return state
}

function saveState(next: PersistedState): void {
  state = next
  getStore().set('state', next)
}

function snapshotVersion(snapshot: RankedMapPoolSnapshot): number {
  return Date.parse(`${snapshot.effectiveFrom}T00:00:00Z`) || Date.parse(snapshot.capturedAt) || 0
}

function activeSnapshot(): RankedMapPoolSnapshot {
  const cached = loadState().snapshot
  if (cached && snapshotVersion(cached) > snapshotVersion(CURRENT_RANKED_MAP_POOL)) return cached
  return CURRENT_RANKED_MAP_POOL
}

function refreshInfo(): RankedMapPoolRefreshInfo {
  const current = loadState()
  return {
    status: current.refreshStatus,
    lastCheckedAt: current.lastCheckedAt,
    lastError: current.lastError,
  }
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetchWithTimeout(
    fetch,
    url,
    { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' } },
    REQUEST_TIMEOUT_MS,
  )
  if (!response.ok) throw new Error(`Map-pool source returned HTTP ${response.status}.`)
  return (await response.json()) as T
}

async function fetchOfficialCandidate(): Promise<RankedMapPoolSnapshot | null> {
  const hits = await fetchJson<OfficialSearchHit[]>(SEARCH_URL)
  if (!Array.isArray(hits)) return null

  for (const hit of hits.slice(0, 20)) {
    if (!Number.isSafeInteger(hit?.id) || hit.id <= 0) continue
    try {
      const resource = hit.subtype && hit.subtype !== 'post' ? `${hit.subtype}/` : ''
      const post = await fetchJson<OfficialPostResponse>(`${POSTS_URL}${resource}${hit.id}`)
      const input: OfficialMapPoolPost = {
        id: post.id,
        link: post.link,
        title: post.title?.rendered ?? '',
        date: post.date,
        content: post.content?.rendered ?? '',
      }
      const candidate = parseOfficialMapPoolPost(input)
      if (candidate) return candidate
    } catch {
      // Search results can include custom post types or deleted historical posts.
      // Continue scanning instead of losing a valid candidate later in the page.
    }
  }
  return null
}

async function mapsKnownToAoE4World(snapshot: RankedMapPoolSnapshot): Promise<boolean> {
  const [solo, team] = await Promise.all([
    getClient().getMapStats({ leaderboard: 'rm_solo' }),
    getClient().getMapStats({ leaderboard: 'rm_2v2' }),
  ])
  const known = new Set(
    [...solo.data, ...team.data].map((map) => normalizeMapName(map.map)),
  )
  return [...snapshot.solo, ...snapshot.team].every((map) => known.has(normalizeMapName(map)))
}

/** Checks the official feed at most once per six hours and atomically caches valid candidates. */
export async function refreshRankedMapPool(force = false): Promise<void> {
  const current = loadState()
  if (!force && current.lastCheckedAt && Date.now() - Date.parse(current.lastCheckedAt) < REFRESH_INTERVAL_MS) {
    return
  }
  if (inFlight) return inFlight

  inFlight = (async () => {
    const checkedAt = new Date().toISOString()
    try {
      const candidate = await fetchOfficialCandidate()
      const currentSnapshot = activeSnapshot()
      const isNewer = candidate != null && snapshotVersion(candidate) > snapshotVersion(currentSnapshot)
      if (candidate && isNewer && (await mapsKnownToAoE4World(candidate))) {
        saveState({
          snapshot: candidate,
          lastCheckedAt: checkedAt,
          lastError: null,
          refreshStatus: 'updated',
        })
      } else {
        saveState({
          ...loadState(),
          lastCheckedAt: checkedAt,
          lastError: null,
          refreshStatus: 'checked',
        })
      }
    } catch (error) {
      saveState({
        ...loadState(),
        lastCheckedAt: checkedAt,
        lastError: error instanceof Error ? error.message : 'Unknown map-pool refresh error.',
        refreshStatus: 'error',
      })
    }
  })().finally(() => {
    inFlight = null
  })
  return inFlight
}

export async function getRankedMapPoolResolution(
  leaderboard: StatsLeaderboard,
): Promise<RankedMapPoolResolution | null> {
  await refreshRankedMapPool()
  const resolution = resolveSnapshotForLeaderboard(activeSnapshot(), leaderboard)
  return resolution ? { ...resolution, autoRefresh: refreshInfo() } : null
}

/** IPC entry point used by diagnostics and the renderer's map-pool query. */
export async function getRankedMapPool(): Promise<IpcResult<RankedMapPoolResolution>> {
  const resolution = await getRankedMapPoolResolution('rm_solo')
  // rm_solo is always supported by the bundled snapshot, so this is only a
  // defensive fallback if the queue mapping is changed in the future.
  return ok(resolution ?? { ...resolveSnapshotForLeaderboard(CURRENT_RANKED_MAP_POOL, 'rm_solo')! })
}

export function startRankedMapPoolAutoRefresh(): void {
  if (timer) return
  void refreshRankedMapPool()
  timer = setInterval(() => void refreshRankedMapPool(), REFRESH_INTERVAL_MS)
  timer.unref?.()
}

export function stopRankedMapPoolAutoRefresh(): void {
  if (!timer) return
  clearInterval(timer)
  timer = null
}
