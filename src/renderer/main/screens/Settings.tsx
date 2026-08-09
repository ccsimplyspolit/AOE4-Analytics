import { useCallback, useEffect, useState } from 'react'
import {
  User,
  Monitor,
  Gauge,
  Keyboard,
  Gamepad2,
  Loader2,
  Check,
  Palette,
  Pipette,
  Move,
  X,
  Languages as LanguagesIcon,
  KeyRound,
  ArrowDown,
  ArrowUp,
  Zap,
  Activity,
  Play,
  ExternalLink,
} from 'lucide-react'
import type { AutomationStatus, AutomationTaskId } from '@domain/automation'
import type { Leaderboard } from '@api/types'
import {
  DEFAULT_HOTKEYS,
  DEFAULT_OVERLAY_WIDGET_POSITIONS,
  type AppSettings,
  type OverlayWidgetAnchor,
} from '@store/settings'
import { matchSteamAccount, type SteamAccount } from '@domain/steamAccounts'
import { ipc } from '@shared/ipc'
import { cn } from '@shared/lib/utils'
import { useDebounce } from '@shared/hooks/useDebounce'
import { ACCENT_PRESETS, currentAccentHex } from '@shared/accent'
import { Card, CardContent } from '@shared/components/ui/card'
import { BUNDLED_BUILD_ORDERS } from '@data/buildOrders'
import { buildOrderCivLabel, type BuildOrder } from '@domain/buildOrderSchema'
import { useSettings, useUpdateSettings, useRemoveAccount } from '../queries/useProfile'
import { PageHead } from '../components/PageHead'
import { SteamConnectCard } from '../components/SteamConnectCard'
import { useI18n } from '../../i18n'

const LEADERBOARDS: { value: Leaderboard; label: string }[] = [
  { value: 'rm_solo', label: 'Ranked 1v1 (Solo)' },
  { value: 'rm_1v1', label: 'Ranked 1v1 (API)' },
  { value: 'rm_team', label: 'Ranked Team' },
  { value: 'rm_2v2', label: 'Ranked 2v2' },
  { value: 'rm_3v3', label: 'Ranked 3v3' },
  { value: 'rm_4v4', label: 'Ranked 4v4' },
  { value: 'qm_1v1', label: 'Quick Match 1v1' },
  { value: 'qm_2v2', label: 'Quick Match 2v2' },
  { value: 'qm_3v3', label: 'Quick Match 3v3' },
  { value: 'qm_4v4', label: 'Quick Match 4v4' },
]
const POLL_OPTIONS = [
  { value: 4_000, label: '4s' },
  { value: 8_000, label: '8s' },
  { value: 10_000, label: '10s' },
  { value: 15_000, label: '15s (recommended)' },
  { value: 30_000, label: '30s' },
  { value: 60_000, label: '60s' },
]

function pollOptionsWithCurrent(current: number | undefined) {
  if (current == null || POLL_OPTIONS.some((option) => option.value === current)) {
    return POLL_OPTIONS
  }
  return [{ value: current, label: `${Math.round(current / 100) / 10}s (custom)` }, ...POLL_OPTIONS]
}

const AUTOMATION_TASK_LABELS: Record<AutomationTaskId, string> = {
  history: 'Match history',
  archive: 'Replay archive',
  cache: 'Offline cache',
  videos: 'VOD and transcripts',
  catalogs: 'Map and build catalogues',
  sources: 'Source synchronizer',
}

function automationTime(value: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleTimeString()
}
const SETTINGS_SECTIONS = [
  ['settings-appearance', 'Appearance'],
  ['settings-account', 'Account'],
  ['settings-integrations', 'Integrations'],
  ['settings-translation', 'Translation'],
  ['settings-replays', 'Replay parser'],
  ['settings-overlay', 'Overlay'],
  ['settings-automation', 'Automation'],
  ['settings-polling', 'Polling'],
  ['settings-stats', 'Stats'],
  ['settings-hotkeys', 'Hotkeys'],
] as const

