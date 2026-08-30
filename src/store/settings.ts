import type { Leaderboard } from '../api/types'
import type { OverlayPosition } from '../domain/overlayBounds'
import type { BuildOrder } from '../domain/buildOrderSchema'
import { normalizeBuildOrder } from '../domain/buildOrderSchema'
import { normalizeAccelerator } from '../domain/hotkeyAccel'
import type { BuildPlaylist } from '../domain/buildPlaylists'
import type { Store } from './Store'

export interface OverlaySettings {
  /**
   * Widget-panel background opacity [0.3, 1]. Applied by the overlay renderer as
   * background alpha only (text/icons stay fully opaque) — never win.setOpacity,
   * which would dim the text too.
   */
  opacity: number
  /**
   * DORMANT: window-level snap presets from the old single-panel overlay —
   * nothing reads this since the overlay went full-display with per-widget
   * `widgetPositions`. Kept so stored settings stay shape-stable.
   */
  position: OverlayPosition
  /** When locked the overlay is click-through; unlock to drag/resize. */
  locked: boolean
  /** Show the live matchup/team bar. */
  showMatchup: boolean
  /** Show the post-game result/coaching card after analysis completes. */
  showPostGame: boolean
  /** Show the small waiting/analyzing status pill while no card is visible. */
  showStatus: boolean
  /**
   * The civ whose build order the overlay defaults to when it can't detect the
   * live civ (custom/AI games, menus) — remembered from your last manual build
   * pick. Null until you choose one (then it defaults to the first bundled build).
   */
  defaultBuildCiv: string | null
  /** Which overlay widgets are shown in-game (each toggleable). */
  widgets: OverlayWidgets
  /**
   * Live on-screen APM counter. Uses a global input hook to count your key
   * presses + mouse clicks (counts only, never which keys) while you're in a
   * match. Off by default: unsigned low-level hooks can conflict with
   * Easy Anti-Cheat and close the game. Opt in from Settings, ideally before
   * launching AoE4.
   */
  apm: boolean
  /**
   * One-shot: older installs had live APM on by default. After this is true
   * the user's APM choice is kept.
   */
  inputHookMigrated: boolean
  /**
   * One-shot: the overlay is now a quiet mini-HUD by default. After this is
   * true the user's Mini-HUD choice is kept.
   */
  minimalHudMigrated: boolean
  /** Which screen corner the APM counter sits in. */
  apmCorner: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  /**
   * Only show the overlay while AoE4 (or this app) is the focused window; hide it
   * when you alt-tab away. Turn OFF if the overlay won't appear over your game
   * (e.g. it shows on the desktop but not in-game) — then it shows whenever a
   * match is live regardless of focus. Windows-only gating.
   */
  gateToGame: boolean
  /**
   * The matchup "what troops to build" cheat-sheet (your build order vs theirs,
   * counters flagged), shown under the matchup bar. 'hidden' turns it off.
   */
  troopsPos: 'bar' | 'hidden'
  /**
   * The age-up pace-target chip (target Feudal/Castle/Imperial times for your
   * rank next to the live game clock). Small, so on by default.
   */
  showAgeTargets: boolean
  /**
   * The session-tracker chip (today's W–L record + net rating change), so a
   * losing streak is visible without leaving the game. Small, on by default.
   */
  showSession: boolean
  /** Compact counter plan for the detected opponent civilization. */
  showCounter: boolean
  /** Timed build/scouting reminder chips driven by the live game clock. */
  showCoach: boolean
  /**
   * The bundled build order pinned to the overlay, keyed by its unique `name`
   * (set from Guides → Build Orders → "Show in overlay"). Null = widget hidden.
   */
  buildOrderId: string | null
  /** How the build widget chooses its source during a match. */
  buildOrderMode: 'manual' | 'auto' | 'hidden'
  /**
   * Overlay widget scale [0.75, 1.5]. Applied per widget as a CSS transform
   * around each widget's anchor corner, so saved positions stay put.
   */
  scale: number
  /** Saved per-widget overlay positions, relative to the transparent overlay canvas. */
  widgetPositions: OverlayWidgetPositions
  /** Build-order text size in pixels [11, 18]. */
  buildOrderFontSize: number
  /** Build-order unit/building thumbnail size in pixels [20, 48]. */
  buildOrderImageSize: number
  /** Build-order presentation: rich icon cards or the compact original TXT-style view. */
  buildOrderViewMode: 'illustrated' | 'text'
  /** Show the dim preview of the next build step. */
  buildOrderShowNext: boolean
  /** Show resource and villager split values in the active step. */
  buildOrderShowResources: boolean
  /** Show the instruction/note text for the active step. */
  buildOrderShowNotes: boolean
  /** Show contextual scout/counter response forks below the build. */
  buildOrderShowResponsePlan: boolean
  /** Build widget width in pixels [280, 520]. */
  buildOrderPanelWidth: number
  /** Whether the build-order name/header line is visible. */
  buildOrderShowTitle: boolean
  /**
   * User-imported build orders available to the in-game overlay. Bundled builds
   * remain in the application catalog; these entries make the classic overlay
   * workflow (paste/import arbitrary TXT or illustrated JSON) persistent.
   */
  customBuildOrders: BuildOrder[]
  /** Explicit ordered list of builds activated for cycling; an empty list means no automatic cycle. */
  buildOrderCycle: string[]
  /** Build-order names paused within the active pool (still selectable manually). */
  buildOrderDisabled: string[]
  /** Show the compact Eco Target Worker Split HUD widget. */
  showEcoSplit: boolean
  /** Ultra-compact mini-HUD presentation for 1080p and smaller screens. */
  miniHud: boolean
  /** Whether synthetic Web Audio cues (chimes/pings) sound for match timing checkpoints. */
  audioCues: boolean
  /** Volume of audio cues [0, 1]. */
  audioCueVolume: number
  /** Whether macro match checkpoints (2:30 gold check, 4:15 Feudal, etc.) are active. */
  timingCheckpoints: boolean
  /** Per-widget custom scale multipliers. */
  widgetScales: Partial<Record<OverlayWidgetKey, number>>
  /** Per-widget custom opacity multipliers. */
  widgetOpacities: Partial<Record<OverlayWidgetKey, number>>
  /** Optional user CSS for the transparent overlay (CSS only; scripts are never executed). */
  customCss: string
}

