/**
 * 本地古籍书目元数据（mingli-research/books）。
 * 实际导入以本地目录扫描为准；此处只补稳定 id 与检索 tags。
 * source 一律写 local:…，不写线上 URL。
 */
import fs from 'node:fs'
import path from 'node:path'

/**
 * @typedef {object} ClassicSource
 * @property {string} id 语料/索引用书目 id
 * @property {string} title 书名（与 books 目录名一致）
 * @property {string[]} tags 检索标签
 * @property {string} source 本地归属说明
 * @property {'local-mingli'} provider
 * @property {string} repoBook books 下目录名
 */

/**
 * 已知书名 → id / tags（未收录的书会按目录名自动生成 id）。
 * @type {Record<string, { id: string, tags: string[] }>}
 */
export const MINGLI_BOOK_META = {
  渊海子平: { id: 'yuanhai', tags: ['十神', '用神', '月令', '神煞', '格局'] },
  子平真诠: { id: 'zhenquan', tags: ['格局', '用神', '成格', '破格', '十神'] },
  穷通宝鉴: { id: 'qiongtong', tags: ['调候', '寒暖', '日干', '月令'] },
  滴天髓阐微: { id: 'ditian', tags: ['体用', '通关', '中和', '格局'] },
  神峰通考: { id: 'shenfeng', tags: ['从格', '外格', '病药', '格局'] },
  千里命稿: { id: 'qianli', tags: ['喜用', '旺衰', '格局', '评断', '六亲'] },
  五行精纪: { id: 'wuxingjingji', tags: ['五行', '旺相', '纳音', '贵格', '禄马'] },
  命理约言: { id: 'mingliyueyan', tags: ['约言', '格局', '十神', '用神', '建禄'] },
  造化元钥评注: { id: 'zaohuayuanyao', tags: ['调候', '寒暖', '日干', '月令', '元钥'] },
  兰台妙选: { id: 'lantai', tags: ['禄马', '贵格', '纳音', '格局'] },
  八字提要: { id: 'bazitiyao', tags: ['评断', '格局', '用神', '六亲', '提要'] },
  三命通会: { id: 'santong', tags: ['神煞', '合冲', '纳音', '十神', '大运', '珞琭'] },
  鬼谷遗文: { id: 'guiguyiwen', tags: ['古赋', '气势', '禄马'] },
  呱呱集: { id: 'guaguaji', tags: ['紫微', '叙述'] },
  子平管见: { id: 'zipingguanjian', tags: ['简明', '喜用', '实用'] },
  五行大义: { id: 'wuxingdayi', tags: ['五行', '生克', '旺相'] },
  命理探原: { id: 'minglitanyuan', tags: ['命理', '源流', '格局'] },
  李虚中命书: { id: 'lixuzhong', tags: ['古法', '纳音', '禄命'] },
  玉照定真经: { id: 'yuzhaodingzhen', tags: ['古赋', '定真', '断语'] },
  紫微斗数全书: { id: 'ziwei-quanshu', tags: ['紫微', '星曜', '宫位', 'school:ziwei'], school: 'ziwei' }
}

/**
 * 问真 HTML 补缺书目元数据（与 fetch-wenzhen-classics.mjs 对齐）。
 * @type {Record<string, { id: string, tags: string[], school?: string }>}
 */
export const WENZHEN_BOOK_META = {
  问真神煞大全: {
    id: 'wenzhen-shenshadaquan',
    tags: ['神煞', '贵人', '煞星'],
    school: 'mingli'
  },
  神煞大全: {
    id: 'wenzhen-shenshadaquan',
    tags: ['神煞', '贵人', '煞星'],
    school: 'mingli'
  },
  '滴天髓-原文': { id: 'ditian-yuanwen', tags: ['滴天髓', '原文', '体用', '格局'], school: 'mingli' },
  星平会海: { id: 'xingpinghuihai', tags: ['星命', '子平', '会海', '格局'], school: 'mingli' },
  御定子平: { id: 'yudingziping', tags: ['子平', '御定', '格局', '神煞'], school: 'mingli' },
  星命总括: { id: 'xingmingzonggua', tags: ['星命', '总括', '赋'], school: 'mingli' },
  月谈赋: { id: 'yuetanfu', tags: ['星命', '赋', '月谈'], school: 'mingli' },
  珞琭子消息赋: { id: 'luoluzi', tags: ['珞琭', '消息赋', '古赋', '禄命'], school: 'mingli' },
  星命抉古录: { id: 'xingmingjuegu', tags: ['星命', '抉古', '评断'], school: 'mingli' },
  /** 阳宅 P0 */
  宅经: { id: 'zhaijing', tags: ['阳宅', '宅经', '宜忌'], school: 'yangzhai' },
  阳宅十书: { id: 'yangzhaishishu', tags: ['阳宅', '十书', '方位'], school: 'yangzhai' },
  入地眼全书: { id: 'rudiyan', tags: ['阳宅', '入地眼', '实用'], school: 'yangzhai' },
  /** 阳宅 P1 理气/形峦润色 */
  青囊经: { id: 'qingnang', tags: ['青囊', '理气', '风水'], school: 'yangzhai' },
  发微论: { id: 'faweilun', tags: ['发微', '理气', '风水'], school: 'yangzhai' },
  雪心赋: { id: 'xuexinfu', tags: ['雪心', '形峦', '风水'], school: 'yangzhai' },
  撼龙经: { id: 'hanlong', tags: ['撼龙', '龙脉', '形峦'], school: 'yangzhai' },
  水龙经: { id: 'shuilong', tags: ['水龙', '水法', '形峦'], school: 'yangzhai' },
  玉尺经: { id: 'yuchi', tags: ['玉尺', '理气', '风水'], school: 'yangzhai' },
  催官篇: { id: 'cuiguan', tags: ['催官', '理气', '风水'], school: 'yangzhai' },
  博山篇: { id: 'boshan', tags: ['博山', '理气', '风水'], school: 'yangzhai' },
  /** 阴宅 P2：入库可隔离，默认不注入居家 RAG */
  葬经: { id: 'zangjing', tags: ['阴宅', '葬经'], school: 'yinzhai' },
  葬经翼: { id: 'zangjingyi', tags: ['阴宅', '葬经翼'], school: 'yinzhai' },
  葬法倒杖: { id: 'zangfadaozhang', tags: ['阴宅', '倒杖'], school: 'yinzhai' }
}

