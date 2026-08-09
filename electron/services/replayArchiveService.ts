import type { Game, GamePlayer } from '@api/types'
import type {
  AccountReplayItem,
  AccountReplayPage,
  IpcResult,
  ReplayCacheBatchResult,
  ReplayCacheResult,
  SummaryCacheBatchResult,
  SummaryCacheResult,
} from '@ipc/contract'
import { getCachedReplayInfo } from './replayCacheService'
import { getCachedSummaryInfo } from './summaryCache'
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
): Promise<IpcResult<AccountReplayPage>> {
  const profileId = getSettings().getAll().profileId
  if (profileId == null) return err('not_found', 'No AoE4World profile is selected.')
  const { page, pageSize } = pageInput(requestedPage, requestedPageSize)

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
    const totalCount = mergedGames.length
    const pageStart = (page - 1) * pageSize
    const pageGames = mergedGames.slice(pageStart, pageStart + pageSize)
    const items: AccountReplayItem[] = pageGames.map(({ game, historySource }) => {
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
    return ok({
      items,
      page,
      pageSize,
      totalCount,
      hasNext: pageStart + items.length < totalCount,
      aoe4WorldCount: aoe4WorldGames.length,
      relicCount: relicResponse?.matchHistoryStats.length ?? 0,
      relicOnlyCount: mergedGames.filter((item) => item.historySource === 'relic').length,
    })
  } catch (error) {
    return errFrom(error)
  }
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
  if (uniqueIds.length > MAX_PAGE_SIZE) {
    return err('validation', `A maximum of ${MAX_PAGE_SIZE} summaries can be cached at once.`)
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

export async function cacheAccountReplays(gameIds: number[]): Promise<IpcResult<ReplayCacheBatchResult>> {
  if (!getSettings().getAll().profileId) return err('not_found', 'No AoE4World profile is selected.')
  if (!getSteamAuthStatus().connected) {
    return err('network', 'Connect Steam in Settings before caching online replays.')
  }
  const uniqueIds = [...new Set(gameIds)].filter(
    (id) => Number.isSafeInteger(id) && id > 0,
  )
  if (uniqueIds.length > MAX_PAGE_SIZE) return err('validation', `A maximum of ${MAX_PAGE_SIZE} replays can be cached at once.`)

  const results: ReplayCacheResult[] = []
  for (const gameId of uniqueIds) {
    try {
      results.push(await cacheRemoteReplay(gameId, getSettings().getAll().profileId!))
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