// DORMANT (D55): per-widget toggles from the old overlay design — nothing reads
// this today; kept for the planned overlay micro-coach rebuild.
export interface OverlayWidgets {
  /** The full-width matchup bar at the top (both teams' civ/rank/rating). */
  matchupBar: boolean
  buildOrder: boolean
  scout: boolean
  counters: boolean
  reminders: boolean
  ageTargets: boolean
}

export type OverlayWidgetKey =
  | 'matchup'
  | 'apm'
  | 'postGame'
  | 'buildOrder'
  | 'ageTargets'
  | 'session'
  | 'counter'
  | 'coach'
  | 'ecoSplit'

export type OverlayWidgetAnchor =
  'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'

export interface OverlayWidgetPosition {
  /** Anchor point on the overlay canvas; dragged widgets are saved as top-left. */
  anchor: OverlayWidgetAnchor
  /** Pixel offset from the anchor (or absolute left when anchor is top-left). */
  x: number
  /** Pixel offset from the anchor (or absolute top when anchor is top-left). */
  y: number
}

export type OverlayWidgetPositions = Record<OverlayWidgetKey, OverlayWidgetPosition>

export const DEFAULT_OVERLAY_WIDGETS: OverlayWidgets = {
  matchupBar: true,
  buildOrder: true,
  scout: true,
  counters: true,
  reminders: true,
  ageTargets: true,
}

export const DEFAULT_OVERLAY_WIDGET_POSITIONS: OverlayWidgetPositions = {
  matchup: { anchor: 'top-center', x: 0, y: 8 },
  apm: { anchor: 'bottom-left', x: 12, y: 12 },
  // The result card appears after the matchup has cleared. Centering it avoids
  // covering the game HUD and keeps the placement preview from stacking it on
  // top of the matchup widget.
  postGame: { anchor: 'center', x: 0, y: 0 },
  buildOrder: { anchor: 'top-left', x: 12, y: 96 },
  ageTargets: { anchor: 'top-right', x: 12, y: 96 },
  // Stacked just above the APM counter (both clear of the game's bottom HUD).
  session: { anchor: 'bottom-left', x: 12, y: 56 },
  counter: { anchor: 'top-left', x: 12, y: 360 },
  coach: { anchor: 'bottom-right', x: 12, y: 92 },
  ecoSplit: { anchor: 'top-left', x: 12, y: 310 },
}

/** Global hotkey bindings, in Electron accelerator format (e.g. "Alt+O"). */
export interface HotkeySettings {
  /** Show / hide the overlay. */
  toggleOverlay: string
  /** Toggle overlay placement (widget-drag) mode. */
  placementMode: string
  /** Advance the pinned build order by one step. */
  nextBuildStep: string
  /** Move the pinned build order back by one step. */
  previousBuildStep: string
  /** Return the pinned build order to clock-driven mode. */
  resetBuildStep: string
  /** Cycle the counter-plan target civ in custom/AI/casting games. */
  nextCounter: string
  /** Select the next bundled build order in the overlay. */
  nextBuildOrder: string
  /** Select the previous bundled build order in the overlay. */
  previousBuildOrder: string
  /** Show or hide only the build-order widget without hiding the full overlay. */
  toggleBuildOrder: string
  /** Toggle between the live game clock and the manual RTS Overlay timer. */
  switchTimerMode: string
  /** Start the manual build-order timer. */
  startTimer: string
  /** Stop the manual build-order timer. */
  stopTimer: string
  /** Reset the manual build-order timer to zero. */
  resetTimer: string
}

export const DEFAULT_HOTKEYS: HotkeySettings = {
  toggleOverlay: 'Alt+O',
  placementMode: 'Control+Alt+O',
  nextBuildStep: 'Control+Alt+Right',
  previousBuildStep: 'Control+Alt+Left',
  resetBuildStep: 'Control+Alt+Down',
  nextCounter: 'Control+Alt+C',
  nextBuildOrder: 'Control+Alt+PageDown',
  previousBuildOrder: 'Control+Alt+PageUp',
  toggleBuildOrder: 'Control+Alt+B',
  switchTimerMode: 'Control+Alt+M',
  startTimer: 'Control+Alt+F9',
  stopTimer: 'Control+Alt+F10',
  resetTimer: 'Control+Alt+F11',
}

export interface PollingSettings {
  /** Poll cadence while no game is detected. */
  idleIntervalMs: number
  /** Poll cadence while a game is ongoing. */
  activeIntervalMs: number
}

export interface LocalDataSettings {
  /**
   * Always true. Reading the user's OWN local AoE4 log/replay files is a
   * first-class, always-on data source (the disclaimer lives in the README) —
   * no in-app consent gate. Kept as a field so the services that branch on it
   * stay unchanged. (Supersedes the A1 one-time-consent UX.)
   */
  consentGranted: boolean
  /** Override path to the AoE4 user-data directory (auto-detected if null). */
  gameDir: string | null
  /**
   * Exclude custom / vs-AI games from your win-rate + stats aggregates and the
   * history list (they still get a post-game overlay card). For focusing on ranked.
   */
  excludeAiFromStats: boolean
}

