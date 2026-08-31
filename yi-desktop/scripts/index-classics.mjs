/**
 * 将 resources/classics/*.json 切块语料构建为 BM25 倒排索引，输出到 public/rag。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildBm25Index } from './rag-lib.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const corpusDir = path.join(root, 'resources', 'classics')
const outDir = path.join(root, 'src', 'renderer', 'public', 'rag')
const outFile = path.join(outDir, 'classics-index.json')

function main() {
  if (!fs.existsSync(corpusDir)) {
    console.error('missing resources/classics — run npm run classics:fetch first')
    process.exit(1)
  }

  /** @type {object[]} */
  const docs = []
  const files = fs.readdirSync(corpusDir).filter((f) => f.endsWith('.json') && f !== 'manifest.json')

  for (const file of files) {
    const raw = JSON.parse(fs.readFileSync(path.join(corpusDir, file), 'utf8'))
    if (!raw.chunks?.length) continue
    for (const c of raw.chunks) {
      const tags = c.tags || raw.tags || []
      /** 从 tags 里解析 school:xxx，或用书级 school 字段 */
      const schoolFromTag = tags.map((t) => String(t)).find((t) => t.startsWith('school:'))
      const school =
        c.school ||
        raw.school ||
        (schoolFromTag ? schoolFromTag.slice('school:'.length) : null) ||
        'mingli'
      docs.push({
        id: c.id,
        bookId: c.bookId,
        title: c.title,
        chapter: c.chapter,
        text: c.text,
        tags,
        school,
        source: c.source || raw.source
      })
    }
  }

  if (!docs.length) {
    console.error('no chunks found')
    process.exit(1)
  }

  const bm25 = buildBm25Index(docs)
  const manifest = fs.existsSync(path.join(corpusDir, 'manifest.json'))
    ? JSON.parse(fs.readFileSync(path.join(corpusDir, 'manifest.json'), 'utf8'))
    : []

  const payload = {
    version: 1,
    builtAt: new Date().toISOString(),
    docCount: docs.length,
    books: manifest,
    avgDocLen: bm25.avgDocLen,
    docLens: bm25.docLens,
    inverted: bm25.inverted,
    docs
  }

  fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(outFile, JSON.stringify(payload), 'utf8')
  const mb = (fs.statSync(outFile).size / 1024 / 1024).toFixed(2)
  console.log(`index: ${outFile} docs=${docs.length} size=${mb}MB`)
}

main()
