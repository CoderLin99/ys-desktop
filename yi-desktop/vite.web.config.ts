/**
 * 纯浏览器预览配置：无 Electron GPU 时也可用 npm run web 查看 UI。
 */
import { resolve } from 'path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  root: resolve('src/renderer'),
  resolve: {
    alias: {
      '@renderer': resolve('src/renderer/src'),
      '@rules': resolve('src/renderer/src/rules')
    }
  },
  plugins: [vue()],
  server: {
    port: 5173,
    host: true
  }
})
