import { globalShortcut } from 'electron'
import { DEFAULT_HOTKEYS } from '@store/settings'
import type { OverlayController } from './services/overlayController'
import { getSettings } from './services/appContext'

/** Registers one shortcut, falling back to its default binding on failure. */
function reg(accelerator: string, fallback: string, handler: () => void): void {
  let ok: boolean
  try {
    ok = globalShortcut.register(accelerator, handler)
  } catch {
    ok = false // malformed accelerator string
  }
  if (ok) return
  console.warn(`[hotkeys] Failed to register ${accelerator} (already in use by another app?)`)
  if (accelerator === fallback) return
  try {
    if (globalShortcut.register(fallback, handler)) {
      console.warn(`[hotkeys] Fell back to the default ${fallback}`)
      return
    }
  } catch {
    // fall through to the warning below
  }
  console.warn(`[hotkeys] Failed to register the default ${fallback} too`)
}

/**
 * (Re)registers the global hotkeys from settings after `app.whenReady()`:
 *   hotkeys.toggleOverlay  (default Alt+O)         toggle overlay visibility
 *   hotkeys.placementMode  (default Ctrl+Alt+O)    toggle overlay placement mode
 *   hotkeys.nextBuildStep   (default Ctrl+Alt+Right) advance the pinned build
 *   hotkeys.previousBuildStep (default Ctrl+Alt+Left) go back one build step
 *   hotkeys.resetBuildStep  (default Ctrl+Alt+Down) return to clock-driven mode
 *   hotkeys.nextCounter     (default Ctrl+Alt+C)     cycle the counter target civ
 *   hotkeys.nextBuildOrder  (default Ctrl+Alt+PageDown) cycle forward a build
 *   hotkeys.previousBuildOrder (default Ctrl+Alt+PageUp) cycle back a build
 *   hotkeys.switchTimerMode / startTimer / stopTimer / resetTimer control the
 *   manual RTS Overlay timer without taking focus from the game.
 * Idempotent — call again after a settings change to swap bindings live. When a
 * user binding can't be registered, the default is tried as a fallback.
 */
export function registerHotkeys(overlay: OverlayController): void {
  globalShortcut.unregisterAll()
  const hotkeys = getSettings().getAll().hotkeys
  reg(hotkeys.toggleOverlay, DEFAULT_HOTKEYS.toggleOverlay, () => overlay.toggle())
  reg(hotkeys.placementMode, DEFAULT_HOTKEYS.placementMode, () => overlay.togglePlacementMode())
  reg(hotkeys.nextBuildStep, DEFAULT_HOTKEYS.nextBuildStep, () => overlay.sendControl('next-step'))
  reg(hotkeys.previousBuildStep, DEFAULT_HOTKEYS.previousBuildStep, () =>
    overlay.sendControl('prev-step'),
  )
  reg(hotkeys.resetBuildStep, DEFAULT_HOTKEYS.resetBuildStep, () =>
    overlay.sendControl('reset-step'),
  )
  reg(hotkeys.nextCounter, DEFAULT_HOTKEYS.nextCounter, () =>
    overlay.sendControl('next-counter'),
  )
  reg(hotkeys.nextBuildOrder, DEFAULT_HOTKEYS.nextBuildOrder, () => overlay.sendControl('next-bo'))
  reg(hotkeys.previousBuildOrder, DEFAULT_HOTKEYS.previousBuildOrder, () =>
    overlay.sendControl('prev-bo'),
  )
  reg(hotkeys.switchTimerMode, DEFAULT_HOTKEYS.switchTimerMode, () =>
    overlay.sendControl('switch-timer'),
  )
  reg(hotkeys.startTimer, DEFAULT_HOTKEYS.startTimer, () => overlay.sendControl('start-timer'))
  reg(hotkeys.stopTimer, DEFAULT_HOTKEYS.stopTimer, () => overlay.sendControl('stop-timer'))
  reg(hotkeys.resetTimer, DEFAULT_HOTKEYS.resetTimer, () => overlay.sendControl('reset-timer'))
}

/** Must be called on `will-quit` so we never leak system-wide hotkeys. */
export function unregisterHotkeys(): void {
  globalShortcut.unregisterAll()
}
