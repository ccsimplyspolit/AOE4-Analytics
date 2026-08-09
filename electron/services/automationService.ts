import { app } from 'electron'
import { join } from 'node:path'
import { IpcChannels, type AccountReplayArchive, type IpcResult } from '../ipc/contract'
import {
  createIdleAutomationStatus,
  idleAutomationTasks,
  type AutomationStatus,
  type AutomationTaskId,
  type AutomationTaskState,
} from '@domain/automation'
import type { AutomationSettings } from '@store/settings'
import { JsonStore } from '@store/jsonStore'
import { getHistoryStore, getMainWindow, getSettings } from './appContext'
import { isGameRunning } from './gameProcess'
import { analyzeRecentGames } from './analysisService'
import {
  cacheAccountReplays,
  cacheAccountSummaries,
  listAllAccountReplayArchive,
} from './replayArchiveService'
import { getSteamAuthStatus } from './relicAuthService'
import { listAoe4GuidesBuilds } from './communityBuildService'
import { getPublicDumpCatalog } from './publicDumpService'
import { refreshRankedMapPool } from './rankedMapPoolService'
import { analyzeCachedReplay } from './replayCacheService'
import { listVideoAnalyses } from './videoAnalysisStore'
import { autoFindGameplay } from './gameplayAutoService'
import { syncExternalSources } from './sourceSyncService'

/**
 * Background coordinator for repetitive account and research work.
 *
 * All tasks are cache-first, serialized and paused while AoE4 is running. VOD
 * discovery intentionally asks for captions and metadata without downloading
 * the video file; manual gameplay import keeps its existing download behavior.
 */

const TICK_MS = 60_000
const START_DELAY_MS = 20_000
const CATALOG_INTERVAL_MS = 6 * 60 * 60_000
const SOURCE_INTERVAL_MS = 24 * 60 * 60_000
const STATE_KEY = 'state'

interface ProfileState {
  historyAttemptedAt: number | null
  cacheAttemptedAt: number | null
}

interface PersistedState {
  schemaVersion: 1
  catalogAttemptedAt: number | null
  sourceAttemptedAt: number | null
  profiles: Record<string, ProfileState>
  lastRunAt: string | null
  lastError: string | null
}

