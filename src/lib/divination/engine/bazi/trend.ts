/**
 * 八字走势推演（教学近似版）。
 *
 * 规则思路：
 * 1. 月令旺相休囚死 + 藏干通根 + 天干得势 → 日主强弱
 * 2. 身强取泄耗、身弱取生扶；极端季节再并入调候
 * 3. 真从改写喜用（从财/从杀/从儿/从旺），假从与不从仍走扶抑
 * 4. 大运按节气起运（见 yun.ts），不再写死 8 岁
 * 5. 流年干支取立春后的年柱，再叠当前大运打分
 *
 * 缺时辰时跳过时柱权重；手工盘无生日时退回月柱顺逆近似。
 */
import { Solar } from 'lunar-javascript'
import {
  DIZHI,
  DIZHI_WUXING,
  JIAZI_60,
  KE,
  SHENG,
  TIANGAN,
  TIANGAN_WUXING,
  monthWangXiang,
  type DiZhi,
  type TianGan,
  type WangXiang,
  type WuXing
} from '../constants'
import { tiaoHouOfMonth } from './classics'
import { judgeCongGe, usefulByCong, type CongGeResult } from './cong'
import { shishenOf, type ShiShen } from './shishen'
import type { BaZiChart } from './chart'
import { computeQiYun, daYunAtAge, listDaYunGz } from './yun'
import { makeEvidence, type RuleEvidence } from './evidence'
import { getMetricGloss, getStrengthWeights, tableVersionNote } from './tables/load'

/** 日主强弱档 */
export type StrengthLevel = '偏弱' | '中和' | '偏强'

/** 强弱拆解，便于细盘/断言展示得令得地得势 */
export interface StrengthBreakdown {
  /** 日主在月令的旺相休囚死 */
  wangXiang: WangXiang
  /** 月令得令（旺或相） */
  deLing: boolean
  /** 年月日时地支藏干通日本气/中气 */
  deDi: boolean
  /** 年/月/时干透出比劫或印 */
  deShi: boolean
  /** 一句话 */
  text: string
}

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
  /** 起运周岁（节气折算；手工盘为近似） */
  ageFrom: number
  /** 本步结束周岁 */
  ageTo: number
  /** 起始公历年；手工盘为 0 */
  startYear: number
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
  /** 得令/通根/透干拆解 */
  strengthBreakdown: StrengthBreakdown
  /** 喜用五行 */
  useful: WuXing[]
  /** 忌神五行 */
  avoid: WuXing[]
  /** 真从/假从/不从；真从时已改写喜用 */
  cong: CongGeResult
  /** 格局一句话 */
  patternSummary: string
  /** 总体人生阶段倾向（非逐年） */
  lifeArc: string
  dayun: DaYunStep[]
  years: YearPoint[]
  disclaimer: string
  /** 强弱可复盘证据 */
  strengthEvidence: RuleEvidence
  /** 喜用/忌神可复盘证据 */
  usefulEvidence: RuleEvidence
  /** 起运可复盘证据 */
  qiYunEvidence: RuleEvidence
  /** 汇总证据列表（断言/AI） */
  evidences: RuleEvidence[]
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
 * 参与强弱的柱：缺时不计时柱，避免默认时辰污染旺衰。
 * @param chart 盘
 */
function scoredPillars(chart: BaZiChart) {
  return [
    chart.pillars.year,
    chart.pillars.month,
    chart.pillars.day,
    ...(chart.pillars.hour ? [chart.pillars.hour] : [])
  ]
}

/**
 * 粗判日主强弱：月令旺相 + 藏干通根权重 + 天干透出；产出可复盘步骤。
 * @param chart 八字盘
 */
