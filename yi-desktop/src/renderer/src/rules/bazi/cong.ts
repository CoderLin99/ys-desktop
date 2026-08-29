/**
 * 从格细法（神峰通考 / 真诠外格大意，原创可编码条件，非原文）。
 *
 * 真从：月令与透干成党、日主几乎无根无助，喜顺势、忌逆势生扶。
 * 假从：仍有印比或通根残留，岁运一见生扶则从格易破，仍参扶抑。
 * 普通盘：不从，走扶抑喜用。
 */
import { KE, SHENG, TIANGAN_WUXING, type WuXing } from '../constants'
import type { BaZiChart } from './chart'
import { shishenOf, type ShiShen } from './shishen'
import { makeEvidence, type RuleEvidence } from './evidence'
import { getMetricGloss, tableVersionNote } from './tables/load'

/** 与 trend 强弱档对齐，避免循环引用 */
type StrengthLevel = '偏弱' | '中和' | '偏强'

/** 判从只需得令/通根/透干，不依赖 trend 运行时 */
interface StrengthSlice {
  /** 强弱档 */
  level: StrengthLevel
  /** 能量分 */
  score: number
  /** 得令得地得势 */
  breakdown: { deLing: boolean; deDi: boolean; deShi: boolean }
}

/** 从格种类 */
export type CongKind =
  | '不从'
  | '真从弱'
  | '假从弱'
  | '真从强'
  | '假从强'

/** 从弱时所从之党 */
export type CongFollow = '从财' | '从杀' | '从儿' | '从旺' | ''

/** 从格判定结果 */
export interface CongGeResult {
  /** 真从 / 假从 / 不从 */
  kind: CongKind
  /** 从财/从杀/从儿/从旺；不从时为空 */
  follow: CongFollow
  /** 是否改用从格喜用（仅真从） */
  overrideUseful: boolean
  /** 总批一句 */
  text: string
  /** 机读依据 */
  basis: string
  /** 可复盘证据（含释义） */
  evidence: RuleEvidence
}

/** 印比党：生我、同我 */
const YIN_BI: ShiShen[] = ['正印', '偏印', '比肩', '劫财']
/** 财官党：我克、克我 */
const CAI_GUAN: ShiShen[] = ['正财', '偏财', '正官', '七杀']
/** 食伤党：我生 */
const SHI_SHANG: ShiShen[] = ['食神', '伤官']

/**
 * 把十神归入从格用的三党。
 * @param ss 十神
 */
function campOf(ss: ShiShen): 'yinBi' | 'caiGuan' | 'shiShang' {
  if (YIN_BI.includes(ss)) return 'yinBi'
  if (CAI_GUAN.includes(ss)) return 'caiGuan'
  return 'shiShang'
}

/**
 * 统计年/月/时透干与藏干的三党气势（日干自身不计）。
 * @param chart 盘
 */
function campScores(chart: BaZiChart): {
  yinBi: number
  caiGuan: number
  shiShang: number
  yinBiStem: number
  monthCamp: 'yinBi' | 'caiGuan' | 'shiShang'
} {
  const day = chart.dayMaster
  const pillars = [
    chart.pillars.year,
    chart.pillars.month,
    ...(chart.pillars.hour ? [chart.pillars.hour] : [])
  ]
  let yinBi = 0
  let caiGuan = 0
  let shiShang = 0
  let yinBiStem = 0
  for (const p of pillars) {
    const ss = shishenOf(day, p.gan)
    const camp = campOf(ss)
    if (camp === 'yinBi') {
      yinBi += 3
      yinBiStem += 1
    } else if (camp === 'caiGuan') caiGuan += 3
    else shiShang += 3
    for (const c of p.canggan) {
      const cs = campOf(c.shiShen)
      const w = c.weight * 6
      if (cs === 'yinBi') yinBi += w
      else if (cs === 'caiGuan') caiGuan += w
      else shiShang += w
    }
  }
  const monthSs =
    chart.pillars.month.ganShiShen === '日主'
      ? shishenOf(day, chart.pillars.month.gan)
      : (chart.pillars.month.ganShiShen as ShiShen)
  return { yinBi, caiGuan, shiShang, yinBiStem, monthCamp: campOf(monthSs) }
}

