/**
 * 八字走势推演（教学近似版）。
 *
 * 规则思路：
 * 1. 月令 + 四柱生克 → 粗判日主强弱
 * 2. 身强取「泄耗」（食伤财），身弱取「生扶」（印比）为喜用倾向
 * 3. 按性别与年干阴阳顺/逆排大运
 * 4. 流年干支相对日主与喜用打分，输出近年走势曲线与阶段文案
 *
 * 注意：未做精确起运岁数、调候、神煞与细盘，只做「大概走势」学习工具。
 */
import {
  DIZHI,
  DIZHI_WUXING,
  JIAZI_60,
  KE,
  SHENG,
  TIANGAN,
  TIANGAN_WUXING,
  TIANGAN_YANG,
  type DiZhi,
  type TianGan,
  type WuXing
} from '../constants'
import { shishenOf, type ShiShen } from './shishen'
import type { BaZiChart } from './chart'

/** 日主强弱档 */
export type StrengthLevel = '偏弱' | '中和' | '偏强'

/** 单一大运步 */
export interface DaYunStep {
  /** 序号，从 1 起 */
  index: number
  /** 干支 */
  gz: string
  /** 天干十神 */
  ganShiShen: ShiShen
  /** 对该运的粗分 0-100 */
  score: number
  /** 一句话倾向 */
  summary: string
}

/** 流年点 */
export interface YearPoint {
  /** 公历年 */
  year: number
  /** 年干支 */
  gz: string
  /** 走势分 0-100 */
  score: number
  /** 档位 */
  band: '低' | '平' | '高'
  /** 事业/财运/人际粗评 */
  aspects: { career: string; wealth: string; relation: string }
  /** 简述 */
  summary: string
}

/** 八字走势总结果 */
export interface BaZiTrend {
  strength: StrengthLevel
  /** 日主能量粗分（内部用，可展示） */
  strengthScore: number
  /** 喜用五行 */
  useful: WuXing[]
  /** 忌神五行 */
  avoid: WuXing[]
  /** 格局一句话 */
  patternSummary: string
  /** 总体人生阶段倾向（非逐年） */
  lifeArc: string
  dayun: DaYunStep[]
  years: YearPoint[]
  disclaimer: string
}

/**
 * 评估某五行对日主的助力（正为生扶，负为克泄耗）。
 * @param dayWx 日主五行
 * @param other 对方五行
 */
function supportScore(dayWx: WuXing, other: WuXing): number {
  if (other === dayWx) return 2
  if (SHENG[other] === dayWx) return 3 // 印
  if (SHENG[dayWx] === other) return -1 // 食伤泄
  if (KE[dayWx] === other) return -2 // 财耗
  if (KE[other] === dayWx) return -3 // 官杀克
  return 0
}

/**
 * 粗判日主强弱。
 * @param chart 八字盘
 */
export function judgeStrength(chart: BaZiChart): { level: StrengthLevel; score: number } {
  const dayWx = TIANGAN_WUXING[chart.dayMaster]
  let score = 50

  // 月令权重最大
  const monthWx = DIZHI_WUXING[chart.pillars.month.zhi]
  score += supportScore(dayWx, monthWx) * 8

  const pillars = [chart.pillars.year, chart.pillars.month, chart.pillars.day, chart.pillars.hour]
  for (const p of pillars) {
    score += supportScore(dayWx, TIANGAN_WUXING[p.gan]) * 3
    score += supportScore(dayWx, DIZHI_WUXING[p.zhi]) * 2
  }

  // 夹到 0-100
  score = Math.max(5, Math.min(95, score))
  let level: StrengthLevel = '中和'
  if (score < 42) level = '偏弱'
  else if (score > 58) level = '偏强'
  return { level, score }
}

/**
 * 按身强身弱取喜用 / 忌神五行（极简版）。
 * @param dayWx 日主五行
 * @param level 强弱
 */
