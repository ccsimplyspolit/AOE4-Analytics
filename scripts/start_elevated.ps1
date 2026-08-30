[CmdletBinding()]
param(
  [ValidateSet('dev', 'preview')]
  [string]$Mode = 'dev'
)

$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path

function Test-IsAdministrator {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = [Security.Principal.WindowsPrincipal]::new($identity)
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not (Test-IsAdministrator)) {
  # Elevate the outer launcher, not only electron.exe. This keeps the Vite dev
  # server and every Electron child at the same integrity level as an elevated
  # AoE4 process, so Windows does not block global hotkeys or the overlay.
  # Packaged builds additionally self-elevate from electron/main.ts.
  $quotedScript = '"' + $PSCommandPath + '"'
  $arguments = @(
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-File', $quotedScript,
    '-Mode', $Mode
  )

  try {
    Start-Process `
      -FilePath 'powershell.exe' `
      -ArgumentList $arguments `
      -WorkingDirectory $repoRoot `
      -Verb RunAs | Out-Null
  } catch {
    Write-Error 'RTSLytics needs administrator access for in-game overlay hotkeys. The UAC request was cancelled or could not be opened.'
    exit 1
  }

  exit 0
}

Set-Location $repoRoot
$electronVite = Join-Path $repoRoot 'node_modules\.bin\electron-vite.cmd'
if (-not (Test-Path $electronVite)) {
  throw 'Dependencies are missing. Run npm install first.'
}

$Host.UI.RawUI.WindowTitle = 'RTSLytics (Administrator)'
Write-Host "Launching RTSLytics $Mode mode as administrator..." -ForegroundColor Cyan
& $electronVite $Mode
exit $LASTEXITCODE
