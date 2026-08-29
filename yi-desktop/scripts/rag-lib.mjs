/**
 * 离线 RAG 共用：中文分词 + BM25（构建索引与运行时检索算法一致）。
 */

/** BM25 参数 */
const K1 = 1.5
const B = 0.75

/**
 * HTML 实体与标签清理为纯文本。
 * @param {string} raw 含 HTML 的片段
 */
export function stripHtml(raw) {
  let s = raw.replace(/<script[\s\S]*?<\/script>/gi, '')
  s = s.replace(/<style[\s\S]*?<\/style>/gi, '')
  s = s.replace(/<br\s*\/?>/gi, '\n')
  s = s.replace(/<[^>]+>/g, '')
  s = s.replace(/&nbsp;/g, ' ')
  s = s.replace(/&amp;/g, '&')
  s = s.replace(/&lt;/g, '<')
  s = s.replace(/&gt;/g, '>')
  s = s.replace(/&quot;/g, '"')
  s = s.replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  s = s.replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
  return s.replace(/\s+/g, ' ').trim()
}

/**
 * 解析问真 pcbook 章节 HTML（`.book-detail-content` 内段落）。
 * @param {string} html 章节页 HTML
 * @param {string} chapterHint 章节标题（目录名）
 * @returns {{ line: number, text: string, chapterHint?: string }[]}
 */
export function parseWenzhenChapterHtml(html, chapterHint) {
  /** @type {{ line: number, text: string, chapterHint?: string }[]} */
  const rows = []
  const block =
    (html.match(/<div class="book-detail-content">([\s\S]*?)<\/div>/i) || [])[1] || ''
  if (!block) return rows

  let n = 0
  for (const m of block.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)) {
    const text = stripHtml(m[1])
    if (!text || text.length < 2) continue
    // 过滤站点导航/引导文案
    if (/扫码下载|手机上继续阅读|开通会员|问真八字/.test(text)) continue
    n += 1
    rows.push({ line: n, text, chapterHint })
  }
  return rows
}

/**
 * 解析 Banny-Gao/mingli-research 的 source.md（按段落切行，保留章节目录名）。
 * @param {string} md Markdown 原文
 * @param {string} chapterHint 章节目录名（articles 下文件夹名）
 */
export function parseMingliResearchMarkdown(md, chapterHint) {
  /** @type {{ line: number, text: string, chapterHint?: string }[]} */
  const rows = []
  let n = 0
  /** @type {string[]} */
  let buf = []

  /** 刷出当前段落缓冲为一行 */
  const flush = () => {
    const text = buf.join('').trim()
    if (text.length >= 2) {
      n += 1
      rows.push({ line: n, text, chapterHint })
    }
    buf = []
  }

  for (const raw of md.split(/\r?\n/)) {
    const line = raw.trim()
    if (line.startsWith('# ')) continue
    if (!line) {
      flush()
      continue
    }
    buf.push(line)
  }
  flush()
  return rows
}

/**
 * 解析 ctext 维基页 `<tr class="result">` 正文行。
 * @param {string} html 页面 HTML
 */
export function parseFushantangHtml(html) {
  let t = stripHtml(html)
  const lines = t.split(/\n+/).map((s) => s.trim()).filter(Boolean)
  /** @type {{ line: number, text: string }[]} */
  const rows = []
  let n = 0
  for (const line of lines) {
    if (line === '福山堂') continue
    if (/^《[一二三四五六七八九十]+》$/.test(line)) continue
    if (/^卷[一二三四五六七八九十\d]+卷/.test(line)) continue
    if (/^《.+》$/.test(line) && line.length < 28) continue
    if (/本书是命理/.test(line)) continue
    if (line.length < 4) continue
    n += 1
    rows.push({ line: n, text: line })
  }
  return rows
}

/**
 * 解析 dooshu/shu 等 GitHub 平文本（三命通会卷/节标题缩进）。
 * @param {string} text 全文
 */
export function parseGithubPlainMingshu(text) {
  /** @type {{ line: number, text: string }[]} */
  const rows = []
  let n = 0
  let chapter = '正文'
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#') || line.startsWith('- Branch:')) continue
    if (/^三命通会\s*-/.test(line)) continue
    const vol = line.match(/^[\s　]*三命通会卷[一二三四五六七八九十\d]+/)
    if (vol) {
      chapter = line.replace(/^[\s　]+/, '').slice(0, 32)
      continue
    }
    const sec = line.match(/^[\s　]{2,}(.+)$/)
    if (sec) {
      const s = sec[1].trim()
      if (s.length < 48 && !/[。！？；]$/.test(s)) {
        chapter = s.slice(0, 40)
        continue
      }
    }
    n += 1
    rows.push({ line: n, text: line, _chapter: chapter })
  }
  return rows.map(({ _chapter, ...r }) => ({ ...r, chapterHint: _chapter }))
}

/**
 * 将带 chapterHint 的行转为 chunkBookRows 可用的 rows + 预置章节。
 * @param {object} book 书目
 * @param {{ line: number, text: string, chapterHint?: string }[]} rows 行
 */
