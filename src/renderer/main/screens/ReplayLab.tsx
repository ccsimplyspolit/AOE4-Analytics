import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  ClipboardCheck,
  ChevronLeft,
  ChevronRight,
  CloudDownload,
  Database,
  FileVideo,
  HardDriveDownload,
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
import { civFromToken } from '@domain/statsSummary'
import { compareMatchPlayers } from '@domain/buildOrderComparison'
import { formatDuration } from '@domain/format'
import type { TwitchVodFinderInput } from '@domain/twitchVodFinder'
import { ipc } from '@shared/ipc'
import { Card, CardContent } from '@shared/components/ui/card'
import { Badge } from '@shared/components/ui/badge'
import { formatCount } from '@shared/format'
import { PageHead } from '../components/PageHead'
import { WorkspaceNav } from '../components/WorkspaceNav'
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
  useReplayAnalysis,
  useReplays,
} from '../queries/useReplays'
import { useSettings } from '../queries/useProfile'
import { useGameSummary } from '../queries/useHistory'
import { useSteamAuthStatus } from '../queries/useSteam'
import { useTwitchVod } from '../queries/useTwitchVod'
import { useVideoAnalyses } from '../queries/useVideoAnalyses'
import { useI18n } from '../../i18n'

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

function rosterLabel(item: ReplayArchiveItem, tt: (value: string) => string): string {
  if (item.info?.players.length) {
    return item.info.players
      .map((player) => `${player.name || tt('Unknown')} · ${civDisplayName(player.civSlug ?? '')}`)
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

function accountRoster(item: AccountReplayItem, tt: (value: string) => string): string {
  const teams = normalizeTeams(item.game)
  if (teams.length === 0) return tt('Player roster unavailable')
  return teams
    .map((team) =>
      team.map((player) => `${player.name} · ${civDisplayName(player.civilization)}`).join(' + '),
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

export function ReplayLab() {
  const { tt } = useI18n()
  const settings = useSettings()
  const steam = useSteamAuthStatus()
  const [source, setSource] = useState<'local' | 'account'>('local')
  const [localPage, setLocalPage] = useState(1)
  const [accountPage, setAccountPage] = useState(1)
  const [accountRefreshVersion, setAccountRefreshVersion] = useState(0)
  const [autoCache, setAutoCache] = useState(true)
  const [autoAnalyze, setAutoAnalyze] = useState(true)
  const [cacheMessage, setCacheMessage] = useState<string | null>(null)
  const [bulkCacheMode, setBulkCacheMode] = useState<BulkCacheMode | null>(null)
  const [bulkCacheProgress, setBulkCacheProgress] = useState<BulkCacheProgress | null>(null)
  const [fullAnalysis, setFullAnalysis] = useState<AutoAnalysisState | null>(null)
  const [fullAnalysisRunning, setFullAnalysisRunning] = useState(false)
  const [archiveAuditRows, setArchiveAuditRows] = useState<ArchiveAuditRow[]>([])
  const [archiveAuditProgress, setArchiveAuditProgress] = useState<ArchiveAuditProgress | null>(null)
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
  const local = useReplays(localPage, LOCAL_PAGE_SIZE)
  const account = useAccountReplays(accountPage, ACCOUNT_PAGE_SIZE, accountRefreshVersion > 0)
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
                  rosterPlayer.name.trim().toLowerCase() === (player.name ?? '').trim().toLowerCase(),
              ),
            ) ??
            null
          if (!summary || summary.players.length === 0) {
            errors += 1
          } else {
            const myCiv = accountPlayer?.civilization ?? (summaryPlayer ? civFromToken(summaryPlayer.civToken) : null)
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
                      (audit.player.profileId != null && player.profile_id === audit.player.profileId) ||
                      player.name.trim().toLowerCase() === (audit.player.name ?? '').trim().toLowerCase(),
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
      !autoAnalyze ||
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
    autoAnalyze,
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
    <div className="animate-fade-in space-y-5">
      <PageHead
        kicker="Replay intelligence"
        title="Replay Lab"
        sub="Browse every local match-history record, inspect public account history, and cache available online replays for offline review."
      />

      <WorkspaceNav workspace="matches" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1" role="tablist" aria-label={tt('Replay sources')}>
          <SourceTab active={source === 'local'} onClick={() => setSource('local')}>
            <Database className="h-3.5 w-3.5" /> {tt('Local archive')}
          </SourceTab>
          <SourceTab active={source === 'account'} onClick={() => setSource('account')}>
            <CloudDownload className="h-3.5 w-3.5" /> {tt('Account history')}
          </SourceTab>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {source === 'account' && (
            <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={autoCache}
                onChange={(event) => setAutoCache(event.target.checked)}
              />
              {tt('Auto-cache available page replays')}
            </label>
          )}
          <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={autoAnalyze}
              onChange={(event) => setAutoAnalyze(event.target.checked)}
            />
            {tt(
              source === 'account' ? 'Auto-analyze cached replays' : 'Auto-analyze local replays',
            )}
          </label>
          {autoAnalysis && (
            <Badge variant="outline" className="border-primary/40 text-primary">
              {tt('Auto-analysis')} {autoAnalysis.done}/{autoAnalysis.total}
              {autoAnalysis.errors > 0 ? ` · ${autoAnalysis.errors} ${tt('errors')}` : ''}
            </Badge>
          )}
        </div>
      </div>

      {source === 'local' ? (
        <LocalArchive
          consent={consent}
          data={local.data}
          isLoading={local.isLoading}
          isError={local.isError}
          autoAnalysisResults={autoAnalysisResults}
          onRetry={() => void local.refetch()}
          page={localPage}
          onPage={setLocalPage}
        />
      ) : (
        <AccountArchive
          profileId={settings.data?.profileId ?? null}
          steamConnected={steam.data?.connected ?? false}
          data={accountData}
          isLoading={account.isLoading}
          isError={account.isError}
          cacheMessage={cacheMessage}
          cacheOne={cacheOne}
          cacheMany={cacheMany}
          cacheSummaries={cacheSummaries}
          bulkCacheMode={bulkCacheMode}
          bulkCacheProgress={bulkCacheProgress}
          fullAnalysis={fullAnalysis}
          fullAnalysisRunning={fullAnalysisRunning}
          archiveAuditRows={archiveAuditRows}
          archiveAuditProgress={archiveAuditProgress}
          archiveAuditRunning={archiveAuditRunning}
          onRetry={() => setAccountRefreshVersion((value) => value + 1)}
          onCacheAll={() => void cacheWholeAccount('replays')}
          onCacheSummaries={() => void cacheWholeAccount('summaries')}
          onAnalyzeAll={() => void analyzeWholeAccount()}
          onAuditAll={() => void auditWholeAccount()}
          autoAnalysis={autoAnalysis}
          autoAnalysisResults={autoAnalysisResults}
          page={accountPage}
          onPage={setAccountPage}
        />
      )}
    </div>
  )
}

function SourceTab({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors ${active ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'}`}
    >
      {children}
    </button>
  )
}

function LocalArchive({
  consent,
  data,
  isLoading,
  isError,
  autoAnalysisResults,
  onRetry,
  page,
  onPage,
}: {
  consent: boolean
  data: ReplayArchivePage | undefined
  isLoading: boolean
  isError: boolean
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
        <div className="space-y-1">
          <p>{tt('No local match-history records found.')}</p>
          <p className="text-xs">{tt('Finish a game or save a replay, then return here.')}</p>
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
          autoResult={autoAnalysisResults[`local:${item.id}`]}
        />
      ))}
      <Pager {...data} page={page} onPage={onPage} />
    </div>
  )
}

