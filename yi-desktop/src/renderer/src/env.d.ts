/**
 * 渲染进程环境类型。
 */
/// <reference types="vite/client" />

export {}

declare module '*.png' {
  /** Vite 打包后的资源 URL */
  const src: string
  export default src
}

declare global {
  interface Window {
    /** 预加载 / Tauri 暴露的桌面与安卓 API */
    yiDesktop?: {
      version: string
      /**
       * 经主进程转发的 HTTP（规避 CORS）
       * @param req 请求
       */
      aiFetch?: (req: {
        url: string
        method?: string
        headers?: Record<string, string>
        body?: string
      }) => Promise<{ ok: boolean; status: number; body: string }>
      /**
       * 经主进程转发的 SSE/流式 HTTP（分片走 onAiStreamChunk）。
       * @param req 请求（须带 streamId）
       */
      aiFetchStream?: (req: {
        url: string
        method?: string
        headers?: Record<string, string>
        body?: string
        streamId: string
      }) => Promise<{ ok: boolean; status: number; body?: string }>
      /**
       * 订阅流式分片；返回取消函数。
       * @param handler 分片回调
       */
      onAiStreamChunk?: (handler: (payload: {
        streamId: string
        chunk: string
      }) => void) => () => void
    }
  }
}
