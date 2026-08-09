import { app } from 'electron'
import electronUpdater from 'electron-updater'

const CHECK_DELAY_MS = 12_000

let started = false

/**
 * Check the public GitHub release channel after the app is ready.
 *
 * Windows auto-install is deliberately deferred until the user closes the app:
 * interrupting a live AoE4 match to install a downloaded update would be far
 * worse than starting the fresh version on the next launch. `electron-updater`
 * verifies the installer metadata before handing it to NSIS.
 */
export function startAutoUpdate(): void {
  if (
    started ||
    process.platform !== 'win32' ||
    !app.isPackaged ||
    process.env['RTSLYTICS_SMOKE'] === '1' ||
    process.env['RTSLYTICS_VERIFY']
  ) {
    return
  }

  // electron-builder portable wrappers do not support in-place updates. They
  // remain a manual-download option; the NSIS install target is the upgrade
  // path that receives automatic updates.
  if (process.env['PORTABLE_EXECUTABLE_FILE']) return

  started = true
  const { autoUpdater } = electronUpdater
  autoUpdater.allowPrerelease = false
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => console.log('[update] checking GitHub releases'))
  autoUpdater.on('update-available', (info) =>
    console.log(`[update] ${info.version} available; downloading in the background`),
  )
  autoUpdater.on('update-not-available', (info) =>
    console.log(`[update] already current (${info.version})`),
  )
  autoUpdater.on('update-downloaded', (info) =>
    console.log(`[update] ${info.version} ready; installing when RTSLytics closes`),
  )
  autoUpdater.on('error', (error) => console.warn('[update] check/download failed:', error))

  const timer = setTimeout(() => {
    void autoUpdater.checkForUpdates().catch((error: unknown) => {
      console.warn('[update] check/download failed:', error)
    })
  }, CHECK_DELAY_MS)
  timer.unref?.()
}
