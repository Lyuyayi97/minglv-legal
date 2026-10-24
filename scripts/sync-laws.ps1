$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$dataDir = Join-Path $root "data"
$archive = Join-Path $dataDir "chinese-law-corpus.zip"
$corpusDir = Join-Path $dataDir "corpus"

New-Item -ItemType Directory -Force $dataDir | Out-Null

if (-not (Test-Path $archive)) {
  Write-Host "Downloading structured Chinese law corpus..."
  Invoke-WebRequest `
    -Uri "https://github.com/lttxzmj/chinese-law-corpus/archive/refs/heads/master.zip" `
    -OutFile $archive `
    -UseBasicParsing `
    -Headers @{ "User-Agent" = "legal-research-workbench" }
}

if (-not (Test-Path $corpusDir)) {
  Write-Host "Extracting corpus..."
  Expand-Archive -LiteralPath $archive -DestinationPath $corpusDir -Force
}

Write-Host "Corpus ready at $corpusDir"