export function judgeStrength(chart: BaZiChart): {
  level: StrengthLevel
  score: number
  breakdown: StrengthBreakdown
  evidence: RuleEvidence
} {
  const w = getStrengthWeights()
  const dayWx = TIANGAN_WUXING[chart.dayMaster]
  const monthZhi = chart.pillars.month.zhi
  const wangXiang = monthWangXiang(monthZhi, dayWx)
  const steps: string[] = [
    `基准分${w.baseScore}`,
    `月令${monthZhi}对日主${dayWx}为${wangXiang}，加减${w.wangXiangScore[wangXiang]}`
  ]
  let score = w.baseScore + w.wangXiangScore[wangXiang]

  let rootWeight = 0
  let shiScore = 0
  const pillars = scoredPillars(chart)
  const labels = ['年', '月', '日', '时'] as const
  pillars.forEach((p, i) => {
    const tag = labels[i] ?? '柱'
    const isDayGan = p === chart.pillars.day
    if (!isDayGan) {
      const ganWx = TIANGAN_WUXING[p.gan]
      const ganBoost = supportScore(dayWx, ganWx) * w.ganBoostFactor
      score += ganBoost
      if (ganWx === dayWx || SHENG[ganWx] === dayWx) shiScore += ganBoost
      steps.push(`${tag}干${p.gan}（${ganWx}）透干贡献${ganBoost}`)
    }
    for (const c of p.canggan) {
      const wx = TIANGAN_WUXING[c.gan]
      const add = supportScore(dayWx, wx) * c.weight * w.rootBoostFactor
      score += add
      if (wx === dayWx) rootWeight += c.weight
      steps.push(`${tag}支藏${c.gan}${c.role}权${c.weight}贡献${add.toFixed(1)}`)
    }
  })

  score = Math.max(5, Math.min(95, Math.round(score)))
  let level: StrengthLevel = '中和'
  if (score < w.weakBelow) level = '偏弱'
  else if (score > w.strongAbove) level = '偏强'
  steps.push(`合计约${score}；阈值弱<${w.weakBelow}/强>${w.strongAbove}→${level}`)

  const deLing = wangXiang === '旺' || wangXiang === '相'
  const deDi = rootWeight >= w.deDiRootMin
  const deShi = shiScore > 0
  const parts = [
    `月令${monthZhi}对日主${wangXiang}`,
    deDi
      ? `通根较有力（根权${rootWeight.toFixed(2)}≥${w.deDiRootMin}）`
      : `通根偏轻（根权${rootWeight.toFixed(2)}）`,
    deShi ? '天干有印比党助' : '天干少印比'
  ]
  const breakdown: StrengthBreakdown = {
    wangXiang,
    deLing,
    deDi,
    deShi,
    text: parts.join('，')
  }
  const evidence = makeEvidence({
    id: 'strength',
    value: `${level}（${score}）`,
    rule: `月令旺相+藏干通根+透干得势（${tableVersionNote()}）`,
    basis: parts.join('；'),
    steps,
    gloss: getMetricGloss(level)
  })
  return { level, score, breakdown, evidence }
}

/**
 * 按身强身弱取扶抑喜用，极端季节再并入调候（寒喜火、热喜水）。
 * 调候与扶抑冲突时，亥子丑/巳午未优先保留调候五行。
 * @param dayWx 日主五行
 * @param level 强弱
 * @param monthZhi 月支（缺省则只做扶抑）
 */
