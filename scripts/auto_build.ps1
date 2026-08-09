[CmdletBinding()]
param(
  [switch]$Launch,
  [switch]$SkipTests,
  [switch]$KeepStaging,
  [string]$OutputDir = ''
)

$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $repoRoot

function Invoke-Step {
  param(
    [Parameter(Mandatory = $true)][string]$Label,
    [Parameter(Mandatory = $true)][string]$FilePath,
    [Parameter(Mandatory = $true)][string[]]$Arguments
  )

  Write-Host "`n==> $Label" -ForegroundColor Cyan
  & $FilePath @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "$Label failed with exit code $LASTEXITCODE."
  }
}

function Stop-ProjectElectron {
  # A running dev instance holds the native SQLite DLL open. Only terminate
  # Electron processes whose executable/command line belongs to this project.
  # AoE4, Steam, Discord, and unrelated Electron apps are left untouched.
  $projectNeedle = $repoRoot.TrimEnd('\')
  $processes = @(Get-CimInstance Win32_Process)
  $targets = @($processes | Where-Object {
    $_.ProcessId -ne $PID -and
    $_.Name -match '^(electron|RTSLytics)\.exe$' -and
    (($_.CommandLine -and $_.CommandLine.Contains($projectNeedle)) -or
      ($_.ExecutablePath -and $_.ExecutablePath.StartsWith($projectNeedle, [StringComparison]::OrdinalIgnoreCase)))
  })

  # Elevated Electron roots can expose neither CommandLine nor ExecutablePath
  # through the non-elevated WMI query. Walk parent links from every matched
  # project child so the root process is stopped as well and cannot keep the
  # stable release directory locked during publication.
  $byId = @{}
  foreach ($process in $processes) { $byId[[int]$process.ProcessId] = $process }
  $knownIds = @{}
  foreach ($target in $targets) { $knownIds[[int]$target.ProcessId] = $true }
  $parentIds = @($targets | ForEach-Object { [int]$_.ParentProcessId })
  while ($parentIds.Count -gt 0) {
    $nextParents = @()
    foreach ($parentId in $parentIds) {
      if ($parentId -le 0 -or $knownIds.ContainsKey($parentId) -or -not $byId.ContainsKey($parentId)) { continue }
      $parent = $byId[$parentId]
      $knownIds[$parentId] = $true
      if ($parent.Name -match '^(electron|RTSLytics)\.exe$') { $targets += $parent }
      if ($parent.ParentProcessId -gt 0) { $nextParents += [int]$parent.ParentProcessId }
    }
    $parentIds = @($nextParents | Select-Object -Unique)
  }

  foreach ($target in $targets) {
    Write-Host "Stopping project process $($target.Name) (PID $($target.ProcessId))..." -ForegroundColor Yellow
    # The process can exit between the snapshot and taskkill; that is already
    # the desired state, so ignore taskkill's race-condition exit code/output.
    Start-Process -FilePath 'taskkill.exe' -ArgumentList @('/PID', $target.ProcessId, '/T', '/F') -Wait -WindowStyle Hidden | Out-Null
  }

  if ($targets) {
    Start-Sleep -Milliseconds 1500
  }
}

function Stop-ProjectBuildProcesses {
  # Do not let an older terminal build rewrite `out/` while this build is
  # bundling/packaging. Restrict the match to this repository and build
  # commands; ordinary node scripts and unrelated applications are untouched.
  $projectNeedle = $repoRoot.TrimEnd('\')
  $buildPattern = 'electron-builder|electron-vite (dev|build)|npm run (dist|pack|bundle|build|verify)|npx.*electron-builder'
  $targets = Get-CimInstance Win32_Process | Where-Object {
    $_.ProcessId -ne $PID -and
    $_.CommandLine -and
    $_.CommandLine.Contains($projectNeedle) -and
    $_.CommandLine -match $buildPattern -and
    $_.Name -match '^(cmd|node|npm|npx|electron-builder|7za)\.exe$'
  }

  foreach ($target in $targets) {
    Write-Host "Stopping stale project build $($target.Name) (PID $($target.ProcessId))..." -ForegroundColor Yellow
    Start-Process -FilePath 'taskkill.exe' -ArgumentList @('/PID', $target.ProcessId, '/T', '/F') -Wait -WindowStyle Hidden | Out-Null
  }
  if ($targets) { Start-Sleep -Milliseconds 1500 }
}

function Assert-Command {
  param([Parameter(Mandatory = $true)][string]$Name)
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command '$Name' was not found in PATH."
  }
}

Assert-Command 'node'
Assert-Command 'npm'
Assert-Command 'dotnet'

$nodeMajor = [int]((& node -p "process.versions.node.split('.')[0]").Trim())
if ($nodeMajor -lt 22) {
  throw "Node.js 22 or newer is required; detected Node.js $nodeMajor."
}

if (-not (Test-Path (Join-Path $repoRoot 'node_modules\.bin\electron-builder.cmd'))) {
  Invoke-Step 'Install npm dependencies' 'npm.cmd' @('install')
}

Stop-ProjectElectron
Stop-ProjectBuildProcesses

$buildId = Get-Date -Format 'yyyyMMdd-HHmmss'
$staging = Join-Path $repoRoot "release-staging-$buildId"
$stagingDrive = (Split-Path -Qualifier $staging).TrimEnd(':')
$freeBytes = (Get-PSDrive -Name $stagingDrive).Free
if ($freeBytes -lt 2GB) {
  throw "At least 2 GB of free space is required on drive $stagingDrive`:; available $([math]::Round($freeBytes / 1GB, 2)) GB."
}
New-Item -ItemType Directory -Force -Path $staging | Out-Null
$cacheRoot = Join-Path $repoRoot '.electron-cache'
New-Item -ItemType Directory -Force -Path $cacheRoot | Out-Null
$oldElectronCache = $env:ELECTRON_CACHE
$oldBuilderCache = $env:ELECTRON_BUILDER_CACHE
$env:ELECTRON_CACHE = Join-Path $cacheRoot 'electron'
$env:ELECTRON_BUILDER_CACHE = Join-Path $cacheRoot 'builder'

try {
  Invoke-Step 'Prepare replay sidecar' 'npm.cmd' @('run', 'prepare:replays-api')

  if ($SkipTests) {
    Invoke-Step 'Typecheck' 'npm.cmd' @('run', 'typecheck')
  } else {
    Invoke-Step 'Verify (typecheck, lint, tests)' 'npm.cmd' @('run', 'verify')
  }

  Invoke-Step 'Build production bundle' 'npm.cmd' @('run', 'bundle')

  # Local builds have no signing certificate. Disabling auto-discovery avoids a
  # machine-specific signtool/certificate failure; CI can still opt into
  # signing by setting its own electron-builder signing configuration.
  $oldCscDiscovery = $env:CSC_IDENTITY_AUTO_DISCOVERY
  $env:CSC_IDENTITY_AUTO_DISCOVERY = 'false'
  try {
    Invoke-Step 'Package Windows installer + dir + portable release' 'npx.cmd' @(
      'electron-builder',
      '--win',
      '--publish',
      'never',
      "--config.directories.output=$staging",
      '--config.npmRebuild=false',
      '--config.forceCodeSigning=false'
    )
  } finally {
    if ($null -eq $oldCscDiscovery) { Remove-Item Env:CSC_IDENTITY_AUTO_DISCOVERY -ErrorAction SilentlyContinue }
    else { $env:CSC_IDENTITY_AUTO_DISCOVERY = $oldCscDiscovery }
  }

  $unpacked = Join-Path $staging 'win-unpacked'
  $asar = Join-Path $unpacked 'resources\app.asar'
  $exe = Join-Path $unpacked 'RTSLytics.exe'
  $portable = Get-ChildItem $staging -Filter '*-portable.exe' -File | Select-Object -First 1
  $installer = Get-ChildItem $staging -Filter '*-Setup.exe' -File | Select-Object -First 1
  $updateMetadata = Join-Path $staging 'latest.yml'
  $installerBlockMap = if ($installer) { "$($installer.FullName).blockmap" } else { '' }

  if (-not (Test-Path $exe)) {
    throw "Packager did not produce $exe."
  }
  if (-not (Test-Path $asar) -or (Get-Item $asar).Length -lt 1000000) {
    throw 'Packager produced no valid app.asar; refusing to publish an incomplete Electron runtime.'
  }
  if (-not $portable) {
    throw 'Packager did not produce a portable Windows executable.'
  }
  if (-not $installer) {
    throw 'Packager did not produce a Windows Setup executable.'
  }
  if (-not (Test-Path $updateMetadata) -or -not (Test-Path $installerBlockMap)) {
    throw 'Packager did not produce latest.yml and the Setup blockmap required for updates.'
  }

  Write-Host "Packaged app.asar: $([math]::Round((Get-Item $asar).Length / 1MB, 1)) MB" -ForegroundColor Green
  Write-Host "Portable artifact: $($portable.FullName)" -ForegroundColor Green
  Write-Host "Installer artifact: $($installer.FullName)" -ForegroundColor Green

  # Smoke is isolated by the app itself into a temporary userData directory.
  # A Windows executable with requestedExecutionLevel=requireAdministrator
  # cannot be launched headlessly from this non-elevated build process: the
  # UAC consent dialog would wait forever and look like a broken smoke test.
  # The package/asar checks above still run for elevated builds; interactive
  # smoke remains available by launching the unpacked executable manually.
  $requiresElevation = Select-String -Path (Join-Path $repoRoot 'electron-builder.yml') -Pattern '^\s*requestedExecutionLevel:\s*requireAdministrator\s*$'
  if ($requiresElevation) {
    Write-Host 'Skipping packaged smoke test: build requests requireAdministrator (UAC is interactive).' -ForegroundColor Yellow
  } else {
    $oldSmoke = $env:RTSLYTICS_SMOKE
    $env:RTSLYTICS_SMOKE = '1'
    try {
      Write-Host 'Running packaged smoke test...' -ForegroundColor Cyan
      $smoke = Start-Process -FilePath $exe -WorkingDirectory $unpacked -PassThru
      if (-not $smoke.WaitForExit(60000)) {
        Start-Process -FilePath 'taskkill.exe' -ArgumentList @('/PID', $smoke.Id, '/T', '/F') -Wait -WindowStyle Hidden | Out-Null
        throw 'Packaged smoke test did not exit within 60 seconds.'
      }
      if ($smoke.ExitCode -ne 0) {
        throw "Packaged smoke test exited with code $($smoke.ExitCode)."
      }
    } finally {
      if ($null -eq $oldSmoke) { Remove-Item Env:RTSLYTICS_SMOKE -ErrorAction SilentlyContinue }
      else { $env:RTSLYTICS_SMOKE = $oldSmoke }
    }
  }

  $output = if ($OutputDir) { $OutputDir } else { Join-Path $repoRoot 'release' }
  $output = [IO.Path]::GetFullPath($output)
  New-Item -ItemType Directory -Force -Path $output | Out-Null

  # Keep the last good build and publish only after every check succeeds.
  $previousTag = "previous-$buildId"
  $stableUnpacked = Join-Path $output 'win-unpacked'
  if (Test-Path $stableUnpacked) {
    Move-Item -LiteralPath $stableUnpacked -Destination (Join-Path $output "win-unpacked.$previousTag")
  }
  Move-Item -LiteralPath $unpacked -Destination $stableUnpacked

  $stablePortable = Join-Path $output $portable.Name
  if (Test-Path $stablePortable) {
    Move-Item -LiteralPath $stablePortable -Destination (Join-Path $output "$($portable.BaseName).$previousTag.exe")
  }
  Move-Item -LiteralPath $portable.FullName -Destination $stablePortable

  $stableInstaller = Join-Path $output $installer.Name
  if (Test-Path $stableInstaller) {
    Move-Item -LiteralPath $stableInstaller -Destination (Join-Path $output "$($installer.BaseName).$previousTag.exe")
  }
  Move-Item -LiteralPath $installer.FullName -Destination $stableInstaller

  $stableBlockMap = "$stableInstaller.blockmap"
  if (Test-Path $stableBlockMap) {
    Move-Item -LiteralPath $stableBlockMap -Destination (Join-Path $output "$($installer.BaseName).$previousTag.exe.blockmap")
  }
  Move-Item -LiteralPath $installerBlockMap -Destination $stableBlockMap

  $stableMetadata = Join-Path $output 'latest.yml'
  if (Test-Path $stableMetadata) {
    Move-Item -LiteralPath $stableMetadata -Destination (Join-Path $output "latest.$previousTag.yml")
  }
  Move-Item -LiteralPath $updateMetadata -Destination $stableMetadata

  Write-Host "`nRelease published: $stablePortable" -ForegroundColor Green
  Write-Host "Installer published: $stableInstaller" -ForegroundColor Green
  Write-Host "Unpacked launch target: $(Join-Path $stableUnpacked 'RTSLytics.exe')" -ForegroundColor Green

  if ($Launch) {
    Start-Process -FilePath (Join-Path $stableUnpacked 'RTSLytics.exe') -WorkingDirectory $stableUnpacked
  }
} finally {
  if ($null -eq $oldElectronCache) { Remove-Item Env:ELECTRON_CACHE -ErrorAction SilentlyContinue }
  else { $env:ELECTRON_CACHE = $oldElectronCache }
  if ($null -eq $oldBuilderCache) { Remove-Item Env:ELECTRON_BUILDER_CACHE -ErrorAction SilentlyContinue }
  else { $env:ELECTRON_BUILDER_CACHE = $oldBuilderCache }
  if (-not $KeepStaging -and (Test-Path $staging)) {
    Remove-Item -LiteralPath $staging -Recurse -Force -ErrorAction SilentlyContinue
  } elseif (Test-Path $staging) {
    Write-Host "Staging kept at $staging" -ForegroundColor Yellow
  }
}
