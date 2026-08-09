import { app, safeStorage } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export type TranslationLocale = 'ru' | 'uk' | 'de'
export type TranslationProvider = 'deepl' | 'libretranslate'

export interface TranslationStatus {
  enabled: boolean
  provider: TranslationProvider
  endpoint: string
  hasApiKey: boolean
  cacheEntries: number
}

export interface TranslationConfigInput {
  enabled: boolean
  provider: TranslationProvider
  endpoint: string
  apiKey?: string
}

export interface TranslationBatchInput {
  locale: TranslationLocale
  texts: string[]
}

export interface TranslationBatchResult {
  translations: Record<string, string>
  unavailable: boolean
  error?: string
}

interface PersistedConfig {
  enabled: boolean
  provider: TranslationProvider
  endpoint: string
  encryptedApiKey: string | null
}

interface TranslationCache {
  [key: string]: string
}

const DEFAULT_ENDPOINTS: Record<TranslationProvider, string> = {
  deepl: 'https://api-free.deepl.com/v2/translate',
  libretranslate: 'https://libretranslate.com/translate',
}
const MAX_TEXTS = 50
const MAX_TEXT_LENGTH = 8_000
const MAX_TOTAL_LENGTH = 100_000
const CONFIG_FILE = 'translation-config.json'
const CACHE_FILE = 'translation-cache.json'
const AUTO_RUSSIAN_ENDPOINT =
  'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ru&dt=t&q='

function paths(): { config: string; cache: string } {
  const dir = app.getPath('userData')
  mkdirSync(dir, { recursive: true })
  return { config: join(dir, CONFIG_FILE), cache: join(dir, CACHE_FILE) }
}

function readConfig(): PersistedConfig {
  const fallback: PersistedConfig = {
    enabled: false,
    provider: 'deepl',
    endpoint: DEFAULT_ENDPOINTS.deepl,
    encryptedApiKey: null,
  }
  try {
    const raw = JSON.parse(readFileSync(paths().config, 'utf8')) as Partial<PersistedConfig>
    const provider = raw.provider === 'libretranslate' ? 'libretranslate' : 'deepl'
    const endpoint = typeof raw.endpoint === 'string' && raw.endpoint.trim()
      ? raw.endpoint.trim()
      : DEFAULT_ENDPOINTS[provider]
    return {
      enabled: raw.enabled === true,
      provider,
      endpoint,
      encryptedApiKey: typeof raw.encryptedApiKey === 'string' ? raw.encryptedApiKey : null,
    }
  } catch {
    return fallback
  }
}

function writeConfig(config: PersistedConfig): void {
  writeFileSync(paths().config, JSON.stringify(config, null, 2), 'utf8')
}

function readCache(): TranslationCache {
  try {
    const value = JSON.parse(readFileSync(paths().cache, 'utf8')) as unknown
    if (!value || typeof value !== 'object') return {}
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).filter(
        ([key, text]) => typeof key === 'string' && typeof text === 'string',
      ),
    ) as TranslationCache
  } catch {
    return {}
  }
}

function writeCache(cache: TranslationCache): void {
  const entries = Object.entries(cache).slice(-10_000)
  writeFileSync(paths().cache, JSON.stringify(Object.fromEntries(entries)), 'utf8')
}

function decryptApiKey(config: PersistedConfig): string | null {
  if (!config.encryptedApiKey || !safeStorage.isEncryptionAvailable()) return null
  try {
    return safeStorage.decryptString(Buffer.from(config.encryptedApiKey, 'base64')) || null
  } catch {
    return null
  }
}

function apiKeyAvailable(config: PersistedConfig): boolean {
  return decryptApiKey(config) != null
}

function validateEndpoint(value: string): string {
  const endpoint = value.trim()
  const parsed = new URL(endpoint)
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('Translation endpoint must use HTTP or HTTPS.')
  }
  return endpoint
}

function targetCode(locale: TranslationLocale): string {
  return locale === 'ru' ? 'RU' : locale === 'uk' ? 'UK' : 'DE'
}

function cacheKey(provider: TranslationProvider, locale: TranslationLocale, source: string): string {
  return `${provider}:${locale}:${source}`
}

function autoRussianCacheKey(source: string): string {
  return `google-auto:ru:${source}`
}

/**
 * Russian is the app's offline-first default locale. For persisted game data
 * (profile prose, build notes, landmark explanations) the source text is not
 * a finite UI-key catalog, so an opt-in provider would otherwise leave large
 * English blocks visible. Translate those unknown strings through Google's
 * public lightweight endpoint and cache the result locally. Configured DeepL
 * or LibreTranslate remains preferred when the user enables it.
 */
async function translateAutoRussian(texts: string[]): Promise<string[]> {
  const results: string[] = []
  for (const text of texts) {
    const response = await fetch(`${AUTO_RUSSIAN_ENDPOINT}${encodeURIComponent(text)}`)
    if (!response.ok) throw new Error(`Automatic Russian translation returned HTTP ${response.status}.`)
    const body = (await response.json()) as unknown
    const chunks =
      Array.isArray(body) && Array.isArray(body[0])
        ? body[0]
            .filter((chunk): chunk is unknown[] => Array.isArray(chunk))
            .map((chunk) => (typeof chunk[0] === 'string' ? chunk[0] : ''))
        : []
    const translated = chunks.join('').trim()
    if (!translated) throw new Error('Automatic Russian translation returned no text.')
    results.push(translated)
  }
  return results
}

