/**
 * 双人八字合盘（合婚 / 恋爱 / 事业合作 / 亲情友情等场景）。
 * 方法论：子平常见法——日支为配偶宫、喜用互补、五行生克、六合六冲，不给「注定」结论。
 */
import { DIZHI_WUXING, KE, SHENG, TIANGAN_WUXING, type DiZhi, type WuXing } from '../constants'
import type { BaZiChart } from './chart'
import { shishenOf, type ShiShen } from './shishen'
import { judgeStrength, pickUseful } from './trend'

/** 合盘场景（恋爱、合作、亲情、朋友等） */
export type HeHunKind = 'marriage' | 'love' | 'business' | 'family' | 'friend'

/** 单维评分 */
export interface HeHunDimension {
  /** 维度名 */
  name: string
  /** 0–100 */
  score: number
  /** 可读说明 */
  text: string
}

/** 合盘总结果 */
export interface HeHunResult {
  /** 场景 */
  kind: HeHunKind
  /** 综合分 0–100 */
  score: number
  /** 档位 */
  band: '佳' | '可' | '慎'
  /** 各维得分 */
  dimensions: HeHunDimension[]
  /** 规则断语（可复盘） */
  lines: string[]
  /** 相处提示（现代口径） */
  tips: string[]
  disclaimer: string
}

/** 地支六冲 */
const LIU_CHONG: Record<DiZhi, DiZhi> = {
  子: '午',
  午: '子',
  丑: '未',
  未: '丑',
  寅: '申',
  申: '寅',
  卯: '酉',
  酉: '卯',
  辰: '戌',
  戌: '辰',
  巳: '亥',
  亥: '巳'
}

/** 地支六合 */
const LIU_HE: [DiZhi, DiZhi][] = [
  ['子', '丑'],
  ['寅', '亥'],
  ['卯', '戌'],
  ['辰', '酉'],
  ['巳', '申'],
  ['午', '未']
]

/** 场景中文名 */
const KIND_LABEL: Record<HeHunKind, string> = {
  marriage: '八字合婚',
  love: '恋爱合盘',
  business: '事业合作',
  family: '亲情合盘',
  friend: '朋友合盘'
}

/**
 * 两五行关系分：正为生扶，负为克泄耗。
 * @param a 五行甲
 * @param b 五行乙
 */
function wxRelationScore(a: WuXing, b: WuXing): number {
  if (a === b) return 2
  if (SHENG[b] === a) return 4
  if (SHENG[a] === b) return -1
  if (KE[a] === b) return -2
  if (KE[b] === a) return -4
  return 0
}

/**
 * 是否六合。
 * @param a 支
 * @param b 支
 */
function isLiuHe(a: DiZhi, b: DiZhi): boolean {
  return LIU_HE.some(([x, y]) => (x === a && y === b) || (x === b && y === a))
}

/**
 * 配偶星十神（男财女官杀）。
 * @param gender 性别
 */
function spouseStarSet(gender: 'male' | 'female'): ShiShen[] {
  return gender === 'male' ? ['正财', '偏财'] : ['正官', '七杀']
}

/**
 * 对方盘中是否见配偶星（互见为缘）。
 * @param chart 被看的一盘
 * @param dayMaster 对方日主
 * @param stars 配偶星集合
 */
function countSpouseStarHits(
  chart: BaZiChart,
  dayMaster: BaZiChart['dayMaster'],
  stars: ShiShen[]
): number {
  let n = 0
  const pillars = [chart.pillars.year, chart.pillars.month, chart.pillars.day, chart.pillars.hour]
  for (const p of pillars) {
    if (!p) continue
    if (stars.includes(shishenOf(dayMaster, p.gan))) n += 1
    for (const c of p.canggan) {
      if (stars.includes(c.shiShen)) n += 0.5
    }
  }
  return n
}

/**
 * 喜用互补度：甲的喜用五行在乙盘中是否得气。
 * @param useful 甲喜用
 * @param chartB 乙盘
 */
