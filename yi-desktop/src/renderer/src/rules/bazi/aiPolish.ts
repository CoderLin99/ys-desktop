/**
 * 可选 AI 润色：把规则断言的结构化结果交给 OpenAI 兼容接口改写成自然语言。
 * 默认关闭；密钥仅存本机 localStorage，不经过本应用后端。
 * Tauri 下经 Rust reqwest 代理，避免 WebView CORS 导致 Failed to fetch。
 * 润色默认走 SSE（stream:true），边收边回调，界面可逐字显示。
 * 润色时注入书库知识包 + 分区断语（总断/喜用格局/姻缘/事业/财运/学业等）。
 */
import { buildRagKnowledgeContext } from './rag/buildContext'
import { shouldUseCloudAi, cloudStreamChat, type CloudChatMessage } from './cloudAi'
import type { AssertionAiSections } from './assert'
import { modernYinStudyPromptGuide } from './studyTone'
import { modernFemaleMingPromptGuide } from './femaleTone'
import { plainTalkGlossaryGuide } from './jargonPlain'
import { buildMethodologyGuidePack } from './methodologyGuide'
import type { HeHunResult } from './hehun'
import {
  buildMingAgentRolePrompt,
  generalModulesPolishGuide,
  MING_DISCLAIMER_FOOTER,
  type MingAgentId
} from './mingAgents'
import { shenShaStackPromptGuide } from './shenshaStack'

/** 席位 id 再导出，保持 UI 仍可从 aiPolish 导入 */
export type { MingAgentId } from './mingAgents'
/** 席位下拉选项再导出（含 blurb；SelectButton 只用 label/id） */
export { MING_AGENT_OPTIONS } from './mingAgents'

/** 流式润色进度回调：accumulated 为已拼全文，delta 为本批新增字 */
export type AiPolishDeltaHandler = (accumulated: string, delta: string) => void

/** 逐字揭示控制器：目标文增长时按节拍往界面吐字，避免整包到达时一次性跳变 */
export interface TypewriterSink {
  /** 网络侧已拼出的全文推入揭示队列 */
  push: (accumulated: string) => void
  /** 等待揭示追上目标全文 */
  flush: () => Promise<void>
  /** 立刻显示全文并停止节拍 */
  snapTo: (text: string) => void
}

/**
 * 创建逐字揭示器：即使 SSE 分片很大或整包到达，界面仍按字蹦出。
 * @param onShow 把当前已显示文案写回 UI
 * @param options.intervalMs 每步间隔毫秒
 */
export function createTypewriterSink(
  onShow: (shown: string) => void,
  options?: { intervalMs?: number }
): TypewriterSink {
  const intervalMs = options?.intervalMs ?? 14
  let target = ''
  let shown = ''
  let timer: ReturnType<typeof setTimeout> | null = null
  const waiters: Array<() => void> = []

  /** 通知所有 flush 等待方 */
  const resolveWaiters = (): void => {
    while (waiters.length) waiters.shift()?.()
  }

  /** 节拍推进显示 */
  const tick = (): void => {
    if (shown.length >= target.length) {
      timer = null
      resolveWaiters()
      return
    }
    const remain = target.length - shown.length
    // 落后较多时一次多蹦几字，仍保持逐字感且不拖太久
    const step = remain > 120 ? 5 : remain > 40 ? 2 : 1
    shown = target.slice(0, shown.length + step)
    onShow(shown)
    timer = setTimeout(tick, intervalMs)
  }

  /** 确保节拍在跑 */
  const ensureTimer = (): void => {
    if (!timer) timer = setTimeout(tick, 0)
  }

  return {
    push(accumulated: string) {
      if (accumulated.length < target.length) {
        // 新一轮生成：重置
        target = accumulated
        shown = ''
        onShow('')
      } else {
        target = accumulated
      }
      ensureTimer()
    },
    flush() {
      return new Promise((resolve) => {
        if (shown.length >= target.length && !timer) {
          resolve()
          return
        }
        waiters.push(resolve)
        ensureTimer()
      })
    },
    snapTo(text: string) {
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
      target = text
      shown = text
      onShow(shown)
      resolveWaiters()
    }
  }
}

/** AI 润色配置 */
export interface AiPolishSettings {
  /** 是否启用 */
  enabled: boolean
  /** API 根路径，如 https://api.siliconflow.cn/v1 */
  baseUrl: string
  /** Bearer Token */
  apiKey: string
  /** 模型名 */
  model: string
  /**
   * 润色口风（独立于规则断言口吻）
   * study=正经复盘；fun=轻松戏说；ming=命理总批
   */
  polishTone: 'study' | 'fun' | 'ming'
  /**
   * 润色/推断是否自带白话大意（零基础可读）
   * 默认 true：每段先「白话：」再「术语：」，界面才能拆层切换
   */
  includePlainTalk: boolean
}

const STORAGE_KEY = 'yi-desktop-ai-polish'

/** 内置可试用的兼容端点提示（需用户自备免费额度 Key） */
export const AI_PROVIDER_HINTS = [
  {
    name: '硅基流动',
    baseUrl: 'https://api.siliconflow.cn/v1',
    model: 'Qwen/Qwen2.5-7B-Instruct',
    note: '注册后有免费额度'
  },
  {
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    note: '新用户常有赠送额度'
  },
  {
    name: '本地 Ollama',
    baseUrl: 'http://127.0.0.1:11434/v1',
    model: 'qwen2.5:7b',
    note: '完全免费，需本机已启动 Ollama'
  }
] as const

/**
 * 是否已具备可调用条件：有地址与模型；非本机服务时还需 Key。
 * 与八字页判定一致（不强制 enabled，避免「已配好却提示未配置」）。
 * @param settings AI 配置
 */
export function isAiConfigured(settings: AiPolishSettings): boolean {
  const url = (settings.baseUrl || '').trim()
  const model = (settings.model || '').trim()
  if (!url || !model) return false
  const isLocal = /127\.0\.0\.1|localhost/i.test(url)
  return isLocal || Boolean((settings.apiKey || '').trim())
}

/**
 * 读取本机保存的 AI 配置。
 */
export function loadAiSettings(): AiPolishSettings {
  const fallback: AiPolishSettings = {
    enabled: false,
    baseUrl: AI_PROVIDER_HINTS[0].baseUrl,
    apiKey: '',
    model: AI_PROVIDER_HINTS[0].model,
    /** 默认正经复盘，避免一上来就出游戏梗口吻 */
    polishTone: 'ming',
    /** 默认自带白话，方便没底子的人读懂 */
    includePlainTalk: true
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as Partial<AiPolishSettings>
    const polishTone =
      parsed.polishTone === 'fun' || parsed.polishTone === 'study' || parsed.polishTone === 'ming'
        ? parsed.polishTone
        : 'ming'
    const includePlainTalk =
      typeof parsed.includePlainTalk === 'boolean' ? parsed.includePlainTalk : true
    return { ...fallback, ...parsed, polishTone, includePlainTalk }
  } catch {
    return fallback
  }
}

/**
 * 保存 AI 配置到本机。
 * @param settings 配置
 */
