import type { Game, GamePlayer } from '@api/types'
import type {
  AccountReplayItem,
  AccountReplayArchive,
  AccountReplayPage,
  IpcResult,
  ReplayCacheBatchResult,
  ReplayCacheResult,
  SummaryCacheBatchResult,
  SummaryCacheResult,
  FullReplayAnalysis,
  PlayerArchiveCacheResult,
} from '@ipc/contract'
import { analyzeCachedReplay, getCachedReplayInfo } from './replayCacheService'
import { getCachedSummaryInfo } from './summaryCache'
import {
  readAccountReplayArchive,
  writeAccountReplayArchive,
  type AccountReplayArchiveSnapshot,
} from './accountReplayArchiveStore'
import { getClient, getRelicClient, getSettings } from './appContext'
import { cacheRemoteReplay, fetchRankedSummary, getSteamAuthStatus } from './relicAuthService'
import { err, errFrom, ok } from './result'
import { decodeOutcome } from '@domain/relic'
import { matchTypeLabel, raceIdToCiv } from '@domain/relicIds'
import type { RelicMatch, RelicProfile, RelicRecentMatchHistoryResponse } from '@api/relicTypes'

const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 50

function pageInput(page = 1, pageSize = DEFAULT_PAGE_SIZE): { page: number; pageSize: number } {
  return {
    page: Math.max(1, Math.min(100_000, Math.floor(page))),
    pageSize: Math.max(1, Math.min(MAX_PAGE_SIZE, Math.floor(pageSize))),
  }
}

function pageFromSnapshot(
  snapshot: AccountReplayArchiveSnapshot,
  page: number,
  pageSize: number,
): AccountReplayPage {
  const pageStart = (page - 1) * pageSize
  const items = decoratedItems(snapshot).slice(pageStart, pageStart + pageSize)
  return {
    items,
    page,
    pageSize,
    totalCount: snapshot.items.length,
    hasNext: pageStart + items.length < snapshot.items.length,
    aoe4WorldCount: snapshot.aoe4WorldCount,
    relicCount: snapshot.relicCount,
    relicOnlyCount: snapshot.relicOnlyCount,
  }
}

function decorateItem(item: AccountReplayItem): AccountReplayItem {
  const cached = getCachedReplayInfo(item.game.game_id)
  const cachedSummary = getCachedSummaryInfo(String(item.game.game_id))
  return {
    ...item,
    summaryAvailable: item.summaryAvailable || cachedSummary.cached,
    summaryCached: cachedSummary.cached,
    cacheStatus: cached.cached
      ? 'cached'
      : item.cacheStatus === 'not_checked'
        ? 'not_checked'
        : item.replayAvailable
          ? 'available'
          : 'unavailable',
    cacheSizeBytes: cached.sizeBytes,
  }
}

function decoratedItems(snapshot: AccountReplayArchiveSnapshot): AccountReplayItem[] {
  return snapshot.items.map(decorateItem)
}

function archiveFromSnapshot(snapshot: AccountReplayArchiveSnapshot): AccountReplayArchive {
  const items = decoratedItems(snapshot)
  return {
    items,
    totalCount: items.length,
    cachedAt: snapshot.cachedAt,
    aoe4WorldCount: snapshot.aoe4WorldCount,
    relicCount: snapshot.relicCount,
    relicOnlyCount: snapshot.relicOnlyCount,
  }
}

function replayAvailable(match: { matchurls?: Array<{ datatype?: number; size?: number; url?: string }> } | null) {
  return (match?.matchurls ?? []).some(
    (url) => url.datatype === 0 && Boolean(url.url) && (url.size ?? -1) > 0,
  )
}

function summaryAvailable(match: { matchurls?: Array<{ datatype?: number; size?: number; url?: string }> } | null) {
  return (match?.matchurls ?? []).some(
    (url) => url.datatype === 1 && Boolean(url.url) && (url.size ?? -1) > 0,
  )
}

