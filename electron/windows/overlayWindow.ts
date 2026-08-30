import { BrowserWindow, screen } from 'electron'
import { join } from 'node:path'
import { isDev } from '../env'
import { hardenWindow } from '../security'

/**
 * Creates the transparent, frameless, always-on-top overlay canvas. It spans the
 * primary display's FULL bounds (not the work area — borderless-fullscreen games
 * cover the taskbar, so the canvas must too or widgets misalign by the taskbar
 * height; safe because the window is click-through and non-focusable). The
 * controller re-snaps it to whichever display the game is on. It is hidden by
 * default and click-through when locked. Do not punch through exclusive
 * fullscreen (visibleOnFullScreen / screen-saver z-order): a layered Chromium
 * window over DXGI exclusive Present can make Relic exit the process. Users
 * should run Borderless / Windowed Fullscreen.
 */
export function createOverlayWindow(): BrowserWindow {
  const { bounds } = screen.getPrimaryDisplay()
  const win = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    show: false,
    transparent: true,
    frame: false,
    hasShadow: false,
    resizable: false,
    movable: false,
    skipTaskbar: true,
    focusable: false,
    fullscreenable: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  hardenWindow(win)

  // Stay above other windows in borderless/windowed fullscreen. 'floating' is
  // enough for that mode; 'screen-saver' + visibleOnFullScreen fights exclusive
  // DXGI and can take the game down with it.
  win.setAlwaysOnTop(true, 'floating')
  win.setVisibleOnAllWorkspaces(true)
  // Click-through by default. No `forward: true`: nothing in the overlay
  // renderer listens for mousemove while locked, and forwarding costs an IPC
  // message per mouse move during gameplay.
  win.setIgnoreMouseEvents(true)

  win.setPosition(bounds.x, bounds.y)

  if (isDev) {
    void win.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/overlay.html`)
  } else {
    void win.loadFile(join(__dirname, '../renderer/overlay.html'))
  }

  return win
}