export function saveAiSettings(settings: AiPolishSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

/**
 * 统一 HTTP：Tauri 走 Rust reqwest 代理，浏览器预览走 fetch。
 * @param url 完整 URL
 * @param init method / headers / body
 */
async function aiHttp(
  url: string,
  init: { method?: string; headers?: Record<string, string>; body?: string } = {}
): Promise<{ ok: boolean; status: number; text: string }> {
  const bridge = typeof window !== 'undefined' ? window.yiDesktop?.aiFetch : undefined
  if (bridge) {
    try {
      const res = await bridge({
        url,
        method: init.method,
        headers: init.headers,
        body: init.body
      })
      return { ok: res.ok, status: res.status, text: res.body }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      throw new Error(`原生层请求失败：${msg}`)
    }
  }

  try {
    const res = await fetch(url, {
      method: init.method ?? 'GET',
      headers: init.headers,
      body: init.body
    })
    return { ok: res.ok, status: res.status, text: await res.text() }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (/failed to fetch|networkerror|load failed/i.test(msg)) {
      throw new Error(
        '网络请求失败（Failed to fetch）。请用桌面/安卓窗口（Tauri 原生代理）；浏览器预览可能被 CORS 拦截。'
      )
    }
    throw e instanceof Error ? e : new Error(msg)
  }
}

/**
 * 解析 OpenAI 兼容 SSE 文本缓冲，抽出 delta.content，返回未拼完的残余行。
 * @param buffer 累计未消费的 SSE 文本
 * @param onDelta 每段 content 增量回调
 * @returns 尚未形成完整行的残余 buffer
 */
export function consumeOpenAiSseBuffer(
  buffer: string,
  onDelta: (delta: string) => void
): string {
  const lines = buffer.split(/\r?\n/)
  // 最后一段可能不完整，留到下次
  const rest = lines.pop() ?? ''
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed.startsWith('data:')) continue
    const data = trimmed.slice(5).trim()
    if (!data || data === '[DONE]') continue
    try {
      const json = JSON.parse(data) as {
        choices?: { delta?: { content?: string }; message?: { content?: string } }[]
      }
      const delta =
        json.choices?.[0]?.delta?.content ?? json.choices?.[0]?.message?.content ?? ''
      if (delta) onDelta(delta)
    } catch {
      // 半包 JSON 或非 JSON 行忽略
    }
  }
  return rest
}

/**
 * 生成流式会话 id（多路分片区分用）。
 */
function createStreamId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `s-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

/**
 * 流式 HTTP：优先 Tauri SSE；若仅有整包代理则解析后再吐；最后才直连 fetch。
 * @param url 完整 URL
 * @param init method / headers / body
 * @param onRawChunk 原始响应文本分片（尚未解析 SSE）
 */
async function aiHttpStream(
  url: string,
  init: { method?: string; headers?: Record<string, string>; body?: string },
  onRawChunk: (chunk: string) => void
): Promise<{ ok: boolean; status: number; errorBody?: string }> {
  const desk = typeof window !== 'undefined' ? window.yiDesktop : undefined
  const streamId = createStreamId()

  // 1) 新 preload：真流式
  if (desk?.aiFetchStream && desk.onAiStreamChunk) {
    const unsubscribe = desk.onAiStreamChunk((payload) => {
      if (payload.streamId === streamId) onRawChunk(payload.chunk)
    })
    try {
      const res = await desk.aiFetchStream({
        url,
        method: init.method,
        headers: init.headers,
        body: init.body,
        streamId
      })
      return { ok: res.ok, status: res.status, errorBody: res.body }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      throw new Error(`原生层请求失败：${msg}`)
    } finally {
      unsubscribe()
    }
  }

  // 2) 旧 preload / 未热更新：仍走主进程整包代理，避免 CORS Failed to fetch
  if (desk?.aiFetch) {
    try {
      const res = await desk.aiFetch({
        url,
        method: init.method,
        headers: init.headers,
        body: init.body
      })
      if (!res.ok) return { ok: false, status: res.status, errorBody: res.body }
      if (res.body) onRawChunk(res.body)
      return { ok: true, status: res.status }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      throw new Error(`原生层请求失败：${msg}`)
    }
  }

  // 3) 纯浏览器预览（无 yiDesktop）
  try {
    const res = await fetch(url, {
      method: init.method ?? 'GET',
      headers: init.headers,
      body: init.body
    })
    if (!res.ok) {
      return { ok: false, status: res.status, errorBody: await res.text() }
    }
    if (!res.body) {
      const text = await res.text()
      if (text) onRawChunk(text)
      return { ok: true, status: res.status }
    }
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value, { stream: true })
      if (chunk) onRawChunk(chunk)
    }
    const tail = decoder.decode()
    if (tail) onRawChunk(tail)
    return { ok: true, status: res.status }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (/failed to fetch|networkerror|load failed/i.test(msg)) {
      throw new Error(
        '网络请求失败（Failed to fetch）。请完全退出后重新运行 npm run dev 打开桌面窗口（勿用纯浏览器预览）；主进程代理可规避 CORS。'
      )
    }
    throw e instanceof Error ? e : new Error(msg)
  }
}

/**
 * 从 OpenAI 兼容接口拉取可用模型列表（DeepSeek / 硅基流动 / Ollama 等均支持 GET /models）。
 * @param settings 含 baseUrl 与 apiKey
 * @returns 模型 id 列表（已排序）
 */
export async function fetchAiModels(settings: Pick<AiPolishSettings, 'baseUrl' | 'apiKey'>): Promise<string[]> {
  const base = settings.baseUrl.replace(/\/$/, '')
  if (!base) throw new Error('请先填写 Base URL')
  if (!settings.apiKey.trim() && !base.includes('127.0.0.1')) {
    throw new Error('拉取模型需要 API Key（本地 Ollama 可留空）')
  }

  const headers: Record<string, string> = { Accept: 'application/json' }
  if (settings.apiKey.trim()) {
    headers.Authorization = `Bearer ${settings.apiKey.trim()}`
  }

  const res = await aiHttp(`${base}/models`, { method: 'GET', headers })
  if (!res.ok) {
    throw new Error(`拉取模型失败 HTTP ${res.status}${res.text ? `：${res.text.slice(0, 180)}` : ''}`)
  }

  let data: { data?: { id?: string }[] }
  try {
    data = JSON.parse(res.text) as { data?: { id?: string }[] }
  } catch {
    throw new Error('模型列表返回不是合法 JSON')
  }

  const ids = (data.data ?? [])
    .map((m) => m.id?.trim())
    .filter((id): id is string => Boolean(id))

  // 去重并排序，对话类模型尽量靠前（含 chat / instruct）
  const unique = [...new Set(ids)]
  unique.sort((a, b) => {
    const score = (id: string) =>
      /chat|instruct|deepseek-chat/i.test(id) ? 0 : /reasoner|r1/i.test(id) ? 1 : 2
    const d = score(a) - score(b)
    return d !== 0 ? d : a.localeCompare(b)
  })
  if (!unique.length) throw new Error('接口未返回任何模型，请检查 Key 与 Base URL')
  return unique
}

/** DeepSeek 官方余额条目 */
export interface DeepSeekBalanceInfo {
  /** 币种，如 CNY / USD */
  currency: string
  /** 总余额 */
  total: string
  /** 赠金 */
  granted: string
  /** 充值余额 */
  toppedUp: string
}

/** DeepSeek 余额查询结果 */
export interface DeepSeekBalanceResult {
  /** 账户是否可用 */
  available: boolean
  /** 各币种余额 */
  infos: DeepSeekBalanceInfo[]
  /** 给界面看的一行摘要 */
  summary: string
}

/**
 * 把余额接口失败转成用户能看懂的话（不抛技术栈原文）。
 * @param status HTTP 状态；网络层失败传 0
 * @param body 响应正文片段
 * @returns 人话错误
 */
export function humanizeDeepSeekBalanceError(status: number, body = ''): string {
  const snippet = body.replace(/\s+/g, ' ').slice(0, 80)
  if (status === 0) {
    return '连不上 DeepSeek 余额接口。请检查网络，或用桌面窗口打开（纯浏览器预览可能被跨域拦住）。'
  }
  if (status === 401 || status === 403) {
    return '密钥无效或没有余额查询权限，请到「大模型」页核对 DeepSeek API Key。'
  }
  if (status === 402) return '账户余额不足，请到 DeepSeek 开放平台充值后再用。'
  if (status === 429) return '查询太频繁，请稍等一会儿再试。'
  if (status >= 500) return 'DeepSeek 服务暂时不可用，请稍后再查余额。'
  if (status === 404) return '余额接口地址无效。请确认使用官方 https://api.deepseek.com 。'
  return snippet
    ? `查询余额失败（HTTP ${status}）：${snippet}`
    : `查询余额失败（HTTP ${status}），请稍后重试。`
}

/**
 * 查询 DeepSeek 官方账户余额（GET /user/balance，Bearer Key）。
 * @param apiKey 用户填写的 API Key
 * @returns 余额摘要
 */
export async function fetchDeepSeekBalance(apiKey: string): Promise<DeepSeekBalanceResult> {
  const key = apiKey.trim()
  if (!key) {
    throw new Error('还没有填写 API Key。请先到「大模型」页保存 DeepSeek 密钥，再查余额。')
  }

  let res: { ok: boolean; status: number; text: string }
  try {
    res = await aiHttp('https://api.deepseek.com/user/balance', {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${key}`
      }
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (/failed to fetch|networkerror|load failed|原生层/i.test(msg)) {
      throw new Error(humanizeDeepSeekBalanceError(0))
    }
    throw new Error(msg.includes('请先') ? msg : `查询余额失败：${msg}`)
  }

  if (!res.ok) {
    throw new Error(humanizeDeepSeekBalanceError(res.status, res.text))
  }

  let data: {
    is_available?: boolean
    balance_infos?: Array<{
      currency?: string
      total_balance?: string
      granted_balance?: string
      topped_up_balance?: string
    }>
  }
  try {
    data = JSON.parse(res.text) as typeof data
  } catch {
    throw new Error('余额接口返回不是合法 JSON，请稍后重试。')
  }

  const infos: DeepSeekBalanceInfo[] = (data.balance_infos ?? []).map((row) => ({
    currency: row.currency?.trim() || '未知币种',
    total: row.total_balance?.trim() || '0',
    granted: row.granted_balance?.trim() || '0',
    toppedUp: row.topped_up_balance?.trim() || '0'
  }))
  if (!infos.length) {
    throw new Error('接口没有返回余额条目。请确认这是 DeepSeek 平台发放的 Key。')
  }

  const summary = infos
    .map((info) => {
      const unit = info.currency === 'CNY' ? '¥' : info.currency === 'USD' ? '$' : `${info.currency} `
      return `${unit}${info.total}`
    })
    .join(' / ')

  return {
    available: Boolean(data.is_available),
    infos,
    summary: data.is_available === false ? `${summary}（账户暂不可用）` : summary
  }
}

