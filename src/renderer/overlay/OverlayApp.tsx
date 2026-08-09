import {
  useEffect,
  useMemo,
  useState,
  useRef,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { Move } from 'lucide-react'
import { ipc } from '@shared/ipc'
import type { ScoutReport } from '@domain/types'
import type { LiveMatchup } from '@domain/liveMatch'
import type { SessionSummary } from '@domain/session'
import type {
  OverlayDetectionPayload,
  OverlayMatchState,
  PostGameSummary,
} from '@ipc/contract'
import { matchupTroopsForTeam } from '@domain/civUnits'
import { COUNTERABLE_CIVS, counterPlanForCiv } from '@domain/civUnits'
import { civDisplayName } from '@domain/civ'
import { gameElapsedSec, todMsFromEpoch } from '@domain/localStats'
import { bracketFromRankLevel, getBenchmarks } from '@domain/benchmarks'
import { buildIndexForCiv, stepIndexForElapsed, type BuildOrder } from '@domain/buildOrderSchema'
import { applyAccent } from '@shared/accent'
import { CIV_FLAGS } from '@data/vendor/aoe4world-overlay/flags'
import { BUNDLED_BUILD_ORDERS } from '@data/buildOrders'
import {
  DEFAULT_OVERLAY_WIDGET_POSITIONS,
  type OverlayWidgetAnchor,
  type OverlayWidgetKey,
  type OverlayWidgetPosition,
  type OverlayWidgetPositions,
} from '@store/settings'
import { MatchupBar, type MatchupSide } from './MatchupBar'
import { PostGameCard } from './PostGameCard'
import { ApmWidget } from './ApmWidget'
import { BuildOrderWidget } from './BuildOrderWidget'
import { AgeTargetsWidget } from './AgeTargetsWidget'
import { SessionWidget } from './SessionWidget'
import { CounterWidget } from './CounterWidget'
import { CoachWidget } from './CoachWidget'
import { panelBg } from './panelBg'
import { useI18n } from '../i18n'

const PLACEHOLDER_MATCHUP: LiveMatchup = {
  teams: [
    [
      {
        profileId: 1,
        name: 'You',
        civ: 'english',
        rating: 950,
        winRate: null,
        rank: null,
        rankLevel: 'gold_2',
        favoriteCivs: [],
        isMe: true,
        isAI: false,
      },
      {
        profileId: 2,
        name: 'Ally',
        civ: 'abbasid_dynasty',
        rating: 920,
        winRate: null,
        rank: null,
        rankLevel: 'gold_1',
        favoriteCivs: [],
        isMe: false,
        isAI: false,
      },
    ],
    [
      {
        profileId: 3,
        name: 'Enemy 1',
        civ: 'french',
        rating: 980,
        winRate: null,
        rank: null,
        rankLevel: 'gold_3',
        favoriteCivs: [],
        isMe: false,
        isAI: false,
      },
      {
        profileId: 4,
        name: 'Enemy 2',
        civ: 'mongols',
        rating: 940,
        winRate: null,
        rank: null,
        rankLevel: 'gold_2',
        favoriteCivs: [],
        isMe: false,
        isAI: false,
      },
    ],
  ],
}

const PLACEHOLDER_SESSION: SessionSummary = { games: 4, wins: 3, losses: 1, ratingDelta: 42 }

const PLACEHOLDER_POST_GAME: PostGameSummary = {
  result: 'win',
  civ: 'english',
  oppCiv: 'french',
  map: 'Dry Arabia',
  grade: 'B+',
  apm: 72,
  durationSec: 1320,
  didWell: ['Kept villager production steady'],
  improve: ['Spend resources before the next fight'],
  vsAI: false,
}

const WIDGET_LABELS: Record<OverlayWidgetKey, string> = {
  matchup: 'Matchup and troops',
  apm: 'Live APM',
  postGame: 'Post-game card',
  buildOrder: 'Build order',
  ageTargets: 'Age targets',
  session: 'Session record',
  counter: 'Counter plan',
  coach: 'Live coach',
}

/**
 * Transparent in-game overlay root. The placement hotkey (Ctrl+Alt+O by
 * default) toggles placement mode: the same current widgets become draggable,
 * and idle mode renders placeholders so the player can arrange the overlay
 * before queueing.
 */
export function OverlayApp() {
  const { tt } = useI18n()
  const [matchState, setMatchState] = useState<OverlayMatchState>('idle')
  const [detection, setDetection] = useState<OverlayDetectionPayload>({
    processRunning: null,
    localInMatch: null,
    liveSource: 'no-game',
    profileConfigured: false,
    localDataEnabled: false,
  })
  const [myCiv, setMyCiv] = useState<string | null>(null)
  const [oppCiv, setOppCiv] = useState<string | null>(null)
  const [oppName, setOppName] = useState<string | null>(null)
  const [oppIsAI, setOppIsAI] = useState(false)
  const [matchup, setMatchup] = useState<LiveMatchup | null>(null)
  const [oppScout, setOppScout] = useState<ScoutReport | null>(null)
  const [postGame, setPostGame] = useState<PostGameSummary | null>(null)
  const [apm, setApm] = useState<number | null>(null)
  const [session, setSession] = useState<SessionSummary | null>(null)
  const [sessionShown, setSessionShown] = useState(true)
  const [counterShown, setCounterShown] = useState(true)
  // Custom/AI/casting games do not always provide an opponent civ. The global
  // counter hotkey cycles through the same explainable civ plans used by the
  // matchup helper without changing the detected live roster.
  const [counterCivOverride, setCounterCivOverride] = useState<string | null>(null)
  const [coachShown, setCoachShown] = useState(true)
  const [apmShown, setApmShown] = useState(true)
  const [matchupShown, setMatchupShown] = useState(true)
  const [postGameShown, setPostGameShown] = useState(true)
  const [statusShown, setStatusShown] = useState(true)
  const [troopsShown, setTroopsShown] = useState(true)
  const [civTheme, setCivTheme] = useState(true)
  const [accentColor, setAccentColor] = useState<string | null>(null)
  const [placementMode, setPlacementMode] = useState(false)
  // The user's overlay opacity, applied as PANEL BACKGROUND alpha only (via the
  // --panel-alpha CSS variable) — the window stays at setOpacity(1) so text and
  // icons never dim with it.
  const [panelAlpha, setPanelAlpha] = useState(1)
  // Per-widget scale, applied as a CSS transform around each widget's anchor
  // corner so saved positions stay put across scale changes.
  const [scale, setScale] = useState(1)
  const [buildOrderFontSize, setBuildOrderFontSize] = useState(14)
  const [buildOrderImageSize, setBuildOrderImageSize] = useState(30)
  const [buildOrderViewMode, setBuildOrderViewMode] = useState<'illustrated' | 'text'>('illustrated')
  const [customCss, setCustomCss] = useState('')
  const [ageTargetsShown, setAgeTargetsShown] = useState(true)
  const [customBuildOrders, setCustomBuildOrders] = useState<BuildOrder[]>([])
  const [buildOrderCycle, setBuildOrderCycle] = useState<string[]>([])
  const [buildOrderDisabled, setBuildOrderDisabled] = useState<string[]>([])
  // The pinned build order's unique name (Guides → "Show in overlay"); null = hidden.
  const [buildOrderId, setBuildOrderId] = useState<string | null>(null)
  const [buildOrderMode, setBuildOrderMode] = useState<'manual' | 'auto' | 'hidden'>('manual')
  const [buildOrderVisible, setBuildOrderVisible] = useState(true)
  const [buildOrderShowNext, setBuildOrderShowNext] = useState(true)
  const [buildOrderShowResources, setBuildOrderShowResources] = useState(true)
  const [buildOrderShowNotes, setBuildOrderShowNotes] = useState(true)
  const [buildOrderShowResponsePlan, setBuildOrderShowResponsePlan] = useState(true)
  const [buildOrderPanelWidth, setBuildOrderPanelWidth] = useState(340)
  const [buildOrderShowTitle, setBuildOrderShowTitle] = useState(true)
  // Null means the build follows the game clock. Global step hotkeys set an
  // explicit index until the reset hotkey returns it to clock-driven mode.
  const [manualBuildStep, setManualBuildStep] = useState<number | null>(null)
  // RTS Overlay-compatible manual timer. The normal mode follows AoE4's
  // pause-aware local game clock; manual mode is useful for practice, casting,
  // or a replay where no live clock anchor is available.
  const [timerMode, setTimerMode] = useState<'game' | 'manual'>('game')
  const [manualTimerSec, setManualTimerSec] = useState(0)
  const [manualTimerRunning, setManualTimerRunning] = useState(false)
  const [manualTimerStartedAt, setManualTimerStartedAt] = useState<number | null>(null)
  const manualTimerSecRef = useRef(0)
  const timerModeRef = useRef<'game' | 'manual'>('game')
  const lastMatchId = useRef<string | null>(null)
  // Live match time in seconds, derived from the pushed game-clock anchor
  // (warnings.log sim start + pauses) + our wall clock; null when not in a match.
  const [elapsedSec, setElapsedSec] = useState<number | null>(null)
  const [widgetPositions, setWidgetPositions] = useState<OverlayWidgetPositions>(
    DEFAULT_OVERLAY_WIDGET_POSITIONS,
  )

  useEffect(() => {
    ipc
      .getSettings()
      .then((s) => {
        setTroopsShown(s.overlay.troopsPos !== 'hidden')
        setCivTheme(s.civTheme !== false)
        setWidgetPositions(clampPositions(s.overlay.widgetPositions))
        setPlacementMode(!s.overlay.locked)
        setAccentColor(s.accentColor ?? null)
        setPanelAlpha(clampAlpha(s.overlay.opacity))
        setScale(clampScale(s.overlay.scale))
        setApmShown(s.overlay.apm !== false)
        setMatchupShown(s.overlay.showMatchup !== false)
        setPostGameShown(s.overlay.showPostGame !== false)
        setStatusShown(s.overlay.showStatus !== false)
        setBuildOrderFontSize(s.overlay.buildOrderFontSize ?? 14)
        setBuildOrderImageSize(s.overlay.buildOrderImageSize ?? 30)
        setBuildOrderViewMode(s.overlay.buildOrderViewMode ?? 'illustrated')
        setBuildOrderMode(s.overlay.buildOrderMode ?? 'manual')
        setBuildOrderShowNext(s.overlay.buildOrderShowNext !== false)
        setBuildOrderShowResources(s.overlay.buildOrderShowResources !== false)
        setBuildOrderShowNotes(s.overlay.buildOrderShowNotes !== false)
        setBuildOrderShowResponsePlan(s.overlay.buildOrderShowResponsePlan !== false)
        setBuildOrderPanelWidth(clampBuildPanelWidth(s.overlay.buildOrderPanelWidth))
        setBuildOrderShowTitle(s.overlay.buildOrderShowTitle !== false)
        setCustomCss(s.overlay.customCss ?? '')
        setAgeTargetsShown(s.overlay.showAgeTargets !== false)
        setSessionShown(s.overlay.showSession !== false)
        setCounterShown(s.overlay.showCounter !== false)
        setCoachShown(s.overlay.showCoach !== false)
        setBuildOrderId(s.overlay.buildOrderId ?? null)
        setBuildOrderVisible(s.overlay.buildOrderMode !== 'hidden')
        setCustomBuildOrders(s.overlay.customBuildOrders ?? [])
        setBuildOrderCycle(s.overlay.buildOrderCycle ?? [])
        setBuildOrderDisabled(s.overlay.buildOrderDisabled ?? [])
      })
      .catch(() => {})

    // The overlay window is resized to the display's work area on monitor /
    // resolution changes — re-clamp so a widget saved on a larger display
    // can't sit off-canvas. Clamped in-memory only: the saved position is
    // untouched, so plugging the big monitor back in restores it.
    const onResize = () => setWidgetPositions((p) => clampPositions(p))
    window.addEventListener('resize', onResize)

    const offLock = ipc.onOverlayLock((locked) => setPlacementMode(!locked))
    const offApm = ipc.onOverlayApm((v) => setApm(v))
    const offDetection = ipc.onOverlayDetection(setDetection)
    // The main process re-pushes the clock ANCHOR every second while a match is
    // live; elapsed is derived here from the anchor + our wall clock (freezes
    // through pauses because the anchor carries them).
    const offClock = ipc.onOverlayGameClock((clock) =>
      setElapsedSec(clock ? gameElapsedSec(clock, todMsFromEpoch(Date.now())) : null),
    )
    const offSettings = ipc.onOverlaySettings((o) => {
      setTroopsShown(o.troopsPos !== 'hidden')
      setCivTheme(o.civTheme !== false)
      setWidgetPositions(clampPositions(o.widgetPositions))
      setAccentColor(o.accentColor ?? null)
      setPanelAlpha(clampAlpha(o.opacity))
      setScale(clampScale(o.scale))
      setApmShown(o.apm !== false)
      setMatchupShown(o.showMatchup !== false)
      setPostGameShown(o.showPostGame !== false)
      setStatusShown(o.showStatus !== false)
      setBuildOrderFontSize(o.buildOrderFontSize ?? 14)
      setBuildOrderImageSize(o.buildOrderImageSize ?? 30)
      setBuildOrderViewMode(o.buildOrderViewMode ?? 'illustrated')
      setBuildOrderMode(o.buildOrderMode ?? 'manual')
      setBuildOrderShowNext(o.buildOrderShowNext !== false)
      setBuildOrderShowResources(o.buildOrderShowResources !== false)
      setBuildOrderShowNotes(o.buildOrderShowNotes !== false)
      setBuildOrderShowResponsePlan(o.buildOrderShowResponsePlan !== false)
      setBuildOrderPanelWidth(clampBuildPanelWidth(o.buildOrderPanelWidth))
      setBuildOrderShowTitle(o.buildOrderShowTitle !== false)
      setCustomCss(o.customCss ?? '')
      setAgeTargetsShown(o.showAgeTargets !== false)
      setSessionShown(o.showSession !== false)
      setCounterShown(o.showCounter !== false)
      setCoachShown(o.showCoach !== false)
      setBuildOrderId(o.buildOrderId ?? null)
      setBuildOrderVisible(o.buildOrderMode !== 'hidden')
      setCustomBuildOrders(o.customBuildOrders ?? [])
      setBuildOrderCycle(o.buildOrderCycle ?? [])
      setBuildOrderDisabled(o.buildOrderDisabled ?? [])
    })

    const offUpdate = ipc.onOverlayUpdate((p) => {
      setMatchState(p.matchState)
      setSession(p.session ?? null)
      if (p.matchState !== 'ongoing' || p.matchId !== lastMatchId.current) {
        setManualBuildStep(null)
        setCounterCivOverride(null)
      }
      if (p.matchState === 'ongoing' && p.matchId !== lastMatchId.current) {
        setTimerMode('game')
        timerModeRef.current = 'game'
        setManualTimerSec(0)
        manualTimerSecRef.current = 0
        setManualTimerRunning(false)
        setManualTimerStartedAt(null)
      }
      lastMatchId.current = p.matchId
      if (p.matchState === 'ongoing') {
        setMyCiv(p.myCiv)
        setOppCiv(p.oppCiv)
        setOppName(p.oppName)
        setOppIsAI(p.oppIsAI)
        setOppScout(p.scout)
        setMatchup(p.matchup)
        setPostGame(null)
      } else {
        setMyCiv(null)
        setOppCiv(null)
        setOppName(null)
        setOppIsAI(false)
        setOppScout(null)
        setMatchup(null)
        setPostGame(p.postGame ?? null)
      }
    })
    return () => {
      offUpdate()
      offApm()
      offDetection()
      offClock()
      offSettings()
      offLock()
      window.removeEventListener('resize', onResize)
    }
  }, [])

  const inGame = matchState === 'ongoing'

  useEffect(() => {
    if (!manualTimerRunning || manualTimerStartedAt == null) return
    const timer = window.setInterval(() => {
      const next = Math.max(0, (Date.now() - manualTimerStartedAt) / 1000)
      manualTimerSecRef.current = next
      setManualTimerSec(next)
    }, 250)
    return () => window.clearInterval(timer)
  }, [manualTimerRunning, manualTimerStartedAt])

  // Civilization theme: while a match is live re-accent to your civ's colour;
  // otherwise the user's accent (or default gold).
  useEffect(() => {
    const civHex = civTheme && inGame && myCiv ? (CIV_FLAGS[myCiv]?.color ?? null) : null
    applyAccent(civHex ?? accentColor)
  }, [civTheme, inGame, myCiv, accentColor])
  const localizedPlaceholderMatchup = useMemo<LiveMatchup>(
    () => ({
      ...PLACEHOLDER_MATCHUP,
      teams: PLACEHOLDER_MATCHUP.teams.map((team) =>
        team.map((player) => ({
          ...player,
          name:
            player.name === 'You'
              ? tt('You')
              : player.name === 'Ally'
                ? tt('Ally')
                : player.name === 'Enemy 1'
                  ? tt('Enemy 1')
                  : tt('Enemy 2'),
        })),
      ),
    }),
    [tt],
  )
  const renderMatchup = matchup ?? (!inGame && placementMode ? localizedPlaceholderMatchup : null)
  const haveMatchup =
    inGame && ((matchup?.teams.length ?? 0) >= 2 || myCiv != null || oppCiv != null)
  const showMatchup = haveMatchup || placementMode
  const showPostGame = (matchState === 'ended' && postGame != null) || placementMode
  const showPostGameWidget = postGameShown && showPostGame
  const showStatusPill =
    statusShown &&
    !placementMode &&
    !showMatchup &&
    !showPostGameWidget &&
    !(matchState === 'ended' && postGame != null)
  const showApm = apmShown && (apm != null || placementMode)
  // Shown whenever the overlay is up with a session to report (in-game AND on
  // the post-game screen, where the just-finished game is already counted).
  const showSession = sessionShown && (session != null || placementMode)

  const waitingLabel =
    detection.processRunning === false
      ? tt('waiting for a game')
      : detection.processRunning === true && detection.localInMatch === false
        ? tt('AoE4 is open · enter a match')
        : detection.processRunning === true &&
            detection.localInMatch == null &&
            !detection.localDataEnabled
          ? tt('AoE4 is open · allow local game data')
        : detection.processRunning === true && !detection.profileConfigured
          ? tt('AoE4 is open · connect your profile')
          : tt('checking game state')

  // The pinned build order, resolved by its unique name. Imported builds are
  // checked first so an edited local build can intentionally replace a bundled
  // build with the same title.
  const allBuilds = useMemo<BuildOrder[]>(() => {
    const seen = new Set<string>()
    return [...customBuildOrders, ...(BUNDLED_BUILD_ORDERS as unknown as BuildOrder[])].filter(
      (build) => {
        if (!build?.name || seen.has(build.name)) return false
        seen.add(build.name)
        return true
      },
    )
  }, [customBuildOrders])
  const cycleBuilds = useMemo(() => {
    const byName = new Map(allBuilds.map((build) => [build.name, build]))
    // Only explicitly activated builds participate in the overlay cycle. The
    // catalogue can be large; an empty active pool intentionally means no
    // automatic build order is shown.
    const orderedNames = buildOrderCycle
    return orderedNames
      .map((name) => byName.get(name))
      .filter((build): build is BuildOrder => !!build && !buildOrderDisabled.includes(build.name))
  }, [allBuilds, buildOrderCycle, buildOrderDisabled])
  const selectedBuild = useMemo<BuildOrder | null>(
    () =>
      buildOrderId
        ? (allBuilds.find((b) => b.name === buildOrderId) ?? null)
        : null,
    [allBuilds, buildOrderId],
  )
  useEffect(() => {
    if (buildOrderMode !== 'auto' || !inGame || !myCiv) return
    const index = buildIndexForCiv(cycleBuilds, myCiv)
    const next = index == null ? null : cycleBuilds[index]?.name ?? null
    setBuildOrderId((current) => (current === next ? current : next))
  }, [buildOrderMode, cycleBuilds, inGame, myCiv])
  const showBuildOrder =
    buildOrderVisible && buildOrderMode !== 'hidden' && selectedBuild != null && (inGame || placementMode)
  const showAgeTargets = ageTargetsShown && (inGame || placementMode)
  // Placement mode outside a match previews with a fake clock (like the other placeholders).
  const renderElapsed =
    timerMode === 'manual'
      ? manualTimerSec
      : (elapsedSec ?? (placementMode && !inGame ? 312 : null))
  const renderElapsedRef = useRef<number | null>(renderElapsed)
  renderElapsedRef.current = renderElapsed

  // RTS_Overlay and RTS Overlay both support manual step control for casters
  // and players who want to override imperfect timing. Keep the existing clock
  // mode as the default, but make the controls global so the overlay remains
  // click-through over the game.
  useEffect(() => {
    const offControl = ipc.onOverlayControl((action) => {
      const builds = cycleBuilds
      if (action === 'next-counter') {
        const current = counterCivOverride ?? oppCiv
        const currentIndex = current ? COUNTERABLE_CIVS.indexOf(current) : -1
        const next = COUNTERABLE_CIVS[(currentIndex + 1 + COUNTERABLE_CIVS.length) % COUNTERABLE_CIVS.length]
        if (next) setCounterCivOverride(next)
        return
      }
      if (action === 'switch-timer') {
        if (timerModeRef.current === 'game') {
          const next = elapsedSec ?? manualTimerSecRef.current
          manualTimerSecRef.current = Math.max(0, next)
          setManualTimerSec(Math.max(0, next))
          setTimerMode('manual')
          timerModeRef.current = 'manual'
        } else {
          setTimerMode('game')
          timerModeRef.current = 'game'
        }
        setManualTimerRunning(false)
        setManualTimerStartedAt(null)
        return
      }
      if (action === 'start-timer') {
        setTimerMode('manual')
        timerModeRef.current = 'manual'
        setManualTimerRunning(true)
        setManualTimerStartedAt(Date.now() - manualTimerSecRef.current * 1000)
        return
      }
      if (action === 'stop-timer') {
        setManualTimerRunning(false)
        setManualTimerStartedAt(null)
        return
      }
      if (action === 'reset-timer') {
        setTimerMode('manual')
        timerModeRef.current = 'manual'
        setManualTimerRunning(false)
        setManualTimerStartedAt(null)
        manualTimerSecRef.current = 0
        setManualTimerSec(0)
        setManualBuildStep(null)
        return
      }
      if (action === 'next-bo' || action === 'prev-bo') {
        if (builds.length === 0) return
        const currentIndex = selectedBuild
          ? builds.findIndex((build) => build.name === selectedBuild.name)
          : action === 'next-bo'
            ? -1
            : 0
        const delta = action === 'next-bo' ? 1 : -1
        const nextIndex = (currentIndex + delta + builds.length) % builds.length
        const nextBuild = builds[nextIndex]
        if (!nextBuild) return
        setBuildOrderId(nextBuild.name)
        setBuildOrderMode('manual')
        setManualBuildStep(null)
        void ipc
          .updateSettings({ overlay: { buildOrderId: nextBuild.name, buildOrderMode: 'manual' } })
          .catch(() => {})
        return
      }
      if (action === 'toggle-bo') {
        setBuildOrderVisible((visible) => !visible)
        return
      }
      if (!selectedBuild) return
      const automaticIndex =
        renderElapsedRef.current != null
          ? stepIndexForElapsed(selectedBuild.build_order, renderElapsedRef.current)
          : 0
      if (action === 'reset-step') {
        setManualBuildStep(null)
        return
      }
      if (action !== 'next-step' && action !== 'prev-step') return
      setManualBuildStep((current) => {
        const base = current ?? automaticIndex
        const delta = action === 'next-step' ? 1 : -1
        return Math.max(0, Math.min(selectedBuild.build_order.length - 1, base + delta))
      })
    })
    return offControl
  }, [counterCivOverride, cycleBuilds, elapsedSec, oppCiv, selectedBuild])

  const buildStepIndex =
    manualBuildStep ??
    (renderElapsed != null && selectedBuild
      ? stepIndexForElapsed(selectedBuild.build_order, renderElapsed)
      : 0)
  // The overlay renderer loads at app boot while its window is hidden, so it
  // must not scout the current profile just to prime this view. PollManager
  // sends the enriched team matchup when a live game starts; until then the
  // legacy fallback intentionally shows the civ-only pending state.
  const matchupMe = renderMatchup?.teams.flat().find((p) => p.isMe) ?? null
  const bracket = bracketFromRankLevel(matchupMe?.rankLevel)

  const troopMyCiv =
    renderMatchup?.teams[0]?.find((p) => p.isMe)?.civ ?? renderMatchup?.teams[0]?.[0]?.civ ?? myCiv
  const counterPlan = counterPlanForCiv(counterCivOverride ?? oppCiv)
  const showCounter = counterShown && counterPlan != null && (inGame || placementMode)
  const showCoach = coachShown && (inGame || placementMode) && troopMyCiv != null
  const enemyCivs = renderMatchup
    ? renderMatchup.teams
        .slice(1)
        .flat()
        .map((p) => p.civ)
    : [oppCiv]
  const troops =
    (inGame || placementMode) && troopsShown ? matchupTroopsForTeam(troopMyCiv, enemyCivs) : null

  const me: MatchupSide = {
    civ: matchupMe?.civ ?? myCiv,
    name: matchupMe?.name ?? null,
    rankLevel: matchupMe?.rankLevel ?? null,
    rating: matchupMe?.rating ?? null,
    winRate: null,
    favoriteCivs: [],
    isAI: matchupMe?.isAI ?? false,
  }
  const opponent: MatchupSide = oppScout
    ? sideFromScout(oppScout, oppCiv, false)
    : {
        civ: oppCiv,
        name: oppName,
        rankLevel: null,
        rating: null,
        winRate: null,
        favoriteCivs: [],
        isAI: oppIsAI,
      }

  // ✕ on the post-game card: clear it locally right away (no flicker waiting
  // for the round-trip), then let the main process reset match state + hide.
  const dismissPostGame = () => {
    setPostGame(null)
    setMatchState('idle')
    void ipc.dismissOverlayPostGame().catch(() => {})
  }

  const saveWidgetPosition = (key: OverlayWidgetKey, position: OverlayWidgetPosition) => {
    setWidgetPositions((prev) => {
      const next = { ...prev, [key]: position }
      void ipc.updateSettings({ overlay: { widgetPositions: next } }).catch(() => {})
      return next
    })
  }

  return (
    <div
      className="rtslytics-overlay-root relative h-screen w-screen select-none text-white"
      style={{ '--panel-alpha': panelAlpha } as CSSProperties}
    >
      {customCss && <style data-rtslytics-user-css="true">{customCss}</style>}
      {matchupShown && showMatchup && (
        <PlacedWidget
          widgetKey="matchup"
          position={widgetPositions.matchup}
          placementMode={placementMode}
          zIndex={50}
          scale={scale}
          onPositionChange={saveWidgetPosition}
        >
          <MatchupBar
            me={me}
            opponent={opponent}
            matchup={renderMatchup}
            troops={troopsShown ? troops : null}
          />
        </PlacedWidget>
      )}

      {showPostGameWidget && (
        <PlacedWidget
          widgetKey="postGame"
          position={widgetPositions.postGame}
          placementMode={placementMode}
          zIndex={60}
          scale={scale}
          onPositionChange={saveWidgetPosition}
        >
          {/* No ✕ in placement mode: the card is a drag handle there (and may be a placeholder). */}
          <PostGameCard
            summary={postGame ?? PLACEHOLDER_POST_GAME}
            onDismiss={postGame && !placementMode ? dismissPostGame : undefined}
          />
        </PlacedWidget>
      )}

      {showApm && (
        <PlacedWidget
          widgetKey="apm"
          position={widgetPositions.apm}
          placementMode={placementMode}
          zIndex={55}
          scale={scale}
          onPositionChange={saveWidgetPosition}
        >
          <ApmWidget apm={apm ?? 72} />
        </PlacedWidget>
      )}

      {showSession && (
        <PlacedWidget
          widgetKey="session"
          position={widgetPositions.session}
          placementMode={placementMode}
          zIndex={55}
          scale={scale}
          onPositionChange={saveWidgetPosition}
        >
          <SessionWidget session={session ?? PLACEHOLDER_SESSION} />
        </PlacedWidget>
      )}

      {showBuildOrder && selectedBuild && (
        <PlacedWidget
          widgetKey="buildOrder"
          position={widgetPositions.buildOrder}
          placementMode={placementMode}
          zIndex={40}
          scale={scale}
          onPositionChange={saveWidgetPosition}
        >
          <div
            className="pointer-events-none select-none rounded-lg py-1 shadow-xl ring-1 ring-white/10"
            style={{
              width: buildOrderPanelWidth,
              background: `linear-gradient(to bottom right, ${panelBg(0.95)}, ${panelBg(0.7)})`,
              textShadow: '0 1px 3px rgba(0,0,0,0.95)',
              fontSize: buildOrderFontSize,
            }}
          >
        <BuildOrderWidget
              bo={selectedBuild}
              stepIndex={buildStepIndex}
              elapsedSec={renderElapsed}
              auto={timerMode === 'game' && manualBuildStep == null && renderElapsed != null}
              fontSize={buildOrderFontSize}
              iconSize={buildOrderImageSize}
              viewMode={buildOrderViewMode}
              showNext={buildOrderShowNext}
              showResources={buildOrderShowResources}
              showNotes={buildOrderShowNotes}
          showResponsePlan={buildOrderShowResponsePlan}
          showTitle={buildOrderShowTitle}
              opponentCivs={enemyCivs}
            />
          </div>
        </PlacedWidget>
      )}

      {showAgeTargets && (
        <PlacedWidget
          widgetKey="ageTargets"
          position={widgetPositions.ageTargets}
          placementMode={placementMode}
          zIndex={45}
          scale={scale}
          onPositionChange={saveWidgetPosition}
        >
          <div
            className="pointer-events-none w-48 select-none rounded-lg text-white shadow-xl ring-1 ring-white/10"
            style={{
              background: `linear-gradient(to bottom right, ${panelBg(0.95)}, ${panelBg(0.7)})`,
              textShadow: '0 1px 3px rgba(0,0,0,0.95)',
            }}
          >
            <AgeTargetsWidget
              benchmarks={getBenchmarks(bracket)}
              bracket={bracket}
              elapsedSec={renderElapsed}
            />
          </div>
        </PlacedWidget>
      )}

      {showCounter && counterPlan && (
        <PlacedWidget
          widgetKey="counter"
          position={widgetPositions.counter}
          placementMode={placementMode}
          zIndex={44}
          scale={scale}
          onPositionChange={saveWidgetPosition}
        >
          <div
            className="pointer-events-none w-64 select-none rounded-lg text-white shadow-xl ring-1 ring-white/10"
            style={{
              background: `linear-gradient(to bottom right, ${panelBg(0.95)}, ${panelBg(0.7)})`,
              textShadow: '0 1px 3px rgba(0,0,0,0.95)',
            }}
          >
            <CounterWidget
              plan={counterPlan}
              manual={counterCivOverride != null || !inGame || oppCiv == null}
              myCivName={troopMyCiv ? civDisplayName(troopMyCiv) : null}
            />
          </div>
        </PlacedWidget>
      )}

      {showCoach && (
        <PlacedWidget
          widgetKey="coach"
          position={widgetPositions.coach}
          placementMode={placementMode}
          zIndex={43}
          scale={scale}
          onPositionChange={saveWidgetPosition}
        >
          <CoachWidget
            elapsedSec={renderElapsed}
            civ={troopMyCiv}
            placement={placementMode && !inGame}
          />
        </PlacedWidget>
      )}

      {placementMode && (
        <div className="pointer-events-none fixed inset-x-0 bottom-5 z-[90] flex justify-center">
          <span className="rounded-full bg-[#0b0e14]/95 px-4 py-2 text-xs font-medium text-white/85 shadow-2xl ring-1 ring-primary/60">
            {tt('Drag any outlined widget to place it · use the same shortcut when done')}
          </span>
        </div>
      )}

      {showStatusPill && (
        <div className="pointer-events-none fixed inset-x-0 top-1.5 z-50 flex justify-center">
          <span className="flex items-center gap-1.5 rounded-md bg-[#0b0e14]/85 px-2.5 py-1 text-[11px] text-white/70 shadow-lg ring-1 ring-white/10">
            <span className="inline-block h-2 w-2 rounded-full bg-cyan-400" />
            RTSLytics
            <span className="text-white/40">
              {inGame
                ? tt('finding matchup...')
                : matchState === 'ended'
                  ? tt('analyzing your game...')
                  : waitingLabel}
            </span>
          </span>
        </div>
      )}
    </div>
  )
}

function sideFromScout(scout: ScoutReport | null, civ: string | null, isAI: boolean): MatchupSide {
  return {
    civ,
    name: scout?.name ?? null,
    rankLevel: scout?.primary?.rankLevel ?? null,
    rating: scout?.primary?.rating ?? null,
    winRate: scout?.recentForm?.winRate ?? scout?.primary?.winRate ?? null,
    favoriteCivs: (scout?.topCivs ?? []).slice(0, 3).map((c) => c.civ),
    isAI,
  }
}

function PlacedWidget({
  widgetKey,
  position,
  placementMode,
  zIndex,
  scale = 1,
  children,
  onPositionChange,
}: {
  widgetKey: OverlayWidgetKey
  position: OverlayWidgetPosition
  placementMode: boolean
  zIndex: number
  /** Widget scale, applied around the anchor corner so positions stay put. */
  scale?: number
  children: ReactNode
  onPositionChange: (key: OverlayWidgetKey, position: OverlayWidgetPosition) => void
}) {
  const { tt } = useI18n()
  const [draft, setDraft] = useState<OverlayWidgetPosition | null>(null)
  const [drag, setDrag] = useState<{
    dx: number
    dy: number
    width: number
    height: number
  } | null>(null)
  const active = draft ?? position

  useEffect(() => {
    setDraft(null)
  }, [position.anchor, position.x, position.y])

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!placementMode || e.button !== 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    setDrag({
      dx: e.clientX - rect.left,
      dy: e.clientY - rect.top,
      width: rect.width,
      height: rect.height,
    })
    setDraft({ anchor: 'top-left', x: rect.left, y: rect.top })
    e.currentTarget.setPointerCapture(e.pointerId)
    e.preventDefault()
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag) return
    const x = clamp(e.clientX - drag.dx, 0, Math.max(0, window.innerWidth - drag.width))
    const y = clamp(e.clientY - drag.dy, 0, Math.max(0, window.innerHeight - drag.height))
    setDraft({ anchor: 'top-left', x, y })
  }

  const onPointerUp = () => {
    if (drag && draft) onPositionChange(widgetKey, draft)
    setDrag(null)
  }

  return (
    <div
      className={`overlay-widget overlay-widget-${widgetKey} ${placementMode ? 'pointer-events-auto cursor-move' : 'pointer-events-none'}`}
      data-widget-key={widgetKey}
      style={{ ...positionStyle(active, scale), zIndex }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      title={placementMode ? tt('Move overlay widget') : undefined}
    >
      {placementMode && (
        <span className="pointer-events-none absolute -left-2 -top-3 z-[70] flex h-6 items-center gap-1 rounded-full bg-primary px-2 text-[10px] font-semibold text-primary-foreground shadow-lg ring-1 ring-black/50">
          <Move className="h-3 w-3" />
          {tt(WIDGET_LABELS[widgetKey])}
        </span>
      )}
      <div className={placementMode ? 'rounded-md ring-1 ring-primary/70' : undefined}>
        {children}
      </div>
    </div>
  )
}

