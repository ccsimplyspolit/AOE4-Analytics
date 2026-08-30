import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  CloudDownload,
  Database,
  FileVideo,
  History,
  ListChecks,
  Map as MapIcon,
  RefreshCw,
  ScanLine,
  Users,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import type {
  AccountReplayItem,
  AccountReplayPage,
  ReplayArchiveItem,
  ReplayArchivePage,
  ReplayAnalysisTarget,
  ReplayAnalysisResult,
  FullReplayAnalysis,
} from '@ipc/contract'
import { normalizeTeams } from '@api/types'
import { BUILD_CATALOG } from '@data/buildCatalog'
import { civDisplayName } from '@domain/civ'
import { civFromToken, type MatchSummary } from '@domain/statsSummary'
import { compareMatchPlayers } from '@domain/buildOrderComparison'
import { formatDuration } from '@domain/format'
import type { TwitchVodFinderInput } from '@domain/twitchVodFinder'
import { ipc } from '@shared/ipc'
import { cn } from '@shared/lib/utils'
import { Card, CardContent } from '@shared/components/ui/card'
import { Badge } from '@shared/components/ui/badge'
import { formatCount } from '@shared/format'
import { PageHead } from '../components/PageHead'
import { ScreenTabs } from '../components/ScreenTabs'
import { EmptyBox, ErrorBox, Spinner } from '../components/feedback'
import { GameSummaryPanel } from '../components/GameSummaryPanel'
import { BuildOrderComparisonCard } from '../components/BuildOrderComparisonCard'
import { TwitchVodCard } from '../components/TwitchVodCard'
import {
  useAccountReplays,
  useCacheReplay,
  useCacheReplays,
  useCacheSummaries,
  useDownloadAndAnalyzeReplay,
  useReplayActions,
  useReplayAnalysis,
  useReplays,
} from '../queries/useReplays'
import { useSettings } from '../queries/useProfile'
import { useGameSummary } from '../queries/useHistory'
import { useSteamAuthStatus } from '../queries/useSteam'
import { useTwitchVod } from '../queries/useTwitchVod'
import { useVideoAnalyses } from '../queries/useVideoAnalyses'
import { ValdemarReplayReviewsPanel } from '../components/ValdemarReplayReviewsPanel'
import { useI18n } from '../../i18n'
import { useAutoAction } from '../hooks/useAutoAction'

const LOCAL_PAGE_SIZE = 25
const ACCOUNT_PAGE_SIZE = 20

type AutoAnalysisState = {
  done: number
  total: number
  errors: number
}

type BulkCacheMode = 'replays' | 'summaries'

type BulkCacheProgress = {
  mode: BulkCacheMode
  scanned: number
  eligible: number
  completed: number
}

type ArchiveAuditRow = {
  gameId: number
  startedAt: string
  map: string
  playerName: string
  isMe: boolean
  civ: string | null
  result: 'win' | 'loss' | null
  reference: string | null
  score: number | null
  improvements: number
  strengths: number
  matchedActions: number
  expectedActions: number
  confidence: 'high' | 'medium' | 'low' | 'none'
}

type ArchiveAuditProgress = {
  done: number
  total: number
  eligible: number
  unavailable: number
  errors: number
}

type AutoAnalysisTarget = {
  key: string
  target: ReplayAnalysisTarget
}

function replayDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString()
}

function rosterLabel(
  item: ReplayArchiveItem,
  tt: (value: string) => string,
  gameName: (value: string) => string,
): string {
  if (item.info?.players.length) {
    return item.info.players
      .map(
        (player) =>
          `${player.name || tt('Unknown')} · ${gameName(player.civSlug ?? '')}`,
      )
      .join('  vs  ')
  }
  if (item.localMatch?.players.length) {
    return item.localMatch.players
      .map(
        (player) =>
          player.civ ?? (player.raceId != null ? `${tt('Civ')} #${player.raceId}` : tt('Unknown')),
      )
      .join('  ·  ')
  }
  return tt('Player roster unavailable')
}

function accountRoster(
  item: AccountReplayItem,
  tt: (value: string) => string,
  gameName: (value: string) => string,
): string {
  const teams = normalizeTeams(item.game)
  if (teams.length === 0) return tt('Player roster unavailable')
  return teams
    .map((team) =>
      team
        .map((player) => `${player.name} · ${gameName(player.civilization)}`)
        .join(' + '),
    )
    .join('  vs  ')
}

