/**
 * 助手输出轻量排版：把 Markdown 加粗转成真正加粗，避免 **正官辛金** 原样露给用户。
 * 只处理加粗，不做完整 Markdown，防止引入多余语法噪音。
 */

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
 * 先转义 HTML，再把 **片段** 换成 <strong>。换行交给 CSS white-space: pre-wrap。
 * 供 v-html 安全渲染追问/润色正文。
 * @param raw 模型原文
 * @returns 可插入 DOM 的 HTML
 */
export function renderLiteMarkdown(raw: string): string {
  const escaped = String(raw ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
  return escaped.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\*\*/g, '')
}