function relicGame(match: RelicMatch, profiles: RelicProfile[], mapName: string): Game {
  const names = new Map(profiles.map((profile) => [profile.profile_id, profile.alias || profile.name]))
  const teams = new Map<number, GamePlayer[]>()
  for (const member of match.matchhistorymember ?? []) {
    const player: GamePlayer = {
      profile_id: member.profile_id,
      name: names.get(member.profile_id) ?? `Player ${member.profile_id}`,
      result: decodeOutcome(member.outcome),
      civilization: raceIdToCiv(member.civilization_id) ?? `race_${member.civilization_id}`,
      rating: member.newrating ?? null,
      rating_diff: member.newrating != null && member.oldrating != null
        ? member.newrating - member.oldrating
        : null,
      mmr: null,
    }
    const team = teams.get(member.teamid) ?? []
    team.push(player)
    teams.set(member.teamid, team)
  }
  const startedAt = new Date(match.startgametime * 1000).toISOString()
  const duration =
    match.completiontime > match.startgametime
      ? match.completiontime - match.startgametime
      : null
  return {
    game_id: match.id,
    started_at: startedAt,
    updated_at: startedAt,
    duration,
    map: mapName || match.mapname || 'Unknown map',
    kind: match.description || 'match',
    leaderboard: matchTypeLabel(match.matchtype_id, match.description),
    season: null,
    server: null,
    patch: null,
    average_rating: null,
    average_mmr: null,
    ongoing: false,
    just_finished: false,
    teams: [...teams.entries()]
      .sort(([left], [right]) => left - right)
      .map(([, players]) => players.map((player) => ({ player }))),
  }
}

/** Account history uses AoE4World for pagination and Relic for upload slots. */
export async function listAccountReplayArchive(
  requestedPage = 1,
  requestedPageSize = DEFAULT_PAGE_SIZE,
  forceRefresh = false,
): Promise<IpcResult<AccountReplayPage>> {
  const profileId = getSettings().getAll().profileId
  if (profileId == null) return err('not_found', 'No AoE4World profile is selected.')
  const { page, pageSize } = pageInput(requestedPage, requestedPageSize)
  const saved = readAccountReplayArchive(profileId)
  if (saved && !forceRefresh) return ok(pageFromSnapshot(saved, page, pageSize))

  try {
    const [aoe4WorldGames, relicResponse] = await Promise.all([
      getClient().getAllPlayerGames(profileId, { fresh: true, pageSize: 100 }),
      getRelicClient().getRecentMatchHistory(profileId).catch(() => null),
    ])
    const relicById = new Map((relicResponse?.matchHistoryStats ?? []).map((match) => [match.id, match]))
    const mapNames = relicResponse ? getRelicClient().mapNamesFor(relicResponse.matchHistoryStats) : {}
    const aoeIds = new Set(aoe4WorldGames.map((game) => game.game_id))
    const mergedGames: Array<{ game: Game; historySource: AccountReplayItem['historySource'] }> = [
      ...aoe4WorldGames.map((game) => ({
        game,
        historySource: relicById.has(game.game_id) ? ('merged' as const) : ('aoe4world' as const),
      })),
      ...(relicResponse?.matchHistoryStats ?? [])
        .filter((match) => !aoeIds.has(match.id))
        .map((match) => ({
          game: relicGame(match, relicResponse?.profiles ?? [], mapNames[match.id] ?? 'Unknown map'),
          historySource: 'relic' as const,
        })),
    ].sort((left, right) => right.game.started_at.localeCompare(left.game.started_at))
    const snapshotItems: AccountReplayItem[] = mergedGames.map(({ game, historySource }) => {
      const relicMatch = relicById.get(game.game_id) ?? null
      const available = replayAvailable(relicMatch)
      const cached = getCachedReplayInfo(game.game_id)
      const cachedSummary = getCachedSummaryInfo(String(game.game_id))
      return {
        game,
        historySource,
        replayAvailable: available,
        // A summary may already be persisted from an earlier Relic fetch even
        // after the match leaves Relic's recent-history window. Keep exposing
        // it in Replay Lab so the user can open it offline.
        summaryAvailable: summaryAvailable(relicMatch) || cachedSummary.cached,
        summaryCached: cachedSummary.cached,
        cacheStatus: cached.cached ? 'cached' : available ? 'available' : relicResponse ? 'unavailable' : 'not_checked',
        cacheSizeBytes: cached.sizeBytes,
      }
    })
    const snapshot = {
      items: snapshotItems,
      aoe4WorldCount: aoe4WorldGames.length,
      relicCount: relicResponse?.matchHistoryStats.length ?? 0,
      relicOnlyCount: mergedGames.filter((item) => item.historySource === 'relic').length,
    }
    writeAccountReplayArchive(profileId, snapshot)
    const persisted = readAccountReplayArchive(profileId)
    return ok(
      pageFromSnapshot(
        persisted ?? {
          schemaVersion: 1,
          profileId,
          cachedAt: new Date().toISOString(),
          ...snapshot,
        },
        page,
        pageSize,
      ),
    )
  } catch (error) {
    // An explicit refresh may fail offline; the previously saved history remains usable.
    if (saved) return ok(pageFromSnapshot(saved, page, pageSize))
    return errFrom(error)
  }
}

