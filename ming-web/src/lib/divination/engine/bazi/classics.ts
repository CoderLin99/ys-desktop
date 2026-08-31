/**
 * 子平经典义理归纳（原创摘要，非原文照录）。
 *
 * 用途：
 * 1. 学堂/规则页展示各书侧重点
 * 2. 断言引擎按「可编码口诀」生成更贴近传统的评价
 *
 * 声明：义理按本程序可编码规则落地，用于命理总批；流派分歧以本文件为准。
 */
import type { BaZiChart } from './chart'
import type { BaZiTrend } from './trend'
import type { WuXing } from '../constants'
import { DIZHI_WUXING, TIANGAN_WUXING, type DiZhi, type TianGan } from '../constants'
import type { ShiShen } from './shishen'
import { qiongTongOfChart } from './ming'
import { collectHeHua } from './hehua'
import { getTiaoHouRow } from './tables/load'

/** 经典书目卡片 */
export interface ClassicBook {
  /** 书名 */
  id: string
  /** 显示名 */
  title: string
  /** 体系分类（学堂分组 / AI 加权） */
  school: 'bazi' | 'ziwei' | 'qizheng' | 'cross'
  /** 一句话定位 */
  focus: string
  /** 可编码的核心要点（摘要） */
  points: string[]
  /** 对断言的贡献标签 */
  tags: string[]
}

/**
 * 书库收录：原创义理摘要（非原文）。
 * 含此前六部 + 五行精纪/鬼谷遗文/造化元钥等扩展书目。
 */