function validTimestamp(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

function loadState(store: JsonStore): PersistedState {
  const raw = store.get<Partial<PersistedState>>(STATE_KEY)
  const profiles: Record<string, ProfileState> = {}
  if (raw?.profiles && typeof raw.profiles === 'object') {
    for (const [key, value] of Object.entries(raw.profiles)) {
      if (!value || typeof value !== 'object') continue
      const item = value as Partial<ProfileState>
      profiles[key] = {
        historyAttemptedAt: validTimestamp(item.historyAttemptedAt)
          ? item.historyAttemptedAt
          : null,
        cacheAttemptedAt: validTimestamp(item.cacheAttemptedAt) ? item.cacheAttemptedAt : null,
      }
    }
  }
  return {
    schemaVersion: 1,
    catalogAttemptedAt: validTimestamp(raw?.catalogAttemptedAt) ? raw.catalogAttemptedAt : null,
    sourceAttemptedAt: validTimestamp(raw?.sourceAttemptedAt) ? raw.sourceAttemptedAt : null,
    profiles,
    lastRunAt: typeof raw?.lastRunAt === 'string' ? raw.lastRunAt : null,
    lastError: typeof raw?.lastError === 'string' ? raw.lastError : null,
  }
}

function due(at: number | null, intervalMs: number, now = Date.now()): boolean {
  return at == null || now - at >= intervalMs
}

function accountItems(archive: AccountReplayArchive): AccountReplayArchive['items'] {
  return [...archive.items].sort((left, right) =>
    right.game.started_at.localeCompare(left.game.started_at),
  )
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export class AutomationCoordinator {
  private timer: ReturnType<typeof setInterval> | null = null
  private startTimer: ReturnType<typeof setTimeout> | null = null
  private running = false
  private status: AutomationStatus = createIdleAutomationStatus()
  private readonly store: JsonStore

  constructor() {
    this.store = new JsonStore(join(app.getPath('userData'), 'automation.json'))
  }

  start(): void {
    if (this.timer || this.startTimer) return
    this.status.nextRunAt = new Date(Date.now() + START_DELAY_MS).toISOString()
    this.publishStatus()
    this.startTimer = setTimeout(() => {
      this.startTimer = null
      void this.run('startup')
    }, START_DELAY_MS)
    this.startTimer.unref?.()
    this.timer = setInterval(() => void this.run('interval'), TICK_MS)
    this.timer.unref?.()
  }

  stop(): void {
    if (this.startTimer) clearTimeout(this.startTimer)
    if (this.timer) clearInterval(this.timer)
    this.startTimer = null
    this.timer = null
    this.status.nextRunAt = null
    this.publishStatus()
  }

  getStatus(): AutomationStatus {
    return structuredClone(this.status)
  }

  /** Runs the configured pipeline. Manual runs remain available when disabled. */
  async run(reason = 'manual'): Promise<AutomationStatus> {
    if (this.running) return this.getStatus()
    const settings = getSettings().getAll()
    if (!settings.automation.enabled && reason !== 'manual') {
      this.status = {
        ...this.status,
        running: false,
        reason: 'disabled',
        nextRunAt: null,
      }
      this.publishStatus()
      return this.getStatus()
    }
    if (settings.profileId == null) {
      this.status = {
        ...this.status,
        running: false,
        reason: 'no-profile',
        lastError: 'No AoE4World profile is selected.',
        nextRunAt: null,
      }
      this.publishStatus()
      return this.getStatus()
    }

    // A live match has priority. The next one-minute tick will pick the work up
    // after the game, without an API burst during the match itself.
    if (await isGameRunning().catch(() => false)) {
      this.status = {
        ...this.status,
        running: false,
        reason: 'match-in-progress',
        lastError: null,
        nextRunAt: new Date(Date.now() + TICK_MS).toISOString(),
      }
      this.publishStatus()
      return this.getStatus()
    }

    this.running = true
    const now = Date.now()
    const state = loadState(this.store)
    const profileKey = String(settings.profileId)
    const profile = state.profiles[profileKey] ?? {
      historyAttemptedAt: null,
      cacheAttemptedAt: null,
    }
    const intervalMs = settings.automation.intervalMinutes * 60_000
    const errors: string[] = []
    const actions: string[] = []
    this.status = {
      running: true,
      reason,
      startedAt: new Date(now).toISOString(),
      finishedAt: null,
      nextRunAt: null,
      lastError: null,
      tasks: idleAutomationTasks(),
    }
    this.publishStatus()

    try {
      if (settings.automation.syncHistory && due(profile.historyAttemptedAt, intervalMs, now)) {
        profile.historyAttemptedAt = now
        this.beginTask('history')
        try {
          const result = await analyzeRecentGames()
          if (result.ok) {
            actions.push(`history:${result.data.analyzed}`)
            this.finishTask('history', 'success', result.data.analyzed, `Analyzed ${result.data.analyzed} new games.`)
          } else {
            errors.push(`history: ${result.error.message}`)
            this.finishTask('history', 'error', 0, result.error.message)
          }
        } catch (error) {
          const message = errorMessage(error)
          errors.push(`history: ${message}`)
          this.finishTask('history', 'error', 0, message)
        }
      } else {
        this.skipTask('history', settings.automation.syncHistory ? 'History is up to date.' : 'Disabled in settings.')
      }

      const needsArchive =
        (settings.automation.refreshReplayArchive ||
          settings.automation.cacheSummaries ||
          settings.automation.cacheReplays ||
          settings.automation.analyzeReplays) &&
        due(profile.cacheAttemptedAt, intervalMs, now)
      let archive: AccountReplayArchive | null = null
      if (needsArchive) {
        profile.cacheAttemptedAt = now
        this.beginTask('archive')
        const archiveResult = await listAllAccountReplayArchive(settings.automation.refreshReplayArchive)
        if (!archiveResult.ok) {
          errors.push(`archive: ${archiveResult.error.message}`)
          this.finishTask('archive', 'error', 0, archiveResult.error.message)
        } else {
          archive = archiveResult.data
          actions.push(`archive:${archive.items.length}`)
          this.finishTask('archive', 'success', archive.items.length, `${archive.items.length} account games available.`)
        }
      } else {
        this.skipTask('archive', 'Archive is up to date or disabled.')
      }

      if (archive && (settings.automation.cacheSummaries || settings.automation.cacheReplays || settings.automation.analyzeReplays)) {
        this.beginTask('cache')
        const beforeErrors = errors.length
        const processed = await this.cacheRecent(archive, settings.automation, actions, errors)
        this.finishTask(
          'cache',
          errors.length > beforeErrors ? 'error' : 'success',
          processed,
          `${processed} replay or summary operations completed.`,
        )
      } else {
        this.skipTask('cache', archive ? 'Caching is disabled.' : 'No archive was refreshed.')
      }

      if (settings.automation.discoverGameplay) {
        await this.discoverGameplay(settings.automation, actions, errors)
      } else {
        this.skipTask('videos', 'Disabled in settings.')
      }

      if (settings.automation.warmCatalogs && due(state.catalogAttemptedAt, CATALOG_INTERVAL_MS, now)) {
        state.catalogAttemptedAt = now
        this.beginTask('catalogs')
        const beforeErrors = errors.length
        const results = await Promise.allSettled([
          listAoe4GuidesBuilds(),
          getPublicDumpCatalog(),
          refreshRankedMapPool(),
        ])
        for (const result of results) {
          if (result.status === 'rejected') {
            errors.push(`catalog: ${errorMessage(result.reason)}`)
          } else if (
            result.value &&
            typeof result.value === 'object' &&
            'ok' in result.value &&
            result.value.ok === false
          ) {
            errors.push(`catalog: ${result.value.error.message}`)
          }
        }
        actions.push('catalogs:warmed')
        this.finishTask(
          'catalogs',
          errors.length > beforeErrors ? 'error' : 'success',
          1,
          errors.length > beforeErrors ? 'Some catalogues could not be refreshed.' : 'Map pool, builds, and dumps refreshed.',
        )
      } else {
        this.skipTask('catalogs', settings.automation.warmCatalogs ? 'Catalogs are up to date.' : 'Disabled in settings.')
      }

      if (settings.automation.syncSources && due(state.sourceAttemptedAt, SOURCE_INTERVAL_MS, now)) {
        state.sourceAttemptedAt = now
        this.beginTask('sources')
        const result = await syncExternalSources({})
        if (result.ok) {
          actions.push('sources:synced')
          this.finishTask('sources', 'success', 1, 'External source snapshot synchronized.')
        } else {
          errors.push(`sources: ${result.error.message}`)
          this.finishTask('sources', 'error', 0, result.error.message)
        }
      } else {
        this.skipTask('sources', settings.automation.syncSources ? 'Source sync is up to date.' : 'Disabled in settings.')
      }

      state.profiles[profileKey] = profile
      state.lastRunAt = new Date(now).toISOString()
      state.lastError = errors.length > 0 ? errors.join(' | ') : null
      this.store.set(STATE_KEY, state)
      this.status.finishedAt = new Date().toISOString()
      this.status.running = false
      this.status.lastError = state.lastError
      this.status.nextRunAt = new Date(Date.now() + intervalMs).toISOString()
      this.publishStatus()
      if (actions.length > 0 || errors.length > 0) {
        console.log(
          `[automation] ${reason}: ${actions.join(', ') || 'no-op'}${errors.length ? `; ${errors.join(' | ')}` : ''}`,
        )
      }
    } catch (error) {
      const message = errorMessage(error)
      this.status.running = false
      this.status.finishedAt = new Date().toISOString()
      this.status.lastError = message
      this.status.nextRunAt = new Date(Date.now() + intervalMs).toISOString()
      this.publishStatus()
      console.warn(`[automation] ${reason} failed: ${message}`)
    } finally {
      this.running = false
    }
    return this.getStatus()
  }

  private publishStatus(): void {
    const window = getMainWindow()
    if (window) window.webContents.send(IpcChannels.automationStatus, this.getStatus())
  }

  private task(id: AutomationTaskId): AutomationStatus['tasks'][number] {
    return this.status.tasks.find((item) => item.id === id)!
  }

  private beginTask(id: AutomationTaskId): void {
    const task = this.task(id)
    task.state = 'running'
    task.startedAt = new Date().toISOString()
    task.finishedAt = null
    task.processed = 0
    task.message = null
    this.publishStatus()
  }

  private finishTask(id: AutomationTaskId, state: AutomationTaskState, processed: number, message: string): void {
    const task = this.task(id)
    task.state = state
    task.finishedAt = new Date().toISOString()
    task.processed = processed
    task.message = message
    this.publishStatus()
  }

  private skipTask(id: AutomationTaskId, message: string): void {
    const task = this.task(id)
    task.state = 'skipped'
    task.finishedAt = new Date().toISOString()
    task.message = message
    this.publishStatus()
  }

  private async discoverGameplay(
    automation: AutomationSettings,
    actions: string[],
    errors: string[],
  ): Promise<void> {
    this.beginTask('videos')
    try {
      const matches = (await getHistoryStore()).listVisibleMatches(100)
      const analyzedGameIds = new Set(
        listVideoAnalyses()
          .map((item) => item.gameId)
          .filter((gameId): gameId is string => gameId != null),
      )
      const pending = matches
        .filter((match) => !match.custom && /^\d{1,16}$/.test(match.id) && match.civ.trim())
        .filter((match) => !analyzedGameIds.has(match.id))
        .slice(0, automation.maxGameplayPerRun)
      let processed = 0
      for (const match of pending) {
        const result = await autoFindGameplay({
          gameId: match.id,
          civilization: match.civ,
          opponentCivilization: match.oppCiv,
          map: match.map,
          durationSec: match.durationSec,
          playedAt: match.playedAt,
          download: false,
        })
        processed += 1
        if (!result.ok) {
          errors.push(`video ${match.id}: ${result.error.message}`)
          continue
        }
        actions.push(`video:${match.id}:${result.data.stage}`)
      }
      this.finishTask(
        'videos',
        errors.some((item) => item.startsWith('video ')) ? 'error' : 'success',
        processed,
        pending.length > 0 ? `${processed} public gameplay searches completed.` : 'No new matches need a VOD search.',
      )
    } catch (error) {
      const message = errorMessage(error)
      errors.push(`videos: ${message}`)
      this.finishTask('videos', 'error', 0, message)
    }
  }

  private async cacheRecent(
    archive: AccountReplayArchive,
    automation: AutomationSettings,
    actions: string[],
    errors: string[],
  ): Promise<number> {
    const items = accountItems(archive)
    const connected = getSteamAuthStatus().connected
    const replayIdsForAnalysis = new Set(
      items
        .filter((item) => item.cacheStatus === 'cached')
        .slice(0, automation.maxReplaysPerRun)
        .map((item) => item.game.game_id),
    )
    let processed = 0

    if (connected && automation.cacheSummaries) {
      const ids = items
        .filter((item) => item.summaryAvailable && !item.summaryCached)
        .slice(0, automation.maxSummariesPerRun)
        .map((item) => item.game.game_id)
      if (ids.length > 0) {
        try {
          const result = await cacheAccountSummaries(ids)
          if (result.ok) {
            processed += result.data.cached + result.data.alreadyCached
            actions.push(`summaries:${result.data.cached + result.data.alreadyCached}/${ids.length}`)
          } else errors.push(`summaries: ${result.error.message}`)
        } catch (error) {
          errors.push(`summaries: ${errorMessage(error)}`)
        }
      }
    }

    if (connected && automation.cacheReplays) {
      const ids = items
        .filter((item) => item.replayAvailable && item.cacheStatus !== 'cached')
        .slice(0, automation.maxReplaysPerRun)
        .map((item) => item.game.game_id)
      ids.forEach((id) => replayIdsForAnalysis.add(id))
      if (ids.length > 0) {
        try {
          const result = await cacheAccountReplays(ids)
          if (result.ok) {
            processed += result.data.cached + result.data.alreadyCached
            actions.push(`replays:${result.data.cached + result.data.alreadyCached}/${ids.length}`)
          } else errors.push(`replays: ${result.error.message}`)
        } catch (error) {
          errors.push(`replays: ${errorMessage(error)}`)
        }
      }
    }

    if (automation.analyzeReplays && replayIdsForAnalysis.size > 0) {
      let analyzed = 0
      for (const gameId of replayIdsForAnalysis) {
        if (analyzeCachedReplay(gameId) != null) analyzed += 1
      }
      processed += analyzed
      actions.push(`replay-analysis:${analyzed}/${replayIdsForAnalysis.size}`)
    }
    return processed
  }
}

let coordinator: AutomationCoordinator | null = null

export function startAutomation(): void {
  if (!coordinator) coordinator = new AutomationCoordinator()
  coordinator.start()
}

export function stopAutomation(): void {
  coordinator?.stop()
  coordinator = null
}

export function getAutomationStatus(): AutomationStatus {
  return coordinator?.getStatus() ?? createIdleAutomationStatus()
}

export function runAutomationNow(): Promise<AutomationStatus> {
  if (!coordinator) coordinator = new AutomationCoordinator()
  return coordinator.run('manual')
}

export function getAutomationCoordinator(): AutomationCoordinator | null {
  return coordinator
}