/**
 * 从弱时按哪一党最旺决定从财 / 从杀 / 从儿。
 * @param chart 盘
 * @param camps 三党分
 */
function followOfWeak(
  chart: BaZiChart,
  camps: ReturnType<typeof campScores>
): CongFollow {
  const dayWx = TIANGAN_WUXING[chart.dayMaster]
  const caiWx = KE[dayWx]
  const guanWx = (Object.keys(KE) as WuXing[]).find((x) => KE[x] === dayWx)!
  let cai = 0
  let sha = 0
  const pillars = [
    chart.pillars.year,
    chart.pillars.month,
    chart.pillars.day,
    ...(chart.pillars.hour ? [chart.pillars.hour] : [])
  ]
  for (const p of pillars) {
    if (p.gan === chart.dayMaster) {
      /* 日干不计入所从之党 */
    } else {
      const wx = TIANGAN_WUXING[p.gan]
      if (wx === caiWx) cai += 3
      if (wx === guanWx) sha += 3
    }
    for (const c of p.canggan) {
      const wx = TIANGAN_WUXING[c.gan]
      if (wx === caiWx) cai += c.weight * 4
      if (wx === guanWx) sha += c.weight * 4
    }
  }
  if (camps.shiShang >= camps.caiGuan && camps.shiShang >= 8) return '从儿'
  if (sha >= cai && sha >= 6) return '从杀'
  return '从财'
}

/**
 * 组装从格证据。
 * @param kind 从格种类
 * @param follow 所从
 * @param text 总批
 * @param basis 机读依据
 * @param steps 步骤
 */
function congEvidence(
  kind: CongKind,
  follow: CongFollow,
  text: string,
  basis: string,
  steps: string[]
): RuleEvidence {
  return makeEvidence({
    id: 'cong',
    value: follow ? `${kind}·${follow}` : kind,
    rule: `神峰外格可编码条件（${tableVersionNote()}）`,
    basis,
    steps,
    gloss: getMetricGloss('从格')
  })
}

/**
 * 按神峰外格条件判真从/假从。身极弱且印比无力、月令为财官食伤可从弱；身极旺且印比成党可从强。
 * @param chart 盘
 * @param strength 已算好的强弱
 */
