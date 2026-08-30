# yi-desktop 开发文档

> **开发前必读**。基于仓库真实状态编写，避免 AI/开发者每次乱猜流程。  
> 作者：**Eason** · 技术栈：**Tauri 2 + Vue 3** · 功能：八字排盘 / 六爻起卦

---

## 1. 项目是什么

| 项 | 说明 |
|----|------|
| 名称 | 易学桌面（YiDesktop） |
| 前端 | Vue 3 + TypeScript + Vite + PrimeVue 4 + Pinia |
| 后端 | Tauri 2（Rust）：HTTP 代理、本地设置、SQLite |
| 平台 | Windows NSIS 安装包 + Android APK（同一套前端） |
| 作者 | `package.json` → `"author": "Eason"`，**不要改** |

---

## 2. 环境固定约定

### Node 22（强制）

```
D:\env\nvm\v22.22.2\node.exe
```

- **禁止**使用 PATH 默认的 Node v14（会导致 Tauri/Vite 失败）
- `scripts/resolve-node.ps1` 作用：
  - 优先选 `D:\env\nvm\v22.22.2\node.exe`
  - 支持 `NODE_EXE` 环境变量（须 >= 18）
  - 被 `npm test`、`classics:*`、`build` CLI 等脚本调用
  - 用法：`powershell -File scripts/resolve-node.ps1 <后续命令...>`

### Rust

- stable（`rustup`），cargo 在 `%USERPROFILE%\.cargo\bin`
- 未安装：`winget install --id Rustlang.Rustup -e`

### MSVC（打 Windows / Android 都需要）

```
C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat
```

打包脚本会先 `call vcvars64.bat` 再执行构建。

### Android SDK（打 APK）

| 变量 / 路径 | 说明 |
|-------------|------|
| `D:\Android\Sdk` | 默认 SDK 根（可用 `ANDROID_HOME` 覆盖） |
| `D:\env\jdk17` | 优先 JDK 17 路径 |
| NDK | `D:\Android\Sdk\ndk\<version>`（setup 装 `27.2.12479018`） |
| 首次安装 | `npm run android:setup` |
| 初始化工程 | `npx tauri android init --ci` |

---

## 3. 目录结构

```
yi-desktop/
├── src/renderer/          # Vue 3 前端
│   ├── src/rules/         # ★ 规则引擎（确定性排盘/断语）
│   ├── src/views/         # 页面：八字、六爻、走势、AI 设置…
│   └── public/rag/        # BM25 检索索引（打包进 dist）
├── src-tauri/             # Rust 后端 + Tauri 配置
│   ├── src/               # lib.rs, http_proxy.rs, settings.rs
│   └── gen/android/       # Tauri 生成的 Android 工程
├── scripts/               # 打包 / 古籍 / 工具脚本
│   ├── build-all.mjs      # ★ 统一打包 CLI
│   ├── build-win.ps1      # Windows NSIS
│   ├── build-android.ps1  # Android APK（含 symlink fallback）
│   └── resolve-node.ps1   # Node 22 解析
├── resources/classics/    # 古籍原文 JSON 缓存
├── release/               # 最终分发产物（exe / apk）
└── dist/                  # Vite 构建输出
```

**本地书仓**（古籍 RAG 数据源，不在本仓库内）：

```
D:\Work Folder\ai\mingli-research
└── books/                 # 按书名分目录的 markdown 原文
```

可通过 `MINGLI_ROOT` 或 `CLASSICS_VENDOR` 环境变量覆盖路径。

---

## 4. 古籍 RAG

- **主来源纯本地**：扫描 `mingli-research/books/`，**不联网**，不从 GitHub 抓取
- **可选补缺**：问真 HTML 全分类（道/医/命/相地/易卜等，`{cat}_{sub}_{n}`），仅抓本地缺失书目，限速；产物进 `resources/classics/`
- 构建命令：

```bash
npm run classics:build              # = classics:fetch + classics:index
# 强制覆盖：FORCE=1 npm run classics:fetch
npm run classics:fetch-wenzhen      # 默认只扫八字类 cat=3
npm run classics:fetch-fengshui     # 阳宅 P0/P1 白名单（--fengshui）
# 仅刷新目录缓存：WENZHEN_REFRESH_CATALOG=1 npm run classics:fetch-wenzhen
# 补抓后再索引：npm run classics:index
```

| 阶段 | 输出 |
|------|------|
| fetch | `resources/classics/*.json` + `manifest.json` |
| fetch-wenzhen | 同上 + `resources/classics-raw/wenzhen/` 纯文本备份 |
| index | `src/renderer/public/rag/classics-index.json` |

AI 润色（`rules/bazi/aiPolish.ts`）离线 BM25 检索上述索引，随前端打包进 dist。

---

## 5. 打包唯一入口

**所有平台走同一 CLI**，不要各搞一套口头命令。

