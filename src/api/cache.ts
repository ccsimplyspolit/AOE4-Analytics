import { createHash } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { join } from 'node:path'

/** Sweep cache files older than this on construction so the dir can't grow forever. */
const DEFAULT_MAX_AGE_MS = 7 * 24 * 60 * 60_000
const MEMORY_CAP = 128

export interface DiskCacheOptions {
  /** Directory where cache entries are written (created if missing). */
  baseDir: string
  /** Injectable clock (defaults to Date.now). */
  now?: () => number
  /** Files older than this (by mtime) are deleted on construction. */
  maxAgeMs?: number
}

interface CacheEnvelope<T = unknown> {
  fetchedAt: number
  body: T
}

/**
 * Disk cache keyed by URL (D9). Hot entries stay in RAM so the poll loop does
 * not `readFileSync` on every tick. The start-up sweep of stale files is
 * deferred so constructing the client cannot freeze Electron's UI thread.
 */
export class DiskCache {
  private readonly baseDir: string
  private readonly now: () => number
  private readonly maxAgeMs: number
  private readonly memory = new Map<string, CacheEnvelope>()

  constructor(options: DiskCacheOptions) {
    this.baseDir = options.baseDir
    this.now = options.now ?? Date.now
    this.maxAgeMs = options.maxAgeMs ?? DEFAULT_MAX_AGE_MS
    mkdirSync(this.baseDir, { recursive: true })
    const maxAgeMs = this.maxAgeMs
    setImmediate(() => this.sweep(maxAgeMs))
  }

  /** Absolute path of the cache file for a key (stable hash). */
  pathFor(key: string): string {
    const hash = createHash('sha1').update(key).digest('hex')
    return join(this.baseDir, `${hash}.json`)
  }

  get<T>(key: string, ttlMs: number): T | null {
    const envelope = this.read<T>(key)
    if (!envelope || this.now() - envelope.fetchedAt >= ttlMs) return null
    return envelope.body
  }

  /**
   * Returns the last valid response even after its normal TTL. It remains
   * bounded by the cache's max age. Regular refreshes still fetch current data;
   * callers opt into this value only when the upstream request is unavailable.
   */
  getStale<T>(key: string): T | null {
    return this.read<T>(key)?.body ?? null
  }

  set(key: string, body: unknown): void {
    // Don't cache an absent/empty success body: `get` returns null for a miss,
    // so a stored null would be indistinguishable from a miss and re-fetch forever.
    if (body == null) return
    const envelope: CacheEnvelope = { fetchedAt: this.now(), body }
    this.remember(key, envelope)
    try {
      writeFileSync(this.pathFor(key), JSON.stringify(envelope), 'utf8')
    } catch {
      // A cache write failure must never break the actual request.
    }
  }

  private remember(key: string, envelope: CacheEnvelope): void {
    this.memory.delete(key)
    this.memory.set(key, envelope)
    while (this.memory.size > MEMORY_CAP) {
      const oldest = this.memory.keys().next()
      if (oldest.done) break
      this.memory.delete(oldest.value)
    }
  }

  /** Delete an expired/corrupt file (best-effort) and report it as a miss. */
  private evict(key: string, file: string): null {
    this.memory.delete(key)
    try {
      unlinkSync(file)
    } catch {
      // best-effort
    }
    return null
  }

  private read<T>(key: string): CacheEnvelope<T> | null {
    const cached = this.memory.get(key)
    if (cached) {
      if (this.now() - cached.fetchedAt >= this.maxAgeMs) {
        this.memory.delete(key)
      } else {
        return cached as CacheEnvelope<T>
      }
    }
    const file = this.pathFor(key)
    if (!existsSync(file)) return null
    try {
      const envelope = JSON.parse(readFileSync(file, 'utf8')) as CacheEnvelope<T>
      if (
        typeof envelope?.fetchedAt !== 'number' ||
        this.now() - envelope.fetchedAt >= this.maxAgeMs
      ) {
        return this.evict(key, file)
      }
      this.remember(key, envelope)
      return envelope
    } catch {
      return this.evict(key, file)
    }
  }

  /** Best-effort one-shot prune of cache files older than maxAgeMs (by mtime). */
  private sweep(maxAgeMs: number): void {
    const cutoff = this.now() - maxAgeMs
    try {
      for (const name of readdirSync(this.baseDir)) {
        if (!name.endsWith('.json')) continue
        const file = join(this.baseDir, name)
        try {
          if (statSync(file).mtimeMs < cutoff) unlinkSync(file)
        } catch {
          // ignore a single unreadable file
        }
      }
    } catch {
      // sweep is best-effort; never block construction
    }
  }
}
