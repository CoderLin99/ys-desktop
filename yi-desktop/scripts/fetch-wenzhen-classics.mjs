/**
 * 从问真 HTML 书库补抓「本地缺失」古籍（全部分类）。
 * ID 形如 {cat}_{sub}_{n}：道/医/命/相地/易卜等。
 * 与 mingli / resources/classics 书名归一化比对后限速抓取；可断点续跑。
 *
 * 环境变量：
 * - FORCE=1 覆盖已有 json
 * - WENZHEN_DELAY_MS 请求间隔（默认 400）
 * - WENZHEN_CATS 逗号分隔大类，默认 3（八字）
 * - WENZHEN_MODE=fengshui 仅按阳宅白名单抓取（P0/P1；YINZHAI=1 含 P2）
 * - WENZHEN_INCLUDE_YINZHAI=1 风水模式下额外抓阴宅书
 * - WENZHEN_BOOKS 逗号分隔问真 bookId，仅抓这些（如 3_1_0=神煞大全）
 * - WENZHEN_SKIP_CAT3=1 跳过八字类（若已抓完）
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { MINGLI_BOOK_META, WENZHEN_BOOK_META, slugBookId, listFengshuiWenzhenTargets } from './classics-sources.mjs'
import { chunkBookRowsWithHints, parseWenzhenChapterHtml } from './rag-lib.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const outDir = path.join(root, 'resources', 'classics')
/** 纯文本备份 */
const rawDir = path.join(root, 'resources', 'classics-raw', 'wenzhen')
/** 全站目录缓存，避免每次重扫封面 */
const catalogCachePath = path.join(rawDir, '_catalog.json')

const nodeMajor = Number(process.versions.node.split('.')[0])
if (nodeMajor < 18) {
  console.error(`需要 Node.js >= 18（当前 ${process.version}）`)
  process.exit(1)
}

const force = process.env.FORCE === '1'
const delayMs = Number(process.env.WENZHEN_DELAY_MS || 400)
const skipCat3 = process.env.WENZHEN_SKIP_CAT3 === '1'
/** fengshui = 仅阳宅白名单；可用 argv --fengshui 或环境变量 */
const mode =
  process.env.WENZHEN_MODE ||
  (process.argv.includes('--fengshui') ? 'fengshui' : 'default')
const includeYinzhai =
  process.env.WENZHEN_INCLUDE_YINZHAI === '1' || process.argv.includes('--yinzhai')
