import { execFile } from 'node:child_process'
import { shell } from 'electron'

/** AoE4's running processes (Steam and Microsoft Store/Xbox variants). */
export const AOE4_PROCESS_NAMES = ['RelicCardinal', 'RelicCardinal_ws'] as const
const AOE4_PROCESS_FILES = new Set(AOE4_PROCESS_NAMES.map((name) => `${name}.exe`.toLowerCase()))
/** Age of Empires IV: Anniversary Edition — Steam app id 1466860. */
const STEAM_RUN_URL = 'steam://rungameid/1466860'

/** Accepts Windows process names with or without the `.exe` suffix. */
export function isKnownGameProcess(processName: string): boolean {
  const normalized = processName.trim().toLowerCase()
  return AOE4_PROCESS_FILES.has(normalized.endsWith('.exe') ? normalized : `${normalized}.exe`)
}

/**
 * Whether the AoE4 process is currently running. Uses `tasklist` on Windows
 * (a benign process listing — not reading game files or memory, so no consent
 * gate needed). Returns null on non-Windows / when undetectable.
 */
export function isGameRunning(): Promise<boolean | null> {
  if (process.platform !== 'win32') return Promise.resolve(null)
  return new Promise((resolve) => {
    // CSV output is independent of the user's Windows display language and
    // lets us recognize both the Steam executable and the Store/Xbox `_ws`
    // executable without relying on a localized tasklist message.
    execFile(
      'tasklist.exe',
      ['/FO', 'CSV', '/NH'],
      { windowsHide: true, timeout: 4000, maxBuffer: 256 * 1024 },
      (err, stdout) => {
        if (err) return resolve(null)
        const running = String(stdout)
          .split(/\r?\n/)
          .some((line) => isKnownGameProcess(/^"([^"]+)"/.exec(line)?.[1] ?? ''))
        resolve(running)
      },
    )
  })
}

export interface LaunchResult {
  ok: boolean
  message?: string
}

/** Launches Age of Empires IV via the Steam protocol. */
export async function launchGame(): Promise<LaunchResult> {
  try {
    await shell.openExternal(STEAM_RUN_URL)
    return { ok: true }
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) }
  }
}
