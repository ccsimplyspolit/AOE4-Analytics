import { useEffect, useRef } from 'react'
import type { IpcResult, PlayerArchiveCacheResult } from '@ipc/contract'
import { ipc } from '@shared/ipc'

const DEFAULT_TTL_MS = 30 * 60_000
const inflight = new Map<string, Promise<unknown>>()
const doneAt = new Map<string, number>()

export const AUTO_ARCHIVE_LIMITS = { maxReplays: 80, maxSummaries: 150 } as const

export type AutoActionState = 'idle' | 'running' | 'done'

export function peekAutoAction(key: string): AutoActionState {
  if (inflight.has(key)) return 'running'
  if (doneAt.has(key)) return 'done'
  return 'idle'
}

export async function runAutoActionOnce<T>(
  key: string,
  action: () => Promise<T> | T,
  ttlMs = DEFAULT_TTL_MS,
): Promise<T | undefined> {
  const finished = doneAt.get(key)
  if (finished != null && Date.now() - finished < ttlMs) {
    const existing = inflight.get(key)
    if (existing) {
      await existing
    }
    return undefined
  }
  const pending = inflight.get(key)
  if (pending) {
    await pending
    return undefined
  }
  const promise = Promise.resolve()
    .then(action)
    .finally(() => {
      inflight.delete(key)
      doneAt.set(key, Date.now())
    })
  inflight.set(key, promise)
  return promise as Promise<T>
}

/** Session-deduped player archive fetch used by Scout, profiles, and match pages. */
export function cachePlayerArchiveOnce(
  profileId: number,
): Promise<IpcResult<PlayerArchiveCacheResult> | undefined> {
  return runAutoActionOnce(`player-archive:${profileId}`, () =>
    ipc.cachePlayerArchive(profileId, AUTO_ARCHIVE_LIMITS),
  )
}

/**
 * Fire a side-effect once per key while this screen is mounted.
 * Concurrent callers share the same in-flight promise.
 */
export function useAutoAction(
  key: string | null,
  action: () => Promise<unknown> | unknown,
  options?: { enabled?: boolean; ttlMs?: number },
): AutoActionState {
  const enabled = options?.enabled ?? true
  const ttlMs = options?.ttlMs ?? DEFAULT_TTL_MS
  const actionRef = useRef(action)
  actionRef.current = action

  useEffect(() => {
    if (!key || !enabled) return
    void runAutoActionOnce(key, () => actionRef.current(), ttlMs)
  }, [enabled, key, ttlMs])

  if (!key) return 'idle'
  return peekAutoAction(key)
}
