/**
 * Identify the Age of Empires IV window from user32 title/class only.
 * Never OpenProcess / Get-Process the game — Easy Anti-Cheat treats an
 * unexpected handle on RelicCardinal as hostile and can terminate the match.
 */

const AOE4_TITLE = /age\s*of\s*empires\s*(iv|iiii|4)\b/i
const AOE4_CLASS = /reliccardinal|aoe4/i

export interface ForegroundWindowRect {
  x: number
  y: number
  width: number
  height: number
}

export function looksLikeAoe4Window(title: string, className: string): boolean {
  return AOE4_TITLE.test(title) || AOE4_CLASS.test(className)
}

/**
 * Parse a watcher line: `pid<TAB>title<TAB>class<TAB>x,y,w,h`.
 * Title/class must not contain tabs (the PowerShell side strips them).
 */
export function parseForegroundWatcherLine(line: string): {
  pid: number
  title: string
  className: string
  rect: ForegroundWindowRect | null
} | null {
  const tab = line.indexOf('\t')
  if (tab < 0) return null
  const parts = line.split('\t')
  if (parts.length < 4) return null
  const pid = Number(parts[0])
  if (!Number.isFinite(pid)) return null
  const nums = (parts[3] ?? '')
    .trim()
    .split(',')
    .map(Number)
  const rect: ForegroundWindowRect | null =
    nums.length === 4 && nums.every((n) => Number.isFinite(n))
      ? { x: nums[0]!, y: nums[1]!, width: nums[2]!, height: nums[3]! }
      : null
  return {
    pid,
    title: parts[1] ?? '',
    className: parts[2] ?? '',
    rect,
  }
}

/**
 * Map a foreground HWND's pid/title/class to the token overlay gating expects
 * (`RelicCardinal`, our exe stem, empty = unreadable, or `other`).
 */
export function classifyForegroundWindow(input: {
  pid: number
  title: string
  className: string
  ourPid: number
  ourProcessName: string
}): string {
  if (input.pid > 0 && input.pid === input.ourPid) return input.ourProcessName
  if (looksLikeAoe4Window(input.title, input.className)) {
    return /_ws/i.test(input.className) ? 'RelicCardinal_ws' : 'RelicCardinal'
  }
  if (input.title.trim() || input.className.trim()) return 'other'
  return ''
}