export const CLASSIC_BOOKS: ClassicBook[] = [
  {
    id: 'yuanhai',
    title: '渊海子平',
    school: 'bazi',
    focus: '子平法奠基：十神、用神、财官印食的基本人事象征',
    points: [
      '以日干为「我」，月令为提纲，先定身强弱再谈用神。',
      '财、官、印、食为人事大纲：财主货利，官主名权，印主学荫，食伤主才艺输出。',
      '神煞只作辅证，不以神煞压过用神与月令。'
    ],
    tags: ['十神', '用神', '月令']
  },
  {
    id: 'zhenquan',
    title: '子平真诠',
    school: 'bazi',
    focus: '格局论：月令取格、成格破格、扶抑有情',
    points: [
      '看命先看月令透干所成之格（官、煞、财、印、食伤等）。',
      '成格要有情：官要财生或印护，煞要制化，财要有源，印要官煞生，食伤要有财通关。',
      '破格常见：伤官见官、财坏印、枭神夺食等，需通关或合去方救。'
    ],
    tags: ['格局', '成格', '破格']
  },
  {
    id: 'qianli',
    title: '千里命稿',
    school: 'bazi',
    focus: '近现代讲法：强弱喜用说得清楚，人事对应直白',
    points: [
      '先断旺衰，再定喜用忌；喜用到位则事顺，忌神当令则阻滞。',
      '同一十神，身强身弱含义不同：身弱遇官煞多压力，身强遇官煞反可立业。',
      '大运流年以「喜用是否到位」作总评，细节再看十神。'
    ],
    tags: ['喜用', '旺衰', '流年']
  },
  {
    id: 'qiongtong',
    title: '穷通宝鉴',
    school: 'bazi',
    focus: '调候：寒暖燥湿，冬季需火、夏季需水一类',
    points: [
      '命局如气候：过寒要暖，过热要凉，过燥要润，过湿要燥。',
      '亥子丑月令偏寒，喜见丙丁暖局；巳午未月令偏燥热，喜见壬癸润局。',
      '调候之神有时重于普通扶抑，尤其极端季节出生者。'
    ],
    tags: ['调候', '寒暖', '季节']
  },
  {
    id: 'santong',
    title: '三命通会',
    school: 'bazi',
    focus: '百科式汇编：合冲刑害、神煞、常法汇参',
    points: [
      '合可解冲、冲可解合，刑害主摩擦，需结合用神看是否为祸。',
      '神煞条目极多，宜「有则参考、无则勿硬凑」。',
      '同一象可多解，取与日主喜用一致者优先。'
    ],
    tags: ['神煞', '合冲', '汇参']
  },
  {
    id: 'ditian',
    title: '滴天髓',
    school: 'bazi',
    focus: '体用与通关：有情无情、通根透干、中和为贵',
    points: [
      '日主为体，余气为用；用神有力且与日主有情则佳。',
      '两势相战要通关：如金木交战取水通关，水火交战取木通关。',
      '中和为美，偏枯则需运岁补偏；真假从弱从势另当别论（本程序仅提示倾向）。'
    ],
    tags: ['体用', '通关', '中和']
  },
  {
    id: 'wuxingjingji',
    title: '五行精纪',
    school: 'bazi',
    focus: '五行生克制化、旺相休囚死与用事轻重',
    points: [
      '五行以生克制化为纲，旺相得令者力大，休囚失令者力弱。',
      '同一五行因月令、透干、通根不同，用事层次不同。',
      '论断宜先定五行气势，再落入十神人事，避免空谈字面。'
    ],
    tags: ['五行', '旺相', '气势']
  },
  {
    id: 'guiguyiwen',
    title: '鬼谷遗文',
    school: 'bazi',
    focus: '古赋体命理口诀：贵贱荣枯的象意提纲',
    points: [
      '重「有气」「得地」「逢生」与「受克」「无救」的对比。',
      '贵人、禄马等象宜与日主喜用同参，不可孤立成断。',
      '文言口诀宜译成可验证条件后再写入程序规则。'
    ],
    tags: ['古赋', '气势', '禄马']
  },
  {
    id: 'zaohuayuanyao',
    title: '造化元钥评注',
    school: 'bazi',
    focus: '调候用神细论，与穷通一脉，评注更具体到日干月令',
    points: [
      '强调日干在各月的寒暖燥湿需求，用神常以调候为先。',
      '有调候用神与扶抑用神冲突时，极端季节优先调候。',
      '评注传统一派：先定「要火还是要水」，再谈财官。'
    ],
    tags: ['调候', '用神', '日干月令']
  },
  {
    id: 'xingmingzongkuo',
    title: '星命总括',
    school: 'cross',
    focus: '星命与子平交汇的总纲式摘要（本程序以八字为主）',
    points: [
      '星命重星曜落宫，子平重干支十神；二者术语不可硬套。',
      '若仅作八字断语，取其「先提纲后细节」的层次即可。',
      '本程序不断紫微星盘，只借其「总括宜简」的写法。'
    ],
    tags: ['总括', '层次', '跨体系']
  },
  {
    id: 'xingpinghuihai',
    title: '星平会海',
    school: 'cross',
    focus: '星命与子平会通：同参勿混名',
    points: [
      '会通意在对照，不是把紫微星名直接当十神。',
      '八字侧仍以月令、用神、格局为准。',
      '输出评价时应标明依据来自子平规则事实，避免星盘幻觉。'
    ],
    tags: ['会通', '对照', '防幻觉']
  },
  {
    id: 'guaguaji',
    title: '呱呱集',
    school: 'ziwei',
    focus: '紫微斗数札记取向（本程序八字断语仅作风格参考）',
    points: [
      '紫微重星曜组合与宫位，与子平月令格局不是同一套符号。',
      '八字 AI 润色时不要编造紫微星曜落宫。',
      '可借鉴其「先论性格倾向、再论事」的叙述顺序。'
    ],
    tags: ['紫微', '叙述', '勿混用']
  },
  {
    id: 'zipingguanjian',
    title: '子平管见',
    school: 'bazi',
    focus: '子平实用短论：喜用、取用宜简明',
    points: [
      '主张断语简明：先喜用、后细节，忌堆砌。',
      '身强身弱与用神冲突时，以能落地的人事建议为要。',
      '神煞少而精，宁缺毋滥。'
    ],
    tags: ['简明', '喜用', '实用']
  },
  {
    id: 'yuetanfu',
    title: '月谈赋',
    school: 'cross',
    focus: '赋体总论命理气象，宜取其提纲意识',
    points: [
      '赋文多论气势、荣枯、起伏，不宜句句坐实。',
      '程序侧只取「先气象后细节」的表达顺序。',
      '禁止把赋中典故当成用户真实经历。'
    ],
    tags: ['赋体', '气象', '克制']
  },
  {
    id: 'bazitiyao',
    title: '八字提要',
    school: 'bazi',
    focus: '八字组合与结构提要：便于速查大纲',
    points: [
      '提要体：先结构（身强弱、格、用神），后象意。',
      '适合作为 AI 输出大纲：总断 → 喜用 → 注意点。',
      '细节矛盾时退回已计算事实，不脑补四柱。'
    ],
    tags: ['提要', '结构', '大纲']
  },
  {
    id: 'mingliyueyan',
    title: '命理约言',
    school: 'bazi',
    focus: '约言体：精炼原则，反对繁琐堆砌',
    points: [
      '约言强调「少而准」：一条原则说透，胜过十条空话。',
      '评价应克制绝对化措辞（必、一定、终身）。',
      '与千里命稿相近，偏近现代可读表达。'
    ],
    tags: ['约言', '克制', '精炼']
  },
  {
    id: 'yudingziping',
    title: '御定子平',
    school: 'bazi',
    focus: '官方整理取向的子平纲要：正统格局与用神秩序',
    points: [
      '强调正统子平秩序：日主、月令、用神、岁运。',
      '神煞、外格宜后置，避免喧宾夺主。',
      '适合作为 AI「默认正统口径」的权重参考。'
    ],
    tags: ['正统', '秩序', '用神']
  },
  {
    id: 'luluzi',
    title: '珞琭子消息赋',
    school: 'cross',
    focus: '古赋消息：气势消长，宜意译不宜逐句坐实',
    points: [
      '重「消息」：气势消长、阴阳进退。',
      '文言玄奥，程序只取其「看气势起伏」一层。',
      'AI 不得伪造赋文原句冒充引用。'
    ],
    tags: ['消息', '气势', '古赋']
  },
  {
    id: 'shenfeng',
    title: '神峰通考',
    school: 'bazi',
    focus: '外格从格：从强从弱、弃命从财官，专论偏枯之造',
    points: [
      '身极弱而官杀财食成党、印比无根无助，可论真从弱；身极旺而印比成党、克泄无力，可论真从强。',
      '假从仍有印比或克泄残留，岁运一见生扶/克泄须改回扶抑，不可死从。',
      '真从改写喜用：从财从杀从儿顺其党，从旺顺印比；未入从格仍走月令扶抑。'
    ],
    tags: ['从格', '外格', '偏枯']
  },
  {
    id: 'dayun-xiangjie',
    title: '八字大运详解',
    school: 'bazi',
    focus: '大运是十年气运总纲，先看喜用到位再落到流年',
    points: [
      '大运管十年主题：先看这一步对日主的生克、与喜用是否到位，再看流年叠加。',
      '换运如换季，不宜用单年否定十年；忌神运宜守、用神运可进取但仍须执行。',
      '应期只论议题（事业、财、健康、关系），禁止编造具体私人事件。'
    ],
    tags: ['大运', '喜用', '流年']
  },
  {
    id: 'dayun-tushuo',
    title: '大运学图说',
    school: 'bazi',
    focus: '岁运对照：大运定起伏，流年是应期窗口',
    points: [
      '大运定阶段起伏，流年是叠加窗口；价值在「哪一步转势」。',
      '流月按节令交节时刻起月，交节前后三日为换月窗口；点到月只论当月议题显不显。',
      '大运为纲、流年定向、流月显象，三层同气或冲动日支时议题更显。'
    ],
    tags: ['流年', '流月', '应期']
  },
  {
    id: 'daxian-yunshi',
    title: '命理预测与大限运势',
    school: 'bazi',
    focus: '大限论阶段主题，预测落在议题而非私人事',
    points: [
      '大限/大运论阶段主题（事业、财、健康、关系），看这段时间什么议题更显。',
      '现代口径：官看职场规则与考核，印看进修考证与平台资质，不等于科举或学历光环。',
      '禁止写车祸、中奖日期等未给出的私人事件。'
    ],
    tags: ['大限', '预测', '现代口径']
  }
]

