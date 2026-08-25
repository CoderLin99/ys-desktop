# 易学桌面（Vue + Electron）

八字排盘与六爻起卦的学习用桌面程序：把可编码规则做成可点、可复盘的工具。

## 开发

```bash
cd yi-desktop
npm install
npm run dev          # Electron 桌面
# 或
npm run web          # 仅浏览器预览 UI（无 GPU 环境可用）
```

## 脚本

- `npm run dev` — 启动 Electron 桌面窗口
- `npm run web` — Vite 浏览器预览
- `npm run build` — 打包渲染/主进程
- `npm test` — 规则单元测试

## 功能

- **走势推演（核心）**：八字大运/流年曲线；六爻近段事态顺逆
- 八字：公历起盘 / 手工四柱、十神与藏干
- 六爻：铜钱起卦、世应六亲六神、「跟影子打架」提示
- 规则页：已程序化规则摘要
