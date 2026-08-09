/**
 * The single source of truth for the IPC surface between the Electron main
 * process and the renderer windows. Pure types + channel-name constants — no
 * Electron or Node imports, so both `preload.ts` (main side) and the renderer
 * can import it. The exposed `RtslyticsApi` is what `window.rtslytics` provides.
 *
 * This contract grows one block per phase; the renderer never calls IPC
 * channels directly, only through the typed `window.rtslytics.*` methods.
 */
import type { RankInfo, RecentForm, ScoutReport } from '@domain/types'
import type { CivTier } from '@domain/tierList'
import type { MapStat } from '@domain/mapStats'
import type { LeaderboardRow } from '@domain/leaderboard'
import type { CivDetailStats } from '@domain/civDetailStats'
import type { LiveMatchInfo, LiveOpponent, LiveMatchup, MatchupPlayer } from '@domain/liveMatch'
import type { ReplayInfo, ReplayMatchup, ReplayPlayer } from '@domain/replay'
import type { ReplayAnalysisResult } from '@domain/replayCommand'
import type { AppSettings, AppSettingsPatch, OverlaySettings } from '@store/settings'
import type { SessionSummary } from '@domain/session'
import type { StoredMatch } from '@store/historyStore'
import type { MatchSummary } from '@domain/statsSummary'
import type { BuildAuditHistoryRow } from '@domain/buildOrderHistory'
import type { MatchCorpusReport } from '@domain/matchCorpus'
import type { PerPlayerMatchStats } from '@domain/analysis'
import type { LocalMatch } from '@domain/localMatch'
import type { SteamAccount } from '@domain/steamAccounts'
import type { GameClock } from '@domain/localStats'
import type { LandmarkRecordRow } from '@domain/landmarkRecord'
import type { LandmarkStatRow } from '@domain/landmarkStats'
import type { GlobalMatchupSummary } from '@domain/matchupLab'
import type { LastMatchCoachContext } from '@domain/coachContext'
import type { TwitchVodFinderInput, TwitchVodLookupResult } from '@domain/twitchVodFinder'
import type { VideoAnalysisInput, VideoAnalysisRecord } from '@domain/videoAnalysis'
import type { GameplayAutoInput, GameplayAutoResult } from '@domain/gameplayAuto'
import type { BuildOrder } from '@domain/buildOrderSchema'
import type { SourceSyncOptions, SourceSyncResult } from '@domain/sourceSync'
import type { RankedMapPoolResolution } from '@domain/rankedMapPool'
import type { SimilarMatchCandidate, SimilarMatchQuery } from '@domain/similarMatch'
import type { ScoutMetaContext, ScoutMetaMatch, ScoutMetaPlayer } from '@domain/scoutMeta'
import type { Game, Leaderboard, RankLevel, StatsLeaderboard } from '@api/types'
import type {
  TranslationBatchInput,
  TranslationBatchResult,
  TranslationConfigInput,
  TranslationStatus,
} from '../services/translationService'
import type { ExternalApiConfigInput, ExternalApiStatus } from '../services/externalApiService'
import type { ReplaysApiStatus } from '../services/replaysApiService'

export type Platform = 'win32' | 'darwin' | 'linux' | (string & {})

/** Local HTTP broadcast-board state shared by the caster control server. */
export interface StreamManagerTheme {
  /** Accent used for borders, labels and the center score separator. */
  accentColor: string
  /** First and second stops of the card background gradient. */
  backgroundStart: string
  backgroundEnd: string
  /** Multiplier for the complete browser-source graphic. */
  fontScale: number
  /** Dense layout keeps the card usable at small OBS source sizes. */
  compact: boolean
  /** Optional CSS-only customization for the local OBS/browser source. */
  customCss: string
}

/**
 * Optional first-player overrides for the local live browser source. This is
 * the safe, structured equivalent of the casting/replay override tab in
 * community overlays: no arbitrary script is evaluated and the detected
 * roster remains untouched in the native overlay.
 */
export interface StreamLiveOverrideSide {
  name: string
  civ: string
  rank: string
}

export interface StreamLiveOverride {
  left: StreamLiveOverrideSide
  right: StreamLiveOverrideSide
}

export interface StreamManagerState {
  visible: boolean
  leftName: string
  rightName: string
  leftCiv: string
  rightCiv: string
  leftScore: number
  rightScore: number
  bestOf: number
  map: string
  /** Optional multi-map series state, compatible with the simple legacy `map` field. */
  maps?: string[]
  mapIndex?: number
  /** Optional civ draft state used by tournament graphics. */
  civDraft?: {
    leftBans: string[]
    rightBans: string[]
    leftPicks: string[]
    rightPicks: string[]
  }
  caster: string
  spoiler: boolean
  countdownEndsAt: number | null
  theme?: StreamManagerTheme
  liveOverride?: StreamLiveOverride
  updatedAt: number
}

export interface StreamManagerStatus {
  running: boolean
  port: number
  state: StreamManagerState
}

