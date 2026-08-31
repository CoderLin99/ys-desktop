/**
 * 命理术语 → 现代人口语。给 AI 白话段当对照表，也给界面做兜底改写。
 * 长词优先替换，避免「正官」被拆成「官」。
 */

/** 一条对照：术语必须整词替换 */
export interface JargonPlainEntry {
  /** 命理专名 */
  term: string
  /** 零基础也能听懂的说法 */
  plain: string
}

/**
 * 白话对照表（不含单字「官/印/财」，以免误伤「官员」「打印」）。
 * 顺序在模块加载时按词长降序，替换时用排好的 PLAIN_JARGON_SORTED。
 */
export const PLAIN_JARGON_GLOSS: JargonPlainEntry[] = [
  { term: '伤官见官', plain: '爱直言又碰上管你的人，容易顶牛' },
  { term: '枭神夺食', plain: '想表达、想出手，却被顾虑和条条框框掐住' },
  { term: '比劫争财', plain: '身边人多、抢资源，钱不好独享' },
  { term: '食伤生财', plain: '靠手艺、作品或表达把机会变成收入' },
  { term: '伤官配印', plain: '有想法也能听劝、能沉淀成专业' },
  { term: '财坏印', plain: '赚钱心思冲掉学习与资质积累' },
  { term: '天乙贵人', plain: '容易遇上肯伸手帮你的人' },
  { term: '阴差阳错', plain: '缘分来得别扭、过程容易拧巴' },
  { term: '十恶大败', plain: '传统忌日象，只作提醒、不是判决' },
  { term: '羊刃', plain: '脾气和冲劲都硬，顺了能成事、拧了易伤人伤己' },
  { term: '魁罡', plain: '性格刚、做事硬，宜掌权不宜柔磨' },
  { term: '驿马', plain: '走动、出差、换环境的机会多' },
  { term: '桃花', plain: '对人缘、异性缘更敏感' },
  { term: '红鸾', plain: '婚恋议题容易被点到' },
  { term: '红艳', plain: '吸引力强，也容易惹闲话' },
  { term: '华盖', plain: '喜清静、偏研究或独自深耕' },
  { term: '孤鸾', plain: '感情路上容易孤单或合不来' },
  { term: '文昌', plain: '文书、考试、表达类议题更显' },
  { term: '空亡', plain: '这件事使不上劲、抓不实' },
  { term: '正财', plain: '正当、稳定的收入与配偶象（男命）' },
  { term: '偏财', plain: '外快、投资、偏门机会与额外情缘象' },
  { term: '正官', plain: '规矩、考核、上级；女命还可论正缘名分（职场与相处分层看）' },
  { term: '七杀', plain: '压力、竞争、催你行动；女命还可论偏缘或相处压力（勿只读成嫁娶）' },
  { term: '偏官', plain: '压力、竞争、催你行动的力量' },
  { term: '正印', plain: '学习、贵人、平台与资质支持' },
  { term: '偏印', plain: '偏门学问、直觉、非主流路径' },
  { term: '食神', plain: '才艺输出、生活口福、温和表达' },
  { term: '伤官', plain: '尖锐表达、改革、不服管' },
  { term: '比肩', plain: '同类伙伴、自立、也容易平分资源' },
  { term: '劫财', plain: '争夺、分钱、朋友同事来分一杯羹' },
  { term: '官杀', plain: '规矩、压力、职场晋升与名分这一路（女命须职场/相处分层）' },
  { term: '食伤', plain: '表达、手艺、作品输出' },
  { term: '比劫', plain: '同伴、竞争、一起分资源' },
  { term: '印星', plain: '学习、文书、贵人、平台资质' },
  { term: '财星', plain: '钱财与（男命）配偶这一路' },
  { term: '印绶', plain: '靠平台、资质、贵人成事' },
  { term: '杀印相生', plain: '压力能被学习或贵人化解，扛事也能长本事' },
  { term: '妻星', plain: '男命里配偶这一路' },
  { term: '夫星', plain: '女命里正缘相处与名分这一路（不是从属判决）' },
  { term: '正缘', plain: '能谈婚论嫁的那一路关系' },
  { term: '偏缘', plain: '正牌以外的情缘或压力缘' },
  { term: '应期', plain: '事情比较容易应验的那段时间' },
  { term: '得令', plain: '出生时节气正帮着你' },
  { term: '失令', plain: '出生时节气不怎么帮你' },
  { term: '日干', plain: '代表你自己的那天的天干' },
  { term: '年柱', plain: '年这一组干支，多看长辈和大环境' },
  { term: '月柱', plain: '月这一组干支，是总纲' },
  { term: '日柱', plain: '日这一组干支，看自身和配偶宫' },
  { term: '时柱', plain: '时这一组干支，看后运和子女' },
  { term: '扶抑', plain: '气虚就补、气旺就泄，把你调到能做事' },
  { term: '克泄', plain: '被压、被消耗、被逼着输出' },
  { term: '命主', plain: '这个人' },
  { term: '日主', plain: '你自己' },
  { term: '身弱', plain: '气势偏虚，做事容易吃力' },
  { term: '身强', plain: '气势偏旺，扛得住事也容易逞强' },
  { term: '用神', plain: '对你有利的那股力量' },
  { term: '忌神', plain: '容易拖后腿的那股力量' },
  { term: '喜用', plain: '对你有利、该亲近的力量' },
  { term: '月令', plain: '出生那个节气当令的力量（总纲）' },
  { term: '提纲', plain: '月令这个总纲' },
  { term: '通关', plain: '两边打架时中间来圆场的五行' },
  { term: '调候', plain: '过寒要暖、过热要凉，把气候调舒服' },
  { term: '通根', plain: '表面的力量在底下站得住' },
  { term: '透干', plain: '藏着的力量露到明面上' },
  { term: '成格', plain: '格局能立得住' },
  { term: '破格', plain: '格局被冲坏了' },
  { term: '真从弱', plain: '自身气势极虚，顺着局中大势走才顺' },
  { term: '假从弱', plain: '看着像顺着大势，其实还有底气，运势一变就要改策略' },
  { term: '真从强', plain: '自身气势极旺，顺着旺势走、硬克反而别扭' },
  { term: '假从强', plain: '偏旺但还没纯到只能顺着走，仍要留出路' },
  { term: '从财', plain: '顺着求财、变现这条线走' },
  { term: '从杀', plain: '顺着压力、竞争、职场这一路走' },
  { term: '从儿', plain: '顺着表达、手艺、作品输出走' },
  { term: '从旺', plain: '顺着自身旺势走，不宜硬压' },
  { term: '交运', plain: '换运、换月那几天气运交接' },
  { term: '合化', plain: '两股力量合成一气；合得成才算改了性质' },
  { term: '从格', plain: '自身太偏，顺着大势走更顺' },
  { term: '大运', plain: '大约十年一段的运势主题' },
  { term: '流年', plain: '这一年的运' },
  { term: '流月', plain: '这几个月显不显的窗口' },
  { term: '十神', plain: '相对你自己的十种人事角色' },
  { term: '格局', plain: '这盘命的结构类型' },
  { term: '神煞', plain: '辅证用的象（不能压过主结构）' },
  { term: '四柱', plain: '年、月、日、时四组干支' }
]