/** CSS transform-origin per anchor: scale grows AWAY from the anchored corner/edge. */
const SCALE_ORIGIN: Record<OverlayWidgetAnchor, string> = {
  'top-left': 'top left',
  'top-center': 'top center',
  'top-right': 'top right',
  'bottom-left': 'bottom left',
  'bottom-right': 'bottom right',
  center: 'center',
}

function positionStyle(position: OverlayWidgetPosition, scale = 1): CSSProperties {
  const px = (n: number) => `${Math.round(n)}px`
  // Scale composes AFTER the centering translate (CSS applies right-to-left), so
  // the anchor point stays fixed and the saved position is scale-independent.
  const s = scale === 1 ? '' : ` scale(${scale})`
  const base: CSSProperties = {
    position: 'absolute',
    transformOrigin: SCALE_ORIGIN[position.anchor],
  }
  switch (position.anchor) {
    case 'top-center':
      return {
        ...base,
        left: `calc(50% + ${px(position.x)})`,
        top: px(position.y),
        transform: `translateX(-50%)${s}`,
      }
    case 'top-right':
      return { ...base, right: px(position.x), top: px(position.y), transform: s || undefined }
    case 'bottom-left':
      return { ...base, left: px(position.x), bottom: px(position.y), transform: s || undefined }
    case 'bottom-right':
      return { ...base, right: px(position.x), bottom: px(position.y), transform: s || undefined }
    case 'center':
      return {
        ...base,
        left: `calc(50% + ${px(position.x)})`,
        top: `calc(50% + ${px(position.y)})`,
        transform: `translate(-50%, -50%)${s}`,
      }
    case 'top-left':
    default:
      return { ...base, left: px(position.x), top: px(position.y), transform: s || undefined }
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/** Mirror the settings range for overlay opacity ([0.3, 1], 1 when unset). */
function clampAlpha(value: number | undefined): number {
  return clamp(typeof value === 'number' && Number.isFinite(value) ? value : 1, 0.3, 1)
}

/** Mirror the settings range for overlay scale ([0.75, 1.5], 1 when unset). */
function clampScale(value: number | undefined): number {
  return clamp(typeof value === 'number' && Number.isFinite(value) ? value : 1, 0.75, 1.5)
}

/** Mirror the build widget width range ([280, 520], 340 when unset). */
function clampBuildPanelWidth(value: number | undefined): number {
  return Math.round(clamp(typeof value === 'number' && Number.isFinite(value) ? value : 340, 280, 520))
}

/** Keep at least this many pixels of a widget inside the canvas when clamping. */
const MIN_VISIBLE = 40

/**
 * Clamps a saved widget position onto the current overlay canvas. Dragged
 * widgets are stored as absolute top-left pixels, so a position saved on a
 * larger display (or before a resolution change) can land entirely off-screen.
 * Edge/center anchors move with the window, but their offsets are clamped too
 * so a corrupt/huge offset can't push a widget out the far side.
 */
function clampPosition(pos: OverlayWidgetPosition): OverlayWidgetPosition {
  const w = window.innerWidth
  const h = window.innerHeight
  if (w <= 0 || h <= 0) return pos
  // Centered anchors offset from the canvas midpoint (translate(-50%)), so keep
  // the widget's CENTER at least MIN_VISIBLE inside both edges.
  const cx = Math.max(0, w / 2 - MIN_VISIBLE)
  const cy = Math.max(0, h / 2 - MIN_VISIBLE)
  switch (pos.anchor) {
    case 'top-center':
      return { ...pos, x: clamp(pos.x, -cx, cx), y: clamp(pos.y, 0, h - MIN_VISIBLE) }
    case 'center':
      return { ...pos, x: clamp(pos.x, -cx, cx), y: clamp(pos.y, -cy, cy) }
    default:
      // top-left absolute pixels, or edge offsets (top-right / bottom-*).
      return { ...pos, x: clamp(pos.x, 0, w - MIN_VISIBLE), y: clamp(pos.y, 0, h - MIN_VISIBLE) }
  }
}

function clampPositions(p: OverlayWidgetPositions): OverlayWidgetPositions {
  return {
    matchup: clampPosition(p.matchup),
    apm: clampPosition(p.apm),
    postGame: clampPosition(p.postGame),
    buildOrder: clampPosition(p.buildOrder),
    ageTargets: clampPosition(p.ageTargets),
    session: clampPosition(p.session),
    counter: clampPosition(p.counter),
    coach: clampPosition(p.coach),
  }
}
