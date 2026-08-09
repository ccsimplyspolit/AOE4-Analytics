/** Default pause when an upstream omits the standard Retry-After header. */
export const RATE_LIMIT_RETRY_MS = 30_000

/** Avoid retry storms when several app features receive the same HTTP 429. */
export class RateLimitGate {
  private resumeAt = 0
  private readonly now: () => number
  private readonly delay: (ms: number) => Promise<void>

  constructor(
    options: {
      now?: () => number
      delay?: (ms: number) => Promise<void>
    } = {},
  ) {
    this.now = options.now ?? Date.now
    this.delay = options.delay ?? ((ms) => new Promise<void>((resolve) => setTimeout(resolve, ms)))
  }

  /** Extends the shared cooldown, honouring Retry-After when the server provides it. */
  defer(headers: Pick<Headers, 'get'> | null | undefined): void {
    const retryAfter = headers?.get('retry-after')?.trim() ?? ''
    const seconds = retryAfter ? Number(retryAfter) : Number.NaN
    const now = this.now()
    const retryAt =
      Number.isFinite(seconds) && seconds >= 0
        ? now + Math.max(1_000, Math.ceil(seconds * 1_000))
        : Date.parse(retryAfter)
    const fallbackAt = now + RATE_LIMIT_RETRY_MS
    this.resumeAt = Math.max(this.resumeAt, retryAt > now ? retryAt : fallbackAt)
  }

  async wait(): Promise<void> {
    const remaining = this.resumeAt - this.now()
    if (remaining > 0) await this.delay(remaining)
  }

  isCoolingDown(): boolean {
    return this.resumeAt > this.now()
  }
}

export interface FetchWithTimeoutOptions {
  /** Test hook; production calls share one cooldown per remote host. */
  rateLimitGate?: RateLimitGate
  /** Number of bounded retries for timeouts and transient 5xx responses. */
  transientRetries?: number
  /** Base delay for transient retries. Exponential backoff is applied. */
  transientRetryDelayMs?: number
  /** Injectable sleep for deterministic tests. */
  transientSleep?: (ms: number) => Promise<void>
}

const rateLimitGates = new Map<string, RateLimitGate>()

export function getRateLimitGate(url: string): RateLimitGate {
  let host: string
  try {
    host = new URL(url).host
  } catch {
    host = url
  }
  let gate = rateLimitGates.get(host)
  if (!gate) {
    gate = new RateLimitGate()
    rateLimitGates.set(host, gate)
  }
  return gate
}

async function fetchAttempt(
  fetchFn: typeof fetch,
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetchFn(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(id)
  }
}

/**
 * fetch wrapped in an AbortController timeout. A HTTP 429 keeps the caller
 * pending, displays its existing loading state, and retries after the server's
 * Retry-After value (or 30 seconds when it is absent). The per-host gate is
 * shared, so a limit hit by one screen pauses every other request to that host.
 */
export async function fetchWithTimeout(
  fetchFn: typeof fetch,
  url: string,
  init: RequestInit,
  timeoutMs: number,
  options: FetchWithTimeoutOptions = {},
): Promise<Response> {
  const gate = options.rateLimitGate ?? getRateLimitGate(url)
  const retries = Math.max(0, Math.min(3, Math.floor(options.transientRetries ?? 0)))
  const baseDelay = Math.max(0, options.transientRetryDelayMs ?? 350)
  const sleep =
    options.transientSleep ??
    ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)))
  let transientAttempt = 0
  for (;;) {
    await gate.wait()
    let response: Response
    try {
      response = await fetchAttempt(fetchFn, url, init, timeoutMs)
    } catch (error) {
      if (transientAttempt >= retries) throw error
      await sleep(baseDelay * 2 ** transientAttempt)
      transientAttempt += 1
      continue
    }
    if (response.status === 429) {
      gate.defer(response.headers)
      continue
    }
    const retryableStatus =
      response.status === 408 ||
      response.status === 425 ||
      response.status === 500 ||
      response.status === 502 ||
      response.status === 503 ||
      response.status === 504
    if (retryableStatus && transientAttempt < retries) {
      await sleep(baseDelay * 2 ** transientAttempt)
      transientAttempt += 1
      continue
    }
    return response
  }
}
