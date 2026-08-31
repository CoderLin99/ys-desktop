/**
 * 离线 RAG 类型：ctext 抓取语料 + BM25 索引结构。
 */

/** 单块原文段落 */
export interface RagChunkDoc {
  /** 块 id */
  id: string
  /** 书目 id（与 classics.ts 对齐） */
  bookId: string
  /** 书名 */
  title: string
  /** 章节标题 */
  chapter: string
  /** 原文段落 */
  text: string
  /** 检索标签 */
  tags: string[]
  /** 学派：mingli | yangzhai | yinzhai | ziwei … */
  school?: string
  /** ctext 来源链接 */
  source: string
}

/** BM25 倒排 posting */
export interface RagPosting {
  /** 文档下标 */
  doc: number
  /** 词频 */
  tf: number
}

/** BM25 倒排项 */
export interface RagInvertedEntry {
  /** 文档频率 */
  df: number
  /** posting 列表 */
  postings: RagPosting[]
}

/** 打包后的离线索引（public/rag/classics-index.json） */
export interface RagIndexPayload {
  version: number
  builtAt: string
  docCount: number
  books: unknown[]
  avgDocLen: number
  docLens: number[]
  inverted: Record<string, RagInvertedEntry>
  docs: RagChunkDoc[]
}

/** 检索命中 */
export interface RagHit {
  /** 文档 */
  doc: RagChunkDoc
  /** BM25 分 */
  score: number
}