function usefulComplementScore(useful: WuXing[], chartB: BaZiChart): number {
  let hit = 0
  const wxSet = new Set<WuXing>()
  for (const p of [chartB.pillars.year, chartB.pillars.month, chartB.pillars.day, chartB.pillars.hour]) {
    if (!p) continue
    wxSet.add(TIANGAN_WUXING[p.gan])
    wxSet.add(DIZHI_WUXING[p.zhi])
  }
  for (const wx of useful) {
    if (wxSet.has(wx)) hit += 1
  }
  return Math.min(100, Math.round((hit / Math.max(useful.length, 1)) * 55 + 35))
}

/**
 * 日支合冲评分（婚恋最重）。
 * @param zhiA 甲日支
 * @param zhiB 乙日支
 */
function dayBranchScore(zhiA: DiZhi, zhiB: DiZhi): { score: number; text: string } {
  if (isLiuHe(zhiA, zhiB)) {
    return { score: 88, text: `日支${zhiA}${zhiB}六合，相处有黏合、互补之象，宜主动沟通而非冷战。` }
  }
  if (LIU_CHONG[zhiA] === zhiB) {
    return {
      score: 38,
      text: `日支${zhiA}${zhiB}六冲，易有节奏不合、各执己见；利则互补破局，弊则口角频仍，须设边界。`
    }
  }
  const rel = wxRelationScore(DIZHI_WUXING[zhiA], DIZHI_WUXING[zhiB])
  const score = Math.max(20, Math.min(78, 52 + rel * 6))
  return {
    score,
    text: `日支${zhiA}与${zhiB}五行${rel >= 0 ? '偏相生比和' : '偏克泄'}，日常需对齐生活节奏与决策方式。`
  }
}

/**
 * 日主五行互生克评分。
 * @param chartA 甲盘
 * @param chartB 乙盘
 */
function dayMasterScore(chartA: BaZiChart, chartB: BaZiChart): { score: number; text: string } {
  const wxA = chartA.dayMasterWuXing as WuXing
  const wxB = chartB.dayMasterWuXing as WuXing
  const rel = wxRelationScore(wxA, wxB)
  const score = Math.max(18, Math.min(85, 50 + rel * 7))
  let tone = '中性，各守本位'
  if (rel >= 3) tone = '一方易生扶对方，有照顾、托举之象'
  else if (rel <= -3) tone = '一方易约束或消耗对方，宜分工明确'
  else if (rel >= 1) tone = '有互补，也有各自节奏'
  return { score, text: `日主${wxA}与${wxB}：${tone}。` }
}

/**
 * 按场景加权合成综合分。
 * @param dims 各维
 * @param kind 场景
 */
function blendScore(dims: HeHunDimension[], kind: HeHunKind): number {
  const map: Record<string, number> = Object.fromEntries(dims.map((d) => [d.name, d.score]))
  const w =
    kind === 'marriage' || kind === 'love'
      ? { 日支契合: 0.35, 喜用互补: 0.25, 日主互生克: 0.2, 配偶星互见: 0.2 }
      : kind === 'business'
        ? { 喜用互补: 0.4, 日主互生克: 0.25, 日支契合: 0.15, 配偶星互见: 0.2 }
        : kind === 'family'
          ? { 日支契合: 0.2, 喜用互补: 0.25, 日主互生克: 0.35, 配偶星互见: 0.2 }
          : { 日主互生克: 0.35, 喜用互补: 0.3, 日支契合: 0.15, 配偶星互见: 0.2 }
  let sum = 0
  let wt = 0
  for (const [k, wgt] of Object.entries(w)) {
    if (map[k] != null) {
      sum += map[k] * wgt
      wt += wgt
    }
  }
  return Math.round(sum / (wt || 1))
}

/**
 * 双人八字合盘主入口。
 * @param chartA 甲盘
 * @param chartB 乙盘
 * @param genderA 甲性别
 * @param genderB 乙性别
 * @param kind 合盘场景
 */
