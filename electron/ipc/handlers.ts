import { app, ipcMain, BrowserWindow } from 'electron'
import { IpcChannels } from './contract'
import type { AppSettingsPatch } from '@store/settings'
import {
  getApmTracker,
  getOverlayController,
  getPollManager,
  getSettings,
} from '../services/appContext'
import { registerHotkeys } from '../hotkeys'
import { launchGame } from '../services/gameProcess'
import { getSteamAccounts, getSteamAvatar } from '../services/steamService'
import type { LiveMatchInfo } from './contract'
import { getDashboard, searchPlayers } from '../services/profileService'
import { getScoutHistory, getScoutMeta, scoutPlayer } from '../services/scoutService'
import { getLastMatchCoach } from '../services/coachService'
import { getCivMeta, getMatchupLab } from '../services/civMetaService'
import { getRankedMapPool } from '../services/rankedMapPoolService'
import { getCivDetailStats, getLandmarkStats } from '../services/civDetailService'
import { getLeaderboardPage } from '../services/leaderboardService'
import {
  analyzeRecentGames,
  getBuildAuditHistory,
  getMatchCorpusReport,
  deleteMatch,
  getGameSummary,
  getLandmarkRecord,
  getMatchupWinRate,
  listHistory,
} from '../services/analysisService'
import {
  getLatestLocalMatch,
  getLatestReplay,
  analyzeLocalReplay,
  listReplayArchive,
  getLocalDataStatus,
} from '../services/localDataService'
import {
  cacheAccountReplay,
  cacheAccountReplays,
  cacheAccountSummary,
  cacheAccountSummaries,
  downloadAndAnalyzeAccountReplay,
  listAllAccountReplayArchive,
  listAccountReplayArchive,
} from '../services/replayArchiveService'
import { analyzeCachedReplay } from '../services/replayCacheService'
import { readReplayActionPage } from '../services/replayAnalysisCacheService'
import {
  diagnoseRankedFetch,
  getSteamAuthStatus,
  steamLogout,
  steamStartCredentialsLogin,
  steamStartLogin,
  steamSubmitSteamGuardCode,
} from '../services/relicAuthService'
import { err, errFrom, ok } from '../services/result'
import { replayMatchup } from '@domain/replay'
import type { CivMetaQuery, LatestReplay, LeaderboardQuery } from './contract'
import {
  getStreamManagerStatus,
  resetStreamManagerState,
  startStreamManager,
  stopStreamManager,
  updateStreamManagerState,
} from '../services/streamManagerService'
import { importAoe2cmDraft } from '../services/streamDraftService'
import {
  importCommunityBuild,
  listAoe4GuidesBuilds,
  listCommunityBuilds,
} from '../services/communityBuildService'
import { findTwitchVod } from '../services/twitchVodService'
import { searchOnline } from '../services/onlineSearchService'
import { getPublicDumpCatalog } from '../services/publicDumpService'
import { syncExternalSources } from '../services/sourceSyncService'
import { extractVideoAnalysis } from '../services/videoAnalysisService'
import { listVideoAnalyses } from '../services/videoAnalysisStore'
import { autoFindGameplay } from '../services/gameplayAutoService'
import { getAutomationStatus, runAutomationNow } from '../services/automationService'
import { getBeastyNumber } from '../services/beastyNumberService'
import { getPublicGame } from '../services/publicGameService'
import { findSimilarMatches } from '../services/similarMatchService'
import {
  clearTranslationCache,
  configureTranslation,
  getTranslationStatus,
  translateBatch,
} from '../services/translationService'
import { configureExternalApis, getExternalApiStatus } from '../services/externalApiService'
import { getReplaysApiStatus } from '../services/replaysApiService'

/**
 * Registers all `ipcMain.handle` channels. Called once from `main.ts` after
 * `app.whenReady()`. Handlers stay thin — they delegate to services that
 * compose the API client + domain logic.
 */