/**
 * 坐堂断命白话口风：要有推断别人命数的篇幅，不要提纲。
 * @returns 提示词片段
 */
export function mingNarrativeGuide(): string {
  return [
    '【断命口风】白话要像坐堂给别人批命，不是写摘要、不是课堂提纲。',
    '每个「白话：」至少 4～8 句、大约 120 字以上，用「你」直接对人说话，让外行听完能想象这个人近几年怎么过日子。',
    '顺序：先断这个人什么样（气场、做事习惯、吃力还是扛得住），再断事（婚、工、钱、家人、身体），再落到近几年怎么走。',
    '必须有【流年】分区：根据「默认岁运窗口」里已给的年份，逐年各写至少两句（工作、钱、关系、身体哪头更显），吉凶并陈。窗口没有的年份不许编。',
    '【应期】写十年大运主题；【流年】写逐年窗口。润色正文里两者都要有，不能等追问才写流年。',
    '白话禁止：利：/弊：条列、一两句口号、关键词堆砌、半吊子专名单独出现（身弱、用神、月令、正官、日主、喜用、忌神等）。',
    '专名若必须出现：第一次写成「人话（命理叫某某）」，后文只留人话。',
    '要有推断感：明确说宜动还是宜守、晚成还是可成、这几年顺还是磨，同时说风险。禁止编造车祸、中奖、具体恋爱次数。'
  ].join('')
}

/**
 * 白话/术语双行固定格式（不含口风与对照表，避免与其它 guide 重复注入）。
 * @param sectionNames 允许的分区名列表文案（顿号分隔）
 * @returns 提示词片段
 */
export function plainTalkFormatGuide(sectionNames: string): string {
  return [
    '【白话与术语必须拆开】每个分区各自成块，禁止把白话和术语写在同一段。',
    '格式固定为：',
    '【分区名】',
    '白话：完全写成现代人能听懂的话，像坐堂对面把命数讲清楚。禁止只抛专名，禁止写成两三句提纲。',
    '术语：只写命理依据，供对照，不要重复白话故事。',
    `分区名用：${sectionNames}。`,
    '服务对象是零基础、没学过命理的普通人：只看「白话：」就要懂这段在说生活里的什么事、这几年怎么走。'
  ].join('')
}

/**
 * 润色输出中的「白话优先」格式说明（注入 system/user）。
 * @returns 提示词片段
 */
export function plainTalkOutputGuide(): string {
  return [
    plainTalkFormatGuide('总断、喜用格局、姻缘、事业、财运、学业、六亲、健康、应期、流年'),
    mingNarrativeGuide(),
    plainTalkGlossaryGuide(),
    modernYinStudyPromptGuide(),
    modernFemaleMingPromptGuide()
  ].join('')
}

/**
 * 组装「把已有润色文译成白话」的 system/user。
 * @param sourceText 待翻译的 AI 润色正文
 */
export function buildPlainTalkTranslateMessages(sourceText: string): {
  system: string
  user: string
} {
  const system = [
    '你是坐堂命师的白话改写助手，服务对象是零基础读者，要把总批改写成「推断别人命数」的口吻。',
    '任务：把用户给出的「AI 润色断言」改写成现代人能懂、有篇幅的断命白话，保留分区结构（总断、喜用格局、姻缘、事业、财运、学业、六亲、健康、应期、流年）。',
    '每个「白话：」至少 4～8 句，像对面把这个人近几年怎么过日子讲清楚；不要压缩成提纲。',
    '专名第一次写成「人话（命理叫某某）」，后文只留人话；禁止白话里单独出现身弱、用神、月令、正官、日主。',
    '「术语：」一行只注释依据，不要把专名堆回白话段。',
    '若原文没有【流年】但用户材料里有年份窗口，按窗口补写【流年】逐年解读；没有窗口则写「本局未给流年材料，略」。',
    mingNarrativeGuide(),
    plainTalkGlossaryGuide(),
    '禁止编造原文没有的结论、神煞或人生事件；禁止游戏梗；少用绝对化措辞。',
    modernYinStudyPromptGuide(),
    modernFemaleMingPromptGuide(),
    `全文结尾先可写岁运参详，最后必须单独一段原句照抄：${MING_DISCLAIMER_FOOTER}`
  ].join('')
  const user = [
    '请把下面这篇八字润色文改写成零基础也能听懂、有断命感的现代化白话（可保留原分区标题）：',
    '',
    '--------',
    sourceText.trim(),
    '--------'
  ].join('\n')
  return { system, user }
}