/**
 * Returns the complete account snapshot in one IPC call. The paginated endpoint
 * remains the rendering path; this endpoint is deliberately used by bulk cache
 * and sync actions so those actions cannot silently stop at the visible page.
 */
export async function listAllAccountReplayArchive(
  forceRefresh = false,
): Promise<IpcResult<AccountReplayArchive>> {
  const profileId = getSettings().getAll().profileId
  if (profileId == null) return err('not_found', 'No AoE4World profile is selected.')

  const first = await listAccountReplayArchive(1, 1, forceRefresh)
  if (!first.ok) return first
  const saved = readAccountReplayArchive(profileId)
  if (saved) return ok(archiveFromSnapshot(saved))

  // A filesystem write can fail without invalidating the visible page. Keep
  // the fallback honest rather than throwing away a usable result.
  return ok({
    items: first.data.items,
    totalCount: first.data.items.length,
    cachedAt: new Date().toISOString(),
    aoe4WorldCount: first.data.aoe4WorldCount,
    relicCount: first.data.relicCount,
    relicOnlyCount: first.data.relicOnlyCount,
  })
}

async function cacheOneSummary(
  gameId: number,
  profileId: number,
  recentHistory: RelicRecentMatchHistoryResponse | null,
): Promise<SummaryCacheResult> {
  const cached = getCachedSummaryInfo(String(gameId))
  if (cached.cached) {
    return { gameId, status: 'already_cached', sizeBytes: cached.sizeBytes, path: cached.path }
  }
  const parsed = await fetchRankedSummary(String(gameId), profileId, recentHistory)
  if (!parsed) return { gameId, status: 'unavailable', sizeBytes: null, path: null }
  const saved = getCachedSummaryInfo(String(gameId))
  return saved.cached
    ? { gameId, status: 'cached', sizeBytes: saved.sizeBytes, path: saved.path }
    : { gameId, status: 'unavailable', sizeBytes: null, path: null }
}

export async function cacheAccountSummary(gameId: number): Promise<IpcResult<SummaryCacheResult>> {
  const profileId = getSettings().getAll().profileId
  if (profileId == null) return err('not_found', 'No AoE4World profile is selected.')
  if (!Number.isSafeInteger(gameId) || gameId <= 0) return err('validation', 'Invalid summary id.')
  if (!getSteamAuthStatus().connected) {
    return err('network', 'Connect Steam in Settings before caching summaries.')
  }
  try {
    const recent = await getRelicClient().getRecentMatchHistory(profileId)
    return ok(await cacheOneSummary(gameId, profileId, recent))
  } catch (error) {
    return errFrom(error)
  }
}

