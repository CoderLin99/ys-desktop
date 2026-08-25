/**
 * 轻量 toolkit：避免再依赖 @electron-toolkit/utils。
 */
import { app, BrowserWindow } from 'electron'

export const is = {
  /** 是否为开发模式 */
  get dev(): boolean {
    return !app.isPackaged
  }
}

export const electronApp = {
  /**
   * 设置 Windows 任务栏 AppUserModelId。
   * @param id 应用标识
   */
  setAppUserModelId(id: string): void {
    if (process.platform === 'win32') {
      app.setAppUserModelId(id)
    }
  }
}

export const optimizer = {
  /**
   * 开发环境下监听 F12 打开调试工具。
   * @param window 目标窗口
   */
  watchWindowShortcuts(window: BrowserWindow): void {
    window.webContents.on('before-input-event', (event, input) => {
      if (is.dev && input.type === 'keyDown' && input.key === 'F12') {
        window.webContents.toggleDevTools()
        event.preventDefault()
      }
    })
  }
}
