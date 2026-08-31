/**
 * 云端 AI 传输：Web 会员模式下经 Cloudflare Worker 代理，不暴露 Key。
 */
import { consumeOpenAiSseBuffer, type AiPolishDeltaHandler } from './aiPolish'
import { isCloudMembershipMode } from '../../lib/cloudConfig'
import { getSupabase } from '../../lib/supabase'
import { isTauriRuntime } from '../../tauriBridge'

/** 云端 chat 消息体 */
export type CloudChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/**
 * 当前是否应走云端 Worker（Web + 已配置）。
 */
export function shouldUseCloudAi(): boolean {
  return isCloudMembershipMode() && !isTauriRuntime()
}

/**
 * 校验登录、邮箱验证、会员有效；返回 access_token。
 */
export async function assertCloudAiAccess(): Promise<string> {
  const sb = getSupabase()
  const { data, error } = await sb.auth.getSession()
  if (error) throw new Error(error.message)
  const session = data.session
  if (!session) throw new Error('请先登录后再使用 AI 解答')
  if (!session.user.email_confirmed_at) {
    throw new Error('请先到邮箱点击验证链接，再使用 AI 解答')
  }
  const { data: mem, error: memErr } = await sb
    .from('memberships')
    .select('expire_at')
    .eq('user_id', session.user.id)
    .maybeSingle()
  if (memErr) throw new Error(memErr.message)
  if (!mem || new Date(mem.expire_at) <= new Date()) {
    throw new Error('请开通会员后使用 AI 解答（会员中心申请）')
  }
  return session.access_token
}

/**
 * 云端 SSE 流式对话。
 * @param messages OpenAI 兼容消息
 * @param temperature 采样温度
 * @param onDelta 增量回调
 */
export async function cloudStreamChat(
  messages: CloudChatMessage[],
  temperature: number,
  onDelta?: AiPolishDeltaHandler
): Promise<string> {
  const token = await assertCloudAiAccess()
  const base = (import.meta.env.VITE_CLOUD_API_URL || '').replace(/\/$/, '')
  if (!base) throw new Error('未配置 VITE_CLOUD_API_URL')

  const res = await fetch(`${base}/api/ai/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ messages, temperature })
  })

  if (!res.ok) {
    let detail = ''
    try {
      const j = (await res.json()) as { message?: string; error?: string }
      detail = j.message || j.error || ''
    } catch {
      detail = await res.text()
    }
    throw new Error(detail || `AI 请求失败 HTTP ${res.status}`)
  }

  let sseBuffer = ''
  let full = ''
  const handleRaw = (chunk: string): void => {
    sseBuffer = consumeOpenAiSseBuffer(sseBuffer + chunk, (delta) => {
      full += delta
      onDelta?.(full, delta)
    })
  }

  if (!res.body) {
    const text = await res.text()
    if (text) handleRaw(text)
  } else {
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      handleRaw(decoder.decode(value, { stream: true }))
    }
    handleRaw(decoder.decode())
  }

  sseBuffer = consumeOpenAiSseBuffer(sseBuffer + '\n', (delta) => {
    full += delta
    onDelta?.(full, delta)
  })

  const text = full.trim()
  if (!text) throw new Error('AI 返回为空')
  return text
}
