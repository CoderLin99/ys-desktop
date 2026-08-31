# iOS IPA cannot be built on Windows. This script exists so npm run ios:build has a clear exit.
$ErrorActionPreference = "Stop"
Write-Host "iOS (.ipa) requires macOS + Xcode + CocoaPods. This machine is Windows, so no IPA can be produced here."
Write-Host "The same Vue + Rust crate already targets iOS (staticlib + mobile_entry_point + capabilities)."
Write-Host "On a Mac, after cloning this repo:"
Write-Host "  cd yi-desktop"
Write-Host "  npm install"
Write-Host "  rustup target add aarch64-apple-ios aarch64-apple-ios-sim"
Write-Host "  npx tauri ios init --ci"
Write-Host "  npx tauri ios build"
Write-Host "Signing: set Apple Development Team in Xcode or TAURI_APPLE_DEVELOPMENT_TEAM."
exit 1
