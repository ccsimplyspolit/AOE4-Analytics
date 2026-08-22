import { app } from 'electron'
import { join } from 'node:path'
import { IpcChannels, type AccountReplayArchive } from '../ipc/contract'
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
import { analyzeCachedReplay } from './replayCacheService'
import { getSteamAuthStatus } from './relicAuthService'
import { listAoe4GuidesBuilds } from './communityBuildService'
import { getPublicDumpCatalog } from './publicDumpService'
import { refreshRankedMapPool } from './rankedMapPoolService'
import { autoFindGameplay } from './gameplayAutoService'
import { listVideoAnalyses } from './videoAnalysisStore'
import { syncExternalSources } from './sourceSyncService'
import {
  createIdleAutomationStatus,
  type AutomationStatus,
  type AutomationTaskId,
  type AutomationTaskState,
} from '@domain/automation'

/**
 * Serializes the repetitive desktop workflow into one cache-first coordinator.
 *
 * Every job is account-scoped, skipped while AoE4 is running, and bounded by
 * user settings. The coordinator never silently rewrites source files: the
 * optional source sync is off by default and must be explicitly enabled.
 */
const TICK_MS = 60_000
const START_DELAY_MS = 20_000
const CATALOG_INTERVAL_MS = 6 * 60 * 60_000
const SOURCE_INTERVAL_MS = 24 * 60 * 60_000
const STATE_KEY = 'state'

interface ProfileState {
  historyAttemptedAt: number | null
  cacheAttemptedAt: number | null
  gameplayAttemptedAt: number | null
}