export function pickUseful(dayWx: WuXing, level: StrengthLevel): { useful: WuXing[]; avoid: WuXing[] } {
  const shengWo = (Object.keys(SHENG) as WuXing[]).find((x) => SHENG[x] === dayWx)! // 印
  const woSheng = SHENG[dayWx] // 食伤
  const woKe = KE[dayWx] // 财
  const keWo = (Object.keys(KE) as WuXing[]).find((x) => KE[x] === dayWx)! // 官杀

  if (level === '偏弱') {
    return { useful: [shengWo, dayWx], avoid: [keWo, woKe] }
  }
  if (level === '偏强') {
    return { useful: [woSheng, woKe], avoid: [shengWo, dayWx] }
  }
  // 中和：财官食伤略喜，忌过猛克泄
  return { useful: [woKe, woSheng, keWo], avoid: [keWo] }
}

/**
 * 干支组合相对喜用的得分。
 * @param dayGan 日主
 * @param gan 天干
 * @param zhi 地支
 * @param useful 喜用
 * @param avoid 忌神
 */
function gzTrendScore(
  dayGan: TianGan,
  gan: TianGan,
  zhi: DiZhi,
  useful: WuXing[],
  avoid: WuXing[]
): number {
  const dayWx = TIANGAN_WUXING[dayGan]
  let score = 55
  const items: WuXing[] = [TIANGAN_WUXING[gan], DIZHI_WUXING[zhi]]
  for (const wx of items) {
    if (useful.includes(wx)) score += 12
    if (avoid.includes(wx)) score -= 12
    score += supportScore(dayWx, wx) * 2
  }
  // 十神微调：身弱遇印比加分，身强遇财官加分已由 useful 覆盖
  const ss = shishenOf(dayGan, gan)
  if (ss === '正印' || ss === '偏印') score += useful.includes(TIANGAN_WUXING[gan]) ? 4 : -2
  if (ss === '正财' || ss === '偏财' || ss === '正官' || ss === '七杀') {
    score += useful.includes(TIANGAN_WUXING[gan]) ? 4 : -3
  }
  return Math.max(8, Math.min(96, Math.round(score)))
}

/**
 * 分数转档位。
 * @param score 0-100
 */
function toBand(score: number): YearPoint['band'] {
  if (score >= 68) return '高'
  if (score <= 42) return '低'
  return '平'
}

/**
 * 根据十神与分数生成三方面粗评。
 * @param dayGan 日主
 * @param gan 流年/大运天干
 * @param score 分
 */
function aspectText(
  dayGan: TianGan,
  gan: TianGan,
  score: number
): YearPoint['aspects'] {
  const ss = shishenOf(dayGan, gan)
  const up = score >= 60
  const careerMap: Partial<Record<ShiShen, string>> = {
    正官: up ? '职场规则内易有表现' : '责任压力偏沉，宜守不宜冒',
    七杀: up ? '挑战中易破局升维' : '压力大，防冲突与蛮干',
    正印: up ? '学习考证、贵人提携较顺' : '想多做少，执行偏慢',
    偏印: up ? '偏门思路有机会' : '思绪杂，决策宜简化',
    食神: up ? '表达与技艺易兑现' : '想法多落地少',
    伤官: up ? '创新发声有窗口' : '口舌是非，注意分寸',
    比肩: up ? '合作并行可推进' : '竞争分利，边界要清',
    劫财: up ? '行动力带动机会' : '争夺感强，防破财冲动',
    正财: up ? '正财进项较稳' : '开销或回款慢',
    偏财: up ? '偏财机会增多' : '投资宜谨慎'
  }
  const wealth =
    ss.includes('财') || ss === '食神' || ss === '伤官'
      ? up
        ? '财运有波段机会，量入为出仍可进取'
        : '财上宜守，少做杠杆'
      : up
        ? '财务大致平稳，有小惊喜'
        : '开销需控，避免临时大额'
  const relation =
    ss === '正官' || ss === '七杀' || ss === '伤官'
      ? up
        ? '人际分明，关键协作可成'
        : '易争执，先沟通再推进'
      : up
        ? '关系面温和，适合联动'
        : '少猜疑，多核实信息'

  return {
    career: careerMap[ss] ?? (up ? '事务推进较顺' : '事务多阻滞，宜拆步'),
    wealth,
    relation
  }
}

/**
 * 排大运干支序列（从月柱下一柱起，顺或逆）。
 * @param chart 盘
 * @param gender 性别 male/female
 * @param count 运数
 */