/**
 * 书库对「规则推断 + AI 总批」够不够用：子平核心已够，缺口是编码细法不是再堆书名。
 */
export const CLASSIC_INFERENCE_NOTE =
  '子平核心已收录渊海、真诠、穷通、滴天髓、千里、三命、神峰与岁运三书，足够支撑本程序的规则推断和 AI 总批。紫微、赋论只用来防止术语混用。真从/假从、流月交节时刻与大运流年流月三层叠加、干支合化已按可编码细法落地；未入从格仍走扶抑。'

/** 学堂分组标题 */
export const CLASSIC_SCHOOL_LABEL: Record<ClassicBook['school'], string> = {
  bazi: '八字 · 子平',
  ziwei: '紫微斗数（参考）',
  qizheng: '七政四余（参考）',
  cross: '跨体系 / 赋论'
}

/** 学堂分组展示顺序 */
const SCHOOL_ORDER: ClassicBook['school'][] = ['bazi', 'cross', 'ziwei', 'qizheng']

/**
 * 按体系分组书目（学堂 UI 用）。
 * @returns 有书的分组列表（空组省略）
 */
export function groupClassicBooksBySchool(): {
  /** 体系键 */
  school: ClassicBook['school']
  /** 分组标题 */
  label: string
  /** 该书系下的书 */
  books: ClassicBook[]
}[] {
  return SCHOOL_ORDER.map((school) => ({
    school,
    label: CLASSIC_SCHOOL_LABEL[school],
    books: CLASSIC_BOOKS.filter((b) => b.school === school)
  })).filter((g) => g.books.length > 0)
}

