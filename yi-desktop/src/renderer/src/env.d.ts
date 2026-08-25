/**
 * 渲染进程环境类型。
 */
export {}

declare global {
  interface Window {
    /** 预加载暴露的桌面 API */
    yiDesktop?: { version: string }
  }
}
