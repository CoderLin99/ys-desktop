/**
 * 每日运势：以本命盘喜用为纲，叠今日流日 / 今年流年打分。
 * 每日运势：本命喜用叠今日流日与流年，只用可编码规则，不编造具体事件。
 */
import { Solar } from 'lunar-javascript'
import { DIZHI_WUXING, TIANGAN_WUXING, type DiZhi, type TianGan, type WuXing } from '../constants'
import { buildBaZi } from './chart'
import type { BaZiChart } from './chart'
import { shishenOf, type ShiShen } from './shishen'
import { analyzeBaZiTrend, judgeStrength, pickUseful, yearGanZhi } from './trend'

/** 今日四维 */
export interface DailyAspect {
  /** 维度 */
  key: 'overall' | 'career' | 'wealth' | 'relation' | 'health'
  /** 标签 */
  label: string
  /** 0–100 */
  score: number
  /** 短提示 */
  hint: string
}

/** 每日运势结果 */
export interface DailyFortune {
  /** 对照公历日 */
  solarDate: string
  /** 今日流日干支 */
  dayGz: string
  /** 今年流年干支 */
  yearGz: string
  /** 流日十神 */
  dayShiShen: ShiShen
  /** 流年十神 */
  yearShiShen: ShiShen
  /** 综合分 */
  score: number
  /** 档位 */
  band: '高' | '平' | '低'
  /** 一句话总断 */
  summary: string
  /** 分项 */
  aspects: DailyAspect[]
  /** 宜忌（现代口径） */
  doList: string[]
  avoidList: string[]
  disclaimer: string
}

/**
 * 流日 / 流年相对喜用的粗分。
 * @param dayGan 日主
 * @param gan 外来天干
 * @param zhi 外来地支
 * @param useful 喜用
 * @param avoid 忌神
 */
function layerScore(
  dayGan: TianGan,
  gan: TianGan,
  zhi: DiZhi,
  useful: WuXing[],
  avoid: WuXing[]
): number {
  let score = 52
  const gWx = TIANGAN_WUXING[gan]
  const zWx = DIZHI_WUXING[zhi]
  if (useful.includes(gWx)) score += 14
  if (useful.includes(zWx)) score += 10
  if (avoid.includes(gWx)) score -= 14
  if (avoid.includes(zWx)) score -= 10
  const ss = shishenOf(dayGan, gan)
  if (['正印', '偏印', '比肩', '劫财'].includes(ss) && useful.includes(gWx)) score += 4
  if (['正财', '偏财', '正官', '七杀'].includes(ss) && useful.includes(gWx)) score += 3
  if (['伤官', '食神'].includes(ss)) score += useful.includes(gWx) ? 2 : -2
  return Math.max(8, Math.min(96, score))
}

/**
 * 十神 → 今日议题（现代口径）。
 * @param ss 十神
 */
function topicHint(ss: ShiShen): string {
  const map: Record<ShiShen, string> = {
    正官: '规则、流程、对上沟通较显',
    七杀: '压力任务、竞聘破局，防硬碰',
    正财: '现金流、务实消费、稳进为宜',
    偏财: '机会与波动并存，忌贪快',
    正印: '学习、证照、长辈资源可借力',
    偏印: '灵感与独处，少被杂音带节奏',
    食神: '表达、展示、生活享受适度即可',
    伤官: '口舌、创意、改方案，注意措辞',
    比肩: '同伴、分摊、合伙事宜易起',
    劫财: '竞争、分利、防冲动决策'
  }
  return map[ss]
}

/**
 * 计算指定日的每日运势。
 * @param chart 本命盘
 * @param gender 性别（影响大运，今日分以流日流年为主）
 * @param asOf 对照日，默认今天
 */
