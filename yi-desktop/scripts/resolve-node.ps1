# Resolve Node.js >= 18 for build scripts. Prefers nvm v22; NODE_EXE only if >= 18.
param(
  [switch]$PrintPathOnly
)

$ErrorActionPreference = 'Stop'

function Get-NodeMajor([string]$exe) {
  $ver = & $exe -v 2>$null
  if (-not $ver) { return 0 }
  return [int]($ver -replace '^v(\d+)\..*', '$1')
}

$candidates = @(
  'D:\env\nvm\v22.22.2\node.exe',
  'C:\Program Files\nodejs\node.exe'
)

if ($env:NODE_EXE -and (Test-Path $env:NODE_EXE) -and (Get-NodeMajor $env:NODE_EXE) -ge 18) {
  $nodeExe = $env:NODE_EXE
} else {
  $nodeExe = $null
  foreach ($p in $candidates) {
    if ((Test-Path $p) -and (Get-NodeMajor $p) -ge 18) {
      $nodeExe = $p
      break
    }
  }
  if (-not $nodeExe) {
    throw 'Node.js >= 18 not found. Install Node 22 under D:\env\nvm or set NODE_EXE.'
  }
}

if ($PrintPathOnly) {
  Write-Output $nodeExe
  exit 0
}

& $nodeExe @args
exit $LASTEXITCODE
