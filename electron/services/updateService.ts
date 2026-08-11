import { app } from 'electron'
import electronUpdater from 'electron-updater'
import { createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import { stat, writeFile } from 'node:fs/promises'
import { writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join } from 'node:path'

const CHECK_DELAY_MS = 12_000
const GITHUB_RELEASE_API = 'https://api.github.com/repos/ccsimplyspolit/AOE4-Analytics/releases/latest'
const MAX_PORTABLE_UPDATE_BYTES = 750 * 1024 * 1024
const MIN_PORTABLE_UPDATE_BYTES = 5 * 1024 * 1024
const MAX_FETCH_ATTEMPTS = 3

let started = false
let portableUpdate:
  | {
      sourcePath: string
      targetPath: string
      version: string
    }
  | null = null
let portableInstallScheduled = false

type GitHubReleaseAsset = {
  name?: unknown
  browser_download_url?: unknown
  size?: unknown
}

type GitHubRelease = {
  tag_name?: unknown
  prerelease?: unknown
  draft?: unknown
  assets?: unknown
}

type ReleaseManifest = {
  version?: unknown
  sha256?: unknown
}

function isPortableBuild(): boolean {
  return Boolean(process.env['PORTABLE_EXECUTABLE_FILE'])
}

function compareVersions(left: string, right: string): number {
  const parse = (version: string): number[] =>
    version
      .replace(/^v/i, '')
      .split(/[.+-]/, 3)
      .map((part) => Number.parseInt(part, 10) || 0)

  const a = parse(left)
  const b = parse(right)
  for (let index = 0; index < 3; index += 1) {
    if ((a[index] ?? 0) !== (b[index] ?? 0)) return (a[index] ?? 0) > (b[index] ?? 0) ? 1 : -1
  }
  return 0
}

async function fetchResponse(url: string): Promise<Response> {
  let lastError: unknown = null
  for (let attempt = 1; attempt <= MAX_FETCH_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          accept: 'application/vnd.github+json',
          'user-agent': 'RTSLytics-updater',
        },
      })
      if (response.ok) return response
      if (response.status !== 429 && response.status < 500) {
        throw new Error(`HTTP ${response.status} for ${url}`)
      }
      lastError = new Error(`HTTP ${response.status} for ${url}`)
    } catch (error) {
      if (error instanceof Error && /^HTTP (?!429|5\d\d)/.test(error.message)) throw error
      lastError = error
    }
    if (attempt < MAX_FETCH_ATTEMPTS) {
      await new Promise((resolve) => setTimeout(resolve, 1_000 * attempt))
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`request failed for ${url}`)
}

function releaseAssets(release: GitHubRelease): GitHubReleaseAsset[] {
  if (!Array.isArray(release.assets)) return []
  return release.assets.filter((asset): asset is GitHubReleaseAsset => Boolean(asset && typeof asset === 'object'))
}

function assetName(asset: GitHubReleaseAsset): string {
  return typeof asset.name === 'string' ? asset.name : ''
}

function assetUrl(asset: GitHubReleaseAsset): string {
  return typeof asset.browser_download_url === 'string' ? asset.browser_download_url : ''
}

async function downloadBuffer(url: string, expectedSize?: number): Promise<Buffer> {
  const response = await fetchResponse(url)
  const contentLength = Number(response.headers.get('content-length') ?? 0)
  if (contentLength > MAX_PORTABLE_UPDATE_BYTES) {
    throw new Error(`portable update is too large (${contentLength} bytes)`)
  }
  if (expectedSize && expectedSize > MAX_PORTABLE_UPDATE_BYTES) {
    throw new Error(`portable update metadata is too large (${expectedSize} bytes)`)
  }
  const data = Buffer.from(await response.arrayBuffer())
  if (data.length > MAX_PORTABLE_UPDATE_BYTES) throw new Error('portable update exceeded size limit')
  return data
}