export function buildDaYun(chart: BaZiChart, gender: 'male' | 'female', count = 8): string[] {
  const yearGan = chart.pillars.year.gan
  const yangYear = TIANGAN_YANG[yearGan]
  // 阳男阴女顺，阴男阳女逆
  const forward = (gender === 'male' && yangYear) || (gender === 'female' && !yangYear)

  const monthGz = chart.pillars.month.gz
  let idx = JIAZI_60.indexOf(monthGz)
  if (idx < 0) idx = 0

  const list: string[] = []
  for (let i = 1; i <= count; i++) {
    idx = forward ? (idx + 1) % 60 : (idx - 1 + 60) % 60
    list.push(JIAZI_60[idx])
  }
  return list
}

/**
 * 公历年 → 年干支（以立春近似：此处用年-4 公式，未切立春，教学用）。
 * @param year 公历年
 */
export function yearGanZhi(year: number): string {
  return JIAZI_60[((year - 4) % 60 + 60) % 60]
}

/**
 * 由八字盘推演大概走势。
 * @param chart 八字盘
 * @param options 性别、起始流年、流年跨度
 */
export function analyzeBaZiTrend(
  chart: BaZiChart,
  options: {
    gender: 'male' | 'female'
    fromYear?: number
    yearSpan?: number
  }
): BaZiTrend {
  const { level, score } = judgeStrength(chart)
  const dayWx = TIANGAN_WUXING[chart.dayMaster] as WuXing
  const { useful, avoid } = pickUseful(dayWx, level)

  const patternSummary =
    level === '偏弱'
      ? `日主${chart.dayMaster}偏弱，走势上更吃「生扶」：遇印比运年较顺，官杀过旺易吃力。`
      : level === '偏强'
        ? `日主${chart.dayMaster}偏强，走势上更吃「泄耗」：食伤财运年易出成绩，印比过旺易闷。`
        : `日主${chart.dayMaster}大致中和，喜用较活，关键看流年是否过偏。`

  const lifeArc =
    level === '偏弱'
      ? '前半宜蓄势学习、借力；喜用到位后半段发力更稳。'
      : level === '偏强'
        ? '行动力足，早年易冲；懂得收敛与变现后，中段走势更厚。'
        : '起伏不极端，成事关键在持续执行与选对赛道。'

  const dayunGz = buildDaYun(chart, options.gender, 8)
  const dayun: DaYunStep[] = dayunGz.map((gz, i) => {
    const gan = gz[0] as TianGan
    const zhi = gz[1] as DiZhi
    const s = gzTrendScore(chart.dayMaster, gan, zhi, useful, avoid)
    const ss = shishenOf(chart.dayMaster, gan)
    return {
      index: i + 1,
      gz,
      ganShiShen: ss,
      score: s,
      summary: `${ss}运 · ${toBand(s)}档 · ${aspectText(chart.dayMaster, gan, s).career}`
    }
  })

  const fromYear = options.fromYear ?? new Date().getFullYear()
  const span = options.yearSpan ?? 12
  const years: YearPoint[] = []
  for (let y = fromYear; y < fromYear + span; y++) {
    const gz = yearGanZhi(y)
    const gan = gz[0] as TianGan
    const zhi = gz[1] as DiZhi
    // 叠加大运：找当前运（简化：每运10年，从出生年后起算近似）
    const age = chart.solar.year > 0 ? y - chart.solar.year : y - fromYear + 20
    const dunIndex = Math.max(0, Math.min(dayun.length - 1, Math.floor(Math.max(age - 8, 0) / 10)))
    const dun = dayun[dunIndex]
    const base = gzTrendScore(chart.dayMaster, gan, zhi, useful, avoid)
    const mixed = Math.round(base * 0.65 + dun.score * 0.35)
    const band = toBand(mixed)
    const aspects = aspectText(chart.dayMaster, gan, mixed)
    years.push({
      year: y,
      gz,
      score: mixed,
      band,
      aspects,
      summary: `${y}（${gz}）【${band}】${aspects.career}`
    })
  }

  return {
    strength: level,
    strengthScore: score,
    useful,
    avoid,
    patternSummary,
    lifeArc,
    dayun,
    years,
    disclaimer:
      '此为规则化粗推，用于学习「强弱—喜用—大运流年」逻辑；起运岁数、精确节气与调候未展开，勿作人生唯一依据。'
  }
}

// 抑制未直接使用但仍属规则表的导出引用（供扩展）
void TIANGAN
void DIZHI
