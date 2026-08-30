# Agent：Windows NSIS 打包

> 自动生成，勿手改。源：scripts/generate-build-agents.mjs · 详见 DEV.md

## 目标

产出 Windows NSIS 安装包 `release/YiDesktop_0.1.2_x64-setup.exe`。

## 前置条件

- Node **22**：`D:\env\nvm\v22.22.2\node.exe`（**禁止** PATH 默认 v14）
- Rust stable（`~/.cargo/bin` 在 PATH）
- **Visual Studio 2022 Build Tools（MSVC）**
  - `C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat`

## 唯一命令

```bash
cd yi-desktop
npm run build:win
# 或统一 CLI：
npm run build -- win
```

## 脚本做了什么

1. `call vcvars64.bat` 加载 MSVC 环境
2. 将 `D:\env\nvm\v22.22.2` 与 cargo 加入 PATH
3. 执行 `npm run build:tauri` → Tauri NSIS 打包（会先 `build:vite`；勿用 `npm run build`，那是统一 CLI）

## 产物

| 路径 | 说明 |
|------|------|
| `release/YiDesktop_0.1.2_x64-setup.exe` | 稳定命名，便于分发 |
| `src-tauri/target/release/bundle/nsis/` | Tauri 原始输出 |

## 禁止

- 不要改用 PATH 里的 Node v14
- 不要跳过 `build-win.ps1` 直接 `tauri build`（缺 vcvars）
- 不要修改 `package.json` 的 `author` 字段
- 不要各搞一套口头流程 — 统一走 `npm run build -- win`