/**
 * 将书库原创摘要压成可注入 AI 的知识包。
 * 八字与跨体系给全文要点；紫微/七政只给「勿混用」短注，避免模型编造星盘。
 * @param options.maxChars 最大字符数，默认 9000，防止撑爆上下文
 * @returns 纯文本知识包
 */
export function buildClassicsKnowledgePack(options?: { maxChars?: number }): string {
  const maxChars = options?.maxChars ?? 9000
  const primary = CLASSIC_BOOKS.filter((b) => b.school === 'bazi' || b.school === 'cross')
  const side = CLASSIC_BOOKS.filter((b) => b.school === 'ziwei' || b.school === 'qizheng')

  const chunks: string[] = [
    '【命理书库】子平成法摘要，供总批取用，非原文照录。',
    CLASSIC_INFERENCE_NOTE,
    '评价优先级：月令提纲 → 格局有情/破格 → 身强弱与喜用 → 调候寒暖 → 通关 → 神煞证。',
    '禁止编造未给出的四柱、神煞、大运流年、紫微星曜或具体人生事件。',
    '',
    '—— 八字 / 跨体系 ——'
  ]

  for (const book of primary) {
    chunks.push(
      `《${book.title}》[${CLASSIC_SCHOOL_LABEL[book.school]}] ${book.focus}`,
      ...book.points.map((p) => `  · ${p}`)
    )
  }

  if (side.length) {
    chunks.push('', '—— 旁系（仅风格/边界参考，本程序主做八字） ——')
    for (const book of side) {
      chunks.push(`《${book.title}》${book.focus}`)
      chunks.push(`  · ${book.points[0] ?? '勿与子平术语混用。'}`)
    }
  }

  let text = chunks.join('\n')
  if (text.length > maxChars) {
    text = `${text.slice(0, maxChars)}\n…（知识包已截断）`
  }
  return text
}

/** 月令对应的粗调候需求 */
export type TiaoHouNeed = '暖' | '凉' | '燥' | '润' | '平'

/**
 * 由月支判断调候大方向（穷通宝鉴教学压缩）。
 * @param monthZhi 月支
 */
export function tiaoHouOfMonth(monthZhi: DiZhi): {
  need: TiaoHouNeed
  usefulHint: WuXing[]
  text: string
} {
  return getTiaoHouRow(monthZhi)
}

/**
 * 月令主星（月干十神）对应的格局倾向名（子平真诠压缩）。
 * @param monthShiShen 月干十神
 */
export function geJuFromMonthStar(monthShiShen: ShiShen | '日主'): string {
  const map: Partial<Record<ShiShen, string>> = {
    正官: '正官格倾向',
    七杀: '七杀格倾向',
    正财: '正财格倾向',
    偏财: '偏财格倾向',
    正印: '正印格倾向',
    偏印: '偏印（枭）格倾向',
    食神: '食神格倾向',
    伤官: '伤官格倾向',
    比肩: '建禄/月比倾向',
    劫财: '月劫倾向'
  }
  if (monthShiShen === '日主') return '月干同我（罕见标注）'
  return map[monthShiShen] ?? '杂气/再参藏干'
}

/**
 * 滴天髓式通关提示（五行交战）。
 * @param dayWx 日主五行
 * @param useful 喜用
 */
export function tongGuanHint(dayWx: WuXing, useful: WuXing[]): string | null {
  // 金木交战 → 水通关；水火 → 木；木土 → 火；火金 → 土；土水 → 金
  const pairs: [WuXing, WuXing, WuXing][] = [
    ['金', '木', '水'],
    ['水', '火', '木'],
    ['木', '土', '火'],
    ['火', '金', '土'],
    ['土', '水', '金']
  ]
  for (const [a, b, bridge] of pairs) {
    if ((dayWx === a || dayWx === b) && useful.includes(bridge)) {
      return `若局中见${a}${b}交战，喜「${bridge}」通关（滴天髓体用大意）。`
    }
  }
  return null
}

/** 经典断言条目 */
export interface ClassicAssertLine {
  /** 来源书 */
  book: string
  /** 断语 */
  text: string
  /** 依据 */
  basis: string
}

/**
 * 根据盘面生成「经典义理」断言条（可编码部分）。
 * @param chart 八字盘
 * @param trend 强弱喜用
 * @param stemShiShen 透干十神列表
 */
