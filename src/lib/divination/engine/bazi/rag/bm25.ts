/**
 * 离线 BM25 检索（运行时，索引由 scripts/index-classics.mjs 预构建）。
 */
import type { RagHit, RagIndexPayload } from './types'
import { B, K1, tokenizeForRag } from './tokenize'

/**
 * 在已加载索引上执行 BM25 检索。
 * @param index 完整索引包
 * @param query 查询串（由盘面事实拼成）
 * @param topK 返回条数
 * @param opts.schoolsAllow 仅保留这些 school（空则不限）；默认排除 yinzhai
 */
export function searchBm25Index(
  index: RagIndexPayload,
  query: string,
  topK = 8,
  opts?: { schoolsAllow?: string[]; excludeSchools?: string[] }
): RagHit[] {
  const docs = index.docs
  const qTokens = tokenizeForRag(query)
  if (!qTokens.length || !docs.length) return []

  const allow = opts?.schoolsAllow?.length ? new Set(opts.schoolsAllow) : null
  const exclude = new Set(opts?.excludeSchools ?? (allow ? [] : ['yinzhai']))

  const scores = new Map<number, number>()
  const N = docs.length
  const avg = index.avgDocLen || 1

  for (const term of qTokens) {
    const entry = index.inverted[term]
    if (!entry) continue
    const idf = Math.log(1 + (N - entry.df + 0.5) / (entry.df + 0.5))
    for (const { doc, tf } of entry.postings) {
      const d = docs[doc]
      const school = d.school || 'mingli'
      if (allow && !allow.has(school)) continue
      if (exclude.has(school)) continue
      const dl = index.docLens[doc] || 1
      const num = tf * (K1 + 1)
      const den = tf + K1 * (1 - B + (B * dl) / avg)
      scores.set(doc, (scores.get(doc) || 0) + idf * (num / den))
    }
  }

  return [...scores.entries()]
    .map(([docIdx, score]) => ({ doc: docs[docIdx], score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
}
