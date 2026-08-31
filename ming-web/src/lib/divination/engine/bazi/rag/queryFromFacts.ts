/**
 * 由排盘结构化事实与分区断语生成 RAG 检索 query。
 */
import type { AssertionAiSections } from '../assert'

/** buildRagQuery 入参 */
export interface RagQueryInput {
  /** assert.structured */
  structured: Record<string, unknown>
  /** 可选分区断语 */
  sections?: AssertionAiSections
  /** 命师额外上下文（岁运窗口等） */
  extraContext?: string
}

/**
 * 从结构化事实提取检索关键词。
 * @param structured 断言 structured 字段
 */
function keywordsFromStructured(structured: Record<string, unknown>): string[] {
  const parts: string[] = []
  for (const key of ['dayMaster', 'strength', 'cong']) {
    const v = structured[key]
    if (typeof v === 'string' && v.trim()) parts.push(v)
  }
  if (Array.isArray(structured.useful)) parts.push(...structured.useful.map(String))
  if (Array.isArray(structured.avoid)) parts.push(...structured.avoid.map(String))
  if (Array.isArray(structured.classics)) parts.push(...structured.classics.map(String))
  const topics = structured.topics as Record<string, string[]> | undefined
  if (topics) {
    for (const arr of Object.values(topics)) {
      if (Array.isArray(arr)) parts.push(...arr.slice(0, 2))
    }
  }
  return parts
}

/**
 * 拼接 BM25 查询串。
 * @param input 盘面事实与断语
 */
export function buildRagQuery(input: RagQueryInput): string {
  const { structured, sections, extraContext } = input
  const chunks = [
    ...keywordsFromStructured(structured),
    sections?.喜用格局?.slice(0, 2).join(' ') ?? '',
    sections?.经典?.slice(0, 3).join(' ') ?? '',
    sections?.姻缘?.slice(0, 1).join(' ') ?? '',
    sections?.事业?.slice(0, 1).join(' ') ?? '',
    sections?.应期?.slice(0, 1).join(' ') ?? '',
    extraContext?.slice(0, 200) ?? ''
  ]
  return chunks.filter(Boolean).join(' ')
}