export function judgeCongGe(chart: BaZiChart, strength: StrengthSlice): CongGeResult {
  const empty: CongGeResult = {
    kind: '不从',
    follow: '',
    overrideUseful: false,
    text: '未入从格，仍按月令扶抑取用。',
    basis: `score=${strength.score}`,
    evidence: congEvidence('不从', '', '未入从格，仍按月令扶抑取用。', `score=${strength.score}`, [
      `强弱分${strength.score}`,
      `得令${strength.breakdown.deLing}得地${strength.breakdown.deDi}得势${strength.breakdown.deShi}`,
      '未达真从/假从门槛'
    ])
  }
  const camps = campScores(chart)
  const { score, breakdown } = strength
  const weakGate = score <= 28 && !breakdown.deLing
  const strongGate = score >= 78 && (breakdown.deLing || breakdown.deDi)
  const campStep = `三党印比${camps.yinBi.toFixed(1)}/财官${camps.caiGuan.toFixed(1)}/食伤${camps.shiShang.toFixed(1)}；月令党${camps.monthCamp}`

  if (weakGate && camps.monthCamp !== 'yinBi') {
    const follow = followOfWeak(chart, camps)
    const trueWeak =
      !breakdown.deDi && camps.yinBiStem === 0 && camps.yinBi < 5 && (camps.caiGuan + camps.shiShang) >= 10
    if (trueWeak) {
      const basis = `score=${score};yinBi=${camps.yinBi.toFixed(1)};month=${camps.monthCamp}`
      const text = `真从弱（${follow}）：日主无根无助，月令与透干成财官食伤之党。利：岁运顺其党可发。弊：再见印比生扶则从格易破、反而驳杂。`
      return {
        kind: '真从弱',
        follow,
        overrideUseful: true,
        text,
        basis,
        evidence: congEvidence('真从弱', follow, text, basis, [
          `弱门槛：分≤28且不得令（当前${score}）`,
          campStep,
          '无通根、无印比透干、财官食伤党≥10→真从弱'
        ])
      }
    }
    if (camps.yinBi < 9 && (camps.caiGuan + camps.shiShang) > camps.yinBi) {
      const basis = `score=${score};yinBiStem=${camps.yinBiStem}`
      const text = `假从弱（${follow}倾向）：身弱且月令不助身，可暂顺财官食伤之势。利：顺势之年仍可成事。弊：印比一透或岁运生扶，须改回扶抑，不可死从。`
      return {
        kind: '假从弱',
        follow,
        overrideUseful: false,
        text,
        basis,
        evidence: congEvidence('假从弱', follow, text, basis, [
          `弱门槛成立（${score}）`,
          campStep,
          '印比未绝但弱于财官食伤→假从弱'
        ])
      }
    }
  }

  if (strongGate && camps.monthCamp === 'yinBi') {
    const leak = camps.caiGuan + camps.shiShang
    if (leak < 5 && breakdown.deDi) {
      const basis = `score=${score};leak=${leak.toFixed(1)}`
      const text =
        '真从强（从旺）：印比成党、克泄无力。利：岁运继续帮身可顺势。弊：再来官杀财食逆其旺势，群比争财、压力陡起。'
      return {
        kind: '真从强',
        follow: '从旺',
        overrideUseful: true,
        text,
        basis,
        evidence: congEvidence('真从强', '从旺', text, basis, [
          `强门槛：分≥78且得令或得地（当前${score}）`,
          campStep,
          `克泄总和${leak.toFixed(1)}<5且通根→真从强`
        ])
      }
    }
    if (leak < 12) {
      const basis = `score=${score};leak=${leak.toFixed(1)}`
      const text =
        '假从强：身旺印比有党，但仍有克泄出路。利：顺旺之年可进取。弊：未到纯从，仍要留泄、勿把所有克泄当忌。'
      return {
        kind: '假从强',
        follow: '从旺',
        overrideUseful: false,
        text,
        basis,
        evidence: congEvidence('假从强', '从旺', text, basis, [
          `强门槛成立（${score}）`,
          campStep,
          `克泄${leak.toFixed(1)}<12→假从强`
        ])
      }
    }
  }

  return empty
}

/**
 * 真从时改写喜用：从弱顺所从之党，从强顺印比。假从与不从仍走原扶抑。
 * @param chart 盘
 * @param cong 从格
 * @param fallback 原扶抑喜用
 */
export function usefulByCong(
  chart: BaZiChart,
  cong: CongGeResult,
  fallback: { useful: WuXing[]; avoid: WuXing[] }
): { useful: WuXing[]; avoid: WuXing[] } {
  if (!cong.overrideUseful) return fallback
  const dayWx = TIANGAN_WUXING[chart.dayMaster]
  const shengWo = (Object.keys(SHENG) as WuXing[]).find((x) => SHENG[x] === dayWx)!
  const woSheng = SHENG[dayWx]
  const woKe = KE[dayWx]
  const keWo = (Object.keys(KE) as WuXing[]).find((x) => KE[x] === dayWx)!
  if (cong.kind === '真从强') {
    return { useful: [dayWx, shengWo], avoid: [keWo, woKe] }
  }
  if (cong.follow === '从儿') {
    return { useful: [woSheng, woKe], avoid: [shengWo, dayWx] }
  }
  if (cong.follow === '从杀') {
    return { useful: [keWo, woKe], avoid: [shengWo, dayWx] }
  }
  return { useful: [woKe, woSheng], avoid: [shengWo, dayWx] }
}
