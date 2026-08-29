# Cursor Agents 指引

本项目的 AI/开发者协作入口。**打包与开发流程以仓库真实脚本为准，不要凭记忆猜测。**

## 必读

1. **[DEV.md](./DEV.md)** — 开发前必读：环境约定、目录结构、架构原则、防幻觉清单
2. **[README.md](./README.md)** — 用户向快速上手

## 打包 Agent 文档（自动生成）

运行 `npm run build:agents` 可重新生成：

| 文件 | 用途 |
|------|------|
| [.cursor/agents/build-win.md](./.cursor/agents/build-win.md) | Windows NSIS 打包固定流程 |
| [.cursor/agents/build-android.md](./.cursor/agents/build-android.md) | Android APK 打包固定流程（含 symlink fallback） |

## 统一打包 CLI

```bash
npm run build -- help       # 子命令列表
npm run build -- win        # Windows
npm run build -- android    # Android
npm run build -- all        # 全量
```

实现：`scripts/build-all.mjs` · 生成器：`scripts/generate-build-agents.mjs`

## 给 AI 的提示

- 开始开发或打包任务前，先读 **DEV.md**
- 使用 `scripts/resolve-node.ps1` 保证 Node 22
- 不要修改 `package.json` 的 `author` 字段
- 古籍 RAG 纯本地，不联网
