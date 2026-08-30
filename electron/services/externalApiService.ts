import { app, safeStorage } from 'electron'
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { REQUEST_TIMEOUT_MS, USER_AGENT } from '@api/client'
import { fetchWithTimeout } from '@api/fetchWithTimeout'

export type ExternalApiProvider = 'twitch' | 'youtube'
export type ExternalApiCredentialSource = 'settings' | 'environment' | 'none'

export interface ExternalApiProviderStatus {
  configured: boolean
  source: ExternalApiCredentialSource
  detail: string
}

export interface ExternalApiStatus {
  twitch: ExternalApiProviderStatus & {
    clientId: boolean
    clientSecret: boolean
    accessToken: boolean
  }
  youtube: ExternalApiProviderStatus & {
    apiKey: boolean
  }
  aoe4World: ExternalApiProviderStatus & {
    apiKey: boolean
  }
}

export interface ExternalApiConfigInput {
  twitchClientId?: string
  twitchClientSecret?: string
  youtubeApiKey?: string
  aoe4WorldApiKey?: string
  clearTwitch?: boolean
  clearYoutube?: boolean
  clearAoe4World?: boolean
}

interface PersistedConfig {
  encryptedTwitchClientId: string | null
  encryptedTwitchClientSecret: string | null
  encryptedYoutubeApiKey: string | null
  encryptedAoe4WorldApiKey: string | null
}

interface TwitchToken {
  accessToken: string
  expiresAt: number
}

const CONFIG_FILE = 'external-api-config.json'
const AOE4WORLD_BOOTSTRAP_FILE = 'aoe4world-overlay.key'
const TWITCH_TOKEN_URL = 'https://id.twitch.tv/oauth2/token'
const TWITCH_API_BASE = 'https://api.twitch.tv/helix'
const DEFAULT_CONFIG: PersistedConfig = {
  encryptedTwitchClientId: null,
  encryptedTwitchClientSecret: null,
  encryptedYoutubeApiKey: null,
  encryptedAoe4WorldApiKey: null,
}

let twitchToken: TwitchToken | null = null
let twitchTokenRequest: Promise<string | null> | null = null

function configPath(): string {
  const dir = app.getPath('userData')
  mkdirSync(dir, { recursive: true })
  return join(dir, CONFIG_FILE)
}

function readConfig(): PersistedConfig {
  try {
    const value = JSON.parse(readFileSync(configPath(), 'utf8')) as Partial<PersistedConfig>
    return {
      encryptedTwitchClientId:
        typeof value.encryptedTwitchClientId === 'string' ? value.encryptedTwitchClientId : null,
      encryptedTwitchClientSecret:
        typeof value.encryptedTwitchClientSecret === 'string'
          ? value.encryptedTwitchClientSecret
          : null,
      encryptedYoutubeApiKey:
        typeof value.encryptedYoutubeApiKey === 'string' ? value.encryptedYoutubeApiKey : null,
      encryptedAoe4WorldApiKey:
        typeof value.encryptedAoe4WorldApiKey === 'string' ? value.encryptedAoe4WorldApiKey : null,
    }
  } catch {
    return DEFAULT_CONFIG
  }
}

function writeConfig(config: PersistedConfig): void {
  writeFileSync(configPath(), JSON.stringify(config, null, 2), 'utf8')
}

function decrypt(value: string | null): string | null {
  if (!value || !safeStorage.isEncryptionAvailable()) return null
  try {
    return safeStorage.decryptString(Buffer.from(value, 'base64')) || null
  } catch {
    return null
  }
}

function encrypt(value: string): string {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('OS secure storage is unavailable; the API credential was not saved.')
  }
  return safeStorage.encryptString(value).toString('base64')
}

function environmentValue(...names: string[]): string | null {
  for (const name of names) {
    const value = process.env[name]?.trim()
    if (value) return value
  }
  return null
}

function storedOrEnvironment(
  stored: string | null,
  ...environmentNames: string[]
): {
  value: string | null
  source: ExternalApiCredentialSource
} {
  const persisted = decrypt(stored)
  if (persisted) return { value: persisted, source: 'settings' }
  const environment = environmentValue(...environmentNames)
  if (environment) return { value: environment, source: 'environment' }
  return { value: null, source: 'none' }
}