export async function cacheAccountSummaries(
  gameIds: number[],
): Promise<IpcResult<SummaryCacheBatchResult>> {
  const profileId = getSettings().getAll().profileId
  if (profileId == null) return err('not_found', 'No AoE4World profile is selected.')
  if (!getSteamAuthStatus().connected) {
    return err('network', 'Connect Steam in Settings before caching summaries.')
  }
  const uniqueIds = [...new Set(gameIds)].filter(
    (id) => Number.isSafeInteger(id) && id > 0,
  )
  if (uniqueIds.length > 500) {
    return err('validation', 'A maximum of 500 summaries can be cached at once.')
  }

  let recent: RelicRecentMatchHistoryResponse | null = null
  try {
    recent = await getRelicClient().getRecentMatchHistory(profileId)
  } catch {
    // Each item will be reported as unavailable; the batch remains resumable.
  }
  const results: SummaryCacheResult[] = []
  for (const id of uniqueIds) {
    try {
      results.push(await cacheOneSummary(id, profileId, recent))
    } catch {
      results.push({ gameId: id, status: 'unavailable', sizeBytes: null, path: null })
    }
  }
  return ok({
    attempted: results.length,
    cached: results.filter((item) => item.status === 'cached').length,
    alreadyCached: results.filter((item) => item.status === 'already_cached').length,
    unavailable: results.filter((item) => item.status === 'unavailable').length,
    results,
  })
}

export async function cacheAccountReplay(gameId: number): Promise<IpcResult<ReplayCacheResult>> {
  const profileId = getSettings().getAll().profileId
  if (profileId == null) return err('not_found', 'No AoE4World profile is selected.')
  if (!Number.isSafeInteger(gameId) || gameId <= 0) return err('validation', 'Invalid replay id.')
  try {
    return ok(await cacheRemoteReplay(gameId, profileId))
  } catch (error) {
    return errFrom(error)
  }
}

/**
 * One-click online replay forensics. The replay and summary are both cache-first:
 * repeated runs are offline and do not re-download an already persisted blob.
 * Missing Relic uploads remain explicit in the result instead of becoming zeros.
 */
export async function downloadAndAnalyzeAccountReplay(
  gameId: number,
): Promise<IpcResult<FullReplayAnalysis>> {
  const profileId = getSettings().getAll().profileId
  if (profileId == null) return err('not_found', 'No AoE4World profile is selected.')
  if (!Number.isSafeInteger(gameId) || gameId <= 0) return err('validation', 'Invalid replay id.')

  let download: ReplayCacheResult
  try {
    download = await cacheRemoteReplay(gameId, profileId)
  } catch (error) {
    return errFrom(error)
  }

  const replay = download.status === 'unavailable' ? null : analyzeCachedReplay(gameId)
  // Ask the shared summary pipeline to decode a raw cached blob through
  // replays-api when the native parser cannot handle its layout. Passing a
  // null history explicitly keeps this first offline/cache pass network-free.
  let summary = await fetchRankedSummary(String(gameId), profileId, null)

  // Relic keeps datatype-1 summaries in a shorter recent-history window than
  // the replay slot. Try the network only when the user is already connected;
  // otherwise the cached replay remains fully useful offline.
  if (!summary && getSteamAuthStatus().connected) {
    try {
      const recent = await getRelicClient().getRecentMatchHistory(profileId)
      summary = await fetchRankedSummary(String(gameId), profileId, recent)
    } catch {
      // A replay can still be analyzed when its summary slot has expired.
    }
  }

  return ok({
    gameId,
    download,
    replay,
    summary,
    summaryStatus: summary ? 'available' : 'unavailable',
    coverage: {
      replay: replay?.commandStream.coverage ?? 'unavailable',
      summary: summary != null,
    },
  })
}