function parseSha256(value: string): string | null {
  const match = value.match(/\b[a-f0-9]{64}\b/i)
  return match?.[0]?.toLowerCase() ?? null
}

async function expectedPortableHash(
  assets: GitHubReleaseAsset[],
  portableAsset: GitHubReleaseAsset,
): Promise<string | null> {
  const manifestAsset = assets.find((asset) => assetName(asset).toLowerCase().endsWith('-manifest.json'))
  if (manifestAsset && assetUrl(manifestAsset)) {
    try {
      const manifest = JSON.parse(
        (await downloadBuffer(assetUrl(manifestAsset), Number(manifestAsset.size) || undefined)).toString('utf8'),
      ) as ReleaseManifest
      if (typeof manifest.sha256 === 'string') {
        const hash = parseSha256(manifest.sha256)
        if (hash) return hash
      }
    } catch (error) {
      console.warn('[update] portable manifest could not be read:', error)
    }
  }

  const checksumAsset = assets.find(
    (asset) => assetName(asset).toLowerCase() === `${assetName(portableAsset).toLowerCase()}.sha256`,
  )
  if (!checksumAsset || !assetUrl(checksumAsset)) return null
  try {
    return parseSha256(
      (await downloadBuffer(assetUrl(checksumAsset), Number(checksumAsset.size) || undefined)).toString('utf8'),
    )
  } catch (error) {
    console.warn('[update] portable checksum could not be read:', error)
    return null
  }
}

async function fetchLatestPortableUpdate(): Promise<{
  data: Buffer
  version: string
  hash: string | null
  targetPath: string
} | null> {
  const release = (await (await fetchResponse(GITHUB_RELEASE_API)).json()) as GitHubRelease
  if (release.draft === true || release.prerelease === true) return null

  const assets = releaseAssets(release)
  const portableAsset = assets.find((asset) => /-portable\.exe$/i.test(assetName(asset)))
  const downloadUrl = portableAsset ? assetUrl(portableAsset) : ''
  if (!portableAsset || !downloadUrl) throw new Error('stable release has no portable executable')

  const manifestAsset = assets.find((asset) => assetName(asset).toLowerCase().endsWith('-manifest.json'))
  let version = typeof release.tag_name === 'string' ? release.tag_name.replace(/^v/i, '') : ''
  if (manifestAsset && assetUrl(manifestAsset)) {
    try {
      const manifest = JSON.parse(
        (await downloadBuffer(assetUrl(manifestAsset), Number(manifestAsset.size) || undefined)).toString('utf8'),
      ) as ReleaseManifest
      if (typeof manifest.version === 'string' && manifest.version.trim()) version = manifest.version.trim()
    } catch (error) {
      console.warn('[update] portable manifest version could not be read:', error)
    }
  }
  if (!version) throw new Error('stable release has no parseable version')
  if (compareVersions(version, app.getVersion()) <= 0) return null

  const data = await downloadBuffer(downloadUrl, Number(portableAsset.size) || undefined)
  if (data.length < MIN_PORTABLE_UPDATE_BYTES || data[0] !== 0x4d || data[1] !== 0x5a) {
    throw new Error('downloaded portable update is not a valid Windows executable')
  }

  return {
    data,
    version,
    hash: await expectedPortableHash(assets, portableAsset),
    targetPath: process.env['PORTABLE_EXECUTABLE_FILE'] ?? '',
  }
}