export function chunkBookRowsWithHints(book, rows) {
  /** @type {object[]} */
  const chunks = []
  let chapter = '正文'
  let buf = []
  let bufLen = 0

  const flush = (force = false) => {
    if (!buf.length) return
    const text = buf.join('')
    if (text.length >= 80 || force) {
      chunks.push({
        id: `${book.id}-${chunks.length}`,
        bookId: book.id,
        title: book.title,
        chapter,
        text,
        tags: [...new Set([...(book.tags || []), ...matchDomainTags(text)])],
        source: book.source
      })
    }
    buf = []
    bufLen = 0
  }

  for (const row of rows) {
    if (row.chapterHint && row.chapterHint !== chapter) {
      flush(true)
      chapter = row.chapterHint
    }
    if (isChapterHeading(row.text)) {
      flush(true)
      chapter = row.text.slice(0, 40)
      buf.push(row.text)
      bufLen += row.text.length
      flush(true)
      continue
    }
    buf.push(row.text)
    bufLen += row.text.length
    if (bufLen >= 520) flush(false)
  }
  flush(true)
  return chunks
}

export function parseCtextWikiRows(html) {
  /** @type {{ line: number, text: string }[]} */
  const rows = []
  const re =
    /<tr class="result"[^>]*>\s*<td[^>]*>\s*(\d+)\s*[\s\S]*?<\/td>\s*<td class="ctext">([\s\S]*?)<\/td>\s*<\/tr>/gi
  let m
  while ((m = re.exec(html)) !== null) {
    const line = Number(m[1])
    const text = stripHtml(m[2])
    if (!text || text.length < 2) continue
    if (/^https?:\/\//.test(text)) continue
    if (/中国哲学书电子化计划|简体字版|登入|检索/.test(text) && text.length < 30) continue
    rows.push({ line, text })
  }
  return rows
}

/**
 * 是否像章节标题（用于切块边界）。
 * @param {string} text 一行文本
 */
export function isChapterHeading(text) {
  return /^(序|目录|[一二三四五六七八九十百千、．.\d]+[、．.]?\s*(论|章|说|论|卷))/.test(text) && text.length < 48
}

/**
 * 命理关键词表：检索 query 与切块 tagging 共用。
 */
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
]

/**
 * 中文分词：整段 + 二字切分 + 领域词命中。
 * @param {string} text 待分词文本
 */
export function tokenize(text) {
  /** @type {string[]} */
  const tokens = []
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

/**
 * 将书目原文行切成 RAG 文档块。
 * @param {object} book 书目元数据
 * @param {string} book.id 书目 id
 * @param {string} book.title 书名
 * @param {string[]} book.tags 默认标签
 * @param {{ line: number, text: string }[]} rows 原文行
 */
export function chunkBookRows(book, rows) {
  /** @type {object[]} */
  const chunks = []
  let chapter = '正文'
  /** @type {string[]} */
  let buf = []
  let bufLen = 0

  /** @param {boolean} force 是否强制刷出当前缓冲 */
  const flush = (force = false) => {
    if (!buf.length) return
    const text = buf.join('')
    if (text.length >= 80 || force) {
      chunks.push({
        id: `${book.id}-${chunks.length}`,
        bookId: book.id,
        title: book.title,
        chapter,
        text,
        tags: [...new Set([...book.tags, ...matchDomainTags(text)])],
        source: book.source
      })
    }
    buf = []
    bufLen = 0
  }

  for (const row of rows) {
    if (isChapterHeading(row.text)) {
      flush(true)
      chapter = row.text.slice(0, 40)
      buf.push(row.text)
      bufLen += row.text.length
      flush(true)
      continue
    }
    buf.push(row.text)
    bufLen += row.text.length
    if (bufLen >= 520) flush(false)
  }
  flush(true)
  return chunks
}

/**
 * 从文本中匹配命理领域标签。
 * @param {string} text 段落
 */
function matchDomainTags(text) {
  return DOMAIN_TERMS.filter((t) => text.includes(t))
}

/**
 * 构建 BM25 倒排索引。
 * @param {object[]} docs 文档块（含 text）
 */
export function buildBm25Index(docs) {
  /** @type {Record<string, { df: number, postings: { doc: number, tf: number }[] }>} */
  const inverted = {}
  /** @type {number[]} */
  const docLens = []
  let totalLen = 0

  docs.forEach((doc, docIdx) => {
    const tokens = tokenize(doc.text)
    docLens.push(tokens.length)
    totalLen += tokens.length
    /** @type {Record<string, number>} */
    const tf = {}
    for (const t of tokens) tf[t] = (tf[t] || 0) + 1
    for (const [term, count] of Object.entries(tf)) {
      if (!inverted[term]) inverted[term] = { df: 0, postings: [] }
      inverted[term].df += 1
      inverted[term].postings.push({ doc: docIdx, tf: count })
    }
  })

  return {
    version: 1,
    avgDocLen: docs.length ? totalLen / docs.length : 0,
    docLens,
    inverted
  }
}

/**
 * BM25 检索。
 * @param {object} index 索引（含 inverted、docLens、avgDocLen）
 * @param {object[]} docs 文档数组
 * @param {string} query 查询串
 * @param {number} topK 返回条数
 */
export function searchBm25(index, docs, query, topK = 8) {
  const qTokens = tokenize(query)
  if (!qTokens.length || !docs.length) return []

  /** @type {Record<number, number>} */
  const scores = {}
  const N = docs.length
  const avg = index.avgDocLen || 1

  for (const term of qTokens) {
    const entry = index.inverted[term]
    if (!entry) continue
    const idf = Math.log(1 + (N - entry.df + 0.5) / (entry.df + 0.5))
    for (const { doc, tf } of entry.postings) {
      const dl = index.docLens[doc] || 1
      const num = tf * (K1 + 1)
      const den = tf + K1 * (1 - B + (B * dl) / avg)
      scores[doc] = (scores[doc] || 0) + idf * (num / den)
    }
  }

  return Object.entries(scores)
    .map(([docIdx, score]) => ({ doc: docs[Number(docIdx)], score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
}
