import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Aoe4WorldClient, ApiError, TTL, USER_AGENT } from '../client'
import { DiskCache } from '../cache'
import { RateLimitGate } from '../fetchWithTimeout'
import { RateLimiter } from '../rateLimiter'
import { loadFixture } from './fixtures'

let dir: string

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'rtslytics-client-'))
})
afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

interface FakeFetch {
  fetch: typeof fetch
  calls: { url: string; headers: Record<string, string> }[]
}

/** A fake fetch that serves a body (or a status) and records calls. */
function fakeFetch(body: unknown, status = 200): FakeFetch {
  const calls: { url: string; headers: Record<string, string> }[] = []
  const fn = (async (url: string, init?: { headers?: Record<string, string> }) => {
    calls.push({ url: String(url), headers: init?.headers ?? {} })
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
      text: async () => JSON.stringify(body),
    }
  }) as unknown as typeof fetch
  return { fetch: fn, calls }
}

function makeClient(fetchFn: typeof fetch) {
  return new Aoe4WorldClient({
    cache: new DiskCache({ baseDir: dir }),
    rateLimiter: new RateLimiter({ minIntervalMs: 0 }),
    fetchFn,
    baseUrl: 'https://aoe4world.com/api/v0',
  })
}

describe('Aoe4WorldClient', () => {
  it('parses a search response', async () => {
    const fx = loadFixture('search-beasty.json')
    const client = makeClient(fakeFetch(fx).fetch)
    const res = await client.searchPlayers('beasty')
    expect(res.players.length).toBeGreaterThan(0)
  })

  it('sends the honest User-Agent header', async () => {
    const fake = fakeFetch(loadFixture('player-10240693.json'))
    const client = makeClient(fake.fetch)
    await client.getPlayer(10240693)
    expect(fake.calls[0]!.headers['User-Agent']).toBe(USER_AGENT)
  })

  it('caches: a second identical call does not hit fetch again', async () => {
    const fake = fakeFetch(loadFixture('player-10240693.json'))
    const client = makeClient(fake.fetch)
    await client.getPlayer(10240693)
    await client.getPlayer(10240693)
    expect(fake.calls.length).toBe(1)
  })

  it('bypasses the leaderboard cache when fresh is requested', async () => {
    const body = { total_count: 1, count: 1, per_page: 50, players: [] }
    const fake = fakeFetch(body)
    const client = makeClient(fake.fetch)

    await client.getLeaderboard('rm_solo')
    await client.getLeaderboard('rm_solo')
    expect(fake.calls).toHaveLength(1)

    await client.getLeaderboard('rm_solo', { fresh: true })
    expect(fake.calls).toHaveLength(2)
  })

  it('follows leaderboard pages and de-duplicates profile rows', async () => {
    const calls: string[] = []
    const player = (id: number) => ({
      profile_id: id,
      name: `P${id}`,
      rating: 1000,
      rank: id,
    })
    const fetchFn = (async (url: string) => {
      calls.push(url)
      const page = Number(new URL(url).searchParams.get('page'))
      return {
        ok: true,
        status: 200,
        json: async () => ({
          total_count: 3,
          per_page: 2,
          players: page === 1 ? [player(1), player(2)] : [player(2), player(3)],
        }),
      }
    }) as unknown as typeof fetch
    const client = makeClient(fetchFn)

    const players = await client.getAllLeaderboard('rm_solo', { pageSize: 2, fresh: true })

    expect(players.map((row) => row.profile_id)).toEqual([1, 2, 3])
    expect(calls).toHaveLength(2)
    expect(calls[1]).toContain('page=2')
    expect(calls[0]).toContain('limit=2')
  })

  it('coalesces concurrent identical cache misses', async () => {
    const fake = fakeFetch(loadFixture('player-10240693.json'))
    const client = makeClient(fake.fetch)
    const [first, second] = await Promise.all([
      client.getPlayer(10240693),
      client.getPlayer(10240693),
    ])
    expect(first).toEqual(second)
    expect(fake.calls.length).toBe(1)
  })

  it('clears a failed in-flight request so a later call can retry', async () => {
    const fake = fakeFetch({ error: 'unavailable' }, 503)
    const client = makeClient(fake.fetch)
    const attempts = await Promise.allSettled([client.getPlayer(123), client.getPlayer(123)])
    expect(attempts.every((attempt) => attempt.status === 'rejected')).toBe(true)
    expect(fake.calls.length).toBe(1)

    await expect(client.getPlayer(123)).rejects.toBeInstanceOf(ApiError)
    expect(fake.calls.length).toBe(2)
  })

  it('keeps the request pending and retries an AoE4World rate limit', async () => {
    const delays: number[] = []
    let now = 0
    const gate = new RateLimitGate({
      now: () => now,
      delay: async (ms) => {
        delays.push(ms)
        now += ms
      },
    })
    const responses = [
      {
        ok: false,
        status: 429,
        headers: new Headers({ 'Retry-After': '2' }),
        json: async () => ({ error: 'rate limited' }),
      },
      {
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => loadFixture('player-10240693.json'),
      },
    ]
    const fetchFn = (async () => {
      const response = responses.shift()
      if (!response) throw new Error('Unexpected request')
      return response
    }) as unknown as typeof fetch
    const client = new Aoe4WorldClient({
      cache: new DiskCache({ baseDir: dir }),
      rateLimiter: new RateLimiter({ minIntervalMs: 0 }),
      fetchFn,
      baseUrl: 'https://aoe4world.com/api/v0',
      fetchOptions: { rateLimitGate: gate },
    })

    const player = await client.getPlayer(10240693)

    expect(player.profile_id).toBe(10240693)
    expect(delays).toEqual([2_000])
  })

  it('uses a recent stale response while AoE4World is cooling down', async () => {
    let now = 0
    const cache = new DiskCache({ baseDir: dir, now: () => now })
    const gate = new RateLimitGate({ now: () => now, delay: async () => {} })
    const url = 'https://aoe4world.com/api/v0/players/10240693'
    const cachedPlayer = loadFixture('player-10240693.json')
    cache.set(url, cachedPlayer)
    now += TTL.profile + 1
    gate.defer(new Headers({ 'Retry-After': '2' }))
    const fetchFn = (async () => {
      throw new Error('A stale response must avoid another request during cooldown')
    }) as unknown as typeof fetch
    const client = new Aoe4WorldClient({
      cache,
      rateLimiter: new RateLimiter({ minIntervalMs: 0 }),
      fetchFn,
      baseUrl: 'https://aoe4world.com/api/v0',
      fetchOptions: { rateLimitGate: gate },
    })

    const player = await client.getPlayer(10240693)

    expect(player.profile_id).toBe(10240693)
  })

  it('falls back to the persisted response after a transient upstream failure', async () => {
    let now = 0
    const cache = new DiskCache({ baseDir: dir, now: () => now })
    let calls = 0
    const fetchFn = (async () => {
      calls += 1
      if (calls === 1) {
        return {
          ok: true,
          status: 200,
          json: async () => loadFixture('player-10240693.json'),
        }
      }
      return { ok: false, status: 503, json: async () => ({ error: 'busy' }) }
    }) as unknown as typeof fetch
    const client = new Aoe4WorldClient({
      cache,
      rateLimiter: new RateLimiter({ minIntervalMs: 0 }),
      fetchFn,
      baseUrl: 'https://aoe4world.com/api/v0',
    })

    await client.getPlayer(10240693)
    now += TTL.profile + 1
    const stale = await client.getPlayer(10240693)

    expect(stale.profile_id).toBe(10240693)
    expect(calls).toBe(2)
  })

  it('retries transient server responses when enabled by the production client', async () => {
    const responses = [
      { ok: false, status: 503, json: async () => ({ error: 'busy' }) },
      { ok: true, status: 200, json: async () => loadFixture('player-10240693.json') },
    ]
    const fetchFn = (async () => responses.shift()!) as unknown as typeof fetch
    const client = new Aoe4WorldClient({
      cache: new DiskCache({ baseDir: dir }),
      rateLimiter: new RateLimiter({ minIntervalMs: 0 }),
      fetchFn,
      baseUrl: 'https://aoe4world.com/api/v0',
      fetchOptions: { transientRetries: 1, transientSleep: async () => {} },
    })

    const player = await client.getPlayer(10240693)

    expect(player.profile_id).toBe(10240693)
  })

  it('parses games/last into a Game with ongoing=false', async () => {
    const client = makeClient(fakeFetch(loadFixture('games-last-10240693.json')).fetch)
    const game = await client.getLastGame(10240693)
    expect(game.ongoing).toBe(false)
    expect(game.teams.length).toBe(2)
  })

  it('passes the AoE4World overlay current-game options', async () => {
    const fake = fakeFetch(loadFixture('games-last-10240693.json'))
    const client = makeClient(fake.fetch)
    await client.getLastGame(10240693, {
      includeAlts: true,
      includeCustom: true,
      fresh: true,
    })
    const url = new URL(fake.calls[0]!.url)
    expect(url.pathname).toBe('/api/v0/players/10240693/games/last')
    expect(url.searchParams.get('include_alts')).toBe('true')
    expect(url.searchParams.get('include_custom')).toBe('true')
  })

  it('passes the overlay api_key on last-game and player-games requests', async () => {
    const fake = fakeFetch(loadFixture('games-last-10240693.json'))
    const client = makeClient(fake.fetch)
    await client.getLastGame(10240693, { apiKey: 'overlay-test-key', includeCustom: true })
    await client.getPlayerGames(10240693, { apiKey: 'overlay-test-key', includeCustom: true, limit: 5 })
    expect(new URL(fake.calls[0]!.url).searchParams.get('api_key')).toBe('overlay-test-key')
    expect(new URL(fake.calls[1]!.url).searchParams.get('api_key')).toBe('overlay-test-key')
    expect(new URL(fake.calls[1]!.url).searchParams.get('include_custom')).toBe('true')
  })

  it('passes documented search, autocomplete, stats and esports query params', async () => {
    const fake = fakeFetch({ players: [], total_count: 0, count: 0 })
    const client = makeClient(fake.fetch)
    await client.searchPlayers('beasty', { exact: true, page: 2 })
    await client.autocompletePlayers('bar', 'qm_1v1', { limit: 10 })
    await client.getLeaderboard('rm_solo', {
      search: 'barbecue',
      profileIds: [6943917, 1270139],
      time: '2022-04-19T08:36:35.000Z',
    })
    await client.getEsportsLeaderboard(1, {
      search: 'marinelord',
      showInactive: true,
      country: 'fr',
    })
    await client.getLastGame(10240693, { includeStats: true, fresh: true })
    await client.getPlayerGames(10240693, { includeAlts: true, limit: 5 })
    await client.getGame(6943917, 123893928, { includeAlts: true })
    await client.getGames({ order: 'updated_at', updatedSince: '2022-04-19T08:36:35.000Z' })

    expect(new URL(fake.calls[0]!.url).searchParams.get('exact')).toBe('true')
    expect(new URL(fake.calls[1]!.url).pathname).toBe('/api/v0/players/autocomplete')
    expect(new URL(fake.calls[1]!.url).searchParams.get('limit')).toBe('10')
    expect(new URL(fake.calls[2]!.url).searchParams.get('query')).toBe('barbecue')
    expect(new URL(fake.calls[2]!.url).searchParams.get('profile_id')).toBe('6943917,1270139')
    expect(new URL(fake.calls[3]!.url).pathname).toBe('/api/v0/esports/leaderboards/1')
    expect(new URL(fake.calls[3]!.url).searchParams.get('show_inactive')).toBe('true')
    expect(new URL(fake.calls[3]!.url).searchParams.get('country')).toBe('fr')
    expect(new URL(fake.calls[4]!.url).searchParams.get('include_stats')).toBe('true')
    expect(new URL(fake.calls[5]!.url).searchParams.get('include_alts')).toBe('true')
    expect(new URL(fake.calls[6]!.url).pathname).toBe('/api/v0/players/6943917/games/123893928')
    expect(new URL(fake.calls[6]!.url).searchParams.get('include_alts')).toBe('true')
    expect(new URL(fake.calls[7]!.url).searchParams.get('updated_since')).toBe(
      '2022-04-19T08:36:35.000Z',
    )
    expect(new URL(fake.calls[7]!.url).searchParams.get('order')).toBe('updated_at')
  })

  it('throws ApiError on a non-2xx response', async () => {
    const client = makeClient(fakeFetch({ error: 'not found' }, 404).fetch)
    await expect(client.getPlayer(123)).rejects.toBeInstanceOf(ApiError)
    await expect(client.getPlayer(123)).rejects.toMatchObject({ status: 404 })
  })

  it('builds the games query with leaderboard + limit + since', async () => {
    const fake = fakeFetch(loadFixture('games-10240693-rmsolo.json'))
    const client = makeClient(fake.fetch)
    await client.getPlayerGames(10240693, {
      leaderboard: 'rm_solo',
      limit: 12,
      since: '2024-01-01',
    })
    const url = fake.calls[0]!.url
    expect(url).toContain('leaderboard=rm_solo')
    expect(url).toContain('limit=12')
    expect(url).toContain('since=2024-01-01')
  })

  it('follows every account-history page instead of stopping at the first response', async () => {
    const calls: string[] = []
    const game = (id: number) => ({
      game_id: id,
      started_at: `2024-01-0${id}T00:00:00Z`,
      duration: 600,
      map: 'Dry Arabia',
      kind: 'rm_1v1',
      leaderboard: 'rm_solo',
      ongoing: false,
      just_finished: false,
      teams: [],
    })
    const fetchFn = (async (url: string) => {
      calls.push(url)
      const page = Number(new URL(url).searchParams.get('page'))
      return {
        ok: true,
        status: 200,
        json: async () => ({
          total_count: 2,
          count: 1,
          games: [game(page)],
        }),
      }
    }) as unknown as typeof fetch
    const client = makeClient(fetchFn)

    const games = await client.getAllPlayerGames(10240693, { pageSize: 1, fresh: true })

    expect(games.map((item) => item.game_id)).toEqual([1, 2])
    expect(calls).toHaveLength(2)
    expect(calls[1]).toContain('page=2')
  })

  it('honours AoE4World server-side page caps when the requested limit is larger', async () => {
    const calls: string[] = []
    const game = (id: number) => ({
      game_id: id,
      started_at: '2024-01-01T00:00:00Z',
      duration: 600,
      map: 'Highwoods',
      kind: 'rm_1v1',
      leaderboard: 'rm_solo',
      ongoing: false,
      just_finished: false,
      teams: [],
    })
    const fetchFn = (async (url: string) => {
      calls.push(url)
      const page = Number(new URL(url).searchParams.get('page'))
      const count = page < 3 ? 50 : 20
      return {
        ok: true,
        status: 200,
        json: async () => ({
          total_count: 120,
          per_page: 50,
          count,
          games: Array.from({ length: count }, (_, index) => game((page - 1) * 50 + index + 1)),
        }),
      }
    }) as unknown as typeof fetch
    const client = makeClient(fetchFn)

    const games = await client.getAllPlayerGames(10240693, { pageSize: 100, fresh: true })

    expect(games).toHaveLength(120)
    expect(calls).toHaveLength(3)
    expect(calls[2]).toContain('page=3')
  })

  it('filters head-to-head games by opponent and coalesces identical requests', async () => {
    const fake = fakeFetch(loadFixture('games-10240693-rmsolo.json'))
    const client = makeClient(fake.fetch)

    await Promise.all([
      client.getPlayerGames(10240693, { limit: 20, opponentProfileId: 4635035 }),
      client.getPlayerGames(10240693, { limit: 20, opponentProfileId: 4635035 }),
    ])

    expect(fake.calls).toHaveLength(1)
    expect(fake.calls[0]!.url).toContain('limit=20')
    expect(fake.calls[0]!.url).toContain('opponent_profile_id=4635035')
  })

  it('filters quick-match matchup stats by supported rating and patch', async () => {
    const fake = fakeFetch(loadFixture('stats-rmsolo-matchups.json'))
    const client = makeClient(fake.fetch)

    await Promise.all([
      client.getMatchupStats({
        leaderboard: 'qm_1v1',
        rating: '1100-1199',
        patch: '12.1',
      }),
      client.getMatchupStats({
        leaderboard: 'qm_1v1',
        rating: '1100-1199',
        patch: '12.1',
      }),
    ])

    expect(fake.calls).toHaveLength(1)
    expect(fake.calls[0]!.url).toContain('/stats/qm_1v1/matchups?')
    expect(fake.calls[0]!.url).not.toContain('rank_level')
    expect(fake.calls[0]!.url).toContain('rating=1100-1199')
    expect(fake.calls[0]!.url).toContain('patch=12.1')
  })

  it('sends rank filtering for ranked team matchup stats', async () => {
    const fake = fakeFetch(loadFixture('stats-rmsolo-matchups.json'))
    const client = makeClient(fake.fetch)

    await client.getMatchupStats({ leaderboard: 'rm_2v2', rankLevel: 'gold' })

    expect(fake.calls[0]!.url).toContain('/stats/rm_2v2/matchups')
    expect(fake.calls[0]!.url).toContain('rank_level=gold')
  })

  it('requests the full civilization-by-map slice', async () => {
    const fake = fakeFetch({
      leaderboard: 'rm_solo',
      rank_level: null,
      rating: null,
      patch: '11308',
      map_id: 163361,
      map: 'Dry Arabia',
      data: [],
    })
    const client = makeClient(fake.fetch)

    await client.getMapCivStats(163361, { leaderboard: 'rm_solo', rankLevel: 'diamond' })

    expect(fake.calls[0]!.url).toContain('/stats/rm_solo/maps/163361?')
    expect(fake.calls[0]!.url).toContain('rank_level=diamond')
  })
})
