/**
 * 生成 Cursor Agent 打包文档 — 供 AI/开发者复用固定流程，避免「开发幻觉」。
 *
 * 输出：
 *   .cursor/agents/build-win.md
 *   .cursor/agents/build-android.md
 *
 * 用法：
 *   node scripts/generate-build-agents.mjs
 *   npm run build:agents
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUT_DIR = path.join(ROOT, '.cursor', 'agents')

/** 从 package.json 读取当前版本号 */
function readVersion() {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'))
  return pkg.version
}

/** Agent 文档模板集合 */
const AGENTS = {
  'build-win.md': `# Agent：Windows NSIS 打包

> 自动生成，勿手改。源：scripts/generate-build-agents.mjs · 详见 DEV.md

## 目标

产出 Windows NSIS 安装包 \`release/YiDesktop_${readVersion()}_x64-setup.exe\`。

## 前置条件

- Node **22**：\`D:\\env\\nvm\\v22.22.2\\node.exe\`（**禁止** PATH 默认 v14）
- Rust stable（\`~/.cargo/bin\` 在 PATH）
- **Visual Studio 2022 Build Tools（MSVC）**
  - \`C:\\Program Files (x86)\\Microsoft Visual Studio\\2022\\BuildTools\\VC\\Auxiliary\\Build\\vcvars64.bat\`

## 唯一命令

\`\`\`bash
cd yi-desktop
npm run build:win
# 或统一 CLI：
npm run build -- win
\`\`\`

## 脚本做了什么

1. \`call vcvars64.bat\` 加载 MSVC 环境
2. 将 \`D:\\env\\nvm\\v22.22.2\` 与 cargo 加入 PATH
3. 执行 \`npm run build:tauri\` → Tauri NSIS 打包（会先 \`build:vite\`；勿用 \`npm run build\`，那是统一 CLI）

## 产物

| 路径 | 说明 |
|------|------|
| \`release/YiDesktop_${readVersion()}_x64-setup.exe\` | 稳定命名，便于分发 |
| \`src-tauri/target/release/bundle/nsis/\` | Tauri 原始输出 |

## 禁止

- 不要改用 PATH 里的 Node v14
- 不要跳过 \`build-win.ps1\` 直接 \`tauri build\`（缺 vcvars）
- 不要修改 \`package.json\` 的 \`author\` 字段
- 不要各搞一套口头流程 — 统一走 \`npm run build -- win\`
`,

  'build-android.md': `# Agent：Android APK 打包

> 自动生成，勿手改。源：scripts/generate-build-agents.mjs · 详见 DEV.md

## 目标

产出 sideload 可装 APK：\`release/YiDesktop_${readVersion()}_arm64.apk\`（包名 \`com.yi.desktop\`，arm64-v8a）。

## 前置条件

- Node **22**：\`D:\\env\\nvm\\v22.22.2\\node.exe\`
- Rust stable + \`aarch64-linux-android\` target
- **JDK 17**（优先 \`D:\\env\\jdk17\`，或 \`JAVA_HOME_17\`）
- **Android SDK + NDK** 在 \`D:\\Android\\Sdk\`（或 \`ANDROID_HOME\`）
- **MSVC**（host build scripts 需要）
- 已初始化：\`src-tauri/gen/android\`（\`npx tauri android init --ci\`）

首次安装 SDK：

\`\`\`bash
npm run android:setup
npx tauri android init --ci
\`\`\`

## 唯一命令

\`\`\`bash
cd yi-desktop
npm run android:build
# 或统一 CLI：
npm run build -- android
\`\`\`

## 脚本做了什么

1. 加载 vcvars64 + JDK 17 + Android SDK/NDK 环境
2. \`npx tauri android build --apk --target aarch64 --ci\`
3. **Windows symlink fallback**：若 Tauri 因未开「开发人员模式」无法创建 \`jniLibs\` 符号链接：
   - 复制 \`libyi_desktop_lib.so\` 到 \`jniLibs/arm64-v8a/\`
   - 复制 \`dist/\` 到 Android assets
   - Gradle \`:app:assembleArm64Release\`（跳过 rustBuild）
4. 复制 APK 到 \`release/\`

## 产物

| 路径 | 说明 |
|------|------|
| \`release/YiDesktop_${readVersion()}_arm64.apk\` | 稳定命名 |
| \`src-tauri/gen/android/app/build/outputs/\` | Gradle 原始输出 |

## 禁止

- 不要在线抓 GitHub 语料（古籍 RAG 纯本地）
- 不要手动改 \`jniLibs\`  symlink 逻辑 — 脚本已处理 fallback
- 不要在 Windows 上尝试产出 iOS \`.ipa\`
- 统一走 \`npm run build -- android\`，不要各搞一套命令
`
}

/**
 * 写入所有 agent 文档到 .cursor/agents/。
 */
function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  for (const [filename, content] of Object.entries(AGENTS)) {
    const outPath = path.join(OUT_DIR, filename)
    fs.writeFileSync(outPath, content, 'utf8')
    console.log(`✓ 已生成 ${outPath}`)
  }
  console.log('\n提示：AGENTS.md 指向 DEV.md + 上述文件，供 Cursor 加载。')
}

main()
