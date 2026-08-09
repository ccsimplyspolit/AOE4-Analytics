import { app } from 'electron'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import type { IpcResult } from '@ipc/contract'
import {
  normalizeSourceSyncOptions,
  parseSourceSyncCompleted,
  parseEssenceSyncStatus,
  type SourceSyncOptions,
  type SourceSyncResult,
} from '@domain/sourceSync'
import { err, ok } from './result'

const MAX_OUTPUT = 120_000
let activeRun: Promise<IpcResult<SourceSyncResult>> | null = null

function appendOutput(current: string, chunk: string): string {
  const next = current + chunk
  return next.length <= MAX_OUTPUT ? next : next.slice(next.length - MAX_OUTPUT)
}

function projectRoot(): string | null {
  const candidates = [
    process.env.RTSLYTICS_PROJECT_ROOT,
    app.getAppPath(),
    process.cwd(),
  ].filter((value): value is string => Boolean(value))
  for (const candidate of candidates) {
    const root = resolve(candidate)
    if (existsSync(join(root, 'scripts', 'sync_sources.py'))) return root
  }
  return null
}

function argsFor(options: SourceSyncOptions, scriptPath: string): string[] {
  const args = [scriptPath]
  if (options.dryRun) args.push('--dry-run')
  if (options.essenceAuto) args.push('--essence-auto')
  if (options.essenceDecodeRgd) args.push('--decode-rgd')
  if (options.essenceDecodeNativeIcons) {
    args.push('--decode-native-icons')
    // Keep the in-app action bounded: UIArt.sga also contains large Gaia and
    // background trees which are not part of the icon catalogue.
    for (const pattern of [
      'ui/icons/civ/**/*.rrtex',
      'ui/icons/hud/**/*.rrtex',
      'ui/icons/resources/**/*.rrtex',
    ]) {
      args.push('--essence-sga-include', pattern)
    }
  }
  if (options.essenceOnly) {
    args.push(
      '--skip-game-data',
      '--skip-meta',
      '--skip-guides',
      '--skip-curated',
      '--skip-upstream-audit',
    )
    // RGD-only research must not rebuild the renderer bundle. Native icon
    // decoding is different: sync_sources.py needs its icon step to copy the
    // staged PNGs into the offline catalogue.
    if (!options.essenceDecodeNativeIcons) args.push('--skip-icons')
  }
  if (options.skipIcons) args.push('--skip-icons')
  if (options.skipGameData) args.push('--skip-game-data')
  if (options.skipMeta) args.push('--skip-meta')
  if (options.skipGuides) args.push('--skip-guides')
  if (options.patch) args.push('--patch', options.patch)
  return args
}

interface ProcessResult {
  commandAvailable: boolean
  exitCode: number | null
  output: string
}

function runPython(
  command: string,
  args: string[],
  cwd: string,
): Promise<ProcessResult> {
  return new Promise((resolveResult) => {
    let output = ''
    let settled = false
    const child = spawn(command, args, {
      cwd,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    const finish = (result: ProcessResult) => {
      if (settled) return
      settled = true
      resolveResult(result)
    }
    child.stdout.on('data', (chunk: Buffer | string) => {
      output = appendOutput(output, String(chunk))
    })
    child.stderr.on('data', (chunk: Buffer | string) => {
      output = appendOutput(output, String(chunk))
    })
    child.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') finish({ commandAvailable: false, exitCode: null, output })
      else finish({ commandAvailable: true, exitCode: null, output: appendOutput(output, error.message) })
    })
    child.on('close', (code) => finish({ commandAvailable: true, exitCode: code, output }))
  })
}

async function executeSync(
  options: SourceSyncOptions,
  root: string,
): Promise<IpcResult<SourceSyncResult>> {
  const scriptPath = join(root, 'scripts', 'sync_sources.py')
  const args = argsFor(options, scriptPath)
  const started = Date.now()
  let processResult: ProcessResult | null = null
  for (const command of process.platform === 'win32' ? ['python', 'py'] : ['python3', 'python']) {
    const result = await runPython(command, args, root)
    processResult = result
    if (result.commandAvailable) break
  }
  if (!processResult?.commandAvailable) {
    return err(
      'not_found',
      'Python was not found. Install Python or set RTSLYTICS_PROJECT_ROOT to a development checkout.',
    )
  }
  if (processResult.exitCode !== 0) {
    const suffix = processResult.output.trim().slice(-2_000)
    return err(
      'unknown',
      `Source synchronizer exited with code ${processResult.exitCode ?? 'unknown'}.${suffix ? ` ${suffix}` : ''}`,
    )
  }
  return ok({
    completed: parseSourceSyncCompleted(processResult.output),
    capturedAt: new Date().toISOString(),
    durationMs: Date.now() - started,
    dryRun: options.dryRun,
    restartRequired: !options.dryRun,
    output: processResult.output,
    essence: parseEssenceSyncStatus(processResult.output),
  })
}

/**
 * Runs only the checked-in source orchestrator. No arbitrary command or path
 * comes from the renderer; the only renderer-controlled values are bounded
 * boolean flags and a validated patch label.
 */
export function syncExternalSources(input: unknown): Promise<IpcResult<SourceSyncResult>> {
  if (activeRun) return Promise.resolve(err('validation', 'A source refresh is already running.'))
  const normalized = normalizeSourceSyncOptions(input)
  if (!normalized.ok) return Promise.resolve(err('validation', normalized.message))
  const root = projectRoot()
  if (!root) {
    return Promise.resolve(
      err(
        'not_found',
        'The source synchronizer is available only from a development checkout containing scripts/sync_sources.py.',
      ),
    )
  }
  activeRun = executeSync(normalized.data, root)
    .catch((error) =>
      err('unknown', error instanceof Error ? error.message : 'Source synchronizer failed unexpectedly.'),
    )
    .finally(() => {
      activeRun = null
    })
  return activeRun
}
