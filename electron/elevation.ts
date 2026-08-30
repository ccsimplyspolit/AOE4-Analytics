import { spawn, execFileSync, type SpawnOptions } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/** Marks a process that already went through the UAC relaunch so we never loop. */
export const ELEVATED_RELAUNCH_FLAG = '--rtslytics-elevated'
export const ELEVATED_RELAUNCH_ENV = 'RTSLYTICS_ELEVATED_RELAUNCH'

const FORWARDED_ENV_KEYS = [
  'ELECTRON_RENDERER_URL',
  'NODE_ENV',
  'PORTABLE_EXECUTABLE_FILE',
] as const

export type ElevationPlan =
  | { action: 'continue' }
  | { action: 'relaunch' }
  | { action: 'abort'; reason: string }

export type SpawnHandle = { unref(): void }

export type ElevationDeps = {
  platform: NodeJS.Platform
  env: NodeJS.ProcessEnv
  argv: readonly string[]
  execPath: string
  cwd: string
  isAdmin: boolean
  powershellPath: string
  tmpdir: () => string
  randomId: () => string
  writeScript: (path: string, contents: string) => void
  spawn: (file: string, args: readonly string[], options: SpawnOptions) => SpawnHandle
  exit: (code: number) => void
}

export function shouldSkipWindowsElevation(env: NodeJS.ProcessEnv): boolean {
  return (
    env['RTSLYTICS_SMOKE'] === '1' ||
    Boolean(env['RTSLYTICS_VERIFY']) ||
    env['RTSLYTICS_ALLOW_UNELEVATED'] === '1' ||
    env['CI'] === 'true' ||
    env['CI'] === '1'
  )
}

