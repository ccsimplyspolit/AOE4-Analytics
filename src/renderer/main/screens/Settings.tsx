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
  Languages as LanguagesIcon,
  KeyRound,
  ArrowDown,
  ArrowUp,
} from 'lucide-react'
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
  { value: 'qm_1v1', label: 'Quick Match 1v1' },
  { value: 'rm_team', label: 'Ranked Team' },
]
const POLL_OPTIONS = [
  { value: 10_000, label: '10s' },
  { value: 15_000, label: '15s (recommended)' },
  { value: 30_000, label: '30s' },
]
const SETTINGS_SECTIONS = [
  ['settings-appearance', 'Appearance'],
  ['settings-account', 'Account'],
  ['settings-integrations', 'Integrations'],
  ['settings-overlay', 'Overlay'],
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
  const switchTimerModeHotkey = settings?.hotkeys.switchTimerMode ?? DEFAULT_HOTKEYS.switchTimerMode
  const startTimerHotkey = settings?.hotkeys.startTimer ?? DEFAULT_HOTKEYS.startTimer
  const stopTimerHotkey = settings?.hotkeys.stopTimer ?? DEFAULT_HOTKEYS.stopTimer
  const resetTimerHotkey = settings?.hotkeys.resetTimer ?? DEFAULT_HOTKEYS.resetTimer
  const [arrangingWidgets, setArrangingWidgets] = useState(false)
  const [customCssDraft, setCustomCssDraft] = useState('')

  // Placement mode persists its locked state in settings, so the button stays
  // accurate when this screen is revisited after using the global hotkey.
  useEffect(() => {
    if (settings) setArrangingWidgets(!settings.overlay.locked)
  }, [settings])
  const customCss = settings?.overlay.customCss
  useEffect(() => {
    setCustomCssDraft(customCss ?? '')
  }, [customCss])

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
  const orderedOverlayBuildNames = [
    ...cycleNames.filter((name) => overlayBuilds.some((build) => build.name === name)),
    ...overlayBuilds
      .map((build) => build.name)
      .filter((name) => !cycleNames.includes(name)),
  ]
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
        sub="Profile, appearance, overlay, and data."
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
        <CardContent className="space-y-4 p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Monitor className="h-4 w-4 text-primary" />
            {tt('Overlay')}
          </h2>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span>{tt('Opacity')}</span>
              <span className="tabular-nums text-muted-foreground">
                {Math.round(opacity * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0.35}
              max={1}
              step={0.01}
              value={opacity}
              onChange={(e) => setLiveOpacity(Number(e.target.value))}
              className="w-full accent-[hsl(var(--primary))]"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
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

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span>{tt('Widget size')}</span>
              <span className="tabular-nums text-muted-foreground">{Math.round(scale * 100)}%</span>
            </div>
            <input
              type="range"
              min={0.75}
              max={1.5}
              step={0.05}
              value={scale}
              onChange={(e) => setLiveScale(Number(e.target.value))}
              className="w-full accent-[hsl(var(--primary))]"
            />
          </div>

          <div className="grid gap-2 border-t border-border pt-3 sm:grid-cols-3">
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

          <p className="text-[11px] text-muted-foreground">
            The overlay shows the matchup across the top, a live APM counter, and a results card
            after each game. Arrange widgets with the button below or {placementHotkey}; it opens a
            draggable preview even before a match.
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

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void ipc.toggleOverlay()}
              className="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              Show / hide overlay ({toggleHotkey})
            </button>
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
              Reset widget positions
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
                    'Choose a build here, or let the overlay pick the first matching build for your civilization.',
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
                    {overlayBuilds.map((build) => (
                      <option key={build.name} value={build.name}>
                        {build.name} · {buildOrderCivLabel(build)}
                        {settings?.overlay.customBuildOrders.some((item) => item.name === build.name)
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
              </div>
            </div>
            <div className="space-y-2 border-t border-border pt-3">
              <div>
                <div className="text-sm font-medium">{tt('Build-order cycle library')}</div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {tt(
                    'Imported builds and the bundled catalog are all available. Uncheck a build to skip it while cycling; use the arrows to set the order.',
                  )}
                </p>
              </div>
              <div className="max-h-72 space-y-1 overflow-y-auto rounded-md border border-border/70 bg-background/30 p-2">
                {orderedOverlayBuildNames.map((name, index) => {
                  const build = overlayBuilds.find((item) => item.name === name)
                  if (!build) return null
                  const disabled = settings?.overlay.buildOrderDisabled.includes(name) ?? false
                  const custom = settings?.overlay.customBuildOrders.some(
                    (item) => item.name === name,
                  )
                  const move = (direction: -1 | 1) => {
                    if (!settings) return
                    const next = [...orderedOverlayBuildNames]
                    const target = index + direction
                    if (target < 0 || target >= next.length) return
                    ;[next[index], next[target]] = [next[target]!, next[index]!]
                    update.mutate(
                      { overlay: { buildOrderCycle: next } },
                      { onSuccess: () => void ipc.applyOverlaySettings() },
                    )
                  }
                  return (
                    <div
                      key={name}
                      className="flex items-center gap-2 rounded border border-border/60 px-2 py-1.5 text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={!disabled}
                        onChange={(event) => {
                          if (!settings) return
                          const nextDisabled = new Set(settings.overlay.buildOrderDisabled)
                          if (event.target.checked) nextDisabled.delete(name)
                          else nextDisabled.add(name)
                          update.mutate(
                            { overlay: { buildOrderDisabled: [...nextDisabled] } },
                            { onSuccess: () => void ipc.applyOverlaySettings() },
                          )
                        }}
                        className="h-4 w-4 shrink-0 accent-[hsl(var(--primary))]"
                        aria-label={`${tt('Cycle')} ${name}`}
                      />
                      <span className={cn('min-w-0 flex-1 truncate', disabled && 'text-muted-foreground line-through')}>
                        {name}
                      </span>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {custom ? tt('custom') : tt('bundled')}
                      </span>
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => move(-1)}
                        className="rounded border border-border p-1 text-muted-foreground hover:bg-secondary disabled:opacity-30"
                        title={tt('Move up')}
                      >
                        <ArrowUp className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        disabled={index === orderedOverlayBuildNames.length - 1}
                        onClick={() => move(1)}
                        className="rounded border border-border p-1 text-muted-foreground hover:bg-secondary disabled:opacity-30"
                        title={tt('Move down')}
                      >
                        <ArrowDown className="h-3 w-3" />
                      </button>
                    </div>
                  )
                })}
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

      <div id="settings-polling" className="grid scroll-mt-14 gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="space-y-3 p-5">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <Gauge className="h-4 w-4 text-primary" />
              Match polling
            </h2>
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">{tt('Check for a new game every')}</span>
              <select
                value={settings?.polling.idleIntervalMs ?? 15_000}
                onChange={(e) => {
                  if (!settings) return
                  const v = Number(e.target.value)
                  update.mutate({
                    polling: { ...settings.polling, idleIntervalMs: v, activeIntervalMs: v },
                  })
                }}
                className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {POLL_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <p className="text-xs text-muted-foreground">
              15s is the community-polite rate. RTSLytics caches aggressively and never
              bulk-scrapes.
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
              Used for your dashboard form, scouting, and post-game analysis.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card id="settings-stats" className="scroll-mt-14">
        <CardContent className="space-y-3 p-5">
          <h2 className="text-base font-semibold">{tt('Stats')}</h2>
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
    <div className="flex items-start justify-between gap-3 rounded-md border border-border/60 bg-secondary/20 p-3 transition-colors hover:border-primary/35">
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
          'relative mt-0.5 h-5 w-9 shrink-0 rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          checked ? 'border-primary bg-primary' : 'border-border bg-secondary',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform',
            checked ? 'translate-x-[18px]' : 'translate-x-0.5',
          )}
        />
      </button>
    </div>
  )
}

type ExternalApiStatus = Awaited<ReturnType<typeof ipc.getExternalApiStatus>>

function ExternalApisCard() {
  const { tt } = useI18n()
  const [status, setStatus] = useState<ExternalApiStatus | null>(null)
  const [twitchClientId, setTwitchClientId] = useState('')
  const [twitchClientSecret, setTwitchClientSecret] = useState('')
  const [youtubeApiKey, setYoutubeApiKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    void ipc.getExternalApiStatus().then(setStatus)
  }, [])

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
    const next = await ipc.clearExternalApis()
    setStatus(next)
    setMessage(tt('External API credentials cleared.'))
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
            {status?.twitch.configured || status?.youtube.configured
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
      setMessage(next ? tt('External replays-api URL saved.') : tt('Bundled local sidecar selected.'))
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
    <Card className="scroll-mt-14">
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
          <span className="block text-muted-foreground">{tt('External replays-api URL (optional)')}</span>
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
              {checking
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
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    void ipc.getTranslationStatus().then((current) => {
      setStatus(current)
      setEnabled(current.enabled)
      setProvider(current.provider)
      setEndpoint(current.endpoint)
    })
  }, [])

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
    const next = await ipc.clearTranslationCache()
    setStatus(next)
    setMessage(tt('Translation cache cleared.'))
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
            {status?.hasApiKey ? tt('Configured') : tt('Not configured')}
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
          <span className="block text-muted-foreground">
            {tt(provider === 'deepl' ? 'DeepL API key' : 'LibreTranslate API key')}
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
