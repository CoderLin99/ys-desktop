/**
 * Cloudflare Worker：会员鉴权 + 大模型 SSE 代理（Key 仅存 Supabase，不下发前端）。
 */
import { createClient } from '@supabase/supabase-js'

/** Worker 环境变量 */
export interface Env {
  SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
  /** 允许的前端来源，逗号分隔；空则 * */
  CORS_ORIGIN?: string
}

/** OpenAI 兼容 chat 消息 */
interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/**
 * 构造 CORS 响应头。
 * @param env Worker 环境
 * @param request 入站请求
 */
function corsHeaders(env: Env, request: Request): HeadersInit {
  const origin = request.headers.get('Origin') || ''
  const allowed = (env.CORS_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean)
  const allowOrigin =
    allowed.length === 0 ? '*' : allowed.includes(origin) ? origin : allowed[0] || '*'
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '86400'
  }
}

/**
 * JSON 响应。
 */
function json(data: unknown, status: number, env: Env, request: Request): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(env, request) }
  })
}

/**
 * 解析 Bearer JWT。
 * @param request HTTP 请求
 */
function bearerToken(request: Request): string | null {
  const h = request.headers.get('Authorization') || ''
  const m = /^Bearer\s+(.+)$/i.exec(h)
  return m?.[1]?.trim() || null
}

/**
 * 校验登录 + 邮箱已验证 + 会员有效；返回 userId。
 */
async function assertMember(env: Env, request: Request): Promise<{ userId: string; email: string }> {
  const token = bearerToken(request)
  if (!token) throw new Error('UNAUTHORIZED')

  const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
  const { data: userData, error: userErr } = await admin.auth.getUser(token)
  if (userErr || !userData.user) throw new Error('UNAUTHORIZED')

  const user = userData.user
  if (!user.email_confirmed_at) throw new Error('EMAIL_NOT_VERIFIED')

  const { data: mem, error: memErr } = await admin
    .from('memberships')
    .select('expire_at')
    .eq('user_id', user.id)
    .maybeSingle()
  if (memErr) throw new Error('DB_ERROR')
  if (!mem || new Date(mem.expire_at) <= new Date()) throw new Error('NOT_MEMBER')

  return { userId: user.id, email: user.email || '' }
}

/**
 * 读取默认启用的大模型配置。
 */
async function loadDefaultLlm(env: Env): Promise<{
  base_url: string
  api_key: string
  model: string
  name: string
}> {
  const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
  const { data, error } = await admin
    .from('llm_configs')
    .select('name, base_url, api_key, model, is_default, enabled')
    .eq('enabled', true)
    .order('is_default', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error || !data) throw new Error('NO_LLM_CONFIG')
  return data
}

/**
 * POST /api/ai/chat — SSE 流式代理。
 */
async function handleAiChat(request: Request, env: Env): Promise<Response> {
  await assertMember(env, request)

  let body: { messages?: ChatMessage[]; temperature?: number }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return json({ error: 'invalid_json' }, 400, env, request)
  }
  const messages = body.messages
  if (!Array.isArray(messages) || !messages.length) {
    return json({ error: 'messages_required' }, 400, env, request)
  }

  const llm = await loadDefaultLlm(env)
  const base = llm.base_url.replace(/\/$/, '')
  const upstream = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      Authorization: `Bearer ${llm.api_key}`
    },
    body: JSON.stringify({
      model: llm.model,
      temperature: typeof body.temperature === 'number' ? body.temperature : 0.7,
      stream: true,
      messages
    })
  })

  if (!upstream.ok) {
    const text = await upstream.text()
    return json({ error: 'upstream_error', detail: text.slice(0, 300) }, upstream.status, env, request)
  }

  const headers = new Headers(upstream.headers)
  headers.set('Content-Type', 'text/event-stream; charset=utf-8')
  headers.set('Cache-Control', 'no-cache')
  Object.entries(corsHeaders(env, request)).forEach(([k, v]) => headers.set(k, v))

  return new Response(upstream.body, { status: 200, headers })
}

/**
 * GET /api/health — 健康检查。
 */
function handleHealth(env: Env, request: Request): Response {
  return json({ ok: true, service: 'yi-cloud-api' }, 200, env, request)
}

export default {
  /**
   * Worker 入口。
   */
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(env, request) })
    }

    const url = new URL(request.url)
    try {
      if (url.pathname === '/api/health' && request.method === 'GET') {
        return handleHealth(env, request)
      }
      if (url.pathname === '/api/ai/chat' && request.method === 'POST') {
        return await handleAiChat(request, env)
      }
      return json({ error: 'not_found' }, 404, env, request)
    } catch (e) {
      const code = e instanceof Error ? e.message : 'ERROR'
      const status =
        code === 'UNAUTHORIZED'
          ? 401
          : code === 'EMAIL_NOT_VERIFIED'
            ? 403
            : code === 'NOT_MEMBER'
              ? 402
              : code === 'NO_LLM_CONFIG'
                ? 503
                : 500
      const msgMap: Record<string, string> = {
        UNAUTHORIZED: '请先登录',
        EMAIL_NOT_VERIFIED: '请先验证邮箱',
        NOT_MEMBER: '请开通会员后使用 AI',
        NO_LLM_CONFIG: '管理员尚未配置大模型',
        DB_ERROR: '数据库错误'
      }
      return json({ error: code, message: msgMap[code] || code }, status, env, request)
    }
  }
}