export function quotePowerShellLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`
}

export function extraArgsForRelaunch(argv: readonly string[]): string[] {
  return argv.slice(1).filter((arg) => arg !== ELEVATED_RELAUNCH_FLAG)
}

export function alreadyAttemptedElevation(env: NodeJS.ProcessEnv, argv: readonly string[]): boolean {
  return env[ELEVATED_RELAUNCH_ENV] === '1' || argv.includes(ELEVATED_RELAUNCH_FLAG)
}

export function planWindowsElevation(input: {
  platform: NodeJS.Platform
  env: NodeJS.ProcessEnv
  argv: readonly string[]
  isAdmin: boolean
}): ElevationPlan {
  if (input.platform !== 'win32') return { action: 'continue' }
  if (shouldSkipWindowsElevation(input.env)) return { action: 'continue' }
  if (input.isAdmin) return { action: 'continue' }
  if (alreadyAttemptedElevation(input.env, input.argv)) {
    return { action: 'abort', reason: 'still not elevated after UAC relaunch' }
  }
  return { action: 'relaunch' }
}

export function powershellEnvAssignments(env: NodeJS.ProcessEnv): string[] {
  const lines = [`$env:${ELEVATED_RELAUNCH_ENV} = '1'`]
  for (const key of FORWARDED_ENV_KEYS) {
    const value = env[key]
    if (value) lines.push(`$env:${key} = ${quotePowerShellLiteral(value)}`)
  }
  return lines
}

export function buildElevatedRelaunchScript(input: {
  execPath: string
  extraArgs: readonly string[]
  cwd: string
  env: NodeJS.ProcessEnv
}): string {
  const argumentList = [...input.extraArgs, ELEVATED_RELAUNCH_FLAG]
    .map(quotePowerShellLiteral)
    .join(',')
  return [
    '$ErrorActionPreference = \'Stop\'',
    ...powershellEnvAssignments(input.env),
    `Start-Process -FilePath ${quotePowerShellLiteral(input.execPath)} -WorkingDirectory ${quotePowerShellLiteral(input.cwd)} -ArgumentList ${argumentList}`,
    'Remove-Item -LiteralPath $PSCommandPath -Force -ErrorAction SilentlyContinue',
  ].join('\r\n')
}

export function buildUacStartCommand(powershellPath: string, scriptPath: string): string {
  const argumentList = ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath]
    .map(quotePowerShellLiteral)
    .join(',')
  const start = [
    'Start-Process',
    `-FilePath ${quotePowerShellLiteral(powershellPath)}`,
    '-Verb RunAs',
    '-WindowStyle Hidden',
    `-ArgumentList ${argumentList}`,
  ].join(' ')
  return `try { ${start} } catch { Remove-Item -LiteralPath ${quotePowerShellLiteral(scriptPath)} -Force -ErrorAction SilentlyContinue }`
}

export function resolvePowerShellPath(env: NodeJS.ProcessEnv = process.env): string {
  const root = env['SystemRoot'] || env['windir'] || 'C:\\Windows'
  return join(root, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe')
}

export function isWindowsAdministrator(
  exec: typeof execFileSync = execFileSync,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (process.platform !== 'win32') return true
  const net = join(env['SystemRoot'] || env['windir'] || 'C:\\Windows', 'System32', 'net.exe')
  try {
    exec(net, ['session'], { stdio: 'ignore', windowsHide: true, timeout: 5_000 })
    return true
  } catch {
    return false
  }
}

function resolveDeps(
  exitOrDeps: ((code: number) => void) | (Partial<ElevationDeps> & { exit: (code: number) => void }),
): ElevationDeps {
  const overrides: Partial<ElevationDeps> & { exit: (code: number) => void } =
    typeof exitOrDeps === 'function' ? { exit: exitOrDeps } : exitOrDeps
  const platform = overrides.platform ?? process.platform
  const env = overrides.env ?? process.env
  return {
    platform,
    env,
    argv: overrides.argv ?? process.argv,
    execPath: overrides.execPath ?? process.execPath,
    cwd: overrides.cwd ?? process.cwd(),
    isAdmin: overrides.isAdmin ?? (platform !== 'win32' || isWindowsAdministrator()),
    powershellPath: overrides.powershellPath ?? resolvePowerShellPath(env),
    tmpdir: overrides.tmpdir ?? tmpdir,
    randomId: overrides.randomId ?? (() => `${process.pid}-${randomBytes(8).toString('hex')}`),
    writeScript: overrides.writeScript ?? ((path, contents) => writeFileSync(path, contents, 'utf8')),
    spawn: overrides.spawn ?? ((file, args, options) => spawn(file, [...args], options)),
    exit: overrides.exit,
  }
}

/**
 * On Windows, relaunch via UAC if this process is not already administrator.
 * Must run before `app.requestSingleInstanceLock()`, otherwise the elevated
 * copy is treated as a second instance and exits.
 *
 * Returns `true` when this process should continue starting the app.
 */
export function ensureWindowsElevation(
  exitOrDeps: ((code: number) => void) | (Partial<ElevationDeps> & { exit: (code: number) => void }),
): boolean {
  const deps = resolveDeps(exitOrDeps)

  const plan = planWindowsElevation({
    platform: deps.platform,
    env: deps.env,
    argv: deps.argv,
    isAdmin: deps.isAdmin,
  })

  if (plan.action === 'continue') return true

  if (plan.action === 'abort') {
    console.error(`[rtslytics] ${plan.reason}`)
    deps.exit(1)
    return false
  }

  const scriptPath = join(deps.tmpdir(), `rtslytics-elevate-${deps.randomId()}.ps1`)
  try {
    deps.writeScript(
      scriptPath,
      buildElevatedRelaunchScript({
        execPath: deps.execPath,
        extraArgs: extraArgsForRelaunch(deps.argv),
        cwd: deps.cwd,
        env: deps.env,
      }),
    )
    deps
      .spawn(
        deps.powershellPath,
        ['-NoProfile', '-WindowStyle', 'Hidden', '-ExecutionPolicy', 'Bypass', '-Command', buildUacStartCommand(deps.powershellPath, scriptPath)],
        { detached: true, stdio: 'ignore', windowsHide: true },
      )
      .unref()
  } catch (error) {
    console.error('[rtslytics] failed to request administrator rights:', error)
    deps.exit(1)
    return false
  }

  deps.exit(0)
  return false
}