/** Normalized finished draft returned by the AoE2 Captains Mode importer. */
export interface StreamDraftImport {
  sourceUrl: string
  leftName?: string
  rightName?: string
  civDraft: NonNullable<StreamManagerState['civDraft']>
}

/** Lightweight card returned by the public AOE4 Builds catalogue page. */
export interface CommunityBuildSummary {
  id: string
  url: string
  name: string
  civilization: string | null
  description: string | null
  openness: string | null
  strategy: string | null
  difficulty: string | null
  author: string | null
  uploader: string | null
  views: number | null
  likes: string | null
}

/**
 * Compact card returned by the public AoE4Guides API. The full normalized
 * build is included so a user can preview it without a second network round
 * trip; the source URL remains the canonical provider reference.
 */
export interface Aoe4GuidesBuildSummary {
  id: string
  url: string
  name: string
  civilization: string
  author: string | null
  strategy: string | null
  map: string | null
  video: string | null
  score: number | null
  views: number | null
  likes: number | null
  season: number | null
  updatedAt: string | null
  stepCount: number
  build: BuildOrder
}

export const IpcChannels = {
  appGetVersion: 'app:getVersion',
  appPing: 'app:ping',
  appGetPlatform: 'app:getPlatform',
  // Phase 1
  profileSearch: 'profile:search',
  profileSetCurrent: 'profile:setCurrent',
  profileSetActive: 'profile:setActive',
  profileRemove: 'profile:remove',
  profileDashboard: 'profile:dashboard',
  scoutGet: 'scout:get',
  scoutHistoryGet: 'scout:historyGet',
  scoutMetaGet: 'scout:metaGet',
  tinctureCoachGet: 'tincture:coachGet',
  settingsGet: 'settings:get',
  settingsUpdate: 'settings:update',
  // Phase 2
  civMetaGet: 'civMeta:get',
  rankedMapPoolGet: 'rankedMapPool:get',
  matchupLabGet: 'matchupLab:get',
  civDetailGet: 'civDetail:get',
  leaderboardGet: 'leaderboard:get',
  // Phase 3
  analysisAnalyzeRecent: 'analysis:analyzeRecent',
  analysisHistory: 'analysis:history',
  analysisGameSummary: 'analysis:gameSummary',
  analysisBuildAuditHistory: 'analysis:buildAuditHistory',
  analysisCorpusReport: 'analysis:corpusReport',
  analysisDeleteMatch: 'analysis:deleteMatch',
  civLandmarkRecord: 'civ:landmarkRecord',
  civLandmarkStats: 'civ:landmarkStats',
  steamAuthStatus: 'steam:authStatus',
  steamStartLogin: 'steam:startLogin',
  steamStartCredentialsLogin: 'steam:startCredentialsLogin',
  steamSubmitSteamGuardCode: 'steam:submitSteamGuardCode',
  steamLogout: 'steam:logout',
  steamTestRankedFetch: 'steam:testRankedFetch',
  // Phase 4 (main → overlay renderer pushes)
  overlayUpdate: 'overlay:update',
  // Main-process hotkeys use this channel for build-order cycling and step
  // control while the overlay remains click-through over the game.
  overlayControl: 'overlay:control',
  overlayLock: 'overlay:lock',
  overlaySettings: 'overlay:settings',
  // Live game-clock anchor (sim start + pauses), pushed at 1s cadence by the
  // poll loop while a match is live; null on match end.
  overlayGameClock: 'overlay:gameClock',
  overlayApm: 'overlay:apm',
  /** Main-process live-detection diagnostics for the overlay status pill. */
  overlayDetection: 'overlay:detection',
  // Phase 4.5
  localDataStatus: 'localData:status',
  // Phase 5
  overlayApplySettings: 'overlay:applySettings',
  overlayToggle: 'overlay:toggle',
  /** Toggle the draggable widget-placement preview (also available through the hotkey). */
  overlayTogglePlacement: 'overlay:togglePlacement',
  // Overlay renderer → main: post-game card interactivity. The locked overlay
  // is click-through; while the card is up the main process forwards mouse
  // moves, the renderer hit-tests its ✕ button, and these two channels toggle
  // real clicks on it / dismiss the card.
  overlayInteractive: 'overlay:interactive',
  overlayDismissPostGame: 'overlay:dismissPostGame',
  // Custom window chrome (the main window is frameless; the renderer draws its
  // own title bar + min/max/close, so it drives the window through these).
  windowMinimize: 'window:minimize',
  windowMaximizeToggle: 'window:maximizeToggle',
  windowClose: 'window:close',
  windowIsMaximized: 'window:isMaximized',
  windowMaximizedChanged: 'window:maximizedChanged',
  // Main-process → dashboard: open a stored game's full post-game summary
  // (pushed when a match ends, if openSummaryOnGameEnd is enabled).
  appOpenGame: 'app:openGame',
  // Main-process → dashboard: the live civ for civilization themes (slug while
  // a match is ongoing, null when it ends).
  appCivTheme: 'app:civTheme',
  // Steam community avatar for a SteamID64 (data URL, disk-cached).
  steamAvatar: 'steam:avatar',
  // Live match + launcher
  gameLive: 'game:live',
  gameLaunch: 'game:launch',
  gameLocalMatch: 'game:localMatch',
  steamDetect: 'steam:detect',
  replayLatest: 'replay:latest',
  replayList: 'replay:list',
  replayAccount: 'replay:account',
  replayAccountAll: 'replay:accountAll',
  replayCache: 'replay:cache',
  replayCacheBatch: 'replay:cacheBatch',
  summaryCache: 'summary:cache',
  summaryCacheBatch: 'summary:cacheBatch',
  /** Readiness and provenance of the optional aoe4world/replays-api decoder. */
  replaysApiStatus: 'replaysApi:status',
  replayAnalyze: 'replay:analyze',
  replayFullAnalyze: 'replay:fullAnalyze',
  matchupWinRate: 'matchup:winRate',
  publicGameGet: 'publicGame:get',
  similarMatchesFind: 'similarMatches:find',
  onlineSearch: 'online:search',
  dumpCatalogGet: 'dumpCatalog:get',
  sourceSync: 'source:sync',
  beastyNumber: 'beasty:number',
  streamGetStatus: 'stream:getStatus',
  streamStart: 'stream:start',
  streamStop: 'stream:stop',
  streamUpdate: 'stream:update',
  streamReset: 'stream:reset',
  streamImportDraft: 'stream:importDraft',
  communityBuildImport: 'community:buildImport',
  communityBuildList: 'community:buildList',
  aoe4GuidesBuildList: 'aoe4guides:buildList',
  /** Exact VOD lookup through AoE4World's public Twitch Video Finder. */
  twitchVodFind: 'twitch:vodFind',
  /** Best-effort caption/transcript extraction and build/tactic distillation. */
  videoAnalysisExtract: 'video:analysisExtract',
  videoAnalysisList: 'video:analysisList',
  gameplayAutoFind: 'gameplay:autoFind',
  translationStatus: 'translation:status',
  translationConfigure: 'translation:configure',
  translationBatch: 'translation:batch',
  translationClearCache: 'translation:clearCache',
  externalApiStatus: 'externalApi:status',
  externalApiConfigure: 'externalApi:configure',
  externalApiClear: 'externalApi:clear',
} as const

