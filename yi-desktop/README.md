# 易学桌面（Vue 3 + Tauri 2）

八字排盘与六爻起卦：桌面（Windows NSIS）与安卓 APK 共用同一套前端。

技术栈：Tauri 2、Vue 3 + TypeScript + Vite、PrimeVue 4、Pinia、SQLite（rusqlite）、HTTP（reqwest + rustls）。

## 环境

- **Node 22**（本仓库用 `D:\env\nvm\v22.22.2`）
- **Rust stable**（`rustup`）。未装时：`winget install --id Rustlang.Rustup -e`
- 打 Windows 安装包还需要：**Visual Studio 2022 Build Tools（MSVC）**
- 打安卓 APK 还需要：**JDK 17**、Android SDK + NDK（可用 `npm run android:setup` 装到 `D:\Android\Sdk`）

## 开发

> 完整约定（Node 22 路径、目录结构、防幻觉清单）见 **[DEV.md](./DEV.md)** · Cursor 协作见 **[AGENTS.md](./AGENTS.md)**

```bash
cd yi-desktop
npm install
npm run dev          # Tauri 桌面窗口（Vite :1420）
npm run web          # 仅浏览器预览 UI
npm test             # 规则单元测试
npm run typecheck    # 类型检查
```

## 打包（统一入口）

**开发前请先读 [DEV.md](./DEV.md)**，避免环境/流程猜错。

```bash
npm run build -- help       # 查看所有子命令
npm run build -- win        # Windows NSIS 安装包
npm run build -- android    # Android APK
npm run build -- all        # classics + vite + win + android 全量
npm run build:agents        # 生成 .cursor/agents/*.md 供 Cursor 复用
```

等效快捷命令：`npm run build:win` · `npm run android:build` · `npm run build:all`

### Windows exe

产物：`release/YiDesktop_0.1.0_x64-setup.exe`（同时在 `src-tauri/target/release/bundle/nsis/`）。

### 安卓 APK

首次：

```bash
npm run android:setup      # 命令行安装 SDK/NDK 到 D:\Android\Sdk
npx tauri android init --ci
npm run build -- android   # 或 npm run android:build
```

Windows 未开「开发人员模式」时，Tauri 无法给 `jniLibs` 建符号链接；脚本会自动改成复制 `.so` 再跑 Gradle。

产物：`release/YiDesktop_0.1.0_arm64.apk`（包名 `com.yi.desktop`，仅 arm64-v8a）。把 APK 拷到手机即可侧载。

### iOS（必须 Mac）

Windows **无法**产出 `.ipa`（Apple 工具链只在 macOS）。工程侧已接好：`crate-type` 含 `staticlib`、capabilities 含 iOS、`tauri.conf.json` 的 `bundle.iOS.minimumSystemVersion` 为 14.0。

在 Mac 上：

```bash
rustup target add aarch64-apple-ios aarch64-apple-ios-sim
npx tauri ios init --ci
npx tauri ios build
```

还需要 Apple 开发者账号（免费账号可装到自己的 iPhone，上架 App Store 要付费账号）。`npm run ios:build` 在 Windows 上会打印上述步骤并退出。

## 功能

- 命理总断：姻缘（妻星落柱）/ 事业（任职方式与用神行业）/ 财运学业
- 八字：公历/农历/三柱、神煞、细盘、可选 AI 润色（Rust 代理，规避 CORS）
- 六爻起卦与走势

浏览器预览没有 Rust 代理，AI 接口可能被 CORS 拦截；请用 `npm run dev` 或安装包。

完整部署步骤见仓库根目录 **[MEMBERSHIP.md](../MEMBERSHIP.md)**（Supabase + Cloudflare Worker + 管理后台）。

## 零成本让别人访问（Web 静态托管）

前端可单独打包成静态站（无服务器费用）。罗盘/定位需 **HTTPS**，下列平台均免费提供。

```bash
cd yi-desktop
npm install
npm run build:vite          # 产物在 yi-desktop/dist/
```

### 方案一：Cloudflare Pages（推荐）

1. 把仓库推到 GitHub
2. [Cloudflare Pages](https://pages.cloudflare.com/) → Create → 连接本仓库
3. 构建设置：
   - **Root directory**：`yi-desktop`
   - **Build command**：`npm run build:vite`
   - **Output directory**：`dist`
4. 部署后得到 `https://xxx.pages.dev`，把链接发给他人即可

### 方案二：Vercel / Netlify

同样连接 GitHub，Root = `yi-desktop`，Build = `npm run build:vite`，Publish = `dist`。

### 方案三：GitHub Pages

仓库需开启 Pages。可用 Actions 工作流（见 `.github/workflows/web-pages.yml`）：推送后自动构建并发布。

本地预览打包结果：

```bash
npm run preview             # 默认 http://localhost:4173
```

**注意**

- AI 润色在纯 Web 下可能因 CORS 失败（桌面/安卓走 Rust 代理）；排盘、黄历、罗盘、合盘等本地规则可正常用
- 手机浏览器打开 HTTPS 链接后，才可申请罗盘/定位权限
- 若只想给熟人用：打 APK（`npm run android:build`）或 exe，侧载安装也是零托管成本

### 古籍 RAG（离线 BM25）

AI 润色会从 **本地古籍语料** 离线 BM25 检索段落。首次或更新语料：

```bash
# 需本地书仓：D:/Work Folder/ai/mingli-research（或设置 MINGLI_ROOT）
npm run classics:build    # 扫描 books/ 全量导入 + 构建 BM25 索引
# 或分步：npm run classics:fetch && npm run classics:index
```

- 原文缓存：`resources/classics/*.json`（扫描本地 `mingli-research/books`，不访问网络）
- 检索索引：`src/renderer/public/rag/classics-index.json`（随前端打包进 dist）
- 当前收录：本地书仓 `books/` 下全部有原文的书（约 20 部，含三命通会、紫微斗数全书等）
- 更新语料：`FORCE=1 npm run classics:fetch` 可覆盖重导；默认跳过已存在文件（需 **Node.js ≥ 18**，脚本自动选用 Node 22）