function credentials(): {
  twitchClientId: ReturnType<typeof storedOrEnvironment>
  twitchClientSecret: ReturnType<typeof storedOrEnvironment>
  youtubeApiKey: ReturnType<typeof storedOrEnvironment>
  aoe4WorldApiKey: ReturnType<typeof storedOrEnvironment>
} {
  const config = readConfig()
  return {
    twitchClientId: storedOrEnvironment(
      config.encryptedTwitchClientId,
      'RTSLYTICS_TWITCH_CLIENT_ID',
      'TWITCH_CLIENT_ID',
    ),
    twitchClientSecret: storedOrEnvironment(
      config.encryptedTwitchClientSecret,
      'RTSLYTICS_TWITCH_CLIENT_SECRET',
      'TWITCH_CLIENT_SECRET',
    ),
    youtubeApiKey: storedOrEnvironment(
      config.encryptedYoutubeApiKey,
      'RTSLYTICS_YOUTUBE_API_KEY',
      'YOUTUBE_API_KEY',
    ),
    aoe4WorldApiKey: storedOrEnvironment(
      config.encryptedAoe4WorldApiKey,
      'RTSLYTICS_AOE4WORLD_API_KEY',
      'AOE4WORLD_API_KEY',
    ),
  }
}

let ingestingAoe4WorldBootstrap = false

function ingestAoe4WorldBootstrapKey(): void {
  if (ingestingAoe4WorldBootstrap) return
  const file = join(app.getPath('userData'), AOE4WORLD_BOOTSTRAP_FILE)
  if (!existsSync(file)) return
  let raw = ''
  try {
    raw = readFileSync(file, 'utf8').trim()
  } catch {
    return
  }
  if (!raw) {
    try {
      unlinkSync(file)
    } catch {
      /* ignore */
    }
    return
  }
  ingestingAoe4WorldBootstrap = true
  try {
    configureExternalApis({ aoe4WorldApiKey: raw })
    unlinkSync(file)
  } catch {
    /* keep the file so the next launch can retry encryption */
  } finally {
    ingestingAoe4WorldBootstrap = false
  }
}

export function getExternalApiStatus(): ExternalApiStatus {
  ingestAoe4WorldBootstrapKey()
  const current = credentials()
  const legacyAccessToken = environmentValue('RTSLYTICS_TWITCH_ACCESS_TOKEN', 'TWITCH_ACCESS_TOKEN')
  const twitchConfigured = Boolean(
    current.twitchClientId.value && (current.twitchClientSecret.value || legacyAccessToken),
  )
  const twitchSource = twitchConfigured
    ? current.twitchClientId.source === 'settings' ||
      current.twitchClientSecret.source === 'settings'
      ? 'settings'
      : 'environment'
    : 'none'
  const youtubeConfigured = Boolean(current.youtubeApiKey.value)
  const aoe4WorldConfigured = Boolean(current.aoe4WorldApiKey.value)
  return {
    twitch: {
      configured: twitchConfigured,
      source: twitchSource,
      detail: twitchConfigured
        ? legacyAccessToken && !current.twitchClientSecret.value
          ? 'Legacy access token configured'
          : 'Client credentials configured'
        : 'Client ID and secret are required',
      clientId: Boolean(current.twitchClientId.value),
      clientSecret: Boolean(current.twitchClientSecret.value),
      accessToken: Boolean(legacyAccessToken),
    },
    youtube: {
      configured: youtubeConfigured,
      source: youtubeConfigured ? current.youtubeApiKey.source : 'none',
      detail: youtubeConfigured ? 'API key configured' : 'API key is required',
      apiKey: youtubeConfigured,
    },
    aoe4World: {
      configured: aoe4WorldConfigured,
      source: aoe4WorldConfigured ? current.aoe4WorldApiKey.source : 'none',
      detail: aoe4WorldConfigured ? 'Overlay API key configured' : 'Overlay API key is optional',
      apiKey: aoe4WorldConfigured,
    },
  }
}

