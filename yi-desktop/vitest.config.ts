/// <reference types="vitest" />
import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@rules': resolve(__dirname, 'src/renderer/src/rules'),
      /** npm 包 main 指向不存在的 dist/index.js，测试层直连 index.js */
      'mystilight-8char': resolve(__dirname, 'node_modules/mystilight-8char/index.js')
    }
  },
  test: {
    include: ['src/renderer/src/rules/**/*.test.ts']
  }
})
