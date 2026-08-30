/**
 * 常用神煞查表（教学归纳版）。
 *
 * 查法以日干 / 日支 / 年支为主；命中位看四柱地支（缺时辰则跳过时柱）。
 * 流派口诀略有出入时，以本文件常见表为准，并在 brief 中注明教学用途。
 */
import { DIZHI, JIAZI_60, type DiZhi, type TianGan } from '../constants'
import type { BaZiChart, Pillar } from './chart'
import { enrichShenShaWithStacks } from './shenshaStack'

/** 神煞命中记录（须带可复盘依据，禁止只有空象意） */
export interface ShenShaHit {
  /** 神煞名 */
  name: string
  /** 命中的地支 */
  zhi: DiZhi[]
  /** 出现在哪些柱（年/月/日/时） */
  pillars: Array<'年' | '月' | '日' | '时'>
  /** 教学释义（倾向，非定论；须与 rule/basis 同出） */
  brief: string
  /** 吉凶倾向标签 */
  tone: '吉' | '中' | '慎'
  /** 查法口诀（来自 SHENSHA_DOCS） */
  rule: string
  /** 本盘具体推算：用了哪干哪支、为何命中哪柱 */
  basis: string
}

/**
 * 取神煞查法说明。
 * @param name 神煞名
 */
function ruleOf(name: string): string {
  return SHENSHA_DOCS.find((d) => d.name === name)?.rule ?? '内建教学查表'
}

/**
 * 落柱描述（供依据句）。
 * @param loc 定位结果
 */
function locPhrase(loc: {
  zhi: DiZhi[]
  pillars: Array<'年' | '月' | '日' | '时'>
}): string {
  const where = loc.pillars.join('、') || '—'
  const z = loc.zhi.length ? loc.zhi.join('') : '干合'
  return `四柱见${z}于${where}柱`
}

/**
 * 写入一条带查法/本盘依据的神煞命中。
 * @param hits 结果数组
 * @param row 命中字段（含 basis）
 */
function pushHit(
  hits: ShenShaHit[],
  row: {
    name: string
    zhi: DiZhi[]
    pillars: Array<'年' | '月' | '日' | '时'>
    brief: string
    tone: '吉' | '中' | '慎'
    /** 本盘推算句，须写明查表输入与命中点 */
    basis: string
  }
): void {
  hits.push({
    name: row.name,
    zhi: row.zhi,
    pillars: row.pillars,
    brief: row.brief,
    tone: row.tone,
    rule: ruleOf(row.name),
    basis: row.basis
  })
}

/**
 * 格式化为可复盘证据句（断言 / UI / 助手事实共用）。
 * @param s 命中
 */
export function formatShenShaEvidence(s: ShenShaHit): string {
  return `【查法】${s.rule}；【本盘】${s.basis}；【象意】${s.brief}（辅证，不得压过用神格局）`
}

/** 神煞全表说明（学堂 / 全库目录；流派口诀可能略异） */
export const SHENSHA_DOCS: { name: string; rule: string; brief: string }[] = [
  { name: '天乙贵人', rule: '按日干/年干查贵人支', brief: '遇事易得助力、贵人照应的象征。' },
  { name: '文昌', rule: '按日干/年干查文昌支', brief: '学业、文书、考试、表达类机缘。' },
  { name: '驿马', rule: '按年支或日支三合局查', brief: '走动、迁徙、出差、变动之象。' },
  { name: '桃花', rule: '按年支或日支三合局查咸池', brief: '人缘、情感、魅力；过旺需防纠缠。' },
  { name: '华盖', rule: '按年支或日支三合局查', brief: '艺术、信仰、孤独钻研之象。' },
  { name: '孤辰', rule: '按年支查', brief: '独立、疏离感；未必不吉。' },
  { name: '寡宿', rule: '按年支查', brief: '内向、独处；与孤辰常并提。' },
  { name: '羊刃', rule: '按日干查刃支', brief: '锋芒、决断力；亦主压力与冲突。' },
  { name: '飞刃', rule: '羊刃之冲', brief: '刃气外冲，冲突、手术象（慎读）。' },
  { name: '魁罡', rule: '日柱为戊戌/庚戌/庚辰/壬辰', brief: '刚断、权威感；需配合整体看。' },
  { name: '空亡', rule: '按日柱所在旬查空亡支', brief: '该支力量虚浮；事上易落空或需补救。' },
  { name: '禄神', rule: '按日干查禄支', brief: '俸禄、稳定食禄之象。' },
  { name: '太极贵人', rule: '按日干/年干查始终之支；叠见三柱及以上时推断按「三太极」加重', brief: '悟性、玄学缘、喜钻研。' },
  { name: '福星贵人', rule: '按日干查', brief: '福气、衣食无忧倾向。' },
  { name: '天医', rule: '按月支前一位', brief: '医药、疗愈缘。' },
  { name: '将星', rule: '按年/日支三合查', brief: '领导、权威、统御象。' },
  { name: '国印', rule: '按日干查', brief: '印信、名位、文书章印。' },
  { name: '亡神', rule: '按年/日支三合查', brief: '变动、隐晦、需防失察。' },
  { name: '劫煞', rule: '按年/日支三合查', brief: '劫夺、阻滞、突发变故象。' },
  { name: '灾煞', rule: '按年/日支三合查', brief: '灾阻、不顺、需防意外象。' },
  { name: '血刃', rule: '按月支六冲', brief: '血光、手术、冲突象（娱乐慎读）。' },
  { name: '天厨', rule: '按日干查（亦参年干）', brief: '食禄、口福之象。' },
  { name: '金舆', rule: '按日干查', brief: '车马、体面、婚恋辅助象。' },
  { name: '红鸾', rule: '按年支查', brief: '喜庆、姻缘变动象。' },
  { name: '天喜', rule: '红鸾之冲', brief: '喜事、欢庆、人缘助兴象。' },
  { name: '勾煞', rule: '年支顺数第三位', brief: '牵绊、纠缠、难脱身象。' },
  { name: '绞煞', rule: '年支逆数第三位', brief: '纠葛、口舌、缠绕象。' },
  { name: '阴差阳错', rule: '特定日柱', brief: '情感易错位、阴差阳错之象。' },
  { name: '孤鸾煞', rule: '特定日柱', brief: '婚恋多波折、独处象（慎读）。' },
  { name: '红艳煞', rule: '按日干查红艳支', brief: '异性缘重、情感纠葛象。' },
  { name: '四废日', rule: '季月逢废干支日', brief: '当令失力、事倍功半象。' },
  { name: '九丑日', rule: '特定日柱', brief: '旧说忌婚嫁动土之日（慎读）。' },
  { name: '十恶大败', rule: '特定日柱', brief: '旧说财禄易耗之日（慎读）。' },
  { name: '天赦', rule: '季月天赦日', brief: '宽宥、化解、宜开新象。' },
  { name: '金神', rule: '乙丑/己巳/癸酉日时', brief: '刚锐、火炼金成之象。' },
  { name: '童子煞', rule: '年支三合取童子支；时支优先，时支不中再看日支', brief: '稚气、幼缘；婚育民俗慎读。' },
  { name: '丧门', rule: '年支顺数第二', brief: '孝服、伤感、低落象（慎读）。' },
  { name: '吊客', rule: '年支逆数第二', brief: '吊唁、忧思、人际疏离象。' },
  { name: '披麻', rule: '年支顺数第一', brief: '孝服披麻象（慎读）。' },
  { name: '病符', rule: '年支逆数第一', brief: '病符、不适、需养护象。' },
  { name: '大耗', rule: '年支六冲', brief: '破耗、破财、流失象。' },
  { name: '元辰', rule: '阳干年顺一/阴干年逆一', brief: '纠缠、闷气、小人扰象。' },
  { name: '天罗', rule: '火日主见戌亥', brief: '天罗困阻、难展象。' },
  { name: '地网', rule: '水土日主见辰巳', brief: '地网牵绊、难脱象。' },
  { name: '流霞', rule: '按日干查', brief: '血光、产厄、酒色纠葛象（慎读）。' },
  { name: '天德', rule: '月支天德落柱', brief: '天德庇佑、逢凶化减。' },
  { name: '月德', rule: '月支月德落柱', brief: '月德庇佑、人和之象。' },
  { name: '天德合', rule: '月支天德之合', brief: '逢合得天德助力。' },
  { name: '月德合', rule: '月支月德之合', brief: '逢合得月德助力。' },
  { name: '德秀贵人', rule: '月支与天干组合', brief: '文秀、贵气之象（各派口诀略异）。' },
  { name: '词馆', rule: '按日干查临官支', brief: '文才、考试、文学缘。' },
  { name: '学堂', rule: '按日干查长生支', brief: '学业开窍、进修缘。' }
]

