import { contextBridge } from 'electron'

/**
 * 预加载脚本：向渲染进程暴露受控 API。
 * 当前业务纯前端计算，仅暴露版本信息。
 */
contextBridge.exposeInMainWorld('yiDesktop', {
  /** 应用版本号 */
  version: '0.1.0'
})