/**
 * 问真风水白名单：仅抓这些封面 id（4_1_*）。
 * P0/P1 默认抓取；P2 阴宅需 WENZHEN_INCLUDE_YINZHAI=1。
 * @type {{ bookId: string, title: string, tier: 'P0' | 'P1' | 'P2' }[]}
 */
export const FENSHUI_WENZHEN_WHITELIST = [
  { bookId: '4_1_16', title: '宅经', tier: 'P0' },
  { bookId: '4_1_11', title: '阳宅十书', tier: 'P0' },
  { bookId: '4_1_8', title: '入地眼全书', tier: 'P0' },
  { bookId: '4_1_7', title: '青囊经', tier: 'P1' },
  { bookId: '4_1_4', title: '发微论', tier: 'P1' },
  { bookId: '4_1_10', title: '雪心赋', tier: 'P1' },
  { bookId: '4_1_5', title: '撼龙经', tier: 'P1' },
  { bookId: '4_1_9', title: '水龙经', tier: 'P1' },
  { bookId: '4_1_12', title: '玉尺经', tier: 'P1' },
  { bookId: '4_1_2', title: '催官篇', tier: 'P1' },
  { bookId: '4_1_1', title: '博山篇', tier: 'P1' },
  { bookId: '4_1_14', title: '葬经', tier: 'P2' },
  { bookId: '4_1_15', title: '葬经翼', tier: 'P2' },
  { bookId: '4_1_13', title: '葬法倒杖', tier: 'P2' }
]

/**
 * 按层级过滤风水白名单。
 * @param {{ includeYinzhai?: boolean }} [opts]
 */
export function listFengshuiWenzhenTargets(opts = {}) {
  const includeYinzhai = Boolean(opts.includeYinzhai)
  return FENSHUI_WENZHEN_WHITELIST.filter((b) => b.tier !== 'P2' || includeYinzhai)
}

/**
 * 将中文书名收成稳定 ascii id（无元数据时用）。
 * @param {string} title 书名
 */
export function slugBookId(title) {
  return `book-${Buffer.from(title, 'utf8').toString('hex').slice(0, 16)}`
}

/**
 * 扫描本地 mingli-research/books，生成全部可导入书目（目录下需有 source.md）。
 * @param {string} mingliRoot mingli-research 仓库根目录
 * @returns {ClassicSource[]}
 */
export function discoverLocalMingliSources(mingliRoot) {
  const booksDir = path.join(mingliRoot, 'books')
  if (!fs.existsSync(booksDir)) {
    throw new Error(`本地书仓不存在: ${booksDir}`)
  }

  /** @type {ClassicSource[]} */
  const list = []
  for (const title of fs.readdirSync(booksDir).sort()) {
    const articles = path.join(booksDir, title, 'articles')
    if (!fs.existsSync(articles) || !fs.statSync(articles).isDirectory()) continue

    /** 是否至少有一篇 source.md */
    let hasSource = false
    const walk = (dir) => {
      for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        if (ent.isDirectory()) walk(path.join(dir, ent.name))
        else if (ent.name === 'source.md') hasSource = true
      }
    }
    walk(articles)
    if (!hasSource) continue

    const meta = MINGLI_BOOK_META[title] || { id: slugBookId(title), tags: [title] }
    list.push({
      id: meta.id,
      title,
      provider: 'local-mingli',
      repoBook: title,
      tags: meta.tags,
      school: meta.school || 'mingli',
      source: `local:mingli-research/books/${title}`
    })
  }
  return list
}

/**
 * 兼容旧导入名（已改为运行时扫描）。
 * @type {ClassicSource[]}
 */
export const CLASSIC_SOURCES = []