interface PersistedState {
  schemaVersion: 2
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
        gameplayAttemptedAt: validTimestamp(item.gameplayAttemptedAt)
          ? item.gameplayAttemptedAt
          : null,
      }
    }
  }
  return {
    schemaVersion: 2,
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

export class AutomationCoordinator {
  private timer: ReturnType<typeof setInterval> | null = null
  private startTimer: ReturnType<typeof setTimeout> | null = null
  private running = false
  private readonly store: JsonStore
  private status: AutomationStatus = createIdleAutomationStatus()

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
    return { ...this.status, tasks: this.status.tasks.map((task) => ({ ...task })) }
  }

  /** Runs one bounded pass; manual runs remain available when scheduling is off. */
  async run(reason = 'manual'): Promise<AutomationStatus> {
    if (this.running) return this.getStatus()
    const settings = getSettings().getAll()
    if (!settings.automation.enabled && reason !== 'manual') {
      this.status = {
        ...createIdleAutomationStatus(
          this.timer ? new Date(Date.now() + TICK_MS).toISOString() : null,
        ),
        reason: settings.automation.enabled ? 'no-profile' : 'disabled',
        finishedAt: new Date().toISOString(),
      }
      this.publishStatus()
      return this.getStatus()
    }
    if (settings.profileId == null) {
      this.status = {
        ...createIdleAutomationStatus(null),
        reason: 'no-profile',
        finishedAt: new Date().toISOString(),
        lastError: 'No AoE4World profile is selected.',
      }
      this.publishStatus()
      return this.getStatus()
    }
    if (await isGameRunning().catch(() => false)) {
      this.status = {
        ...createIdleAutomationStatus(new Date(Date.now() + TICK_MS).toISOString()),
        reason: 'game-running',
        finishedAt: new Date().toISOString(),
      }
      this.publishStatus()
      return this.getStatus()
    }

    this.running = true
    this.status = {
      ...createIdleAutomationStatus(null),
      running: true,
      reason,
      startedAt: new Date().toISOString(),
    }
    this.publishStatus()
    const now = Date.now()
    const state = loadState(this.store)
    const profileKey = String(settings.profileId)
    const profile = state.profiles[profileKey] ?? {
      historyAttemptedAt: null,
      cacheAttemptedAt: null,
      gameplayAttemptedAt: null,
    }
    const intervalMs = settings.automation.intervalMinutes * 60_000
    const errors: string[] = []
    const actions: string[] = []

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
          const message = error instanceof Error ? error.message : String(error)
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
      if (needsArchive) {
        profile.cacheAttemptedAt = now
        this.beginTask('archive')
        const archive = await listAllAccountReplayArchive(settings.automation.refreshReplayArchive)
        if (!archive.ok) {
          errors.push(`archive: ${archive.error.message}`)
          this.finishTask('archive', 'error', 0, archive.error.message)
          this.skipTask('cache', 'Archive is unavailable.')
        } else {
          this.finishTask('archive', 'success', archive.data.items.length, `${archive.data.items.length} account games available.`)
          this.beginTask('cache')
          const beforeErrors = errors.length
          await this.cacheRecent(archive.data, settings.automation, actions, errors)
          this.finishTask('cache', errors.length > beforeErrors ? 'error' : 'success', 0, 'Replay and summary cache pass completed.')
        }
      } else {
        this.skipTask('archive', 'Archive is up to date or disabled.')
        this.skipTask('cache', 'No cache pass is due.')
      }

      if (
        settings.automation.discoverGameplay &&
        due(profile.gameplayAttemptedAt, intervalMs, now)
      ) {
        profile.gameplayAttemptedAt = now
        this.beginTask('videos')
        const beforeErrors = errors.length
        await this.discoverGameplay(settings.automation, actions, errors)
        this.finishTask('videos', errors.length > beforeErrors ? 'error' : 'success', 0, 'Public gameplay search pass completed.')
      } else {
        this.skipTask('videos', settings.automation.discoverGameplay ? 'VOD search is up to date.' : 'Disabled in settings.')
      }

      if (
        settings.automation.warmCatalogs &&
        due(state.catalogAttemptedAt, CATALOG_INTERVAL_MS, now)
      ) {
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
            errors.push(
              `catalog: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`,
            )
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
        this.finishTask('catalogs', errors.length > beforeErrors ? 'error' : 'success', 1, 'Map pool, builds, and dumps refreshed.')
      } else {
        this.skipTask('catalogs', settings.automation.warmCatalogs ? 'Catalogs are up to date.' : 'Disabled in settings.')
      }

      if (
        settings.automation.syncSources &&
        due(state.sourceAttemptedAt, SOURCE_INTERVAL_MS, now)
      ) {
        state.sourceAttemptedAt = now
        this.beginTask('sources')
        const source = await syncExternalSources({
          dryRun: false,
          essenceAuto: true,
          essenceDecodeRgd: false,
          essenceDecodeNativeIcons: false,
          essenceOnly: false,
          skipIcons: false,
          skipGameData: false,
          skipMeta: false,
          skipGuides: false,
          patch: null,
        })
        if (source.ok) {
          actions.push(`sources:${source.data.completed.length}`)
          this.finishTask('sources', 'success', source.data.completed.length, 'External source snapshot synchronized.')
        } else {
          errors.push(`sources: ${source.error.message}`)
          this.finishTask('sources', 'error', 0, source.error.message)
        }
      } else {
        this.skipTask('sources', settings.automation.syncSources ? 'Source sync is up to date.' : 'Disabled in settings.')
      }

      state.profiles[profileKey] = profile
      state.lastRunAt = new Date(now).toISOString()
      state.lastError = errors.length > 0 ? errors.join(' | ') : null
      this.store.set(STATE_KEY, state)
      if (actions.length > 0 || errors.length > 0) {
        console.log(
          `[automation] ${reason}: ${actions.join(', ') || 'no-op'}${errors.length ? `; ${errors.join(' | ')}` : ''}`,
        )
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      errors.push(`automation: ${message}`)
      console.warn(`[automation] ${reason} failed: ${message}`)
    } finally {
      this.running = false
      this.status.running = false
      this.status.finishedAt = new Date().toISOString()
      this.status.nextRunAt = this.timer ? new Date(Date.now() + intervalMs).toISOString() : null
      this.status.lastError = errors.length > 0 ? errors.join(' | ') : null
      this.publishStatus()
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

  private finishTask(
    id: AutomationTaskId,
    state: AutomationTaskState,
    processed: number,
    message: string,
  ): void {
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

  private async cacheRecent(
    archive: AccountReplayArchive,
    automation: AutomationSettings,
    actions: string[],
    errors: string[],
  ): Promise<void> {
    const items = accountItems(archive)
    const connected = getSteamAuthStatus().connected
    const replayIdsForAnalysis = new Set<number>(
      items
        .filter((item) => item.cacheStatus === 'cached')
        .slice(0, Math.max(automation.maxReplaysPerRun * 2, 100))
        .map((item) => item.game.game_id),
    )

    if (connected && automation.cacheSummaries) {
      const ids = items
        .filter((item) => item.summaryAvailable && !item.summaryCached)
        .slice(0, automation.maxSummariesPerRun)
        .map((item) => item.game.game_id)
      if (ids.length > 0) {
        try {
          const result = await cacheAccountSummaries(ids)
          if (result.ok)
            actions.push(
              `summaries:${result.data.cached + result.data.alreadyCached}/${ids.length}`,
            )
          else errors.push(`summaries: ${result.error.message}`)
        } catch (error) {
          errors.push(`summaries: ${error instanceof Error ? error.message : String(error)}`)
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
          if (result.ok)
            actions.push(`replays:${result.data.cached + result.data.alreadyCached}/${ids.length}`)
          else errors.push(`replays: ${result.error.message}`)
        } catch (error) {
          errors.push(`replays: ${error instanceof Error ? error.message : String(error)}`)
        }
      }
    }

    if (automation.analyzeReplays && replayIdsForAnalysis.size > 0) {
      let analyzed = 0
      for (const gameId of replayIdsForAnalysis) {
        if (analyzeCachedReplay(gameId) != null) analyzed += 1
      }
      actions.push(`replay-analysis:${analyzed}/${replayIdsForAnalysis.size}`)
    }
  }

  private async discoverGameplay(
    automation: AutomationSettings,
    actions: string[],
    errors: string[],
  ): Promise<void> {
    try {
      const history = await getHistoryStore()
      const existing = new Set(
        listVideoAnalyses()
          .map((item) => item.gameId)
          .filter((id): id is string => Boolean(id)),
      )
      const matches = history
        .listVisibleMatches(Math.max(automation.maxGameplayPerRun * 4, 10))
        .filter(
          (match) =>
            !match.custom && /^\d{1,16}$/.test(match.id) && !existing.has(match.id),
        )
        .slice(0, automation.maxGameplayPerRun)
      let completed = 0
      for (const match of matches) {
        const result = await autoFindGameplay({
          gameId: match.id,
          civilization: match.civ,
          opponentCivilization: match.oppCiv,
          map: match.map,
          durationSec: match.durationSec,
          playedAt: match.playedAt,
          download: false,
        })
        if (!result.ok) errors.push(`gameplay ${match.id}: ${result.error.message}`)
        else if (result.data.analysis) completed += 1
      }
      if (matches.length > 0) actions.push(`gameplay:${completed}/${matches.length}`)
    } catch (error) {
      errors.push(`gameplay: ${error instanceof Error ? error.message : String(error)}`)
    }
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

export function getAutomationCoordinator(): AutomationCoordinator | null {
  return coordinator
}

export function getAutomationStatus(): AutomationStatus {
  return coordinator?.getStatus() ?? createIdleAutomationStatus()
}

export async function runAutomationNow(): Promise<AutomationStatus> {
  if (!coordinator) {
    coordinator = new AutomationCoordinator()
    coordinator.start()
  }
  await coordinator.run('manual')
  return coordinator.getStatus()
}