// Live-match + replay types live in the domain (so they're pure + unit-tested)
// and are re-exported here as part of the IPC surface.
export type {
  LiveMatchInfo,
  LiveOpponent,
  LiveMatchup,
  MatchupPlayer,
  ReplayMatchup,
  ReplayPlayer,
  ReplayAnalysisResult,
}

/** The most-recent local replay (custom/AI games included), split me vs opponents. */
export interface LatestReplay extends ReplayMatchup {
  /** File mtime of the replay (≈ when the game was played). */
  recordedAtMs: number
  /**
   * The human opponent resolved to an AoE4World profile via their Steam id — the
   * scout `match_history.jsn` can't give (it logs custom opponents as `-1`). Null
   * for vs-AI games or when the Steam id doesn't resolve.
   */
  opponent: PlayerSearchHit | null
}

/** A header-indexed local replay, with a link to the matching detailed review when available. */
export interface ReplayArchiveItem {
  id: string
  source: 'matchhistory' | 'playback'
  recordedAtMs: number
  matchId: string | null
  /** A match-history folder can exist without a saved replay.rec. */
  hasReplay: boolean
  hasStatsSummary: boolean
  info: ReplayInfo | null
  localMatch: LocalMatch | null
}

export interface ReplayArchivePage {
  items: ReplayArchiveItem[]
  page: number
  pageSize: number
  totalCount: number
  hasNext: boolean
}

export type ReplayCacheStatus = 'cached' | 'available' | 'unavailable' | 'not_checked'

export interface AccountReplayItem {
  game: Game
  historySource: 'aoe4world' | 'relic' | 'merged'
  replayAvailable: boolean
  summaryAvailable: boolean
  summaryCached: boolean
  cacheStatus: ReplayCacheStatus
  cacheSizeBytes: number | null
}

export interface AccountReplayPage {
  items: AccountReplayItem[]
  page: number
  pageSize: number
  totalCount: number
  hasNext: boolean
  aoe4WorldCount: number
  relicCount: number
  relicOnlyCount: number
}

/** Complete persisted account history, with cache availability refreshed. */
export interface AccountReplayArchive {
  items: AccountReplayItem[]
  totalCount: number
  cachedAt: string
  aoe4WorldCount: number
  relicCount: number
  relicOnlyCount: number
}

export interface ReplayCacheResult {
  gameId: number
  status: 'cached' | 'already_cached' | 'unavailable'
  sizeBytes: number | null
  path: string | null
}

export interface ReplayCacheBatchResult {
  attempted: number
  cached: number
  alreadyCached: number
  unavailable: number
  results: ReplayCacheResult[]
}

export interface SummaryCacheResult {
  gameId: number
  status: 'cached' | 'already_cached' | 'unavailable'
  sizeBytes: number | null
  path: string | null
}

export interface SummaryCacheBatchResult {
  attempted: number
  cached: number
  alreadyCached: number
  unavailable: number
  results: SummaryCacheResult[]
}