export function configureExternalApis(input: ExternalApiConfigInput): ExternalApiStatus {
  const current = readConfig()
  const next: PersistedConfig = { ...current }

  if (input.clearTwitch) {
    next.encryptedTwitchClientId = null
    next.encryptedTwitchClientSecret = null
    twitchToken = null
  } else {
    if (input.twitchClientId !== undefined) {
      next.encryptedTwitchClientId = input.twitchClientId.trim()
        ? encrypt(input.twitchClientId.trim())
        : null
      twitchToken = null
    }
    if (input.twitchClientSecret !== undefined) {
      next.encryptedTwitchClientSecret = input.twitchClientSecret.trim()
        ? encrypt(input.twitchClientSecret.trim())
        : null
      twitchToken = null
    }
  }

  if (input.clearYoutube) {
    next.encryptedYoutubeApiKey = null
  } else if (input.youtubeApiKey !== undefined) {
    next.encryptedYoutubeApiKey = input.youtubeApiKey.trim()
      ? encrypt(input.youtubeApiKey.trim())
      : null
  }

  if (input.clearAoe4World) {
    next.encryptedAoe4WorldApiKey = null
  } else if (input.aoe4WorldApiKey !== undefined) {
    next.encryptedAoe4WorldApiKey = input.aoe4WorldApiKey.trim()
      ? encrypt(input.aoe4WorldApiKey.trim())
      : null
  }

  writeConfig(next)
  return getExternalApiStatus()
}

async function requestTwitchToken(clientId: string, clientSecret: string): Promise<string | null> {
  const url = new URL(TWITCH_TOKEN_URL)
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('client_secret', clientSecret)
  url.searchParams.set('grant_type', 'client_credentials')
  const response = await fetchWithTimeout(
    globalThis.fetch.bind(globalThis),
    url.toString(),
    { method: 'POST', headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' } },
    REQUEST_TIMEOUT_MS,
  )
  if (!response.ok) return null
  const body = (await response.json()) as { access_token?: unknown; expires_in?: unknown }
  if (typeof body.access_token !== 'string' || !body.access_token) return null
  const expiresIn = typeof body.expires_in === 'number' ? body.expires_in : 3_600
  twitchToken = {
    accessToken: body.access_token,
    // Refresh five minutes early so an in-flight search never receives an
    // expired token near the provider's boundary.
    expiresAt: Date.now() + Math.max(60, expiresIn - 300) * 1_000,
  }
  return body.access_token
}

export async function getTwitchApiHeaders(): Promise<Record<string, string> | null> {
  const current = credentials()
  const clientId = current.twitchClientId.value
  const clientSecret = current.twitchClientSecret.value
  const legacyAccessToken = environmentValue('RTSLYTICS_TWITCH_ACCESS_TOKEN', 'TWITCH_ACCESS_TOKEN')
  if (!clientId) return null
  if (!clientSecret && legacyAccessToken) {
    return { 'Client-ID': clientId, Authorization: `Bearer ${legacyAccessToken}` }
  }
  if (!clientSecret) return null
  if (twitchToken && twitchToken.expiresAt > Date.now()) {
    return { 'Client-ID': clientId, Authorization: `Bearer ${twitchToken.accessToken}` }
  }
  if (!twitchTokenRequest) {
    twitchTokenRequest = requestTwitchToken(clientId, clientSecret).finally(() => {
      twitchTokenRequest = null
    })
  }
  const accessToken = await twitchTokenRequest
  return accessToken ? { 'Client-ID': clientId, Authorization: `Bearer ${accessToken}` } : null
}

export function getYouTubeApiKey(): string | null {
  return credentials().youtubeApiKey.value
}

/** Overlay key for custom/lobby games on the signed-in AoE4World account. Never log this. */
export function getAoe4WorldApiKey(): string | null {
  ingestAoe4WorldBootstrapKey()
  return credentials().aoe4WorldApiKey.value
}

/** Query extras for `games/last` when an overlay key is present. */
export function getAoe4WorldLastGameOptions(): { apiKey: string; includeCustom: true } | Record<string, never> {
  const apiKey = getAoe4WorldApiKey()
  return apiKey ? { apiKey, includeCustom: true } : {}
}

export const EXTERNAL_API_ENDPOINTS = {
  twitchApi: TWITCH_API_BASE,
  twitchOAuth: TWITCH_TOKEN_URL,
  youtubeApi: 'https://www.googleapis.com/youtube/v3',
} as const
