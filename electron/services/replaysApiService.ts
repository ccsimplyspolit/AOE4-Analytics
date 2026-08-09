/**
 * Main-process bridge to aoe4world/replays-api.
 *
 * The normal TypeScript decoder remains first because it is local, fast and
 * covers the application's command-analysis model. When it cannot decode a
 * newer summary layout, this service uses either a user-configured instance or
 * the packaged C# sidecar. The sidecar only binds to loopback and receives a
 * local gzipped file, so signed Relic download URLs never leave the machine in
 * the default configuration.
 */
import { app } from 'electron'
import { spawn, type ChildProcess } from 'node:child_process'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { gzipSync } from 'node:zlib'
import { REQUEST_TIMEOUT_MS, USER_AGENT } from '@api/client'
import { fetchWithTimeout } from '@api/fetchWithTimeout'
import { normalizeReplaysApiSummary } from '@domain/replaysApi'
import type { MatchSummary } from '@domain/statsSummary'
import { getSettings } from './appContext'

type ReplaysApiSource = 'environment' | 'settings' | 'bundled' | 'none'

interface ResolvedService {
  baseUrl: string
  source: Exclude<ReplaysApiSource, 'none'>
  /** A loopback service can read the application's temporary/cached gzip file. */
  localFileAccess: boolean
}

export interface ReplaysApiStatus {
  source: ReplaysApiSource
  baseUrl: string | null
  available: boolean
  detail: string
}

export interface ReplaysApiSummaryInput {
  /** Existing gzip file, typically the private ranked-summary cache. */
  compressedSummaryPath?: string | null
  /** Raw stats.rgs bytes from a local match; gzipped into a short-lived temp file. */
  summaryBytes?: Uint8Array | null
  /** A short-lived signed URL. Used only for an explicitly remote service. */
  sourceUrl?: string | null
}

let sidecar: ChildProcess | null = null
let sidecarUrl: string | null = null
let sidecarStartup: Promise<ResolvedService | null> | null = null

function normalizeBaseUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  if (!trimmed || trimmed.length > 2_048) return null
  try {
    const url = new URL(trimmed)
    if (
      (url.protocol !== 'http:' && url.protocol !== 'https:') ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    )
      return null
    return url.toString().replace(/\/$/, '')
  } catch {
    return null
  }
}

function isLoopbackUrl(value: string): boolean {
  try {
    const host = new URL(value).hostname.toLowerCase().replace(/^\[|\]$/g, '')
    return host === 'localhost' || host === '127.0.0.1' || host === '::1'
  } catch {
    return false
  }
}

function configuredService(): ResolvedService | null {
  const environment = normalizeBaseUrl(
    process.env.RTSLYTICS_REPLAYS_API_URL ?? process.env.AOE4WORLD_REPLAYS_API_URL,
  )
  if (environment) {
    return {
      baseUrl: environment,
      source: 'environment',
      localFileAccess: isLoopbackUrl(environment),
    }
  }
  const setting = normalizeBaseUrl(getSettings().getAll().replaysApiUrl)
  return setting
    ? { baseUrl: setting, source: 'settings', localFileAccess: isLoopbackUrl(setting) }
    : null
}