/** 按词长从长到短，供替换时使用 */
export const PLAIN_JARGON_SORTED: JargonPlainEntry[] = [...PLAIN_JARGON_GLOSS].sort(
  (a, b) => b.term.length - a.term.length
)

/**
 * 转义正则特殊字符，保证整词替换。
 * @param s 术语原文
 */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * 把白话里残留的术语改成「人话（命理叫某某）」；同一术语后文只留人话。
 * 模型不听话时，界面仍能让普通人读懂。
 * @param raw 白话或追问正文
 * @returns 已注释/翻译的纯文本
 */
export function glossPlainTalk(raw: string): string {
  const src = String(raw ?? '')
  if (!src.trim()) return src
  let out = src
  const firstSeen = new Set<string>()
  for (const { term, plain } of PLAIN_JARGON_SORTED) {
    if (!out.includes(term)) continue
    const re = new RegExp(escapeRegExp(term), 'g')
    out = out.replace(re, () => {
      if (firstSeen.has(term)) return plain
      firstSeen.add(term)
      return `${plain}（命理叫${term}）`
    })
  }
  return out
}

/**
 * 注入润色 / 翻译 / 追问：强制白话用人话，术语只许当括号注释。
 * @returns 提示词片段
 */
export function plainTalkGlossaryGuide(): string {
  const lines = PLAIN_JARGON_GLOSS.map((e) => `${e.term}=${e.plain}`)
  return [
    '【白话对照表】白话段必须用等号右边的人话，禁止只丢左边的专名。',
    '若必须点出原词，写成「人话（命理叫专名）」，例如：气势偏虚（命理叫身弱）。',
    '对照：',
    lines.join('；'),
    '。'
  ].join('')
}