```bash
cd yi-desktop

npm run build -- help       # 查看子命令
npm run build -- win        # Windows NSIS
npm run build -- android    # Android APK
npm run build -- vite       # 仅前端 dist/
npm run build -- classics   # 古籍 RAG
npm run build -- all        # classics → vite → win → android
npm run build:agents        # 生成 .cursor/agents/*.md
```

等效快捷脚本（package.json）：

| 命令 | 说明 |
|------|------|
| `npm run build:win` | Windows |
| `npm run android:build` | Android |
| `npm run build:all` | 全量 |
| `npm run build:vite` | 仅前端 |

### 产物路径

| 平台 | 稳定命名 | 原始输出 |
|------|----------|----------|
| Windows | `release/YiDesktop_0.1.0_x64-setup.exe` | `src-tauri/target/release/bundle/nsis/` |
| Android | `release/YiDesktop_0.1.0_arm64.apk` | `src-tauri/gen/android/app/build/outputs/` |

Android 注意：Windows 未开「开发人员模式」时 Tauri 无法建 `jniLibs` symlink → `build-android.ps1` 自动 fallback（复制 `.so` + Gradle）。

iOS：Windows **无法**产出 `.ipa`，见 `npm run ios:build` 输出的 Mac 步骤。

---

## 6. 开发命令

```bash
npm install
npm run dev          # Tauri 桌面窗口（Vite :1420）
npm run web          # 仅浏览器预览 UI（无 Rust 代理）
npm test             # 规则单元测试（vitest）
npm run test:watch   # 监听模式
npm run typecheck    # vue-tsc 类型检查
npm run android:dev  # Android 真机/模拟器调试
```

浏览器预览没有 Rust HTTP 代理，AI 接口可能被 CORS 拦截 → 请用 `npm run dev` 或安装包。

---

## 7. 架构原则

```
┌─────────────────────────────────────────┐
│  规则引擎 (rules/)                       │  ← 确定性：排盘、神煞、断语模板
│  chart · shensha · career · hehun …     │
└──────────────┬──────────────────────────┘
               │ 结构化 facts
               ▼
┌─────────────────────────────────────────┐
│  AI 润色 (aiPolish.ts)                   │  ← 可选：DeepSeek / SiliconFlow
│  + 古籍 RAG (bm25 + classics-index)     │  ← 离线检索，增强措辞
└──────────────┬──────────────────────────┘
               │ HTTP 经 Rust 代理 (http_proxy.rs)
               ▼
           外部 LLM API
```

- **规则引擎**产出事实与模板，**AI** 仅润色/推断，不替代核心排盘逻辑
- **不要把借鉴来源、第三方库名写进 UI 文案**
- 规则测试在 `src/renderer/src/rules/rules.test.ts`

---

## 8. 常见误区（防幻觉）

| ❌ 错误 | ✅ 正确 |
|---------|---------|
| 用 PATH 默认 Node v14 | 用 Node 22 或 `resolve-node.ps1` |
| 直接 `tauri build` 不加载 vcvars | `npm run build:win` |
| 在线抓 GitHub 古籍 | 本地 `mingli-research/books/` |
| 引用 dooshu 三命等外部未收录源 | 只用 `resources/classics/` 已有语料 |
| 改 `author` 字段 | 保持 `"Eason"` |
| 每次口头各搞一套打包命令 | `npm run build -- <子命令>` |
| Multitask 各 Agent 用不同构建方式 | 统一读本文 + `.cursor/agents/*.md` |
| 浏览器预览测 AI 接口 | 用 `npm run dev` 或安装包 |
| Windows 上打 iOS | 换 Mac + Xcode |

---

## 9. Cursor / AI 协作

- **AGENTS.md** → 指向本文 + 生成的 agent 文档
- 生成 agent：`npm run build:agents` → `.cursor/agents/build-win.md` / `build-android.md`
- 开发任务开始前让 AI 先读 **DEV.md**

---

## 10. 打包版本号（强制）

**每次打 Windows / Android 包前必须抬版本**，同步改：

| 文件 | 字段 |
|------|------|
| `package.json` | `version` |
| `package-lock.json` | 根 `version` + `packages[""].version` |
| `src-tauri/Cargo.toml` | `package.version` |
| `src-tauri/tauri.conf.json` | `version` |

产物名随 `package.json` 版本：`release/YiDesktop_<ver>_x64-setup.exe` / `YiDesktop_<ver>_arm64.apk`。勿用同一版本号覆盖旧包。

---

## 11. 待办 backlog（有 token 再做）

### 三式（新模块，未开工）

| 优先级 | 模块 | 说明 |
|--------|------|------|
| 低 | 太乙神数 | 三式之一；偏国运/天时/大事，非日常八字 |
| 低 | 奇门遁甲 | 三式之一；时空格局与用事择向 |
| 低 | 大六壬 | 三式之一；课式占验 |

约束：与现有八字/紫微/神煞体系分立；等有 API token 与排期后再开发，勿与当前命师席位混写进同一引擎。
