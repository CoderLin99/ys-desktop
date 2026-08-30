/**
 * Vite 配置：Tauri 2 桌面 / 安卓调试共用；安卓真机时走 TAURI_DEV_HOST。
 */
import { resolve } from 'path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

/** 安卓/真机调试时由 Tauri CLI 注入 */
const host = process.env.TAURI_DEV_HOST

export default defineConfig({
  root: resolve('src/renderer'),
  plugins: [vue()],
  // 相对路径：GitHub Pages 子路径 / Cloudflare / 本地 preview 均可
  base: './',
  resolve: {
    alias: {
      '@renderer': resolve('src/renderer/src'),
      '@rules': resolve('src/renderer/src/rules')
    }
  },
  // Tauri 需要看到 Rust 编译错误，不要清屏
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || true,
    hmr: host
      ? {
          protocol: 'ws',
          host,
          port: 1421
        }
      : undefined,
    watch: {
      ignored: ['**/src-tauri/**']
    }
  },
  envPrefix: ['VITE_', 'TAURI_ENV_'],
  // 已卸载的 oh-my-live2d 仍可能残留在预构建缓存，排除以免拖垮热更新
  optimizeDeps: {
    exclude: ['oh-my-live2d']
  },
  build: {
    outDir: resolve('dist'),
    emptyOutDir: true
  }
})
