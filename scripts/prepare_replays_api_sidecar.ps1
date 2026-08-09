param(
  [switch]$Force
)

$ErrorActionPreference = 'Stop'

# This script intentionally fetches the upstream repository at one reviewed
# commit instead of copying its source into this MIT repository. It produces a
# self-contained Windows sidecar only for a release build; the generated output
# and its checkout are ignored by Git.
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$vendorRoot = Join-Path $repoRoot 'build\third-party\aoe4world-replays-api'
$publishRoot = Join-Path $repoRoot 'build\replays-api'
$revision = 'efc391296451da352c3660daf814403e37e787e8'
$project = Join-Path $vendorRoot 'AoE4WorldReplaysAPI\AoE4WorldReplaysAPI.csproj'
$executable = Join-Path $publishRoot 'AoE4WorldReplaysAPI.exe'

if (-not (Get-Command dotnet -ErrorAction SilentlyContinue)) {
  throw 'The .NET SDK is required to build the aoe4world/replays-api sidecar.'
}

if (-not (Test-Path (Join-Path $vendorRoot '.git'))) {
  New-Item -ItemType Directory -Force -Path (Split-Path $vendorRoot -Parent) | Out-Null
  git clone --filter=blob:none https://github.com/aoe4world/replays-api.git $vendorRoot
}

git -C $vendorRoot fetch --depth=1 origin $revision
git -C $vendorRoot checkout --detach $revision

# The pinned upstream parser references preview-marked AOEMods.Essence APIs but
# declares EnablePreviewFeatures only in the web project. Put the build-only
# opt-in at the checkout root so it also reaches the parser project without
# committing a fork or changing the upstream revision.
@'
<Project>
  <PropertyGroup>
    <EnablePreviewFeatures>true</EnablePreviewFeatures>
  </PropertyGroup>
</Project>
'@ | Set-Content -Encoding utf8 (Join-Path $vendorRoot 'Directory.Build.props')

if ($Force -or -not (Test-Path $executable)) {
  New-Item -ItemType Directory -Force -Path $publishRoot | Out-Null
  dotnet publish $project --configuration Release --runtime win-x64 --self-contained true `
    -p:EnablePreviewFeatures=true -p:NoWarn=CA2252 -p:PublishSingleFile=true `
    -p:IncludeNativeLibrariesForSelfExtract=true --output $publishRoot
}

if (-not (Test-Path $executable)) {
  throw "Sidecar publish did not produce $executable"
}

Write-Host "Prepared replays-api sidecar: $executable"