/** Background work that keeps the local account archive and public catalogues warm. */
export interface AutomationSettings {
  /** Master switch for all background refreshes. */
  enabled: boolean
  /** Periodically fold new account/local games into the local history store. */
  syncHistory: boolean
  /** Refresh the complete AoE4World + Relic account archive before cache work. */
  refreshReplayArchive: boolean
  /** Find exact or high-confidence public gameplay for new account matches. */
  discoverGameplay: boolean
  /** Run the checked-in source refresh script automatically. Disabled by default because it can rewrite generated files. */
  syncSources: boolean
  /** Persist available datatype-1 summaries before Relic's short retention window expires. */
  cacheSummaries: boolean
  /** Persist a small, recent replay window for offline Replay Lab analysis. */
  cacheReplays: boolean
  /** Parse cached/local replay command streams automatically in Replay Lab. */
  analyzeReplays: boolean
  /** Warm public map/build/dump caches without mutating bundled source files. */
  warmCatalogs: boolean
  /** Minimum delay between account refresh passes. */
  intervalMinutes: number
  /** Maximum summary blobs downloaded by one background pass. */
  maxSummariesPerRun: number
  /** Maximum replay files downloaded by one background pass. */
  maxReplaysPerRun: number
  /** Maximum new gameplay VOD analyses started by one background pass. */
  maxGameplayPerRun: number
}

/** A linked AoE4World account (the user may have several). */
export interface Account {
  profileId: number
  name: string
}

export interface AppSettings {
  /**
   * The user's custom accent (action) colour as a `#rrggbb` hex, applied over
   * the default electric-blue. Null = use the default. Drives buttons, active
   * nav, links, focus rings, and the title bar across both windows.
   */
  accentColor: string | null
  /** The ACTIVE account's profile id (drives every read). */
  profileId: number | null
  /** The active account's display name. */
  playerName: string | null
  /**
   * The user's SteamID64, pinned from Settings. Identifies which player is YOU in
   * local replays — so the overlay shows the right side even in a 2-human custom
   * lobby. Null = auto (match the replay's Steam id against this PC's signed-in
   * Steam accounts, falling back to the sole human in vs-AI games).
   */
  steamId: string | null
  /** All linked accounts, for the switcher (includes the active one). */
  accounts: Account[]
  /**
   * Which account owns the legacy (pre-multi-account) `history.db`/`history.json`
   * files, so they aren't orphaned when other accounts get their own per-profile
   * history files. Set once, the first time history is opened.
   */
  historyOwnerProfileId: number | null
  leaderboard: Leaderboard
  recentGamesCount: number
  /**
   * After a match ends (win OR loss), bring the app to the front on that game's
   * full post-game summary — the desktop equivalent of the score screen.
   */
  openSummaryOnGameEnd: boolean
  /**
   * Civilization themes: while a match is live, the app + overlay re-accent to
   * the brand colour of the civ you're playing, reverting when the game ends.
   */
  civTheme: boolean
  /**
   * Optional endpoint of a self-hosted aoe4world/replays-api instance. When
   * empty, summary-parser fallback uses the bundled loopback sidecar instead.
   * This value is deliberately not a credential: the service only accepts a
   * plain http(s) base URL and rejects query strings / userinfo.
   */
  replaysApiUrl: string | null
  /** User-created notes attached to civilizations, matchups, or maps. */
  matchupNotes: Record<string, string>
  /** Curated practice playlists of build orders. */
  buildPlaylists: BuildPlaylist[]
  /** ID of the currently active practice playlist. */
  activeBuildPlaylistId: string | null
  overlay: OverlaySettings
  hotkeys: HotkeySettings
  polling: PollingSettings
  localData: LocalDataSettings
  automation: AutomationSettings
}

export type AppSettingsPatch = Partial<
  Omit<AppSettings, 'overlay' | 'hotkeys' | 'polling' | 'localData' | 'automation'>
> & {
  overlay?: Partial<OverlaySettings>
  hotkeys?: Partial<HotkeySettings>
  polling?: Partial<PollingSettings>
  localData?: Partial<LocalDataSettings>
  automation?: Partial<AutomationSettings>
}

export const DEFAULT_SETTINGS: AppSettings = {
  accentColor: null,
  profileId: null,
  playerName: null,
  steamId: null,
  accounts: [],
  historyOwnerProfileId: null,
  leaderboard: 'rm_solo',
  recentGamesCount: 10,
  openSummaryOnGameEnd: true,
  civTheme: true,
  replaysApiUrl: null,
  matchupNotes: {},
  buildPlaylists: [],
  activeBuildPlaylistId: null,
  overlay: {
    opacity: 0.72,
    position: 'top-center',
    locked: true,
    showMatchup: true,
    showPostGame: true,
    showStatus: true,
    defaultBuildCiv: null,
    widgets: DEFAULT_OVERLAY_WIDGETS,
    apm: false,
    inputHookMigrated: true,
    minimalHudMigrated: true,
    apmCorner: 'bottom-left',
    gateToGame: true,
    troopsPos: 'bar',
    showAgeTargets: true,
    showSession: true,
    showCounter: true,
    showCoach: true,
    buildOrderId: null,
    buildOrderMode: 'manual',
    scale: 1,
    widgetPositions: DEFAULT_OVERLAY_WIDGET_POSITIONS,
    buildOrderFontSize: 14,
    buildOrderImageSize: 30,
    buildOrderViewMode: 'illustrated',
    buildOrderShowNext: true,
    buildOrderShowResources: true,
    buildOrderShowNotes: true,
    buildOrderShowResponsePlan: true,
    buildOrderPanelWidth: 340,
    buildOrderShowTitle: true,
    showEcoSplit: true,
    miniHud: true,
    audioCues: true,
    audioCueVolume: 0.3,
    timingCheckpoints: true,
    widgetScales: {},
    widgetOpacities: {},
    customBuildOrders: [],
    buildOrderCycle: [],
    buildOrderDisabled: [],
    customCss: '',
  },
  hotkeys: DEFAULT_HOTKEYS,
  polling: { idleIntervalMs: 5_000, activeIntervalMs: 3_000 },
  localData: { consentGranted: true, gameDir: null, excludeAiFromStats: false },
  automation: {
    enabled: true,
    syncHistory: true,
    refreshReplayArchive: true,
    discoverGameplay: true,
    syncSources: false,
    cacheSummaries: true,
    cacheReplays: true,
    analyzeReplays: true,
    warmCatalogs: true,
    intervalMinutes: 5,
    maxSummariesPerRun: 100,
    maxReplaysPerRun: 50,
    maxGameplayPerRun: 5,
  },
}

