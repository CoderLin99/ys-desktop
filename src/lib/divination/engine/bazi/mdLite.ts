/**
 * 助手输出轻量排版：加粗、二级标题、【模块】标题。
 * 不做完整 Markdown，避免多余语法噪音。
 * 输出用 <div>/<br>，勿塞进 <p>（浏览器会拆掉块级标题导致样式失效）。
 */

/** 总师/总批常见模块名（用于识别无 ## 的裸标题行） */
const MODULE_TITLE_NAMES = new Set([
  '总断',
  '喜用格局',
  '格局取舍',
  '岁运应期',
  '事业',
  '财运',
  '婚恋',
  '姻缘',
  '子女',
  '六亲',
  '健康',
  '学业',
  '学业文书',
  '应期',
  '应期流年',
  '流年',
  '流年窗口'
])

/**
 * 去掉 **加粗** 标记，只留纯文本（复制、无障碍用）。
 * @param raw 模型原文
 * @returns 不含 ** 的纯文本
 */
export function stripMdBold(raw: string): string {
  return String(raw ?? '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*\*/g, '')
}

/**
 * 转义 HTML 特殊字符。
 * @param s 原文
 */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * 行内加粗。
 * @param s 已转义文本
 */
function boldInline(s: string): string {
  return s.replace(/\*\*([^*]+)\*\*/g, '<strong class="md-em">$1</strong>').replace(/\*\*/g, '')
}

/**
 * 判断一行是否为模块标题，并取出标题文案。
 * 支持：## 事业 / # 事业 / 【事业】 / **事业** / 事业（整行仅模块名）
 * @param line 单行（未转义）
 * @returns 标题文案；非标题返回 null
 */
export function matchModuleTitleLine(line: string): string | null {
  const t = line.trim()
  if (!t) return null
  const md = t.match(/^#{1,3}\s+(.+)$/)
  if (md) return md[1].replace(/\*+/g, '').trim()
  const bracket = t.match(/^【([^】]+)】\s*$/)
  if (bracket) return bracket[1].trim()
  const boldOnly = t.match(/^\*\*([^*]+)\*\*\s*$/)
  if (boldOnly) {
    const name = boldOnly[1].trim()
    if (MODULE_TITLE_NAMES.has(name)) return name
  }
  if (MODULE_TITLE_NAMES.has(t)) return t
  return null
}

/**
 * 先转义 HTML，再把标题/加粗换成带 class 的标签，供 v-html 安全渲染。
 * 连续空行压成最多一段间距；标题后不留多余空行。
 * @param raw 模型原文
 * @returns 可插入 DOM 的 HTML（应用在 div.md-body 上）
 */
export function renderLiteMarkdown(raw: string): string {
  const lines = String(raw ?? '').replace(/\r\n/g, '\n').split('\n')
  const parts: string[] = []
  /** 上一块是否为标题（标题后跳过紧跟的空行） */
  let afterTitle = false
  /** 正文区是否已输出过一行（用于段间只留一个 <br>） */
  let pendingBreak = false

  for (const line of lines) {
    const title = matchModuleTitleLine(line)
    if (title) {
      parts.push(`<div class="md-h2">${escapeHtml(title)}</div>`)
      afterTitle = true
      pendingBreak = false
      continue
    }
    if (!line.trim()) {
      // 标题后的空行丢掉；正文间最多保留一次换段
      if (afterTitle) continue
      if (parts.length === 0) continue
      pendingBreak = true
      continue
    }
    afterTitle = false
    const body = boldInline(escapeHtml(line))
    if (pendingBreak && parts.length > 0 && !parts[parts.length - 1].endsWith('</div>')) {
      parts.push('<br><br>')
    } else if (parts.length > 0 && !parts[parts.length - 1].endsWith('</div>')) {
      parts.push('<br>')
    }
    pendingBreak = false
    parts.push(body)
  }

  return parts.join('')
}
