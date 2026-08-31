/**
 * Tauri 运行时把 Rust 命令挂到 window.yiDesktop，排盘页的 AI 代理无需分叉。
 */
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { getVersion } from '@tauri-apps/api/app'

/** 流式分片载荷（与 Rust StreamChunk camelCase 对齐） */
interface AiStreamChunkPayload {
  /** 会话 id */
  streamId: string
  /** SSE 原文分片 */
  chunk: string
}

/** 整包 HTTP 入参 */
interface AiHttpRequest {
  url: string
  method?: string
  headers?: Record<string, string>
  body?: string
}

/**
 * 是否运行在 Tauri WebView（桌面或安卓）。
 */
export function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

/**
 * 安装桌面/安卓桥：先挂全局 listen，再暴露 yiDesktop，避免 SSE 首包丢失。
 */
export async function installTauriDesktopBridge(): Promise<void> {
  if (!isTauriRuntime()) return

  const handlers = new Set<(payload: AiStreamChunkPayload) => void>()
  await listen<AiStreamChunkPayload>('ai-http-stream-chunk', (event) => {
    const payload = event.payload
    if (!payload || typeof payload.chunk !== 'string') return
    handlers.forEach((h) => h(payload))
  })

  const version = await getVersion().catch(() => '0.1.0')
  window.yiDesktop = {
    version,
    aiFetch: (req: AiHttpRequest) =>
      invoke<{ ok: boolean; status: number; body: string }>('ai_http', {
        url: req.url,
        method: req.method,
        headers: req.headers,
        body: req.body
      }),
    aiFetchStream: (req: AiHttpRequest & { streamId: string }) =>
      invoke<{ ok: boolean; status: number; body?: string }>('ai_http_stream', {
        url: req.url,
        method: req.method,
        headers: req.headers,
        body: req.body,
        streamId: req.streamId
      }),
    onAiStreamChunk: (handler: (payload: AiStreamChunkPayload) => void) => {
      handlers.add(handler)
      return () => {
        handlers.delete(handler)
      }
    }
  }
}
