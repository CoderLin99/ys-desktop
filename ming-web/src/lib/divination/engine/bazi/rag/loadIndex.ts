/**
 * 懒加载 public/rag/classics-index.json（Vite 静态资源）。
 */
import type { RagIndexPayload } from './types'

/** 内存缓存 */
let cached: RagIndexPayload | null = null

/** 加载失败标记（避免反复 404） */
let loadFailed = false

/**
 * 读取 BM25 索引；无索引或加载失败返回 null。
 */
export async function loadRagIndex(): Promise<RagIndexPayload | null> {
  if (cached) return cached
  if (loadFailed) return null
  try {
    const base = import.meta.env.BASE_URL || '/'
    const url = `${base}rag/classics-index.json`
    const res = await fetch(url)
    if (!res.ok) {
      loadFailed = true
      return null
    }
    cached = (await res.json()) as RagIndexPayload
    return cached
  } catch {
    loadFailed = true
    return null
  }
}

/**
 * 重置缓存（测试用）。
 */
export function resetRagIndexCache(): void {
  cached = null
  loadFailed = false
}
