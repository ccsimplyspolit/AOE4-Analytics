import { BrowserWindow } from 'electron'
import { join } from 'node:path'
import { isDev } from '../env'
import { hardenWindow } from '../security'
import { IpcChannels } from '../ipc/contract'

/**
 * Creates the main dashboard window. It is FRAMELESS — the renderer draws its
 * own title bar (logo + min/max/close), driven via the `window:*` IPC handlers,
 * so the OS chrome never clashes with the app's look.
 */
export function createMainWindow(initialRoute?: string): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 832,
    minWidth: 1024,
    minHeight: 680,
    show: false,
    frame: false,
    backgroundColor: '#0a0b10',
    title: 'RTSLytics',
    // In the packaged app the .exe carries the icon (electron-builder); set it
    // here too so the dev window + taskbar show it before packaging.
    ...(isDev ? { icon: join(__dirname, '../../build/icon.png') } : {}),
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  const showWindow = () => {
    if (win.isDestroyed() || win.isVisible()) return
    win.show()
    win.focus()
  }
  win.once('ready-to-show', showWindow)
  // A failed or very slow renderer load must not leave the frameless dashboard
  // permanently hidden. Showing the window gives the user visible diagnostics
  // and lets the normal renderer crash-recovery handlers take over.
  const showFallback = setTimeout(showWindow, 5000)
  win.once('closed', () => clearTimeout(showFallback))
  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (isMainFrame) {
      console.error('[main] dashboard load failed:', errorCode, errorDescription, validatedURL)
    }
  })

  // Keep the renderer's title-bar maximize/restore icon in sync with the window.
  win.on('maximize', () => win.webContents.send(IpcChannels.windowMaximizedChanged, true))
  win.on('unmaximize', () => win.webContents.send(IpcChannels.windowMaximizedChanged, false))

  // Crash recovery (same treatment as the overlay window): a dead or hung
  // renderer would otherwise leave a permanently blank frameless window with
  // no way to close it but the task manager.
  win.webContents.on('render-process-gone', (_e, details) => {
    console.warn('[main] renderer gone:', details.reason)
    if (!win.isDestroyed()) win.webContents.reload()
  })
  win.on('unresponsive', () => {
    console.warn('[main] renderer unresponsive — reloading')
    if (!win.isDestroyed()) win.webContents.reload()
  })

  // Open external links in the browser; same-document app links with
  // target="_blank" get a fresh, equally hardened dashboard window.
  hardenWindow(win, (url) => {
    const route = (() => {
      try {
        return new URL(url).hash.slice(1)
      } catch {
        return null
      }
    })()
    if (!route) return
    if (!/^\/(?:game\/[^/?#]+|public-game\/[^/?#]+\/[^/?#]+)$/.test(route)) return
    createMainWindow(route)
  })

  if (isDev) {
    void win.loadURL(
      `${process.env['ELECTRON_RENDERER_URL']}/index.html${initialRoute ? `#${initialRoute}` : ''}`,
    )
  } else {
    void win.loadFile(join(__dirname, '../renderer/index.html'), initialRoute ? { hash: initialRoute } : undefined)
  }

  return win
}