function LocalReplayRow({
  item,
  autoResult,
}: {
  item: ReplayArchiveItem
  autoResult?: ReplayAnalysisResult
}) {
  const { tt } = useI18n()
  const [showAnalysis, setShowAnalysis] = useState(false)
  const analysis = useReplayAnalysis()
  const map = item.info?.mapName ?? item.localMatch?.map ?? item.info?.mapId ?? tt('Unknown map')
  const displayedAnalysis = analysis.data ?? autoResult
  const runAnalysis = async () => {
    if (!item.hasReplay || analysis.isPending) return
    if (autoResult) {
      setShowAnalysis(true)
      return
    }
    try {
      await analysis.mutateAsync({ localId: item.id })
      setShowAnalysis(true)
    } catch {
      // The mutation error is rendered below the row.
    }
  }
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="truncate font-medium">{map}</div>
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
            {item.hasReplay && (
              <button
                type="button"
                disabled={analysis.isPending}
                onClick={() => void runAnalysis()}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-primary/40 px-2.5 text-xs text-primary hover:bg-primary/10 disabled:opacity-40"
              >
                <ScanLine className="h-3.5 w-3.5" />
                {analysis.isPending
                  ? tt('Analyzing…')
                  : autoResult
                    ? tt('Show analysis')
                    : tt('Analyze replay')}
              </button>
            )}
            {item.matchId && (
              <Link
                to={`/game/${item.matchId}`}
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
          <span className="truncate">{rosterLabel(item, tt)}</span>
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
        {displayedAnalysis && (
          <ReplayAnalysisPanel
            result={displayedAnalysis}
            open={showAnalysis}
            onToggle={() => setShowAnalysis((value) => !value)}
          />
        )}
      </CardContent>
    </Card>
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
  cacheMany,
  cacheSummaries,
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
  onCacheAll,
  onCacheSummaries,
  onAnalyzeAll,
  onAuditAll,
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
  cacheMany: ReturnType<typeof useCacheReplays>
  cacheSummaries: ReturnType<typeof useCacheSummaries>
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
  onCacheAll: () => void
  onCacheSummaries: () => void
  onAnalyzeAll: () => void
  onAuditAll: () => void
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
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={steamConnected ? 'border-win/40 text-win' : ''}>
                Steam {steamConnected ? tt('connected') : tt('not connected')}
              </Badge>
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs hover:bg-secondary"
              >
                <RefreshCw className="h-3.5 w-3.5" /> {tt('Sync full history')}
              </button>
              <button
                type="button"
                disabled={!steamConnected || data.totalCount === 0 || cacheMany.isPending || bulkCacheMode != null}
                onClick={onCacheAll}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-primary/40 px-2.5 text-xs text-primary hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <HardDriveDownload className="h-3.5 w-3.5" />
                {bulkCacheMode === 'replays' || cacheMany.isPending
                  ? tt('Caching full archive…')
                  : tt('Cache all available')}
              </button>
              <button
                type="button"
                disabled={!steamConnected || data.totalCount === 0 || cacheSummaries.isPending || bulkCacheMode != null}
                onClick={onCacheSummaries}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ListChecks className="h-3.5 w-3.5" />
                {bulkCacheMode === 'summaries' || cacheSummaries.isPending
                  ? tt('Caching full archive…')
                  : tt('Cache all summaries')}
              </button>
              <button
                type="button"
                disabled={data.totalCount === 0 || fullAnalysisRunning || bulkCacheMode != null}
                onClick={onAnalyzeAll}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ScanLine className="h-3.5 w-3.5" />
                {fullAnalysisRunning ? tt('Analyzing full archive…') : tt('Analyze full cached archive')}
              </button>
              <button
                type="button"
                disabled={
                  data.totalCount === 0 ||
                  archiveAuditRunning ||
                  bulkCacheMode != null
                }
                onClick={onAuditAll}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-primary/40 px-2.5 text-xs text-primary hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ClipboardCheck className="h-3.5 w-3.5" />
                {archiveAuditRunning ? tt('Auditing full archive…') : tt('Audit all cached summaries')}
              </button>
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
              {bulkCacheProgress.mode === 'replays' ? tt('replays') : tt('summaries')} {formatCount(bulkCacheProgress.completed)}/
              {formatCount(bulkCacheProgress.eligible)}
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
                    <div>{row.map || tt('Unknown map')}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {row.civ == null ? tt('Unknown civilization') : gameName(civDisplayName(row.civ))}
                      {row.result
                        ? ` · ${row.result === 'win' ? tt('Win') : tt('Loss')}`
                        : ''}
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
  const { tt } = useI18n()
  const [showAnalysis, setShowAnalysis] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const [fullResult, setFullResult] = useState<FullReplayAnalysis | null>(null)
  const analysis = useReplayAnalysis()
  const fullAnalysis = useDownloadAndAnalyzeReplay()
  const videoAnalyses = useVideoAnalyses()
  const game = item.game
  const summaryQuery = useGameSummary(String(game.game_id), { enabled: showSummary })
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
    civilization: myPlayer?.civilization ?? 'english',
    opponentCivilization:
      normalizeTeams(game)
        .flat()
        .find((player) => player.profile_id !== myPlayer?.profile_id)?.civilization ?? null,
    map: game.map,
    durationSec: game.duration,
  }
  const twitchVodLookup = useTwitchVod(twitchVodInput, showSummary && myPlayer != null)
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
              <div className="font-medium">{game.map || tt('Unknown map')}</div>
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
            {(item.replayAvailable || item.cacheStatus === 'cached') && (
              <button
                type="button"
                disabled={fullAnalysis.isPending}
                onClick={() => {
                  void fullAnalysis
                    .mutateAsync(game.game_id)
                    .then((result) => {
                      setFullResult(result)
                      setShowAnalysis(result.replay != null)
                      setShowSummary(result.summary != null)
                    })
                    .catch(() => undefined)
                }}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-primary/40 px-2.5 text-xs text-primary hover:bg-primary/10 disabled:opacity-40"
              >
                <ScanLine className="h-3.5 w-3.5" />
                {fullAnalysis.isPending
                  ? tt('Downloading and analyzing…')
                  : tt('Download + full analysis')}
              </button>
            )}
            {item.replayAvailable && item.cacheStatus !== 'cached' && (
              <button
                type="button"
                disabled={cacheOne.isPending}
                onClick={() => void cacheOne.mutateAsync(game.game_id)}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-primary/40 px-2.5 text-xs text-primary hover:bg-primary/10 disabled:opacity-40"
              >
                <HardDriveDownload className="h-3.5 w-3.5" />
                {cacheOne.isPending ? tt('Caching…') : tt('Cache replay')}
              </button>
            )}
            {item.cacheStatus === 'cached' && (
              <button
                type="button"
                disabled={analysis.isPending}
                onClick={() => {
                  if (autoResult) {
                    setShowAnalysis(true)
                    return
                  }
                  void analysis
                    .mutateAsync({ gameId: game.game_id })
                    .then(() => setShowAnalysis(true))
                    .catch(() => undefined)
                }}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-primary/40 px-2.5 text-xs text-primary hover:bg-primary/10 disabled:opacity-40"
              >
                <ScanLine className="h-3.5 w-3.5" />
                {analysis.isPending
                  ? tt('Analyzing…')
                  : autoResult
                    ? tt('Show analysis')
                    : tt('Analyze replay')}
              </button>
            )}
            {item.summaryAvailable && (
              <button
                type="button"
                disabled={summaryQuery.isFetching}
                onClick={() => setShowSummary((value) => !value)}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs hover:bg-secondary disabled:opacity-40"
              >
                <ListChecks className="h-3.5 w-3.5" />
                {summaryQuery.isFetching
                  ? tt('Loading summary…')
                  : showSummary
                    ? tt('Hide summary')
                    : tt('Open summary')}
              </button>
            )}
            {item.historySource === 'relic' ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <History className="h-3.5 w-3.5" /> {tt('Relic record')}
              </span>
            ) : (
              <Link
                to={`/game/${game.game_id}`}
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
          <span className="truncate">{accountRoster(item, tt)}</span>
        </div>
        <p className="border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
          {tt(
            'Game metadata is public. Full replay downloads require a signed Relic session and are stored in the local replay cache.',
          )}
          {item.cacheSizeBytes != null
            ? ` ${tt('Cached size')}: ${(item.cacheSizeBytes / 1024 / 1024).toFixed(1)} MB.`
            : ''}
        </p>
        {fullAnalysis.error && (
          <p className="text-xs text-loss">{fullAnalysis.error.message}</p>
        )}
        {analysis.error && !autoResult && !fullResult && (
          <p className="text-xs text-loss">{analysis.error.message}</p>
        )}
        {fullResult && (
          <p className="border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
            {tt('Full replay analysis')}: {fullResult.download.status} ·{' '}
            {tt('Replay stream')} {fullResult.coverage.replay} · {tt('Summary')}{' '}
            {fullResult.coverage.summary ? tt('available') : tt('unavailable')}
          </p>
        )}
        {displayedAnalysis && (
          <ReplayAnalysisPanel
            result={displayedAnalysis}
            open={showAnalysis}
            onToggle={() => setShowAnalysis((value) => !value)}
          />
        )}
        {(item.summaryAvailable || displayedSummary != null) && showSummary && (
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
  open,
  onToggle,
}: {
  result: ReplayAnalysisResult
  open: boolean
  onToggle: () => void
}) {
  const { tt } = useI18n()
  const stream = result.commandStream
  const [eventLimit, setEventLimit] = useState(24)
  const [playerFilter, setPlayerFilter] = useState<number | null>(null)
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
  const visibleEvents = filteredEvents.slice(0, eventLimit)
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
          <div className="grid gap-2 sm:grid-cols-5">
            <Metric label={tt('Coverage')} value={coverageLabel} />
            <Metric
              label={tt('Duration')}
              value={stream.durationSec == null ? '—' : formatDuration(stream.durationSec)}
            />
            <Metric
              label={tt('Commands')}
              value={`${stream.commandCount}${stream.eventsTruncated ? '+' : ''}`}
            />
            <Metric label={tt('Ticks')} value={String(stream.ticksParsed)} />
            <Metric label={tt('Unknown')} value={String(stream.unknownCommandCount)} />
          </div>
          {stream.players.length > 0 && (
            <div className="overflow-x-auto rounded-md border border-border/60">
              <table className="w-full min-w-[900px] text-left text-[11px]">
                <thead className="bg-secondary/40 text-muted-foreground">
                  <tr>
                    <th className="px-2 py-1.5">{tt('Player')}</th>
                    <th className="px-2 py-1.5">{tt('Commands')}</th>
                    <th className="px-2 py-1.5">{tt('APM')}</th>
                    <th className="px-2 py-1.5">{tt('Command gaps')}</th>
                    <th className="px-2 py-1.5">{tt('Max gap')}</th>
                    <th className="px-2 py-1.5">{tt('Decoded')}</th>
                    <th className="px-2 py-1.5">{tt('Input mix')}</th>
                    <th className="px-2 py-1.5">{tt('Activity trend')}</th>
                  </tr>
                </thead>
                <tbody>
                  {stream.players.map((player) => (
                    <tr key={player.playerId} className="border-t border-border/50">
                      <td className="px-2 py-1.5 font-medium">{player.playerId}</td>
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
                        {commandMixLabel(player.commandTypes)}
                      </td>
                      <td className="px-2 py-1.5 tabular-nums">
                        {activityTrendLabel(player.activityDropPct, player.activityWindows.length)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <ListChecks className="h-3.5 w-3.5" />
            {tt('Production queue events')}: {totalCommandType(stream, 'queue-unit')}
          </div>
          {stream.players.length > 0 && (
            <label className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
              <span>{tt('Timeline player')}</span>
              <select
                value={playerFilter == null ? 'all' : String(playerFilter)}
                onChange={(event) => {
                  setEventLimit(24)
                  setPlayerFilter(event.target.value === 'all' ? null : Number(event.target.value))
                }}
                className="h-7 rounded-md border border-border bg-background px-2 text-foreground"
              >
                <option value="all">{tt('All players')}</option>
                {stream.players.map((player) => (
                  <option key={player.playerId} value={player.playerId}>
                    P{player.playerId}
                  </option>
                ))}
              </select>
              <span>
                {filteredEvents.length} {tt('decoded events in view')}
              </span>
            </label>
          )}
          {visibleEvents.length > 0 && (
            <>
              <div className="max-h-64 overflow-auto rounded-md border border-border/60">
                {visibleEvents.map((event, index) => (
                  <div
                    key={`${event.offset}-${index}`}
                    className="grid grid-cols-[52px_1fr_auto] gap-2 border-b border-border/40 px-2 py-1.5 last:border-b-0"
                  >
                    <span className="tabular-nums text-muted-foreground">
                      {formatDuration(event.timeSec)}
                    </span>
                    <span>
                      {event.commandName}
                      {event.pbgid == null ? '' : ` · pbgid ${event.pbgid}`}
                    </span>
                    <span className="text-muted-foreground">P{event.playerId}</span>
                  </div>
                ))}
              </div>
              {eventLimit < filteredEvents.length && (
                <button
                  type="button"
                  onClick={() =>
                    setEventLimit((value) => Math.min(filteredEvents.length, value + 24))
                  }
                  className="text-xs text-primary hover:underline"
                >
                  {tt('Show more timeline events')} ({filteredEvents.length - eventLimit})
                </button>
              )}
            </>
          )}
          {stream.dataGaps.length > 0 && (
            <div className="space-y-1 rounded-md border border-amber-500/30 bg-amber-500/5 p-2 text-[11px] text-amber-200">
              {stream.dataGaps.slice(0, 4).map((gap, index) => (
                <div key={`${gap.code}-${index}`} className="flex gap-1.5">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{gap.message}</span>
                </div>
              ))}
            </div>
          )}
          <p className="text-[11px] text-muted-foreground">
            {tt(
              'Command gaps are an observable input-gap estimate, not a direct villager-idle measurement. Activity trend compares the first and last five-minute command windows. Decoded is the share of this player’s commands understood by the current parser. Failed actions, worker allocation and scouting are not encoded as explicit events.',
            )}
          </p>
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

function commandMixLabel(commandTypes: Record<string, number>): string {
  const entries = Object.entries(commandTypes).sort((a, b) => b[1] - a[1])
  return (
    entries
      .slice(0, 3)
      .map(([name, count]) => `${name} ${count}`)
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
