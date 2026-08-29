/**
 * 中文分词：与 scripts/rag-lib.mjs 算法保持一致，供离线 BM25 检索。
 */

/** BM25 平滑参数 k1 */
const K1 = 1.5

/** BM25 长度归一化 b */
const B = 0.75

/** 命理检索领域词表 */
export const DOMAIN_TERMS = [
  '用神',
  '喜用',
  '忌神',
  '格局',
  '正官',
  '七杀',
  '偏官',
  '正财',
  '偏财',
  '正印',
  '偏印',
  '食神',
  '伤官',
  '比肩',
  '劫财',
  '从格',
  '从弱',
  '从强',
  '调候',
  '通关',
  '合化',
  '刑冲',
  '会合',
  '大运',
  '流年',
  '流月',
  '神煞',
  '禄马',
  '纳音',
  '日主',
  '月令',
  '身强',
  '身弱',
  '中和',
  '财官',
  '印绶',
  '枭神',
  '阳刃',
  '建禄'
] as const

/**
 * 对中文段落分词（整词 + 二字切分 + 领域词）。
 * @param text 待分词文本
 */
export function tokenizeForRag(text: string): string[] {
  const tokens: string[] = []
  const cleaned = text.replace(/\s+/g, '')
  const parts = cleaned.split(/[，。；：！？、\s""''（）【】《》…—\-·,.!?;:/]+/).filter(Boolean)
  for (const p of parts) {
    if (p.length === 1) {
      tokens.push(p)
      continue
    }
    tokens.push(p)
    if (p.length >= 3) {
      for (let i = 0; i < p.length - 1; i++) tokens.push(p.slice(i, i + 2))
    }
  }
  for (const term of DOMAIN_TERMS) {
    if (cleaned.includes(term)) tokens.push(term)
  }
  return tokens
}

export { K1, B }