export function buildDailyFortune(
  chart: BaZiChart,
  gender: 'male' | 'female',
  asOf: Date = new Date()
): DailyFortune {
  const y = asOf.getFullYear()
  const m = asOf.getMonth() + 1
  const d = asOf.getDate()
  const solarDate = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`

  const today = buildBaZi(y, m, d, 12, 0)
  const dayGz = today.pillars.day.gz
  const dayGan = today.pillars.day.gan
  const dayZhi = today.pillars.day.zhi

  const yearGz = yearGanZhi(y)
  const yearGan = yearGz[0] as TianGan
  const yearZhi = yearGz[1] as DiZhi

  const strength = judgeStrength(chart)
  const { useful, avoid } = pickUseful(
    chart.dayMasterWuXing as WuXing,
    strength.level,
    chart.pillars.month.zhi
  )

  const dayMaster = chart.dayMaster
  const dayShiShen = shishenOf(dayMaster, dayGan)
  const yearShiShen = shishenOf(dayMaster, yearGan)

  const dayScore = layerScore(dayMaster, dayGan, dayZhi, useful, avoid)
  const yearScore = layerScore(dayMaster, yearGan, yearZhi, useful, avoid)
  const score = Math.round(dayScore * 0.62 + yearScore * 0.38)

  const band: DailyFortune['band'] = score >= 68 ? '高' : score <= 42 ? '低' : '平'

  const trend = analyzeBaZiTrend(chart, { gender, fromYear: y, yearSpan: 1 })
  const yearPoint = trend.years[0]

  const aspects: DailyAspect[] = [
    {
      key: 'overall',
      label: '综合',
      score,
      hint: `流日${dayGz}（${dayShiShen}）叠流年${yearGz}（${yearShiShen}）。${topicHint(dayShiShen)}。`
    },
    {
      key: 'career',
      label: '事业',
      score: Math.round(score * 0.55 + (['正官', '七杀', '正印'].includes(dayShiShen) ? 18 : 0)),
      hint: yearPoint?.aspects.career ?? '按喜用推进手头项目，忌空转内耗。'
    },
    {
      key: 'wealth',
      label: '财运',
      score: Math.round(score * 0.5 + (['正财', '偏财'].includes(dayShiShen) ? 20 : 0)),
      hint: yearPoint?.aspects.wealth ?? '财为耗身，身弱日宜守不宜赌。'
    },
    {
      key: 'relation',
      label: '人际',
      score: Math.round(score * 0.52 + (['比肩', '劫财', '伤官'].includes(dayShiShen) ? 12 : 0)),
      hint: yearPoint?.aspects.relation ?? '比肩劫财日易有分摊或口角，先听后说。'
    },
    {
      key: 'health',
      label: '身心',
      score: Math.round(score * 0.48 + (avoid.includes(TIANGAN_WUXING[dayGan]) ? -8 : 6)),
      hint: `忌神${avoid.join('、')}当值日宜早睡、少硬撑；流日${dayShiShen}过旺则防思虑过重。`
    }
  ]

  const summary =
    band === '高'
      ? `今日气场偏顺（${score}）：${topicHint(dayShiShen)}，宜推进已定事项。`
      : band === '低'
        ? `今日宜守不宜攻（${score}）：${topicHint(dayShiShen)}，先整理再出手。`
        : `今日中性（${score}）：${topicHint(dayShiShen)}，成败看选择与执行。`

  const doList: string[] = []
  const avoidList: string[] = []
  if (band === '高') {
    doList.push('推进已承诺的一件要事', '重要沟通选上午或你精力最好的时段')
  } else if (band === '低') {
    doList.push('整理、复盘、学习充电', '把大决定延后到更顺的日')
    avoidList.push('冲动消费、情绪化回复消息', '不宜硬启动全新大项目')
  } else {
    doList.push('按清单逐项完成', '适度社交，不必勉强应酬')
  }
  if (['伤官', '劫财'].includes(dayShiShen)) avoidList.push('争口舌、争一时输赢')
  if (['七杀'].includes(dayShiShen)) avoidList.push('与上级硬碰、熬夜赶工')

  return {
    solarDate,
    dayGz,
    yearGz,
    dayShiShen,
    yearShiShen,
    score,
    band,
    summary,
    aspects,
    doList,
    avoidList,
    disclaimer: '每日运势由流日流年与喜用规则推算，不作具体事件预言。'
  }
}

/**
 * 取农历日名（展示用）。
 * @param asOf 公历日
 */
export function lunarLabelOf(asOf: Date = new Date()): string {
  const s = Solar.fromYmd(asOf.getFullYear(), asOf.getMonth() + 1, asOf.getDate())
  const l = s.getLunar()
  return `${l.getMonthInChinese()}月${l.getDayInChinese()}`
}