/** 天乙贵人：日干 → 贵人地支 */
const TIANYI: Record<TianGan, DiZhi[]> = {
  甲: ['丑', '未'],
  戊: ['丑', '未'],
  庚: ['丑', '未'],
  乙: ['子', '申'],
  己: ['子', '申'],
  丙: ['亥', '酉'],
  丁: ['亥', '酉'],
  壬: ['巳', '卯'],
  癸: ['巳', '卯'],
  辛: ['午', '寅']
}

/** 文昌：日干 → 文昌支 */
const WENCHANG: Record<TianGan, DiZhi> = {
  甲: '巳',
  乙: '午',
  丙: '申',
  丁: '酉',
  戊: '申',
  己: '酉',
  庚: '亥',
  辛: '子',
  壬: '寅',
  癸: '卯'
}

/** 羊刃：日干 → 刃支 */
const YANGREN: Record<TianGan, DiZhi> = {
  甲: '卯',
  乙: '寅',
  丙: '午',
  丁: '巳',
  戊: '午',
  己: '巳',
  庚: '酉',
  辛: '申',
  壬: '子',
  癸: '亥'
}

/** 魁罡日柱 */
const KUIGANG = new Set(['戊戌', '庚戌', '庚辰', '壬辰'])

/** 三合局 → 驿马 / 桃花 / 华盖 */
const SANHE_YIMA: Record<string, DiZhi> = {
  申子辰: '寅',
  寅午戌: '申',
  巳酉丑: '亥',
  亥卯未: '巳'
}
const SANHE_TAOHUA: Record<string, DiZhi> = {
  申子辰: '酉',
  寅午戌: '卯',
  巳酉丑: '午',
  亥卯未: '子'
}
const SANHE_HUAGAI: Record<string, DiZhi> = {
  申子辰: '辰',
  寅午戌: '戌',
  巳酉丑: '丑',
  亥卯未: '未'
}

/** 孤辰寡宿：年支所在组 → { 孤, 寡 } */
const GUCHEN_GUASU: { group: DiZhi[]; gu: DiZhi; gua: DiZhi }[] = [
  { group: ['亥', '子', '丑'], gu: '寅', gua: '戌' },
  { group: ['寅', '卯', '辰'], gu: '巳', gua: '丑' },
  { group: ['巳', '午', '未'], gu: '申', gua: '辰' },
  { group: ['申', '酉', '戌'], gu: '亥', gua: '未' }
]

/** 禄神：日干 → 禄支 */
const LU_SHEN: Record<TianGan, DiZhi> = {
  甲: '寅',
  乙: '卯',
  丙: '巳',
  丁: '午',
  戊: '巳',
  己: '午',
  庚: '申',
  辛: '酉',
  壬: '亥',
  癸: '子'
}

/** 太极贵人 */
const TAIJI: Record<TianGan, DiZhi[]> = {
  甲: ['子', '午'],
  乙: ['子', '午'],
  丙: ['卯', '酉'],
  丁: ['卯', '酉'],
  戊: ['辰', '戌', '丑', '未'],
  己: ['辰', '戌', '丑', '未'],
  庚: ['寅', '亥'],
  辛: ['寅', '亥'],
  壬: ['巳', '申'],
  癸: ['巳', '申']
}

/** 福星贵人 */
const FUXING: Record<TianGan, DiZhi[]> = {
  甲: ['子', '寅'],
  丙: ['子', '寅'],
  乙: ['丑', '卯'],
  癸: ['丑', '卯'],
  戊: ['申'],
  己: ['未'],
  丁: ['亥'],
  庚: ['午'],
  辛: ['巳'],
  壬: ['辰']
}

/** 国印贵人 */
const GUOYIN: Record<TianGan, DiZhi> = {
  甲: '戌',
  乙: '亥',
  丙: '丑',
  丁: '寅',
  戊: '丑',
  己: '寅',
  庚: '辰',
  辛: '巳',
  壬: '未',
  癸: '申'
}

