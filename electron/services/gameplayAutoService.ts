import { app } from 'electron'
import { spawn } from 'node:child_process'
import { mkdir, readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import type { OnlineSearchResult } from '@ipc/contract'
import type { GameplayAutoInput, GameplayAutoResult, GameplayCandidate } from '@domain/gameplayAuto'
import { gameplaySearchQuery, isGameplayAutoInput } from '@domain/gameplayAuto'
import type { IpcResult } from '@ipc/contract'
import { err, errFrom, ok } from './result'
import { findTwitchVod } from './twitchVodService'
import { searchOnline } from './onlineSearchService'
import { extractVideoAnalysis } from './videoAnalysisService'

const DOWNLOAD_TIMEOUT_MS = 10 * 60_000
const MAX_DOWNLOAD_BYTES = 2 * 1024 * 1024 * 1024
const CACHE_TTL_MS = 15 * 60_000
const cache = new Map<string, { expiresAt: number; value: GameplayAutoResult }>()
const inFlight = new Map<string, Promise<GameplayAutoResult>>()

type DownloadResult = { path: string; bytes: number } | null

function emptyResult(gameId: string, stage: GameplayAutoResult['stage']): GameplayAutoResult {
  return {
    gameId,
    stage,
    candidate: null,
    downloadedPath: null,
    downloadedBytes: null,
    analysis: null,
    warnings: [],
    attemptedAt: new Date().toISOString(),
  }
}

function providerFromUrl(value: string): 'twitch' | 'youtube' | null {
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:') return null
    const host = url.hostname.toLowerCase().replace(/^www\./, '')
    if (host === 'twitch.tv' && /^\/videos\/\d+\/?$/.test(url.pathname)) return 'twitch'
    if (
      (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtu.be') &&
      (host === 'youtu.be' ||
        url.searchParams.has('v') ||
        /^\/(?:shorts|live|embed)\//.test(url.pathname))
    )
      return 'youtube'
  } catch {
    // Invalid provider URLs are simply skipped from the fallback search.
  }
  return null
}

function normalize(value: string | null | undefined): string {
  return (value ?? '')
    .toLocaleLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, ' ')
    .trim()
}

function dateDistanceSec(
  left: string | null | undefined,
  right: string | null | undefined,
): number | null {
  if (!left || !right) return null
  const a = Date.parse(left)
  const b = Date.parse(right)
  return Number.isFinite(a) && Number.isFinite(b) ? Math.abs(a - b) / 1000 : null
}

function candidateScore(input: GameplayAutoInput, result: OnlineSearchResult): number {
  const searchable = normalize(`${result.title} ${result.description ?? ''} ${result.channel}`)
  const values = [input.map, input.civilization, input.opponentCivilization]
    .map(normalize)
    .filter((value) => value.length >= 3)
  let score = result.source === 'aoe4world' ? 140 : 0
  for (const value of values) {
    if (searchable.includes(value)) score += 90
    else {
      const pieces = value.split(' ').filter((piece) => piece.length >= 4)
      score += pieces.filter((piece) => searchable.includes(piece)).length * 20
    }
  }
  const durationDelta =
    input.durationSec != null && result.durationSec != null
      ? Math.abs(input.durationSec - result.durationSec)
      : null
  if (durationDelta != null) {
    if (durationDelta <= 90) score += 50
    else if (durationDelta <= 300) score += 25
    else if (durationDelta > 900) score -= 35
  }
  const dateDelta = dateDistanceSec(input.playedAt, result.publishedAt)
  if (dateDelta != null) {
    if (dateDelta <= 3 * 24 * 3600) score += 35
    else if (dateDelta <= 14 * 24 * 3600) score += 15
    else if (dateDelta > 180 * 24 * 3600) score -= 15
  }
  if (result.live) score -= 100
  return score
}

function candidateFromOnline(
  input: GameplayAutoInput,
  result: OnlineSearchResult,
): GameplayCandidate | null {
  const provider = providerFromUrl(result.url)
  if (!provider || result.kind !== 'video') return null
  const score = candidateScore(input, result)
  return {
    provider,
    url: result.url,
    title: result.title,
    channel: result.channel || null,
    durationSec: result.durationSec,
    publishedAt: result.publishedAt,
    exactGame: result.source === 'aoe4world' && (result.description ?? '').includes(input.gameId),
    offsetSec: null,
    score,
    reason:
      result.source === 'aoe4world'
        ? 'Найдено в публичном каталоге AoE4World.'
        : 'Подобрано по карте, цивилизациям, длительности и дате.',
  }
}

async function findCandidate(input: GameplayAutoInput): Promise<GameplayCandidate | null> {
  const verified = await findTwitchVod({
    gameId: input.gameId,
    profileId: input.profileId,
    civilization: input.civilization,
    opponentCivilization: input.opponentCivilization,
    map: input.map,
    durationSec: input.durationSec,
  })
  if (verified.ok && verified.data.vod) {
    const vod = verified.data.vod
    return {
      provider: 'twitch',
      url: vod.url,
      title: `Twitch VOD · игра ${input.gameId}`,
      channel: null,
      durationSec: null,
      publishedAt: null,
      exactGame: true,
      offsetSec: vod.offsetSec,
      score: 1_000,
      reason: 'AoE4World подтвердил связь VOD с точным ID этой игры.',
    }
  }

  const query = gameplaySearchQuery(input) || `Age of Empires IV ${input.civilization}`
  const search = await searchOnline({
    query,
    provider: 'all',
    limit: 100,
    dateRangeDays: 365,
    sort: 'recent',
  })
  if (!search.ok) return null
  return (
    search.data.results
      .map((result) => candidateFromOnline(input, result))
      .filter((result): result is GameplayCandidate => result != null)
      .sort((left, right) => right.score - left.score)[0] ?? null
  )
}

function gameplayDirectory(gameId: string): string {
  return join(app.getPath('userData'), 'gameplay-cache', gameId)
}

async function existingDownload(directory: string): Promise<DownloadResult> {
  try {
    const files = await readdir(directory)
    const candidates = files.filter((file) => /\.(mp4|mkv|webm|mov|avi)$/i.test(file))
    let best: DownloadResult | null = null
    for (const file of candidates) {
      const path = join(directory, file)
      const details = await stat(path)
      if (details.size <= 0 || details.size > MAX_DOWNLOAD_BYTES) continue
      if (!best || details.size > best.bytes) best = { path, bytes: details.size }
    }
    return best
  } catch {
    return null
  }
}

function runDownloader(command: string, prefix: string[], args: string[]): Promise<number | null> {
  return new Promise((resolve) => {
    const child = spawn(command, [...prefix, ...args], {
      windowsHide: true,
      stdio: 'ignore',
    })
    const timer = setTimeout(() => {
      child.kill()
      resolve(null)
    }, DOWNLOAD_TIMEOUT_MS)
    child.once('close', (code) => {
      clearTimeout(timer)
      resolve(typeof code === 'number' ? code : null)
    })
    child.once('error', () => {
      clearTimeout(timer)
      resolve(null)
    })
  })
}

/** Downloads one public VOD through yt-dlp, without cookies or authenticated streams. */
async function downloadGameplay(
  candidate: GameplayCandidate,
  gameId: string,
): Promise<DownloadResult> {
  const directory = gameplayDirectory(gameId)
  await mkdir(directory, { recursive: true })
  const cached = await existingDownload(directory)
  if (cached) return cached
  const output = join(directory, '%(id)s.%(ext)s')
  const args = [
    '--no-playlist',
    '--no-part',
    '--max-filesize',
    String(MAX_DOWNLOAD_BYTES),
    '--format',
    'best[height<=720][ext=mp4]/best[height<=720]/worst',
    '--output',
    output,
    candidate.url,
  ]
  const commands = [
    { command: process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp', prefix: [] },
    { command: process.platform === 'win32' ? 'python.exe' : 'python3', prefix: ['-m', 'yt_dlp'] },
  ]
  for (const item of commands) {
    const code = await runDownloader(item.command, item.prefix, args)
    if (code !== 0) continue
    const downloaded = await existingDownload(directory)
    if (downloaded) return downloaded
  }
  return null
}

async function workflow(input: GameplayAutoInput): Promise<GameplayAutoResult> {
  const result = emptyResult(input.gameId, 'searching')
  const candidate = await findCandidate(input)
  result.candidate = candidate
  if (!candidate) {
    result.stage = 'not_found'
    result.warnings.push(
      'Публичный геймплей не найден. Точный VOD появляется только для открытых архивных стримов; можно вставить ссылку вручную.',
    )
    return result
  }
  result.stage = 'found'
  result.warnings.push(candidate.reason)

  if (input.download !== false) {
    result.stage = 'downloading'
    const downloaded = await downloadGameplay(candidate, input.gameId)
    if (downloaded) {
      result.downloadedPath = downloaded.path
      result.downloadedBytes = downloaded.bytes
      result.stage = 'downloaded'
    } else {
      result.warnings.push(
        'Не удалось скачать файл автоматически. Установите yt-dlp или Python-модуль yt_dlp; разбор публичных субтитров всё равно будет выполнен по ссылке.',
      )
    }
  } else {
    result.warnings.push('Фоновый режим: видеофайл не скачивался, использованы публичные субтитры и метаданные.')
  }

  result.stage = 'analyzing'
  const extracted = await extractVideoAnalysis({
    url: candidate.url,
    civilization: input.civilization,
    gameId: input.gameId,
  })
  if (extracted.ok) {
    result.analysis = extracted.data
    result.stage = 'completed'
  } else {
    result.stage = 'failed'
    result.warnings.push(extracted.error.message)
  }
  return result
}

/** Finds, downloads and analyzes the best public gameplay source for one match. */
export async function autoFindGameplay(input: unknown): Promise<IpcResult<GameplayAutoResult>> {
  if (!isGameplayAutoInput(input)) {
    return err('validation', 'Нужны публичный ID игры и цивилизация игрока.')
  }
  const normalized: GameplayAutoInput = {
    ...input,
    gameId: input.gameId.trim(),
    civilization: input.civilization.trim(),
    opponentCivilization: input.opponentCivilization?.trim() || null,
    map: input.map?.trim() || null,
    playedAt: input.playedAt?.trim() || null,
    download: input.download !== false,
  }
  // Keep caption-only background discovery separate from a manual full-download
  // request. Otherwise an earlier background pass could make the manual action
  // incorrectly reuse a result without a local video file.
  const cacheKey = `${normalized.gameId}:${normalized.download === false ? 'metadata' : 'download'}`
  const cached = cache.get(cacheKey)
  if (!normalized.force && cached && cached.expiresAt > Date.now()) return ok(cached.value)
  let request = inFlight.get(cacheKey)
  if (!request) {
    request = workflow(normalized)
    inFlight.set(cacheKey, request)
  }
  try {
    const value = await request
    cache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, value })
    return ok(value)
  } catch (error) {
    return errFrom(error)
  } finally {
    if (inFlight.get(cacheKey) === request) inFlight.delete(cacheKey)
  }
}
