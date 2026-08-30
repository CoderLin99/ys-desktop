/**
 * 从本地 mingli-research 书仓导入命理古籍（构建时运行）。
 * 默认只读本地，不访问网络。
 *
 * 环境变量：
 * - FORCE=1 覆盖已有 json
 * - CLASSICS_VENDOR / 自动探测 D:/Work Folder/ai/mingli-research
 * - MINGLI_ROOT 显式指定 mingli-research 根目录
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { discoverLocalMingliSources } from './classics-sources.mjs'
import { chunkBookRowsWithHints, parseMingliResearchMarkdown } from './rag-lib.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const outDir = path.join(root, 'resources', 'classics')

/** Node 18+ */
const nodeMajor = Number(process.versions.node.split('.')[0])
if (nodeMajor < 18) {
  console.error(`classics:fetch 需要 Node.js >= 18（当前 ${process.version}）`)
  console.error('请使用 npm run classics:fetch（会自动选用 Node 22）。')
  process.exit(1)
}

const force = process.env.FORCE === '1'

/**
 * 在候选路径中选第一个存在的目录。
 * @param {string[]} candidates 绝对路径列表
 * @returns {string | null}
 */
function firstExistingDir(candidates) {
  for (const p of candidates) {
    if (fs.existsSync(p) && fs.statSync(p).isDirectory()) return p
  }
  return null
}

/**
 * 解析 mingli-research 本地根目录。
 */
function resolveMingliRoot() {
  if (process.env.MINGLI_ROOT) {
    return path.resolve(process.env.MINGLI_ROOT)
  }
  const vendorRoot = process.env.CLASSICS_VENDOR
    ? path.resolve(process.env.CLASSICS_VENDOR)
    : path.join(root, 'vendor')
  const found = firstExistingDir([
    path.join(vendorRoot, 'mingli-research'),
    path.join(root, '..', '..', 'mingli-research'), // D:/Work Folder/ai/mingli-research
    path.join(root, 'vendor', 'mingli-research')
  ])
  if (!found) {
    throw new Error(
      '未找到本地书仓 mingli-research。请 clone 到 D:\\Work Folder\\ai\\mingli-research 或设置 MINGLI_ROOT。'
    )
  }
  return found
}

/**
 * 递归列出目录下相对路径（posix）。
 * @param {string} absDir 绝对目录
 * @param {string} [prefix] 相对前缀
 * @returns {string[]}
 */
function listFilesRecursive(absDir, prefix = '') {
  if (!fs.existsSync(absDir)) return []
  /** @type {string[]} */
  const out = []
  for (const name of fs.readdirSync(absDir)) {
    const abs = path.join(absDir, name)
    const rel = prefix ? `${prefix}/${name}` : name
    if (fs.statSync(abs).isDirectory()) {
      out.push(...listFilesRecursive(abs, rel))
    } else {
      out.push(rel.replace(/\\/g, '/'))
    }
  }
  return out
}

/**
 * 从本地 books/{书名}/articles 下各 source.md 聚合全书并切块。
 * @param {import('./classics-sources.mjs').ClassicSource} book 书目
 * @param {string} mingliRoot 仓库根
 */
function importLocalMingliBook(book, mingliRoot) {
  const repoBook = book.repoBook || book.title
  const prefix = `books/${repoBook}/articles/`
  const paths = listFilesRecursive(mingliRoot)
    .filter((p) => p.startsWith(prefix) && p.endsWith('/source.md'))
    .sort()
  if (!paths.length) throw new Error(`no source.md under ${prefix}`)

  /** @type {{ line: number, text: string, chapterHint?: string }[]} */
  const allRows = []
  console.log(`  local-mingli ${book.title} articles=${paths.length}`)
  for (const p of paths) {
    /** articles 下一级目录名为章节（…/articles/{章}/source.md） */
    const parts = p.split('/')
    const chapter = decodeURIComponent(parts[parts.length - 2] || '正文')
    const md = fs.readFileSync(path.join(mingliRoot, p), 'utf8')
    allRows.push(...parseMingliResearchMarkdown(md, chapter))
  }
  console.log(`    rows=${allRows.length}`)
  return chunkBookRowsWithHints(book, allRows)
}

/**
 * 导入单书并写盘。
 * @param {import('./classics-sources.mjs').ClassicSource} book 书目
 * @param {string} mingliRoot 仓库根
 */
function fetchOneBook(book, mingliRoot) {
  const chunks = importLocalMingliBook(book, mingliRoot)
  const lineCount = chunks.reduce((n, c) => n + c.text.length, 0)
  const payload = {
    id: book.id,
    title: book.title,
    source: book.source,
    provider: 'local-mingli',
    tags: book.tags,
    fetchedAt: new Date().toISOString(),
    lineCount,
    chunks
  }
  const outPath = path.join(outDir, `${book.id}.json`)
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf8')
  console.log(`  saved ${outPath} chunks=${chunks.length}`)
  return payload
}

function main() {
  const mingliRoot = resolveMingliRoot()
  console.log(`mingli root: ${mingliRoot}`)
  const sources = discoverLocalMingliSources(mingliRoot)
  console.log(`discovered ${sources.length} books`)

  fs.mkdirSync(outDir, { recursive: true })

  /** 旧 id 文件清理：八字提要曾用 bazi-tiyao */
  const legacyPath = path.join(outDir, 'bazi-tiyao.json')
  if (fs.existsSync(legacyPath) && sources.some((s) => s.id === 'bazitiyao')) {
    fs.unlinkSync(legacyPath)
    console.log('removed legacy bazi-tiyao.json')
  }

  /** @type {object[]} */
  const manifest = []

  for (const book of sources) {
    const outPath = path.join(outDir, `${book.id}.json`)
    if (!force && fs.existsSync(outPath)) {
      const prev = JSON.parse(fs.readFileSync(outPath, 'utf8'))
      console.log(`skip ${book.id} (exists, chunks=${prev.chunks?.length ?? 0})`)
      manifest.push({
        id: book.id,
        title: book.title,
        source: book.source,
        provider: 'local-mingli',
        chunks: prev.chunks?.length ?? 0,
        skipped: true
      })
      continue
    }

    console.log(`book: ${book.title}`)
    try {
      const payload = fetchOneBook(book, mingliRoot)
      manifest.push({
        id: book.id,
        title: book.title,
        source: book.source,
        provider: 'local-mingli',
        chunks: payload.chunks.length,
        chars: payload.lineCount
      })
    } catch (e) {
      console.error(`  ERROR ${book.id}:`, e instanceof Error ? e.message : e)
      manifest.push({ id: book.id, title: book.title, error: String(e instanceof Error ? e.message : e) })
    }
  }

  fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8')
  console.log('manifest written', manifest.length, 'books')
}

main()
