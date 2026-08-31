# Build a sideloadable Android APK (aarch64). Needs JDK 17, Android SDK/NDK, MSVC for host build scripts.
# Windows without Developer Mode cannot create the jniLibs symlink Tauri expects;
# this script falls back to copying libyi_desktop_lib.so and running Gradle assembleArm64Release.
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

# JDK 17 (portable D:\env\jdk17, then Microsoft / Adoptium)
$jdkCandidates = @(
  "D:\env\jdk17",
  "C:\Program Files\Microsoft\jdk-17.0.20.101-hotspot",
  "C:\Program Files\Microsoft\jdk-17*",
  "C:\Program Files\Eclipse Adoptium\jdk-17*"
)
$javaHome = $env:JAVA_HOME_17
if (-not $javaHome) {
  foreach ($p in $jdkCandidates) {
    $hit = Get-Item $p -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($hit -and (Test-Path (Join-Path $hit.FullName "bin\java.exe"))) {
      $javaHome = $hit.FullName
      break
    }
  }
}
if (-not $javaHome) {
  throw "JDK 17 not found. Install Microsoft.OpenJDK.17 or set JAVA_HOME_17."
}

$sdkRoot = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { "D:\Android\Sdk" }
if (-not (Test-Path $sdkRoot)) {
  throw "ANDROID_HOME / D:\Android\Sdk not found. Run scripts/setup-android-sdk.ps1 first."
}

$ndkHome = $env:NDK_HOME
if (-not $ndkHome) {
  $ndkRoot = Join-Path $sdkRoot "ndk"
  if (Test-Path $ndkRoot) {
    $ndkHome = (Get-ChildItem $ndkRoot -Directory | Sort-Object Name -Descending | Select-Object -First 1).FullName
  }
}
if (-not $ndkHome) {
  throw "NDK not found under $sdkRoot\ndk. Run scripts/setup-android-sdk.ps1 first."
}

$androidInit = Join-Path $root "src-tauri\gen\android"
if (-not (Test-Path $androidInit)) {
  throw "src-tauri/gen/android missing. Run: npx tauri android init --ci"
}

$pkg = Get-Content (Join-Path $root "package.json") -Raw | ConvertFrom-Json
$appVer = $pkg.version

