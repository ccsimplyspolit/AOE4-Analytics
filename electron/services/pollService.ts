import { Notification } from 'electron'
import { allPlayers, normalizeTeams, type Game } from '@api/types'
import {
  evaluateLiveMatch,
  attachLocalLiveMatchup,
  buildLiveMatchInfo,
  buildLiveMatchup,
  type LiveMatchup,
  type LivePlayerSnapshot,
  type LiveMatchInfo,
} from '@domain/liveMatch'
import { buildScoutReport, pickPrimaryMode } from '@domain/scouting'
import { sessionSummary, type SessionSummary } from '@domain/session'
import type { RankInfo } from '@domain/types'
import type { GameClock } from '@domain/localStats'
import { getClient, getHistoryStore, getMainWindow, getSettings } from './appContext'
import { aoe4WorldOwnQuery } from './aoe4WorldAccess'
import { analyzeRecentGames, listHistory } from './analysisService'
import { IpcChannels, type PostGameSummary } from '../ipc/contract'
import { getGameClock, getLiveTeamMatchup, getSessionState } from './localDataService'
import { isGameRunning } from './gameProcess'
import { cacheAccountReplay, cacheAccountSummary } from './replayArchiveService'
import { analyzeCachedReplay } from './replayCacheService'
import { getSteamAuthStatus } from './relicAuthService'
import type { OverlayController } from './overlayController'
import type { ApmTracker } from './apmService'
import type { Modes } from '@api/types'

const HIDE_AFTER_MS = 20_000
/** Keep the post-game results card up long enough to read (or until the next match). */
const POSTGAME_HIDE_MS = 90_000

/**
 * AoE4World exposes civilization usage inside each profile mode. Aggregate the
 * public mode slices so the live bar can show the player's actual most-played
 * civilizations, while retaining a safe fallback for sparse/private profiles.
 */