/**
 * 将分区断语格式化为 prompt 文本块。
 * @param sections AI 分区载荷
 * @returns 分区纯文本
 */
export function formatAiSectionsForPrompt(sections: AssertionAiSections): string {
  const lines: string[] = [`【总断】${sections.总断}`, '']

  /** 追加非空分区 */
  const pushBlock = (title: string, texts: string[]): void => {
    if (!texts.length) return
    lines.push(`【${title}】`)
    for (const t of texts) lines.push(`- ${t}`)
    lines.push('')
  }

  pushBlock('喜用格局', sections.喜用格局)
  pushBlock('姻缘', sections.姻缘)
  pushBlock('事业', sections.事业)
  pushBlock('财运', sections.财运)
  pushBlock('学业', sections.学业)
  pushBlock('六亲', sections.六亲)
  pushBlock('健康', sections.健康)
  pushBlock('应期', sections.应期)
  pushBlock('十神', sections.十神)
  pushBlock('神煞（辅证，不得压过用神）', sections.神煞)
  pushBlock('经典义理', sections.经典)
  pushBlock('提示', sections.提示)
  lines.push(`【声明】${sections.声明}`)
  return lines.join('\n')
}

/**
 * 组装润色用的 system / user 消息与请求头。
 * @param structured 规则层结构化摘要
 * @param sectionsOrTexts 分区或扁平断语
 * @param settings API 配置
 * @param tone 语气
 * @param ruleTexts 可选补充扁平断语
 * @param extraContext 可选：点选大运/流年/流月等命师上下文
 */
async function buildPolishMessages(
  structured: Record<string, unknown>,
  sectionsOrTexts: AssertionAiSections | string[],
  settings: AiPolishSettings,
  tone: 'study' | 'fun' | 'ming',
  ruleTexts?: string[],
  extraContext?: string
): Promise<{
  url: string
  headers: Record<string, string>
  body: string
}> {
  if (!settings.apiKey.trim() && !settings.baseUrl.includes('127.0.0.1')) {
    throw new Error('请先填写 API Key（本地 Ollama 可留空）')
  }
  const base = settings.baseUrl.replace(/\/$/, '')
  const url = `${base}/chat/completions`

  /** 书库 RAG：离线 BM25 检索 ctext 原文片段；无索引时回退义理摘要 */
  const isSections = !Array.isArray(sectionsOrTexts)
  const knowledgePack = [
    await buildRagKnowledgeContext({
      structured,
      sections: isSections ? sectionsOrTexts : undefined,
      extraContext
    }),
    buildMethodologyGuidePack()
  ].join('\n\n')

  /** 是否为分区对象（prompt 格式化） */
  const sectionBlock = isSections
    ? formatAiSectionsForPrompt(sectionsOrTexts)
    : ['【规则断语（扁平）】', ...(sectionsOrTexts as string[]).map((t) => `- ${t}`)].join('\n')
  const legacyFlat =
    ruleTexts?.length && isSections
      ? `\n【补充扁平断语】\n${ruleTexts.map((t) => `- ${t}`).join('\n')}`
      : ''

  const wantPlain = settings.includePlainTalk !== false
  const plainGuide = wantPlain ? plainTalkOutputGuide() : ''

  const system =
    tone === 'fun'
      ? [
          '你是娱乐向八字说书人。只能根据用户给出的「已计算事实」「分区规则断语」与「书库检索段落」改写，',
          '禁止编造未提供的神煞、大运、流年、紫微星曜或具体人生事件。',
          '评价优先级：月令/格局/喜用 > 调候/通关 > 姻缘事业财运学业专项 > 神煞证；神煞不得压过用神。',
          '谈及神煞必须复述「查法+本盘依据」，禁止只写空象意或编造未给出的神煞。',
          '必须按分区输出，使用小标题：总断、喜用格局、姻缘、事业、财运、学业；无材料的分区写「本局材料不足，略」。',
          '可点名书名作「取某某书大意」，禁止伪造原文诗句。',
          '语气轻松夸张，可适度比喻，全文结尾必须写明「纯属娱乐，切勿当真」。',
          modernYinStudyPromptGuide(),
          modernFemaleMingPromptGuide(),
          wantPlain
            ? '即使娱乐口风，也须让没学过命理的人读懂：每段先「白话：」再说人话，术语放「术语：」一行括号注释。'
            : ''
        ].join('')
      : tone === 'ming'
        ? [
            '你是子平命师，根据已计算事实写命书总批，要有坐堂推断命数的篇幅，不是课堂讲义，也不是两三句提纲。',
            '只能根据「已计算事实」「分区规则断语」「默认岁运窗口」与「书库检索段落」下判断；禁止编造未提供的神煞、大运、流年、紫微星曜或具体私人事件（车祸、中奖年份等）。',
            '评价优先级：月令提纲 → 穷通取用 → 成格破格 → 身强弱与用神 → 六亲宫 → 姻缘事业财运学业健康 → 岁运应期 → 流年窗口 → 神煞辅证。',
            '神煞段必须引用事实包中的查法与本盘依据；禁止空口象意、禁止加戏。',
            '强弱/喜用/从格/起运亦须引用「可复盘依据」中的查法与本盘，禁止空口白话。',
            '必须按分区输出：总断、喜用格局、姻缘、事业、财运、学业、六亲、健康、应期、流年。',
            /** 总师级模块细项：事业职业倾向/创业打工/层次等 */
            generalModulesPolishGuide(),
            /** 同名多柱叠见：相关度↑≠吉凶倍增 */
            shenShaStackPromptGuide(),
            '【流年】必须根据「默认岁运窗口」逐年写，不能留给追问。窗口里的每一年至少两句白话。',
            '准许下明确吉凶（如婚宜晚成、此运可进、忌神年宜守），白话里用完整句子把利与弊编织进去，不要写成「利：」「弊：」条列。',
            '男命妻星=我克者（壬水克火为财，土是官杀不是老婆）；女命夫星=克我者（官杀）。',
            '妻/夫年龄只按正财/正官落年日月时写倾向（年偏大、日相当、时偏小），禁止写「不可能比自己大」。',
            '情缘只许写少/中/多波折，婚质写可成/晚成/口舌/分合，禁止写「谈过N次恋爱」。',
            '事业须点名任职方式（官职/技艺/印绶/财营/合伙）与用神对应行业象，禁止保证工种或点名具体公司。',
            modernYinStudyPromptGuide(),
            modernFemaleMingPromptGuide(),
            mingNarrativeGuide(),
            '禁止写：教学近似、勿当真；禁止另造其它免责套话冲淡断命口风。',
            '可点名书名作「取某某书大意」，禁止伪造原文。',
            `全文结尾先可写「岁运仍须逐年参详」，最后必须单独一段原句照抄：${MING_DISCLAIMER_FOOTER}`,
            wantPlain
              ? '每段必须同时给出「白话：」与「术语：」两行，且拆开写。白话像跟没学过命理的人把命讲明白，对照表左侧专名不得单独出现在白话里。'
              : '只写「术语：」依据即可。'
          ].join('')
        : [
          '你是八字义理复盘助手，口风须正经、平实、克制，像课堂讲义而非段子。',
          '只能根据用户给出的「已计算事实」「分区规则断语」与「书库检索段落」组织评价；',
          '禁止编造未提供的神煞、大运、流年、紫微星曜或具体人生事件。',
          '评价优先级：月令提纲 → 格局有情/破格 → 身强弱与喜用 → 调候/通关 → 姻缘/事业/财运/学业专项 → 神煞证。',
          '神煞须写出查法与本盘命中依据，禁止空口白话。',
          '必须按分区输出，使用小标题：总断、喜用格局、姻缘、事业、财运、学业；无材料的分区写「本局材料不足，略」。',
          '可点名书名说明依据（如「依子平真诠大意」），禁止伪造原文。',
          '若输入断语含戏说、网络梗、游戏比喻，请改写成正经书面表述，保留义理要点，删除夸张措辞。',
          '禁止使用：游戏通关、开局、Boss、DLC、加载进度、血条、彩蛋、段子式排比等娱乐修辞。',
          '少用绝对化（必、一定、终身注定）；全文结尾提醒：仅供学习复盘，非命运判决。',
          modernYinStudyPromptGuide(),
          modernFemaleMingPromptGuide(),
          plainGuide
        ].join('')

  const user = [
    knowledgePack,
    '',
    '【本局已计算事实】',
    JSON.stringify(structured, null, 2),
    '',
    '【分区规则断语】',
    sectionBlock,
    legacyFlat,
    extraContext?.trim() ? `\n【默认岁运窗口 / 点选加写】\n${extraContext.trim()}\n` : '',
    '',
    tone === 'fun'
      ? '请严格基于以上事实与分区断语，结合书库检索段落，按「总断→喜用格局→姻缘→事业→财运→学业」输出评价；专项结论不得与喜用格局矛盾。'
      : tone === 'ming'
        ? '请按命书总批来写，严格基于以上事实、分区断语与默认岁运窗口；顺序为总断→喜用格局→姻缘→事业→财运→学业→六亲→健康→应期→流年。每个分区先「白话：」再「术语：」，白话要有断命篇幅。流年必须按窗口逐年写，不得留到追问。专项不得与用神矛盾。'
        : '请以正经复盘口风，严格基于以上事实与分区断语，结合书库检索段落，按「总断→喜用格局→姻缘→事业→财运→学业」输出书面评价；专项结论不得与喜用格局矛盾；勿用娱乐修辞。',
    wantPlain
      ? '务必遵守白话优先与断命口风：没底子的人只看「白话：」段就能明白这个人什么样、这几年怎么走；术语仅作对照，不得喧宾夺主。'
      : ''
  ]
    .filter((x) => x !== '')
    .join('\n')

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'text/event-stream'
  }
  if (settings.apiKey.trim()) {
    headers.Authorization = `Bearer ${settings.apiKey.trim()}`
  }

  const body = JSON.stringify({
    model: settings.model,
    temperature: tone === 'fun' ? 0.7 : tone === 'ming' ? 0.55 : 0.4,
    stream: true,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ]
  })

  return { url, headers, body }
}

