import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { basename } from 'node:path'
import {
  classifyForegroundWindow,
  parseForegroundWatcherLine,
} from '@domain/gameWindow'

/**
 * Watches the Windows foreground window and reports a friendly process token +
 * window rect whenever either changes, so the overlay can hide itself when the
 * user alt-tabs away from the game and follow the game across monitors.
 *
 * Implemented as ONE long-lived hidden PowerShell process that polls
 * `GetForegroundWindow` in a light loop and prints `pid<TAB>title<TAB>class<TAB>x,y,w,h`
 * on change — far cheaper than spawning a process per check, and needs no native
 * module. Windows-only; a no-op elsewhere (callers then leave gating effectively off).
 *
 * The child never OpenProcess / Get-Process the game. Easy Anti-Cheat protects
 * RelicCardinal handles; an unexpected PROCESS_VM_READ from PowerShell can
 * terminate the match. AoE4 is recognized from user32 title/class only.
 * Get-Process is used solely against *this* (parent) PID for liveness.
 *
 * Hardened: the child auto-respawns with exponential backoff if it dies, its
 * stderr is drained so the pipe can never stall it, and the script exits on its
 * own when this (parent) process is gone so it can't be orphaned.
 */

/** The game window's screen rect, in physical pixels (GetWindowRect). */
export interface ForegroundRect {
  x: number
  y: number
  width: number
  height: number
}

const POLL_MS = 600
/** Parent-liveness check cadence, in loop iterations (~every 4.8s at 600ms). */
const PARENT_CHECK_EVERY = 8
const BACKOFF_MIN_MS = 1_000
const BACKOFF_MAX_MS = 30_000
/** A child that survived this long counts as healthy — the backoff resets. */
const HEALTHY_RUN_MS = 60_000

/** `[char]9` (tab) avoids backtick-escape headaches inside the -Command string. */
function buildScript(parentPid: number): string {
  return `
Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public struct _RtsRect { public int Left; public int Top; public int Right; public int Bottom; }
public class _RtsFg {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out _RtsRect rect);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)]
  public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)]
  public static extern int GetClassName(IntPtr hWnd, StringBuilder lpClassName, int nMaxCount);
  public static string Title(IntPtr h) {
    var sb = new StringBuilder(512);
    GetWindowText(h, sb, sb.Capacity);
    return sb.ToString();
  }
  public static string WinClass(IntPtr h) {
    var sb = new StringBuilder(256);
    GetClassName(h, sb, sb.Capacity);
    return sb.ToString();
  }
}
"@
function Sanitize([string]$s) {
  if ($null -eq $s) { return '' }
  return (($s -replace [char]9, ' ') -replace [char]13, '' -replace [char]10, ' ')
}
$parent = ${parentPid}
$last = '__init__'
$i = 0
while ($true) {
  $i += 1
  if ($i % ${PARENT_CHECK_EVERY} -eq 0 -and -not (Get-Process -Id $parent -ErrorAction SilentlyContinue)) { break }
  $h = [_RtsFg]::GetForegroundWindow()
  $procId = 0
  [void][_RtsFg]::GetWindowThreadProcessId($h, [ref]$procId)
  $title = Sanitize ([_RtsFg]::Title($h))
  $cls = Sanitize ([_RtsFg]::WinClass($h))
  $r = New-Object _RtsRect
  $rect = ''
  if ([_RtsFg]::GetWindowRect($h, [ref]$r)) {
    $rect = ($r.Left, $r.Top, ($r.Right - $r.Left), ($r.Bottom - $r.Top)) -join ','
  }
  $line = ([string]$procId) + [char]9 + $title + [char]9 + $cls + [char]9 + $rect
  if ($line -ne $last) { $last = $line; Write-Output $line }
  Start-Sleep -Milliseconds ${POLL_MS}
}
`.trim()
}

function ourProcessName(): string {
  return basename(process.execPath).replace(/\.exe$/i, '')
}

export class ForegroundWatcher {
  private proc: ChildProcessWithoutNullStreams | null = null
  private onChange: ((processName: string, rect: ForegroundRect | null) => void) | null = null
  private onDown: (() => void) | null = null
  /** True between stop() and the next start() — suppresses respawns. */
  private stopped = true
  private backoffMs = BACKOFF_MIN_MS
  private respawnTimer: ReturnType<typeof setTimeout> | null = null

  /** Whether the watcher child is currently alive (callers fail OPEN when not). */
  isRunning(): boolean {
    return this.proc != null
  }

  /**
   * Begin watching; `onChange` fires with the foreground process name + window
   * rect whenever either changes; `onDown` fires when the child dies unexpectedly
   * (so callers can fail open right away — a respawn is scheduled with backoff).
   * Idempotent while already running.
   */
  start(
    onChange: (processName: string, rect: ForegroundRect | null) => void,
    onDown?: () => void,
  ): void {
    if (process.platform !== 'win32') return
    this.onChange = onChange
    this.onDown = onDown ?? null
    this.stopped = false
    if (this.proc || this.respawnTimer) return
    this.backoffMs = BACKOFF_MIN_MS
    this.spawnChild()
  }

  stop(): void {
    this.stopped = true
    this.onChange = null
    this.onDown = null
    if (this.respawnTimer) {
      clearTimeout(this.respawnTimer)
      this.respawnTimer = null
    }
    const proc = this.proc
    this.proc = null
    if (proc) {
      try {
        proc.kill()
      } catch {
        // already gone
      }
    }
  }

  private spawnChild(): void {
    let proc: ChildProcessWithoutNullStreams
    try {
      proc = spawn(
        'powershell.exe',
        [
          '-NoProfile',
          '-NonInteractive',
          '-ExecutionPolicy',
          'Bypass',
          '-Command',
          buildScript(process.pid),
        ],
        { windowsHide: true },
      )
    } catch {
      this.scheduleRespawn()
      return
    }
    this.proc = proc
    const startedAt = Date.now()
    // Drain stderr: an unread pipe fills its buffer and stalls the child.
    proc.stderr.resume()
    let buf = ''
    proc.stdout.on('data', (chunk: Buffer) => {
      buf += chunk.toString()
      let nl: number
      while ((nl = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, nl).replace(/\r$/, '')
        buf = buf.slice(nl + 1)
        this.emit(line)
      }
    })
    const onChildDown = (): void => {
      if (this.proc !== proc) return // stopped, or already replaced
      this.proc = null
      if (this.stopped) return
      if (Date.now() - startedAt >= HEALTHY_RUN_MS) this.backoffMs = BACKOFF_MIN_MS
      this.scheduleRespawn()
      this.onDown?.()
    }
    proc.on('error', onChildDown)
    proc.on('exit', onChildDown)
  }

  private scheduleRespawn(): void {
    if (this.stopped || this.respawnTimer) return
    const delay = this.backoffMs
    this.backoffMs = Math.min(BACKOFF_MAX_MS, this.backoffMs * 2)
    this.respawnTimer = setTimeout(() => {
      this.respawnTimer = null
      if (!this.stopped) this.spawnChild()
    }, delay)
  }

  /** Parses a `pid<TAB>title<TAB>class<TAB>x,y,w,h` line and maps it to a token. */
  private emit(line: string): void {
    if (!this.onChange) return
    const parsed = parseForegroundWatcherLine(line)
    if (!parsed) return
    const name = classifyForegroundWindow({
      pid: parsed.pid,
      title: parsed.title,
      className: parsed.className,
      ourPid: process.pid,
      ourProcessName: ourProcessName(),
    })
    this.onChange(name, parsed.rect)
  }
}
