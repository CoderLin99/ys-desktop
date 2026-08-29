# Agent：Android APK 打包

> 自动生成，勿手改。源：scripts/generate-build-agents.mjs · 详见 DEV.md

## 目标

产出 sideload 可装 APK：`release/YiDesktop_0.1.1_arm64.apk`（包名 `com.yi.desktop`，arm64-v8a）。

## 前置条件

- Node **22**：`D:\env\nvm\v22.22.2\node.exe`
- Rust stable + `aarch64-linux-android` target
- **JDK 17**（优先 `D:\env\jdk17`，或 `JAVA_HOME_17`）
- **Android SDK + NDK** 在 `D:\Android\Sdk`（或 `ANDROID_HOME`）
- **MSVC**（host build scripts 需要）
- 已初始化：`src-tauri/gen/android`（`npx tauri android init --ci`）

首次安装 SDK：

```bash
npm run android:setup
npx tauri android init --ci
```

## 唯一命令

```bash
cd yi-desktop
npm run android:build
# 或统一 CLI：
npm run build -- android
```

## 脚本做了什么

1. 加载 vcvars64 + JDK 17 + Android SDK/NDK 环境
2. `npx tauri android build --apk --target aarch64 --ci`
3. **Windows symlink fallback**：若 Tauri 因未开「开发人员模式」无法创建 `jniLibs` 符号链接：
   - 复制 `libyi_desktop_lib.so` 到 `jniLibs/arm64-v8a/`
   - 复制 `dist/` 到 Android assets
   - Gradle `:app:assembleArm64Release`（跳过 rustBuild）
4. 复制 APK 到 `release/`

## 产物

| 路径 | 说明 |
|------|------|
| `release/YiDesktop_0.1.1_arm64.apk` | 稳定命名 |
| `src-tauri/gen/android/app/build/outputs/` | Gradle 原始输出 |

## 禁止

- 不要在线抓 GitHub 语料（古籍 RAG 纯本地）
- 不要手动改 `jniLibs`  symlink 逻辑 — 脚本已处理 fallback
- 不要在 Windows 上尝试产出 iOS `.ipa`
- 统一走 `npm run build -- android`，不要各搞一套命令