/**
 * 推断模式 system 提示：在规则事实基础上延伸推断，禁止与用神/强弱矛盾。
 * @param wantPlain 是否要求白话/术语双行（须与润色共用同一套拆层格式，否则界面无法切「白话」）
 */
export function buildInferSystemPrompt(wantPlain: boolean): string {
  /** 推断分区名：比润色多「格局取舍 / 岁运应期 / 流年窗口」 */
  const inferSections =
    '总断、格局取舍、喜用格局、岁运应期、姻缘、事业、财运、学业、六亲、健康、流年窗口'
  return [
    '你是子平命师，任务是在「已计算事实」「分区规则断语」「默认岁运窗口」与「书库检索段落」之上做**延伸推断**，不是简单改写断语。',
    '推断重点：格局取舍（成格/破格/从格倾向与取舍理由）、岁运应期（哪步大运/哪几年宜进宜守）、六亲宫位联动、姻缘事业财运的时序节奏。',
    '须严格服从规则层给出的日主强弱、用神、忌神；延伸推断不得与用神/强弱结论矛盾，不得推翻规则总断。',
    '禁止编造未提供的神煞、具体私人事件（车祸、中奖日期、谈过几次恋爱等）、未给出的流年干支或紫微星曜。',
    '可写倾向、窗口、节奏、取舍，但不得写「某年必发生某某事」；应期只写到步运/流年档位与吉凶方向。',
    `必须按分区输出：${inferSections}。`,
    '【流年窗口】须据「默认岁运窗口」逐年推断节奏，至少写近几流年各两句。',
    '男命妻星=我克（财）；女命夫星=克我（官杀）。情缘只许少/中/多波折。',
    mingNarrativeGuide(),
    plainTalkGlossaryGuide(),
    modernYinStudyPromptGuide(),
    modernFemaleMingPromptGuide(),
    '禁止另造其它免责套话冲淡推断口风。',
    `全文结尾先可写「岁运仍须逐年参详」，最后必须单独一段原句照抄：${MING_DISCLAIMER_FOOTER}`,
    // 与润色共用固定「白话：/术语：」格式，否则 parsePolishLayers 拆不开，页签「白话总批」会一直禁用
    wantPlain
      ? plainTalkFormatGuide(inferSections)
      : '只写「术语：」推断链即可，不要写「白话：」行。'
  ].join('')
}

/**
 * 组装 AI 推断用的 system / user 消息与请求头（输入与润色相同：结构化事实 + 分区 + RAG + 方法论）。
 * @param structured 规则层结构化摘要
 * @param sectionsOrTexts 分区或扁平断语
 * @param settings API 配置
 * @param extraContext 可选：点选大运/流年/流月
 */
export async function buildInferMessages(
  structured: Record<string, unknown>,
  sectionsOrTexts: AssertionAiSections | string[],
  settings: AiPolishSettings,
  extraContext?: string
): Promise<{
  url: string
  headers: Record<string, string>
  body: string
}> {
  if (!settings.apiKey.trim() && !settings.baseUrl.includes('127.0.0.1')) {
    throw new Error('请先填写 API Key（本地 Ollama 可留空）')
  }
  const base = settings.baseUrl.replace(/\/$/, '')
  const url = `${base}/chat/completions`

  const isSections = !Array.isArray(sectionsOrTexts)
  const knowledgePack = [
    await buildRagKnowledgeContext({
      structured,
      sections: isSections ? sectionsOrTexts : undefined,
      extraContext
    }),
    buildMethodologyGuidePack()
  ].join('\n\n')

  const sectionBlock = isSections
    ? formatAiSectionsForPrompt(sectionsOrTexts)
    : ['【规则断语（扁平）】', ...(sectionsOrTexts as string[]).map((t) => `- ${t}`)].join('\n')

  const wantPlain = settings.includePlainTalk !== false
  const system = buildInferSystemPrompt(wantPlain)

  const user = [
    knowledgePack,
    '',
    '【本局已计算事实（推断不得与之矛盾）】',
    JSON.stringify(structured, null, 2),
    '',
    '【分区规则断语（推断起点，可延伸不可推翻）】',
    sectionBlock,
    extraContext?.trim() ? `\n【默认岁运窗口 / 点选加写】\n${extraContext.trim()}\n` : '',
    '',
    '请严格基于以上材料做延伸推断：先总断，再写格局取舍与岁运应期，然后展开姻缘/事业/财运/学业等专项；专项须与用神一致。',
    wantPlain
      ? '白话段要让零基础读者读懂推断逻辑；术语段列子平依据与典籍取义。'
      : ''
  ]
    .filter((x) => x !== '')
    .join('\n')

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'text/event-stream'
  }
  if (settings.apiKey.trim()) {
    headers.Authorization = `Bearer ${settings.apiKey.trim()}`
  }

  const body = JSON.stringify({
    model: settings.model,
    temperature: 0.58,
    stream: true,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ]
  })

  return { url, headers, body }
}

