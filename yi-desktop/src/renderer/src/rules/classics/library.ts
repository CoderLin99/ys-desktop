/**
 * 学堂古籍阅览：离线索引按书/章组织；对外展示去品牌前缀并分门类。
 */
import { loadRagIndex } from '../bazi/rag/loadIndex'
import type { RagChunkDoc } from '../bazi/rag/types'

/** 书城分类 id */
export type ClassicStoreCategory =
  | 'ziping'
  | 'shensha'
  | 'ziwei'
  | 'yangzhai'
  | 'yinzhai'
  | 'other'

/** 分类展示 */
export const CLASSIC_STORE_CATEGORIES: {
  id: ClassicStoreCategory | 'all'
  label: string
}[] = [
  { id: 'all', label: '全部' },
  { id: 'ziping', label: '子平八字' },
  { id: 'shensha', label: '神煞专论' },
  { id: 'ziwei', label: '紫微斗数' },
  { id: 'yangzhai', label: '阳宅风水' },
  { id: 'yinzhai', label: '阴宅形法' },
  { id: 'other', label: '其他' }
]

/** 书目摘要（目录 / 书城用） */
export interface ClassicLibraryBook {
  /** 书目 id */
  id: string
  /** 原始书名（索引内） */
  title: string
  /** 对外展示书名（已去品牌前缀） */
  displayTitle: string
  /** 章节数 */
  chapterCount: number
  /** 段落块数 */
  chunkCount: number
  /** 学派原始字段 */
  school?: string
  /** 书城分类 */
  category: ClassicStoreCategory
  /** 分类中文名 */
  categoryLabel: string
}

/** 单章 */
export interface ClassicLibraryChapter {
  /** 章节标题 */
  title: string
  /** 本章段落 */
  paragraphs: string[]
}

/**
 * 去掉易引发版权联想的品牌前缀（仅展示层）。
 * @param title 原书名
 */
export function sanitizeClassicDisplayTitle(title: string): string {
  return String(title || '')
    .replace(/^问真/g, '')
    .replace(/问真/g, '')
    .replace(/^[-—_\s]+/, '')
    .trim() || title
}

/**
 * 分类中文名。
 * @param cat 分类
 */
export function classicCategoryLabel(cat: ClassicStoreCategory): string {
  return CLASSIC_STORE_CATEGORIES.find((c) => c.id === cat)?.label || '其他'
}

/**
 * 按学派与书名推断书城分类。
 * @param bookId 书 id
 * @param title 书名
 * @param school 学派
 */
export function categorizeClassicBook(
  bookId: string,
  title: string,
  school?: string
): ClassicStoreCategory {
  const blob = `${bookId} ${title} ${school || ''}`
  if (/神煞/.test(blob) || /shensha/i.test(bookId)) return 'shensha'
  if (school === 'ziwei' || /紫微|ziwei/i.test(blob)) return 'ziwei'
  if (school === 'yangzhai' || /阳宅|风水|青囊|撼龙|雪心|宅经|博山|催官|发微|玉尺|入地|水龙/.test(blob)) {
    return 'yangzhai'
  }
  if (school === 'yinzhai' || /阴宅/.test(blob)) return 'yinzhai'
  if (school === 'mingli' || /子平|命理|滴天|渊海|穷通|三命|神峰|千里|珞琭|星命|五行/.test(blob)) {
    return 'ziping'
  }
  return 'other'
}

/**
 * 列出已收录书目（按分类再按书名排序）。
 */
export async function listClassicLibraryBooks(): Promise<ClassicLibraryBook[]> {
  const index = await loadRagIndex()
  if (!index?.docs?.length) return []

  const map = new Map<string, ClassicLibraryBook & { chapters: Set<string> }>()
  for (const d of index.docs) {
    let row = map.get(d.bookId)
    if (!row) {
      const category = categorizeClassicBook(d.bookId, d.title, d.school)
      row = {
        id: d.bookId,
        title: d.title,
        displayTitle: sanitizeClassicDisplayTitle(d.title),
        chapterCount: 0,
        chunkCount: 0,
        school: d.school,
        category,
        categoryLabel: classicCategoryLabel(category),
        chapters: new Set()
      }
      map.set(d.bookId, row)
    }
    row.chunkCount += 1
    if (d.chapter) row.chapters.add(d.chapter)
    if (!row.school && d.school) row.school = d.school
  }

  const order: ClassicStoreCategory[] = [
    'ziping',
    'shensha',
    'ziwei',
    'yangzhai',
    'yinzhai',
    'other'
  ]
  return [...map.values()]
    .map(({ chapters, ...rest }) => ({
      ...rest,
      chapterCount: chapters.size
    }))
    .sort((a, b) => {
      const ai = order.indexOf(a.category)
      const bi = order.indexOf(b.category)
      if (ai !== bi) return ai - bi
      return a.displayTitle.localeCompare(b.displayTitle, 'zh')
    })
}

/**
 * 读取一书全部章节（按索引出现顺序）。
 * @param bookId 书目 id
 */
export async function loadClassicBookChapters(bookId: string): Promise<{
  title: string
  displayTitle: string
  chapters: ClassicLibraryChapter[]
} | null> {
  const index = await loadRagIndex()
  if (!index?.docs?.length) return null
  const docs = index.docs.filter((d) => d.bookId === bookId)
  if (!docs.length) return null

  const order: string[] = []
  const byChapter = new Map<string, RagChunkDoc[]>()
  for (const d of docs) {
    const key = d.chapter || '正文'
    if (!byChapter.has(key)) {
      byChapter.set(key, [])
      order.push(key)
    }
    byChapter.get(key)!.push(d)
  }

  const title = docs[0].title
  return {
    title,
    displayTitle: sanitizeClassicDisplayTitle(title),
    chapters: order.map((chapterTitle) => ({
      title: chapterTitle,
      paragraphs: (byChapter.get(chapterTitle) || []).map((d) =>
      String(d.text || '').replace(/问真精评/g, '精评').replace(/问真/g, '')
    )
    }))
  }
}