const KEY = 'settings'

// --- renderer-patch sanitization -------------------------------------------
// Patches arrive over IPC from the renderer, so nothing about their shape can
// be trusted: coerce/clamp every known field and drop everything else before
// persisting.

const HEX_COLOR = /^#[0-9a-f]{6}$/i

const LEADERBOARDS: readonly Leaderboard[] = [
  'rm_solo',
  'rm_team',
  'rm_1v1',
  'rm_2v2',
  'rm_3v3',
  'rm_4v4',
  'qm_1v1',
  'qm_2v2',
  'qm_3v3',
  'qm_4v4',
  'qm_ffa',
  'rm_solo_console',
  'rm_team_console',
  'qm_1v1_console',
  'qm_2v2_console',
  'qm_3v3_console',
  'qm_4v4_console',
  'qm_ffa_console',
]
const OVERLAY_POSITIONS = ['top-left', 'top-center', 'top-right', 'custom'] as const
const APM_CORNERS = ['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const
const TROOPS_POS = ['bar', 'hidden'] as const
const BUILD_ORDER_MODES = ['manual', 'auto', 'hidden'] as const
const WIDGET_ANCHORS: readonly OverlayWidgetAnchor[] = [
  'top-left',
  'top-center',
  'top-right',
  'bottom-left',
  'bottom-right',
  'center',
]

function finite(v: unknown): number | undefined {
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

function clamped(v: unknown, min: number, max: number): number | undefined {
  const n = finite(v)
  return n == null ? undefined : Math.min(max, Math.max(min, n))
}

/** undefined = invalid (drop the key); null is a legitimate stored value. */
function finiteOrNull(v: unknown): number | null | undefined {
  return v === null ? null : finite(v)
}

function stringOrNull(v: unknown): string | null | undefined {
  return v === null || typeof v === 'string' ? (v as string | null) : undefined
}

/** A configured parser-service URL may never carry credentials or a query string. */
function replaysApiUrlOrNull(v: unknown): string | null | undefined {
  if (v === null) return null
  if (typeof v !== 'string') return undefined
  const value = v.trim()
  if (!value) return null
  if (value.length > 2_048) return undefined
  try {
    const url = new URL(value)
    if (
      (url.protocol !== 'http:' && url.protocol !== 'https:') ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    )
      return undefined
    return url.toString().replace(/\/$/, '')
  } catch {
    return undefined
  }
}

function oneOf<T extends string>(v: unknown, values: readonly T[]): T | undefined {
  return typeof v === 'string' && (values as readonly string[]).includes(v) ? (v as T) : undefined
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v != null && !Array.isArray(v)
}

function sanitizeAccounts(v: unknown): Account[] | undefined {
  if (!Array.isArray(v)) return undefined
  const out: Account[] = []
  for (const a of v) {
    if (!isObject(a)) continue
    const profileId = finite(a.profileId)
    if (profileId != null && typeof a.name === 'string') out.push({ profileId, name: a.name })
  }
  return out
}

function sanitizeWidgets(v: unknown): Partial<OverlayWidgets> | undefined {
  if (!isObject(v)) return undefined
  const out: Partial<OverlayWidgets> = {}
  for (const key of Object.keys(DEFAULT_OVERLAY_WIDGETS) as (keyof OverlayWidgets)[]) {
    if (key in v) out[key] = Boolean(v[key])
  }
  return out
}

function sanitizeWidgetPositions(v: unknown): Partial<OverlayWidgetPositions> | undefined {
  if (!isObject(v)) return undefined
  const out: Partial<OverlayWidgetPositions> = {}
  for (const key of Object.keys(DEFAULT_OVERLAY_WIDGET_POSITIONS) as OverlayWidgetKey[]) {
    const pos = v[key]
    if (!isObject(pos)) continue
    const anchor = oneOf(pos.anchor, WIDGET_ANCHORS)
    const x = finite(pos.x)
    const y = finite(pos.y)
    if (anchor && x != null && y != null) out[key] = { anchor, x, y }
  }
  return out
}

function sanitizeWidgetScales(v: unknown): Partial<Record<OverlayWidgetKey, number>> | undefined {
  if (!isObject(v)) return undefined
  const out: Partial<Record<OverlayWidgetKey, number>> = {}
  for (const key of Object.keys(DEFAULT_OVERLAY_WIDGET_POSITIONS) as OverlayWidgetKey[]) {
    if (key in v) {
      const n = clamped(v[key], 0.5, 2.0)
      if (n != null) out[key] = n
    }
  }
  return out
}

function sanitizeWidgetOpacities(v: unknown): Partial<Record<OverlayWidgetKey, number>> | undefined {
  if (!isObject(v)) return undefined
  const out: Partial<Record<OverlayWidgetKey, number>> = {}
  for (const key of Object.keys(DEFAULT_OVERLAY_WIDGET_POSITIONS) as OverlayWidgetKey[]) {
    if (key in v) {
      const n = clamped(v[key], 0.1, 1.0)
      if (n != null) out[key] = n
    }
  }
  return out
}

function sanitizeBuildOrders(v: unknown): BuildOrder[] | undefined {
  if (!Array.isArray(v)) return undefined
  const out: BuildOrder[] = []
  const names = new Set<string>()
  // Imported BOs are user data, but still pass through the same normalizer as
  // bundled data before being persisted and sent to the overlay renderer.
  for (const raw of v.slice(0, 5_000)) {
    const normalized = normalizeBuildOrder(raw)
    if (!normalized.ok) continue
    const name = normalized.value.name.trim()
    if (!name || names.has(name)) continue
    names.add(name)
    out.push(normalized.value)
  }
  return out
}

function sanitizeBuildOrderNames(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined
  const out: string[] = []
  const seen = new Set<string>()
  for (const value of v.slice(0, 5_000)) {
    if (typeof value !== 'string') continue
    const name = value.trim().slice(0, 256)
    if (!name || seen.has(name)) continue
    seen.add(name)
    out.push(name)
  }
  return out
}

function sanitizeMatchupNotes(v: unknown): Record<string, string> | undefined {
  if (!isObject(v)) return undefined
  const out: Record<string, string> = {}
  let count = 0
  for (const [key, val] of Object.entries(v)) {
    if (count++ > 500) break
    if (typeof key === 'string' && typeof val === 'string') {
      const cleanKey = key.trim().slice(0, 128)
      const cleanVal = val.trim().slice(0, 5000)
      if (cleanKey && cleanVal) {
        out[cleanKey] = cleanVal
      }
    }
  }
  return out
}

function sanitizeBuildPlaylists(v: unknown): BuildPlaylist[] | undefined {
  if (!Array.isArray(v)) return undefined
  const out: BuildPlaylist[] = []
  for (const item of v.slice(0, 50)) {
    if (!isObject(item)) continue
    if (typeof item.id !== 'string' || typeof item.name !== 'string') continue
    const id = item.id.trim()
    const name = item.name.trim()
    if (!id || !name) continue
    const description = typeof item.description === 'string' ? item.description.trim().slice(0, 500) : ''
    const civ = typeof item.civ === 'string' ? item.civ.trim() : null
    const buildOrderIds = Array.isArray(item.buildOrderIds)
      ? item.buildOrderIds
          .filter((b): b is string => typeof b === 'string')
          .map((b) => b.trim())
          .filter(Boolean)
      : []
    const createdAt = typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString()
    const updatedAt = typeof item.updatedAt === 'string' ? item.updatedAt : new Date().toISOString()
    out.push({ id, name, description, civ, buildOrderIds, createdAt, updatedAt })
  }
  return out
}

function sanitizeOverlay(v: unknown): Partial<OverlaySettings> | undefined {
  if (!isObject(v)) return undefined
  const out: Partial<OverlaySettings> = {}
  if ('opacity' in v) {
    const n = clamped(v.opacity, 0.3, 1)
    if (n != null) out.opacity = n
  }
  if ('position' in v) {
    const s = oneOf(v.position, OVERLAY_POSITIONS)
    if (s) out.position = s
  }
  if ('locked' in v) out.locked = Boolean(v.locked)
  if ('showMatchup' in v) out.showMatchup = Boolean(v.showMatchup)
  if ('showPostGame' in v) out.showPostGame = Boolean(v.showPostGame)
  if ('showStatus' in v) out.showStatus = Boolean(v.showStatus)
  if ('defaultBuildCiv' in v) {
    const s = stringOrNull(v.defaultBuildCiv)
    if (s !== undefined) out.defaultBuildCiv = s
  }
  if ('widgets' in v) {
    const w = sanitizeWidgets(v.widgets)
    // Partial is fine at runtime — update() spreads it over the current widgets.
    if (w) out.widgets = w as OverlayWidgets
  }
  if ('apm' in v) out.apm = Boolean(v.apm)
  if ('inputHookMigrated' in v) out.inputHookMigrated = Boolean(v.inputHookMigrated)
  if ('minimalHudMigrated' in v) out.minimalHudMigrated = Boolean(v.minimalHudMigrated)
  if ('apmCorner' in v) {
    const s = oneOf(v.apmCorner, APM_CORNERS)
    if (s) out.apmCorner = s
  }
  if ('gateToGame' in v) out.gateToGame = Boolean(v.gateToGame)
  if ('troopsPos' in v) {
    const s = oneOf(v.troopsPos, TROOPS_POS)
    if (s) out.troopsPos = s
  }
  if ('showAgeTargets' in v) out.showAgeTargets = Boolean(v.showAgeTargets)
  if ('showSession' in v) out.showSession = Boolean(v.showSession)
  if ('showCounter' in v) out.showCounter = Boolean(v.showCounter)
  if ('showCoach' in v) out.showCoach = Boolean(v.showCoach)
  if ('buildOrderId' in v) {
    const s = stringOrNull(v.buildOrderId)
    if (s !== undefined) out.buildOrderId = s
  }
  if ('buildOrderMode' in v) {
    const mode = oneOf(v.buildOrderMode, BUILD_ORDER_MODES)
    if (mode) out.buildOrderMode = mode
  }
  if ('scale' in v) {
    const n = clamped(v.scale, 0.75, 1.5)
    if (n != null) out.scale = n
  }
  if ('widgetPositions' in v) {
    const wp = sanitizeWidgetPositions(v.widgetPositions)
    if (wp) out.widgetPositions = wp as OverlayWidgetPositions
  }
  if ('buildOrderFontSize' in v) {
    const n = clamped(v.buildOrderFontSize, 11, 18)
    if (n != null) out.buildOrderFontSize = n
  }
  if ('buildOrderImageSize' in v) {
    const n = clamped(v.buildOrderImageSize, 20, 48)
    if (n != null) out.buildOrderImageSize = n
  }
  if ('buildOrderViewMode' in v) {
    const mode = oneOf(v.buildOrderViewMode, ['illustrated', 'text'] as const)
    if (mode) out.buildOrderViewMode = mode
  }
  if ('buildOrderShowNext' in v) out.buildOrderShowNext = Boolean(v.buildOrderShowNext)
  if ('buildOrderShowResources' in v)
    out.buildOrderShowResources = Boolean(v.buildOrderShowResources)
  if ('buildOrderShowNotes' in v) out.buildOrderShowNotes = Boolean(v.buildOrderShowNotes)
  if ('buildOrderShowResponsePlan' in v) {
    out.buildOrderShowResponsePlan = Boolean(v.buildOrderShowResponsePlan)
  }
  if ('buildOrderPanelWidth' in v) {
    const n = clamped(v.buildOrderPanelWidth, 280, 520)
    if (n != null) out.buildOrderPanelWidth = Math.round(n)
  }
  if ('buildOrderShowTitle' in v) out.buildOrderShowTitle = Boolean(v.buildOrderShowTitle)
  if ('customBuildOrders' in v) {
    const builds = sanitizeBuildOrders(v.customBuildOrders)
    if (builds) out.customBuildOrders = builds
  }
  if ('buildOrderCycle' in v) {
    const names = sanitizeBuildOrderNames(v.buildOrderCycle)
    if (names) out.buildOrderCycle = names
  }
  if ('buildOrderDisabled' in v) {
    const names = sanitizeBuildOrderNames(v.buildOrderDisabled)
    if (names) out.buildOrderDisabled = names
  }
  if ('showEcoSplit' in v) out.showEcoSplit = Boolean(v.showEcoSplit)
  if ('miniHud' in v) out.miniHud = Boolean(v.miniHud)
  if ('audioCues' in v) out.audioCues = Boolean(v.audioCues)
  if ('audioCueVolume' in v) {
    const n = clamped(v.audioCueVolume, 0, 1)
    if (n != null) out.audioCueVolume = n
  }
  if ('timingCheckpoints' in v) out.timingCheckpoints = Boolean(v.timingCheckpoints)
  if ('widgetScales' in v) {
    const ws = sanitizeWidgetScales(v.widgetScales)
    if (ws) out.widgetScales = ws
  }
  if ('widgetOpacities' in v) {
    const wo = sanitizeWidgetOpacities(v.widgetOpacities)
    if (wo) out.widgetOpacities = wo
  }
  if ('customCss' in v && typeof v.customCss === 'string') {
    // Keep the setting bounded so a malformed renderer patch cannot turn the
    // settings file into an unbounded stylesheet cache.
    out.customCss = v.customCss.slice(0, 20_000)
  }
  return out
}

/**
 * Validates a hotkey as "Modifier+…+Key": at least one modifier (so a global
 * shortcut can't hijack a bare letter system-wide) and a non-modifier final key.
 * Aliases such as Ctrl/Control are folded to a canonical Electron accelerator.
 */
function sanitizeHotkey(v: unknown): string | undefined {
  return normalizeAccelerator(v)
}

function sanitizeHotkeys(v: unknown): Partial<HotkeySettings> | undefined {
  if (!isObject(v)) return undefined
  const out: Partial<HotkeySettings> = {}
  if ('toggleOverlay' in v) {
    const s = sanitizeHotkey(v.toggleOverlay)
    if (s) out.toggleOverlay = s
  }
  if ('placementMode' in v) {
    const s = sanitizeHotkey(v.placementMode)
    if (s) out.placementMode = s
  }
  if ('nextBuildStep' in v) {
    const s = sanitizeHotkey(v.nextBuildStep)
    if (s) out.nextBuildStep = s
  }
  if ('previousBuildStep' in v) {
    const s = sanitizeHotkey(v.previousBuildStep)
    if (s) out.previousBuildStep = s
  }
  if ('resetBuildStep' in v) {
    const s = sanitizeHotkey(v.resetBuildStep)
    if (s) out.resetBuildStep = s
  }
  if ('nextCounter' in v) {
    const s = sanitizeHotkey(v.nextCounter)
    if (s) out.nextCounter = s
  }
  if ('nextBuildOrder' in v) {
    const s = sanitizeHotkey(v.nextBuildOrder)
    if (s) out.nextBuildOrder = s
  }
  if ('previousBuildOrder' in v) {
    const s = sanitizeHotkey(v.previousBuildOrder)
    if (s) out.previousBuildOrder = s
  }
  if ('toggleBuildOrder' in v) {
    const s = sanitizeHotkey(v.toggleBuildOrder)
    if (s) out.toggleBuildOrder = s
  }
  if ('switchTimerMode' in v) {
    const s = sanitizeHotkey(v.switchTimerMode)
    if (s) out.switchTimerMode = s
  }
  if ('startTimer' in v) {
    const s = sanitizeHotkey(v.startTimer)
    if (s) out.startTimer = s
  }
  if ('stopTimer' in v) {
    const s = sanitizeHotkey(v.stopTimer)
    if (s) out.stopTimer = s
  }
  if ('resetTimer' in v) {
    const s = sanitizeHotkey(v.resetTimer)
    if (s) out.resetTimer = s
  }
  return out
}

function sanitizePolling(v: unknown): Partial<PollingSettings> | undefined {
  if (!isObject(v)) return undefined
  const out: Partial<PollingSettings> = {}
  if ('idleIntervalMs' in v) {
    const n = finite(v.idleIntervalMs)
    if (n != null) out.idleIntervalMs = Math.max(8000, n)
  }
  if ('activeIntervalMs' in v) {
    const n = finite(v.activeIntervalMs)
    if (n != null) out.activeIntervalMs = Math.max(4000, n)
  }
  return out
}

function sanitizeLocalData(v: unknown): Partial<LocalDataSettings> | undefined {
  if (!isObject(v)) return undefined
  const out: Partial<LocalDataSettings> = {}
  if ('consentGranted' in v) out.consentGranted = Boolean(v.consentGranted)
  if ('gameDir' in v) {
    const s = stringOrNull(v.gameDir)
    if (s !== undefined) out.gameDir = s
  }
  if ('excludeAiFromStats' in v) out.excludeAiFromStats = Boolean(v.excludeAiFromStats)
  return out
}

function sanitizeAutomation(v: unknown): Partial<AutomationSettings> | undefined {
  if (!isObject(v)) return undefined
  const out: Partial<AutomationSettings> = {}
  if ('enabled' in v) out.enabled = Boolean(v.enabled)
  if ('syncHistory' in v) out.syncHistory = Boolean(v.syncHistory)
  if ('refreshReplayArchive' in v) out.refreshReplayArchive = Boolean(v.refreshReplayArchive)
  if ('discoverGameplay' in v) out.discoverGameplay = Boolean(v.discoverGameplay)
  if ('syncSources' in v) out.syncSources = Boolean(v.syncSources)
  if ('cacheSummaries' in v) out.cacheSummaries = Boolean(v.cacheSummaries)
  if ('cacheReplays' in v) out.cacheReplays = Boolean(v.cacheReplays)
  if ('analyzeReplays' in v) out.analyzeReplays = Boolean(v.analyzeReplays)
  if ('warmCatalogs' in v) out.warmCatalogs = Boolean(v.warmCatalogs)
  if ('intervalMinutes' in v) {
    const n = finite(v.intervalMinutes)
    if (n != null) out.intervalMinutes = Math.round(Math.min(24 * 60, Math.max(1, n)))
  }
  if ('maxSummariesPerRun' in v) {
    const n = finite(v.maxSummariesPerRun)
    if (n != null) out.maxSummariesPerRun = Math.round(Math.min(500, Math.max(1, n)))
  }
  if ('maxReplaysPerRun' in v) {
    const n = finite(v.maxReplaysPerRun)
    if (n != null) out.maxReplaysPerRun = Math.round(Math.min(200, Math.max(1, n)))
  }
  if ('maxGameplayPerRun' in v) {
    const n = finite(v.maxGameplayPerRun)
    if (n != null) out.maxGameplayPerRun = Math.round(Math.min(50, Math.max(1, n)))
  }
  return out
}

/**
 * Coerces/clamps a renderer-supplied settings patch: numbers via Number() with
 * per-field bounds, booleans via Boolean(), enum/string fields type-checked,
 * invalid values and unknown keys dropped. Pure so it's directly testable.
 */
export function sanitizePatch(patch: AppSettingsPatch): AppSettingsPatch {
  const p = patch as Record<string, unknown>
  const out: AppSettingsPatch = {}
  if ('accentColor' in p) {
    if (p.accentColor === null) out.accentColor = null
    else if (typeof p.accentColor === 'string' && HEX_COLOR.test(p.accentColor))
      out.accentColor = p.accentColor
  }
  if ('profileId' in p) {
    const n = finiteOrNull(p.profileId)
    if (n !== undefined) out.profileId = n
  }
  if ('playerName' in p) {
    const s = stringOrNull(p.playerName)
    if (s !== undefined) out.playerName = s
  }
  if ('steamId' in p) {
    const s = stringOrNull(p.steamId)
    if (s !== undefined) out.steamId = s
  }
  if ('accounts' in p) {
    const a = sanitizeAccounts(p.accounts)
    if (a) out.accounts = a
  }
  if ('historyOwnerProfileId' in p) {
    const n = finiteOrNull(p.historyOwnerProfileId)
    if (n !== undefined) out.historyOwnerProfileId = n
  }
  if ('leaderboard' in p) {
    const s = oneOf(p.leaderboard, LEADERBOARDS)
    if (s) out.leaderboard = s
  }
  if ('recentGamesCount' in p) {
    const n = finite(p.recentGamesCount)
    if (n != null) out.recentGamesCount = Math.max(1, Math.round(n))
  }
  if ('openSummaryOnGameEnd' in p) out.openSummaryOnGameEnd = Boolean(p.openSummaryOnGameEnd)
  if ('civTheme' in p) out.civTheme = Boolean(p.civTheme)
  if ('replaysApiUrl' in p) {
    const url = replaysApiUrlOrNull(p.replaysApiUrl)
    if (url !== undefined) out.replaysApiUrl = url
  }
  if ('matchupNotes' in p) {
    const n = sanitizeMatchupNotes(p.matchupNotes)
    if (n) out.matchupNotes = n
  }
  if ('buildPlaylists' in p) {
    const pl = sanitizeBuildPlaylists(p.buildPlaylists)
    if (pl) out.buildPlaylists = pl
  }
  if ('activeBuildPlaylistId' in p) {
    const s = stringOrNull(p.activeBuildPlaylistId)
    if (s !== undefined) out.activeBuildPlaylistId = s
  }
  if ('overlay' in p) {
    const o = sanitizeOverlay(p.overlay)
    if (o) out.overlay = o
  }
  if ('hotkeys' in p) {
    const h = sanitizeHotkeys(p.hotkeys)
    if (h) out.hotkeys = h
  }
  if ('polling' in p) {
    const o = sanitizePolling(p.polling)
    if (o) out.polling = o
  }
  if ('localData' in p) {
    const o = sanitizeLocalData(p.localData)
    if (o) out.localData = o
  }
  if ('automation' in p) {
    const o = sanitizeAutomation(p.automation)
    if (o) out.automation = o
  }
  return out
}

/** Typed settings over a Store, merging persisted values onto defaults. */
export class SettingsService {
  constructor(private readonly store: Store) {}

  getAll(): AppSettings {
    const stored = this.store.get<Partial<AppSettings>>(KEY) ?? {}
    const merged: AppSettings = {
      ...DEFAULT_SETTINGS,
      ...stored,
      matchupNotes: stored.matchupNotes ?? {},
      buildPlaylists: stored.buildPlaylists ?? [],
      activeBuildPlaylistId: stored.activeBuildPlaylistId ?? null,
      overlay: {
        ...DEFAULT_SETTINGS.overlay,
        ...(stored.overlay ?? {}),
        widgets: { ...DEFAULT_OVERLAY_WIDGETS, ...(stored.overlay?.widgets ?? {}) },
        widgetPositions: {
          ...DEFAULT_OVERLAY_WIDGET_POSITIONS,
          ...(stored.overlay?.widgetPositions ?? {}),
        },
      },
      hotkeys: { ...DEFAULT_HOTKEYS, ...(stored.hotkeys ?? {}) },
      polling: { ...DEFAULT_SETTINGS.polling, ...(stored.polling ?? {}) },
      // Local data is always on now — force it true even for installs that
      // persisted the old opt-out value.
      localData: {
        ...DEFAULT_SETTINGS.localData,
        ...(stored.localData ?? {}),
        consentGranted: true,
      },
      automation: { ...DEFAULT_SETTINGS.automation, ...(stored.automation ?? {}) },
      accounts: stored.accounts ?? [],
    }
    // Migrate a pre-multi-account install (single profileId) into accounts[].
    if (merged.accounts.length === 0 && merged.profileId != null) {
      merged.accounts = [{ profileId: merged.profileId, name: merged.playerName ?? 'Player' }]
    }
    // Existing overlay settings had live APM (global WH_KEYBOARD_LL hook) on
    // by default. Turn it off once; later opt-in is kept via the flag.
    const storedOverlay = stored.overlay
    let overlayDirty = false
    if (
      storedOverlay != null &&
      typeof storedOverlay === 'object' &&
      (storedOverlay as { inputHookMigrated?: unknown }).inputHookMigrated !== true
    ) {
      merged.overlay.apm = false
      merged.overlay.inputHookMigrated = true
      overlayDirty = true
    }
    // Existing installs used a dense dashboard overlay. Flip them to the quiet
    // mini-HUD once; later opt-out is kept via the flag.
    if (
      storedOverlay != null &&
      typeof storedOverlay === 'object' &&
      (storedOverlay as { minimalHudMigrated?: unknown }).minimalHudMigrated !== true
    ) {
      merged.overlay.miniHud = true
      merged.overlay.minimalHudMigrated = true
      overlayDirty = true
    }
    if (overlayDirty) this.store.set(KEY, merged)
    return merged
  }

  update(rawPatch: AppSettingsPatch): AppSettings {
    const patch = sanitizePatch(rawPatch)
    const current = this.getAll()
    // Deep-merge the known nested objects so a partial nested patch (e.g.
    // `{ overlay: { locked: true } }` arriving over IPC) can't silently wipe its
    // sibling fields (opacity / widgets / widgetPositions).
    const next: AppSettings = {
      ...current,
      ...patch,
      matchupNotes: patch.matchupNotes
        ? { ...current.matchupNotes, ...patch.matchupNotes }
        : current.matchupNotes,
      buildPlaylists: patch.buildPlaylists !== undefined ? patch.buildPlaylists : current.buildPlaylists,
      activeBuildPlaylistId:
        patch.activeBuildPlaylistId !== undefined
          ? patch.activeBuildPlaylistId
          : current.activeBuildPlaylistId,
      overlay: patch.overlay
        ? {
            ...current.overlay,
            ...patch.overlay,
            widgets: { ...current.overlay.widgets, ...(patch.overlay.widgets ?? {}) },
            widgetPositions: {
              ...current.overlay.widgetPositions,
              ...(patch.overlay.widgetPositions ?? {}),
            },
          }
        : current.overlay,
      hotkeys: patch.hotkeys ? { ...current.hotkeys, ...patch.hotkeys } : current.hotkeys,
      polling: patch.polling ? { ...current.polling, ...patch.polling } : current.polling,
      localData: patch.localData ? { ...current.localData, ...patch.localData } : current.localData,
      automation: patch.automation
        ? { ...current.automation, ...patch.automation }
        : current.automation,
    }
    this.store.set(KEY, next)
    return next
  }

  /** Adds the account if new, then makes it the active one. */
  setProfile(profileId: number, playerName: string): AppSettings {
    const current = this.getAll()
    const accounts = upsertAccount(current.accounts, { profileId, name: playerName })
    return this.update({ profileId, playerName, accounts })
  }

  /** Switches the active account to an already-linked one (no-op if unknown). */
  setActiveProfile(profileId: number): AppSettings {
    const current = this.getAll()
    const acc = current.accounts.find((a) => a.profileId === profileId)
    if (!acc) return current
    return this.update({ profileId: acc.profileId, playerName: acc.name })
  }

  /** Unlinks an account; if it was active, falls back to the first remaining one. */
  removeAccount(profileId: number): AppSettings {
    const current = this.getAll()
    const accounts = current.accounts.filter((a) => a.profileId !== profileId)
    if (current.profileId !== profileId) return this.update({ accounts })
    const next = accounts[0] ?? null
    return this.update({
      accounts,
      profileId: next?.profileId ?? null,
      playerName: next?.name ?? null,
    })
  }

  hasProfile(): boolean {
    return this.getAll().profileId != null
  }
}

/** Adds or updates an account in the list (dedup by profileId), keeping order. */
function upsertAccount(accounts: Account[], account: Account): Account[] {
  const existing = accounts.findIndex((a) => a.profileId === account.profileId)
  if (existing === -1) return [...accounts, account]
  const next = [...accounts]
  next[existing] = account
  return next
}