/**
 * 执行已组装的 SSE 流式 Chat 请求并返回全文。
 * @param built buildPolishMessages / buildInferMessages 的返回值
 * @param onDelta 增量回调
 */
async function streamBuiltChatRequest(
  built: { url: string; headers: Record<string, string>; body: string },
  onDelta?: AiPolishDeltaHandler
): Promise<string> {
  /** Web 会员模式：改走 Cloudflare Worker，不直连大模型 */
  if (shouldUseCloudAi()) {
    const payload = JSON.parse(built.body) as {
      messages?: CloudChatMessage[]
      temperature?: number
    }
    if (!payload.messages?.length) throw new Error('AI 请求缺少 messages')
    return cloudStreamChat(payload.messages, payload.temperature ?? 0.7, onDelta)
  }

  let sseBuffer = ''
  let full = ''

  /** 处理原始分片：解析 SSE 并累加正文 */
  const handleRaw = (chunk: string): void => {
    sseBuffer = consumeOpenAiSseBuffer(sseBuffer + chunk, (delta) => {
      full += delta
      onDelta?.(full, delta)
    })
  }

  const res = await aiHttpStream(built.url, { method: 'POST', headers: built.headers, body: built.body }, handleRaw)

  if (!res.ok) {
    const errText = res.errorBody ?? ''
    throw new Error(`AI 请求失败 HTTP ${res.status}${errText ? `：${errText.slice(0, 200)}` : ''}`)
  }

  sseBuffer = consumeOpenAiSseBuffer(sseBuffer + '\n', (delta) => {
    full += delta
    onDelta?.(full, delta)
  })

  const text = full.trim()
  if (!text) throw new Error('AI 返回为空')
  return text
}

/**
 * 调用兼容 Chat Completions 接口润色断言（默认 SSE 流式）。
 * @param structured 规则层结构化摘要（事实）
 * @param sectionsOrTexts 分区断语（总断/姻缘/事业等），或兼容旧调用的扁平断语列表
 * @param settings API 配置
 * @param tone 学习 / 娱乐语气
 * @param ruleTexts 可选：额外扁平断语
 * @param onDelta 可选：每收到增量字时回调（用于界面逐字蹦出）
 * @param extraContext 可选：点选大运/流年事实，注入润色上下文
 * @returns 润色后的自然语言全文
 */
export async function polishAssertionWithAi(
  structured: Record<string, unknown>,
  sectionsOrTexts: AssertionAiSections | string[],
  settings: AiPolishSettings,
  tone: 'study' | 'fun' | 'ming' = 'ming',
  ruleTexts?: string[],
  onDelta?: AiPolishDeltaHandler,
  extraContext?: string
): Promise<string> {
  const built = await buildPolishMessages(
    structured,
    sectionsOrTexts,
    settings,
    tone,
    ruleTexts,
    extraContext
  )
  return streamBuiltChatRequest(built, onDelta)
}

/**
 * AI 推断模式：在规则事实与分区断语基础上延伸推断（格局取舍、岁运应期等）。
 * @param structured 规则层结构化摘要
 * @param sectionsOrTexts 分区断语
 * @param settings API 配置
 * @param onDelta 流式回调
 * @param extraContext 可选岁运上下文
 */
export async function inferAssertionWithAi(
  structured: Record<string, unknown>,
  sectionsOrTexts: AssertionAiSections | string[],
  settings: AiPolishSettings,
  onDelta?: AiPolishDeltaHandler,
  extraContext?: string
): Promise<string> {
  const built = await buildInferMessages(structured, sectionsOrTexts, settings, extraContext)
  return streamBuiltChatRequest(built, onDelta)
}

/**
 * 通用流式 Chat Completions：解析 SSE 并回调增量。
 * @param settings API 配置
 * @param messages 完整消息列表（含 system）
 * @param temperature 采样温度
 * @param onDelta 增量回调
 */
async function streamChatMessages(
  settings: AiPolishSettings,
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  temperature: number,
  onDelta?: AiPolishDeltaHandler
): Promise<string> {
  /** Web 会员模式：云端代理 */
  if (shouldUseCloudAi()) {
    return cloudStreamChat(messages, temperature, onDelta)
  }

  if (!settings.apiKey.trim() && !settings.baseUrl.includes('127.0.0.1')) {
    throw new Error('请先填写 API Key（本地 Ollama 可留空）')
  }
  const base = settings.baseUrl.replace(/\/$/, '')
  const url = `${base}/chat/completions`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'text/event-stream'
  }
  if (settings.apiKey.trim()) {
    headers.Authorization = `Bearer ${settings.apiKey.trim()}`
  }
  const body = JSON.stringify({
    model: settings.model,
    temperature,
    stream: true,
    messages
  })

  let sseBuffer = ''
  let full = ''
  const handleRaw = (chunk: string): void => {
    sseBuffer = consumeOpenAiSseBuffer(sseBuffer + chunk, (delta) => {
      full += delta
      onDelta?.(full, delta)
    })
  }

  const res = await aiHttpStream(url, { method: 'POST', headers, body }, handleRaw)
  if (!res.ok) {
    const errText = res.errorBody ?? ''
    throw new Error(`AI 请求失败 HTTP ${res.status}${errText ? `：${errText.slice(0, 200)}` : ''}`)
  }
  sseBuffer = consumeOpenAiSseBuffer(sseBuffer + '\n', (delta) => {
    full += delta
    onDelta?.(full, delta)
  })
  const text = full.trim()
  if (!text) throw new Error('AI 返回为空')
  return text
}

/**
 * 两段式润色：system + user。
 * @param settings API 配置
 * @param system system 提示
 * @param user user 内容
 * @param temperature 采样温度
 * @param onDelta 增量回调
 */
async function streamChatCompletion(
  settings: AiPolishSettings,
  system: string,
  user: string,
  temperature: number,
  onDelta?: AiPolishDeltaHandler
): Promise<string> {
  return streamChatMessages(
    settings,
    [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ],
    temperature,
    onDelta
  )
}

/**
 * 对外简易对话（风水/紫微等模块复用）。
 * @param settings API 配置
 * @param system system 提示
 * @param user user 内容
 * @param temperature 温度
 * @param onDelta 增量回调
 */
export async function runSimpleAiChat(
  settings: AiPolishSettings,
  system: string,
  user: string,
  temperature = 0.55,
  onDelta?: AiPolishDeltaHandler
): Promise<string> {
  if (!settings.enabled) throw new Error('请先在「大模型」页启用并配置 API')
  if (!settings.apiKey?.trim()) throw new Error('缺少 API Key')
  return streamChatCompletion(settings, system, user, temperature, onDelta)
}

/** 拆开后的一个分区 */
export interface PolishLayerSection {
  /** 分区标题，如姻缘 */
  title: string
  /** 白话断语（已去掉「白话：」前缀） */
  plain: string
  /** 术语依据（已去掉「术语：」前缀） */
  jargon: string
}

/** 润色文拆层结果，供界面分栏 */
export interface PolishLayers {
  /** 各分区 */
  sections: PolishLayerSection[]
  /** 只拼白话 */
  plainText: string
  /** 只拼术语 */
  jargonText: string
  /** 是否成功拆出至少一段白话或术语标签 */
  hasSplit: boolean
}

/**
 * 从润色全文拆出白话 / 术语，避免混在同一段里展示。
 * 识别 【姻缘】、**姻缘**、## 姻缘 标题，以及「白话：」「术语：」标签。
 * @param text 模型原文
 */