/** 天厨贵人 */
const TIANCHU: Record<TianGan, DiZhi> = {
  甲: '巳',
  乙: '午',
  丙: '巳',
  丁: '午',
  戊: '申',
  己: '酉',
  庚: '亥',
  辛: '子',
  壬: '寅',
  癸: '卯'
}

/** 金舆 */
const JINYU: Record<TianGan, DiZhi> = {
  甲: '辰',
  乙: '巳',
  丙: '未',
  丁: '申',
  戊: '未',
  己: '申',
  庚: '戌',
  辛: '亥',
  壬: '丑',
  癸: '寅'
}

/** 红鸾：年支 → 红鸾支 */
const HONGLUAN: Record<DiZhi, DiZhi> = {
  子: '卯',
  丑: '寅',
  寅: '丑',
  卯: '子',
  辰: '亥',
  巳: '戌',
  午: '酉',
  未: '申',
  申: '未',
  酉: '午',
  戌: '巳',
  亥: '辰'
}

/** 阴差阳错日柱 */
const YINCHA_YANGCUO = new Set([
  '丙子',
  '丁丑',
  '戊寅',
  '辛卯',
  '壬辰',
  '癸巳',
  '丙午',
  '丁未',
  '戊申',
  '辛酉',
  '壬戌',
  '癸亥'
])

/** 天德：月支 → 天德所在（天干或地支一字） */
const TIANDE: Record<DiZhi, string> = {
  寅: '丁',
  卯: '申',
  辰: '壬',
  巳: '辛',
  午: '亥',
  未: '甲',
  申: '癸',
  酉: '寅',
  戌: '丙',
  亥: '乙',
  子: '巳',
  丑: '庚'
}

/** 地支六合：支 → 合支（天德在支时取天德合） */
const ZHI_LIUHE: Record<DiZhi, DiZhi> = {
  子: '丑',
  丑: '子',
  寅: '亥',
  亥: '寅',
  卯: '戌',
  戌: '卯',
  辰: '酉',
  酉: '辰',
  巳: '申',
  申: '巳',
  午: '未',
  未: '午'
}

/** 月德：月支 → 月德天干 */
const YUEDE: Record<DiZhi, TianGan> = {
  寅: '丙',
  午: '丙',
  戌: '丙',
  申: '壬',
  子: '壬',
  辰: '壬',
  亥: '甲',
  卯: '甲',
  未: '甲',
  巳: '庚',
  酉: '庚',
  丑: '庚'
}

/** 天干五合 */
const GAN_HE: Record<TianGan, TianGan> = {
  甲: '己',
  己: '甲',
  乙: '庚',
  庚: '乙',
  丙: '辛',
  辛: '丙',
  丁: '壬',
  壬: '丁',
  戊: '癸',
  癸: '戊'
}

/** 德秀：月支组 → 德秀天干 */
const DEXIU: { months: DiZhi[]; gans: TianGan[] }[] = [
  { months: ['寅', '午', '戌'], gans: ['丙', '丁', '戊', '癸'] },
  { months: ['申', '子', '辰'], gans: ['壬', '癸', '戊', '己'] },
  { months: ['巳', '酉', '丑'], gans: ['庚', '辛', '乙'] },
  { months: ['亥', '卯', '未'], gans: ['甲', '乙', '丁'] }
]

/** 将星 / 亡神（三合局） */
const SANHE_JIANG: Record<string, DiZhi> = {
  申子辰: '子',
  寅午戌: '午',
  巳酉丑: '酉',
  亥卯未: '卯'
}
const SANHE_WANG: Record<string, DiZhi> = {
  申子辰: '亥',
  寅午戌: '巳',
  巳酉丑: '申',
  亥卯未: '寅'
}

/** 劫煞（三合） */
const SANHE_JIE: Record<string, DiZhi> = {
  申子辰: '巳',
  寅午戌: '亥',
  巳酉丑: '寅',
  亥卯未: '申'
}

/** 灾煞（三合，将星之冲） */
const SANHE_ZAI: Record<string, DiZhi> = {
  申子辰: '午',
  寅午戌: '子',
  巳酉丑: '卯',
  亥卯未: '酉'
}

/** 红艳煞：日干 → 红艳支 */
const HONGYAN: Record<TianGan, DiZhi> = {
  甲: '午',
  乙: '申',
  丙: '寅',
  丁: '未',
  戊: '辰',
  己: '辰',
  庚: '戌',
  辛: '酉',
  壬: '子',
  癸: '申'
}

/** 流霞：日干 → 流霞支 */
const LIUXIA: Record<TianGan, DiZhi> = {
  甲: '酉',
  乙: '戌',
  丙: '未',
  丁: '申',
  戊: '巳',
  己: '午',
  庚: '辰',
  辛: '卯',
  壬: '亥',
  癸: '寅'
}

/** 孤鸾煞日柱（常见表） */
const GULUAN = new Set([
  '甲寅',
  '乙巳',
  '丙午',
  '丁巳',
  '戊午',
  '戊申',
  '辛亥',
  '壬子',
  '壬寅',
  '癸巳'
])

/** 九丑日 */
const JIUCHOU = new Set([
  '壬子',
  '壬午',
  '戊子',
  '戊午',
  '己酉',
  '己卯',
  '乙酉',
  '乙卯',
  '辛酉',
  '辛卯'
])

/** 十恶大败日 */
const SHIE_DABAI = new Set([
  '甲辰',
  '乙巳',
  '壬申',
  '丙申',
  '丁亥',
  '庚辰',
  '戊戌',
  '癸亥',
  '辛巳',
  '己丑'
])

/** 金神日/时柱 */
const JINSHEN = new Set(['乙丑', '己巳', '癸酉'])

/** 天赦：季节 → 日柱 */
const TIANCHE: { months: DiZhi[]; day: string }[] = [
  { months: ['寅', '卯', '辰'], day: '戊寅' },
  { months: ['巳', '午', '未'], day: '甲午' },
  { months: ['申', '酉', '戌'], day: '戊申' },
  { months: ['亥', '子', '丑'], day: '甲子' }
]

/** 四废：季节 → 废日干支 */
const SIFEI: { months: DiZhi[]; days: string[] }[] = [
  { months: ['寅', '卯', '辰'], days: ['庚申', '辛酉'] },
  { months: ['巳', '午', '未'], days: ['壬子', '癸亥'] },
  { months: ['申', '酉', '戌'], days: ['甲寅', '乙卯'] },
  { months: ['亥', '子', '丑'], days: ['丙午', '丁巳'] }
]