export function Settings() {
  const { tt, refreshTranslationStatus } = useI18n()
  const { data: settings } = useSettings()
  const update = useUpdateSettings()
  const removeAccount = useRemoveAccount()

  const toggleHotkey = settings?.hotkeys.toggleOverlay ?? DEFAULT_HOTKEYS.toggleOverlay
  const placementHotkey = settings?.hotkeys.placementMode ?? DEFAULT_HOTKEYS.placementMode
  const nextBuildStepHotkey = settings?.hotkeys.nextBuildStep ?? DEFAULT_HOTKEYS.nextBuildStep
  const previousBuildStepHotkey =
    settings?.hotkeys.previousBuildStep ?? DEFAULT_HOTKEYS.previousBuildStep
  const resetBuildStepHotkey = settings?.hotkeys.resetBuildStep ?? DEFAULT_HOTKEYS.resetBuildStep
  const nextCounterHotkey = settings?.hotkeys.nextCounter ?? DEFAULT_HOTKEYS.nextCounter
  const nextBuildOrderHotkey = settings?.hotkeys.nextBuildOrder ?? DEFAULT_HOTKEYS.nextBuildOrder
  const previousBuildOrderHotkey =
    settings?.hotkeys.previousBuildOrder ?? DEFAULT_HOTKEYS.previousBuildOrder
  const toggleBuildOrderHotkey =
    settings?.hotkeys.toggleBuildOrder ?? DEFAULT_HOTKEYS.toggleBuildOrder
  const switchTimerModeHotkey = settings?.hotkeys.switchTimerMode ?? DEFAULT_HOTKEYS.switchTimerMode
  const startTimerHotkey = settings?.hotkeys.startTimer ?? DEFAULT_HOTKEYS.startTimer
  const stopTimerHotkey = settings?.hotkeys.stopTimer ?? DEFAULT_HOTKEYS.stopTimer
  const resetTimerHotkey = settings?.hotkeys.resetTimer ?? DEFAULT_HOTKEYS.resetTimer
  const [arrangingWidgets, setArrangingWidgets] = useState(false)
  const [customCssDraft, setCustomCssDraft] = useState('')
  const [buildSearch, setBuildSearch] = useState('')
  const [buildCivFilter, setBuildCivFilter] = useState('all')
  const [automationStatus, setAutomationStatus] = useState<AutomationStatus | null>(null)

  // Placement mode persists its locked state in settings, so the button stays
  // accurate when this screen is revisited after using the global hotkey.
  useEffect(() => {
    if (settings) setArrangingWidgets(!settings.overlay.locked)
  }, [settings])
  const customCss = settings?.overlay.customCss
  useEffect(() => {
    setCustomCssDraft(customCss ?? '')
  }, [customCss])

  useEffect(() => {
    let active = true
    void ipc.getAutomationStatus().then((value) => {
      if (active) setAutomationStatus(value)
    })
    const unsubscribe = ipc.onAutomationStatus((value) => setAutomationStatus(value))
    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  // The sliders track a local value and commit it debounced — one settings
  // write + overlay IPC after the drag settles instead of one per tick.
  const [liveOpacity, setLiveOpacity] = useState<number | null>(null)
  const debouncedOpacity = useDebounce(liveOpacity, 200)
  const { mutate: commitSettings } = update
  const overlayBuilds = (() => {
    const seen = new Set<string>()
    return [
      ...(settings?.overlay.customBuildOrders ?? []),
      ...(BUNDLED_BUILD_ORDERS as BuildOrder[]),
    ].filter((build) => {
      if (!build?.name || seen.has(build.name)) return false
      seen.add(build.name)
      return true
    })
  })()
  const cycleNames = settings?.overlay.buildOrderCycle ?? []
  const activeBuildNames = cycleNames.filter((name) => overlayBuilds.some((build) => build.name === name))
  const activeBuilds = activeBuildNames
    .map((name) => overlayBuilds.find((build) => build.name === name))
    .filter((build): build is BuildOrder => build != null)
  const buildCivilizations = Array.from(
    new Set(
      overlayBuilds.flatMap((build) =>
        Array.isArray(build.civilization) ? build.civilization : [build.civilization],
      ),
    ),
  ).sort((left, right) => left.localeCompare(right))
  const normalizedBuildSearch = buildSearch.trim().toLocaleLowerCase()
  const availableBuilds = overlayBuilds.filter((build) => {
    if (activeBuildNames.includes(build.name)) return false
    const civilizations = Array.isArray(build.civilization) ? build.civilization : [build.civilization]
    if (buildCivFilter !== 'all' && !civilizations.includes(buildCivFilter)) return false
    if (!normalizedBuildSearch) return true
    return `${build.name} ${buildOrderCivLabel(build)}`.toLocaleLowerCase().includes(normalizedBuildSearch)
  })
  useEffect(() => {
    if (debouncedOpacity == null) return
    commitSettings(
      { overlay: { opacity: debouncedOpacity } },
      { onSuccess: () => void ipc.applyOverlaySettings() },
    )
  }, [debouncedOpacity, commitSettings])
  const opacity = liveOpacity ?? settings?.overlay.opacity ?? 0.92

  const [liveScale, setLiveScale] = useState<number | null>(null)
  const debouncedScale = useDebounce(liveScale, 200)
  useEffect(() => {
    if (debouncedScale == null) return
    commitSettings(
      { overlay: { scale: debouncedScale } },
      { onSuccess: () => void ipc.applyOverlaySettings() },
    )
  }, [debouncedScale, commitSettings])
  const scale = liveScale ?? settings?.overlay.scale ?? 1

  const [liveBuildFontSize, setLiveBuildFontSize] = useState<number | null>(null)
  const debouncedBuildFontSize = useDebounce(liveBuildFontSize, 200)
  useEffect(() => {
    if (debouncedBuildFontSize == null) return
    commitSettings(
      { overlay: { buildOrderFontSize: debouncedBuildFontSize } },
      { onSuccess: () => void ipc.applyOverlaySettings() },
    )
  }, [debouncedBuildFontSize, commitSettings])
  const buildFontSize = liveBuildFontSize ?? settings?.overlay.buildOrderFontSize ?? 14

  const [liveBuildImageSize, setLiveBuildImageSize] = useState<number | null>(null)
  const debouncedBuildImageSize = useDebounce(liveBuildImageSize, 200)
  useEffect(() => {
    if (debouncedBuildImageSize == null) return
    commitSettings(
      { overlay: { buildOrderImageSize: debouncedBuildImageSize } },
      { onSuccess: () => void ipc.applyOverlaySettings() },
    )
  }, [debouncedBuildImageSize, commitSettings])
  const buildImageSize = liveBuildImageSize ?? settings?.overlay.buildOrderImageSize ?? 30

  return (
    <div className="animate-fade-in space-y-6">
      <PageHead
        kicker="Preferences"
        title="Settings"
        sub="Profile, appearance, integrations, overlay, and data."
      />

      <nav className="sticky top-0 z-20 -mx-1 flex flex-wrap items-center gap-1 rounded-md border border-border bg-background/95 p-1 shadow-lg backdrop-blur">
        {SETTINGS_SECTIONS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })}
            className="rounded px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            {tt(label)}
          </button>
        ))}
        <span
          className={cn(
            'ml-auto flex items-center gap-1.5 px-2 text-[11px]',
            update.isError ? 'text-loss' : 'text-muted-foreground',
          )}
        >
          {update.isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Check className="h-3 w-3" />
          )}
          {update.isPending
            ? tt('Saving…')
            : update.isError
              ? tt('Save failed')
              : tt('Changes save automatically')}
        </span>
      </nav>

      <Card id="settings-appearance" className="scroll-mt-14">
        <CardContent className="space-y-3 p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Palette className="h-4 w-4 text-primary" />
            {tt('Appearance')}
          </h2>
          <AccentPicker
            value={settings?.accentColor ?? null}
            onChange={(accentColor) =>
              update.mutate({ accentColor }, { onSuccess: () => void ipc.applyOverlaySettings() })
            }
          />
          <label className="flex cursor-pointer items-center justify-between gap-3 border-t border-border pt-3 text-sm">
            <span>
              {tt('Civilization themes')}
              <span className="block text-[11px] text-muted-foreground">
                {tt(
                  'While a match is live, the app and overlay re-accent to the colours of the civ you’re playing, then revert when the game ends.',
                )}
              </span>
            </span>
            <input
              type="checkbox"
              checked={settings?.civTheme ?? true}
              onChange={(e) =>
                update.mutate(
                  { civTheme: e.target.checked },
                  { onSuccess: () => void ipc.applyOverlaySettings() },
                )
              }
              className="h-4 w-4 shrink-0 accent-[hsl(var(--primary))]"
            />
          </label>
        </CardContent>
      </Card>

      <TranslationApiCard onSaved={refreshTranslationStatus} />
      <ExternalApisCard />
      <ReplaysApiCard
        value={settings?.replaysApiUrl ?? null}
        saving={update.isPending}
        onSave={(replaysApiUrl) => update.mutateAsync({ replaysApiUrl })}
      />

      <div id="settings-account" className="scroll-mt-14 space-y-6">
        <Card>
          <CardContent className="space-y-3 p-5">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <User className="h-4 w-4 text-primary" />
              {tt('Profile')}
            </h2>
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <div className="font-medium">{settings?.playerName ?? '—'}</div>
                <div className="text-xs text-muted-foreground">
                  {tt('AoE4World ID')} {settings?.profileId ?? '—'} · {tt('ladder')}{' '}
                  {settings?.leaderboard}
                </div>
              </div>
              <button
                type="button"
                disabled={settings?.profileId == null}
                onClick={() => {
                  if (settings?.profileId == null) return
                  if (
                    !window.confirm(
                      tt('Remove this account from RTSLytics? This cannot be undone.'),
                    )
                  )
                    return
                  removeAccount.mutate(settings.profileId)
                }}
                className="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50"
              >
                {tt('Remove account')}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              {tt('Switch between or add accounts from the picker in the top command bar.')}
            </p>
          </CardContent>
        </Card>

        <SteamIdentityCard settings={settings} onPin={(steamId) => update.mutate({ steamId })} />

        <SteamConnectCard />
      </div>

      <Card id="settings-overlay" className="scroll-mt-14">
        <CardContent className="space-y-5 p-5">
          <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                <Monitor className="h-3.5 w-3.5" />
                {tt('Overlay')}
              </div>
              <h2 className="text-lg font-semibold tracking-tight">{tt('Overlay control room')}</h2>
              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">
                {tt('Tune the in-game view, choose what appears, then place it exactly where you want.')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void ipc.toggleOverlay()}
              className="inline-flex shrink-0 items-center justify-center rounded-md border border-primary/45 bg-primary/10 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/18"
            >
              {tt('Show / hide overlay')} <span className="ml-2 text-primary/70">{toggleHotkey}</span>
            </button>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(270px,0.72fr)]">
            <section className="rounded-lg border border-border/75 bg-background/25 p-4">
              <div className="mb-4 flex items-baseline justify-between gap-3 border-b border-border/70 pb-3">
                <div>
                  <h3 className="text-sm font-semibold">{tt('Appearance')}</h3>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {tt('A single scale for a quiet, readable overlay.')}
                  </p>
                </div>
                <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  {tt('Live preview')}
                </span>
              </div>
              <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="flex items-center justify-between text-sm">
                    <span>{tt('Opacity')}</span>
                    <span className="tabular-nums text-muted-foreground">{Math.round(opacity * 100)}%</span>
                  </span>
                  <input
                    type="range"
                    min={0.35}
                    max={1}
                    step={0.01}
                    value={opacity}
                    onChange={(e) => setLiveOpacity(Number(e.target.value))}
                    className="w-full accent-[hsl(var(--primary))]"
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="flex items-center justify-between text-sm">
                    <span>{tt('Widget size')}</span>
                    <span className="tabular-nums text-muted-foreground">{Math.round(scale * 100)}%</span>
                  </span>
                  <input
                    type="range"
                    min={0.75}
                    max={1.5}
                    step={0.05}
                    value={scale}
                    onChange={(e) => setLiveScale(Number(e.target.value))}
                    className="w-full accent-[hsl(var(--primary))]"
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="flex items-center justify-between text-sm">
                    <span>{tt('Build text size')}</span>
                    <span className="tabular-nums text-muted-foreground">{buildFontSize}px</span>
                  </span>
                  <input
                    type="range"
                    min={11}
                    max={18}
                    step={1}
                    value={buildFontSize}
                    onChange={(e) => setLiveBuildFontSize(Number(e.target.value))}
                    className="w-full accent-[hsl(var(--primary))]"
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="flex items-center justify-between text-sm">
                    <span>{tt('Build icon size')}</span>
                    <span className="tabular-nums text-muted-foreground">{buildImageSize}px</span>
                  </span>
                  <input
                    type="range"
                    min={20}
                    max={48}
                    step={1}
                    value={buildImageSize}
                    onChange={(e) => setLiveBuildImageSize(Number(e.target.value))}
                    className="w-full accent-[hsl(var(--primary))]"
                  />
                </label>
              </div>
            </section>

            <section className="overflow-hidden rounded-lg border border-border/75 bg-background/25">
              <div className="flex items-start justify-between gap-3 border-b border-border/70 px-4 py-3">
                <div>
                  <h3 className="text-sm font-semibold">{tt('Game-state widgets')}</h3>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {tt('Only show information that matters in the moment.')}
                  </p>
                </div>
                <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-primary shadow-[0_0_10px_hsl(var(--primary)/0.7)]" />
              </div>
              <div className="divide-y divide-border/70 px-4">
            <OverlayToggle
              label={tt('Matchup bar')}
              description={tt('Teams, civilizations, rank, and matchup troops.')}
              checked={settings?.overlay.showMatchup ?? true}
              onChange={(checked) =>
                update.mutate(
                  { overlay: { showMatchup: checked } },
                  { onSuccess: () => void ipc.applyOverlaySettings() },
                )
              }
            />
            <OverlayToggle
              label={tt('Post-game card')}
              description={tt('Show the result and coaching card after the match.')}
              checked={settings?.overlay.showPostGame ?? true}
              onChange={(checked) =>
                update.mutate(
                  { overlay: { showPostGame: checked } },
                  { onSuccess: () => void ipc.applyOverlaySettings() },
                )
              }
            />
            <OverlayToggle
              label={tt('Status pill')}
              description={tt('Show waiting, matchup, and analysis status.')}
              checked={settings?.overlay.showStatus ?? true}
              onChange={(checked) =>
                update.mutate(
                  { overlay: { showStatus: checked } },
                  { onSuccess: () => void ipc.applyOverlaySettings() },
                )
              }
            />
              </div>
            </section>
          </div>

          <p className="rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
            {tt('The overlay shows the matchup across the top, a live APM counter, and a results card after each game. Arrange widgets with the button below or')} {placementHotkey}; {tt('it opens a draggable preview even before a match.')}
          </p>

          <label className="block space-y-1.5">
            <span className="flex items-center justify-between text-sm">
              <span>{tt('Custom overlay CSS')}</span>
              <span className="text-[11px] text-muted-foreground">
                {customCssDraft.length}/20,000
              </span>
            </span>
            <textarea
              value={customCssDraft}
              onChange={(event) => setCustomCssDraft(event.target.value.slice(0, 20_000))}
              onBlur={() => {
                if (!settings || customCssDraft === settings.overlay.customCss) return
                update.mutate(
                  { overlay: { customCss: customCssDraft } },
                  { onSuccess: () => void ipc.applyOverlaySettings() },
                )
              }}
              rows={4}
              spellCheck={false}
              placeholder=".overlay-widget-buildOrder { opacity: .9; }"
              className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-xs leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <span className="block text-[11px] text-muted-foreground">
              {tt(
                'CSS only. Use .overlay-widget or .overlay-widget-buildOrder; scripts are ignored.',
              )}
            </span>
          </label>

          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/75 bg-background/25 p-3">
            <span className="mr-1 text-xs font-medium text-muted-foreground">{tt('Layout')}</span>
            <button
              type="button"
              disabled={!settings}
              onClick={() => {
                void ipc.toggleOverlayPlacement().then(setArrangingWidgets)
              }}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors disabled:opacity-50',
                arrangingWidgets
                  ? 'border-primary bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'border-border text-muted-foreground hover:bg-secondary hover:text-foreground',
              )}
            >
              <Move className="h-3.5 w-3.5" />
              {arrangingWidgets ? tt('Done arranging widgets') : tt('Arrange overlay widgets')}
              <span
                className={
                  arrangingWidgets ? 'text-primary-foreground/70' : 'text-muted-foreground'
                }
              >
                ({placementHotkey})
              </span>
            </button>
            <button
              type="button"
              disabled={!settings}
              onClick={() => {
                if (!settings) return
                update.mutate(
                  {
                    overlay: {
                      ...settings.overlay,
                      widgetPositions: DEFAULT_OVERLAY_WIDGET_POSITIONS,
                    },
                  },
                  { onSuccess: () => void ipc.applyOverlaySettings() },
                )
              }}
              className="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50"
            >
              {tt('Reset widget positions')}
            </button>
          </div>

          <div className="space-y-2 border-t border-border pt-3">
            <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
              <span>
                Only show overlay while AoE4 is focused
                <span className="block text-[11px] text-muted-foreground">
                  Turn OFF if the overlay shows on your desktop but not over the game — it&apos;ll
                  then show whenever a match is live, regardless of window focus.
                </span>
              </span>
              <input
                type="checkbox"
                checked={settings?.overlay.gateToGame ?? true}
                onChange={(e) => {
                  if (!settings) return
                  update.mutate(
                    { overlay: { ...settings.overlay, gateToGame: e.target.checked } },
                    { onSuccess: () => void ipc.applyOverlaySettings() },
                  )
                }}
                className="h-4 w-4 shrink-0 accent-[hsl(var(--primary))]"
              />
            </label>
            <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
              <span>
                Live APM counter
                <span className="block text-[11px] text-muted-foreground">
                  Counts your key/mouse actions while in a match (counts only, never which keys).
                </span>
              </span>
              <input
                type="checkbox"
                checked={settings?.overlay.apm ?? true}
                onChange={(e) => {
                  if (!settings) return
                  update.mutate(
                    { overlay: { ...settings.overlay, apm: e.target.checked } },
                    { onSuccess: () => void ipc.applyOverlaySettings() },
                  )
                }}
                className="h-4 w-4 shrink-0 accent-[hsl(var(--primary))]"
              />
            </label>
            <label className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{tt('APM corner')}</span>
              <select
                value={settings?.overlay.apmCorner ?? 'bottom-left'}
                onChange={(e) => {
                  if (!settings) return
                  update.mutate(
                    {
                      overlay: {
                        ...settings.overlay,
                        apmCorner: e.target.value as typeof settings.overlay.apmCorner,
                        widgetPositions: {
                          ...settings.overlay.widgetPositions,
                          apm: {
                            anchor: e.target.value as OverlayWidgetAnchor,
                            x: 12,
                            y: 12,
                          },
                        },
                      },
                    },
                    { onSuccess: () => void ipc.applyOverlaySettings() },
                  )
                }}
                className="h-8 rounded-md border border-border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="top-left">{tt('Top-left')}</option>
                <option value="top-right">{tt('Top-right')}</option>
                <option value="bottom-left">{tt('Bottom-left')}</option>
                <option value="bottom-right">{tt('Bottom-right')}</option>
              </select>
            </label>
            <label className="flex items-center justify-between gap-3 text-sm">
              <span>
                Matchup troops panel
                <span className="block text-[11px] text-muted-foreground">
                  Under the matchup bar: your build order (counters flagged) vs their key units.
                </span>
              </span>
              <select
                value={settings?.overlay.troopsPos ?? 'bar'}
                onChange={(e) => {
                  if (!settings) return
                  update.mutate(
                    {
                      overlay: {
                        ...settings.overlay,
                        troopsPos: e.target.value as typeof settings.overlay.troopsPos,
                      },
                    },
                    { onSuccess: () => void ipc.applyOverlaySettings() },
                  )
                }}
                className="h-8 shrink-0 rounded-md border border-border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="bar">{tt('Under the matchup bar')}</option>
                <option value="hidden">{tt('Hidden')}</option>
              </select>
            </label>
            <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
              <span>
                Age-up pace targets
                <span className="block text-[11px] text-muted-foreground">
                  A small chip with target Feudal/Castle/Imperial times for your rank next to the
                  live match clock. Pace targets, never a live reading.
                </span>
              </span>
              <input
                type="checkbox"
                checked={settings?.overlay.showAgeTargets ?? true}
                onChange={(e) => {
                  if (!settings) return
                  update.mutate(
                    { overlay: { ...settings.overlay, showAgeTargets: e.target.checked } },
                    { onSuccess: () => void ipc.applyOverlaySettings() },
                  )
                }}
                className="h-4 w-4 shrink-0 accent-[hsl(var(--primary))]"
              />
            </label>
            <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
              <span>
                Session tracker
                <span className="block text-[11px] text-muted-foreground">
                  Today&apos;s record at a glance — &quot;3W – 1L +42&quot; — so a losing streak is
                  visible without leaving the game.
                </span>
              </span>
              <input
                type="checkbox"
                checked={settings?.overlay.showSession ?? true}
                onChange={(e) => {
                  if (!settings) return
                  update.mutate(
                    { overlay: { ...settings.overlay, showSession: e.target.checked } },
                    { onSuccess: () => void ipc.applyOverlaySettings() },
                  )
                }}
                className="h-4 w-4 shrink-0 accent-[hsl(var(--primary))]"
              />
            </label>
            <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
              <span>
                Matchup counter plan
                <span className="block text-[11px] text-muted-foreground">
                  Shows the best counter roles for the opponent&apos;s detected civilization in a
                  movable overlay card.
                </span>
              </span>
              <input
                type="checkbox"
                checked={settings?.overlay.showCounter ?? true}
                onChange={(e) => {
                  if (!settings) return
                  update.mutate(
                    { overlay: { ...settings.overlay, showCounter: e.target.checked } },
                    { onSuccess: () => void ipc.applyOverlaySettings() },
                  )
                }}
                className="h-4 w-4 shrink-0 accent-[hsl(var(--primary))]"
              />
            </label>
            <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
              <span>
                Live build coach
                <span className="block text-[11px] text-muted-foreground">
                  Timed age-up, villager and scouting checkpoints from the pinned civilization
                  build.
                </span>
              </span>
              <input
                type="checkbox"
                checked={settings?.overlay.showCoach ?? true}
                onChange={(e) => {
                  if (!settings) return
                  update.mutate(
                    { overlay: { ...settings.overlay, showCoach: e.target.checked } },
                    { onSuccess: () => void ipc.applyOverlaySettings() },
                  )
                }}
                className="h-4 w-4 shrink-0 accent-[hsl(var(--primary))]"
              />
            </label>
            <div className="space-y-3 border-t border-border pt-3">
              <div>
                <div className="text-sm font-medium">{tt('Build order overlay')}</div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {tt(
                    'Choose a build here, or let the overlay pick the first matching build from your active pool.',
                  )}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1.5 text-sm">
                  <span className="text-muted-foreground">{tt('Build selection')}</span>
                  <select
                    value={settings?.overlay.buildOrderMode ?? 'manual'}
                    onChange={(event) => {
                      if (!settings) return
                      const mode = event.target.value as typeof settings.overlay.buildOrderMode
                      update.mutate(
                        { overlay: { buildOrderMode: mode } },
                        { onSuccess: () => void ipc.applyOverlaySettings() },
                      )
                    }}
                    className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs"
                  >
                    <option value="manual">{tt('Use selected build')}</option>
                    <option value="auto">{tt('Auto-select by civilization')}</option>
                    <option value="hidden">{tt('Hide build order')}</option>
                  </select>
                </label>
                <label className="space-y-1.5 text-sm">
                  <span className="text-muted-foreground">{tt('Selected build')}</span>
                  <select
                    value={settings?.overlay.buildOrderId ?? ''}
                    disabled={!settings || settings.overlay.buildOrderMode !== 'manual'}
                    onChange={(event) => {
                      if (!settings) return
                      const buildOrderId = event.target.value || null
                      update.mutate(
                        {
                          overlay: {
                            buildOrderId,
                            buildOrderMode: buildOrderId ? 'manual' : 'hidden',
                          },
                        },
                        { onSuccess: () => void ipc.applyOverlaySettings() },
                      )
                    }}
                    className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs disabled:opacity-50"
                  >
                    <option value="">{tt('No build selected')}</option>
                    {(settings?.overlay.buildOrderId &&
                    !activeBuilds.some((build) => build.name === settings.overlay.buildOrderId)
                      ? [
                          overlayBuilds.find((build) => build.name === settings.overlay.buildOrderId),
                          ...activeBuilds,
                        ].filter((build): build is BuildOrder => build != null)
                      : activeBuilds
                    ).map((build) => (
                      <option key={build.name} value={build.name}>
                        {build.name} · {buildOrderCivLabel(build)}
                        {settings?.overlay.customBuildOrders.some(
                          (item) => item.name === build.name,
                        )
                          ? ` · ${tt('custom')}`
                          : ''}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="flex items-center justify-between gap-3 text-sm">
                <span>
                  {tt('Build order display')}
                  <span className="block text-[11px] text-muted-foreground">
                    {tt(
                      'Choose illustrated resource/unit cards or the compact plain-text RTS overlay view.',
                    )}
                  </span>
                </span>
                <select
                  value={settings?.overlay.buildOrderViewMode ?? 'illustrated'}
                  onChange={(event) => {
                    if (!settings) return
                    const mode = event.target.value === 'text' ? 'text' : 'illustrated'
                    update.mutate(
                      { overlay: { buildOrderViewMode: mode } },
                      { onSuccess: () => void ipc.applyOverlaySettings() },
                    )
                  }}
                  className="h-9 rounded-md border border-border bg-background px-2 text-xs"
                >
                  <option value="illustrated">{tt('Illustrated')}</option>
                  <option value="text">{tt('Plain text')}</option>
                </select>
              </label>
              <label className="space-y-1.5 text-sm">
                <span className="flex items-center justify-between">
                  <span>{tt('Build panel width')}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {settings?.overlay.buildOrderPanelWidth ?? 340}px
                  </span>
                </span>
                <input
                  type="range"
                  min={280}
                  max={520}
                  step={10}
                  value={settings?.overlay.buildOrderPanelWidth ?? 340}
                  onChange={(event) =>
                    update.mutate(
                      { overlay: { buildOrderPanelWidth: Number(event.target.value) } },
                      { onSuccess: () => void ipc.applyOverlaySettings() },
                    )
                  }
                  className="w-full accent-[hsl(var(--primary))]"
                />
              </label>
              <div className="grid gap-2 sm:grid-cols-2">
                <OverlayToggle
                  label={tt('Next-step preview')}
                  description={tt('Show the next build step below the current step.')}
                  checked={settings?.overlay.buildOrderShowNext ?? true}
                  onChange={(checked) =>
                    update.mutate(
                      { overlay: { buildOrderShowNext: checked } },
                      { onSuccess: () => void ipc.applyOverlaySettings() },
                    )
                  }
                />
                <OverlayToggle
                  label={tt('Resources and villagers')}
                  description={tt('Show the resource split and villager target.')}
                  checked={settings?.overlay.buildOrderShowResources ?? true}
                  onChange={(checked) =>
                    update.mutate(
                      { overlay: { buildOrderShowResources: checked } },
                      { onSuccess: () => void ipc.applyOverlaySettings() },
                    )
                  }
                />
                <OverlayToggle
                  label={tt('Step instructions')}
                  description={tt('Show notes and icon instructions for the active step.')}
                  checked={settings?.overlay.buildOrderShowNotes ?? true}
                  onChange={(checked) =>
                    update.mutate(
                      { overlay: { buildOrderShowNotes: checked } },
                      { onSuccess: () => void ipc.applyOverlaySettings() },
                    )
                  }
                />
                <OverlayToggle
                  label={tt('Response plan')}
                  description={tt('Show scout-first counter and adaptation suggestions.')}
                  checked={settings?.overlay.buildOrderShowResponsePlan ?? true}
                  onChange={(checked) =>
                    update.mutate(
                      { overlay: { buildOrderShowResponsePlan: checked } },
                      { onSuccess: () => void ipc.applyOverlaySettings() },
                    )
                  }
                />
                <OverlayToggle
                  label={tt('Build title and timer')}
                  description={tt('Show the build name, elapsed timer, age, and step counter.')}
                  checked={settings?.overlay.buildOrderShowTitle ?? true}
                  onChange={(checked) =>
                    update.mutate(
                      { overlay: { buildOrderShowTitle: checked } },
                      { onSuccess: () => void ipc.applyOverlaySettings() },
                    )
                  }
                />
              </div>
            </div>
            <div className="space-y-2 border-t border-border pt-3">
              <div>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium">{tt('My active builds')}</div>
                  <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                    {activeBuilds.length} / {overlayBuilds.length}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {tt('Only builds in this pool can appear in the overlay cycle. Imported builds stay available in the catalogue until you add them here.')}
                </p>
              </div>
              <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(300px,0.9fr)]">
                <div className="rounded-md border border-primary/25 bg-primary/[0.03] p-2">
                  <div className="mb-2 flex items-center justify-between px-1 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    <span>{tt('Active pool')}</span>
                    <span className="flex items-center gap-2">
                      <span>{tt('Used by overlay')}</span>
                      {activeBuilds.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            if (!settings) return
                            update.mutate(
                              {
                                overlay: {
                                  buildOrderCycle: [],
                                  buildOrderDisabled: settings.overlay.buildOrderDisabled.filter(
                                    (name) => !activeBuildNames.includes(name),
                                  ),
                                },
                              },
                              { onSuccess: () => void ipc.applyOverlaySettings() },
                            )
                          }}
                          className="rounded border border-border px-1.5 py-0.5 text-[10px] font-medium normal-case tracking-normal text-muted-foreground hover:border-destructive/50 hover:text-destructive"
                        >
                          {tt('Clear active pool')}
                        </button>
                      )}
                    </span>
                  </div>
                  <div className="max-h-64 space-y-1 overflow-y-auto">
                    {activeBuilds.length === 0 ? (
                      <div className="rounded border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
                        {tt('No builds selected yet. Add a build from the catalogue.')}
                      </div>
                    ) : (
                      activeBuilds.map((build, index) => {
                        const disabled = settings?.overlay.buildOrderDisabled.includes(build.name) ?? false
                        const custom = settings?.overlay.customBuildOrders.some((item) => item.name === build.name)
                        const move = (direction: -1 | 1) => {
                          if (!settings) return
                          const next = [...activeBuildNames]
                          const target = index + direction
                          if (target < 0 || target >= next.length) return
                          ;[next[index], next[target]] = [next[target]!, next[index]!]
                          update.mutate(
                            { overlay: { buildOrderCycle: next } },
                            { onSuccess: () => void ipc.applyOverlaySettings() },
                          )
                        }
                        return (
                          <div key={build.name} className="flex items-center gap-2 rounded border border-border/60 bg-background/45 px-2 py-1.5 text-xs">
                            <button
                              type="button"
                              onClick={() => {
                                if (!settings) return
                                update.mutate(
                                  {
                                    overlay: {
                                      buildOrderCycle: activeBuildNames.filter((name) => name !== build.name),
                                      buildOrderDisabled: settings.overlay.buildOrderDisabled.filter((name) => name !== build.name),
                                    },
                                  },
                                  { onSuccess: () => void ipc.applyOverlaySettings() },
                                )
                              }}
                              className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                              title={tt('Remove from active pool')}
                            >
                              <X className="h-3 w-3" />
                            </button>
                            <span className={cn('min-w-0 flex-1 truncate', disabled && 'text-muted-foreground line-through')}>
                              <span className="block truncate">{build.name}</span>
                              <span className="block truncate text-[10px] text-muted-foreground">{buildOrderCivLabel(build)} · {custom ? tt('custom') : tt('bundled')}</span>
                            </span>
                            <input
                              type="checkbox"
                              checked={!disabled}
                              onChange={(event) => {
                                if (!settings) return
                                const nextDisabled = new Set(settings.overlay.buildOrderDisabled)
                                if (event.target.checked) nextDisabled.delete(build.name)
                                else nextDisabled.add(build.name)
                                update.mutate(
                                  { overlay: { buildOrderDisabled: [...nextDisabled] } },
                                  { onSuccess: () => void ipc.applyOverlaySettings() },
                                )
                              }}
                              className="h-4 w-4 shrink-0 accent-[hsl(var(--primary))]"
                              aria-label={`${tt('Cycle')} ${build.name}`}
                            />
                            <button type="button" disabled={index === 0} onClick={() => move(-1)} className="rounded border border-border p-1 text-muted-foreground hover:bg-secondary disabled:opacity-30" title={tt('Move up')}>
                              <ArrowUp className="h-3 w-3" />
                            </button>
                            <button type="button" disabled={index === activeBuilds.length - 1} onClick={() => move(1)} className="rounded border border-border p-1 text-muted-foreground hover:bg-secondary disabled:opacity-30" title={tt('Move down')}>
                              <ArrowDown className="h-3 w-3" />
                            </button>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
                <div className="rounded-md border border-border/70 bg-background/30 p-2">
                  <div className="mb-2 flex items-center justify-between px-1 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    <span>{tt('Build catalogue')}</span>
                    <span>{availableBuilds.length}</span>
                  </div>
                  <div className="mb-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_150px]">
                    <input
                      value={buildSearch}
                      onChange={(event) => setBuildSearch(event.target.value)}
                      placeholder={tt('Search build library…')}
                      className="h-8 rounded border border-border bg-background px-2 text-xs outline-none focus:border-primary"
                    />
                    <select value={buildCivFilter} onChange={(event) => setBuildCivFilter(event.target.value)} className="h-8 rounded border border-border bg-background px-2 text-xs">
                      <option value="all">{tt('All civilizations')}</option>
                      {buildCivilizations.map((civilization) => <option key={civilization} value={civilization}>{civilization}</option>)}
                    </select>
                  </div>
                  <div className="max-h-64 space-y-1 overflow-y-auto">
                    {availableBuilds.length === 0 ? (
                      <div className="px-2 py-6 text-center text-xs text-muted-foreground">{tt('No builds match this filter.')}</div>
                    ) : (
                      availableBuilds.map((build) => (
                        <button
                          key={build.name}
                          type="button"
                          onClick={() => {
                            if (!settings) return
                            update.mutate(
                              { overlay: { buildOrderCycle: [...activeBuildNames, build.name] } },
                              { onSuccess: () => void ipc.applyOverlaySettings() },
                            )
                          }}
                          className="flex w-full items-center gap-2 rounded border border-transparent px-2 py-1.5 text-left text-xs transition-colors hover:border-primary/30 hover:bg-primary/5"
                        >
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-border text-sm text-primary">+</span>
                          <span className="min-w-0 flex-1 truncate"><span className="block truncate">{build.name}</span><span className="block truncate text-[10px] text-muted-foreground">{buildOrderCivLabel(build)}</span></span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
            <HotkeyInput
              label={tt('Show / hide overlay hotkey')}
              value={toggleHotkey}
              defaultValue={DEFAULT_HOTKEYS.toggleOverlay}
              onCommit={(accelerator) => update.mutate({ hotkeys: { toggleOverlay: accelerator } })}
            />
            <HotkeyInput
              label={tt('Move overlay widgets hotkey')}
              value={placementHotkey}
              defaultValue={DEFAULT_HOTKEYS.placementMode}
              onCommit={(accelerator) => update.mutate({ hotkeys: { placementMode: accelerator } })}
            />
            <HotkeyInput
              label={tt('Next build step hotkey')}
              value={nextBuildStepHotkey}
              defaultValue={DEFAULT_HOTKEYS.nextBuildStep}
              onCommit={(accelerator) => update.mutate({ hotkeys: { nextBuildStep: accelerator } })}
            />
            <HotkeyInput
              label={tt('Previous build step hotkey')}
              value={previousBuildStepHotkey}
              defaultValue={DEFAULT_HOTKEYS.previousBuildStep}
              onCommit={(accelerator) =>
                update.mutate({ hotkeys: { previousBuildStep: accelerator } })
              }
            />
            <HotkeyInput
              label={tt('Reset build step hotkey')}
              value={resetBuildStepHotkey}
              defaultValue={DEFAULT_HOTKEYS.resetBuildStep}
              onCommit={(accelerator) =>
                update.mutate({ hotkeys: { resetBuildStep: accelerator } })
              }
            />
            <HotkeyInput
              label={tt('Cycle counter target hotkey')}
              value={nextCounterHotkey}
              defaultValue={DEFAULT_HOTKEYS.nextCounter}
              onCommit={(accelerator) => update.mutate({ hotkeys: { nextCounter: accelerator } })}
            />
            <HotkeyInput
              label={tt('Next build order hotkey')}
              value={nextBuildOrderHotkey}
              defaultValue={DEFAULT_HOTKEYS.nextBuildOrder}
              onCommit={(accelerator) =>
                update.mutate({ hotkeys: { nextBuildOrder: accelerator } })
              }
            />
            <HotkeyInput
              label={tt('Previous build order hotkey')}
              value={previousBuildOrderHotkey}
              defaultValue={DEFAULT_HOTKEYS.previousBuildOrder}
              onCommit={(accelerator) =>
                update.mutate({ hotkeys: { previousBuildOrder: accelerator } })
              }
            />
            <HotkeyInput
              label={tt('Show / hide build order hotkey')}
              value={toggleBuildOrderHotkey}
              defaultValue={DEFAULT_HOTKEYS.toggleBuildOrder}
              onCommit={(accelerator) =>
                update.mutate({ hotkeys: { toggleBuildOrder: accelerator } })
              }
            />
            <HotkeyInput
              label={tt('Switch timer mode hotkey')}
              value={switchTimerModeHotkey}
              defaultValue={DEFAULT_HOTKEYS.switchTimerMode}
              onCommit={(accelerator) =>
                update.mutate({ hotkeys: { switchTimerMode: accelerator } })
              }
            />
            <HotkeyInput
              label={tt('Start timer hotkey')}
              value={startTimerHotkey}
              defaultValue={DEFAULT_HOTKEYS.startTimer}
              onCommit={(accelerator) => update.mutate({ hotkeys: { startTimer: accelerator } })}
            />
            <HotkeyInput
              label={tt('Stop timer hotkey')}
              value={stopTimerHotkey}
              defaultValue={DEFAULT_HOTKEYS.stopTimer}
              onCommit={(accelerator) => update.mutate({ hotkeys: { stopTimer: accelerator } })}
            />
            <HotkeyInput
              label={tt('Reset timer hotkey')}
              value={resetTimerHotkey}
              defaultValue={DEFAULT_HOTKEYS.resetTimer}
              onCommit={(accelerator) => update.mutate({ hotkeys: { resetTimer: accelerator } })}
            />
          </div>
        </CardContent>
      </Card>

      <Card id="settings-automation" className="scroll-mt-14">
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <Zap className="h-4 w-4 text-primary" />
              {tt('Background automation')}
            </h2>
            <button
              type="button"
              disabled={automationStatus?.running || settings?.profileId == null}
              onClick={() => void ipc.runAutomationNow().then(setAutomationStatus)}
              className="inline-flex items-center gap-1.5 rounded-md border border-primary/50 px-3 py-1.5 text-sm text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {automationStatus?.running ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
              {tt('Run now')}
            </button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-xs">
            <span className="text-muted-foreground">
              {automationStatus?.running
                ? tt('Automation is running…')
                : automationStatus?.lastError
                  ? `${tt('Last run had warnings')}: ${automationStatus.lastError}`
                  : automationStatus?.finishedAt
                    ? `${tt('Last run')}: ${new Date(automationStatus.finishedAt).toLocaleString()}`
                    : tt('Automation is waiting for its first run.')}
            </span>
          </div>
          <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
            <span>
              {tt('Keep data fresh automatically')}
              <span className="block text-[11px] text-muted-foreground">
                {tt(
                  'Sync history, save recent summaries/replays and warm public catalogues when the game is closed.',
                )}
              </span>
            </span>
            <input
              type="checkbox"
              checked={settings?.automation.enabled ?? true}
              onChange={(e) => update.mutate({ automation: { enabled: e.target.checked } })}
            />
          </label>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={settings?.automation.syncHistory ?? true}
                onChange={(e) => update.mutate({ automation: { syncHistory: e.target.checked } })}
              />
              {tt('Sync account history')}
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={settings?.automation.refreshReplayArchive ?? true}
                onChange={(e) =>
                  update.mutate({ automation: { refreshReplayArchive: e.target.checked } })
                }
              />
              {tt('Refresh complete replay archive')}
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={settings?.automation.cacheSummaries ?? true}
                onChange={(e) =>
                  update.mutate({ automation: { cacheSummaries: e.target.checked } })
                }
              />
              {tt('Cache uploaded summaries')}
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={settings?.automation.cacheReplays ?? true}
                onChange={(e) => update.mutate({ automation: { cacheReplays: e.target.checked } })}
              />
              {tt('Cache recent replays')}
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={settings?.automation.analyzeReplays ?? true}
                onChange={(e) =>
                  update.mutate({ automation: { analyzeReplays: e.target.checked } })
                }
              />
              {tt('Analyze replay command streams')}
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={settings?.automation.warmCatalogs ?? true}
                onChange={(e) => update.mutate({ automation: { warmCatalogs: e.target.checked } })}
              />
              {tt('Warm public catalogues')}
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={settings?.automation.discoverGameplay ?? true}
                onChange={(e) =>
                  update.mutate({ automation: { discoverGameplay: e.target.checked } })
                }
              />
              {tt('Find public gameplay automatically')}
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={settings?.automation.syncSources ?? false}
                onChange={(e) => update.mutate({ automation: { syncSources: e.target.checked } })}
              />
              {tt('Run source sync automatically')}
            </label>
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">{tt('Refresh interval')}</span>
              <select
                value={settings?.automation.intervalMinutes ?? 30}
                onChange={(e) =>
                  update.mutate({ automation: { intervalMinutes: Number(e.target.value) } })
                }
                className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {[15, 30, 60, 180, 360].map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {minutes < 60 ? `${minutes} min` : `${minutes / 60} h`}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">{tt('Summaries per pass')}</span>
              <select
                value={settings?.automation.maxSummariesPerRun ?? 50}
                onChange={(e) =>
                  update.mutate({ automation: { maxSummariesPerRun: Number(e.target.value) } })
                }
                className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {[10, 25, 50].map((count) => (
                  <option key={count} value={count}>
                    {count}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">{tt('Replays per pass')}</span>
              <select
                value={settings?.automation.maxReplaysPerRun ?? 3}
                onChange={(e) =>
                  update.mutate({ automation: { maxReplaysPerRun: Number(e.target.value) } })
                }
                className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {[1, 3, 5, 10].map((count) => (
                  <option key={count} value={count}>
                    {count}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">{tt('Gameplay analyses per pass')}</span>
              <select
                value={settings?.automation.maxGameplayPerRun ?? 2}
                onChange={(e) =>
                  update.mutate({ automation: { maxGameplayPerRun: Number(e.target.value) } })
                }
                className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {[1, 2, 5, 10].map((count) => (
                  <option key={count} value={count}>
                    {count}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            {tt(
              'Background work is serialized, cache-first and paused while AoE4 is running. Source files are only rewritten when automatic source sync is explicitly enabled.',
            )}
          </p>
          <div className="space-y-2 border-t border-border pt-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5" />
                {automationStatus?.running ? tt('Running') : tt('Idle')}
              </span>
              <span>{tt('Last run')}: {automationTime(automationStatus?.finishedAt ?? null)}</span>
              <span>{tt('Next run')}: {automationTime(automationStatus?.nextRunAt ?? null)}</span>
            </div>
            <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
              {(automationStatus?.tasks ?? []).map((task) => (
                <div key={task.id} className="rounded-md border border-border/70 bg-background/20 px-2.5 py-2 text-xs">
                  <div className="flex items-center gap-1.5 font-medium">
                    <span className={cn(
                      'h-1.5 w-1.5 rounded-full',
                      task.state === 'running' && 'animate-pulse bg-primary',
                      task.state === 'success' && 'bg-emerald-400',
                      task.state === 'error' && 'bg-destructive',
                      task.state === 'skipped' && 'bg-muted-foreground',
                      task.state === 'idle' && 'bg-border',
                    )} />
                    <span>{tt(AUTOMATION_TASK_LABELS[task.id])}</span>
                    {task.processed > 0 ? <span className="ml-auto tabular-nums text-muted-foreground">{task.processed}</span> : null}
                  </div>
                  {task.message ? <div className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-muted-foreground">{task.message}</div> : null}
                </div>
              ))}
            </div>
            {automationStatus?.lastError ? <p className="text-xs text-destructive">{automationStatus.lastError}</p> : null}
          </div>
        </CardContent>
      </Card>

      <div id="settings-polling" className="grid scroll-mt-14 gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="space-y-3 p-5">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <Gauge className="h-4 w-4 text-primary" />
              Match polling
            </h2>
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">{tt('When no game is open')}</span>
              <select
                value={settings?.polling.idleIntervalMs ?? 15_000}
                onChange={(e) => {
                  if (!settings) return
                  const v = Number(e.target.value)
                  update.mutate({ polling: { idleIntervalMs: v } })
                }}
                className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {pollOptionsWithCurrent(settings?.polling.idleIntervalMs).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">{tt('While a game is open')}</span>
              <select
                value={settings?.polling.activeIntervalMs ?? 8_000}
                onChange={(e) => {
                  if (!settings) return
                  update.mutate({ polling: { activeIntervalMs: Number(e.target.value) } })
                }}
                className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {pollOptionsWithCurrent(settings?.polling.activeIntervalMs).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <p className="text-xs text-muted-foreground">
              {tt(
                'The app polls more often while AoE4 is open so the overlay reacts quickly. API responses are cached and transient limits use retries/backoff.',
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-5">
            <h2 className="text-base font-semibold">{tt('Default ladder')}</h2>
            <select
              value={settings?.leaderboard ?? 'rm_solo'}
              onChange={(e) => update.mutate({ leaderboard: e.target.value as Leaderboard })}
              className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {LEADERBOARDS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              {tt(
                'Used as the initial ladder in Civ Meta and Leaderboards; a URL ladder still wins.',
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card id="settings-stats" className="scroll-mt-14">
        <CardContent className="space-y-3 p-5">
          <h2 className="text-base font-semibold">{tt('Stats')}</h2>
          <label className="block space-y-1.5 text-sm">
            <span className="flex items-center justify-between gap-3">
              <span>
                {tt('Recent games in dashboard')}
                <span className="block text-[11px] text-muted-foreground">
                  {tt('How many recent games are fetched for the dashboard and recent-form card.')}
                </span>
              </span>
              <select
                value={settings?.recentGamesCount ?? 10}
                onChange={(event) =>
                  update.mutate({ recentGamesCount: Number(event.target.value) })
                }
                className="h-8 shrink-0 rounded-md border border-border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {settings?.recentGamesCount != null &&
                  ![10, 25, 50, 100].includes(settings.recentGamesCount) && (
                    <option key={settings.recentGamesCount} value={settings.recentGamesCount}>
                      {settings.recentGamesCount} ({tt('custom')})
                    </option>
                  )}
                {[10, 25, 50, 100].map((count) => (
                  <option key={count} value={count}>
                    {count}
                  </option>
                ))}
              </select>
            </span>
          </label>
          <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
            <span>
              Exclude AI / custom games from win rate
              <span className="block text-[11px] text-muted-foreground">
                Keep practice games vs AI out of your win-rate, stats, and history view so they
                don&apos;t muddy your real (ranked) record. You still get a post-game card after
                each one.
              </span>
            </span>
            <input
              type="checkbox"
              checked={settings?.localData.excludeAiFromStats ?? false}
              onChange={(e) => {
                if (!settings) return
                update.mutate({
                  localData: { ...settings.localData, excludeAiFromStats: e.target.checked },
                })
              }}
              className="h-4 w-4 shrink-0 accent-[hsl(var(--primary))]"
            />
          </label>
          <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
            <span>
              Open the game summary after each match
              <span className="block text-[11px] text-muted-foreground">
                When a match ends (win or loss), bring RTSLytics to the front on that game&apos;s
                full post-game breakdown.
              </span>
            </span>
            <input
              type="checkbox"
              checked={settings?.openSummaryOnGameEnd ?? true}
              onChange={(e) => update.mutate({ openSummaryOnGameEnd: e.target.checked })}
              className="h-4 w-4 shrink-0 accent-[hsl(var(--primary))]"
            />
          </label>
          <LocalDataStatusCard />
        </CardContent>
      </Card>

      <Card id="settings-hotkeys" className="scroll-mt-14">
        <CardContent className="space-y-3 p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Keyboard className="h-4 w-4 text-primary" />
            Hotkeys
          </h2>
          <div className="divide-y divide-border text-sm">
            {[
              [toggleHotkey, 'Show / hide overlay'],
              [placementHotkey, 'Move overlay widgets'],
              [nextBuildStepHotkey, 'Next build step'],
              [previousBuildStepHotkey, 'Previous build step'],
              [resetBuildStepHotkey, 'Reset build step'],
              [nextBuildOrderHotkey, 'Next build order'],
              [previousBuildOrderHotkey, 'Previous build order'],
              [toggleBuildOrderHotkey, 'Show / hide build order'],
              [nextCounterHotkey, 'Cycle counter target'],
              [switchTimerModeHotkey, 'Switch timer mode'],
              [startTimerHotkey, 'Start timer'],
              [stopTimerHotkey, 'Stop timer'],
              [resetTimerHotkey, 'Reset timer'],
            ].map(([key, desc]) => (
              <div key={desc} className="flex items-center justify-between py-1.5">
                <span className="text-muted-foreground">{desc}</span>
                <kbd className="rounded bg-secondary px-2 py-0.5 font-mono text-xs">{key}</kbd>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Change the bindings from the Overlay section above.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function OverlayToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <div className="group flex min-h-[68px] items-center justify-between gap-3 py-3 transition-colors hover:text-foreground">
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        <span className="mt-0.5 block text-[11px] leading-relaxed text-muted-foreground">
          {description}
        </span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-5 w-9 shrink-0 rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          checked ? 'border-primary bg-primary' : 'border-border bg-secondary',
        )}
      >
        <span
          className={cn(
            'absolute left-0.5 top-0.5 h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform',
            checked ? 'translate-x-[18px]' : 'translate-x-0',
          )}
        />
      </button>
    </div>
  )
}

type LocalDataStatus = Awaited<ReturnType<typeof ipc.getLocalDataStatus>>

/** Shows whether the consent-free local AoE4 data source is usable on this machine. */
function LocalDataStatusCard() {
  const { tt } = useI18n()
  const [status, setStatus] = useState<LocalDataStatus | null>(null)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setChecking(true)
    setError(null)
    try {
      setStatus(await ipc.getLocalDataStatus())
    } catch {
      setError(tt('Local game data status could not be checked.'))
    } finally {
      setChecking(false)
    }
  }, [tt])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const available = status?.available === true
  return (
    <div className="space-y-2 rounded-md border border-border/60 bg-secondary/20 p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium">{tt('Local AoE4 data')}</span>
        <span
          className={cn(
            'rounded px-2 py-0.5 text-[11px]',
            available ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-300',
          )}
        >
          {checking
            ? tt('Checking…')
            : available
              ? tt('Available')
              : status
                ? tt('Not detected')
                : tt('Unknown')}
        </span>
      </div>
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        {status
          ? status.logExists
            ? tt('The local warnings log was found; custom games and live telemetry can use it.')
            : tt('The default AoE4 user-data folder or warnings log was not found yet.')
          : tt('Checking the default AoE4 user-data folder…')}
      </p>
      {status && (
        <p className="break-all font-mono text-[10px] text-muted-foreground">{status.gameDir}</p>
      )}
      {(error || !available) && (
        <div className="flex flex-wrap items-center gap-2">
          {error && <span className="text-xs text-loss">{error}</span>}
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={checking}
            className="rounded border border-border px-2 py-1 text-[11px] text-muted-foreground hover:bg-secondary disabled:opacity-50"
          >
            {checking ? tt('Checking…') : tt('Re-check')}
          </button>
        </div>
      )}
    </div>
  )
}

type ExternalApiStatus = Awaited<ReturnType<typeof ipc.getExternalApiStatus>>

function ExternalApisCard() {
  const { tt } = useI18n()
  const [status, setStatus] = useState<ExternalApiStatus | null>(null)
  const [checking, setChecking] = useState(false)
  const [statusError, setStatusError] = useState<string | null>(null)
  const [twitchClientId, setTwitchClientId] = useState('')
  const [twitchClientSecret, setTwitchClientSecret] = useState('')
  const [youtubeApiKey, setYoutubeApiKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const refreshStatus = useCallback(async () => {
    setChecking(true)
    setStatusError(null)
    try {
      setStatus(await ipc.getExternalApiStatus())
    } catch {
      setStatusError(tt('External API status could not be checked.'))
    } finally {
      setChecking(false)
    }
  }, [tt])

  useEffect(() => {
    void refreshStatus()
  }, [refreshStatus])

  const save = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const next = await ipc.configureExternalApis({
        twitchClientId: twitchClientId.trim() || undefined,
        twitchClientSecret: twitchClientSecret.trim() || undefined,
        youtubeApiKey: youtubeApiKey.trim() || undefined,
      })
      setStatus(next)
      setTwitchClientId('')
      setTwitchClientSecret('')
      setYoutubeApiKey('')
      setMessage(tt('External API settings saved.'))
    } catch (error) {
      setMessage(error instanceof Error ? error.message : tt('External API settings failed.'))
    } finally {
      setSaving(false)
    }
  }

  const clear = async () => {
    setMessage(null)
    try {
      const next = await ipc.clearExternalApis()
      setStatus(next)
      setMessage(tt('External API credentials cleared.'))
    } catch {
      setMessage(tt('External API credentials could not be cleared.'))
    }
  }

  return (
    <Card id="settings-integrations" className="scroll-mt-14">
      <CardContent className="space-y-3 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <KeyRound className="h-4 w-4 text-primary" />
              {tt('External API integrations')}
            </h2>
            <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
              {tt(
                'Optional official Twitch and YouTube APIs add current VODs, dates, durations, and view counts to the video explorer.',
              )}
            </p>
          </div>
          <span className="rounded bg-secondary px-2 py-1 text-[10px] text-muted-foreground">
            {checking
              ? tt('Checking…')
              : statusError
                ? tt('Unavailable')
                : status?.twitch.configured || status?.youtube.configured
                  ? tt('At least one provider ready')
                  : tt('Optional')}
          </span>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2 rounded-md border border-border/60 bg-secondary/20 p-3">
            <div className="flex items-center justify-between text-sm font-medium">
              <span>{tt('Twitch official API')}</span>
              <span className="text-[11px] text-muted-foreground">
                {status?.twitch.configured ? tt('Ready') : tt('Not configured')}
              </span>
            </div>
            <a
              href="https://dev.twitch.tv/console/apps"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
            >
              {tt('Create Twitch credentials')}
              <ExternalLink className="h-3 w-3" />
            </a>
            <input
              value={twitchClientId}
              onChange={(event) => setTwitchClientId(event.target.value)}
              placeholder={tt('Twitch Client ID')}
              className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground"
              autoComplete="off"
              spellCheck={false}
            />
            <input
              type="password"
              value={twitchClientSecret}
              onChange={(event) => setTwitchClientSecret(event.target.value)}
              placeholder={tt('Twitch Client Secret')}
              className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground"
              autoComplete="new-password"
              spellCheck={false}
            />
            <p className="text-[11px] text-muted-foreground">
              {tt(
                'Used for official VOD search. A client-credentials OAuth token is refreshed automatically.',
              )}
            </p>
          </div>

          <div className="space-y-2 rounded-md border border-border/60 bg-secondary/20 p-3">
            <div className="flex items-center justify-between text-sm font-medium">
              <span>{tt('YouTube Data API')}</span>
              <span className="text-[11px] text-muted-foreground">
                {status?.youtube.configured ? tt('Ready') : tt('Not configured')}
              </span>
            </div>
            <a
              href="https://console.cloud.google.com/apis/credentials"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
            >
              {tt('Create a YouTube API key')}
              <ExternalLink className="h-3 w-3" />
            </a>
            <input
              type="password"
              value={youtubeApiKey}
              onChange={(event) => setYoutubeApiKey(event.target.value)}
              placeholder={tt('YouTube API key')}
              className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground"
              autoComplete="new-password"
              spellCheck={false}
            />
            <p className="text-[11px] text-muted-foreground">
              {tt(
                'Adds recent/popular videos plus duration and view-count metadata. Captions remain optional.',
              )}
            </p>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground">
          {tt(
            'Credentials are encrypted by the operating system and never exposed to the renderer, overlay, or OBS source.',
          )}
        </p>
        {statusError && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-loss">
            <span>{statusError}</span>
            <button
              type="button"
              onClick={() => void refreshStatus()}
              disabled={checking}
              className="rounded border border-border px-2 py-1 text-[11px] text-muted-foreground hover:bg-secondary disabled:opacity-50"
            >
              {checking ? tt('Checking…') : tt('Retry')}
            </button>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="rounded-md border border-primary/50 bg-primary/10 px-3 py-2 text-xs text-primary hover:bg-primary/20 disabled:opacity-50"
          >
            {saving ? tt('Saving…') : tt('Save external API settings')}
          </button>
          <button
            type="button"
            onClick={() => void clear()}
            className="rounded-md border border-border px-3 py-2 text-xs hover:bg-secondary"
          >
            {tt('Clear external API credentials')}
          </button>
          {message && <span className="text-xs text-muted-foreground">{message}</span>}
        </div>
      </CardContent>
    </Card>
  )
}

function ReplaysApiCard({
  value,
  saving,
  onSave,
}: {
  value: string | null
  saving: boolean
  onSave: (url: string | null) => Promise<unknown>
}) {
  const { tt } = useI18n()
  const [draft, setDraft] = useState(value ?? '')
  const [message, setMessage] = useState<string | null>(null)
  const [status, setStatus] = useState<Awaited<ReturnType<typeof ipc.getReplaysApiStatus>> | null>(
    null,
  )
  const [checking, setChecking] = useState(false)

  useEffect(() => setDraft(value ?? ''), [value])

  const refreshStatus = async () => {
    setChecking(true)
    try {
      setStatus(await ipc.getReplaysApiStatus())
    } catch {
      setStatus({
        source: 'none',
        baseUrl: null,
        available: false,
        detail: 'Replay parser status could not be checked.',
      })
    } finally {
      setChecking(false)
    }
  }

  useEffect(() => {
    void refreshStatus()
  }, [])

  const saveValue = async (next: string | null) => {
    await onSave(next)
    await refreshStatus()
  }

  const save = async () => {
    const next = draft.trim() || null
    if (next) {
      try {
        const parsed = new URL(next)
        if (
          (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') ||
          parsed.username ||
          parsed.password ||
          parsed.search ||
          parsed.hash
        ) {
          throw new Error('invalid')
        }
      } catch {
        setMessage(tt('Use a plain http(s) base URL without credentials or a query string.'))
        return
      }
    }
    try {
      await saveValue(next)
      setMessage(
        next ? tt('External replays-api URL saved.') : tt('Bundled local sidecar selected.'),
      )
    } catch {
      setMessage(tt('Replay parser setting could not be saved.'))
    }
  }

  const sourceLabel = (source: NonNullable<typeof status>['source']) => {
    if (source === 'bundled') return tt('Bundled local sidecar')
    if (source === 'environment') return tt('Environment setting')
    if (source === 'settings') return tt('External URL')
    return tt('Not available')
  }

  return (
    <Card id="settings-replays" className="scroll-mt-14">
      <CardContent className="space-y-3 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">{tt('AoE4 replay parser')}</h2>
            <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
              {tt(
                'Unsupported replay summaries fall back to aoe4world/replays-api. Leave this blank to use the bundled local service on this computer.',
              )}
            </p>
          </div>
          <span className="rounded bg-secondary px-2 py-1 text-[10px] text-muted-foreground">
            {value ? tt('External URL') : tt('Bundled local sidecar')}
          </span>
        </div>

        <label className="space-y-1 text-xs">
          <span className="block text-muted-foreground">
            {tt('External replays-api URL (optional)')}
          </span>
          <input
            type="url"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="https://replays-api.example.com"
            className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground"
            autoComplete="off"
            spellCheck={false}
          />
        </label>
        <p className="text-[11px] text-muted-foreground">
          {tt(
            'A remote URL is used only after local parsing fails and receives a short-lived signed summary URL. A loopback URL (localhost/127.0.0.1) receives a private local file instead.',
          )}
        </p>
        <div
          className={cn(
            'rounded-md border px-3 py-2 text-xs',
            status?.available
              ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400'
              : 'border-amber-500/30 bg-amber-500/5 text-amber-300',
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium">
              {checking || !status
                ? tt('Checking replay parser…')
                : status?.available
                  ? tt('Replay parser is ready.')
                  : tt('Replay parser is unavailable.')}
            </span>
            {status && (
              <span className="rounded bg-background/40 px-1.5 py-0.5 text-[10px]">
                {sourceLabel(status.source)}
              </span>
            )}
          </div>
          {status && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              {tt(status.detail)}
              {status.baseUrl ? ` · ${status.baseUrl}` : ''}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-md border border-primary/50 bg-primary/10 px-3 py-2 text-xs text-primary hover:bg-primary/20 disabled:opacity-50"
          >
            {saving ? tt('Saving…') : tt('Save replay parser setting')}
          </button>
          <button
            type="button"
            onClick={() => {
              setDraft('')
              void saveValue(null)
                .then(() => setMessage(tt('Bundled local sidecar selected.')))
                .catch(() => setMessage(tt('Replay parser setting could not be saved.')))
            }}
            disabled={saving}
            className="rounded-md border border-border px-3 py-2 text-xs hover:bg-secondary disabled:opacity-50"
          >
            {tt('Use bundled local sidecar')}
          </button>
          <button
            type="button"
            onClick={() => void refreshStatus()}
            disabled={checking}
            className="rounded-md border border-border px-3 py-2 text-xs hover:bg-secondary disabled:opacity-50"
          >
            {checking ? tt('Checking…') : tt('Check parser status')}
          </button>
          {message && <span className="text-xs text-muted-foreground">{message}</span>}
        </div>
      </CardContent>
    </Card>
  )
}

const TRANSLATION_ENDPOINTS = {
  deepl: 'https://api-free.deepl.com/v2/translate',
  libretranslate: 'https://libretranslate.com/translate',
} as const

type TranslationProvider = keyof typeof TRANSLATION_ENDPOINTS
type TranslationStatus = Awaited<ReturnType<typeof ipc.getTranslationStatus>>
const DEFAULT_TRANSLATION_ENDPOINT: string = TRANSLATION_ENDPOINTS.deepl

function TranslationApiCard({ onSaved }: { onSaved: () => Promise<void> }) {
  const { tt } = useI18n()
  const [provider, setProvider] = useState<TranslationProvider>('deepl')
  const [endpoint, setEndpoint] = useState(DEFAULT_TRANSLATION_ENDPOINT)
  const [apiKey, setApiKey] = useState('')
  const [enabled, setEnabled] = useState(false)
  const [status, setStatus] = useState<TranslationStatus | null>(null)
  const [checking, setChecking] = useState(false)
  const [statusError, setStatusError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const refreshStatus = useCallback(async () => {
    setChecking(true)
    setStatusError(null)
    try {
      const current = await ipc.getTranslationStatus()
      setStatus(current)
      setEnabled(current.enabled)
      setProvider(current.provider)
      setEndpoint(current.endpoint)
    } catch {
      setStatusError(tt('Translation API status could not be checked.'))
    } finally {
      setChecking(false)
    }
  }, [tt])

  useEffect(() => {
    void refreshStatus()
  }, [refreshStatus])

  const changeProvider = (next: TranslationProvider) => {
    setProvider(next)
    if (!endpoint || Object.values(TRANSLATION_ENDPOINTS).includes(endpoint as never)) {
      setEndpoint(TRANSLATION_ENDPOINTS[next])
    }
  }

  const save = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const next = await ipc.configureTranslation({
        enabled,
        provider,
        endpoint,
        apiKey: apiKey.trim() || undefined,
      })
      setStatus(next)
      setApiKey('')
      setMessage(tt('Translation settings saved.'))
      await onSaved()
    } catch {
      setMessage(tt('Translation API is unavailable.'))
    } finally {
      setSaving(false)
    }
  }

  const clearCache = async () => {
    try {
      const next = await ipc.clearTranslationCache()
      setStatus(next)
      setMessage(tt('Translation cache cleared.'))
    } catch {
      setMessage(tt('Translation cache could not be cleared.'))
    }
  }

  return (
    <Card id="settings-translation" className="scroll-mt-14">
      <CardContent className="space-y-3 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <LanguagesIcon className="h-4 w-4 text-primary" />
              {tt('Translation API')}
            </h2>
            <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
              {tt(
                'Translate missing interface strings for Ukrainian and German using an optional provider.',
              )}
            </p>
          </div>
          <span className="rounded bg-secondary px-2 py-1 text-[10px] text-muted-foreground">
            {checking
              ? tt('Checking…')
              : statusError
                ? tt('Unavailable')
                : status?.hasApiKey
                  ? tt('Configured')
                  : tt('Not configured')}
          </span>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
            className="h-4 w-4 accent-[hsl(var(--primary))]"
          />
          {tt('Enable automatic translation')}
        </label>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1 text-xs">
            <span className="block text-muted-foreground">{tt('Translation provider')}</span>
            <select
              value={provider}
              onChange={(event) => changeProvider(event.target.value as TranslationProvider)}
              className="h-9 w-full rounded-md border border-border bg-background px-2 text-foreground"
            >
              <option value="deepl">{tt('DeepL Free/Pro')}</option>
              <option value="libretranslate">{tt('LibreTranslate')}</option>
            </select>
          </label>
          <label className="space-y-1 text-xs">
            <span className="block text-muted-foreground">{tt('Endpoint')}</span>
            <input
              value={endpoint}
              onChange={(event) => setEndpoint(event.target.value)}
              className="h-9 w-full rounded-md border border-border bg-background px-2 text-foreground"
              spellCheck={false}
            />
          </label>
        </div>

        <label className="space-y-1 text-xs">
          <span className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">
              {tt(provider === 'deepl' ? 'DeepL API key' : 'LibreTranslate API key')}
            </span>
            <a
              href={
                provider === 'deepl'
                  ? 'https://www.deepl.com/en/pro-api'
                  : 'https://portal.libretranslate.com/'
              }
              target="_blank"
              rel="noreferrer"
              className="inline-flex shrink-0 items-center gap-1 text-[11px] text-primary hover:underline"
            >
              {tt(provider === 'deepl' ? 'Get a DeepL key' : 'Get a LibreTranslate key')}
              <ExternalLink className="h-3 w-3" />
            </a>
          </span>
          <input
            type="password"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder={status?.hasApiKey ? '••••••••' : 'API key'}
            className="h-9 w-full rounded-md border border-border bg-background px-2 text-foreground"
            autoComplete="new-password"
          />
        </label>
        <p className="text-[11px] text-muted-foreground">
          {tt(
            'API key is stored encrypted by the operating system and never exposed to the renderer or overlay.',
          )}
        </p>
        {statusError && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-loss">
            <span>{statusError}</span>
            <button
              type="button"
              onClick={() => void refreshStatus()}
              disabled={checking}
              className="rounded border border-border px-2 py-1 text-[11px] text-muted-foreground hover:bg-secondary disabled:opacity-50"
            >
              {checking ? tt('Checking…') : tt('Retry')}
            </button>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="rounded-md border border-primary/50 bg-primary/10 px-3 py-2 text-xs text-primary hover:bg-primary/20 disabled:opacity-50"
          >
            {saving ? tt('Saving…') : tt('Save translation settings')}
          </button>
          <button
            type="button"
            onClick={() => void clearCache()}
            className="rounded-md border border-border px-3 py-2 text-xs hover:bg-secondary"
          >
            {tt('Clear translation cache')}
          </button>
          {message && <span className="text-xs text-muted-foreground">{message}</span>}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * A global hotkey binding row: a text input in Electron accelerator format
 * (e.g. "Alt+O", "Ctrl+Shift+F1"), committed on blur/Enter. The main process
 * validates it (at least one modifier required) and re-registers immediately;
 * an invalid or rejected value simply snaps back to the current binding.
 */
function HotkeyInput({
  label,
  value,
  defaultValue,
  onCommit,
}: {
  label: string
  value: string
  defaultValue: string
  onCommit: (accelerator: string) => void
}) {
  const [draft, setDraft] = useState(value)
  useEffect(() => setDraft(value), [value])
  const commit = () => {
    const next = draft.trim()
    if (next && next !== value) onCommit(next)
    // Snap back to the committed binding; the settings refresh brings the new one.
    setDraft(value)
  }
  return (
    <label className="flex items-center justify-between gap-3 text-sm">
      <span>
        {label}
        <span className="block text-[11px] text-muted-foreground">
          Electron accelerator format with at least one modifier, e.g. {defaultValue}.
        </span>
      </span>
      <input
        type="text"
        value={draft}
        spellCheck={false}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
        }}
        className="h-8 w-36 shrink-0 rounded-md border border-border bg-background px-2 text-center font-mono text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </label>
  )
}

/**
 * Pick the app's accent (action) colour — curated swatches plus a full custom
 * colour input. Applies live to both windows. Reset falls back to the default blue.
 */
function AccentPicker({
  value,
  onChange,
}: {
  value: string | null
  onChange: (hex: string | null) => void
}) {
  const { tt } = useI18n()
  return (
    <div className="space-y-2">
      <div className="text-sm">
        Accent color
        <span className="block text-[11px] text-muted-foreground">
          The action colour for buttons, links, active tabs, focus rings, and the in-game overlay.
          Applies everywhere instantly.
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {ACCENT_PRESETS.map((p) => {
          const active = value?.toLowerCase() === p.hex.toLowerCase()
          return (
            <button
              key={p.hex}
              type="button"
              title={p.name}
              onClick={() => onChange(p.hex)}
              className={cn(
                'h-7 w-7 rounded-full border-2 transition-transform hover:scale-110',
                active ? 'border-foreground' : 'border-black/40',
              )}
              style={{ backgroundColor: p.hex }}
            />
          )
        })}
        <label
          className="flex h-7 cursor-pointer items-center gap-1.5 rounded-md border border-border px-2 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          title={tt('Custom color')}
        >
          <Pipette className="h-3.5 w-3.5" />
          Custom
          <input
            type="color"
            value={value ?? currentAccentHex()}
            onChange={(e) => onChange(e.target.value)}
            className="h-0 w-0 opacity-0"
          />
        </label>
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * Links the active AoE4 profile to a local Steam account so the overlay knows which
 * player is YOU (vital in 2-human custom lobbies). Auto-suggests the account that
 * matches the profile — by SteamID64 first, then by name — and lets you pin it.
 * Pinned wins over auto-detection in the live matchup.
 */
function SteamIdentityCard({
  settings,
  onPin,
}: {
  settings: AppSettings | undefined
  onPin: (steamId: string | null) => void
}) {
  const { tt } = useI18n()
  const [accounts, setAccounts] = useState<SteamAccount[] | null>(null)
  const [profileSteamId, setProfileSteamId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [detectError, setDetectError] = useState<string | null>(null)

  const detect = useCallback(async () => {
    setLoading(true)
    setDetectError(null)
    try {
      const [accs, dash] = await Promise.all([ipc.detectSteamAccounts(), ipc.getDashboard()])
      setAccounts(accs)
      setProfileSteamId(dash.ok ? dash.data.steamId : null)
    } catch {
      setDetectError('Could not detect Steam accounts. Click Re-detect to try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void detect()
  }, [detect])

  const pinned = settings?.steamId ?? null
  const suggested = accounts
    ? matchSteamAccount(accounts, { steamId: profileSteamId, name: settings?.playerName })
    : null

  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Gamepad2 className="h-4 w-4 text-primary" />
          Steam account
        </h2>
        <p className="text-xs text-muted-foreground">
          {tt('Identifies which player is')}{' '}
          <span className="font-medium text-foreground">{tt('you')}</span> {tt('in')}
          custom / AI games, so the overlay shows the right side. We match your AoE4 profile to a
          Steam account by Steam ID, then by name. Leave it on auto if you have one account.
        </p>

        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Detecting Steam accounts…
          </div>
        )}

        {!loading && detectError && <p className="text-sm text-destructive">{detectError}</p>}

        {!loading && accounts && accounts.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No Steam accounts found on this PC. (If you play on Xbox, the overlay still picks you as
            the only human in vs-AI games.)
          </p>
        )}

        {!loading && accounts && accounts.length > 0 && (
          <div className="max-h-72 overflow-y-auto overscroll-contain rounded-lg border border-border">
            {accounts.map((acc) => {
              const isPinned = pinned === acc.steamId
              const isSuggested = suggested?.steamId === acc.steamId
              return (
                <button
                  key={acc.steamId}
                  type="button"
                  onClick={() => onPin(acc.steamId)}
                  className="flex w-full items-center justify-between gap-2 border-b border-border px-3 py-2 text-left transition-colors last:border-b-0 hover:bg-secondary"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Gamepad2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">
                        {acc.personaName ?? acc.accountName ?? acc.steamId}
                      </span>
                      <span className="block truncate font-mono text-[11px] text-muted-foreground">
                        {acc.steamId}
                      </span>
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    {isSuggested && !isPinned && (
                      <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] text-primary">
                        matches profile
                      </span>
                    )}
                    {acc.mostRecent && !isSuggested && !isPinned && (
                      <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        recent
                      </span>
                    )}
                    {isPinned ? (
                      <span className="flex items-center gap-1 rounded bg-win/15 px-1.5 py-0.5 text-[10px] text-win">
                        <Check className="h-3 w-3" /> you
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">{tt('pin')}</span>
                    )}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => void detect()}
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Re-detect
          </button>
          {pinned && (
            <button
              type="button"
              onClick={() => onPin(null)}
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Use auto (unpin)
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