export function parsePolishLayers(text: string): PolishLayers {
  const raw = (text || '').replace(/\r\n/g, '\n').trim()
  if (!raw) {
    return { sections: [], plainText: '', jargonText: '', hasSplit: false }
  }

  const chunks = raw.split(/(?=^#{1,3}\s+\S|^【[^】]+】|^\*\*[^*\n]+\*\*)/m).filter((c) => c.trim())
  const sections: PolishLayerSection[] = []
  let hasSplit = false

  for (const chunk of chunks) {
    const lines = chunk.trim().split('\n')
    const head = lines[0]?.trim() ?? ''
    const title =
      head.match(/^\*\*(.+?)\*\*$/)?.[1]?.trim() ||
      head.match(/^【(.+?)】$/)?.[1]?.trim() ||
      head.match(/^#{1,3}\s+(.+)$/)?.[1]?.trim() ||
      (chunks.length === 1 ? '总断' : '其他')
    const body = (title === '其他' || title === '总断' && chunks.length === 1 && !/^\*\*|^【|^#/.test(head)
      ? chunk
      : lines.slice(1).join('\n')
    ).trim()

    const plainMatch = body.match(/白话[：:]\s*([\s\S]*?)(?=\n\s*术语[：:]|$)/)
    const jargonMatch = body.match(/术语[：:]\s*([\s\S]*?)(?=\n\s*白话[：:]|$)/)
    const plain = (plainMatch?.[1] ?? '').trim()
    const jargon = (jargonMatch?.[1] ?? '').trim()
    if (plainMatch || jargonMatch) hasSplit = true
    if (!plain && !jargon) continue
    sections.push({
      title,
      plain,
      jargon
    })
  }

  if (!sections.length) {
    return {
      sections: [{ title: '总批', plain: '', jargon: raw }],
      plainText: '',
      jargonText: raw,
      hasSplit: false
    }
  }

  const plainText = sections
    .filter((s) => s.plain)
    .map((s) => `【${s.title}】\n${s.plain}`)
    .join('\n\n')
  const jargonText = sections
    .filter((s) => s.jargon)
    .map((s) => `【${s.title}】\n${s.jargon}`)
    .join('\n\n')

  return { sections, plainText, jargonText, hasSplit }
}

/**
 * 根据拆层结果选择默认展示页：有白话优先白话，否则术语，再否则原文。
 * @param layers parsePolishLayers 结果
 * @returns 界面页签值
 */
export function pickPolishShowMode(layers: PolishLayers): 'plain' | 'jargon' | 'classic' {
  // 未拆出「白话：/术语：」标签时只能看原文，避免把整段塞进术语页
  if (!layers.hasSplit) return 'classic'
  if (layers.sections.some((s) => Boolean(s.plain))) return 'plain'
  if (layers.sections.some((s) => Boolean(s.jargon))) return 'jargon'
  return 'classic'
}

/** 追问对话一条 */
export interface MingChatMessage {
  /** user=来宾，assistant=命师 */
  role: 'user' | 'assistant'
  /** 正文 */
  text: string
}

/** 坐堂上下文：本盘事实 + 已出总批 */
export interface MingConsultContext {
  /** 四柱、强弱、用神、大运等压缩事实 */
  chartFacts: string
  /** 最近一次润色全文 */
  polishText: string
  /** 当前命师角色（长设定见 mingAgents.buildMingAgentRolePrompt） */
  agentId: MingAgentId
  /** 是否显式勾选了多功能材料（默认否：只答本工具） */
  multiFeature?: boolean
  /**
   * 问答模式：chart=盘面追问；guide=用法/书库知识答疑（首页）。
   */
  mode?: 'chart' | 'guide'
}

/**
 * 把排盘要点压成追问用的事实包，避免模型忘掉当前盘。
 * @param facts 各字段已由界面拼好
 */
export function buildMingConsultFacts(facts: {
  name: string
  genderLabel: string
  pillars: string
  /** 四柱天干十神（已由规则算出，禁止模型改名） */
  pillarShiShen?: string
  dayMaster: string
  strength: string
  useful: string
  avoid: string
  /** 喜用取用依据摘要 */
  usefulBasis?: string
  qiYun: string
  daYun: string
  headline: string
  shensha: string
  /** 日历点选的大运/流年/流月；可空 */
  selectedYun?: string
  /** 可复盘证据链摘要 */
  evidences?: string
}): string {
  return [
    `姓名 ${facts.name} · ${facts.genderLabel}`,
    `四柱 ${facts.pillars}`,
    facts.pillarShiShen?.trim() ? `十神（规则已算，禁止改名） ${facts.pillarShiShen.trim()}` : '',
    `日主 ${facts.dayMaster} · 强弱 ${facts.strength}`,
    `用神 ${facts.useful} · 忌神 ${facts.avoid}`,
    facts.usefulBasis?.trim() ? `喜用依据 ${facts.usefulBasis.trim()}` : '',
    `起运 ${facts.qiYun}`,
    `大运 ${facts.daYun}`,
    facts.selectedYun?.trim() ? `【点选岁运】\n${facts.selectedYun.trim()}` : '',
    `总批 ${facts.headline}`,
    `神煞 ${facts.shensha || '无'}`,
    facts.evidences?.trim() ? `【可复盘依据】\n${facts.evidences.trim()}` : ''
  ]
    .filter(Boolean)
    .join('\n')
}

/**
 * 基于当前排盘与润色总批继续问答（专业坐堂，不是重新起盘）。
 * @param question 来宾问题
 * @param context 本盘事实 + 总批
 * @param history 已有问答（不含本轮问题）
 * @param settings API 配置
 * @param onDelta 流式回调
 */
export async function askMingAgent(
  question: string,
  context: MingConsultContext,
  history: MingChatMessage[],
  settings: AiPolishSettings,
  onDelta?: AiPolishDeltaHandler
): Promise<string> {
  const q = question.trim()
  if (!q) throw new Error('请先写下要问的问题')
  const recent = history.slice(-12)
  const guide = context.mode === 'guide'
  /** 是否用户显式勾选了多功能材料（由事实块标题数量粗判，或 context 可选标记） */
  const multi =
    typeof context.multiFeature === 'boolean'
      ? context.multiFeature
      : /【[^】]+】[\s\S]*【[^】]+】/.test(context.chartFacts)

  const system = guide
    ? [
        '你是易学桌面的用法与命理书库答疑助手。',
        '用法类问题：只根据「用法说明」事实回答菜单入口与操作边界，不要编造不存在的功能。',
        '命理概念类问题：只根据材料中的「书库检索」片段取义作答，写清书名/章节（若有）；不得冒充全书原文照抄。',
        '检索无命中或材料不足时明说，并建议去「学堂」阅览原书或先到对应功能页排盘后再问。',
        '不要虚构具体八字盘面、流年应期或风水实勘。',
        '先直接答问题，用现代口语；专名第一次写成「人话（命理叫某某）」。',
        plainTalkGlossaryGuide(),
        '可用加粗强调关键词。'
      ].join('')
    : [
        /** 长设定：身份 + 模块细项 + 分段格式 */
        buildMingAgentRolePrompt(context.agentId),
        '只能根据「本盘/本局事实」和「已出总批」作答，禁止改盘、禁止编造未给出的具体日期事件（车祸、中奖日等）。',
        multi
          ? '材料含多个功能块时，须综合对照作答，说明各块如何互相印证或冲突；不要擅自引入未给出的其他盘。'
          : '材料仅属当前功能：只按本盘/本局作答，不要擅自引用未提供的八字、紫微、风水、黄历等其他工具结果。',
        '若本盘事实含「默认岁运窗口」，视为已提供流年材料：问到近几年运势时按窗口逐年答，不要说没有流年。',
        '若本盘事实含「点选岁运」，可加写该大运/流年/流月，仍须吉凶并陈。',
        '若问题超出已给材料，明说材料不足，不要脑补未排出的盘面。',
        '先直接答问题，用现代口语把命数讲明白，至少写一小段完整的话；专名第一次写成「人话（命理叫某某）」。',
        mingNarrativeGuide(),
        plainTalkGlossaryGuide(),
        /** 盘面追问：同名神煞多柱叠见原则 */
        shenShaStackPromptGuide(),
        '【硬约束·盘面】四柱十神、用神/忌神五行必须以「已就绪事实」为准；禁止把伤官说成食神、正官说成七杀等对调或改名；禁止另算一套喜用覆盖事实包。',
        '可用加粗强调关键词；情缘段数只许用少/中/多波折。',
        '回答必须吉凶并陈，禁止只说好的。',
        modernYinStudyPromptGuide(),
        modernFemaleMingPromptGuide(),
        '不要重复整篇总批。',
        `全文最后单独一段原句照抄：${MING_DISCLAIMER_FOOTER}`
      ].join('')

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: system },
    {
      role: 'user',
      content: guide
        ? `【用法与书库材料】\n${context.chartFacts}\n\n【补充】\n${context.polishText.slice(0, 8000)}`
        : `【已就绪事实】\n${context.chartFacts}\n\n【已出文案】\n${context.polishText.slice(0, 8000)}`
    },
    {
      role: 'assistant',
      content: guide
        ? '已接到本程序用法说明与书库检索材料。请提问用法或命理概念。'
        : multi
          ? '已接到当前勾选的多功能材料。请提问，我按材料综合作答。'
          : '已接到本功能盘面与文案。请提问，我只按本材料作答。'
    }
  ]
  for (const m of recent) {
    messages.push({ role: m.role, content: m.text })
  }
  messages.push({ role: 'user', content: q })
  return streamChatMessages(settings, messages, guide ? 0.45 : 0.55, onDelta)
}

/**
 * 把已有的 AI 润色正文译成现代化白话（SSE 流式）。
 * @param sourceText 待翻译的润色全文
 * @param settings API 配置
 * @param onDelta 可选逐字回调
 * @returns 白话译文
 */
export async function translateAiTextToPlainTalk(
  sourceText: string,
  settings: AiPolishSettings,
  onDelta?: AiPolishDeltaHandler
): Promise<string> {
  const trimmed = sourceText.trim()
  if (!trimmed) throw new Error('没有可翻译的润色内容，请先「润色断言」')
  const { system, user } = buildPlainTalkTranslateMessages(trimmed)
  return streamChatCompletion(settings, system, user, 0.5, onDelta)
}

/**
 * 合盘结果 AI 润色：基于规则合盘事实 + RAG 典籍片段，写相处解读（非判决）。
 * @param result 规则合盘结果
 * @param chartFacts 双方四柱摘要（已拼好字符串）
 * @param settings API 配置
 * @param onDelta 流式回调
 */
export async function polishHeHunWithAi(
  result: HeHunResult,
  chartFacts: string,
  settings: AiPolishSettings,
  onDelta?: AiPolishDeltaHandler
): Promise<string> {
  if (!settings.apiKey.trim() && !settings.baseUrl.includes('127.0.0.1')) {
    throw new Error('请先填写 API Key（本地 Ollama 可留空）')
  }

  const knowledgePack = [
    await buildRagKnowledgeContext({
      structured: { topic: '合婚合盘', score: result.score, kind: result.kind },
      extraContext: result.lines.join('\n')
    }),
    buildMethodologyGuidePack()
  ].join('\n\n')

  const system = [
    '你是子平命师，专写双人合盘解读。只能根据「合盘规则事实」「双方四柱」与「书库检索段落」取义。',
    '禁止编造未提供的神煞、婚期、具体事件或「注定成/散」判决。',
    '须吉凶并陈：写吸引/互补之处，也写消耗/卡点与相处边界。',
    '结构：白话总评 → 四维拆解（日支、日主、喜用互补、配偶星互见）→ 相处建议。',
    '情缘段数只许少/中/多波折，禁止写谈过几次恋爱。',
    mingNarrativeGuide(),
    plainTalkGlossaryGuide(),
    '结尾写：以上依子平合盘常法取义，不作唯一依据。'
  ].join('')

  const user = [
    knowledgePack,
    '',
    '【双方四柱】',
    chartFacts,
    '',
    '【规则合盘事实】',
    result.lines.join('\n'),
    '',
    '【相处提示（规则层）】',
    ...result.tips.map((t) => `- ${t}`),
    '',
    '请写一份合盘解读：先白话总评，再按四维展开，最后给 3–5 条可执行的相处建议。'
  ].join('\n')

  return streamChatCompletion(settings, system, user, 0.55, onDelta)
}

/**
 * 合盘 AI 推断：在规则合盘事实基础上延伸相处节奏与格局互补推断（非判决）。
 * @param result 规则合盘结果
 * @param chartFacts 双方四柱摘要
 * @param settings API 配置
 * @param onDelta 流式回调
 */
export async function inferHeHunWithAi(
  result: HeHunResult,
  chartFacts: string,
  settings: AiPolishSettings,
  onDelta?: AiPolishDeltaHandler
): Promise<string> {
  if (!settings.apiKey.trim() && !settings.baseUrl.includes('127.0.0.1')) {
    throw new Error('请先填写 API Key（本地 Ollama 可留空）')
  }

  const knowledgePack = [
    await buildRagKnowledgeContext({
      structured: { topic: '合婚合盘', score: result.score, kind: result.kind },
      extraContext: result.lines.join('\n')
    }),
    buildMethodologyGuidePack()
  ].join('\n\n')

  const system = [
    '你是子平命师，专做双人合盘**延伸推断**。只能根据「合盘规则事实」「双方四柱」与「书库检索段落」取义并推演相处节奏。',
    '推断重点：格局互补/消耗、喜用是否互益、岁运叠加时的相处窗口、冲突点与磨合边界。',
    '禁止与规则层给出的综合分、四维评分方向矛盾；禁止编造婚期、具体事件或「注定成/散」判决。',
    '禁止编造具体恋爱次数；情缘波折只许少/中/多。',
    mingNarrativeGuide(),
    plainTalkGlossaryGuide(),
    '结构：白话总评 → 格局互补推断 → 四维延伸（日支/日主/喜用/配偶星）→ 岁运相处窗口 → 3–5 条可执行建议。',
    '结尾写：以上在规则合盘事实基础上延伸推断，不作唯一依据。'
  ].join('')

  const user = [
    knowledgePack,
    '',
    '【双方四柱】',
    chartFacts,
    '',
    '【规则合盘事实（不得推翻）】',
    result.lines.join('\n'),
    '',
    '【四维评分】',
    ...result.dimensions.map((d) => `- ${d.name}：${d.score} · ${d.text}`),
    '',
    '【相处提示（规则层）】',
    ...result.tips.map((t) => `- ${t}`),
    '',
    '请写合盘延伸推断：先白话总评，再写格局互补与岁运相处窗口，最后给可执行建议。'
  ].join('\n')

  return streamChatCompletion(settings, system, user, 0.58, onDelta)
}