/** 童子煞：年支三合 → 童子支（见日/时支） */
const TONGZI: Record<string, DiZhi[]> = {
  寅午戌: ['午', '卯'],
  申子辰: ['酉', '子'],
  巳酉丑: ['酉', '午'],
  亥卯未: ['子', '卯']
}

/** 词馆：日干 → 临官支（通行长生/临官派） */
const CIGUAN: Record<TianGan, DiZhi> = {
  甲: '寅',
  乙: '卯',
  丙: '巳',
  丁: '午',
  戊: '巳',
  己: '午',
  庚: '申',
  辛: '酉',
  壬: '亥',
  癸: '子'
}

/** 学堂：日干 → 长生支（通行长生/临官派） */
const XUETANG: Record<TianGan, DiZhi> = {
  甲: '亥',
  乙: '午',
  丙: '寅',
  丁: '酉',
  戊: '寅',
  己: '酉',
  庚: '巳',
  辛: '子',
  壬: '申',
  癸: '卯'
}

/**
 * 由地支取三合局键名。
 * @param zhi 年支或日支
 */
function sanheKey(zhi: DiZhi): string {
  if (['申', '子', '辰'].includes(zhi)) return '申子辰'
  if (['寅', '午', '戌'].includes(zhi)) return '寅午戌'
  if (['巳', '酉', '丑'].includes(zhi)) return '巳酉丑'
  return '亥卯未'
}

/**
 * 日柱旬空亡地支。
 * @param dayGz 日柱干支
 */
export function kongWangOfDay(dayGz: string): DiZhi[] {
  const idx = JIAZI_60.indexOf(dayGz)
  if (idx < 0) return []
  // 每旬 10 天；空亡为该旬缺的两支
  const xunStart = Math.floor(idx / 10) * 10
  const startZhi = JIAZI_60[xunStart][1] as DiZhi
  const startIdx = DIZHI.indexOf(startZhi)
  // 旬内十支后，空掉接下来两支
  return [DIZHI[(startIdx + 10) % 12], DIZHI[(startIdx + 11) % 12]]
}

/**
 * 收集盘中各地支所在柱标签。
 * @param chart 八字盘
 */
function pillarZhiMap(chart: BaZiChart): { zhi: DiZhi; label: '年' | '月' | '日' | '时' }[] {
  const rows: { zhi: DiZhi; label: '年' | '月' | '日' | '时'; pillar: Pillar | null }[] = [
    { zhi: chart.pillars.year.zhi, label: '年', pillar: chart.pillars.year },
    { zhi: chart.pillars.month.zhi, label: '月', pillar: chart.pillars.month },
    { zhi: chart.pillars.day.zhi, label: '日', pillar: chart.pillars.day },
    { zhi: chart.pillars.hour?.zhi ?? ('子' as DiZhi), label: '时', pillar: chart.pillars.hour }
  ]
  return rows
    .filter((r) => r.pillar !== null)
    .map((r) => ({ zhi: r.zhi, label: r.label }))
}

/**
 * 在盘中查找目标地支的命中柱。
 * @param chart 盘
 * @param targets 目标支
 */
function locate(
  chart: BaZiChart,
  targets: DiZhi[]
): { zhi: DiZhi[]; pillars: Array<'年' | '月' | '日' | '时'> } {
  const map = pillarZhiMap(chart)
  const zhi: DiZhi[] = []
  const pillars: Array<'年' | '月' | '日' | '时'> = []
  for (const t of targets) {
    for (const m of map) {
      if (m.zhi === t) {
        if (!zhi.includes(t)) zhi.push(t)
        if (!pillars.includes(m.label)) pillars.push(m.label)
      }
    }
  }
  return { zhi, pillars }
}

/**
 * 合并两次 locate 结果。
 * @param a 第一次
 * @param b 第二次
 */
function mergeLoc(
  a: { zhi: DiZhi[]; pillars: Array<'年' | '月' | '日' | '时'> },
  b: { zhi: DiZhi[]; pillars: Array<'年' | '月' | '日' | '时'> }
): { zhi: DiZhi[]; pillars: Array<'年' | '月' | '日' | '时'> } {
  return {
    zhi: [...new Set([...a.zhi, ...b.zhi])],
    pillars: [...new Set([...a.pillars, ...b.pillars])]
  }
}

/**
 * 四柱天干所在柱（用于天德合/月德合/德秀）。
 * @param chart 盘
 */
function pillarGanMap(chart: BaZiChart): { gan: TianGan; label: '年' | '月' | '日' | '时' }[] {
  const rows: { gan: TianGan; label: '年' | '月' | '日' | '时'; pillar: Pillar | null }[] = [
    { gan: chart.pillars.year.gan, label: '年', pillar: chart.pillars.year },
    { gan: chart.pillars.month.gan, label: '月', pillar: chart.pillars.month },
    { gan: chart.pillars.day.gan, label: '日', pillar: chart.pillars.day },
    { gan: chart.pillars.hour?.gan ?? '甲', label: '时', pillar: chart.pillars.hour }
  ]
  return rows.filter((r) => r.pillar !== null).map((r) => ({ gan: r.gan, label: r.label }))
}

/**
 * 查找目标天干所在柱。
 * @param chart 盘
 * @param targets 天干
 */
function locateGan(
  chart: BaZiChart,
  targets: TianGan[]
): { pillars: Array<'年' | '月' | '日' | '时'> } {
  const map = pillarGanMap(chart)
  const pillars: Array<'年' | '月' | '日' | '时'> = []
  for (const t of targets) {
    for (const m of map) {
      if (m.gan === t && !pillars.includes(m.label)) pillars.push(m.label)
    }
  }
  return { pillars }
}

/**
 * 按日干 + 年干各查一套地支贵人（商业软件常见做法）。
 * @param chart 盘
 * @param table 干→支或支列表
 */
function locateByDayAndYearGan(
  chart: BaZiChart,
  table: Record<TianGan, DiZhi | DiZhi[]>
): { zhi: DiZhi[]; pillars: Array<'年' | '月' | '日' | '时'> } {
  const yearGan = chart.pillars.year.gan
  const dayGan = chart.dayMaster
  const toArr = (v: DiZhi | DiZhi[]) => (Array.isArray(v) ? v : [v])
  return mergeLoc(locate(chart, toArr(table[dayGan])), locate(chart, toArr(table[yearGan])))
}

/**
 * 任意干支的旬空亡（与日柱算法相同：该柱所在旬缺的两支）。
 * @param gz 干支
 */