export function registerIpcHandlers(): void {
  ipcMain.handle(IpcChannels.appGetVersion, () => app.getVersion())
  ipcMain.handle(IpcChannels.appPing, () => 'pong' as const)
  ipcMain.handle(IpcChannels.appGetPlatform, () => process.platform)

  ipcMain.handle(IpcChannels.profileSearch, (_e, query: string) => searchPlayers(query))
  ipcMain.handle(IpcChannels.profileDashboard, () => getDashboard())
  ipcMain.handle(IpcChannels.scoutGet, (_e, profileId: number) => scoutPlayer(profileId))
  ipcMain.handle(IpcChannels.scoutHistoryGet, (_e, profileId: unknown, query: unknown) =>
    getScoutHistory(profileId, query),
  )
  ipcMain.handle(IpcChannels.scoutMetaGet, (_e, query: unknown) => getScoutMeta(query))
  ipcMain.handle(IpcChannels.publicGameGet, (_e, query: unknown) => getPublicGame(query))
  ipcMain.handle(IpcChannels.similarMatchesFind, (_e, query: unknown) => findSimilarMatches(query))
  ipcMain.handle(IpcChannels.tinctureCoachGet, (_e, profileId: unknown) =>
    getLastMatchCoach(profileId),
  )

  ipcMain.handle(IpcChannels.profileSetCurrent, (_e, profileId: number, name: string) =>
    getSettings().setProfile(profileId, name),
  )
  ipcMain.handle(IpcChannels.profileSetActive, (_e, profileId: number) =>
    getSettings().setActiveProfile(profileId),
  )
  ipcMain.handle(IpcChannels.profileRemove, (_e, profileId: number) =>
    getSettings().removeAccount(profileId),
  )
  ipcMain.handle(IpcChannels.settingsGet, () => getSettings().getAll())
  ipcMain.handle(IpcChannels.settingsUpdate, (_e, patch: AppSettingsPatch) => {
    const next = getSettings().update(patch)
    // Hotkey changes take effect immediately: re-register (old bindings are
    // unregistered first; a failed registration falls back to the default).
    if (patch && typeof patch === 'object' && 'hotkeys' in patch) {
      const overlay = getOverlayController()
      if (overlay) registerHotkeys(overlay)
    }
    return next
  })

  ipcMain.handle(IpcChannels.civMetaGet, (_e, query: CivMetaQuery) => getCivMeta(query))
  ipcMain.handle(IpcChannels.rankedMapPoolGet, () => getRankedMapPool())
  ipcMain.handle(IpcChannels.matchupLabGet, (_e, query: unknown) => getMatchupLab(query))
  ipcMain.handle(IpcChannels.civDetailGet, (_e, civ: string) => getCivDetailStats(civ))
  ipcMain.handle(IpcChannels.leaderboardGet, (_e, query: LeaderboardQuery) =>
    getLeaderboardPage(query),
  )

  // analyzeRecentGames folds local custom/AI games itself — one coordinator.
  ipcMain.handle(IpcChannels.analysisAnalyzeRecent, (_e, count?: number) =>
    analyzeRecentGames(count),
  )
  ipcMain.handle(IpcChannels.analysisHistory, (_e, limit?: number) => listHistory(limit))
  ipcMain.handle(IpcChannels.analysisGameSummary, (_e, matchId: string) => getGameSummary(matchId))
  ipcMain.handle(IpcChannels.analysisBuildAuditHistory, (_e, limit?: number) =>
    getBuildAuditHistory(limit),
  )
  ipcMain.handle(IpcChannels.analysisCorpusReport, (_e, limit?: number) =>
    getMatchCorpusReport(limit),
  )
  ipcMain.handle(IpcChannels.analysisDeleteMatch, (_e, matchId: string) => deleteMatch(matchId))
  ipcMain.handle(IpcChannels.civLandmarkRecord, (_e, civ: string) => getLandmarkRecord(civ))
  ipcMain.handle(IpcChannels.civLandmarkStats, (_e, civ: string) => getLandmarkStats(civ))

  ipcMain.handle(IpcChannels.steamAuthStatus, () => getSteamAuthStatus())
  ipcMain.handle(IpcChannels.steamStartLogin, async () => {
    try {
      return ok(await steamStartLogin())
    } catch (e) {
      return errFrom(e)
    }
  })
  ipcMain.handle(
    IpcChannels.steamStartCredentialsLogin,
    async (_e, accountName: string, password: string) => {
      try {
        return ok(await steamStartCredentialsLogin(accountName, password))
      } catch (e) {
        return errFrom(e)
      }
    },
  )
  ipcMain.handle(IpcChannels.steamSubmitSteamGuardCode, async (_e, code: string) => {
    try {
      return ok(await steamSubmitSteamGuardCode(code))
    } catch (e) {
      return errFrom(e)
    }
  })
  ipcMain.handle(IpcChannels.steamLogout, () => steamLogout())
  ipcMain.handle(IpcChannels.steamTestRankedFetch, async () => {
    try {
      const profileId = getSettings().getAll().profileId
      if (profileId == null) return errFrom(new Error('No profile set'))
      return ok(await diagnoseRankedFetch(profileId))
    } catch (e) {
      return errFrom(e)
    }
  })

  ipcMain.handle(IpcChannels.localDataStatus, () => getLocalDataStatus())

  ipcMain.handle(IpcChannels.overlayApplySettings, () => {
    const overlay = getOverlayController()
    overlay?.applyPosition() // snap to the current display's full bounds
    overlay?.refreshGating() // apply the "only show while AoE4 focused" toggle live
    // Push widget toggles + opacity to the overlay renderer (opacity is applied
    // there as panel-background alpha — never win.setOpacity, which dims text).
    overlay?.sendSettings()
    getApmTracker()?.setEnabled(getSettings().getAll().overlay.apm) // start/stop the live-APM hook
  })
  ipcMain.handle(IpcChannels.overlayToggle, () => {
    getOverlayController()?.toggle()
  })
  ipcMain.handle(
    IpcChannels.overlayTogglePlacement,
    () => getOverlayController()?.togglePlacementMode() ?? false,
  )
  ipcMain.handle(IpcChannels.overlayInteractive, (_e, hover: unknown) => {
    getOverlayController()?.setInteractiveHover(hover === true)
  })
  ipcMain.handle(IpcChannels.overlayDismissPostGame, () => {
    getOverlayController()?.dismissPostGame()
  })

  // Custom window chrome — act on whichever window made the call (the frameless
  // main window). Using the sender's window avoids plumbing a window ref here.
  ipcMain.handle(IpcChannels.windowMinimize, (e) =>
    BrowserWindow.fromWebContents(e.sender)?.minimize(),
  )
  ipcMain.handle(IpcChannels.windowMaximizeToggle, (e) => {
    const w = BrowserWindow.fromWebContents(e.sender)
    if (!w) return
    if (w.isMaximized()) w.unmaximize()
    else w.maximize()
  })
  ipcMain.handle(IpcChannels.windowClose, (e) => BrowserWindow.fromWebContents(e.sender)?.close())
  ipcMain.handle(
    IpcChannels.windowIsMaximized,
    (e) => BrowserWindow.fromWebContents(e.sender)?.isMaximized() ?? false,
  )

  ipcMain.handle(
    IpcChannels.gameLive,
    (): LiveMatchInfo =>
      getPollManager()?.getLiveInfo() ?? {
        isLive: false,
        isStale: false,
        source: 'no-game',
        processRunning: null,
        custom: false,
        leaderboard: null,
        patch: null,
        kind: null,
        averageMmr: null,
        averageRating: null,
        server: null,
        durationSec: null,
        myCiv: null,
        opponent: null,
        map: null,
        startedAt: null,
      },
  )
  ipcMain.handle(IpcChannels.gameLaunch, () => launchGame())
  ipcMain.handle(IpcChannels.gameLocalMatch, () => getLatestLocalMatch())
  ipcMain.handle(IpcChannels.steamDetect, () => getSteamAccounts())
  ipcMain.handle(IpcChannels.steamAvatar, (_e, steamId: string) =>
    typeof steamId === 'string' ? getSteamAvatar(steamId) : null,
  )
  ipcMain.handle(IpcChannels.replayLatest, async (): Promise<LatestReplay | null> => {
    const r = getLatestReplay()
    if (!r) return null
    const accounts = await getSteamAccounts()
    const matchup = replayMatchup(
      r.info,
      accounts.map((a) => a.steamId),
    )
    // Resolve a HUMAN opponent's Steam id → AoE4World profile (the scout
    // match_history.jsn can't give). Skipped for vs-AI (no human opponent).
    let opponent = null
    const humanOpp = matchup.opponents.find((p) => !p.ai && p.steamId)
    if (humanOpp?.steamId) {
      const res = await searchPlayers(humanOpp.steamId)
      if (res.ok && res.data[0]) opponent = res.data[0]
    }
    return { ...matchup, recordedAtMs: r.recordedAtMs, opponent }
  })
  ipcMain.handle(IpcChannels.replayList, (_e, page?: unknown, pageSize?: unknown) =>
    listReplayArchive(
      typeof page === 'number' ? page : undefined,
      typeof pageSize === 'number' ? pageSize : undefined,
    ),
  )
  ipcMain.handle(
    IpcChannels.replayAccount,
    (_e, page?: unknown, pageSize?: unknown, forceRefresh?: unknown) =>
      listAccountReplayArchive(
        typeof page === 'number' ? page : undefined,
        typeof pageSize === 'number' ? pageSize : undefined,
        forceRefresh === true,
      ),
  )
  ipcMain.handle(IpcChannels.replayAccountAll, (_e, forceRefresh?: unknown) =>
    listAllAccountReplayArchive(forceRefresh === true),
  )
  ipcMain.handle(IpcChannels.replayCache, (_e, gameId: unknown) =>
    cacheAccountReplay(typeof gameId === 'number' ? gameId : Number(gameId)),
  )
  ipcMain.handle(IpcChannels.replayCacheBatch, (_e, gameIds: unknown) =>
    cacheAccountReplays(
      Array.isArray(gameIds)
        ? gameIds.filter((value): value is number => typeof value === 'number')
        : [],
    ),
  )
  ipcMain.handle(IpcChannels.summaryCache, (_e, gameId: unknown) =>
    cacheAccountSummary(typeof gameId === 'number' ? gameId : Number(gameId)),
  )
  ipcMain.handle(IpcChannels.summaryCacheBatch, (_e, gameIds: unknown) =>
    cacheAccountSummaries(
      Array.isArray(gameIds)
        ? gameIds.filter((value): value is number => typeof value === 'number')
        : [],
    ),
  )
  ipcMain.handle(IpcChannels.replaysApiStatus, () => getReplaysApiStatus())
  ipcMain.handle(IpcChannels.replayAnalyze, (_e, target: unknown) => {
    try {
      if (target && typeof target === 'object') {
        const value = target as Record<string, unknown>
        if (typeof value.localId === 'string') return ok(analyzeLocalReplay(value.localId))
        if (typeof value.gameId === 'number' && Number.isSafeInteger(value.gameId))
          return ok(analyzeCachedReplay(value.gameId))
      }
      return err('validation', 'Replay analysis target is invalid.')
    } catch (error) {
      return errFrom(error)
    }
  })
  ipcMain.handle(
    IpcChannels.replayActions,
    async (_e, target: unknown, offset?: unknown, limit?: unknown, playerId?: unknown) => {
      try {
        let result = null
        if (target && typeof target === 'object') {
          const value = target as Record<string, unknown>
          if (typeof value.localId === 'string') result = analyzeLocalReplay(value.localId)
          else if (typeof value.gameId === 'number' && Number.isSafeInteger(value.gameId))
            result = analyzeCachedReplay(value.gameId)
        }
        if (!result) return ok(null)
        return ok(
          await readReplayActionPage(
            result,
            typeof offset === 'number' ? offset : 0,
            typeof limit === 'number' ? limit : 100,
            typeof playerId === 'number' && Number.isSafeInteger(playerId) ? playerId : null,
          ),
        )
      } catch (error) {
        return errFrom(error)
      }
    },
  )
  ipcMain.handle(IpcChannels.replayFullAnalyze, (_e, gameId: unknown) =>
    downloadAndAnalyzeAccountReplay(typeof gameId === 'number' ? gameId : Number(gameId)),
  )
  ipcMain.handle(IpcChannels.matchupWinRate, (_e, civ: string, oppCiv: string) =>
    getMatchupWinRate(civ, oppCiv),
  )
  ipcMain.handle(IpcChannels.twitchVodFind, (_e, input: unknown) => findTwitchVod(input))
  ipcMain.handle(IpcChannels.videoAnalysisExtract, (_e, input: unknown) =>
    extractVideoAnalysis(input),
  )
  ipcMain.handle(IpcChannels.videoAnalysisList, () => ok(listVideoAnalyses()))
  ipcMain.handle(IpcChannels.gameplayAutoFind, (_e, input: unknown) => autoFindGameplay(input))
  ipcMain.handle(IpcChannels.automationStatus, () => getAutomationStatus())
  ipcMain.handle(IpcChannels.automationRun, () => runAutomationNow())
  ipcMain.handle(IpcChannels.translationStatus, () => getTranslationStatus())
  ipcMain.handle(IpcChannels.translationConfigure, (_e, input: unknown) => {
    if (!input || typeof input !== 'object') throw new Error('Invalid translation settings.')
    return configureTranslation(input as Parameters<typeof configureTranslation>[0])
  })
  ipcMain.handle(IpcChannels.translationBatch, (_e, input: unknown) => {
    if (!input || typeof input !== 'object') throw new Error('Invalid translation request.')
    return translateBatch(input as Parameters<typeof translateBatch>[0])
  })
  ipcMain.handle(IpcChannels.translationClearCache, () => clearTranslationCache())
  ipcMain.handle(IpcChannels.externalApiStatus, () => getExternalApiStatus())
  ipcMain.handle(IpcChannels.externalApiConfigure, (_e, input: unknown) => {
    if (!input || typeof input !== 'object') throw new Error('Invalid external API settings.')
    return configureExternalApis(input as Parameters<typeof configureExternalApis>[0])
  })
  ipcMain.handle(IpcChannels.externalApiClear, () =>
    configureExternalApis({ clearTwitch: true, clearYoutube: true }),
  )
  ipcMain.handle(IpcChannels.onlineSearch, (_e, query: unknown) => searchOnline(query))
  ipcMain.handle(IpcChannels.dumpCatalogGet, () => getPublicDumpCatalog())
  ipcMain.handle(IpcChannels.sourceSync, (_e, options: unknown) => syncExternalSources(options))
  ipcMain.handle(IpcChannels.beastyNumber, (_e, profileId: unknown) =>
    getBeastyNumber(typeof profileId === 'number' ? profileId : Number(profileId)),
  )
  ipcMain.handle(IpcChannels.streamGetStatus, () => getStreamManagerStatus())
  ipcMain.handle(IpcChannels.streamStart, (_e, port?: unknown) =>
    startStreamManager(typeof port === 'number' ? port : 4174),
  )
  ipcMain.handle(IpcChannels.streamStop, () => stopStreamManager())
  ipcMain.handle(IpcChannels.streamUpdate, (_e, patch: unknown) =>
    updateStreamManagerState(patch && typeof patch === 'object' ? patch : {}),
  )
  ipcMain.handle(IpcChannels.streamReset, () => resetStreamManagerState())
  ipcMain.handle(IpcChannels.streamImportDraft, (_e, url: unknown) => importAoe2cmDraft(url))
  ipcMain.handle(IpcChannels.communityBuildImport, (_e, url: unknown) => importCommunityBuild(url))
  ipcMain.handle(IpcChannels.communityBuildList, (_e, input: unknown) => listCommunityBuilds(input))
  ipcMain.handle(IpcChannels.aoe4GuidesBuildList, (_e, input: unknown) =>
    listAoe4GuidesBuilds(input),
  )
}
