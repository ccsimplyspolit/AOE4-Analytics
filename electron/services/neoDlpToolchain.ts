/**
 * Discovers the local NeoDLP install (yt-dlp + ffmpeg + PO-token server)
 * so YouTube captions/downloads can use the same toolchain as the GUI app.
 */
import { spawn, type ChildProcess } from 'node:child_process'
import { existsSync } from 'node:fs'
import { delimiter, join } from 'node:path'

export const NEODLP_POT_URL = 'http://127.0.0.1:4416'
const POT_PING = `${NEODLP_POT_URL}/ping`

export interface NeoDlpToolchain {
  home: string
  ytdlp: string
  ffmpeg: string
  ffprobe: string
  pot: string
  pluginDir: string
  aria2c: string | null
}

let cached: NeoDlpToolchain | null | undefined
let potChild: ChildProcess | null = null
let potEnsured: Promise<boolean> | null = null

export function neoDlpCandidateHomes(env: NodeJS.ProcessEnv = process.env): string[] {
  const homes = [
    env.NEODLP_HOME,
    env.LOCALAPPDATA ? join(env.LOCALAPPDATA, 'NeoDLP') : null,
    env.USERPROFILE ? join(env.USERPROFILE, 'AppData', 'Local', 'NeoDLP') : null,
  ]
  return [...new Set(homes.filter((home): home is string => Boolean(home && home.trim())))]
}

export function resolveNeoDlpToolchain(env: NodeJS.ProcessEnv = process.env): NeoDlpToolchain | null {
  for (const home of neoDlpCandidateHomes(env)) {
    const ytdlp = join(home, 'yt-dlp.exe')
    const ffmpeg = join(home, 'ffmpeg.exe')
    const ffprobe = join(home, 'ffprobe.exe')
    const pot = join(home, 'neodlp-pot.exe')
    if (!existsSync(ytdlp) || !existsSync(ffmpeg) || !existsSync(pot)) continue
    const pluginDir = join(home, 'yt-dlp-plugins')
    const aria2cPath = join(home, 'aria2c.exe')
    return {
      home,
      ytdlp,
      ffmpeg,
      ffprobe,
      pot,
      pluginDir: existsSync(pluginDir) ? pluginDir : home,
      aria2c: existsSync(aria2cPath) ? aria2cPath : null,
    }
  }
  return null
}

export function getNeoDlpToolchain(): NeoDlpToolchain | null {
  if (cached !== undefined) return cached
  cached = resolveNeoDlpToolchain()
  return cached
}

export function neoDlpYtdlpArgs(toolchain: NeoDlpToolchain): string[] {
  const args = ['--ffmpeg-location', toolchain.home]
  if (toolchain.pluginDir !== toolchain.home) {
    args.push('--plugin-dirs', toolchain.pluginDir)
  }
  return args
}

export function neoDlpSpawnEnv(toolchain: NeoDlpToolchain, env: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  return {
    ...env,
    PATH: `${toolchain.home}${env.PATH ? `${delimiter}${env.PATH}` : ''}`,
  }
}

export async function isNeoDlpPotRunning(timeoutMs = 1500): Promise<boolean> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(POT_PING, { signal: controller.signal })
    return response.ok
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}

export async function ensureNeoDlpPotServer(toolchain = getNeoDlpToolchain()): Promise<boolean> {
  if (!toolchain) return false
  if (await isNeoDlpPotRunning()) return true
  if (!potEnsured) {
    potEnsured = startPotServer(toolchain)
  }
  return potEnsured
}

async function startPotServer(toolchain: NeoDlpToolchain): Promise<boolean> {
  if (await isNeoDlpPotRunning()) return true
  potChild = spawn(toolchain.pot, ['server', '--host', '127.0.0.1', '--port', '4416'], {
    windowsHide: true,
    detached: true,
    stdio: 'ignore',
    cwd: toolchain.home,
  })
  potChild.unref()
  potChild.once('error', () => {
    potChild = null
  })
  const deadline = Date.now() + 8_000
  while (Date.now() < deadline) {
    if (await isNeoDlpPotRunning(800)) return true
    await new Promise((resolve) => setTimeout(resolve, 400))
  }
  return isNeoDlpPotRunning()
}

export function ytdlpCommandQueue(toolchain = getNeoDlpToolchain()): Array<{
  command: string
  prefix: string[]
  extraArgs: string[]
  env?: NodeJS.ProcessEnv
}> {
  const queue: Array<{
    command: string
    prefix: string[]
    extraArgs: string[]
    env?: NodeJS.ProcessEnv
  }> = []
  if (toolchain) {
    queue.push({
      command: toolchain.ytdlp,
      prefix: [],
      extraArgs: neoDlpYtdlpArgs(toolchain),
      env: neoDlpSpawnEnv(toolchain),
    })
  }
  queue.push({
    command: process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp',
    prefix: [],
    extraArgs: [],
  })
  queue.push({
    command: process.platform === 'win32' ? 'python.exe' : 'python3',
    prefix: ['-m', 'yt_dlp'],
    extraArgs: [],
  })
  return queue
}
