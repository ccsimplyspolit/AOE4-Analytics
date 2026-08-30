import { describe, expect, it } from 'vitest'
import {
  alreadyAttemptedElevation,
  buildElevatedRelaunchScript,
  buildUacStartCommand,
  ELEVATED_RELAUNCH_ENV,
  ELEVATED_RELAUNCH_FLAG,
  ensureWindowsElevation,
  extraArgsForRelaunch,
  planWindowsElevation,
  powershellEnvAssignments,
  quotePowerShellLiteral,
  shouldSkipWindowsElevation,
} from './elevation'

describe('Windows elevation helpers', () => {
  it('quotes PowerShell literals, including apostrophes', () => {
    expect(quotePowerShellLiteral(`C:\\Users\\O'Brien\\RTSLytics.exe`)).toBe(
      `'C:\\Users\\O''Brien\\RTSLytics.exe'`,
    )
  })

  it('drops argv[0] and a previous relaunch flag', () => {
    expect(
      extraArgsForRelaunch([
        'C:\\RTSLytics.exe',
        'out\\main\\index.js',
        ELEVATED_RELAUNCH_FLAG,
        '--inspect',
      ]),
    ).toEqual(['out\\main\\index.js', '--inspect'])
  })

  it('skips UAC for smoke, verify, explicit override, and CI', () => {
    expect(shouldSkipWindowsElevation({ RTSLYTICS_SMOKE: '1' })).toBe(true)
    expect(shouldSkipWindowsElevation({ RTSLYTICS_VERIFY: '42' })).toBe(true)
    expect(shouldSkipWindowsElevation({ RTSLYTICS_ALLOW_UNELEVATED: '1' })).toBe(true)
    expect(shouldSkipWindowsElevation({ CI: 'true' })).toBe(true)
    expect(shouldSkipWindowsElevation({ CI: '1' })).toBe(true)
    expect(shouldSkipWindowsElevation({})).toBe(false)
  })

  it('detects a completed UAC relaunch attempt', () => {
    expect(alreadyAttemptedElevation({ [ELEVATED_RELAUNCH_ENV]: '1' }, ['exe'])).toBe(true)
    expect(alreadyAttemptedElevation({}, ['exe', ELEVATED_RELAUNCH_FLAG])).toBe(true)
    expect(alreadyAttemptedElevation({}, ['exe'])).toBe(false)
  })

  it('plans continue / relaunch / abort without looping', () => {
    expect(
      planWindowsElevation({ platform: 'linux', env: {}, argv: ['exe'], isAdmin: false }),
    ).toEqual({ action: 'continue' })
    expect(
      planWindowsElevation({
        platform: 'win32',
        env: { RTSLYTICS_SMOKE: '1' },
        argv: ['exe'],
        isAdmin: false,
      }),
    ).toEqual({ action: 'continue' })
    expect(
      planWindowsElevation({ platform: 'win32', env: {}, argv: ['exe'], isAdmin: true }),
    ).toEqual({ action: 'continue' })
    expect(
      planWindowsElevation({ platform: 'win32', env: {}, argv: ['exe'], isAdmin: false }),
    ).toEqual({ action: 'relaunch' })
    expect(
      planWindowsElevation({
        platform: 'win32',
        env: {},
        argv: ['exe', ELEVATED_RELAUNCH_FLAG],
        isAdmin: false,
      }),
    ).toEqual({ action: 'abort', reason: 'still not elevated after UAC relaunch' })
  })

  it('forwards the Vite renderer URL into the elevated process', () => {
    expect(
      powershellEnvAssignments({ ELECTRON_RENDERER_URL: 'http://localhost:5173/' }),
    ).toEqual([
      `$env:${ELEVATED_RELAUNCH_ENV} = '1'`,
      `$env:ELECTRON_RENDERER_URL = 'http://localhost:5173/'`,
    ])
  })

  it('builds a relaunch script that starts the same executable elevated', () => {
    const script = buildElevatedRelaunchScript({
      execPath: `C:\\Users\\O'Brien\\RTSLytics.exe`,
      extraArgs: ['--hidden'],
      cwd: 'K:\\aoe4_dlc\\AOE4-Analytics',
      env: { ELECTRON_RENDERER_URL: 'http://127.0.0.1:5173/' },
    })

    expect(script).toContain(`-FilePath 'C:\\Users\\O''Brien\\RTSLytics.exe'`)
    expect(script).toContain(`-WorkingDirectory 'K:\\aoe4_dlc\\AOE4-Analytics'`)
    expect(script).toContain(`-ArgumentList '--hidden','${ELEVATED_RELAUNCH_FLAG}'`)
    expect(script).toContain(`$env:${ELEVATED_RELAUNCH_ENV} = '1'`)
    expect(script).toContain(`$env:ELECTRON_RENDERER_URL = 'http://127.0.0.1:5173/'`)
    expect(script).not.toContain('-Verb RunAs')
  })

  it('builds a hidden UAC Start-Process for the helper script', () => {
    const command = buildUacStartCommand(
      'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
      'C:\\Temp\\elevate.ps1',
    )
    expect(command).toContain('-Verb RunAs')
    expect(command).toContain('-WindowStyle Hidden')
    expect(command).toContain(`-File','C:\\Temp\\elevate.ps1'`)
  })

  it('relaunches then exits 0 before the app takes a single-instance lock', () => {
    const spawned: Array<{ file: string; args: readonly string[] }> = []
    const scripts: Record<string, string> = {}
    let exitCode: number | undefined

    const shouldContinue = ensureWindowsElevation({
      platform: 'win32',
      env: {},
      argv: ['C:\\RTSLytics.exe'],
      execPath: 'C:\\RTSLytics.exe',
      cwd: 'C:\\app',
      isAdmin: false,
      powershellPath: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
      tmpdir: () => 'C:\\tmp',
      randomId: () => 'abc',
      writeScript: (path, contents) => {
        scripts[path] = contents
      },
      spawn: (file, args) => {
        spawned.push({ file, args })
        return { unref() {} }
      },
      exit: (code) => {
        exitCode = code
      },
    })

    expect(shouldContinue).toBe(false)
    expect(exitCode).toBe(0)
    expect(Object.keys(scripts)).toEqual(['C:\\tmp\\rtslytics-elevate-abc.ps1'])
    expect(scripts['C:\\tmp\\rtslytics-elevate-abc.ps1']).toContain(`-FilePath 'C:\\RTSLytics.exe'`)
    expect(spawned).toHaveLength(1)
    expect(spawned[0]?.file).toContain('powershell.exe')
    expect(spawned[0]?.args.join(' ')).toContain('-Verb RunAs')
  })

  it('aborts instead of looping when UAC already ran', () => {
    let exitCode: number | undefined
    const shouldContinue = ensureWindowsElevation({
      platform: 'win32',
      env: { [ELEVATED_RELAUNCH_ENV]: '1' },
      argv: ['C:\\RTSLytics.exe'],
      execPath: 'C:\\RTSLytics.exe',
      cwd: 'C:\\app',
      isAdmin: false,
      powershellPath: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
      tmpdir: () => 'C:\\tmp',
      randomId: () => 'abc',
      writeScript: () => {
        throw new Error('must not write a script')
      },
      spawn: () => {
        throw new Error('must not spawn')
      },
      exit: (code) => {
        exitCode = code
      },
    })

    expect(shouldContinue).toBe(false)
    expect(exitCode).toBe(1)
  })

  it('continues when already administrator', () => {
    let exitCode: number | undefined
    const shouldContinue = ensureWindowsElevation({
      platform: 'win32',
      env: {},
      argv: ['C:\\RTSLytics.exe'],
      execPath: 'C:\\RTSLytics.exe',
      cwd: 'C:\\app',
      isAdmin: true,
      powershellPath: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
      tmpdir: () => 'C:\\tmp',
      randomId: () => 'abc',
      writeScript: () => {
        throw new Error('must not write a script')
      },
      spawn: () => {
        throw new Error('must not spawn')
      },
      exit: (code) => {
        exitCode = code
      },
    })

    expect(shouldContinue).toBe(true)
    expect(exitCode).toBeUndefined()
  })
})
