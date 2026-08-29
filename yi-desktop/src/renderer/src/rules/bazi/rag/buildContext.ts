/**
 * 组装注入 AI 的 RAG 上下文；无索引时回退 classics 摘要。
 */
import { buildClassicsKnowledgePack } from '../classics'
import type { AssertionAiSections } from '../assert'
import { buildRagQuery } from './queryFromFacts'
import { loadRagIndex } from './loadIndex'
import { searchBm25Index } from './bm25'

/** buildRagKnowledgeContext 选项 */
export interface RagContextOptions {
  /** 结构化事实 */
  structured: Record<string, unknown>
  /** 分区断语 */
  sections?: AssertionAiSections
  /** 命师岁运上下文 */
  extraContext?: string
  /** 检索条数 */
  topK?: number
  /** 注入最大字符 */
  maxChars?: number
  /** 仅检索这些 school（如 ['yangzhai']） */
  schoolsAllow?: string[]
  /** 额外排除 */
  excludeSchools?: string[]
  /** 直接指定查询串（跳过八字 query 拼装） */
  queryOverride?: string
  /** 标题前缀 */
  headerLabel?: string
}

/**
 * 检索古籍原文片段并格式化为 prompt 块；失败则用摘要兜底。
 * @param options 检索参数
 */
export async function buildRagKnowledgeContext(options: RagContextOptions): Promise<string> {
  const {
    structured,
    sections,
    extraContext,
    topK = 8,
    maxChars = 9000,
    schoolsAllow,
    excludeSchools,
    queryOverride,
    headerLabel = '命理书库'
  } = options
  const index = await loadRagIndex()

  if (!index?.docs?.length) {
    return [
      `【${headerLabel}·摘要兜底】未找到离线原文索引，使用程序内义理摘要。`,
      buildClassicsKnowledgePack({ maxChars: maxChars - 120 })
    ].join('\n')
  }

  const query = queryOverride || buildRagQuery({ structured, sections, extraContext })
  const hits = searchBm25Index(index, query, topK, { schoolsAllow, excludeSchools })

  if (!hits.length) {
    return [
      `【${headerLabel}·摘要兜底】原文检索无命中，使用义理摘要。`,
      buildClassicsKnowledgePack({ maxChars: maxChars - 120 })
    ].join('\n')
  }

  const lines = [
    `【${headerLabel}·原文检索】以下片段来自离线古籍语料 BM25 检索，仅供取义，不得逐字冒充全书引用。`,
    `索引版本 ${index.version}，共 ${index.docCount} 段，构建于 ${index.builtAt.slice(0, 10)}。`,
    schoolsAllow?.length ? `学派过滤：仅 ${schoolsAllow.join('/')}。` : '默认排除阴宅（yinzhai）语料。',
    '评价优先级仍为：已计算事实与规则断语 > 检索段落。',
    ''
  ]

  for (const hit of hits) {
    const header = `《${hit.doc.title}》${hit.doc.chapter}（${hit.doc.bookId}/${hit.doc.school || '?'}）`
    const body = hit.doc.text.length > 680 ? `${hit.doc.text.slice(0, 680)}…` : hit.doc.text
    lines.push(`--- ${header} [score=${hit.score.toFixed(2)}] ---`)
    lines.push(body)
    lines.push('')
  }

  let text = lines.join('\n')
  if (text.length > maxChars) text = `${text.slice(0, maxChars)}\n…（RAG 上下文已截断）`
  return text
}