export type ReplayAnalysisTarget = { localId: string } | { gameId: number }

/** Combined online replay package: raw replay download + command stream + post-game summary. */
export interface FullReplayAnalysis {
  gameId: number
  download: ReplayCacheResult
  replay: ReplayAnalysisResult | null
  summary: MatchSummary | null
  summaryStatus: 'available' | 'unavailable'
  /** Explicit coverage keeps a missing Relic upload from looking like an empty replay. */
  coverage: {
    replay: 'full' | 'partial' | 'header-only' | 'unavailable'
    summary: boolean
  }
}

export interface LaunchResult {
  ok: boolean
  message?: string
}

export interface LocalDataStatus {
  platform: string
  /** Whether the user has granted one-time consent (A1). */
  consentGranted: boolean
  /** consent + Windows + warnings.log present. */
  available: boolean
  gameDir: string
  logExists: boolean
}

export type OverlayMatchState = 'idle' | 'ongoing' | 'ended'

/** Why the overlay is still waiting, without exposing local paths or secrets. */
export interface OverlayDetectionPayload {
  processRunning: boolean | null
  localInMatch: boolean | null
  liveSource: string
  profileConfigured: boolean
  localDataEnabled: boolean
}

/** Post-game results card shown on the overlay after a match (win/loss + coaching). */
export interface PostGameSummary {
  result: 'win' | 'loss' | null
  /** Your civ slug. */
  civ: string | null
  oppCiv: string | null
  map: string | null
  /** Economy grade A–F, or null without local stats. */
  grade: string | null
  /** Average APM from the replay's command count, or null. */
  apm: number | null
  durationSec: number | null
  /** Things you did well (max ~3). */
  didWell: string[]
  /** Things to improve next game (max ~3). */
  improve: string[]
  vsAI: boolean
}

export interface OverlayUpdatePayload {
  matchState: OverlayMatchState
  scout: ScoutReport | null
  myCiv: string | null
  map: string | null
  startedAt: string | null
  /** True for a custom/private/vs-AI game (no live opponent scout available). */
  custom: boolean
  /** The opponent's civ slug when known (ranked live games); null otherwise. */
  oppCiv: string | null
  /** Opponent display name for custom/AI games (no scout); ranked uses `scout.name`. */
  oppName: string | null
  /** True when the opponent is an AI bot (no ladder rank / win-rate / favorite civs). */
  oppIsAI: boolean
  /** Full matchup (both teams, all players) for the top bar; null while unknown/idle. */
  matchup: LiveMatchup | null
  /** Game-mode label for the bar's center (e.g. "Ranked 1v1"); null when unknown. */
  kind: string | null
  /** Post-game results (win/loss + coaching), pushed on `ended` once analysis finishes. */
  postGame?: PostGameSummary | null
  /**
   * Today's session line (W–L + net rating), for the session-tracker widget.
   * Null until the first finished game of the local day.
   */
  session: SessionSummary | null
  /**
   * Stable identity of the current match (ranked `game_id`, or a per-match token
   * for custom games); null when not in a match. The overlay keys its one-shot
   * "new match" resets (auto-advance, build auto-select) on this so a duplicate
   * update (the post-scout refresh) or a transient ongoing→ended→ongoing flicker
   * never re-fires them mid-match and clobbers a manual override.
   */
  matchId: string | null
}

export type OverlayControlAction =
  | 'next-bo'
  | 'prev-bo'
  | 'next-counter'
  | 'next-step'
  | 'prev-step'
  | 'reset-step'
  | 'switch-timer'
  | 'start-timer'
  | 'stop-timer'
  | 'reset-timer'

export interface CivMetaQuery {
  leaderboard?: StatsLeaderboard
  rankLevel?: RankLevel
  /** AoE4World rating bucket, e.g. `1100-1199` or `>1400`. */
  rating?: string
  /** Optional AoE4World patch id/list, e.g. `10604,10884,11214,11308`. */
  patch?: string
  /** Optional map id for the AoE4World civ-by-map Counter Calculator slice. */
  mapId?: number
  /** Limit map stats and map-specific analytics to the active ranked rotation. */
  mapPoolOnly?: boolean
}

/** Civ meta explorer payload: sortable civ rows + map popularity for a bracket. */
export interface CivMetaResult {
  civs: CivTier[]
  maps: MapStat[]
  leaderboard: string
  rankLevel: string | null
  totalCivGames: number
  /** AoE4World patch ids represented by this live stats slice. */
  patch?: string | null
  /** Whether civ rows cover all maps or only the active ranked rotation. */
  metaScope: 'all-maps' | 'ranked-map-pool'
  /** Number of active rotation maps included in pool-weighted civ rows. */
  metaPoolMapCount: number | null
  /** Top civilization rows for each active map when pool weighting is available. */
  poolMapRankings?: PoolMapCivRanking[]
  /** Full civ ranking for the selected map, when mapId was requested. */
  mapCivs?: CivTier[]
  selectedMap?: string | null
  /** Provenance and effective dates for the current ranked rotation. */
  mapPool?: RankedMapPoolResolution | null
}