function Pager({
  page,
  hasNext,
  totalCount,
  pageSize,
  onPage,
}: {
  page: number
  hasNext: boolean
  totalCount: number
  pageSize: number
  onPage: (page: number) => void
}) {
  const { tt } = useI18n()
  const first = totalCount === 0 ? 0 : (page - 1) * pageSize + 1
  const last = Math.min(totalCount, page * pageSize)
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3 text-xs text-muted-foreground">
      <span>
        {first}–{last} of {formatCount(totalCount)}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-2 transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> {tt('Previous')}
        </button>
        <span className="px-2 tabular-nums">
          {tt('Page')} {page}
        </span>
        <button
          type="button"
          disabled={!hasNext}
          onClick={() => onPage(page + 1)}
          className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-2 transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
        >
          {tt('Next')} <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

export function ReplayLab({ embedded = false }: { embedded?: boolean } = {}) {
  const { tt } = useI18n()
  const settings = useSettings()
  const steam = useSteamAuthStatus()
  const [source, setSource] = useState<'local' | 'account' | 'valdemar'>('local')
  const [localPage, setLocalPage] = useState(1)
  const [accountPage, setAccountPage] = useState(1)
  const [cacheMessage, setCacheMessage] = useState<string | null>(null)
  const [bulkCacheMode, setBulkCacheMode] = useState<BulkCacheMode | null>(null)
  const [bulkCacheProgress, setBulkCacheProgress] = useState<BulkCacheProgress | null>(null)
  const [fullAnalysis, setFullAnalysis] = useState<AutoAnalysisState | null>(null)
  const [fullAnalysisRunning, setFullAnalysisRunning] = useState(false)
  const [archiveAuditRows, setArchiveAuditRows] = useState<ArchiveAuditRow[]>([])
  const [archiveAuditProgress, setArchiveAuditProgress] = useState<ArchiveAuditProgress | null>(
    null,
  )
  const [archiveAuditRunning, setArchiveAuditRunning] = useState(false)
  const [autoAnalysis, setAutoAnalysis] = useState<AutoAnalysisState | null>(null)
  const [autoAnalysisResults, setAutoAnalysisResults] = useState<
    Record<string, ReplayAnalysisResult>
  >({})
  const autoCacheKey = useRef<string | null>(null)
  const autoSummaryKey = useRef<string | null>(null)
  const autoCacheInFlight = useRef(false)
  const autoAnalysisKey = useRef<string | null>(null)
  const autoAnalysisRun = useRef(0)
  const autoAnalysisTargetsRef = useRef<AutoAnalysisTarget[]>([])
  const fullAnalysisRun = useRef(0)
  const archiveAuditRun = useRef(0)
  const consent = settings.data?.localData.consentGranted ?? false
  const autoCache = true
  const autoSummaryCache = true
  const autoAnalyze = true
  const local = useReplays(localPage, LOCAL_PAGE_SIZE)
  const account = useAccountReplays(accountPage, ACCOUNT_PAGE_SIZE, source === 'account')
  const cacheOne = useCacheReplay()
  const cacheMany = useCacheReplays()
  const cacheSummaries = useCacheSummaries()
  const accountData = account.data ?? null
  const availableIds = (accountData?.items ?? [])
    .filter((item) => item.replayAvailable && item.cacheStatus !== 'cached')
    .map((item) => item.game.game_id)
  const summaryIds = (accountData?.items ?? [])
    .filter((item) => item.summaryAvailable && !item.summaryCached)
    .map((item) => item.game.game_id)
  const autoAnalysisTargets: AutoAnalysisTarget[] =
    source === 'local'
      ? (local.data?.items ?? [])
          .filter((item) => item.hasReplay)
          .map((item) => ({ key: `local:${item.id}`, target: { localId: item.id } }))
      : (steam.data?.connected ? (accountData?.items ?? []) : [])
          .filter((item) => item.cacheStatus === 'cached')
          .map((item) => ({
            key: `account:${item.game.game_id}`,
            target: { gameId: item.game.game_id },
          }))
  autoAnalysisTargetsRef.current = autoAnalysisTargets
  const autoAnalysisTargetKey = `${source}:${source === 'local' ? localPage : accountPage}:${autoAnalysisTargets.map((item) => item.key).join(',')}`

  const cacheAvailable = useCallback(
    async (gameIds: number[]) => {
      if (gameIds.length === 0 || cacheMany.isPending) return
      setCacheMessage(null)
      const result = await cacheMany.mutateAsync(gameIds)
      if (!result.ok) {
        setCacheMessage(result.error.message)
        return
      }
      setCacheMessage(
        `Cached ${result.data.cached} replay${result.data.cached === 1 ? '' : 's'} · ${result.data.alreadyCached} already present · ${result.data.unavailable} unavailable.`,
      )
      await account.refetch()
    },
    [account, cacheMany],
  )

  const cacheAvailableSummaries = useCallback(
    async (gameIds: number[]) => {
      if (gameIds.length === 0 || cacheSummaries.isPending) return
      setCacheMessage(null)
      const result = await cacheSummaries.mutateAsync(gameIds)
      if (!result.ok) {
        setCacheMessage(result.error.message)
        return
      }
      setCacheMessage(
        `Cached ${result.data.cached} summary${result.data.cached === 1 ? '' : 'ies'} · ${result.data.alreadyCached} already present · ${result.data.unavailable} unavailable.`,
      )
      await account.refetch()
    },
    [account, cacheSummaries],
  )

  const cacheWholeAccount = useCallback(
    async (mode: BulkCacheMode) => {
      if (bulkCacheMode != null || !steam.data?.connected) return
      setBulkCacheMode(mode)
      setCacheMessage(null)
      try {
        // This is intentionally a main-process bulk read. It uses the complete
        // persisted snapshot and refreshes AoE4World/Relic once, so the action
        // cannot stop at the currently visible 20-row page.
        const archive = await ipc.listAllAccountReplays(true)
        if (!archive.ok) {
          setCacheMessage(archive.error.message)
          return
        }
        const eligibleIds = archive.data.items
          .filter((item) =>
            mode === 'replays'
              ? item.replayAvailable && item.cacheStatus !== 'cached'
              : item.summaryAvailable && !item.summaryCached,
          )
          .map((item) => item.game.game_id)
        setBulkCacheProgress({
          mode,
          scanned: archive.data.totalCount,
          eligible: eligibleIds.length,
          completed: 0,
        })

        const totals = { cached: 0, alreadyCached: 0, unavailable: 0 }
        const chunkSize = 50
        for (let offset = 0; offset < eligibleIds.length; offset += chunkSize) {
          const chunk = eligibleIds.slice(offset, offset + chunkSize)
          const result =
            mode === 'replays'
              ? await cacheMany.mutateAsync(chunk)
              : await cacheSummaries.mutateAsync(chunk)
          if (!result.ok) {
            setCacheMessage(result.error.message)
            return
          }
          totals.cached += result.data.cached
          totals.alreadyCached += result.data.alreadyCached
          totals.unavailable += result.data.unavailable
          setBulkCacheProgress((previous) =>
            previous
              ? { ...previous, completed: Math.min(offset + chunk.length, eligibleIds.length) }
              : previous,
          )
        }

        const label = mode === 'replays' ? 'replays' : 'summaries'
        setCacheMessage(
          `${tt('Full archive scanned')}: ${archive.data.totalCount} · ${label} ${eligibleIds.length} · ` +
            `${tt('cached')} ${totals.cached} · ${tt('already cached')} ${totals.alreadyCached} · ` +
            `${tt('unavailable')} ${totals.unavailable}.`,
        )
        await account.refetch()
      } catch (error) {
        setCacheMessage(error instanceof Error ? error.message : tt('Full archive sync failed.'))
      } finally {
        setBulkCacheMode(null)
      }
    },
    [account, bulkCacheMode, cacheMany, cacheSummaries, steam.data?.connected, tt],
  )

  const analyzeWholeAccount = useCallback(async () => {
    if (fullAnalysisRunning || fullAnalysisRun.current !== 0) return
    const runId = Date.now()
    fullAnalysisRun.current = runId
    setFullAnalysisRunning(true)
    setCacheMessage(null)
    try {
      const archive = await ipc.listAllAccountReplays(false)
      if (!archive.ok) {
        setCacheMessage(archive.error.message)
        return
      }
      const targets = archive.data.items
        .filter((item) => item.cacheStatus === 'cached')
        .map((item) => ({ key: `account:${item.game.game_id}`, gameId: item.game.game_id }))
      setFullAnalysis({ done: 0, total: targets.length, errors: 0 })
      let errors = 0
      for (const [index, target] of targets.entries()) {
        if (fullAnalysisRun.current !== runId) return
        try {
          const result = await ipc.analyzeReplay({ gameId: target.gameId })
          const analysisResult = result.ok ? result.data : null
          if (analysisResult == null) {
            errors += 1
          } else {
            setAutoAnalysisResults((previous) => ({ ...previous, [target.key]: analysisResult }))
          }
        } catch {
          errors += 1
        }
        setFullAnalysis({ done: index + 1, total: targets.length, errors })
      }
      setCacheMessage(
        `${tt('Full archive analysis')}: ${targets.length} · ${tt('errors')} ${errors}.`,
      )
    } catch (error) {
      setCacheMessage(error instanceof Error ? error.message : tt('Full archive analysis failed.'))
    } finally {
      if (fullAnalysisRun.current === runId) {
        fullAnalysisRun.current = 0
        setFullAnalysisRunning(false)
      }
    }
  }, [fullAnalysisRunning, tt])

  const auditWholeAccount = useCallback(async () => {
    if (archiveAuditRunning || archiveAuditRun.current !== 0 || bulkCacheMode != null) return
    const profileId = settings.data?.profileId ?? null
    if (profileId == null) return
    const runId = Date.now()
    archiveAuditRun.current = runId
    setArchiveAuditRunning(true)
    setArchiveAuditRows([])
    setArchiveAuditProgress(null)
    setCacheMessage(null)
    try {
      const archive = await ipc.listAllAccountReplays(false)
      if (!archive.ok) {
        setCacheMessage(archive.error.message)
        return
      }
      const eligible = archive.data.items.filter((item) => item.summaryCached)
      setArchiveAuditProgress({
        done: 0,
        total: archive.data.totalCount,
        eligible: eligible.length,
        unavailable: archive.data.totalCount - eligible.length,
        errors: 0,
      })
      let errors = 0
      let auditedPlayers = 0
      for (const [index, item] of eligible.entries()) {
        if (archiveAuditRun.current !== runId) return
        try {
          const summaryResult = await ipc.getGameSummary(String(item.game.game_id))
          const summary = summaryResult.ok ? summaryResult.data : null
          const roster = normalizeTeams(item.game).flat()
          const accountPlayer = roster.find((player) => player.profile_id === profileId) ?? null
          const summaryPlayer =
            summary?.players.find((player) => player.profileId === profileId) ??
            summary?.players.find((player) =>
              roster.some(
                (rosterPlayer) =>
                  rosterPlayer.name.trim().toLowerCase() ===
                  (player.name ?? '').trim().toLowerCase(),
              ),
            ) ??
            null
          if (!summary || summary.players.length === 0) {
            errors += 1
          } else {
            const myCiv =
              accountPlayer?.civilization ??
              (summaryPlayer ? civFromToken(summaryPlayer.civToken) : null)
            const audits = compareMatchPlayers({
              players: summary.players,
              builds: BUILD_CATALOG.map((entry) => entry.build),
              myCiv,
              myProfileId: profileId,
              myPlayerId: summaryPlayer?.playerId ?? null,
              myName: accountPlayer?.name ?? summaryPlayer?.name,
              map: item.game.map,
              patch: item.game.patch == null ? null : String(item.game.patch),
            })
            if (audits.length === 0) {
              errors += 1
            } else {
              auditedPlayers += audits.length
              setArchiveAuditRows((previous) => [
                ...previous,
                ...audits.map((audit) => {
                  const rosterPlayer = roster.find(
                    (player) =>
                      (audit.player.profileId != null &&
                        player.profile_id === audit.player.profileId) ||
                      player.name.trim().toLowerCase() ===
                        (audit.player.name ?? '').trim().toLowerCase(),
                  )
                  const isMe =
                    (summaryPlayer != null && audit.player.playerId === summaryPlayer.playerId) ||
                    (accountPlayer != null && rosterPlayer?.profile_id === accountPlayer.profile_id)
                  return {
                    gameId: item.game.game_id,
                    startedAt: item.game.started_at,
                    map: item.game.map,
                    playerName: audit.player.name ?? rosterPlayer?.name ?? tt('Unknown'),
                    isMe,
                    civ: rosterPlayer?.civilization ?? audit.civ,
                    result: rosterPlayer?.result ?? null,
                    reference: audit.reference?.name ?? null,
                    score: audit.report?.score ?? null,
                    improvements: audit.improvements.length,
                    strengths: audit.strengths.length,
                    matchedActions: audit.coverage.matchedActions,
                    expectedActions: audit.coverage.expectedActions,
                    confidence: audit.coverage.confidence,
                  }
                }),
              ])
            }
          }
        } catch {
          errors += 1
        }
        setArchiveAuditProgress({
          done: index + 1,
          total: archive.data.totalCount,
          eligible: eligible.length,
          unavailable: archive.data.totalCount - eligible.length,
          errors,
        })
      }
      setCacheMessage(
        `${tt('Full archive audit')}: ${eligible.length} ${tt('summaries')} · ` +
          `${auditedPlayers} ${tt('players')} · ${tt('errors')} ${errors}.`,
      )
    } catch (error) {
      setCacheMessage(error instanceof Error ? error.message : tt('Full archive audit failed.'))
    } finally {
      if (archiveAuditRun.current === runId) {
        archiveAuditRun.current = 0
        setArchiveAuditRunning(false)
      }
    }
  }, [archiveAuditRunning, bulkCacheMode, settings.data?.profileId, tt])

  const refreshEverything = useCallback(async () => {
    if (bulkCacheMode != null || fullAnalysisRunning || archiveAuditRunning) return
    await cacheWholeAccount('replays')
    await cacheWholeAccount('summaries')
    await analyzeWholeAccount()
    await auditWholeAccount()
  }, [
    analyzeWholeAccount,
    archiveAuditRunning,
    auditWholeAccount,
    bulkCacheMode,
    cacheWholeAccount,
    fullAnalysisRunning,
  ])

  useAutoAction(
    'replay-lab-full-archive',
    () => refreshEverything(),
    {
      enabled:
        source === 'account' &&
        Boolean(steam.data?.connected) &&
        Boolean(accountData) &&
        (accountData?.totalCount ?? 0) > 0,
    },
  )

  useEffect(() => {
    if (
      source !== 'account' ||
      !autoCache ||
      !steam.data?.connected ||
      accountData == null ||
      availableIds.length === 0 ||
      cacheMany.isPending
    )
      return
    const key = `${accountData.page}:${availableIds.join(',')}`
    if (autoCacheKey.current === key) return
    autoCacheKey.current = key
    autoCacheInFlight.current = true
    void cacheAvailable(availableIds).finally(() => {
      autoCacheInFlight.current = false
    })
  }, [
    accountData,
    autoCache,
    availableIds,
    cacheAvailable,
    cacheMany.isPending,
    source,
    steam.data?.connected,
  ])

  useEffect(() => {
    if (
      source !== 'account' ||
      !autoSummaryCache ||
      !steam.data?.connected ||
      accountData == null ||
      summaryIds.length === 0 ||
      cacheSummaries.isPending ||
      autoCacheInFlight.current
    )
      return

    // Finish replay downloads before asking Relic for summaries. This keeps the
    // two network batches serialized and makes the pipeline status predictable.
    const replayKey = `${accountData.page}:${availableIds.join(',')}`
    const replayCacheSettled =
      !autoCache || availableIds.length === 0 || autoCacheKey.current === replayKey
    if (!replayCacheSettled) return

    const key = `${accountData.page}:${summaryIds.join(',')}`
    if (autoSummaryKey.current === key) return
    autoSummaryKey.current = key
    void cacheAvailableSummaries(summaryIds)
  }, [
    accountData,
    autoSummaryCache,
    autoCache,
    availableIds,
    cacheAvailableSummaries,
    cacheSummaries.isPending,
    summaryIds,
    source,
    steam.data?.connected,
  ])

  useEffect(() => {
    if (!autoAnalyze) {
      autoAnalysisKey.current = null
      autoAnalysisRun.current += 1
      setAutoAnalysis(null)
      return
    }

    const targets = autoAnalysisTargetsRef.current

    if (targets.length === 0) {
      autoAnalysisKey.current = null
      autoAnalysisRun.current += 1
      setAutoAnalysis(null)
      return
    }
    const key = autoAnalysisTargetKey
    if (autoAnalysisKey.current === key) return
    autoAnalysisKey.current = key

    const runId = ++autoAnalysisRun.current
    setAutoAnalysis({ done: 0, total: targets.length, errors: 0 })
    void (async () => {
      let errors = 0
      for (const [index, item] of targets.entries()) {
        if (autoAnalysisRun.current !== runId) return
        try {
          const result = await ipc.analyzeReplay(item.target)
          const analysisResult = result.ok ? result.data : null
          if (analysisResult == null) {
            errors += 1
          } else {
            setAutoAnalysisResults((previous) => ({ ...previous, [item.key]: analysisResult }))
          }
        } catch {
          errors += 1
        }
        if (autoAnalysisRun.current !== runId) return
        setAutoAnalysis({ done: index + 1, total: targets.length, errors })
      }
    })()

    return () => {
      if (autoAnalysisRun.current === runId) {
        autoAnalysisRun.current += 1
      }
    }
  }, [autoAnalyze, autoAnalysisTargetKey])

  return (
    <div className={embedded ? 'space-y-6' : 'animate-fade-in space-y-6'}>
      <PageHead
        embedded={embedded}
        kicker="Replay intelligence"
        title="Replay Lab"
        sub="Browse every local match-history record, inspect public account history, and cache available online replays for offline review."
      />

      <ScreenTabs
        items={[
          { id: 'local', label: 'Local archive', icon: Database },
          { id: 'account', label: 'Account history', icon: CloudDownload },
          { id: 'valdemar', label: 'Pro Match Reviews', icon: FileVideo },
        ]}
        value={source}
        onChange={setSource}
        ariaLabel={tt('Replay sources')}
        trailing={
          <div className="flex flex-wrap items-center gap-3">
          {autoAnalysis && source !== 'valdemar' && (
            <Badge variant="outline" className="border-primary/40 text-primary">
              {tt('Auto-analysis')} {autoAnalysis.done}/{autoAnalysis.total}
              {autoAnalysis.errors > 0 ? ` · ${autoAnalysis.errors} ${tt('errors')}` : ''}
            </Badge>
          )}
          {fullAnalysisRunning && (
            <Badge variant="outline" className="border-primary/40 text-primary">
              {tt('Updating full archive…')}
            </Badge>
          )}
          </div>
        }
      />

      {source === 'local' ? (
        <LocalArchive
          consent={consent}
          data={local.data}
          isLoading={local.isLoading}
          isError={local.isError}
          profileId={settings.data?.profileId ?? null}
          autoAnalysisResults={autoAnalysisResults}
          onRetry={() => void local.refetch()}
          page={localPage}
          onPage={setLocalPage}
        />
      ) : source === 'account' ? (
        <AccountArchive
          profileId={settings.data?.profileId ?? null}
          steamConnected={steam.data?.connected ?? false}
          data={accountData}
          isLoading={account.isLoading}
          isError={account.isError}
          cacheMessage={cacheMessage}
          cacheOne={cacheOne}
          bulkCacheMode={bulkCacheMode}
          bulkCacheProgress={bulkCacheProgress}
          fullAnalysis={fullAnalysis}
          fullAnalysisRunning={fullAnalysisRunning}
          archiveAuditRows={archiveAuditRows}
          archiveAuditProgress={archiveAuditProgress}
          archiveAuditRunning={archiveAuditRunning}
          onRetry={() => void account.refetch()}
          autoAnalysis={autoAnalysis}
          autoAnalysisResults={autoAnalysisResults}
          page={accountPage}
          onPage={setAccountPage}
        />
      ) : (
        <ValdemarReplayReviewsPanel />
      )}
    </div>
  )
}

function LocalArchive({
  consent,
  data,
  isLoading,
  isError,
  profileId,
  autoAnalysisResults,
  onRetry,
  page,
  onPage,
}: {
  consent: boolean
  data: ReplayArchivePage | undefined
  isLoading: boolean
  isError: boolean
  profileId: number | null
  autoAnalysisResults: Record<string, ReplayAnalysisResult>
  onRetry: () => void
  page: number
  onPage: (page: number) => void
}) {
  const { tt } = useI18n()
  if (!consent) {
    return (
      <Card>
        <CardContent className="space-y-2 p-4 text-sm">
          <div className="flex items-center gap-2 font-medium">
            <FileVideo className="h-4 w-4 text-primary" /> {tt('Local replay access is disabled')}
          </div>
          <p className="text-xs text-muted-foreground">
            {tt(
              'Enable local data access in Settings to index your own matchhistory and `.rec` files. Nothing is read before consent.',
            )}
          </p>
        </CardContent>
      </Card>
    )
  }
  if (isLoading) return <Spinner label={tt('Indexing the complete local archive…')} />
  if (isError) {
    return <ErrorBox message={tt('Could not read the local replay archive.')} onRetry={onRetry} />
  }
  if (!data || data.totalCount === 0) {
    return (
      <EmptyBox>
        <div className="space-y-3">
          <p>{tt('No local replay records found.')}</p>
          <p className="text-xs">{tt('Finish a game or save a replay, then return here.')}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mx-auto inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-3 text-xs transition-colors hover:bg-secondary"
          >
            <RefreshCw className="h-3.5 w-3.5" /> {tt('Refresh')}
          </button>
        </div>
      </EmptyBox>
    )
  }
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {formatCount(data.totalCount)} {tt('local games indexed')}
        </span>
        <span>{tt('Headers only · command streams are never guessed')}</span>
      </div>
      {data.items.map((item) => (
        <LocalReplayRow
          key={item.id}
          item={item}
          profileId={profileId}
          autoResult={autoAnalysisResults[`local:${item.id}`]}
        />
      ))}
      <Pager {...data} page={page} onPage={onPage} />
    </div>
  )
}