function favoriteCivsFromModes(modes: Modes): string[] {
  const counts = new Map<string, number>()
  for (const stats of Object.values(modes)) {
    if (!stats) continue
    const totalGames = stats.games_count ?? 0
    for (const civ of stats.civilizations ?? []) {
      const games =
        civ.games_count ??
        (civ.pick_rate != null && totalGames > 0 ? (totalGames * civ.pick_rate) / 100 : 0)
      if (games > 0) counts.set(civ.civilization, (counts.get(civ.civilization) ?? 0) + games)
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 3)
    .map(([civ]) => civ)
}

/**
 * Builds the post-game results card from the most-recent analyzed match — only if
 * it's the game that just finished (analyzed in the last few minutes). Maps the
 * coaching signals to "did well" (good) vs "improve" (minor/major).
 */
async function buildPostGame(): Promise<{ summary: PostGameSummary; matchId: string } | null> {
  const res = await listHistory(1)
  if (!res.ok) return null
  const m = res.data[0]
  if (!m) return null
  // Recency guard against showing a STALE game: measure from the game's END
  // (start + duration), not its start — guarding on createdAt/start silently
  // dropped the victory card for any game longer than the window.
  const endMs = Date.parse(m.playedAt) + (m.durationSec ?? 0) * 1000
  const sinceEndMs = Date.now() - endMs
  if (!Number.isFinite(sinceEndMs) || sinceEndMs > 10 * 60_000) return null
  const titles = (sevs: string[]): string[] =>
    m.analysis.signals.filter((s) => sevs.includes(s.severity)).map((s) => s.title)
  return {
    matchId: m.id,
    summary: {
      result: m.result,
      civ: m.civ,
      oppCiv: m.oppCiv,
      map: m.map,
      grade: m.analysis.grade,
      apm: m.analysis.apm,
      durationSec: m.durationSec,
      didWell: titles(['good']).slice(0, 3),
      improve: titles(['major', 'minor']).slice(0, 3),
      vsAI: !!m.vsAI,
    },
  }
}

const EMPTY_LIVE: LiveMatchInfo = {
  isLive: false,
  isStale: false,
  source: 'no-game',
  processRunning: null,
  custom: false,
  leaderboard: null,
  kind: null,
  averageMmr: null,
  averageRating: null,
  server: null,
  durationSec: null,
  myCiv: null,
  opponent: null,
  map: null,
  startedAt: null,
}

/**
 * Polls `games/last` and FUSES it with the game-process check and the local
 * session detector to decide whether a match is live RIGHT NOW (A3) — so a
 * stale "last game" is never shown as the current matchup. Drives the
 * overlay and exposes the current `LiveMatchInfo` for the dashboard.
 */
export class PollManager {
  private timer: ReturnType<typeof setTimeout> | null = null
  private hideTimer: ReturnType<typeof setTimeout> | null = null
  private running = false
  /** game_id currently shown as live (-1 = a custom/local game without an API id). */
  private shownGameId: number | null = null
  /** opponent profile id currently scouted (so we don't re-scout each tick). */
  private shownOppId: number | null = null
  /** Monotonic counter giving each custom/AI match a stable, unique overlay id. */
  private customMatchSeq = 0
  /** The current custom/AI match id while we resolve its civs from temp.rec. */
  private liveCustomMatchId: string | null = null
  /** Last civ matchup pushed for the custom game ("myCiv|oppCiv") — skip duplicates. */
  private lastCustomCivSig: string | null = null
  /**
   * Set once both civs have been resolved from warnings.log for the ongoing
   * custom match — stops re-reading the log on every tick of that same match.
   */
  private customMatchupResolved = false
  /** Last warnings.log roster for the active custom/AI match, reused by the dashboard query. */
  private liveCustomMatchup: LiveMatchup | null = null
  /** Cached LiveMatchInfo for the dashboard's getLiveMatch query (A3). */
  private currentLiveInfo: LiveMatchInfo = EMPTY_LIVE
  /** Cached session-today summary pushed with every overlay update. */
  private session: SessionSummary | null = null
  /** 1-second interval pushing the monotonic game clock into the overlay. */
  private clockTimer: ReturnType<typeof setInterval> | null = null
  /** Wall-clock anchor for the ongoing match's elapsed game seconds. */
  private clockAnchor: GameClock | null = null

  constructor(
    private readonly overlay: OverlayController,
    private readonly apm?: ApmTracker,
  ) {}

  start(): void {
    if (this.running) return
    this.running = true
    void this.tick()
  }

  stop(): void {
    this.running = false
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    if (this.hideTimer) {
      clearTimeout(this.hideTimer)
      this.hideTimer = null
    }
    this.stopClockPush()
  }

  getLiveInfo(): LiveMatchInfo {
    return this.currentLiveInfo
  }

  private async tick(): Promise<void> {
    if (!this.running) return
    let isLive = false
    try {
      isLive = await this.pollOnce()
    } catch {
      // transient network / process-check error — keep polling
    }
    if (!this.running) return
    const settings = getSettings().getAll().polling
    const interval = isLive ? settings.activeIntervalMs : settings.idleIntervalMs
    this.timer = setTimeout(() => void this.tick(), interval)
  }

  /**
   * One poll cycle: fetches games/last (if a profileId is configured), checks
   * process / session state, and evaluates live status.
   */
  private async pollOnce(): Promise<boolean> {
    const settings = getSettings().getAll()
    const profileId = settings.profileId

    // 1. Upstream last game (network) — null when unconfigured / offline
    let upstreamGame: Game | null = null
    if (profileId != null) {
      try {
        upstreamGame = await getClient().getLastGame(profileId, {
          includeStats: true,
          includeAlts: true,
          ...aoe4WorldOwnQuery(profileId),
        })
      } catch {
        upstreamGame = null
      }
    }

    // 2. Local process check + session detector (local-data)
    const processRunning = await isGameRunning().catch(() => null)
    const sessionState = getSessionState(Boolean(processRunning))
    const localInMatch = sessionState === 'in-match' ? true : sessionState === 'menu' ? false : null

    // 3. Fused evaluation
    const evaluation = evaluateLiveMatch({
      game: upstreamGame,
      localInMatch,
      processRunning,
      nowMs: Date.now(),
    })

    // 4. Update the cached query value for the dashboard
    const nextLiveInfo = buildLiveMatchInfo(upstreamGame, evaluation, processRunning, profileId)
    this.currentLiveInfo = attachLocalLiveMatchup(nextLiveInfo, this.liveCustomMatchup)

    // 5. Update APM tracker match context
    if (this.apm) {
      this.apm.setInMatch(evaluation.isLive)
    }

    // 6. Push to overlay on transitions
    await this.applyLiveTransition(evaluation, upstreamGame, profileId)

    // 7. Push live game-clock (A7) into the overlay when in a match
    const liveClock = evaluation.isLive ? getGameClock() : null
    if (liveClock) {
      this.clockAnchor = liveClock
      this.startClockPush()
    } else if (!evaluation.isLive) {
      this.stopClockPush()
    }

    return evaluation.isLive
  }

  private async applyLiveTransition(
    evaluation: ReturnType<typeof evaluateLiveMatch>,
    game: Game | null,
    myProfileId: number | null,
  ): Promise<void> {
    if (evaluation.isLive) {
      if (evaluation.source === 'ongoing') {
        const gameId = game?.game_id ?? null
        const info = this.currentLiveInfo
        const opp = info.opponent
        const oppId = opp?.profileId ?? null
        const isNewGame = gameId !== this.shownGameId
        if (isNewGame || oppId !== this.shownOppId) {
          this.shownGameId = gameId
          this.shownOppId = oppId
          this.liveCustomMatchId = null
          this.liveCustomMatchup = null
          await this.onStarted({
            matchId: String(gameId ?? 'live'),
            opponentProfileId: oppId,
            map: info.map,
            myCiv: info.myCiv,
            oppCiv: opp?.civ ?? null,
            startedAt: info.startedAt,
            custom: false,
            game,
            myProfileId,
          })
        }
      } else if (evaluation.source === 'local') {
        if (this.shownGameId !== -1) {
          this.shownGameId = -1
          this.shownOppId = null
          this.customMatchSeq += 1
          this.liveCustomMatchId = `custom-live-${this.customMatchSeq}`
          this.lastCustomCivSig = null
          this.customMatchupResolved = false
          this.liveCustomMatchup = null
          await this.onStarted({
            matchId: this.liveCustomMatchId,
            opponentProfileId: null,
            map: null,
            myCiv: null,
            oppCiv: null,
            startedAt: null,
            custom: true,
            game: null,
            myProfileId,
          })
        }
        if (this.liveCustomMatchId) {
          this.pushCustomMatchup(this.liveCustomMatchId)
        }
      }
    } else if (this.shownGameId != null) {
      this.shownGameId = null
      this.shownOppId = null
      this.liveCustomMatchId = null
      this.lastCustomCivSig = null
      this.customMatchupResolved = false
      this.liveCustomMatchup = null
      await this.onEnded(game)
    }
  }

  /**
   * Recomputes today's session summary from stored history — a raw store read
   * (listMatches), NOT listHistory, so a poll tick never triggers the summary
   * enrichment that listHistory performs as a side effect.
   */
  private async refreshSession(): Promise<void> {
    try {
      const store = await getHistoryStore()
      const s = sessionSummary(store.listMatches(60), Date.now(), {
        excludeAi: getSettings().getAll().localData.excludeAiFromStats,
      })
      this.session = s.games > 0 ? s : null
    } catch {
      this.session = null
    }
  }

  private async onStarted(ctx: {
    matchId: string
    opponentProfileId: number | null
    map: string | null
    myCiv: string | null
    oppCiv: string | null
    startedAt: string | null
    custom: boolean
    game?: Game | null
    myProfileId: number | null
  }): Promise<void> {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer)
      this.hideTimer = null
    }
    await this.refreshSession()
    const kind = ctx.game ? kindLabel(ctx.game) : ctx.custom ? 'Custom / AI' : null

    // Native Windows Notification on new match found
    try {
      if (Notification.isSupported()) {
        const myCivStr = ctx.myCiv ? ctx.myCiv.toUpperCase() : 'Вы'
        const oppCivStr = ctx.oppCiv
          ? ctx.oppCiv.toUpperCase()
          : ctx.custom
            ? 'AI / Соперник'
            : 'Соперник'
        const mapStr = ctx.map ? ` (${ctx.map})` : ''
        const notif = new Notification({
          title: '⚔️ RTSLytics: Новый матч начался!',
          body: `${myCivStr} vs ${oppCivStr}${mapStr}\nНажмите для открытия полной разведки противника!`,
        })
        notif.on('click', () => {
          const win = getMainWindow()
          if (win) {
            if (win.isMinimized()) win.restore()
            win.show()
            win.focus()
            win.webContents.send(IpcChannels.appOpenGame, ctx.matchId)
          }
        })
        notif.show()
      }
    } catch {
      /* notification non-fatal */
    }

    this.overlay.sendUpdate({
      matchState: 'ongoing',
      scout: null,
      myCiv: ctx.myCiv,
      map: ctx.map,
      startedAt: ctx.startedAt,
      custom: ctx.custom,
      matchId: ctx.matchId,
      oppCiv: ctx.oppCiv,
      oppName: null,
      oppIsAI: false,
      matchup: null,
      kind,
      session: this.session,
    })
    this.overlay.show()

    // Custom/AI games have no live game object → no matchup bar / scout.
    if (!ctx.game || ctx.custom) return
    try {
      const client = getClient()
      // One batch: every participant's profile (for ranks + the opponent scout).
      const ids = allPlayers(ctx.game).map((p) => p.profile_id)
      const players = await Promise.all(ids.map((id) => client.getPlayer(id).catch(() => null)))
      const rankByProfileId = new Map<number, RankInfo | LivePlayerSnapshot | null>(
        ids.map((id, i) => [
          id,
          players[i]
            ? {
                rank: pickPrimaryMode(players[i]!.modes),
                favoriteCivs: favoriteCivsFromModes(players[i]!.modes),
              }
            : null,
        ]),
      )
      const matchup = buildLiveMatchup(ctx.game, ctx.myProfileId, rankByProfileId)

      let scout = null
      if (ctx.opponentProfileId != null) {
        const oppPlayer = players[ids.indexOf(ctx.opponentProfileId)] ?? null
        const gamesRes = await client
          .getPlayerGames(ctx.opponentProfileId, { limit: 100 })
          .catch(() => null)
        if (oppPlayer && gamesRes)
          scout = buildScoutReport({ player: oppPlayer, games: gamesRes.games })
      }

      this.overlay.sendUpdate({
        matchState: 'ongoing',
        scout,
        myCiv: ctx.myCiv,
        map: ctx.map,
        startedAt: ctx.startedAt,
        custom: ctx.custom,
        matchId: ctx.matchId,
        oppCiv: ctx.oppCiv,
        oppName: null, // ranked uses scout.name
        oppIsAI: false,
        matchup,
        kind,
        session: this.session,
      })
    } catch {
      // private profile / network — keep the "scouting…" state
    }
  }

  /** Starts the 1s game-clock push loop (idempotent) and pushes immediately. */
  private startClockPush(): void {
    if (this.clockTimer) return
    this.overlay.sendGameClock(this.clockAnchor)
    this.clockTimer = setInterval(() => this.overlay.sendGameClock(this.clockAnchor), 1000)
  }

  /** Stops the game-clock loop and resets the overlay's clock (idempotent). */
  private stopClockPush(): void {
    if (!this.clockTimer) return
    clearInterval(this.clockTimer)
    this.clockTimer = null
    this.clockAnchor = null
    this.overlay.sendGameClock(null)
  }

  /**
   * Reads the live matchup from warnings.log and pushes it to the overlay the
   * moment it resolves (a beat into the game, once the roster lines are written).
   * The roster can't change mid-game, so once BOTH civs are known we stop reading.
   */
  private pushCustomMatchup(matchId: string): void {
    if (this.customMatchupResolved) return
    const matchup = getLiveTeamMatchup(getSettings().getAll().profileId)
    const myTeam = matchup?.teams[0] ?? []
    const enemyTeam = matchup?.teams[1] ?? []
    const me = myTeam.find((p) => p.isMe) ?? myTeam[0] ?? null
    const opp = enemyTeam[0] ?? null
    const myCiv = me?.civ ?? null
    const oppCiv = opp?.civ ?? null
    if (!matchup) return
    this.liveCustomMatchup = matchup
    this.currentLiveInfo = attachLocalLiveMatchup(this.currentLiveInfo, matchup)
    if (myCiv == null && oppCiv == null) return
    if (matchup.teams.length >= 2 && matchup.teams.flat().every((p) => p.civ != null)) {
      this.customMatchupResolved = true
    }
    const sig = matchup.teams.map((team) => team.map((p) => p.civ ?? '?').join(',')).join('|')
    if (sig === this.lastCustomCivSig) return
    this.lastCustomCivSig = sig
    this.overlay.sendUpdate({
      matchState: 'ongoing',
      scout: null,
      myCiv,
      map: null,
      startedAt: null,
      custom: true,
      matchId,
      oppCiv,
      oppName: enemyTeam.length > 1 ? 'Enemy Team' : (opp?.name ?? null),
      oppIsAI: enemyTeam.length > 0 && enemyTeam.every((p) => p.isAI),
      matchup,
      kind: 'Custom / AI',
      session: this.session,
    })
  }

  private async onEnded(game: Game | null): Promise<void> {
    const base = {
      matchState: 'ended' as const,
      scout: null,
      myCiv: null,
      map: game?.map ?? null,
      startedAt: game?.started_at ?? null,
      custom: false,
      matchId: null,
      oppCiv: null,
      oppName: null,
      oppIsAI: false,
      matchup: null,
      kind: null,
    }
    // Show "analyzing…" immediately, keep the overlay up, then push the results
    // card once the just-finished game has been analyzed + folded into history.
    this.overlay.sendUpdate({ ...base, postGame: null, session: this.session })
    this.overlay.show()
    let postGame: { summary: PostGameSummary; matchId: string } | null = null
    try {
      await analyzeRecentGames(10) // also folds a just-finished custom/AI game
      postGame = await buildPostGame()
    } catch {
      // best-effort
    }
    // The just-finished game is folded now — today's line includes it.
    await this.refreshSession()

    // Immediately auto-fetch summary & replay from Relic and deep-parse if connected
    if (game?.game_id && getSteamAuthStatus().connected) {
      const gid = game.game_id
      void (async () => {
        try {
          await cacheAccountSummary(gid)
          const res = await cacheAccountReplay(gid)
          if (res.ok && (res.data.status === 'cached' || res.data.status === 'already_cached')) {
            analyzeCachedReplay(gid)
          }
        } catch {
          // best-effort background pass
        }
      })()
    }

    if (postGame) {
      this.overlay.sendUpdate({ ...base, postGame: postGame.summary, session: this.session })
      // The user's requested flow: after a win/loss the APP comes to the front
      // on that game's full summary (the desktop score screen). Toggleable.
      if (getSettings().getAll().openSummaryOnGameEnd) this.openAppOnSummary(postGame.matchId)
    }
    if (this.hideTimer) clearTimeout(this.hideTimer)
    // Respect an explicit user toggle during the post-game window: if the user
    // Alt+O'd (or Settings-toggled) the overlay after the match ended, the
    // timed auto-hide backs off instead of clobbering their choice.
    const toggleSeqAtEnd = this.overlay.getManualToggleSeq()
    this.hideTimer = setTimeout(
      () => {
        if (this.overlay.getManualToggleSeq() === toggleSeqAtEnd) this.overlay.hide()
      },
      postGame ? POSTGAME_HIDE_MS : HIDE_AFTER_MS,
    )
  }

  /** Bring the dashboard to the front, opened on the finished game's summary. */
  private openAppOnSummary(matchId: string): void {
    const win = getMainWindow()
    if (!win) return
    win.webContents.send(IpcChannels.appOpenGame, matchId)
    if (win.isMinimized()) win.restore()
    win.show()
    win.focus()
  }
}

/** A center-label for the matchup bar, e.g. "Ranked 1v1" / "Quick Match 2v2". */
function kindLabel(game: Game): string {
  const sizes = normalizeTeams(game)
    .map((t) => t.length)
    .join('v')
  const k = game.kind || game.leaderboard || ''
  const prefix = k.startsWith('rm') ? 'Ranked' : k.startsWith('qm') ? 'Quick Match' : ''
  return prefix ? `${prefix} ${sizes}` : sizes
}
