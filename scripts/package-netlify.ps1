$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$deliverables = Join-Path $root "deliverables"
$stage = Join-Path $deliverables ".stage"
$archive = Join-Path $deliverables "minglv-netlify.zip"
$database = Join-Path $root "data\legal.sqlite"

if (-not (Test-Path -LiteralPath $database)) {
  throw "data/legal.sqlite is missing. Run `pnpm data:sync` and `pnpm data:build` first."
}

New-Item -ItemType Directory -Force $deliverables | Out-Null

if (Test-Path -LiteralPath $stage) {
  $resolvedStage = (Resolve-Path -LiteralPath $stage).Path
  $resolvedDeliverables = (Resolve-Path -LiteralPath $deliverables).Path
  if (-not $resolvedStage.StartsWith($resolvedDeliverables + "\", [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to clean a staging directory outside deliverables."
  }
  Remove-Item -LiteralPath $resolvedStage -Recurse -Force
}

if (Test-Path -LiteralPath $archive) {
  Remove-Item -LiteralPath $archive -Force
}

New-Item -ItemType Directory -Force $stage | Out-Null

$directories = @("src", "public", "scripts", "tests")
$files = @(
  ".env.example",
  ".gitignore",
  ".nvmrc",
  "README.md",
  "netlify.toml",
  "next-env.d.ts",
  "next.config.ts",
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "tsconfig.json"
)

foreach ($directory in $directories) {
  $source = Join-Path $root $directory
  if (Test-Path -LiteralPath $source) {
    Copy-Item -LiteralPath $source -Destination $stage -Recurse -Force
  }
}

foreach ($file in $files) {
  $source = Join-Path $root $file
  if (Test-Path -LiteralPath $source) {
    Copy-Item -LiteralPath $source -Destination $stage -Force
  }
}

$stageData = Join-Path $stage "data"
New-Item -ItemType Directory -Force $stageData | Out-Null
Copy-Item -LiteralPath $database -Destination (Join-Path $stageData "legal.sqlite") -Force

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zipStream = [System.IO.File]::Open(
  $archive,
  [System.IO.FileMode]::CreateNew,
  [System.IO.FileAccess]::Write,
  [System.IO.FileShare]::None
)
try {
  $zip = New-Object System.IO.Compression.ZipArchive(
    $zipStream,
    [System.IO.Compression.ZipArchiveMode]::Create,
    $false
  )
  try {
    foreach ($file in Get-ChildItem -LiteralPath $stage -Recurse -File) {
      $relativePath = $file.FullName.Substring($stage.Length + 1).Replace("\", "/")
      [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
        $zip,
        $file.FullName,
        $relativePath,
        [System.IO.Compression.CompressionLevel]::Optimal
      ) | Out-Null
    }
  } finally {
    $zip.Dispose()
  }
} finally {
  $zipStream.Dispose()
}

$resolvedStage = (Resolve-Path -LiteralPath $stage).Path
if (-not $resolvedStage.StartsWith((Resolve-Path -LiteralPath $deliverables).Path + "\", [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "Refusing to clean a staging directory outside deliverables."
}
Remove-Item -LiteralPath $resolvedStage -Recurse -Force

$item = Get-Item -LiteralPath $archive
$stream = [System.IO.File]::OpenRead($archive)
try {
  $sha256 = [System.Security.Cryptography.SHA256]::Create()
  $hashBytes = $sha256.ComputeHash($stream)
  $hash = [System.BitConverter]::ToString($hashBytes).Replace("-", "")
} finally {
  if ($sha256) { $sha256.Dispose() }
  $stream.Dispose()
}

Write-Host "Netlify package: $($item.FullName)"
Write-Host "Size: $([Math]::Round($item.Length / 1MB, 2)) MB"
Write-Host "SHA256: $hash"