export interface PoolMapCivRanking {
  mapId: number
  map: string
  civs: CivTier[]
}

export interface MatchupLabQuery {
  civilization: string
  opponentCivilization: string
  leaderboard?: StatsLeaderboard
  rankLevel?: RankLevel
  rating?: string
  patch?: string
}

export interface LeaderboardQuery {
  leaderboard: Leaderboard
  page?: number
  /** ISO 3166-1 alpha-2 country code (lowercase), e.g. "us". */
  country?: string
  /** Bypass the disk cache when the user explicitly refreshes/live polling runs. */
  fresh?: boolean
}

/** The current user's standing on the selected ladder (if ranked). */
export interface LeaderboardYou {
  rank: number
  rating: number | null
  winRate: number | null
  games: number
}

export interface LeaderboardPage {
  rows: LeaderboardRow[]
  page: number
  perPage: number
  totalCount: number
  leaderboard: string
  you: LeaderboardYou | null
}

export interface AnalyzeResult {
  analyzed: number
  total: number
  backend: string
}

/** Steam connection state for the ranked-economy helper (D54). */
export interface SteamAuthStatus {
  /** True once logged into Steam and ready to fetch ranked summaries. */
  connected: boolean
  /** True while a QR login is awaiting approval. */
  connecting: boolean
  /** The signed-in Steam persona name, when known. */
  name: string | null
  /** The last login error, if any (shown to the user). */
  error: string | null
}

export type SteamGuardActionKind =
  'email-code' | 'device-code' | 'device-confirmation' | 'email-confirmation' | 'unknown'

export interface SteamGuardAction {
  type: SteamGuardActionKind
  detail: string | null
}

export interface SteamCredentialsLoginResult {
  actionRequired: boolean
  actions: SteamGuardAction[]
  message: string | null
}

export type IpcChannel = (typeof IpcChannels)[keyof typeof IpcChannels]

/** A result envelope so the renderer always gets a typed value, never a throw. */
export interface IpcOk<T> {
  ok: true
  data: T
}
export type IpcErrorKind = 'api' | 'not_found' | 'network' | 'validation' | 'unknown'
export interface IpcErr {
  ok: false
  error: { kind: IpcErrorKind; message: string; status?: number }
}
export type IpcResult<T> = IpcOk<T> | IpcErr

/** One public AoE4World match, viewed from the requested player's perspective. */
export interface ScoutMatchRow {
  gameId: number
  startedAt: string
  durationSec: number | null
  map: string | null
  format: string | null
  result: 'win' | 'loss' | 'unknown'
  civilization: string | null
  opponentCivilizations: string[]
  opponentNames: string[]
}

/** A bounded page of public matches. `totalCount` is the API's scoped count. */
export interface ScoutMatchPage {
  matches: ScoutMatchRow[]
  sampleSize: number
  totalCount: number
}

/** Personal results against the viewed player, from the active account's perspective. */
export interface HeadToHeadData extends ScoutMatchPage {
  wins: number
  losses: number
  decidedGames: number
  winRate: number | null
}

export interface ScoutHistoryQuery {
  /** One-based page in the viewed player's public history. */
  recentPage?: number
  /** Number of public matches requested per page. */
  recentPageSize?: number
}

/** Recent public matches plus optional active-account head-to-head data. */
export interface ScoutHistoryData {
  viewedProfileId: number
  activeProfile: { profileId: number; name: string | null } | null
  recentPage: number
  recentPageSize: number
  recent: IpcResult<ScoutMatchPage>
  /** Null when there is no active account, or the viewed player is the active account. */
  headToHead: IpcResult<HeadToHeadData> | null
}

/** Public aggregate context for the current live match, modelled after Scout. */
export interface ScoutMetaQuery {
  leaderboard?: StatsLeaderboard
  rankLevel?: RankLevel | null
  rating?: string | null
  patch?: string | null
  map?: string | null
  /** Public current-match facts used by the Scout summary (never hidden game state). */
  match?: ScoutMetaMatch
  teams: ScoutMetaPlayer[][]
}

export type { ScoutMetaContext, ScoutMetaPlayer }

export interface PublicGameQuery {
  profileId: number
  gameId: number
}

/** Full public match data, plus deeper Relic stats when the backend exposes them. */
export interface PublicGameDetail {
  game: Game
  profileId: number
  perPlayer: PerPlayerMatchStats[]
  summary: MatchSummary | null
  summaryStatus: 'available' | 'unavailable'
}

/** A trimmed search hit for the onboarding / scout pickers. */
export interface PlayerSearchHit {
  profileId: number
  name: string
  country: string | null
  rankLevel: string | null
  rating: number | null
  lastGameAt: string | null
}

export type OnlineSearchProvider = 'twitch' | 'youtube'
export type OnlineSearchKind = 'video' | 'streamer'
export type OnlineSearchSource = 'aoe4world' | 'twitch' | 'youtube'
export type OnlineSearchProviderStatus = 'ready' | 'not_configured' | 'error'