export async function cacheAccountReplays(gameIds: number[]): Promise<IpcResult<ReplayCacheBatchResult>> {
  if (!getSettings().getAll().profileId) return err('not_found', 'No AoE4World profile is selected.')
  if (!getSteamAuthStatus().connected) {
    return err('network', 'Connect Steam in Settings before caching online replays.')
  }
  const uniqueIds = [...new Set(gameIds)].filter(
    (id) => Number.isSafeInteger(id) && id > 0,
  )
  if (uniqueIds.length > 500) return err('validation', `A maximum of 500 replays can be cached at once.`)

  const results: ReplayCacheResult[] = []
  for (const gameId of uniqueIds) {
    try {
      const cached = await cacheRemoteReplay(gameId, getSettings().getAll().profileId!)
      results.push(cached)
      if (cached.status === 'cached' || cached.status === 'already_cached') {
        try {
          analyzeCachedReplay(gameId)
        } catch {
          /* non-fatal */
        }
      }
    } catch {
      results.push({ gameId, status: 'unavailable', sizeBytes: null, path: null })
    }
  }
  return ok({
    attempted: results.length,
    cached: results.filter((item) => item.status === 'cached').length,
    alreadyCached: results.filter((item) => item.status === 'already_cached').length,
    unavailable: results.filter((item) => item.status === 'unavailable').length,
    results,
  })
}

/**
 * Downloads and parses all available replays and summaries for ANY given player profile ID.
 * Works for scouted opponents, match participants, or arbitrary players.
 */
export async function cachePlayerArchive(
  profileId: number,
  options?: { maxReplays?: number; maxSummaries?: number },
): Promise<IpcResult<PlayerArchiveCacheResult>> {
  if (!Number.isSafeInteger(profileId) || profileId <= 0) {
    return err('validation', 'Invalid player profile ID.')
  }
  const maxReplays = options?.maxReplays ?? 50
  const maxSummaries = options?.maxSummaries ?? 100

  let recent: RelicRecentMatchHistoryResponse | null = null
  try {
    recent = await getRelicClient().getRecentMatchHistory(profileId)
  } catch {
    // Relic history unavailable
  }

  let aoe4Games: Game[] = []
  try {
    const page = await getClient().getPlayerGames(profileId, {
      page: 1,
      limit: Math.min(50, maxSummaries),
    })
    aoe4Games = page.games ?? []
  } catch {
    // AoE4World games unavailable
  }

  const allGameIds = new Set<number>()
  for (const g of aoe4Games) {
    if (g.game_id) allGameIds.add(g.game_id)
  }
  for (const m of recent?.matchHistoryStats ?? []) {
    if (m.id) allGameIds.add(m.id)
  }

  let cachedSummariesCount = 0
  let cachedReplaysCount = 0
  let analyzedReplaysCount = 0

  const gameIds = [...allGameIds]

  // 1. Download and persist summaries
  const summaryIds = gameIds.slice(0, maxSummaries)
  for (const id of summaryIds) {
    try {
      const s = await cacheOneSummary(id, profileId, recent)
      if (s.status === 'cached' || s.status === 'already_cached') {
        cachedSummariesCount++
      }
    } catch {
      // non-fatal
    }
  }

  // 2. Download and persist replays, then analyze
  const replayIds = gameIds.slice(0, maxReplays)
  for (const id of replayIds) {
    try {
      const r = await cacheRemoteReplay(id, profileId)
      if (r.status === 'cached' || r.status === 'already_cached') {
        cachedReplaysCount++
        try {
          if (analyzeCachedReplay(id) != null) {
            analyzedReplaysCount++
          }
        } catch {
          // non-fatal
        }
      }
    } catch {
      // non-fatal
    }
  }

  return ok({
    profileId,
    totalGames: gameIds.length,
    cachedReplays: cachedReplaysCount,
    cachedSummaries: cachedSummariesCount,
    analyzedReplays: analyzedReplaysCount,
  })
}