# Write sdk.dir so Gradle finds the Android SDK without Android Studio.
# androidDir: path to src-tauri/gen/android; sdk: ANDROID_HOME
function Write-LocalProperties {
  param(
    [string]$androidDir,
    [string]$sdk
  )
  $escaped = $sdk.Replace("\", "\\")
  Set-Content -Path (Join-Path $androidDir "local.properties") -Value "sdk.dir=$escaped" -Encoding ASCII
}

# Copy the already-built aarch64 .so into jniLibs (replaces the symlink Tauri cannot create on Windows).
# rootDir: yi-desktop project root
function Copy-AndroidJniLib {
  param(
    [string]$rootDir
  )
  $so = Join-Path $rootDir "src-tauri\target\aarch64-linux-android\release\libyi_desktop_lib.so"
  if (-not (Test-Path $so)) {
    throw "Missing $so. Cargo aarch64-linux-android release lib was not built."
  }
  $jni = Join-Path $rootDir "src-tauri\gen\android\app\src\main\jniLibs\arm64-v8a"
  New-Item -ItemType Directory -Force -Path $jni | Out-Null
  Copy-Item $so (Join-Path $jni "libyi_desktop_lib.so") -Force
  Write-Host "Copied jniLib from $so"
}

# Copy Vite dist + tauri.conf.json into Android assets for the WebView.
# rootDir: yi-desktop project root
function Copy-AndroidWebAssets {
  param(
    [string]$rootDir
  )
  $dist = Join-Path $rootDir "dist"
  if (-not (Test-Path (Join-Path $dist "index.html"))) {
    throw "dist/index.html missing. Run npm run build:vite first."
  }
  $assets = Join-Path $rootDir "src-tauri\gen\android\app\src\main\assets"
  New-Item -ItemType Directory -Force -Path $assets | Out-Null
  Copy-Item (Join-Path $dist "*") $assets -Recurse -Force
  Copy-Item (Join-Path $rootDir "src-tauri\tauri.conf.json") (Join-Path $assets "tauri.conf.json") -Force
  Write-Host "Copied web assets into $assets"
}

# Assemble signed arm64 release APK, skipping rustBuild tasks (the .so is already in jniLibs).
# androidDir: gen/android; javaHome: JDK 17; sdkRoot: ANDROID_HOME; ndkHome: NDK path
function Invoke-GradleArm64Release {
  param(
    [string]$androidDir,
    [string]$javaHome,
    [string]$sdkRoot,
    [string]$ndkHome
  )
  $gradlew = Join-Path $androidDir "gradlew.bat"
  $gcmd = "set JAVA_HOME=$javaHome&& set ANDROID_HOME=$sdkRoot&& set ANDROID_SDK_ROOT=$sdkRoot&& set ANDROID_NDK_HOME=$ndkHome&& set NDK_HOME=$ndkHome&& set PATH=$javaHome\bin;%PATH%&& `"$gradlew`" :app:assembleArm64Release -x rustBuildArm64Release -x rustBuildUniversalRelease --no-daemon"
  Push-Location $androidDir
  try {
    cmd.exe /c $gcmd
    if ($LASTEXITCODE -ne 0) { throw "gradle assembleArm64Release failed ($LASTEXITCODE)" }
  } finally {
    Pop-Location
  }
}

# Copy every APK under outputs/apk into yi-desktop/release, plus a stable YiDesktop_<ver>_arm64.apk name.
# rootDir: yi-desktop project root; version: package.json version string
function Copy-ApkToRelease {
  param(
    [string]$rootDir,
    [string]$version
  )
  $releaseDir = Join-Path $rootDir "release"
  New-Item -ItemType Directory -Force -Path $releaseDir | Out-Null
  $apks = Get-ChildItem -Path (Join-Path $rootDir "src-tauri\gen\android\app\build\outputs") -Recurse -Filter "*.apk" -ErrorAction SilentlyContinue
  if (-not $apks) { throw "No APK found under gen/android/app/build/outputs" }
  foreach ($apk in $apks) {
    Write-Host $apk.FullName
    Copy-Item $apk.FullName (Join-Path $releaseDir $apk.Name) -Force
    if ($apk.Name -like "*arm64*release*.apk") {
      Copy-Item $apk.FullName (Join-Path $releaseDir "YiDesktop_$($version)_arm64.apk") -Force
    }
  }
  Write-Host "Copied APK(s) to $releaseDir"
}

$extra = "$node;$cargo;$javaHome\bin;$sdkRoot\platform-tools;$sdkRoot\cmdline-tools\latest\bin"
$envBlock = "set JAVA_HOME=$javaHome&& set ANDROID_HOME=$sdkRoot&& set ANDROID_SDK_ROOT=$sdkRoot&& set NDK_HOME=$ndkHome&& set PATH=$extra;%PATH%"
$cmd = "call `"$vcvars`" && $envBlock && cd /d `"$root`" && npx tauri android build --apk --target aarch64 --ci"
cmd.exe /c $cmd
$tauriExit = $LASTEXITCODE

if ($tauriExit -ne 0) {
  Write-Host "tauri android build exited $tauriExit; trying Gradle fallback (copy .so, skip rustBuild symlink)"
  Write-LocalProperties -androidDir $androidInit -sdk $sdkRoot
  Copy-AndroidJniLib -rootDir $root
  Copy-AndroidWebAssets -rootDir $root
  Invoke-GradleArm64Release -androidDir $androidInit -javaHome $javaHome -sdkRoot $sdkRoot -ndkHome $ndkHome
}

Copy-ApkToRelease -rootDir $root -version $appVer