export interface OnlineSearchQuery {
  query: string
  provider?: 'all' | OnlineSearchProvider
  liveOnly?: boolean
  limit?: number
  /** Restrict provider video results to the latest N days; 0 means no date filter. */
  dateRangeDays?: number
  /** Sort provider videos by publication time or view count. */
  sort?: 'recent' | 'views'
}

export interface OnlineSearchResult {
  id: string
  provider: OnlineSearchProvider
  source: OnlineSearchSource
  kind: OnlineSearchKind
  title: string
  channel: string
  channelUrl: string | null
  url: string
  thumbnailUrl: string | null
  publishedAt: string | null
  viewCount: number | null
  live: boolean
  durationSec: number | null
  description: string | null
}

export interface OnlineSearchFallbackLink {
  provider: OnlineSearchProvider | 'aoe4world'
  label: string
  url: string
}

export interface OnlineSearchData {
  results: OnlineSearchResult[]
  providers: Record<OnlineSearchProvider, OnlineSearchProviderStatus>
  fallbackLinks: OnlineSearchFallbackLink[]
  fetchedAt: string
}

export type PublicDumpCategory = 'games' | 'leaderboards' | 'other'

export interface PublicDumpEntry {
  title: string
  url: string
  category: PublicDumpCategory
  size: string | null
  age: string | null
}

export interface PublicDumpCatalog {
  sourceUrl: string
  capturedAt: string
  entries: PublicDumpEntry[]
}

export interface BeastyNumberData {
  profileId: number
  number: number
  path: { profileId: number; name: string | null }[]
  capturedAt: string
}

/** Dashboard payload for the current player. */
export interface DashboardData {
  profileId: number
  name: string
  country: string | null
  /** The profile's linked SteamID64 (AoE4World), for the Steam-account cross-reference; null if none. */
  steamId: string | null
  primary: RankInfo | null
  modes: RankInfo[]
  recentForm: RecentForm
}