export function pickUseful(
  dayWx: WuXing,
  level: StrengthLevel,
  monthZhi?: DiZhi
): { useful: WuXing[]; avoid: WuXing[]; evidence: RuleEvidence } {
  const shengWo = (Object.keys(SHENG) as WuXing[]).find((x) => SHENG[x] === dayWx)! // 印
  const woSheng = SHENG[dayWx] // 食伤
  const woKe = KE[dayWx] // 财
  const keWo = (Object.keys(KE) as WuXing[]).find((x) => KE[x] === dayWx)! // 官杀
  const steps: string[] = [`日主五行${dayWx}，强弱档${level}`]

  let useful: WuXing[]
  let avoid: WuXing[]
  if (level === '偏弱') {
    useful = [shengWo, dayWx]
    avoid = [keWo, woKe]
    steps.push(`身弱扶抑：喜印${shengWo}+比劫${dayWx}，忌官杀${keWo}+财${woKe}`)
  } else if (level === '偏强') {
    useful = [woSheng, woKe]
    avoid = [shengWo, dayWx]
    steps.push(`身强扶抑：喜食伤${woSheng}+财${woKe}，忌印${shengWo}+比劫${dayWx}`)
  } else {
    useful = [woKe, woSheng, keWo]
    avoid = [keWo]
    steps.push(`中和扶抑：喜财${woKe}/食伤${woSheng}/官杀${keWo}，忌过偏`)
  }

  if (monthZhi) {
    const th = tiaoHouOfMonth(monthZhi)
    steps.push(`月支${monthZhi}调候：${th.text}`)
    if (th.need === '暖' || th.need === '润') {
      for (const wx of [...th.usefulHint].reverse()) {
        useful = [wx, ...useful.filter((x) => x !== wx)]
        avoid = avoid.filter((x) => x !== wx)
      }
      steps.push(`调候优先并入喜用${th.usefulHint.join('')}`)
    }
  }

  useful = [...new Set(useful)].slice(0, 3)
  avoid = [...new Set(avoid)].filter((x) => !useful.includes(x)).slice(0, 3)
  steps.push(`定稿喜用${useful.join('、')}；忌神${avoid.join('、')}`)

  const evidence = makeEvidence({
    id: 'useful',
    value: `喜${useful.join('')}忌${avoid.join('')}`,
    rule: `扶抑取用+穷通调候（${tableVersionNote()}）`,
    basis: steps.slice(1).join('；'),
    steps,
    gloss: getMetricGloss('喜用')
  })
  return { useful, avoid, evidence }
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
function aspectText(dayGan: TianGan, gan: TianGan, score: number): YearPoint['aspects'] {
  const ss = shishenOf(dayGan, gan)
  const up = score >= 60
  const careerMap: Partial<Record<ShiShen, string>> = {
    正官: up ? '职场规则内易有表现' : '责任压力偏沉，宜守不宜冒',
    七杀: up ? '挑战中易破局升维' : '压力大，防冲突与蛮干',
    正印: up ? '进修考证、贵人提携较顺（非学历高低）' : '想多做少，执行偏慢',
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
 * 有公历生日时走节气起运；手工盘退回 8 岁近似。
 * @param chart 盘
 * @param gender 性别 male/female
 * @param count 运数
 */
export function buildDaYun(chart: BaZiChart, gender: 'male' | 'female', count = 8): string[] {
  return listDaYunGz(chart, gender, count)
}

/**
 * 公历年 → 立春后的年干支（取该年 6 月中旬，避开正月立春切分）。
 * 旧版 (year-4)%60 在多数年份相同，但立春前后交节以历书为准。
 * @param year 公历年
 */
export function yearGanZhi(year: number): string {
  try {
    return Solar.fromYmd(year, 6, 15).getLunar().getEightChar().getYear()
  } catch {
    return JIAZI_60[((year - 4) % 60 + 60) % 60]
  }
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
  const { level, score, breakdown, evidence: strengthEvidence } = judgeStrength(chart)
  const dayWx = TIANGAN_WUXING[chart.dayMaster] as WuXing
  const cong = judgeCongGe(chart, { level, score, breakdown })
  const fuyi = pickUseful(dayWx, level, chart.pillars.month.zhi)
  let usefulEvidence = fuyi.evidence
  const { useful, avoid } = usefulByCong(chart, cong, fuyi)
  if (cong.overrideUseful) {
    usefulEvidence = makeEvidence({
      id: 'useful',
      value: `喜${useful.join('')}忌${avoid.join('')}`,
      rule: `真从改写喜用（${tableVersionNote()}）`,
      basis: `${cong.basis}；原扶抑${fuyi.useful.join('/')}→从格后${useful.join('/')}`,
      steps: [...(fuyi.evidence.steps || []), cong.text, `改写喜用${useful.join('、')}`],
      gloss: getMetricGloss('从格')
    })
  }
  const th = tiaoHouOfMonth(chart.pillars.month.zhi)

  const lingText = breakdown.deLing ? '得令' : '不得令'
  const tiaoText = th.need === '平' ? '' : th.text
  /** 真从/假从改写总批；普通盘仍走扶抑 */
  const patternSummary =
    cong.kind !== '不从'
      ? `${cong.text}${tiaoText}`
      : level === '偏弱'
        ? `日主${chart.dayMaster}${lingText}偏弱（${breakdown.text}），走势更吃生扶：遇印比运年较顺，官杀过旺易吃力。${tiaoText}`
        : level === '偏强'
          ? `日主${chart.dayMaster}${lingText}偏强（${breakdown.text}），走势更吃泄耗：食伤财运年易出成绩，印比过旺易闷。${tiaoText}`
          : `日主${chart.dayMaster}大致中和（${breakdown.text}），喜用较活，关键看流年是否过偏。${tiaoText}`

  const lifeArc =
    cong.kind === '真从弱' || cong.kind === '真从强'
      ? '真从之造：岁运顺其党可发；逆势生扶或克泄则从格易破，宜认清阶段、勿两头讨好。'
      : cong.kind === '假从弱' || cong.kind === '假从强'
        ? '假从之造：可暂顺势，印比或克泄一到须改回扶抑，不可死从。'
        : level === '偏弱'
          ? '前半宜蓄势学习、借力；喜用到位后半段发力更稳。'
          : level === '偏强'
            ? '行动力足，早年易冲；懂得收敛与变现后，中段走势更厚。'
            : '起伏不极端，成事关键在持续执行与选对赛道。'

  const yun = computeQiYun(chart, options.gender, 8)
  const qiYunEvidence = yun.evidence
  const dayun: DaYunStep[] = yun.steps.map((step, i) => {
    const gan = step.gz[0] as TianGan
    const zhi = step.gz[1] as DiZhi
    const s = gzTrendScore(chart.dayMaster, gan, zhi, useful, avoid)
    const ss = shishenOf(chart.dayMaster, gan)
    return {
      index: i + 1,
      gz: step.gz,
      ganShiShen: ss,
      score: s,
      summary: `${step.ageFrom}–${step.ageTo}岁 · ${ss}运 · ${toBand(s)}档 · ${aspectText(chart.dayMaster, gan, s).career}`,
      ageFrom: step.ageFrom,
      ageTo: step.ageTo,
      startYear: step.startYear
    }
  })

  const fromYear = options.fromYear ?? new Date().getFullYear()
  const span = options.yearSpan ?? 12
  const years: YearPoint[] = []
  for (let y = fromYear; y < fromYear + span; y++) {
    const gz = yearGanZhi(y)
    const gan = gz[0] as TianGan
    const zhi = gz[1] as DiZhi
    const age = chart.solar.year > 0 ? y - chart.solar.year : y - fromYear + 20
    const dunRaw = daYunAtAge(yun.steps, age)
    const dun =
      dayun.find((d) => d.gz === dunRaw.gz && d.ageFrom === dunRaw.ageFrom) ?? dayun[0]
    const base = gzTrendScore(chart.dayMaster, gan, zhi, useful, avoid)
    const mixed = Math.round(base * 0.65 + (dun?.score ?? 55) * 0.35)
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

  const evidences: RuleEvidence[] = [
    strengthEvidence,
    usefulEvidence,
    cong.evidence,
    qiYunEvidence
  ]

  return {
    strength: level,
    strengthScore: score,
    strengthBreakdown: breakdown,
    useful,
    avoid,
    cong,
    patternSummary,
    lifeArc,
    dayun,
    years,
    strengthEvidence,
    usefulEvidence,
    qiYunEvidence,
    evidences,
    disclaimer: chart.hourUnknown
      ? '三柱粗推：缺时辰，强弱与流年仅供学习对照；起运已按节气折算（时未知用正午），勿作人生唯一依据。'
      : '此为规则化粗推，用于学习「强弱—喜用—大运流年」逻辑；起运按节气间距折算，仍非命运判决。'
  }
}

// 抑制未直接使用但仍属规则表的导出引用（供扩展）
void TIANGAN
void DIZHI