function endpoint(baseUrl: string, path: string): URL {
  return new URL(path.replace(/^\//, ''), `${baseUrl}/`)
}

function sidecarExecutablePath(): string | null {
  const executable = app.isPackaged
    ? join(process.resourcesPath, 'replays-api', 'AoE4WorldReplaysAPI.exe')
    : join(app.getAppPath(), 'build', 'replays-api', 'AoE4WorldReplaysAPI.exe')
  return existsSync(executable) ? executable : null
}

async function freeLoopbackPort(): Promise<number | null> {
  return new Promise((resolve) => {
    const server = createServer()
    server.unref()
    server.once('error', () => resolve(null))
    server.listen({ host: '127.0.0.1', port: 0 }, () => {
      const address = server.address()
      const port = typeof address === 'object' && address ? address.port : null
      server.close(() => resolve(port))
    })
  })
}

function pause(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForSidecar(baseUrl: string): Promise<boolean> {
  for (let attempt = 0; attempt < 24; attempt++) {
    if (await isServiceReachable(baseUrl)) return true
    await pause(125)
  }
  return false
}

/**
 * `/Summary` intentionally receives no URL: the upstream controller replies
 * with a validation error, but any HTTP reply proves that its web host is up.
 * This keeps a settings health check free of replay URLs and credentials.
 */
async function isServiceReachable(baseUrl: string): Promise<boolean> {
  const probe = endpoint(baseUrl, '/Summary').toString()
  try {
    const response = await fetchWithTimeout(
      globalThis.fetch.bind(globalThis),
      probe,
      { headers: { Accept: 'application/json', 'User-Agent': USER_AGENT } },
      1_000,
    )
    // /Summary without its required `url` parameter is expected to return
    // 400. Any HTTP response proves the service endpoint is reachable.
    await response.body?.cancel()
    return true
  } catch {
    return false
  }
}

async function startBundledSidecar(): Promise<ResolvedService | null> {
  if (sidecarUrl && sidecar && !sidecar.killed) {
    return { baseUrl: sidecarUrl, source: 'bundled', localFileAccess: true }
  }
  const executable = sidecarExecutablePath()
  if (!executable || process.env.RTSLYTICS_REPLAYS_API_DISABLE_SIDECAR === '1') return null
  const port = await freeLoopbackPort()
  if (!port) return null
  const baseUrl = `http://127.0.0.1:${port}`
  try {
    const child = spawn(executable, [], {
      windowsHide: true,
      stdio: 'ignore',
      env: {
        ...process.env,
        ASPNETCORE_ENVIRONMENT: 'Production',
        ASPNETCORE_URLS: baseUrl,
      },
    })
    sidecar = child
    child.once('error', (error) => {
      console.warn('[replays-api] sidecar could not start:', error.message)
    })
    child.once('exit', () => {
      if (sidecar === child) {
        sidecar = null
        sidecarUrl = null
      }
    })
    if (!(await waitForSidecar(baseUrl))) {
      child.kill()
      if (sidecar === child) sidecar = null
      return null
    }
    sidecarUrl = baseUrl
    return { baseUrl, source: 'bundled', localFileAccess: true }
  } catch (error) {
    console.warn('[replays-api] sidecar startup failed:', error)
    return null
  }
}

async function resolveService(): Promise<ResolvedService | null> {
  const configured = configuredService()
  if (configured) return configured
  if (!sidecarStartup) {
    sidecarStartup = startBundledSidecar().finally(() => {
      sidecarStartup = null
    })
  }
  return sidecarStartup
}

function temporaryGzip(bytes: Uint8Array): string | null {
  try {
    const dir = join(app.getPath('temp'), 'rtslytics-replays-api')
    mkdirSync(dir, { recursive: true })
    const file = join(dir, `${randomUUID()}.rgs.gz`)
    writeFileSync(file, gzipSync(Buffer.from(bytes)))
    return file
  } catch {
    return null
  }
}

/** The configured URL only; a bundled sidecar is started lazily on demand. */
export function getReplaysApiBaseUrl(): string | null {
  return configuredService()?.baseUrl ?? sidecarUrl
}

export async function getReplaysApiStatus(): Promise<ReplaysApiStatus> {
  const configured = configuredService()
  if (configured) {
    const available = await isServiceReachable(configured.baseUrl)
    return {
      source: configured.source,
      baseUrl: configured.baseUrl,
      available,
      detail: configured.localFileAccess
        ? available
          ? 'Loopback parser service is configured and ready.'
          : 'Loopback parser service is configured but unreachable.'
        : available
          ? 'Remote parser service is ready; signed summary URLs are sent only after parser fallback.'
          : 'Remote parser service is configured but unreachable.',
    }
  }
  const executable = sidecarExecutablePath()
  if (!executable) {
    return {
      source: 'none',
      baseUrl: null,
      available: false,
      detail: 'Bundled sidecar not found. Run npm run prepare:replays-api before packaging.',
    }
  }
  const bundled = await resolveService()
  return bundled
    ? { source: 'bundled', baseUrl: bundled.baseUrl, available: true, detail: 'Bundled loopback sidecar ready.' }
    : { source: 'none', baseUrl: null, available: false, detail: 'Bundled sidecar could not start.' }
}

/**
 * Decodes an otherwise unsupported summary through upstream-compatible API
 * routes. Local service endpoints receive a gzip path; a remote service can
 * only receive the caller-supplied short-lived source URL.
 */
export async function fetchReplaysApiSummary(
  input: ReplaysApiSummaryInput,
): Promise<MatchSummary | null> {
  const service = await resolveService()
  if (!service) return null

  let temporaryFile: string | null = null
  try {
    const compressedPath = input.compressedSummaryPath ??
      (input.summaryBytes ? (temporaryFile = temporaryGzip(input.summaryBytes)) : null)
    const request = service.localFileAccess && compressedPath
      ? (() => {
          const url = endpoint(service.baseUrl, '/Summary/newfile')
          url.searchParams.set('path', compressedPath)
          return url
        })()
      : input.sourceUrl && /^https:\/\//i.test(input.sourceUrl)
        ? (() => {
            const url = endpoint(service.baseUrl, '/Summary/new')
            url.searchParams.set('url', input.sourceUrl)
            return url
          })()
        : null
    if (!request) return null
    const response = await fetchWithTimeout(
      globalThis.fetch.bind(globalThis),
      request.toString(),
      { headers: { Accept: 'application/json', 'User-Agent': USER_AGENT } },
      REQUEST_TIMEOUT_MS,
    )
    if (!response.ok) return null
    return normalizeReplaysApiSummary((await response.json()) as unknown)
  } catch {
    return null
  } finally {
    if (temporaryFile) {
      try {
        rmSync(temporaryFile, { force: true })
      } catch {
        /* best-effort private temp-file cleanup */
      }
    }
  }
}

/** Stops the child owned by this process; external parser services are untouched. */
export function disposeReplaysApiSidecar(): void {
  const child = sidecar
  sidecar = null
  sidecarUrl = null
  sidecarStartup = null
  if (child && !child.killed) child.kill()
}