function portableInstallScript(): string {
  return String.raw`
param(
  [int]$ParentPid,
  [string]$Source,
  [string]$Target,
  [string]$Script
)

$deadline = [DateTime]::UtcNow.AddMinutes(3)
while (Get-Process -Id $ParentPid -ErrorAction SilentlyContinue) {
  if ([DateTime]::UtcNow -gt $deadline) { exit 10 }
  Start-Sleep -Milliseconds 500
}

$backup = "$Target.rtslytics-old"
$installed = $false
for ($attempt = 0; $attempt -lt 60 -and -not $installed; $attempt++) {
  try {
    if (Test-Path -LiteralPath $backup) { Remove-Item -LiteralPath $backup -Force -ErrorAction Stop }
    Move-Item -LiteralPath $Target -Destination $backup -Force -ErrorAction Stop
    Move-Item -LiteralPath $Source -Destination $Target -Force -ErrorAction Stop
    Remove-Item -LiteralPath $backup -Force -ErrorAction SilentlyContinue
    $installed = $true
  } catch {
    if (-not (Test-Path -LiteralPath $Target) -and (Test-Path -LiteralPath $backup)) {
      Move-Item -LiteralPath $backup -Destination $Target -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Milliseconds 500
  }
}

if ($installed) {
  Start-Process -FilePath $Target
} else {
  # Keep the downloaded file for a later retry if another process kept the exe locked.
  exit 11
}

Remove-Item -LiteralPath $Script -Force -ErrorAction SilentlyContinue
`
}

function schedulePortableInstall(): void {
  if (!portableUpdate || portableInstallScheduled) return
  portableInstallScheduled = true
  const scriptPath = join(tmpdir(), `rtslytics-portable-updater-${process.pid}-${Date.now()}.ps1`)
  const { sourcePath, targetPath } = portableUpdate
  try {
    // before-quit does not await promises; write the short helper synchronously
    // so Electron cannot exit before PowerShell has a script to run.
    writeFileSync(scriptPath, portableInstallScript(), 'utf8')
    const child = spawn(
      'powershell.exe',
      [
        '-NoLogo',
        '-NoProfile',
        '-NonInteractive',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        scriptPath,
        '-ParentPid',
        String(process.pid),
        '-Source',
        sourcePath,
        '-Target',
        targetPath,
        '-Script',
        scriptPath,
      ],
      { detached: true, stdio: 'ignore', windowsHide: true },
    )
    child.unref()
    console.log(`[update] portable ${portableUpdate.version} will install after exit`)
  } catch (error) {
    portableInstallScheduled = false
    console.warn('[update] portable installer could not start:', error)
  }
}

function startPortableAutoUpdate(): void {
  app.once('before-quit', schedulePortableInstall)
  const timer = setTimeout(() => {
    void (async () => {
      try {
        const update = await fetchLatestPortableUpdate()
        if (!update) {
          console.log(`[update] already current (${app.getVersion()})`)
          return
        }

        const actualHash = createHash('sha256').update(update.data).digest('hex')
        if (update.hash && actualHash !== update.hash) {
          throw new Error(`portable checksum mismatch (expected ${update.hash}, got ${actualHash})`)
        }
        if (!update.hash) console.warn('[update] portable release has no checksum; HTTPS + PE validation used')

        const targetPath = update.targetPath
        if (!targetPath) throw new Error('portable executable path is unavailable')
        const sourcePath = join(dirname(targetPath), `.${basename(targetPath)}.${update.version}.download`)
        await writeFile(sourcePath, update.data)
        const sourceStat = await stat(sourcePath)
        if (sourceStat.size !== update.data.length) throw new Error('portable update write was incomplete')
        portableUpdate = { sourcePath, targetPath, version: update.version }
        console.log(`[update] portable ${update.version} downloaded; installing when RTSLytics closes`)
      } catch (error) {
        console.warn('[update] portable check/download failed:', error)
      }
    })()
  }, CHECK_DELAY_MS)
  timer.unref?.()
}

/**
 * Check the public GitHub release channel after the app is ready.
 *
 * Windows auto-install is deliberately deferred until the user closes the app:
 * interrupting a live AoE4 match to install a downloaded update would be far
 * worse than starting the fresh version on the next launch. NSIS delegates
 * verification/install to `electron-updater`; portable uses the same release
 * assets with a small detached swapper because portable wrappers cannot update
 * themselves while they are running.
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

  started = true
  if (isPortableBuild()) {
    startPortableAutoUpdate()
    return
  }

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
