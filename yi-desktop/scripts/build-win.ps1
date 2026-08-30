# Windows NSIS installer. Requires VS 2022 Build Tools (MSVC).
$ErrorActionPreference = "Stop"
$vcvars = "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat"
if (-not (Test-Path $vcvars)) {
  throw "vcvars64.bat not found. Install Visual Studio 2022 Build Tools (MSVC)."
}
$node = "D:\env\nvm\v22.22.2"
$cargo = Join-Path $env:USERPROFILE ".cargo\bin"
$root = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path (Join-Path $root "package.json"))) {
  $root = Get-Location
}
# 必须用 build:tauri：npm run build 已是统一 CLI，避免递归调用 build-all
$cmd = "call `"$vcvars`" && set PATH=$node;$cargo;%PATH% && cd /d `"$root`" && npm run build:tauri"
cmd.exe /c $cmd
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

# 复制稳定命名到 release/，便于分发
$pkg = Get-Content (Join-Path $root "package.json") -Raw | ConvertFrom-Json
$ver = $pkg.version
$nsisDir = Join-Path $root "src-tauri\target\release\bundle\nsis"
$releaseDir = Join-Path $root "release"
New-Item -ItemType Directory -Force -Path $releaseDir | Out-Null
# 优先取与当前 package.json 版本一致的 setup；否则取最新修改时间
$exact = Join-Path $nsisDir "YiDesktop_${ver}_x64-setup.exe"
if (Test-Path $exact) {
  $setup = Get-Item $exact
} else {
  $setup = Get-ChildItem -Path $nsisDir -Filter "*-setup.exe" -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
}
if (-not $setup) {
  throw "NSIS setup.exe not found under $nsisDir"
}
$stable = Join-Path $releaseDir "YiDesktop_${ver}_x64-setup.exe"
Copy-Item $setup.FullName $stable -Force
Write-Host "Copied $($setup.FullName) -> $stable"