/** The typed API exposed on `window.rtslytics`. */
export interface RtslyticsApi {
  getVersion(): Promise<string>
  ping(): Promise<'pong'>
  getPlatform(): Promise<Platform>
  // Phase 1
  searchPlayers(query: string): Promise<IpcResult<PlayerSearchHit[]>>
  setCurrentProfile(profileId: number, name: string): Promise<AppSettings>
  /** Switch the active account to an already-linked one. */
  setActiveProfile(profileId: number): Promise<AppSettings>
  /** Unlink an account (falls back to the next linked one, or onboarding). */
  removeAccount(profileId: number): Promise<AppSettings>
  getDashboard(): Promise<IpcResult<DashboardData>>
  scoutPlayer(profileId: number): Promise<IpcResult<ScoutReport>>
  getScoutHistory(
    profileId: number,
    query?: ScoutHistoryQuery,
  ): Promise<IpcResult<ScoutHistoryData>>
  getScoutMeta(query: ScoutMetaQuery): Promise<IpcResult<ScoutMetaContext>>
  getPublicGame(query: PublicGameQuery): Promise<IpcResult<PublicGameDetail>>
  /** Finds public games with the same map/civilization matchup for coaching comparison. */
  findSimilarMatches(query: SimilarMatchQuery): Promise<IpcResult<SimilarMatchCandidate[]>>
  getLastMatchCoach(profileId: number): Promise<IpcResult<LastMatchCoachContext>>
  getSettings(): Promise<AppSettings>
  updateSettings(patch: AppSettingsPatch): Promise<AppSettings>
  // Phase 2
  getCivMeta(query: CivMetaQuery): Promise<IpcResult<CivMetaResult>>
  getRankedMapPool(): Promise<IpcResult<RankedMapPoolResolution>>
  getMatchupLab(query: MatchupLabQuery): Promise<IpcResult<GlobalMatchupSummary | null>>
  getCivDetailStats(civ: string): Promise<IpcResult<CivDetailStats>>
  getLeaderboard(query: LeaderboardQuery): Promise<IpcResult<LeaderboardPage>>
  // Phase 3
  analyzeRecentGames(count?: number): Promise<IpcResult<AnalyzeResult>>
  getHistory(limit?: number): Promise<IpcResult<StoredMatch[]>>
  /**
   * The full stat summary (build order + economy/score timelines) for a game,
   * decoded from the local `stats.rgs` (custom games today; the backend will feed
   * the byte-identical ranked blob through the same parser). Null when no summary
   * is available for that match id.
   */
  getGameSummary(matchId: string): Promise<IpcResult<MatchSummary | null>>
  /** Build adherence rows for recent games using local/cached summaries only. */
  getBuildAuditHistory(limit?: number): Promise<IpcResult<BuildAuditHistoryRow[]>>
  /** Detailed aggregate of every visible stored match and its local/cached evidence. */
  getMatchCorpusReport(limit?: number): Promise<IpcResult<MatchCorpusReport>>
  /** Permanently removes one game from the local history (e.g. a desynced match the game never recorded). */
  deleteMatch(matchId: string): Promise<IpcResult<null>>
  /** Your own per-landmark W/L for a civ, from your synced games' summaries. */
  getLandmarkRecord(civ: string): Promise<IpcResult<LandmarkRecordRow[]>>
  /** Global landmark pick/win rates (AoE4World ageup analytics); [] when unavailable. */
  getLandmarkStats(civ: string): Promise<IpcResult<LandmarkStatRow[]>>
  /** Steam connection state for ranked economy (local QR-auth helper, D54). */
  getSteamAuthStatus(): Promise<SteamAuthStatus>
  /** Begin a QR login; returns the challenge URL to render. Poll status for completion. */
  steamStartLogin(): Promise<IpcResult<{ challengeUrl: string }>>
  /** Begin a username/password Steam login. Password is used for this request only and never persisted. */
  steamStartCredentialsLogin(
    accountName: string,
    password: string,
  ): Promise<IpcResult<SteamCredentialsLoginResult>>
  /** Submit the Steam Guard email/TOTP code for an active username/password login. */
  steamSubmitSteamGuardCode(code: string): Promise<IpcResult<SteamCredentialsLoginResult>>
  steamLogout(): Promise<void>
  /** Diagnostic: trace the ranked-summary fetch for the newest game (for debugging). */
  steamTestRankedFetch(): Promise<IpcResult<string>>
  // Phase 4 — overlay event subscriptions (each returns an unsubscribe fn)
  onOverlayUpdate(cb: (payload: OverlayUpdatePayload) => void): () => void
  onOverlayControl(cb: (action: OverlayControlAction) => void): () => void
  onOverlayLock(cb: (locked: boolean) => void): () => void
  /**
   * Overlay settings pushed when the user changes them (e.g. widget toggles),
   * plus the app-wide `accentColor` (the overlay follows the chosen accent too,
   * even though it isn't an overlay-only setting).
   */
  onOverlaySettings(
    cb: (
      overlay: OverlaySettings & {
        accentColor: AppSettings['accentColor']
        civTheme: AppSettings['civTheme']
      },
    ) => void,
  ): () => void
  /**
   * The accurate game-clock anchor (sim start + pauses), pushed every second
   * while in a match (re-anchored from the log each poll tick); null resets it
   * on match end. Derive elapsed with `gameElapsedSec(clock, todMsFromEpoch(now))`.
   */
  onOverlayGameClock(cb: (clock: GameClock | null) => void): () => void
  /** Live APM (actions in the last 60s), pushed while in a match; null when idle/off. */
  onOverlayApm(cb: (apm: number | null) => void): () => void
  onOverlayDetection(cb: (payload: OverlayDetectionPayload) => void): () => void
  // Phase 4.5
  getLocalDataStatus(): Promise<LocalDataStatus>
  // Phase 5
  applyOverlaySettings(): Promise<void>
  toggleOverlay(): Promise<void>
  /**
   * Enter/leave the draggable widget-placement preview. Resolves to whether
   * placement mode is active after the toggle.
   */
  toggleOverlayPlacement(): Promise<boolean>
  /** Overlay only: the cursor is over (or left) a clickable overlay control (post-game ✕). */
  setOverlayInteractive(hover: boolean): Promise<void>
  /** Overlay only: dismiss the post-game card and hide the overlay. */
  dismissOverlayPostGame(): Promise<void>
  // Custom window chrome (frameless main window — the renderer's title bar)
  minimizeWindow(): Promise<void>
  toggleMaximizeWindow(): Promise<void>
  closeWindow(): Promise<void>
  isWindowMaximized(): Promise<boolean>
  /** Fires when the window is maximized/unmaximized so the title bar can swap its icon. */
  onWindowMaximizedChanged(cb: (isMaximized: boolean) => void): () => void
  /** Fires when a finished match's summary should open (post-game auto-open). */
  onOpenGame(cb: (matchId: string) => void): () => void
  /** The live civ slug for civilization themes (null when no match is ongoing). */
  onCivTheme(cb: (civ: string | null) => void): () => void
  /** Steam community avatar for a SteamID64 as a data URL (null when unavailable). */
  getSteamAvatar(steamId: string): Promise<string | null>
  // Live match + launcher
  getLiveMatch(): Promise<LiveMatchInfo>
  launchGame(): Promise<LaunchResult>
  /** Latest parsed local match_history.jsn (custom games included); null without consent. */
  getLocalMatch(): Promise<LocalMatch | null>
  /** Steam accounts signed in on this machine (most-recent first); [] if none/non-Windows. */
  detectSteamAccounts(): Promise<SteamAccount[]>
  /** Most-recent local replay (custom/AI included) parsed to me-vs-opponents; null without consent. */
  getLatestReplay(): Promise<LatestReplay | null>
  /** Paginated local archive, including match-history games without replay.rec. */
  listReplays(page?: number, pageSize?: number): Promise<ReplayArchivePage>
  /** Saved account history; `forceRefresh` explicitly fetches fresh AoE4World/Relic metadata. */
  listAccountReplays(
    page?: number,
    pageSize?: number,
    forceRefresh?: boolean,
  ): Promise<IpcResult<AccountReplayPage>>
  /** Returns the complete persisted account archive in one main-process call. */
  listAllAccountReplays(forceRefresh?: boolean): Promise<IpcResult<AccountReplayArchive>>
  /** Download one available online replay through the authenticated Relic session. */
  cacheReplay(gameId: number): Promise<IpcResult<ReplayCacheResult>>
  /** Cache the supplied replay ids; Replay Lab batches the complete archive in chunks. */
  cacheReplays(gameIds: number[]): Promise<IpcResult<ReplayCacheBatchResult>>
  /** Download and persist datatype-1 summaries for the supplied game ids. */
  cacheSummary(gameId: number): Promise<IpcResult<SummaryCacheResult>>
  cacheSummaries(gameIds: number[]): Promise<IpcResult<SummaryCacheBatchResult>>
  /** Verifies the configured or bundled upstream-compatible replay parser. */
  getReplaysApiStatus(): Promise<ReplaysApiStatus>
  /** Decode the recorded command stream from a local replay or cached Relic replay. */
  analyzeReplay(target: ReplayAnalysisTarget): Promise<IpcResult<ReplayAnalysisResult | null>>
  /** Download an online replay (when needed), fetch its summary, and decode it in one pass. */
  downloadAndAnalyzeReplay(gameId: number): Promise<IpcResult<FullReplayAnalysis>>
  /** Historical win rate (%) of your civ vs the opponent's civ; null if unknown. */
  getMatchupWinRate(civ: string, oppCiv: string): Promise<number | null>
  /** Search current Twitch/YouTube videos and streamers without exposing API keys. */
  searchOnline(query: OnlineSearchQuery): Promise<IpcResult<OnlineSearchData>>
  /** Lists the current official AoE4World public data dumps without mirroring them locally. */
  getPublicDumpCatalog(): Promise<IpcResult<PublicDumpCatalog>>
  /** Runs the repository source orchestrator when the local scripts are available. */
  syncExternalSources(options?: Partial<SourceSyncOptions>): Promise<IpcResult<SourceSyncResult>>
  /** Loads the official Beasty Number victory path for one AoE4World profile. */
  getBeastyNumber(profileId: number): Promise<IpcResult<BeastyNumberData>>
  /** Finds a Twitch VOD only when AoE4World maps it to this exact game id. */
  findTwitchVod(input: TwitchVodFinderInput): Promise<IpcResult<TwitchVodLookupResult>>
  /** Extracts a local build/tactics analysis from a YouTube video or Twitch VOD. */
  extractVideoAnalysis(input: VideoAnalysisInput): Promise<IpcResult<VideoAnalysisRecord>>
  /** Lists locally persisted video/VOD analyses, newest first. */
  listVideoAnalyses(): Promise<IpcResult<VideoAnalysisRecord[]>>
  /** Finds public gameplay, downloads it when yt-dlp is available, and extracts analysis. */
  autoFindGameplay(input: GameplayAutoInput): Promise<IpcResult<GameplayAutoResult>>
  /** Returns translation-provider state without exposing the stored API key. */
  getTranslationStatus(): Promise<TranslationStatus>
  /** Stores translation provider settings; the API key is encrypted in the main process. */
  configureTranslation(input: TranslationConfigInput): Promise<TranslationStatus>
  /** Translates missing UI strings and returns results keyed by their source text. */
  translateBatch(input: TranslationBatchInput): Promise<TranslationBatchResult>
  /** Clears the local translation cache. */
  clearTranslationCache(): Promise<TranslationStatus>
  /** Returns configured third-party provider state without exposing credentials. */
  getExternalApiStatus(): Promise<ExternalApiStatus>
  /** Stores Twitch/YouTube credentials encrypted by the operating system. */
  configureExternalApis(input: ExternalApiConfigInput): Promise<ExternalApiStatus>
  /** Clears persisted Twitch and YouTube credentials. */
  clearExternalApis(): Promise<ExternalApiStatus>
  /** Local browser-source tournament graphics and StreamDeck-compatible controls. */
  getStreamManagerStatus(): Promise<StreamManagerStatus>
  startStreamManager(port?: number): Promise<StreamManagerStatus>
  stopStreamManager(): Promise<void>
  updateStreamManager(patch: Partial<StreamManagerState>): Promise<StreamManagerState>
  resetStreamManager(): Promise<StreamManagerState>
  /** Imports a finished AoE2CM civ draft by URL (GET /api/draft/:id). */
  importStreamDraft(url: string): Promise<IpcResult<StreamDraftImport>>
  /** Imports the text export served by an AOE4 Builds build-order URL. */
  importCommunityBuild(url: string): Promise<IpcResult<BuildOrder>>
  /** Lists the full server-rendered AOE4 Builds catalogue without executing page scripts. */
  listCommunityBuilds(query?: string): Promise<IpcResult<{ items: CommunityBuildSummary[] }>>
  /** Lists the typed result set returned by the public AoE4Guides build API. */
  listAoe4GuidesBuilds(
    query?: string,
    civilization?: string,
    sort?: 'score' | 'timeCreated' | 'views' | 'likes',
  ): Promise<IpcResult<{ items: Aoe4GuidesBuildSummary[]; sort: string }>>
}