export function kongWangOfGz(gz: string): DiZhi[] {
  return kongWangOfDay(gz)
}

/**
 * 计算命盘神煞命中列表。
 * @param chart 八字盘
 */
export function collectShenSha(chart: BaZiChart): ShenShaHit[] {
  const hits: ShenShaHit[] = []
  const dayGan = chart.dayMaster
  const dayZhi = chart.pillars.day.zhi
  const yearZhi = chart.pillars.year.zhi
  const monthZhi = chart.pillars.month.zhi
  const dayGz = chart.pillars.day.gz
  const yearGan = chart.pillars.year.gan

  /** 日干+年干查表的依据句 */
  const ganTableBasis = (
    label: string,
    table: Record<TianGan, DiZhi | DiZhi[]>,
    loc: { zhi: DiZhi[]; pillars: Array<'年' | '月' | '日' | '时'> }
  ): string => {
    const fmt = (g: TianGan) => {
      const v = table[g]
      return Array.isArray(v) ? v.join('') : v
    }
    return `${label}：日干${dayGan}→${fmt(dayGan)}，年干${yearGan}→${fmt(yearGan)}；${locPhrase(loc)}`
  }

  /** 年/日支三合查表的依据句 */
  const sanheBasis = (
    label: string,
    table: Record<string, DiZhi>,
    targets: DiZhi[],
    loc: { zhi: DiZhi[]; pillars: Array<'年' | '月' | '日' | '时'> }
  ): string => {
    const yKey = sanheKey(yearZhi)
    const dKey = sanheKey(dayZhi)
    return `${label}：年支${yearZhi}属${yKey}→${table[yKey]}，日支${dayZhi}属${dKey}→${table[dKey]}，目标支${targets.join('')}；${locPhrase(loc)}`
  }

  // 天乙：日干 + 年干
  {
    const loc = locateByDayAndYearGan(chart, TIANYI)
    if (loc.pillars.length) {
      pushHit(hits, {
        name: '天乙贵人',
        ...loc,
        brief: '遇事易得助力、贵人照应的象征。',
        tone: '吉',
        basis: ganTableBasis('天乙查表', TIANYI, loc)
      })
    }
  }

  // 文昌
  {
    const loc = locateByDayAndYearGan(chart, WENCHANG)
    if (loc.pillars.length) {
      pushHit(hits, {
        name: '文昌',
        ...loc,
        brief: '学业、文书、考试、表达类机缘。',
        tone: '吉',
        basis: ganTableBasis('文昌查表', WENCHANG, loc)
      })
    }
  }

  // 天厨
  {
    const loc = locateByDayAndYearGan(chart, TIANCHU)
    if (loc.pillars.length) {
      pushHit(hits, {
        name: '天厨',
        ...loc,
        brief: '食禄、口福之象。',
        tone: '吉',
        basis: ganTableBasis('天厨查表', TIANCHU, loc)
      })
    }
  }

  // 驿马 / 桃花 / 华盖
  for (const [name, table, brief, tone] of [
    ['驿马', SANHE_YIMA, '走动、迁徙、出差、变动之象。', '中'],
    ['桃花', SANHE_TAOHUA, '人缘、情感、魅力；过旺需防纠缠。', '中'],
    ['华盖', SANHE_HUAGAI, '艺术、信仰、孤独钻研之象。', '中']
  ] as const) {
    const targets = [
      ...new Set([table[sanheKey(yearZhi)], table[sanheKey(dayZhi)]])
    ] as DiZhi[]
    const loc = locate(chart, targets)
    if (loc.pillars.length) {
      pushHit(hits, {
        name,
        ...loc,
        brief,
        tone,
        basis: sanheBasis(name + '三合', table, targets, loc)
      })
    }
  }

  // 孤辰 / 寡宿
  {
    const row = GUCHEN_GUASU.find((g) => g.group.includes(yearZhi))
    if (row) {
      const guLoc = locate(chart, [row.gu])
      if (guLoc.pillars.length) {
        pushHit(hits, {
          name: '孤辰',
          ...guLoc,
          brief: '独立、疏离感；未必不吉。',
          tone: '中',
          basis: `年支${yearZhi}属${row.group.join('')}组→孤辰支${row.gu}；${locPhrase(guLoc)}`
        })
      }
      const guaLoc = locate(chart, [row.gua])
      if (guaLoc.pillars.length) {
        pushHit(hits, {
          name: '寡宿',
          ...guaLoc,
          brief: '内向、独处；与孤辰常并提。',
          tone: '中',
          basis: `年支${yearZhi}属${row.group.join('')}组→寡宿支${row.gua}；${locPhrase(guaLoc)}`
        })
      }
    }
  }

  // 羊刃
  {
    const loc = locate(chart, [YANGREN[dayGan]])
    if (loc.pillars.length) {
      pushHit(hits, {
        name: '羊刃',
        ...loc,
        brief: '锋芒、决断力；亦主压力与冲突。',
        tone: '慎',
        basis: `日干${dayGan}→羊刃支${YANGREN[dayGan]}；${locPhrase(loc)}`
      })
    }
  }

  // 魁罡
  if (KUIGANG.has(dayGz)) {
    pushHit(hits, {
      name: '魁罡',
      zhi: [dayZhi],
      pillars: ['日'],
      brief: '刚断、权威感；需配合整体看。',
      tone: '慎',
      basis: `日柱${dayGz}属于魁罡日（戊戌/庚戌/庚辰/壬辰）`
    })
  }

  // 日旬空亡落柱
  {
    const kw = kongWangOfDay(dayGz)
    const loc = locate(chart, kw)
    if (loc.pillars.length) {
      pushHit(hits, {
        name: '空亡',
        ...loc,
        brief: `日旬空亡为${kw.join('')}；命中支相对日主力量易虚浮。`,
        tone: '慎',
        basis: `日柱${dayGz}所在旬空亡支为${kw.join('')}；${locPhrase(loc)}`
      })
    }
  }

  // 禄神 / 太极 / 福星 / 国印
  {
    const loc = locateByDayAndYearGan(chart, LU_SHEN)
    if (loc.pillars.length) {
      pushHit(hits, {
        name: '禄神',
        ...loc,
        brief: '俸禄、稳定食禄之象。',
        tone: '吉',
        basis: ganTableBasis('禄神查表', LU_SHEN, loc)
      })
    }
  }
  {
    const loc = locateByDayAndYearGan(chart, TAIJI)
    if (loc.pillars.length) {
      /** 叠见三柱及以上：展示名仍为太极贵人，推断写入三太极加重理解 */
      const isSanTaiji = loc.pillars.length >= 3
      const n = loc.pillars.length
      pushHit(hits, {
        name: '太极贵人',
        ...loc,
        brief: isSanTaiji
          ? `叠见${n}柱，俗称「三太极」：悟性与玄学缘叠重，宜深研实修、善思辨，忌流于空想空谈。`
          : '悟性、玄学缘、喜钻研。',
        tone: '吉',
        basis:
          ganTableBasis('太极贵人查表', TAIJI, loc) +
          (isSanTaiji
            ? `；叠见${n}柱，推断须按「三太极」加重悟性/玄学缘并戒空谈（展示名仍作太极贵人）`
            : '')
      })
    }
  }
  {
    const loc = locateByDayAndYearGan(chart, FUXING)
    if (loc.pillars.length) {
      pushHit(hits, {
        name: '福星贵人',
        ...loc,
        brief: '福气、衣食无忧倾向。',
        tone: '吉',
        basis: ganTableBasis('福星查表', FUXING, loc)
      })
    }
  }
  {
    const loc = locateByDayAndYearGan(chart, GUOYIN)
    if (loc.pillars.length) {
      pushHit(hits, {
        name: '国印',
        ...loc,
        brief: '印信、名位、文书章印。',
        tone: '吉',
        basis: ganTableBasis('国印查表', GUOYIN, loc)
      })
    }
  }

  // 金舆
  {
    const loc = locateByDayAndYearGan(chart, JINYU)
    if (loc.pillars.length) {
      pushHit(hits, {
        name: '金舆',
        ...loc,
        brief: '车马、体面、婚恋辅助象。',
        tone: '吉',
        basis: ganTableBasis('金舆查表', JINYU, loc)
      })
    }
  }

  // 红鸾
  {
    const loc = locate(chart, [HONGLUAN[yearZhi]])
    if (loc.pillars.length) {
      pushHit(hits, {
        name: '红鸾',
        ...loc,
        brief: '喜庆、姻缘变动象。',
        tone: '中',
        basis: `年支${yearZhi}→红鸾支${HONGLUAN[yearZhi]}；${locPhrase(loc)}`
      })
    }
  }

  // 阴差阳错
  if (YINCHA_YANGCUO.has(dayGz)) {
    pushHit(hits, {
      name: '阴差阳错',
      zhi: [dayZhi],
      pillars: ['日'],
      brief: '情感易错位、阴差阳错之象。',
      tone: '慎',
      basis: `日柱${dayGz}属于阴差阳错日柱表`
    })
  }

  // 天医
  {
    const tianYiZhi = DIZHI[(DIZHI.indexOf(monthZhi) - 1 + 12) % 12]
    const loc = locate(chart, [tianYiZhi])
    if (loc.pillars.length) {
      pushHit(hits, {
        name: '天医',
        ...loc,
        brief: '医药、疗愈缘。',
        tone: '吉',
        basis: `月支${monthZhi}前一位→天医支${tianYiZhi}；${locPhrase(loc)}`
      })
    }
  }

  // 将星 / 亡神
  for (const [name, table, brief, tone] of [
    ['将星', SANHE_JIANG, '领导、权威、统御象。', '中'],
    ['亡神', SANHE_WANG, '变动、隐晦、需防失察。', '慎']
  ] as const) {
    const targets = [
      ...new Set([table[sanheKey(yearZhi)], table[sanheKey(dayZhi)]])
    ] as DiZhi[]
    const loc = locate(chart, targets)
    if (loc.pillars.length) {
      pushHit(hits, {
        name,
        ...loc,
        brief,
        tone,
        basis: sanheBasis(name + '三合', table, targets, loc)
      })
    }
  }

  // 血刃
  {
    const xueRen = DIZHI[(DIZHI.indexOf(monthZhi) + 6) % 12]
    const loc = locate(chart, [xueRen])
    if (loc.pillars.length) {
      pushHit(hits, {
        name: '血刃',
        ...loc,
        brief: '血光、手术、冲突象（娱乐慎读）。',
        tone: '慎',
        basis: `月支${monthZhi}六冲→血刃支${xueRen}；${locPhrase(loc)}`
      })
    }
  }

  // 天德 / 天德合（月支查：干见干、支见支；合取五合干或六合支）
  {
    const td = TIANDE[monthZhi]
    if (DIZHI.includes(td as DiZhi)) {
      const tdZhi = td as DiZhi
      const loc = locate(chart, [tdZhi])
      if (loc.pillars.length) {
        pushHit(hits, {
          name: '天德',
          ...loc,
          brief: '天德庇佑、逢凶化减。',
          tone: '吉',
          basis: `月支${monthZhi}天德在支${tdZhi}；${locPhrase(loc)}`
        })
      }
      const heZhi = ZHI_LIUHE[tdZhi]
      const heLoc = locate(chart, [heZhi])
      if (heLoc.pillars.length) {
        pushHit(hits, {
          name: '天德合',
          ...heLoc,
          brief: '逢合得天德助力。',
          tone: '吉',
          basis: `月支${monthZhi}天德支${tdZhi}，六合合支${heZhi}；${locPhrase(heLoc)}`
        })
      }
    } else {
      const tdGan = td as TianGan
      const gLoc = locateGan(chart, [tdGan])
      if (gLoc.pillars.length) {
        pushHit(hits, {
          name: '天德',
          zhi: [],
          pillars: gLoc.pillars,
          brief: `天德在${tdGan}透干。`,
          tone: '吉',
          basis: `月支${monthZhi}天德干${tdGan}透出；见${gLoc.pillars.join('、')}柱`
        })
      }
      const heGan = GAN_HE[tdGan]
      const heLoc = locateGan(chart, [heGan])
      if (heLoc.pillars.length) {
        pushHit(hits, {
          name: '天德合',
          zhi: [],
          pillars: heLoc.pillars,
          brief: `月令天德在${tdGan}，合干${heGan}透出。`,
          tone: '吉',
          basis: `月支${monthZhi}天德干${tdGan}，取合干${heGan}透出；见${heLoc.pillars.join('、')}柱`
        })
      }
    }
  }

  // 月德 / 月德合
  {
    const yd = YUEDE[monthZhi]
    const yLoc = locateGan(chart, [yd])
    if (yLoc.pillars.length) {
      pushHit(hits, {
        name: '月德',
        zhi: [],
        pillars: yLoc.pillars,
        brief: `月德在${yd}透干。`,
        tone: '吉',
        basis: `月支${monthZhi}月德${yd}透干；见${yLoc.pillars.join('、')}柱`
      })
    }
    const he = GAN_HE[yd]
    const gLoc = locateGan(chart, [he])
    if (gLoc.pillars.length) {
      pushHit(hits, {
        name: '月德合',
        zhi: [],
        pillars: gLoc.pillars,
        brief: `月德在${yd}，合干${he}透出。`,
        tone: '吉',
        basis: `月支${monthZhi}月德${yd}，合干${he}透出；见${gLoc.pillars.join('、')}柱`
      })
    }
  }

  // 德秀贵人
  {
    const row = DEXIU.find((r) => r.months.includes(monthZhi))
    if (row) {
      const gLoc = locateGan(chart, row.gans)
      if (gLoc.pillars.length) {
        pushHit(hits, {
          name: '德秀贵人',
          zhi: [],
          pillars: gLoc.pillars,
          brief: '文秀、贵气之象（各派口诀略异）。',
          tone: '吉',
          basis: `月支${monthZhi}德秀干取${row.gans.join('')}；透于${gLoc.pillars.join('、')}柱`
        })
      }
    }
  }

  // 天喜
  {
    const tianXi = DIZHI[(DIZHI.indexOf(HONGLUAN[yearZhi]) + 6) % 12]
    const loc = locate(chart, [tianXi])
    if (loc.pillars.length) {
      pushHit(hits, {
        name: '天喜',
        ...loc,
        brief: '喜事、欢庆、人缘助兴象。',
        tone: '吉',
        basis: `年支${yearZhi}红鸾${HONGLUAN[yearZhi]}之冲→天喜${tianXi}；${locPhrase(loc)}`
      })
    }
  }

  // 勾煞 / 绞煞
  {
    const gou = DIZHI[(DIZHI.indexOf(yearZhi) + 3) % 12]
    const jiao = DIZHI[(DIZHI.indexOf(yearZhi) + 9) % 12]
    const gouLoc = locate(chart, [gou])
    if (gouLoc.pillars.length) {
      pushHit(hits, {
        name: '勾煞',
        ...gouLoc,
        brief: '牵绊、纠缠、难脱身象。',
        tone: '慎',
        basis: `年支${yearZhi}顺数第三→勾煞${gou}；${locPhrase(gouLoc)}`
      })
    }
    const jiaoLoc = locate(chart, [jiao])
    if (jiaoLoc.pillars.length) {
      pushHit(hits, {
        name: '绞煞',
        ...jiaoLoc,
        brief: '纠葛、口舌、缠绕象。',
        tone: '慎',
        basis: `年支${yearZhi}逆数第三→绞煞${jiao}；${locPhrase(jiaoLoc)}`
      })
    }
  }

  // 飞刃
  {
    const fei = DIZHI[(DIZHI.indexOf(YANGREN[dayGan]) + 6) % 12]
    const loc = locate(chart, [fei])
    if (loc.pillars.length) {
      pushHit(hits, {
        name: '飞刃',
        ...loc,
        brief: '刃气外冲，冲突、手术象（慎读）。',
        tone: '慎',
        basis: `日干${dayGan}羊刃${YANGREN[dayGan]}之冲→飞刃${fei}；${locPhrase(loc)}`
      })
    }
  }

  // 红艳
  {
    const loc = locate(chart, [HONGYAN[dayGan]])
    if (loc.pillars.length) {
      pushHit(hits, {
        name: '红艳煞',
        ...loc,
        brief: '异性缘重、情感纠葛象。',
        tone: '中',
        basis: `日干${dayGan}→红艳支${HONGYAN[dayGan]}；${locPhrase(loc)}`
      })
    }
  }

  // 流霞
  {
    const loc = locate(chart, [LIUXIA[dayGan]])
    if (loc.pillars.length) {
      pushHit(hits, {
        name: '流霞',
        ...loc,
        brief: '血光、产厄、酒色纠葛象（慎读）。',
        tone: '慎',
        basis: `日干${dayGan}→流霞支${LIUXIA[dayGan]}；${locPhrase(loc)}`
      })
    }
  }

  // 劫煞 / 灾煞
  for (const [name, table, brief, tone] of [
    ['劫煞', SANHE_JIE, '劫夺、阻滞、突发变故象。', '慎'],
    ['灾煞', SANHE_ZAI, '灾阻、不顺、需防意外象。', '慎']
  ] as const) {
    const targets = [
      ...new Set([table[sanheKey(yearZhi)], table[sanheKey(dayZhi)]])
    ] as DiZhi[]
    const loc = locate(chart, targets)
    if (loc.pillars.length) {
      pushHit(hits, {
        name,
        ...loc,
        brief,
        tone,
        basis: sanheBasis(name + '三合', table, targets, loc)
      })
    }
  }

  // 丧门 / 吊客 / 披麻 / 病符 / 大耗 / 元辰
  {
    const yi = DIZHI.indexOf(yearZhi)
    const sang = DIZHI[(yi + 2) % 12]
    const diao = DIZHI[(yi + 10) % 12]
    const pima = DIZHI[(yi + 1) % 12]
    const bing = DIZHI[(yi + 11) % 12]
    const hao = DIZHI[(yi + 6) % 12]
    const yangYear = ['甲', '丙', '戊', '庚', '壬'].includes(yearGan)
    const yuan = DIZHI[(yi + (yangYear ? 1 : 11)) % 12]
    for (const [name, z, brief, tone, how] of [
      ['丧门', sang, '孝服、伤感、低落象（慎读）。', '慎', `年支${yearZhi}顺数第二→${sang}`],
      ['吊客', diao, '吊唁、忧思、人际疏离象。', '慎', `年支${yearZhi}逆数第二→${diao}`],
      ['披麻', pima, '孝服披麻象（慎读）。', '慎', `年支${yearZhi}顺数第一→${pima}`],
      ['病符', bing, '病符、不适、需养护象。', '慎', `年支${yearZhi}逆数第一→${bing}`],
      ['大耗', hao, '破耗、破财、流失象。', '慎', `年支${yearZhi}六冲→${hao}`],
      [
        '元辰',
        yuan,
        '纠缠、闷气、小人扰象。',
        '慎',
        `年干${yearGan}${yangYear ? '阳' : '阴'}年${yangYear ? '顺' : '逆'}一位→${yuan}`
      ]
    ] as const) {
      const loc = locate(chart, [z])
      if (loc.pillars.length) {
        pushHit(hits, {
          name,
          ...loc,
          brief,
          tone,
          basis: `${how}；${locPhrase(loc)}`
        })
      }
    }
  }

  // 日柱专属
  if (GULUAN.has(dayGz)) {
    pushHit(hits, {
      name: '孤鸾煞',
      zhi: [dayZhi],
      pillars: ['日'],
      brief: '婚恋多波折、独处象（慎读）。',
      tone: '慎',
      basis: `日柱${dayGz}属于孤鸾煞日柱表`
    })
  }
  if (JIUCHOU.has(dayGz)) {
    pushHit(hits, {
      name: '九丑日',
      zhi: [dayZhi],
      pillars: ['日'],
      brief: '旧说忌婚嫁动土之日（慎读）。',
      tone: '慎',
      basis: `日柱${dayGz}属于九丑日表`
    })
  }
  if (SHIE_DABAI.has(dayGz)) {
    pushHit(hits, {
      name: '十恶大败',
      zhi: [dayZhi],
      pillars: ['日'],
      brief: '旧说财禄易耗之日（慎读）。',
      tone: '慎',
      basis: `日柱${dayGz}属于十恶大败日表`
    })
  }
  {
    const row = SIFEI.find((r) => r.months.includes(monthZhi))
    if (row?.days.includes(dayGz)) {
      pushHit(hits, {
        name: '四废日',
        zhi: [dayZhi],
        pillars: ['日'],
        brief: '当令失力、事倍功半象。',
        tone: '慎',
        basis: `月支${monthZhi}季内，日柱${dayGz}属四废日`
      })
    }
  }
  {
    const row = TIANCHE.find((r) => r.months.includes(monthZhi))
    if (row && row.day === dayGz) {
      pushHit(hits, {
        name: '天赦',
        zhi: [dayZhi],
        pillars: ['日'],
        brief: '宽宥、化解、宜开新象。',
        tone: '吉',
        basis: `月支${monthZhi}对应天赦日${row.day}，本盘日柱${dayGz}命中`
      })
    }
  }

  // 金神
  {
    if (JINSHEN.has(dayGz)) {
      pushHit(hits, {
        name: '金神',
        zhi: [dayZhi],
        pillars: ['日'],
        brief: '刚锐、火炼金成之象。',
        tone: '中',
        basis: `日柱${dayGz}属于金神（乙丑/己巳/癸酉）`
      })
    }
    const hourGz = chart.pillars.hour?.gz
    if (hourGz && JINSHEN.has(hourGz)) {
      pushHit(hits, {
        name: '金神',
        zhi: [chart.pillars.hour!.zhi],
        pillars: ['时'],
        brief: '刚锐、火炼金成之象。',
        tone: '中',
        basis: `时柱${hourGz}属于金神（乙丑/己巳/癸酉）`
      })
    }
  }

  // 童子煞
  {
    const targets = TONGZI[sanheKey(yearZhi)]
    const hourZhi = chart.pillars.hour?.zhi
    if (hourZhi && targets.includes(hourZhi)) {
      pushHit(hits, {
        name: '童子煞',
        zhi: [hourZhi],
        pillars: ['时'],
        brief: '稚气、幼缘；婚育民俗慎读（时支命中）。',
        tone: '中',
        basis: `年支${yearZhi}三合取童子支${targets.join('')}；时支${hourZhi}命中（时支优先）`
      })
    } else if (targets.includes(dayZhi)) {
      pushHit(hits, {
        name: '童子煞',
        zhi: [dayZhi],
        pillars: ['日'],
        brief: hourZhi
          ? '稚气、幼缘；婚育民俗慎读（时支未中，日支命中）。'
          : '稚气、幼缘；婚育民俗慎读（时辰未知，以日支论）。',
        tone: '中',
        basis: `年支${yearZhi}三合取童子支${targets.join('')}；${
          hourZhi ? '时支' + hourZhi + '未中，' : '无时柱，'
        }日支${dayZhi}命中`
      })
    }
  }

  // 天罗 / 地网
  {
    const wx = chart.dayMasterWuXing
    if (wx === '火') {
      const loc = locate(chart, ['戌', '亥'])
      if (loc.pillars.length) {
        pushHit(hits, {
          name: '天罗',
          ...loc,
          brief: '天罗困阻、难展象。',
          tone: '慎',
          basis: `日主五行${wx}（火）见戌亥为天罗；${locPhrase(loc)}`
        })
      }
    }
    if (wx === '水' || wx === '土') {
      const loc = locate(chart, ['辰', '巳'])
      if (loc.pillars.length) {
        pushHit(hits, {
          name: '地网',
          ...loc,
          brief: '地网牵绊、难脱象。',
          tone: '慎',
          basis: `日主五行${wx}见辰巳为地网；${locPhrase(loc)}`
        })
      }
    }
  }

  // 词馆 / 学堂
  {
    const loc = locate(chart, [CIGUAN[dayGan]])
    if (loc.pillars.length) {
      pushHit(hits, {
        name: '词馆',
        ...loc,
        brief: '文才、考试、文学缘。',
        tone: '吉',
        basis: `日干${dayGan}临官查词馆→${CIGUAN[dayGan]}；${locPhrase(loc)}`
      })
    }
  }
  {
    const loc = locate(chart, [XUETANG[dayGan]])
    if (loc.pillars.length) {
      pushHit(hits, {
        name: '学堂',
        ...loc,
        brief: '学业开窍、进修缘。',
        tone: '吉',
        basis: `日干${dayGan}长生查学堂→${XUETANG[dayGan]}；${locPhrase(loc)}`
      })
    }
  }

  /** 同名多柱叠见：加重 brief/basis（太极三太极已写则不重复） */
  return enrichShenShaWithStacks(hits)
}

/**
 * 将神煞命中按四柱归类（细盘「神煞」行用）。
 * @param hits collectShenSha 结果
 */
export function groupShenShaByPillar(
  hits: ShenShaHit[]
): Record<'年' | '月' | '日' | '时', string[]> {
  const out: Record<'年' | '月' | '日' | '时', string[]> = {
    年: [],
    月: [],
    日: [],
    时: []
  }
  for (const h of hits) {
    for (const p of h.pillars) {
      if (!out[p].includes(h.name)) out[p].push(h.name)
    }
  }
  return out
}
