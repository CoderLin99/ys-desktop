/// <reference types="vitest" />
import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@rules': resolve(__dirname, 'src/renderer/src/rules')
    }
  },
  test: {
    include: ['src/renderer/src/rules/**/*.test.ts']
  }
})