export function analyzeHeHun(
  chartA: BaZiChart,
  chartB: BaZiChart,
  genderA: 'male' | 'female',
  genderB: 'male' | 'female',
  kind: HeHunKind = 'marriage'
): HeHunResult {
  const levelA = judgeStrength(chartA)
  const levelB = judgeStrength(chartB)
  const usefulA = pickUseful(chartA.dayMasterWuXing as WuXing, levelA.level, chartA.pillars.month.zhi)
  const usefulB = pickUseful(chartB.dayMasterWuXing as WuXing, levelB.level, chartB.pillars.month.zhi)

  const dayBranch = dayBranchScore(chartA.pillars.day.zhi, chartB.pillars.day.zhi)
  const dayMaster = dayMasterScore(chartA, chartB)
  const compA = usefulComplementScore(usefulA.useful, chartB)
  const compB = usefulComplementScore(usefulB.useful, chartA)
  const complement = Math.round((compA + compB) / 2)

  const starsA = spouseStarSet(genderA)
  const starsB = spouseStarSet(genderB)
  const hitAinB = countSpouseStarHits(chartB, chartA.dayMaster, starsA)
  const hitBinA = countSpouseStarHits(chartA, chartB.dayMaster, starsB)
  const spouseHit = Math.min(92, Math.round(42 + (hitAinB + hitBinA) * 12))

  const dimensions: HeHunDimension[] = [
    { name: '日支契合', score: dayBranch.score, text: dayBranch.text },
    { name: '日主互生克', score: dayMaster.score, text: dayMaster.text },
    {
      name: '喜用互补',
      score: complement,
      text: `甲喜${usefulA.useful.join('、')}，乙盘得气约${compA}分；乙喜${usefulB.useful.join('、')}，甲盘得气约${compB}分。互补高不等于无摩擦，只表资源能否互相补位。`
    },
    {
      name: '配偶星互见',
      score: spouseHit,
      text:
        kind === 'business' || kind === 'friend'
          ? `互见财官印等十神${hitAinB + hitBinA > 1 ? '较多' : '一般'}，合作看分工与边界，不单凭十神多少定吉凶。`
          : `甲之配偶星在乙盘约${hitAinB.toFixed(1)}处，乙之配偶星在甲盘约${hitBinA.toFixed(1)}处；互见多缘深，亦须身强能任。`
    }
  ]

  const score = blendScore(dimensions, kind)
  const band: HeHunResult['band'] = score >= 72 ? '佳' : score >= 52 ? '可' : '慎'

  const lines: string[] = [
    `【${KIND_LABEL[kind]}】甲${chartA.pillars.day.gz}日 / 乙${chartB.pillars.day.gz}日，综合${score}分（${band}）。`,
    ...dimensions.map((d) => `${d.name}${d.score}：${d.text}`)
  ]

  const tips: string[] = []
  if (dayBranch.score < 50) tips.push('日支冲克明显：重大决定分开讨论，避免在情绪高点拍板。')
  if (complement >= 70) tips.push('喜用互补尚可：一方强项可补另一方短板，宜明确谁主外谁主内（或谁主策谁主执行）。')
  if (complement < 50) tips.push('喜用互补偏弱：各自节奏不同，少要求对方按你的「好运方式」生活。')
  if (kind === 'business') tips.push('合作盘重能力与边界：合同、股权、退出机制比「合不合」更决定成败。')
  if (kind === 'family') tips.push('亲情盘重代际边界：可谈教养与赡养，不把八字当道德判决。')
  if (!tips.length) tips.push('合盘是倾向不是判决：相处质量仍取决于沟通、选择与共同目标。')

  return {
    kind,
    score,
    band,
    dimensions,
    lines,
    tips,
    disclaimer: '规则合盘取子平常法，仅供对照与复盘，不作婚恋或合作的唯一依据。'
  }
}

/** 合盘场景选项（UI 用） */
export const HEHUN_KIND_OPTIONS: { value: HeHunKind; label: string; hint: string }[] = [
  { value: 'marriage', label: '八字合婚', hint: '重日支、配偶星、喜用互补' },
  { value: 'love', label: '恋爱合盘', hint: '看重吸引与消耗，节奏是否同步' },
  { value: 'business', label: '事业合作', hint: '重喜用互补与分工，防比劫争财' },
  { value: 'family', label: '亲情合盘', hint: '婆媳/父子/母子等，重代际边界' },
  { value: 'friend', label: '朋友合盘', hint: '看志趣与互生克，不作道德评判' }
]
