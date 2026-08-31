# Install Android SDK platform, build-tools and NDK into D:\Android\Sdk (CLI, no Android Studio).
$ErrorActionPreference = "Stop"
$sdkRoot = "D:\Android\Sdk"
$sdkmanager = Join-Path $sdkRoot "cmdline-tools\latest\bin\sdkmanager.bat"
if (-not (Test-Path $sdkmanager)) {
  throw "sdkmanager not found: $sdkmanager"
}

$env:ANDROID_HOME = $sdkRoot
$env:ANDROID_SDK_ROOT = $sdkRoot

# Accept licenses then install packages needed by Tauri 2
$packages = @(
  "platform-tools",
  "platforms;android-35",
  "build-tools;35.0.0",
  "ndk;27.2.12479018",
  "cmdline-tools;latest"
)

$yes = ("y`n" * 120)
$yes | & $sdkmanager --sdk_root=$sdkRoot --licenses
if ($LASTEXITCODE -ne 0) { Write-Host "license step returned $LASTEXITCODE (continue if already accepted)" }

& $sdkmanager --sdk_root=$sdkRoot $packages
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "SDK ready at $sdkRoot"
Get-ChildItem (Join-Path $sdkRoot "ndk") -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "NDK $($_.Name)" }