export function getTranslationStatus(): TranslationStatus {
  const config = readConfig()
  return {
    enabled: config.enabled,
    provider: config.provider,
    endpoint: config.endpoint,
    hasApiKey: apiKeyAvailable(config),
    cacheEntries: Object.keys(readCache()).length,
  }
}

export function configureTranslation(input: TranslationConfigInput): TranslationStatus {
  const provider: TranslationProvider = input.provider === 'libretranslate' ? 'libretranslate' : 'deepl'
  const endpoint = validateEndpoint(input.endpoint || DEFAULT_ENDPOINTS[provider])
  const current = readConfig()
  let encryptedApiKey = current.encryptedApiKey
  if (input.apiKey !== undefined) {
    const apiKey = input.apiKey.trim()
    if (!apiKey) {
      encryptedApiKey = null
    } else {
      if (!safeStorage.isEncryptionAvailable()) {
        throw new Error('OS secure storage is unavailable; the API key was not saved.')
      }
      encryptedApiKey = safeStorage.encryptString(apiKey).toString('base64')
    }
  }
  writeConfig({ enabled: input.enabled === true, provider, endpoint, encryptedApiKey })
  return getTranslationStatus()
}

export function clearTranslationCache(): TranslationStatus {
  const { cache } = paths()
  if (existsSync(cache)) writeFileSync(cache, '{}', 'utf8')
  return getTranslationStatus()
}

async function translateDeepL(
  endpoint: string,
  apiKey: string,
  locale: TranslationLocale,
  texts: string[],
): Promise<string[]> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `DeepL-Auth-Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: texts,
      source_lang: 'EN',
      target_lang: targetCode(locale),
      context: 'Age of Empires IV companion application interface. Preserve placeholders, numbers, URLs, game names, and hotkey names.',
    }),
  })
  if (!response.ok) throw new Error(`DeepL returned HTTP ${response.status}.`)
  const body = (await response.json()) as { translations?: Array<{ text?: unknown }> }
  const translations = body.translations?.map((item) => item.text)
  if (!translations || translations.length !== texts.length || translations.some((item) => typeof item !== 'string')) {
    throw new Error('DeepL returned an incomplete translation response.')
  }
  return translations as string[]
}

async function translateLibreTranslate(
  endpoint: string,
  apiKey: string,
  locale: TranslationLocale,
  texts: string[],
): Promise<string[]> {
  const results: string[] = []
  for (const text of texts) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: text,
        source: 'en',
        target: locale,
        ...(apiKey ? { api_key: apiKey } : {}),
      }),
    })
    if (!response.ok) throw new Error(`LibreTranslate returned HTTP ${response.status}.`)
    const body = (await response.json()) as { translatedText?: unknown }
    if (typeof body.translatedText !== 'string') {
      throw new Error('LibreTranslate returned an incomplete translation response.')
    }
    results.push(body.translatedText)
  }
  return results
}

export async function translateBatch(input: TranslationBatchInput): Promise<TranslationBatchResult> {
  const texts = [...new Set(input.texts)]
    .filter((text) => text.trim().length > 0)
    .filter((text) => text.length <= MAX_TEXT_LENGTH)
    .slice(0, MAX_TEXTS)
  if (texts.length === 0) {
    return { translations: Object.fromEntries(texts.map((text) => [text, text])), unavailable: false }
  }

  const config = readConfig()
  if (input.locale === 'ru' && !config.enabled) {
    const cache = readCache()
    const result: Record<string, string> = {}
    const pending: string[] = []
    for (const text of texts) {
      const cached = cache[autoRussianCacheKey(text)]
      if (cached) result[text] = cached
      else pending.push(text)
    }
    if (pending.length === 0) return { translations: result, unavailable: false }
    try {
      const translated = await translateAutoRussian(pending)
      translated.forEach((value, index) => {
        const source = pending[index]!
        result[source] = value
        cache[autoRussianCacheKey(source)] = value
      })
      writeCache(cache)
      return { translations: result, unavailable: false }
    } catch (error) {
      return {
        translations: result,
        unavailable: true,
        error: error instanceof Error ? error.message : 'Automatic Russian translation failed.',
      }
    }
  }

  const apiKey = decryptApiKey(config)
  // DeepL requires a key; LibreTranslate accepts an empty key for public
  // instances. Normalize the nullable storage result before calling either
  // provider so strict TypeScript and runtime behavior agree.
  const usableApiKey = apiKey ?? ''
  const needsApiKey = config.provider === 'deepl'
  if (
    !config.enabled ||
    (needsApiKey && !usableApiKey) ||
    texts.reduce((total, text) => total + text.length, 0) > MAX_TOTAL_LENGTH
  ) {
    return { translations: {}, unavailable: true }
  }

  const cache = readCache()
  const result: Record<string, string> = {}
  const pending: string[] = []
  for (const text of texts) {
    const cached = cache[cacheKey(config.provider, input.locale, text)]
    if (cached) result[text] = cached
    else pending.push(text)
  }
  if (pending.length === 0) return { translations: result, unavailable: false }

  try {
    const translated = config.provider === 'deepl'
      ? await translateDeepL(config.endpoint, usableApiKey, input.locale, pending)
      : await translateLibreTranslate(config.endpoint, usableApiKey, input.locale, pending)
    translated.forEach((text, index) => {
      const source = pending[index]!
      result[source] = text
      cache[cacheKey(config.provider, input.locale, source)] = text
    })
    writeCache(cache)
    return { translations: result, unavailable: false }
  } catch (error) {
    return {
      translations: result,
      unavailable: true,
      error: error instanceof Error ? error.message : 'Translation API request failed.',
    }
  }
}