/** 指定 bookId 列表（优先于目录扫描） */
const onlyBooks = (process.env.WENZHEN_BOOKS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
const cats = (process.env.WENZHEN_CATS || '3')
  .split(',')
  .map((s) => Number(s.trim()))
  .filter((n) => n >= 1 && n <= 12)
const BASE = 'https://www.iwzbz.com/artical/pcbook/v2'

/** 各大类默认标签 */
const CAT_TAGS = {
  '1': ['道藏', '诸子'],
  '1_1': ['道藏', '诸子'],
  '1_2': ['功法', '导引'],
  '2': ['中医', '医籍'],
  '2_1': ['中医', '医籍'],
  '3': ['命理', '子平'],
  '3_1': ['命理', '子平'],
  '3_2': ['紫微', '斗数'],
  '3_3': ['星命', '星学'],
  '4': ['术数'],
  '4_1': ['风水', '地理'],
  '4_2': ['相术'],
  '4_3': ['天文', '星象'],
  '5': ['易学'],
  '5_1': ['易经', '易传'],
  '5_2': ['卜筮', '六爻'],
  '5_3': ['术数', '梅花'],
  '5_4': ['奇门', '遁甲'],
  '5_5': ['六壬', '壬学']
}

/**
 * @param {number} ms 毫秒
 */
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

/**
 * 去掉「，作者：…」等站点后缀。
 * @param {string} title 原始标题
 */
export function cleanBookTitle(title) {
  return String(title || '')
    .replace(/[，,]\s*作者[：:].*$/u, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * 书名归一化，便于「兰台妙选原文」≈「兰台妙选」比对。
 * @param {string} title 原始书名
 */
export function normalizeBookTitle(title) {
  return cleanBookTitle(title)
    .replace(/\s+/g, '')
    .replace(/[-－—_]?原文$/u, '')
    .replace(/（[^）]*）/g, '')
    .replace(/\([^)]*\)/g, '')
    .trim()
}

/**
 * 按 bookId 推断分类 tags。
 * @param {string} bookId 如 5_2_1
 * @param {string[]} extra 额外 tags
 */
function tagsForBook(bookId, extra = []) {
  const parts = bookId.split('_')
  const prefix2 = parts.slice(0, 2).join('_')
  const prefix1 = parts[0]
  return [...new Set([...(CAT_TAGS[prefix2] || CAT_TAGS[prefix1] || ['古籍']), ...extra])]
}

/**
 * 收集本地已有书名集合（mingli 目录 + classics json）。
 * @returns {Set<string>} 归一化书名
 */
function collectOwnedTitles() {
  /** @type {Set<string>} */
  const owned = new Set()
  for (const title of Object.keys(MINGLI_BOOK_META)) {
    owned.add(normalizeBookTitle(title))
  }
  const mingliBooks = path.join(root, '..', '..', 'mingli-research', 'books')
  if (fs.existsSync(mingliBooks)) {
    for (const name of fs.readdirSync(mingliBooks)) {
      owned.add(normalizeBookTitle(name))
    }
  }
  if (fs.existsSync(outDir)) {
    for (const f of fs.readdirSync(outDir)) {
      if (!f.endsWith('.json') || f === 'manifest.json') continue
      try {
        const j = JSON.parse(fs.readFileSync(path.join(outDir, f), 'utf8'))
        if (j.title) owned.add(normalizeBookTitle(j.title))
      } catch {
        /* ignore */
      }
    }
  }
  owned.delete('滴天髓')
  if (fs.existsSync(path.join(outDir, 'ditian-yuanwen.json'))) {
    owned.add('滴天髓')
    owned.add(normalizeBookTitle('滴天髓-原文'))
  }
  return owned
}

/**
 * GET 文本。
 * @param {string} url 绝对 URL
 */
async function fetchText(url) {
  const r = await fetch(url, {
    headers: {
      'User-Agent': 'yi-desktop-classics-fetcher/0.1 (local research; polite delay)',
      Accept: 'text/html,*/*'
    },
    signal: AbortSignal.timeout(45000)
  })
  if (!r.ok) throw new Error(`HTTP ${r.status} ${url}`)
  return r.text()
}

/**
 * 拉取封面页；无章节链接时把封面本身当作一章（单页书）。
 * @param {string} bookId 如 4_2_1
 * @returns {Promise<{ bookId: string, title: string, chapters: { href: string, name: string, inlineHtml?: string }[] } | null>}
 */
async function loadBookCover(bookId) {
  const html = await fetchText(`${BASE}/${bookId}.html`)
  const rawTitle = ((html.match(/<title>([^<]+)<\/title>/i) || [])[1] || bookId)
    .replace(/\s+/g, ' ')
    .trim()
  if (html.length < 500 || /404|不存在/.test(rawTitle)) return null
  const title = cleanBookTitle(rawTitle)

  /** @type {{ href: string, name: string, inlineHtml?: string }[]} */
  const chapters = []
  for (const m of html.matchAll(/<a href="(\d[\w.-]*\.html)"[^>]*>\s*<p class="citems">([^<]*)<\/p>/gi)) {
    const href = m[1]
    if (href === `${bookId}.html`) continue
    chapters.push({ href, name: m[2].trim() || href })
  }
  if (!chapters.length) {
    const hrefs = [...html.matchAll(/href=["'](\d[\w.-]*\.html)["']/g)].map((x) => x[1])
    for (const href of [...new Set(hrefs)]) {
      if (!href.startsWith(bookId) || href === `${bookId}.html`) continue
      chapters.push({ href, name: href.replace(/\.html$/, '') })
    }
  }
  // 单页书：封面自带 book-detail-content
  if (!chapters.length && /class="book-detail-content"/i.test(html)) {
    chapters.push({ href: `${bookId}.html`, name: title, inlineHtml: html })
  }
  if (!chapters.length) return null
  return { bookId, title, chapters }
}

/**
 * 解析书目 id / tags。
 * @param {string} title 书名
 * @param {string} bookId 问真 id
 */
function resolveMeta(title, bookId) {
  const cleaned = cleanBookTitle(title)
  const hit = WENZHEN_BOOK_META[cleaned] || WENZHEN_BOOK_META[normalizeBookTitle(cleaned)]
  if (hit) {
    const schoolTag = hit.school ? [`school:${hit.school}`] : []
    return {
      id: hit.id,
      tags: tagsForBook(bookId, [...hit.tags, ...schoolTag]),
      title: cleaned,
      school: hit.school || null
    }
  }
  return { id: slugBookId(cleaned), tags: tagsForBook(bookId, [cleaned]), title: cleaned, school: null }
}

/**
 * 抓取一书并写盘。
 * @param {{ bookId: string, title: string, chapters: { href: string, name: string, inlineHtml?: string }[] }} cover
 */
async function fetchMissingBook(cover) {
  const meta = resolveMeta(cover.title, cover.bookId)
  const book = {
    id: meta.id,
    title: meta.title,
    tags: meta.tags,
    school: meta.school,
    source: `local:wenzhen-html/${cover.bookId}`,
    provider: 'wenzhen-html'
  }

  /** @type {{ line: number, text: string, chapterHint?: string }[]} */
  const allRows = []
  /** @type {string[]} */
  const rawParts = []

  console.log(`  chapters=${cover.chapters.length}`)
  for (let i = 0; i < cover.chapters.length; i++) {
    const ch = cover.chapters[i]
    const html = ch.inlineHtml || (await fetchText(`${BASE}/${ch.href}`))
    if (!ch.inlineHtml) await sleep(delayMs)
    const chapterTitle =
      ((html.match(/class="book-detail-title">([^<]+)/i) || [])[1] || '').trim() || ch.name
    const rows = parseWenzhenChapterHtml(html, chapterTitle)
    allRows.push(...rows)
    rawParts.push(`# ${chapterTitle}\n\n${rows.map((r) => r.text).join('\n\n')}\n`)
    if ((i + 1) % 20 === 0 || i === cover.chapters.length - 1) {
      console.log(`    ${i + 1}/${cover.chapters.length} rows=${allRows.length}`)
    }
  }

  if (!allRows.length) throw new Error('no chapter text extracted')

  const chunks = chunkBookRowsWithHints(book, allRows)
  const lineCount = chunks.reduce((n, c) => n + c.text.length, 0)
  const payload = {
    id: book.id,
    title: book.title,
    source: book.source,
    provider: book.provider,
    tags: book.tags,
    school: book.school,
    wenzhenBookId: cover.bookId,
    fetchedAt: new Date().toISOString(),
    lineCount,
    chunks: chunks.map((c) => ({ ...c, school: book.school }))
  }

  fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(path.join(outDir, `${book.id}.json`), JSON.stringify(payload, null, 2), 'utf8')

  const bookRawDir = path.join(rawDir, book.id)
  fs.mkdirSync(bookRawDir, { recursive: true })
  fs.writeFileSync(path.join(bookRawDir, 'source.md'), rawParts.join('\n'), 'utf8')
  fs.writeFileSync(
    path.join(bookRawDir, 'meta.json'),
    JSON.stringify(
      { id: book.id, title: book.title, wenzhenBookId: cover.bookId, chapters: cover.chapters.length },
      null,
      2
    ),
    'utf8'
  )
  console.log(`  saved ${book.id}.json chunks=${chunks.length} chars=${lineCount}`)
  return payload
}

/**
 * 合并 manifest。
 * @param {object[]} entries 条目
 */
function mergeManifest(entries) {
  const manPath = path.join(outDir, 'manifest.json')
  /** @type {object[]} */
  let prev = []
  if (fs.existsSync(manPath)) {
    try {
      prev = JSON.parse(fs.readFileSync(manPath, 'utf8'))
    } catch {
      prev = []
    }
  }
  const byId = new Map(prev.map((e) => [e.id, e]))
  for (const e of entries) byId.set(e.id, e)
  const next = [...byId.values()].sort((a, b) => String(a.title).localeCompare(String(b.title), 'zh'))
  fs.writeFileSync(manPath, JSON.stringify(next, null, 2), 'utf8')
  return next
}

/**
 * 枚举某大类下所有可能的 sub，扫描书目列表。
 * @param {number} cat 大类
 * @returns {Promise<{ bookId: string, title: string }[]>}
 */
async function discoverCategory(cat) {
  /** @type {{ bookId: string, title: string }[]} */
  const list = []
  for (let sub = 1; sub <= 6; sub++) {
    let streak404 = 0
    let hits = 0
    for (let i = 1; i <= 80; i++) {
      const bookId = `${cat}_${sub}_${i}`
      try {
        const html = await fetchText(`${BASE}/${bookId}.html`)
        const rawTitle = ((html.match(/<title>([^<]+)<\/title>/i) || [])[1] || '').trim()
        if (html.length < 500 || /404|不存在/.test(rawTitle)) {
          streak404 += 1
          if (streak404 >= 6) break
          await sleep(Math.min(delayMs, 250))
          continue
        }
        streak404 = 0
        hits += 1
        list.push({ bookId, title: cleanBookTitle(rawTitle) })
      } catch {
        streak404 += 1
        if (streak404 >= 6) break
      }
      await sleep(Math.min(delayMs, 250))
    }
    if (hits === 0 && sub >= 3) {
      // 该 cat 后续 sub 大概率为空，继续少量探测到 6
    }
  }
  return list
}

async function main() {
  fs.mkdirSync(rawDir, { recursive: true })
  const owned = collectOwnedTitles()
  console.log(`owned titles: ${owned.size}`)
  console.log(`mode=${mode} cats=${cats.join(',')} delay=${delayMs}ms skipCat3=${skipCat3}`)

  /** @type {{ bookId: string, title: string }[]} */
  let catalog = []

  if (onlyBooks.length) {
    catalog = onlyBooks.map((bookId) => ({ bookId, title: bookId }))
    console.log(`only books: ${catalog.map((b) => b.bookId).join(', ')}`)
  } else if (mode === 'fengshui') {
    catalog = listFengshuiWenzhenTargets({ includeYinzhai }).map((b) => ({
      bookId: b.bookId,
      title: b.title
    }))
    console.log(`fengshui whitelist: ${catalog.length} books (yinzhai=${includeYinzhai})`)
  } else if (fs.existsSync(catalogCachePath) && process.env.WENZHEN_REFRESH_CATALOG !== '1') {
    try {
      catalog = JSON.parse(fs.readFileSync(catalogCachePath, 'utf8'))
      console.log(`catalog cache: ${catalog.length} books`)
    } catch {
      catalog = []
    }
  }

  if (!onlyBooks.length && mode !== 'fengshui' && !catalog.length) {
    for (const cat of cats) {
      if (skipCat3 && cat === 3) continue
      console.log(`discover cat ${cat} ...`)
      const part = await discoverCategory(cat)
      console.log(`  cat ${cat}: ${part.length} books`)
      catalog.push(...part)
    }
    fs.writeFileSync(catalogCachePath, JSON.stringify(catalog, null, 2), 'utf8')
    console.log(`catalog saved ${catalogCachePath}`)
  } else if (!onlyBooks.length && mode !== 'fengshui') {
    catalog = catalog.filter((b) => {
      const cat = Number(String(b.bookId).split('_')[0])
      if (skipCat3 && cat === 3) return false
      return cats.includes(cat)
    })
  }

  /** @type {object[]} */
  const results = []
  let fetched = 0
  let skipped = 0

  for (const entry of catalog) {
    const { bookId } = entry
    let cover
    try {
      cover = await loadBookCover(bookId)
    } catch (e) {
      console.log(`skip ${bookId}: ${e instanceof Error ? e.message : e}`)
      await sleep(delayMs)
      continue
    }
    await sleep(Math.min(delayMs, 300))
    if (!cover) continue

    const norm = normalizeBookTitle(cover.title)
    const meta = resolveMeta(cover.title, bookId)
    const outPath = path.join(outDir, `${meta.id}.json`)

    if (!force && owned.has(norm)) {
      console.log(`have  ${bookId} ${cover.title}`)
      skipped += 1
      continue
    }
    if (!force && fs.existsSync(outPath)) {
      console.log(`skip  ${bookId} ${cover.title} (json)`)
      skipped += 1
      continue
    }

    console.log(`fetch ${bookId} ${cover.title}`)
    try {
      const payload = await fetchMissingBook(cover)
      results.push({
        id: payload.id,
        title: payload.title,
        source: payload.source,
        provider: payload.provider,
        chunks: payload.chunks.length,
        chars: payload.lineCount,
        wenzhenBookId: bookId
      })
      owned.add(normalizeBookTitle(cover.title))
      fetched += 1
      // 每成功一本就合并 manifest，便于中断后续跑
      if (results.length % 3 === 0) mergeManifest(results)
    } catch (e) {
      console.error(`  ERROR ${bookId}:`, e instanceof Error ? e.message : e)
      results.push({ id: meta.id, title: cover.title, error: String(e instanceof Error ? e.message : e) })
    }
  }

  const ok = results.filter((r) => !r.error)
  if (ok.length) mergeManifest(ok)
  console.log(`done fetched=${fetched} skipped=${skipped} errors=${results.filter((r) => r.error).length}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
