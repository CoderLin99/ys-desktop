/**
 * 应用壳状态：桌面侧栏 / 手机底部 Tab 与「更多」面板。
 */
import { defineStore } from 'pinia'

export const useShellStore = defineStore('shell', {
  state: () => ({
    /** 窄屏「更多」面板是否打开（替代旧侧栏抽屉） */
    moreOpen: false
  }),
  actions: {
    /** 打开「更多」面板 */
    openMore(): void {
      this.moreOpen = true
    },
    /** 关闭「更多」面板 */
    closeMore(): void {
      this.moreOpen = false
    },
    /** 切换「更多」面板 */
    toggleMore(): void {
      this.moreOpen = !this.moreOpen
    }
  }
})