function LocalReplayRow({
  item,
  profileId,
  autoResult,
}: {
  item: ReplayArchiveItem
  profileId: number | null
  autoResult?: ReplayAnalysisResult
}) {
  const { tt, gameName } = useI18n()
  const [activeTab, setActiveTab] = useState<'match' | 'replay'>('match')
  const analysis = useReplayAnalysis()
  const map = gameName(item.info?.mapName ?? item.localMatch?.map ?? item.info?.mapId ?? tt('Unknown map'))
  const displayedAnalysis = analysis.data ?? autoResult
  const summaryQuery = useGameSummary(item.matchId ?? undefined, {
    enabled: item.matchId != null && item.hasStatsSummary && activeTab === 'match',
  })
  const summary = summaryQuery.data?.ok ? summaryQuery.data.data : null
  useEffect(() => {
    if (displayedAnalysis) setActiveTab('replay')
  }, [displayedAnalysis])
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {item.matchId ? (
                <Link
                  to={`/game/${item.matchId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate font-medium hover:text-primary hover:underline"
                >
                  {gameName(map)}
                </Link>
              ) : (
                <div className="truncate font-medium">{gameName(map)}</div>
              )}
              <Badge variant="secondary" className="text-[10px]">
                {item.source === 'matchhistory' ? tt('match history') : tt('playback')}
              </Badge>
              {item.hasReplay ? (
                <Badge variant="outline" className="border-win/40 text-[10px] text-win">
                  {tt('replay saved')}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px]">
                  {tt('metadata only')}
                </Badge>
              )}
              {item.hasStatsSummary && (
                <Badge variant="outline" className="border-win/40 text-[10px] text-win">
                  {tt('detailed stats ready')}
                </Badge>
              )}
              {autoResult && (
                <Badge variant="outline" className="border-primary/40 text-[10px] text-primary">
                  {tt('auto-analyzed')}
                </Badge>
              )}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {replayDate(item.recordedAtMs)}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {item.hasReplay && analysis.isPending ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-primary">
                <ScanLine className="h-3.5 w-3.5 animate-pulse" />
                {tt('Analyzing…')}
              </span>
            ) : null}
            {item.matchId && (
              <Link
                to={`/game/${item.matchId}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
              >
                <History className="h-3.5 w-3.5" /> {tt('Review game')}
              </Link>
            )}
          </div>
        </div>
        <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-[auto_auto_1fr] sm:items-center">
          <span className="inline-flex items-center gap-1.5">
            <MapIcon className="h-3.5 w-3.5" />{' '}
            {item.info?.mapId ?? item.localMatch?.map ?? tt('map id unavailable')}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />{' '}
            {item.info?.players.length ?? item.localMatch?.players.length ?? 0} {tt('players')}
          </span>
          <span className="truncate">{rosterLabel(item, tt, gameName)}</span>
        </div>
        <p className="border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
          {item.hasReplay
            ? tt(
                'Replay header parsed locally. Full review uses stats.rgs or a cached Relic summary when available.',
              )
            : tt(
                'The game record exists in matchhistory, but AoE4 did not leave a replay.rec file for it.',
              )}
        </p>
        {analysis.error && !autoResult && (
          <p className="text-xs text-loss">{analysis.error.message}</p>
        )}
        <ReplayViewTabs active={activeTab} onChange={setActiveTab} tt={tt} />
        {activeTab === 'match' ? (
          <LocalMatchOverview
            item={item}
            map={map}
            profileId={profileId}
            summary={summary}
            summaryLoading={summaryQuery.isFetching}
            fallbackDurationSec={displayedAnalysis?.commandStream.durationSec ?? null}
          />
        ) : displayedAnalysis ? (
          <ReplayAnalysisPanel
            result={displayedAnalysis}
            target={{ localId: item.id }}
            knownPlayers={summary?.players}
            open
            onToggle={() => setActiveTab('match')}
          />
        ) : (
          <p className="border-t border-border/60 pt-3 text-xs text-muted-foreground">
            {tt('Run replay analysis to open the command stream.')}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function ReplayViewTabs({
  active,
  onChange,
  tt,
}: {
  active: 'match' | 'replay'
  onChange: (value: 'match' | 'replay') => void
  tt: (value: string) => string
}) {
  return (
    <div className="border-t border-border/60 pt-2">
      <ScreenTabs
        items={[
          { id: 'match', label: 'Match', icon: History },
          { id: 'replay', label: 'Replay analysis', icon: Activity },
        ]}
        value={active}
        onChange={onChange}
        ariaLabel={tt('Replay view')}
        size="sm"
      />
    </div>
  )
}

function LocalMatchOverview({
  item,
  map,
  profileId,
  summary,
  summaryLoading,
  fallbackDurationSec,
}: {
  item: ReplayArchiveItem
  map: string
  profileId: number | null
  summary: MatchSummary | null
  summaryLoading: boolean
  fallbackDurationSec: number | null
}) {
  const { tt, gameName } = useI18n()
  const players = item.info?.players ?? []
  const localPlayers = item.localMatch?.players ?? []
  const duration = summary?.gameLengthSec ?? fallbackDurationSec
  return (
    <div className="space-y-3 border-t border-border/60 pt-3">
      <div className="grid gap-2 sm:grid-cols-4">
        <Metric label={tt('Map')} value={gameName(map)} />
        <Metric
          label={tt('Duration')}
          value={duration == null ? tt('not available') : formatDuration(duration)}
        />
        <Metric
          label={tt('Players')}
          value={String(Math.max(players.length, localPlayers.length))}
        />
        <Metric
          label={tt('Source')}
          value={item.source === 'matchhistory' ? tt('match history') : tt('playback')}
        />
      </div>
      {players.length > 0 ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {players.map((player, index) => (
            <div
              key={`${player.name}-${index}`}
              className="rounded-md border border-border/60 bg-secondary/20 px-3 py-2"
            >
              <div className="font-medium">
                {player.name || tt('Unknown')}
                {player.ai && <span className="ml-1 text-[10px] text-muted-foreground">AI</span>}
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {player.civName || tt('Unknown civilization')}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">{tt('Player roster unavailable')}</p>
      )}
      {item.matchId ? (
        <Link
          to={`/game/${item.matchId}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
        >
          <History className="h-3.5 w-3.5" /> {tt('Open full match review')}
        </Link>
      ) : (
        <p className="text-[11px] text-muted-foreground">
          {tt(
            'This playback has no synchronized match-history id. The tab still shows every fact available from the replay header and local summary.',
          )}
        </p>
      )}
      {summaryLoading && <Spinner label={tt('Loading summary…')} />}
      {summary && (
        <GameSummaryPanel
          summary={summary}
          myCiv={item.info?.players.find((player) => !player.ai)?.civSlug ?? null}
          myProfileId={profileId}
        />
      )}
    </div>
  )
}

function AccountMatchOverview({
  item,
  profileId,
}: {
  item: AccountReplayItem
  profileId: number | null
}) {
  const { tt, gameName } = useI18n()
  const teams = normalizeTeams(item.game)
  const me = teams.flat().find((player) => player.profile_id === profileId)
  return (
    <div className="space-y-3 border-t border-border/60 pt-3">
      <div className="grid gap-2 sm:grid-cols-5">
        <Metric label={tt('Map')} value={item.game.map ? gameName(item.game.map) : tt('Unknown map')} />
        <Metric label={tt('Mode')} value={item.game.leaderboard || item.game.kind || '—'} />
        <Metric
          label={tt('Duration')}
          value={
            item.game.duration == null ? tt('not available') : formatDuration(item.game.duration)
          }
        />
        <Metric label={tt('Average rating')} value={String(item.game.average_rating ?? '—')} />
        <Metric
          label={tt('Result')}
          value={
            me?.result === 'win' ? tt('Win') : me?.result === 'loss' ? tt('Loss') : tt('unknown')
          }
        />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {teams.map((team, index) => (
          <div key={index} className="rounded-md border border-border/60 bg-secondary/20 px-3 py-2">
            <div className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
              {tt('Team')} {index + 1}
            </div>
            <div className="space-y-1">
              {team.map((player) => (
                <div
                  key={player.profile_id}
                  className="flex items-center justify-between gap-2 text-xs"
                >
                  <span
                    className={player.profile_id === profileId ? 'font-semibold text-primary' : ''}
                  >
                    {player.name}
                  </span>
                  <span className="text-muted-foreground">
                    {gameName(player.civilization)} ·{' '}
                    {player.result === 'win'
                      ? tt('Win')
                      : player.result === 'loss'
                        ? tt('Loss')
                        : '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <Link
        to={`/public-game/${profileId ?? teams.flat()[0]?.profile_id ?? 0}/${item.game.game_id}`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
      >
        <History className="h-3.5 w-3.5" /> {tt('Open full match review')}
      </Link>
    </div>
  )
}

function AccountArchive({
  profileId,
  steamConnected,
  data,
  isLoading,
  isError,
  cacheMessage,
  cacheOne,
  bulkCacheMode,
  bulkCacheProgress,
  fullAnalysis,
  fullAnalysisRunning,
  archiveAuditRows,
  archiveAuditProgress,
  archiveAuditRunning,
  autoAnalysis,
  autoAnalysisResults,
  onRetry,
  page,
  onPage,
}: {
  profileId: number | null
  steamConnected: boolean
  data: AccountReplayPage | null | undefined
  isLoading: boolean
  isError: boolean
  cacheMessage: string | null
  cacheOne: ReturnType<typeof useCacheReplay>
  bulkCacheMode: BulkCacheMode | null
  bulkCacheProgress: BulkCacheProgress | null
  fullAnalysis: AutoAnalysisState | null
  fullAnalysisRunning: boolean
  archiveAuditRows: ArchiveAuditRow[]
  archiveAuditProgress: ArchiveAuditProgress | null
  archiveAuditRunning: boolean
  autoAnalysis: AutoAnalysisState | null
  autoAnalysisResults: Record<string, ReplayAnalysisResult>
  onRetry: () => void
  page: number
  onPage: (page: number) => void
}) {
  const { tt } = useI18n()
  if (profileId == null) {
    return <EmptyBox>{tt('Select an AoE4World account first.')}</EmptyBox>
  }
  if (isLoading) return <Spinner label={tt('Loading account history and replay availability…')} />
  if (isError || !data) {
    return (
      <ErrorBox
        message={tt('Could not load account history from AoE4World/Relic.')}
        onRetry={onRetry}
      />
    )
  }
  const refreshAllRunning = bulkCacheMode != null || fullAnalysisRunning || archiveAuditRunning
  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="rts-section-title">{tt('Account replay archive')}</div>
              <p className="mt-1 text-xs text-muted-foreground">
                {tt(
                  'AoE4World supplies the paginated account history; Relic adds recent matches, ranks and replay/summary upload slots.',
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={steamConnected ? 'border-win/40 text-win' : ''}>
                Steam {steamConnected ? tt('connected') : tt('not connected')}
              </Badge>
              {refreshAllRunning ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-primary">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  {tt('Updating full archive…')}
                </span>
              ) : null}
            </div>
          </div>
          {!steamConnected && (
            <p className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-200">
              {tt(
                'Connect Steam in Settings to obtain signed Relic URLs. History metadata remains available without it.',
              )}
            </p>
          )}
          {cacheMessage && <p className="text-xs text-primary">{cacheMessage}</p>}
          {bulkCacheProgress && (
            <p className="text-[11px] text-muted-foreground">
              {tt('Full archive scan')}: {formatCount(bulkCacheProgress.scanned)} ·{' '}
              {bulkCacheProgress.mode === 'replays' ? tt('replays') : tt('summaries')}{' '}
              {formatCount(bulkCacheProgress.completed)}/{formatCount(bulkCacheProgress.eligible)}
            </p>
          )}
          {fullAnalysis && (
            <p className="text-[11px] text-muted-foreground">
              {tt('Full archive analysis')}: {formatCount(fullAnalysis.done)}/
              {formatCount(fullAnalysis.total)}
              {fullAnalysis.errors > 0 ? ` · ${fullAnalysis.errors} ${tt('errors')}` : ''}
            </p>
          )}
          {archiveAuditProgress && (
            <p className="text-[11px] text-muted-foreground">
              {tt('Full archive audit')}: {formatCount(archiveAuditProgress.done)}/
              {formatCount(archiveAuditProgress.eligible)} · {tt('not cached')}{' '}
              {formatCount(archiveAuditProgress.unavailable)}
              {archiveAuditProgress.errors > 0
                ? ` · ${archiveAuditProgress.errors} ${tt('errors')}`
                : ''}
            </p>
          )}
          {autoAnalysis && (
            <p className="text-xs text-primary">
              {tt('Automatic replay analysis')}: {autoAnalysis.done}/{autoAnalysis.total}
              {autoAnalysis.errors > 0 ? ` · ${autoAnalysis.errors} ${tt('errors')}` : ''}
              {autoAnalysis.done < autoAnalysis.total
                ? ` · ${tt('summaries are cached automatically when available')}`
                : ` · ${tt('saved locally and reused after restart')}`}
            </p>
          )}
          <p className="text-[11px] text-muted-foreground">
            {formatCount(data.totalCount)} total · AoE4World {formatCount(data.aoe4WorldCount)} ·
            Relic {formatCount(data.relicCount)} · Relic-only {formatCount(data.relicOnlyCount)}
          </p>
        </CardContent>
      </Card>
      {archiveAuditRows.length > 0 && <ArchiveAuditCard rows={archiveAuditRows} />}
      {data.items.length === 0 ? (
        <EmptyBox>{tt('No account games returned for this page.')}</EmptyBox>
      ) : (
        data.items.map((item) => (
          <AccountReplayRow
            key={item.game.game_id}
            item={item}
            profileId={profileId}
            cacheOne={cacheOne}
            autoResult={autoAnalysisResults[`account:${item.game.game_id}`]}
          />
        ))
      )}
      <Pager {...data} page={page} onPage={onPage} />
    </div>
  )
}

function ArchiveAuditCard({ rows }: { rows: ArchiveAuditRow[] }) {
  const { tt, gameName } = useI18n()
  const gameCount = new Set(rows.map((row) => row.gameId)).size
  const scoredRows = rows.filter((row) => row.score != null)
  const averageScore =
    scoredRows.length === 0
      ? null
      : Math.round(
          scoredRows.reduce((total, row) => total + (row.score ?? 0), 0) / scoredRows.length,
        )
  const playersWithIssues = rows.filter((row) => row.improvements > 0).length
  const matchedActions = rows.reduce((total, row) => total + row.matchedActions, 0)
  const expectedActions = rows.reduce((total, row) => total + row.expectedActions, 0)
  const references = rows.filter((row) => row.reference != null).length

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <div className="rts-section-title">{tt('Build-order audit history')}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              {tt(
                'Every cached account summary is compared against the normalized build catalogue.',
              )}
            </p>
          </div>
          <Badge variant="outline">
            {formatCount(gameCount)} {tt('games')} · {formatCount(rows.length)} {tt('players')}
          </Badge>
        </div>
        <div className="grid gap-2 sm:grid-cols-4">
          <Metric
            label={tt('Average audit score')}
            value={averageScore == null ? '—' : `${averageScore}%`}
          />
          <Metric label={tt('Players with issues')} value={formatCount(playersWithIssues)} />
          <Metric
            label={tt('Evidence matched')}
            value={`${formatCount(matchedActions)}/${formatCount(expectedActions)}`}
          />
          <Metric label={tt('Reference builds')} value={formatCount(references)} />
        </div>
        <div className="overflow-x-auto rounded-md border border-border/60">
          <table className="w-full min-w-[900px] text-left text-xs">
            <thead className="bg-secondary/30 text-[10px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">{tt('Date')}</th>
                <th className="px-3 py-2 font-medium">{tt('Map')}</th>
                <th className="px-3 py-2 font-medium">{tt('Player')}</th>
                <th className="px-3 py-2 font-medium">{tt('Reference build')}</th>
                <th className="px-3 py-2 font-medium">{tt('Score')}</th>
                <th className="px-3 py-2 font-medium">{tt('Issues')}</th>
                <th className="px-3 py-2 font-medium">{tt('Evidence')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {rows.map((row) => (
                <tr key={row.gameId} className="hover:bg-secondary/20">
                  <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                    {new Date(row.startedAt).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2">
                    <div>{row.map ? gameName(row.map) : tt('Unknown map')}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {row.civ == null
                        ? tt('Unknown civilization')
                        : gameName(civDisplayName(row.civ))}
                      {row.result ? ` · ${row.result === 'win' ? tt('Win') : tt('Loss')}` : ''}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className={row.isMe ? 'font-semibold text-primary' : 'font-medium'}>
                      {row.playerName}
                      {row.isMe ? ` · ${tt('You')}` : ''}
                    </div>
                  </td>
                  <td className="max-w-[240px] px-3 py-2">
                    <div className="truncate" title={row.reference ?? undefined}>
                      {row.reference ?? tt('No compatible build')}
                    </div>
                    <Badge variant="outline" className="mt-1 text-[10px]">
                      {tt(row.confidence)}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 font-medium tabular-nums">
                    {row.score == null ? '—' : `${Math.round(row.score)}%`}
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    <span className={row.improvements > 0 ? 'text-amber-300' : 'text-win'}>
                      {formatCount(row.improvements)}
                    </span>
                    <span className="text-muted-foreground"> · {formatCount(row.strengths)} ✓</span>
                  </td>
                  <td className="px-3 py-2 tabular-nums text-muted-foreground">
                    {formatCount(row.matchedActions)}/{formatCount(row.expectedActions)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

function AccountReplayRow({
  item,
  profileId,
  cacheOne,
  autoResult,
}: {
  item: AccountReplayItem
  profileId: number | null
  cacheOne: ReturnType<typeof useCacheReplay>
  autoResult?: ReplayAnalysisResult
}) {
  const { tt, gameName } = useI18n()
  const [activeTab, setActiveTab] = useState<'match' | 'replay'>('match')
  const [showAnalysis, setShowAnalysis] = useState(true)
  const [showSummary, setShowSummary] = useState(true)
  const [fullResult, setFullResult] = useState<FullReplayAnalysis | null>(null)
  const analysis = useReplayAnalysis()
  const fullAnalysis = useDownloadAndAnalyzeReplay()
  const videoAnalyses = useVideoAnalyses()
  const game = item.game
  const matchRoute =
    item.historySource === 'relic'
      ? `/public-game/${profileId ?? normalizeTeams(game).flat()[0]?.profile_id ?? 0}/${game.game_id}`
      : `/game/${game.game_id}`
  const summaryQuery = useGameSummary(String(game.game_id), { enabled: true })
  const summary = summaryQuery.data?.ok ? summaryQuery.data.data : null
  const summaryError =
    summaryQuery.data && !summaryQuery.data.ok ? summaryQuery.data.error.message : null
  const displayedAnalysis = fullResult?.replay ?? analysis.data ?? autoResult
  const displayedSummary = fullResult?.summary ?? summary
  const myPlayer = normalizeTeams(game)
    .flat()
    .find((player) => profileId != null && player.profile_id === profileId)
  const twitchVodInput: TwitchVodFinderInput = {
    gameId: String(game.game_id),
    profileId,
    civilization: myPlayer?.civilization ?? 'english',
    opponentCivilization:
      normalizeTeams(game)
        .flat()
        .find((player) => player.profile_id !== myPlayer?.profile_id)?.civilization ?? null,
    map: game.map,
    durationSec: game.duration,
  }
  const twitchVodLookup = useTwitchVod(twitchVodInput, myPlayer != null)
  const verifiedVod = twitchVodLookup.data?.ok ? twitchVodLookup.data.data.vod : null
  const linkedVideoAnalysis = videoAnalyses.data?.ok
    ? videoAnalyses.data.data.find((record) => record.gameId === String(game.game_id))
    : undefined
  const statusLabel =
    item.cacheStatus === 'cached'
      ? tt('cached locally')
      : item.cacheStatus === 'available'
        ? tt('replay available')
        : item.cacheStatus === 'not_checked'
          ? tt('Relic not checked')
          : tt('no replay upload')
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                to={matchRoute}
                target="_blank"
                rel="noreferrer"
                className="font-medium hover:text-primary hover:underline"
              >
                {game.map ? gameName(game.map) : tt('Unknown map')}
              </Link>
              <Badge variant="secondary" className="text-[10px]">
                {game.leaderboard || game.kind || tt('match')}
              </Badge>
              {item.historySource === 'relic' && (
                <Badge variant="outline" className="text-[10px]">
                  {tt('Relic-only')}
                </Badge>
              )}
              <Badge
                variant="outline"
                className={item.cacheStatus === 'cached' ? 'border-win/40 text-win' : ''}
              >
                {statusLabel}
              </Badge>
              {autoResult && (
                <Badge variant="outline" className="border-primary/40 text-[10px] text-primary">
                  {tt('auto-analyzed')}
                </Badge>
              )}
              {item.summaryAvailable && (
                <Badge variant="outline" className="text-[10px]">
                  {tt('summary')}
                </Badge>
              )}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {new Date(game.started_at).toLocaleString()} ·{' '}
              {game.duration == null ? tt('duration unknown') : formatDuration(game.duration)}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {(fullAnalysis.isPending || analysis.isPending || cacheOne.isPending) && (
              <span className="inline-flex items-center gap-1.5 text-xs text-primary">
                <ScanLine className="h-3.5 w-3.5 animate-pulse" />
                {fullAnalysis.isPending
                  ? tt('Downloading and analyzing…')
                  : cacheOne.isPending
                    ? tt('Caching…')
                    : tt('Analyzing…')}
              </span>
            )}
            {item.historySource === 'relic' ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <History className="h-3.5 w-3.5" /> {tt('Relic record')}
              </span>
            ) : (
              <Link
                to={`/game/${game.game_id}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
              >
                <History className="h-3.5 w-3.5" /> {tt('Review')}
              </Link>
            )}
          </div>
        </div>
        <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-[auto_1fr] sm:items-center">
          <span className="inline-flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" /> {normalizeTeams(game).flat().length} {tt('players')}
          </span>
          <span className="truncate">{accountRoster(item, tt, gameName)}</span>
        </div>
        <p className="border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
          {tt(
            'Game metadata is public. Full replay downloads require a signed Relic session and are stored in the local replay cache.',
          )}
          {item.cacheSizeBytes != null
            ? ` ${tt('Cached size')}: ${(item.cacheSizeBytes / 1024 / 1024).toFixed(1)} MB.`
            : ''}
        </p>
        {fullAnalysis.error && <p className="text-xs text-loss">{fullAnalysis.error.message}</p>}
        {analysis.error && !autoResult && !fullResult && (
          <p className="text-xs text-loss">{analysis.error.message}</p>
        )}
        {fullResult && (
          <p className="border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
            {tt('Full replay analysis')}: {fullResult.download.status} · {tt('Replay stream')}{' '}
            {fullResult.coverage.replay} · {tt('Summary')}{' '}
            {fullResult.coverage.summary ? tt('available') : tt('unavailable')}
          </p>
        )}
        <ReplayViewTabs active={activeTab} onChange={setActiveTab} tt={tt} />
        {activeTab === 'match' && <AccountMatchOverview item={item} profileId={profileId} />}
        {activeTab === 'replay' && displayedAnalysis && (
          <ReplayAnalysisPanel
            result={displayedAnalysis}
            target={{ gameId: game.game_id }}
            knownPlayers={displayedSummary?.players}
            open={showAnalysis}
            onToggle={() => {
              setShowAnalysis((value) => !value)
              setActiveTab('match')
            }}
          />
        )}
        {activeTab === 'replay' && !displayedAnalysis && (
          <p className="border-t border-border/60 pt-3 text-xs text-muted-foreground">
            {tt('Run replay analysis to open the command stream.')}
          </p>
        )}
        {activeTab === 'match' &&
          (item.summaryAvailable || displayedSummary != null) &&
          showSummary && (
            <div className="border-t border-border/60 pt-3">
              {summaryQuery.isFetching && <Spinner label={tt('Loading summary…')} />}
              {summaryError && <p className="text-xs text-loss">{summaryError}</p>}
              {!summaryQuery.isFetching && !summaryError && !displayedSummary && (
                <p className="text-xs text-muted-foreground">
                  {tt('Relic summary is not available for this match yet.')}
                </p>
              )}
              {displayedSummary && (
                <div className="space-y-4">
                  <TwitchVodCard input={myPlayer ? twitchVodInput : null} />
                  <BuildOrderComparisonCard
                    summary={displayedSummary}
                    myCiv={myPlayer?.civilization ?? null}
                    myProfileId={profileId}
                    myName={myPlayer?.name ?? null}
                    map={game.map}
                    format={game.kind}
                    patch={game.patch == null ? null : String(game.patch)}
                    linkedVideoAnalysis={linkedVideoAnalysis}
                    verifiedVod={verifiedVod}
                  />
                  <GameSummaryPanel
                    summary={displayedSummary}
                    myCiv={myPlayer?.civilization ?? null}
                    myProfileId={profileId}
                  />
                </div>
              )}
            </div>
          )}
      </CardContent>
    </Card>
  )
}

export function ReplayAnalysisPanel({
  result,
  target,
  open,
  onToggle,
  knownPlayers,
}: {
  result: ReplayAnalysisResult
  target: ReplayAnalysisTarget
  open: boolean
  onToggle: () => void
  /** Player rows decoded from the Relic summary, when it is available. */
  knownPlayers?: MatchSummary['players']
}) {
  const { tt, gameName } = useI18n()
  const stream = result.commandStream
  const [eventLimit, setEventLimit] = useState(24)
  const [playerFilter, setPlayerFilter] = useState<number | null>(null)
  const [actionOffset, setActionOffset] = useState(0)
  const [showTechnicalJournal, setShowTechnicalJournal] = useState(false)
  const actionPage = useReplayActions(
    target,
    actionOffset,
    100,
    playerFilter,
    open && showTechnicalJournal && result.actionLog != null,
  )
  const coverageLabel =
    stream.coverage === 'full'
      ? tt('full command stream')
      : stream.coverage === 'partial'
        ? tt('partial command stream')
        : stream.coverage === 'header-only'
          ? tt('header only')
          : tt('unavailable')
  const filteredEvents =
    playerFilter == null
      ? stream.events
      : stream.events.filter((event) => event.playerId === playerFilter)
  // Periodic/meta records are synchronization data, not player decisions. They
  // used to make the first screen look like an endless 0:00 technical log.
  const playerActions = filteredEvents.filter(isMeaningfulReplayAction)
  const hiddenServiceRecords = filteredEvents.length - playerActions.length
  const visibleEvents = playerActions.slice(0, eventLimit)
  const knownCommands = stream.players.reduce(
    (total, player) => total + player.knownCommandCount,
    0,
  )
  const playerCommands = stream.players.reduce((total, player) => total + player.commandCount, 0)
  const decodedPercent =
    playerCommands > 0 ? Math.round((knownCommands / playerCommands) * 100) : null
  const playerNames = replayPlayerLabels(result, knownPlayers, gameName)
  return (
    <div className="border-t border-border/60 pt-3">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between text-left text-xs font-medium"
      >
        <span className="inline-flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5 text-primary" /> {tt('Replay command analysis')}
        </span>
        <span className="text-[11px] text-muted-foreground">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="mt-3 space-y-3 text-xs">
          <div className="rounded-md border border-primary/25 bg-primary/5 p-3 text-xs leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">
              {tt('What this replay evidence shows')}.{' '}
            </span>
            {tt(
              'Only recognized player orders are shown below. Synchronization records and unknown payloads are hidden from the coaching view, but remain available in the technical journal. Use the match summary for economy, combat and unit-loss conclusions.',
            )}
          </div>
          <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-6">
            <Metric label={tt('Coverage')} value={coverageLabel} />
            <Metric
              label={tt('Duration')}
              value={stream.durationSec == null ? '—' : formatDuration(stream.durationSec)}
            />
            <Metric
              label={tt('Recognized player actions')}
              value={`${playerActions.length}${stream.eventsTruncated ? '+' : ''}`}
            />
            <Metric
              label={tt('Production orders')}
              value={String(totalCommandType(stream, 'queue-unit'))}
            />
            <Metric
              label={tt('Schema recognized')}
              value={decodedPercent == null ? '—' : `${decodedPercent}%`}
            />
            <Metric label={tt('Hidden service records')} value={String(hiddenServiceRecords)} />
          </div>
          {stream.setup && stream.setup.players.length > 0 && (
            <div className="rounded-md border border-border/60 bg-secondary/10 p-2">
              <div className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                {tt('Replay setup')}
              </div>
              <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
                {stream.setup.players.map((player) => (
                  <div
                    key={`${player.playerId}-${player.hostComputerId}`}
                    className="rounded border border-border/50 px-2 py-1.5"
                  >
                    <div className="font-medium">
                      {player.name || `P${player.playerId}`}{' '}
                      <span className="text-muted-foreground">
                        · {gameName(civFromToken(player.civToken) ?? player.civToken)}
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {tt('Team')} {player.team} · P{player.playerId} · host {player.hostComputerId}
                      {player.steamId ? ` · ${player.steamId}` : ''}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {stream.chat.length > 0 && (
            <div className="rounded-md border border-border/60 bg-secondary/10 p-2">
              <div className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                {tt('Replay chat')} · {stream.chat.length}
              </div>
              <div className="max-h-32 space-y-1 overflow-auto text-[11px]">
                {stream.chat.map((message, index) => (
                  <div key={`${message.rawHex.slice(0, 12)}-${index}`}>
                    <span className="tabular-nums text-muted-foreground">
                      {message.timeSec == null ? '—' : formatDuration(message.timeSec)}
                    </span>{' '}
                    <span className="font-medium">
                      {message.playerName ?? `P${message.playerId ?? '?'}`}
                    </span>
                    : {message.message ?? tt('system message')}
                  </div>
                ))}
              </div>
            </div>
          )}
          {stream.chunks.length > 0 && (
            <div className="text-[11px] text-muted-foreground">
              {tt('Replay data chunks')}:{' '}
              {stream.chunks.map((chunk) => `${chunk.kind}:${chunk.id}`).join(' · ')}
            </div>
          )}
          {stream.players.length > 0 && (
            <>
              <div className="grid gap-2 lg:grid-cols-2">
                {stream.players.map((player) => (
                  <ReplayPlayerRead
                    key={player.playerId}
                    player={player}
                    label={playerNames.get(player.playerId) ?? `P${player.playerId}`}
                  />
                ))}
              </div>
              <div className="overflow-x-auto rounded-md border border-border/60">
                <table className="w-full min-w-[900px] text-left text-[11px]">
                  <thead className="bg-secondary/40 text-muted-foreground">
                    <tr>
                      <th className="px-2 py-1.5">{tt('Player')}</th>
                      <th className="px-2 py-1.5">{tt('Observed actions')}</th>
                      <th className="px-2 py-1.5">{tt('APM')}</th>
                      <th className="px-2 py-1.5">{tt('Input gaps')}</th>
                      <th className="px-2 py-1.5">{tt('Longest gap')}</th>
                      <th className="px-2 py-1.5">{tt('Schema confidence')}</th>
                      <th className="px-2 py-1.5">{tt('Main actions')}</th>
                      <th className="px-2 py-1.5">{tt('Activity trend')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stream.players.map((player) => (
                      <tr key={player.playerId} className="border-t border-border/50">
                        <td className="px-2 py-1.5 font-medium">
                          {playerNames.get(player.playerId) ?? `P${player.playerId}`}
                        </td>
                        <td className="px-2 py-1.5 tabular-nums">{player.commandCount}</td>
                        <td className="px-2 py-1.5 tabular-nums">{player.apm.toFixed(1)}</td>
                        <td className="px-2 py-1.5 tabular-nums">
                          {formatDuration(player.commandGapSec)}
                        </td>
                        <td className="px-2 py-1.5 tabular-nums">
                          {formatDuration(player.maxCommandGapSec)}
                        </td>
                        <td className="px-2 py-1.5 tabular-nums">
                          {player.knownCommandPct == null
                            ? '—'
                            : `${player.knownCommandPct.toFixed(1)}%`}
                          <span className="ml-1 text-muted-foreground">
                            ({player.knownCommandCount}/{player.commandCount})
                          </span>
                        </td>
                        <td className="max-w-[300px] truncate px-2 py-1.5 text-muted-foreground">
                          {commandMixLabel(player.commandTypes, tt)}
                        </td>
                        <td className="px-2 py-1.5 tabular-nums">
                          {activityTrendLabel(
                            player.activityDropPct,
                            player.activityWindows.length,
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <ListChecks className="h-3.5 w-3.5" />
            {tt('Production orders are queue commands, not completed units')}:{' '}
            {totalCommandType(stream, 'queue-unit')}
          </div>
          {stream.players.length > 0 && (
            <label className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
              <span>{tt('Show actions for')}</span>
              <select
                value={playerFilter == null ? 'all' : String(playerFilter)}
                onChange={(event) => {
                  setEventLimit(24)
                  setActionOffset(0)
                  setPlayerFilter(event.target.value === 'all' ? null : Number(event.target.value))
                }}
                className="h-7 rounded-md border border-border bg-background px-2 text-foreground"
              >
                <option value="all">{tt('All players')}</option>
                {stream.players.map((player) => (
                  <option key={player.playerId} value={player.playerId}>
                    {playerNames.get(player.playerId) ?? `P${player.playerId}`}
                  </option>
                ))}
              </select>
              <span>
                {playerActions.length} {tt('recognized actions in view')}
              </span>
            </label>
          )}
          {visibleEvents.length > 0 && (
            <>
              <div className="overflow-hidden rounded-md border border-border/60">
                <div className="border-b border-border/60 bg-secondary/30 px-2 py-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                  {tt('Action timeline')} · {tt('only decisions recognized by the replay schema')}
                </div>
                <div className="max-h-64 overflow-auto">
                  {visibleEvents.map((event, index) => (
                    <div
                      key={`${event.offset}-${index}`}
                      className="grid grid-cols-[52px_1fr_auto] gap-2 border-b border-border/40 px-2 py-2 last:border-b-0"
                    >
                      <span className="tabular-nums text-muted-foreground">
                        {formatDuration(event.timeSec)}
                      </span>
                      <span className="min-w-0">
                        <span className="font-medium">
                          {tt(replayActionLabel(event.commandName))}
                        </span>
                        <span className="ml-1 text-muted-foreground">
                          {replayActionDetail(event, tt)}
                        </span>
                      </span>
                      <span className="truncate text-muted-foreground">
                        {playerNames.get(event.playerId) ?? `P${event.playerId}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              {eventLimit < playerActions.length ? (
                <button
                  type="button"
                  onClick={() =>
                    setEventLimit((value) => Math.min(playerActions.length, value + 24))
                  }
                  className="text-xs text-primary hover:underline"
                >
                  {tt('Show more actions')} ({playerActions.length - eventLimit})
                </button>
              ) : null}
            </>
          )}
          {visibleEvents.length === 0 && (
            <p className="rounded-md border border-border/60 bg-secondary/10 p-3 text-muted-foreground">
              {tt(
                'No player decision was identified by the current replay schema in this selection. This does not mean that the player was inactive.',
              )}
            </p>
          )}
          <div className="rounded-md border border-border/60 bg-secondary/10 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-medium">{tt('Technical journal and parser notes')}</div>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  {tt(
                    'Open this only to inspect raw decoded records or parser limitations. It is not used as coaching evidence.',
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowTechnicalJournal((value) => !value)}
                className="rounded border border-border/70 px-2 py-1 text-[11px] text-primary hover:bg-primary/10"
              >
                {tt(showTechnicalJournal ? 'Hide technical journal' : 'Open technical journal')}
              </button>
            </div>
            {showTechnicalJournal && (
              <TechnicalJournal
                actionPage={actionPage}
                actionOffset={actionOffset}
                onPrevious={() => setActionOffset((value) => Math.max(0, value - 100))}
                onNext={() => setActionOffset((value) => value + 100)}
                dataGaps={stream.dataGaps}
              />
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {tt(
              'Input gaps estimate periods without decoded player orders; they are not direct villager-idle measurements. Failed actions, worker allocation and scouting are not explicit replay events, so they are not presented as confirmed mistakes.',
            )}
          </p>
        </div>
      )}
    </div>
  )
}

type ReplayEvent = ReplayAnalysisResult['commandStream']['events'][number]
type ReplayPlayer = ReplayAnalysisResult['commandStream']['players'][number]
type ReplaySetupPlayer = NonNullable<
  ReplayAnalysisResult['commandStream']['setup']
>['players'][number]

function isMeaningfulReplayAction(event: ReplayEvent): boolean {
  return (
    event.playerId > 0 &&
    event.actionCategory !== 'meta' &&
    event.actionCategory !== 'unknown' &&
    !event.commandName.startsWith('unknown-') &&
    !event.commandName.startsWith('periodic-')
  )
}

function replayPlayerLabel(
  player: ReplaySetupPlayer,
  gameName: (value: string) => string,
): string {
  const name = player.name.trim() || `P${player.playerId}`
  const civSlug = civFromToken(player.civToken) ?? player.civToken
  const civ = civSlug ? gameName(civSlug) : ''
  return civ ? `${name} · ${civ}` : name
}

/**
 * Replay command records carry a technical player id (usually P1000, P1001,
 * ...), while the human-readable name may live in a different replay section.
 * Prefer exact ids from the Relic summary/setup; when those sections are not
 * available, AoE4's player slots are stable at 1000 + slot and can be joined
 * to the names parsed from the replay header.
 */
function replayPlayerLabels(
  result: ReplayAnalysisResult,
  knownPlayers: MatchSummary['players'] | undefined,
  gameName: (value: string) => string,
): Map<number, string> {
  const labels = new Map<number, string>()
  for (const player of knownPlayers ?? []) {
    if (player.name?.trim()) {
      labels.set(player.playerId, replaySummaryPlayerLabel(player, gameName))
    }
  }
  for (const player of result.commandStream.setup?.players ?? []) {
    const label = replayPlayerLabel(player, gameName)
    if (!labels.has(player.playerId) || label !== `P${player.playerId}`) {
      labels.set(player.playerId, label)
    }
  }

  const headerPlayers = result.info?.players ?? []
  if (headerPlayers.length > 0) {
    const ids = new Set<number>([
      ...result.commandStream.players.map((player) => player.playerId),
      ...result.commandStream.events.map((event) => event.playerId),
    ])
    for (const playerId of ids) {
      if (labels.has(playerId)) continue
      const slot = playerId - 1000
      const headerPlayer = slot >= 0 && slot < headerPlayers.length ? headerPlayers[slot] : null
      if (headerPlayer?.name.trim()) {
        labels.set(playerId, replayHeaderPlayerLabel(headerPlayer, gameName))
      }
    }
  }
  return labels
}

function replaySummaryPlayerLabel(
  player: MatchSummary['players'][number],
  gameName: (value: string) => string,
): string {
  const name = player.name?.trim() || `P${player.playerId}`
  const civSlug = civFromToken(player.civToken) ?? player.civToken ?? ''
  const civ = civSlug ? gameName(civSlug) : ''
  return civ ? `${name} · ${civ}` : name
}

function replayHeaderPlayerLabel(
  player: NonNullable<ReplayAnalysisResult['info']>['players'][number],
  gameName: (value: string) => string,
): string {
  const civ = player.civName ? gameName(player.civName) : ''
  return civ ? `${player.name.trim()} · ${civ}` : player.name.trim()
}

function replayActionLabel(commandName: string): string {
  const labels: Record<string, string> = {
    'queue-unit': 'Queued unit',
    'queue-villager-or-unknown': 'Queued villager or unit',
    'rally-point': 'Set rally point',
    'return-to-work': 'Returned workers to work',
    research: 'Started technology',
    move: 'Moved selected units',
    cancel: 'Cancelled an order',
    build: 'Placed a building order',
    'attack-move': 'Attack-move order',
    'unit-ability': 'Used unit ability',
    'seek-shelter': 'Sought shelter',
    'gather-or-return-to-resource': 'Gather or return-resource order',
    'unit-stance': 'Changed unit stance',
    patrol: 'Patrol order',
    'build-area-or-placement': 'Placed area/building order',
  }
  return labels[commandName] ?? 'Recognized player action'
}

function replayActionDetail(event: ReplayEvent, tt: (value: string) => string): string {
  const detail: string[] = []
  if (event.queueCount != null) detail.push(`×${event.queueCount}`)
  if (event.selectedUnitCount > 0) detail.push(`${event.selectedUnitCount} ${tt('selected')}`)
  if (event.queued) detail.push(tt('queued'))
  return detail.length > 0 ? `· ${detail.join(' · ')}` : ''
}

function ReplayPlayerRead({ player, label }: { player: ReplayPlayer; label: string }) {
  const { tt } = useI18n()
  const schemaRead =
    player.knownCommandPct == null
      ? tt('The replay did not provide enough command data for a confidence read.')
      : player.knownCommandPct < 60
        ? `${tt('Only')} ${player.knownCommandPct.toFixed(0)}% ${tt('of this player’s decoded commands are understood by the current schema; avoid micro conclusions.')}`
        : `${player.knownCommandPct.toFixed(0)}% ${tt('of decoded commands are recognized; the action timeline is usable as supporting evidence.')}`
  const gapRead =
    player.commandGapCount === 0
      ? tt('No input gap longer than five seconds was observed.')
      : `${player.commandGapCount} ${tt('input gap(s) longer than five seconds')} · ${tt('longest')} ${formatDuration(player.maxCommandGapSec)}. ${tt('This is not proof of idle villagers.')}`
  const activityRead =
    player.activityDropPct != null && player.activityDropPct <= -25
      ? `${tt('Observed command rate fell')} ${Math.abs(player.activityDropPct)}% ${tt('between the first and last five-minute windows.')}`
      : player.activityDropPct != null && player.activityDropPct >= 25
        ? `${tt('Observed command rate rose')} ${player.activityDropPct}% ${tt('between the first and last five-minute windows.')}`
        : tt('No large recorded command-rate change across five-minute windows.')
  return (
    <article className="rounded-md border border-border/60 bg-secondary/10 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="font-medium">{label}</h4>
        <span className="text-[11px] tabular-nums text-muted-foreground">
          {player.apm.toFixed(1)} APM · {player.commandCount} {tt('decoded orders')}
        </span>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{gapRead}</p>
      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{activityRead}</p>
      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{schemaRead}</p>
    </article>
  )
}

function TechnicalJournal({
  actionPage,
  actionOffset,
  onPrevious,
  onNext,
  dataGaps,
}: {
  actionPage: ReturnType<typeof useReplayActions>
  actionOffset: number
  onPrevious: () => void
  onNext: () => void
  dataGaps: ReplayAnalysisResult['commandStream']['dataGaps']
}) {
  const { tt } = useI18n()
  const page = actionPage.data
  return (
    <div className="mt-3 space-y-2 border-t border-border/60 pt-3 text-[11px]">
      {actionPage.isFetching && <Spinner label={tt('Loading technical journal…')} />}
      {actionPage.error && <p className="text-loss">{actionPage.error.message}</p>}
      {page && (
        <>
          <div className="max-h-64 overflow-auto rounded-md border border-border/60 bg-background/40">
            {page.events.map((event, index) => (
              <div
                key={`${event.offset}-${index}`}
                className="grid grid-cols-[52px_1fr_auto] gap-2 border-b border-border/40 px-2 py-1.5 last:border-b-0"
              >
                <span className="tabular-nums text-muted-foreground">
                  {formatDuration(event.timeSec)}
                </span>
                <span>{event.commandName}</span>
                <span className="text-muted-foreground">P{event.playerId}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-muted-foreground">
            <span>
              {tt('Complete action journal')}: {page.offset + 1}–
              {Math.min(page.offset + page.events.length, page.offset + page.total)} / {page.total}
            </span>
            <span className="flex gap-2">
              <button
                type="button"
                disabled={actionOffset === 0 || actionPage.isFetching}
                onClick={onPrevious}
                className="text-primary hover:underline disabled:opacity-40"
              >
                {tt('Previous')}
              </button>
              <button
                type="button"
                disabled={actionOffset + page.events.length >= page.total || actionPage.isFetching}
                onClick={onNext}
                className="text-primary hover:underline disabled:opacity-40"
              >
                {tt('Next')}
              </button>
            </span>
          </div>
        </>
      )}
      {dataGaps.length > 0 && (
        <div className="space-y-1 rounded-md border border-amber-500/30 bg-amber-500/5 p-2 text-amber-200">
          {dataGaps.slice(0, 4).map((gap, index) => (
            <div key={`${gap.code}-${index}`} className="flex gap-1.5">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{gap.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function activityTrendLabel(dropPct: number | null, windowCount: number): string {
  if (dropPct == null || windowCount < 2) return '—'
  const sign = dropPct > 0 ? '+' : ''
  return `${sign}${dropPct}% APM`
}

function commandMixLabel(
  commandTypes: Record<string, number>,
  tt: (value: string) => string,
): string {
  const entries = Object.entries(commandTypes).sort((a, b) => b[1] - a[1])
  return (
    entries
      .slice(0, 3)
      .map(([name, count]) => `${tt(replayActionLabel(name))} ${count}`)
      .join(' · ') || '—'
  )
}

function totalCommandType(
  stream: ReplayAnalysisResult['commandStream'],
  commandName: string,
): number {
  return stream.players.reduce(
    (total, player) => total + (player.commandTypes[commandName] ?? 0),
    0,
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/60 bg-secondary/20 px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-medium">{value}</div>
    </div>
  )
}
