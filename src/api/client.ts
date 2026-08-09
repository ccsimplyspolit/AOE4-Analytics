import { type DiskCache } from './cache'
import { type RateLimiter } from './rateLimiter'
import {
  fetchWithTimeout,
  getRateLimitGate,
  type FetchWithTimeoutOptions,
} from './fetchWithTimeout'
import type { AgeupStatsResponse } from '@domain/landmarkStats'
import type {
  SearchResponse,
  Player,
  GamesResponse,
  Game,
  LeaderboardResponse,
  CivStatsResponse,
  MatchupStatsResponse,
  MapStatsResponse,
  Leaderboard,
  LeaderboardPlayer,
  StatsLeaderboard,
  RankLevel,
  TeamStatsResponse,
} from './types'

/** Honest, non-spoofed User-Agent (D9 / A2). Single source of truth. */
export const USER_AGENT = 'RTSLytics/0.1 (+contact: tarantinocoop@gmail.com)'
export const API_BASE = 'https://aoe4world.com/api/v0'

/** Abort a request after this long so one hung fetch can't deadlock the queue. */
export const REQUEST_TIMEOUT_MS = 15_000

/** Per-endpoint cache TTLs in milliseconds (D9). */
export const TTL = {
  profile: 5 * 60_000,
  games: 5 * 60_000,
  lastGame: 12_000,
  game: 60 * 60_000,
  leaderboard: 10 * 60_000,
  stats: 6 * 60 * 60_000,
  /** The ageup-analytics dataset updates ~per patch; AoE4World flags the
   *  endpoint as internal, so we cache a full day to keep our touch light. */
  analytics: 24 * 60 * 60_000,
} as const

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly url: string,
    message?: string,
  ) {
    super(message ?? `AoE4World API error ${status} for ${url}`)
    this.name = 'ApiError'
  }
}

export interface ClientOptions {
  cache: DiskCache
  rateLimiter: RateLimiter
  /** Injectable fetch (defaults to global fetch). */
  fetchFn?: typeof fetch
  baseUrl?: string
  /** Injectable retry gate for deterministic request tests. */
  fetchOptions?: FetchWithTimeoutOptions
}

export interface GamesQuery {
  leaderboard?: Leaderboard
  limit?: number
  page?: number
  /** Restrict the list to games against this exact AoE4World profile. */
  opponentProfileId?: number
  /** Incremental sync cursor (filters by `started_at`). */
  since?: string
  /** Bypass the cache — for folding results, which change after a game ends. */
  fresh?: boolean
}

export interface StatsQuery {
  leaderboard?: StatsLeaderboard
  rankLevel?: RankLevel
  /** AoE4World rating bucket, e.g. `1100-1199` or `>1400`. */
  rating?: string
  patch?: string
  /** Include per-civilization map slices for pool-aware meta aggregation. */
  includeCivs?: boolean
}

export interface GlobalGamesQuery {
  /** AoE4World game kind, e.g. rm_1v1 or qm_2v2. */
  leaderboard?: string
  page?: number
  perPage?: number
  profileIds?: number[]
  since?: string
  order?: 'started_at' | 'updated_at'
  fresh?: boolean
}

/** Parameters supported by aoe4world/overlay for the current-game endpoint. */
export interface LastGameQuery {
  /** Include the player's linked alternate profiles in the matchup. */
  includeAlts?: boolean
  /** Allow the overlay API to return a visible custom game when available. */
  includeCustom?: boolean
  /** Optional AoE4World overlay key, kept out of the renderer. */
  apiKey?: string
  fresh?: boolean
}

/**
 * The single typed AoE4World client. Every request flows through the rate
 * limiter and the disk cache; non-2xx responses become `ApiError`. Lives in the
 * main process — the renderer never calls it directly (D4).
 */
export class Aoe4WorldClient {
  private readonly cache: DiskCache
  private readonly rateLimiter: RateLimiter
  private readonly fetchFn: typeof fetch
  private readonly baseUrl: string
  private readonly fetchOptions: FetchWithTimeoutOptions
  /** One network/parse pipeline per URL so concurrent cache misses share work. */
  private readonly inFlight = new Map<string, Promise<unknown>>()