export function buildClassicAssertLines(
  chart: BaZiChart,
  trend: BaZiTrend,
  stemShiShen: ShiShen[]
): ClassicAssertLine[] {
  const lines: ClassicAssertLine[] = []
  const monthStar = chart.pillars.month.ganShiShen
  const ge = geJuFromMonthStar(monthStar)
  const unique = [...new Set(stemShiShen)]
  const dayWx = TIANGAN_WUXING[chart.dayMaster]
  const monthWx = DIZHI_WUXING[chart.pillars.month.zhi]

  // —— 子平真诠：格局 ——
  lines.push({
    book: '子平真诠',
    text: `月令提纲为${chart.pillars.month.gz}（月干作${monthStar}），命局呈「${ge}」。成格与否还看透干有情、有无破格。`,
    basis: `月干${monthStar}`
  })

  if (unique.includes('伤官') && unique.includes('正官')) {
    lines.push({
      book: '子平真诠',
      text: '伤官见官：真诠视为破格险象，主是非口舌、不服约束；有合去、通关或岁运化解则减轻。',
      basis: '伤官+正官'
    })
  }
  if (unique.includes('七杀') && (unique.includes('正印') || unique.includes('偏印'))) {
    lines.push({
      book: '子平真诠',
      text: '杀印相生：煞有印化，压力可成权柄，宜担责、习艺、走正规名分之路。',
      basis: '七杀+印'
    })
  }
  if (
    (unique.includes('正财') || unique.includes('偏财')) &&
    (unique.includes('正印') || unique.includes('偏印')) &&
    trend.strength !== '偏强'
  ) {
    lines.push({
      book: '子平真诠',
      text: '财印并见：须防「财坏印」——求财冲动冲淡学业/贵人；身强或通关则反可印护财。',
      basis: '财+印'
    })
  }
  if (unique.includes('食神') && unique.includes('偏印')) {
    lines.push({
      book: '子平真诠',
      text: '枭神见食：有「枭神夺食」之嫌，思绪干扰表达与口福；制枭或通关则转灵感。',
      basis: '偏印+食神'
    })
  }

  // —— 千里：扶抑喜用（真从时注明已改写） ——
  lines.push({
    book: '千里命稿',
    text:
      trend.cong.overrideUseful
        ? `真从已改写喜用（${trend.useful.join('、')}），忌逆势（${trend.avoid.join('、')}）；岁运顺其党可发，逆势则从格易破。`
        : trend.strength === '偏弱'
          ? `身偏弱，喜用侧重生扶（${trend.useful.join('、')}）；忌再叠官煞财耗。人事上宜借力、进修、寻贵人。`
          : trend.strength === '偏强'
            ? `身偏强，喜用侧重泄耗（${trend.useful.join('、')}）；忌再叠印比帮身。人事上宜输出、担事、把力量换成成果。`
            : `身略中和，喜用较活（${trend.useful.join('、')}）；关键看岁运是否打破平衡。`,
    basis: trend.cong.overrideUseful ? `从格${trend.cong.kind}` : `强弱${trend.strength}`
  })

  lines.push({
    book: '渊海子平',
    text: `日主${chart.dayMaster}坐${chart.pillars.day.zhi}，月令五行属${monthWx}；先「月令→日主」定基，再参年时与大运，神煞只作旁证。`,
    basis: '月令提纲'
  })

  // —— 穷通宝鉴：日干月令取用 ——
  const qt = qiongTongOfChart(chart)
  lines.push({
    book: '穷通宝鉴',
    text: qt.text,
    basis: `日干${chart.dayMaster}/月支${chart.pillars.month.zhi}/${qt.gans.join('')}`
  })

  // —— 滴天髓：通关 / 中和 ——
  const tg = tongGuanHint(dayWx, trend.useful)
  if (tg) {
    lines.push({ book: '滴天髓', text: tg, basis: '通关' })
  } else {
    lines.push({
      book: '滴天髓',
      text:
        trend.strength === '中和'
          ? '中和为美：体用较均衡，贵在持续与选择，勿因小吉凶动摇大局。'
          : '偏枯之局：运岁补其不足、泄其有余；有情有力之字胜于虚名神煞。',
      basis: '中和/偏枯'
    })
  }

  if (trend.cong.kind !== '不从') {
    lines.push({
      book: '神峰通考',
      text: trend.cong.text,
      basis: trend.cong.basis
    })
  }

  for (const h of collectHeHua(chart).slice(0, 3)) {
    lines.push({
      book: '三命通会',
      text: h.text,
      basis: `${h.kind}${h.pair}`
    })
  }

  return lines
}

/**
 * 取某干支五行（天干或地支一字）。
 * @param gan 天干
 */
export function ganWuXing(gan: TianGan): WuXing {
  return TIANGAN_WUXING[gan]
}