  constructor(options: ClientOptions) {
    this.cache = options.cache
    this.rateLimiter = options.rateLimiter
    this.fetchFn = options.fetchFn ?? globalThis.fetch.bind(globalThis)
    this.baseUrl = options.baseUrl ?? API_BASE
    this.fetchOptions = options.fetchOptions ?? {}
  }

  private async getJson<T>(path: string, ttlMs: number): Promise<T> {
    const url = this.baseUrl + path
    const cached = this.cache.get<T>(url, ttlMs)
    if (cached !== null) return cached
    // Do not turn an upstream rate limit into an empty/error state when the
    // same endpoint has a recent, valid cached response. The in-flight request
    // that triggered the cooldown keeps retrying and refreshes this cache.
    const rateLimitGate = this.fetchOptions.rateLimitGate ?? getRateLimitGate(url)
    if (rateLimitGate.isCoolingDown()) {
      const stale = this.cache.getStale<T>(url)
      if (stale !== null) return stale
    }

    const existing = this.inFlight.get(url)
    if (existing) return (await existing) as T

    const request = (async (): Promise<T> => {
      const res = await this.rateLimiter.schedule(() =>
        fetchWithTimeout(
          this.fetchFn,
          url,
          { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' } },
          REQUEST_TIMEOUT_MS,
          this.fetchOptions,
        ),
      )
      if (!res.ok) throw new ApiError(res.status, url)

      const body = (await res.json()) as T
      this.cache.set(url, body)
      return body
    })()
    this.inFlight.set(url, request)
    try {
      return await request
    } catch (error) {
      // A stale successful response is more useful than an empty screen when
      // AoE4World is temporarily unavailable. Do not hide a permanent 4xx
      // (notably the unsupported team-matchup endpoints) behind old data.
      const isPermanentClientError =
        error instanceof ApiError &&
        error.status >= 400 &&
        error.status < 500 &&
        error.status !== 408 &&
        error.status !== 429
      if (!isPermanentClientError) {
        const stale = this.cache.getStale<T>(url)
        if (stale !== null) return stale
      }
      throw error
    } finally {
      if (this.inFlight.get(url) === request) this.inFlight.delete(url)
    }
  }

  searchPlayers(query: string): Promise<SearchResponse> {
    return this.getJson(`/players/search?query=${encodeURIComponent(query)}`, TTL.profile)
  }

  getPlayer(profileId: number): Promise<Player> {
    return this.getJson(`/players/${profileId}`, TTL.profile)
  }

  getPlayerGames(profileId: number, query: GamesQuery = {}): Promise<GamesResponse> {
    const params = new URLSearchParams({ limit: String(query.limit ?? 10) })
    // Omit the leaderboard param entirely to get ALL recent games (ranked +
    // Quick Match, 1v1 and team) — the API only returns rm_solo when filtered,
    // which silently hid every QM game from History.
    if (query.leaderboard) params.set('leaderboard', query.leaderboard)
    if (query.page) params.set('page', String(query.page))
    if (query.opponentProfileId) {
      params.set('opponent_profile_id', String(query.opponentProfileId))
    }
    if (query.since) params.set('since', query.since)
    // ttl 0 = always a cache miss → fresh fetch (results change after a game ends).
    return this.getJson(
      `/players/${profileId}/games?${params.toString()}`,
      query.fresh ? 0 : TTL.games,
    )
  }

  /**
   * Loads every page exposed by AoE4World's player-history endpoint. The API
   * returns a total_count but caps a single response, so callers that need a
   * complete account archive must not treat one response as the full history.
   */
  async getAllPlayerGames(
    profileId: number,
    options: { fresh?: boolean; pageSize?: number; maxGames?: number } = {},
  ): Promise<Game[]> {
    const pageSize = Math.max(1, Math.min(100, Math.floor(options.pageSize ?? 100)))
    const maxGames = Math.max(pageSize, Math.min(50_000, Math.floor(options.maxGames ?? 50_000)))
    const first = await this.getPlayerGames(profileId, {
      limit: pageSize,
      page: 1,
      fresh: options.fresh,
    })
    const games = [...first.games]
    const total = Number.isSafeInteger(first.total_count) ? first.total_count : games.length
    const pageCount = Math.min(Math.ceil(total / pageSize), Math.ceil(maxGames / pageSize))
    for (let page = 2; page <= pageCount && games.length < maxGames; page++) {
      const response = await this.getPlayerGames(profileId, {
        limit: pageSize,
        page,
        fresh: options.fresh,
      })
      if (response.games.length === 0) break
      games.push(...response.games)
      if (response.games.length < pageSize) break
    }
    const unique = new Map<number, Game>()
    for (const game of games) unique.set(game.game_id, game)
    return [...unique.values()].slice(0, maxGames)
  }

  getLastGame(profileId: number, query: LastGameQuery = {}): Promise<Game> {
    const params = new URLSearchParams()
    if (query.includeAlts != null) params.set('include_alts', String(query.includeAlts))
    if (query.includeCustom != null) params.set('include_custom', String(query.includeCustom))
    if (query.apiKey) params.set('api_key', query.apiKey)
    const suffix = params.toString() ? `?${params.toString()}` : ''
    return this.getJson(
      `/players/${profileId}/games/last${suffix}`,
      query.fresh ? 0 : TTL.lastGame,
    )
  }

  getGame(profileId: number, gameId: number): Promise<Game> {
    return this.getJson(`/players/${profileId}/games/${gameId}`, TTL.game)
  }

  /**
   * Bounded global game feed used by similarity search. The caller must keep
   * the page count small; AoE4World explicitly limits this endpoint to page
   * 20 and asks clients to use since/order cursors and local caching.
   */
  getGames(query: GlobalGamesQuery = {}): Promise<GamesResponse> {
    const params = new URLSearchParams({
      page: String(Math.max(1, Math.min(20, Math.floor(query.page ?? 1)))),
      per_page: String(Math.max(1, Math.min(50, Math.floor(query.perPage ?? 50)))),
    })
    if (query.leaderboard) params.set('leaderboard', query.leaderboard)
    if (query.profileIds?.length) params.set('profile_ids', query.profileIds.join(','))
    if (query.since) params.set('since', query.since)
    if (query.order) params.set('order', query.order)
    return this.getJson(`/games?${params.toString()}`, query.fresh ? 0 : TTL.games)
  }

  getLeaderboard(
    leaderboard: Leaderboard,
    query: { page?: number; country?: string; limit?: number; fresh?: boolean } = {},
  ): Promise<LeaderboardResponse> {
    const params = new URLSearchParams({ page: String(query.page ?? 1) })
    if (query.country) params.set('country', query.country)
    if (query.limit != null)
      params.set('limit', String(Math.max(1, Math.min(100, Math.floor(query.limit)))))
    return this.getJson(
      `/leaderboards/${leaderboard}?${params.toString()}`,
      query.fresh ? 0 : TTL.leaderboard,
    )
  }

  /** Loads the complete bounded leaderboard slice instead of silently keeping page 1. */
  async getAllLeaderboard(
    leaderboard: Leaderboard,
    options: { country?: string; pageSize?: number; maxPlayers?: number; fresh?: boolean } = {},
  ): Promise<LeaderboardPlayer[]> {
    const pageSize = Math.max(1, Math.min(100, Math.floor(options.pageSize ?? 100)))
    const maxPlayers = Math.max(
      pageSize,
      Math.min(100_000, Math.floor(options.maxPlayers ?? 100_000)),
    )
    const first = await this.getLeaderboard(leaderboard, {
      country: options.country,
      limit: pageSize,
      page: 1,
      fresh: options.fresh,
    })
    const rows = [...first.players]
    const reportedPageSize = first.per_page && first.per_page > 0 ? first.per_page : pageSize
    const total = Number.isSafeInteger(first.total_count) ? first.total_count : rows.length
    const pageCount = Math.min(
      Math.ceil(total / reportedPageSize),
      Math.ceil(maxPlayers / reportedPageSize),
    )
    for (let page = 2; page <= pageCount && rows.length < maxPlayers; page++) {
      const response = await this.getLeaderboard(leaderboard, {
        country: options.country,
        limit: pageSize,
        page,
        fresh: options.fresh,
      })
      if (response.players.length === 0) break
      rows.push(...response.players)
      if (response.players.length < reportedPageSize) break
    }
    const unique = new Map<number, LeaderboardPlayer>()
    for (const row of rows) unique.set(row.profile_id, row)
    return [...unique.values()].slice(0, maxPlayers)
  }

  getCivStats(query: StatsQuery = {}): Promise<CivStatsResponse> {
    const lb = query.leaderboard ?? 'rm_solo'
    const params = new URLSearchParams()
    if (query.rankLevel) params.set('rank_level', query.rankLevel)
    if (query.rating) params.set('rating', query.rating)
    if (query.patch) params.set('patch', query.patch)
    const qs = params.toString()
    return this.getJson(`/stats/${lb}/civilizations${qs ? `?${qs}` : ''}`, TTL.stats)
  }

  /**
   * Full civilization-by-map slice used by the Counter Calculator. This is a
   * first-class AoE4World endpoint; the map overview only exposes the single
   * highest-win-rate civ and is not enough to recommend counters.
   */
  getMapCivStats(mapId: number, query: StatsQuery = {}): Promise<CivStatsResponse> {
    const lb = query.leaderboard ?? 'rm_solo'
    const params = new URLSearchParams()
    if (query.rankLevel) params.set('rank_level', query.rankLevel)
    if (query.rating) params.set('rating', query.rating)
    if (query.patch) params.set('patch', query.patch)
    const qs = params.toString()
    return this.getJson(`/stats/${lb}/maps/${mapId}${qs ? `?${qs}` : ''}`, TTL.stats)
  }

  /**
   * Per-landmark ("ageup") analytics for one civ: path subsets with games/wins/
   * win-rate and age-up completion times. INTERNAL AoE4World endpoint (their
   * notice says subject to change) — callers must treat failures as "no data".
   */
  getAgeupStats(
    civilization: string,
    kind = 'rm_solo',
    query: StatsQuery = {},
  ): Promise<AgeupStatsResponse> {
    const params = new URLSearchParams({ kind, civilization })
    if (query.leaderboard) params.set('leaderboard', query.leaderboard)
    if (query.rankLevel) params.set('rank_level', query.rankLevel)
    if (query.rating) params.set('rating', query.rating)
    if (query.patch) params.set('patch', query.patch)
    return this.getJson(`/stats/analytics/ageups?${params.toString()}`, TTL.analytics)
  }

  getMatchupStats(query: StatsQuery = {}): Promise<MatchupStatsResponse> {
    const lb = query.leaderboard ?? 'rm_solo'
    const params = new URLSearchParams()
    // Rank bands are available for every Ranked Match queue, but not for
    // Quick Match.
    if (query.rankLevel && lb.startsWith('rm_')) {
      params.set('rank_level', query.rankLevel)
    }
    if (query.rating) params.set('rating', query.rating)
    if (query.patch) params.set('patch', query.patch)
    const qs = params.toString()
    return this.getJson(`/stats/${lb}/matchups${qs ? `?${qs}` : ''}`, TTL.stats)
  }

  /** Exact civilization-pair statistics, currently exposed for 2v2 only. */
  getTeamStats(query: StatsQuery = {}): Promise<TeamStatsResponse> {
    const lb = query.leaderboard === 'qm_2v2' ? 'qm_2v2' : 'rm_2v2'
    const params = new URLSearchParams()
    if (query.rating) params.set('rating', query.rating)
    if (query.patch) params.set('patch', query.patch)
    const qs = params.toString()
    return this.getJson(`/stats/${lb}/teams${qs ? `?${qs}` : ''}`, TTL.stats)
  }

  getMapStats(query: StatsQuery = {}): Promise<MapStatsResponse> {
    const lb = query.leaderboard ?? 'rm_solo'
    const params = new URLSearchParams()
    if (query.rankLevel) params.set('rank_level', query.rankLevel)
    if (query.rating) params.set('rating', query.rating)
    if (query.patch) params.set('patch', query.patch)
    if (query.includeCivs) params.set('include_civs', 'true')
    const qs = params.toString()
    return this.getJson(`/stats/${lb}/maps${qs ? `?${qs}` : ''}`, TTL.stats)
  }
}
