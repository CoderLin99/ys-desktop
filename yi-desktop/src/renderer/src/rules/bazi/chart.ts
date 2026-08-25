/**
 * 八字排盘核心。
 *
 * 规则归纳：
 * - 年柱：以立春为界（非春节）
 * - 月柱：以「节」为界（寅月起于立春）
 * - 日柱：连续六十甲子（儒略日推算）
 * - 时柱：日干起时辰，五鼠遁
 *
 * 说明：节气用近似天文公式，教学精度足够；正式命理建议对照专业历书。
 */
import {
  CANGGAN,
  DIZHI,
  JIAZI_60,
  TIANGAN,
  TIANGAN_WUXING,
  DIZHI_WUXING,
  hourToZhi,
  type DiZhi,
  type TianGan
} from '../constants'
import { shishenOf, type ShiShen } from './shishen'

/** 四柱结构 */
export interface Pillar {
  /** 天干 */
  gan: TianGan
  /** 地支 */
  zhi: DiZhi
  /** 干支合写 */
  gz: string
  /** 天干十神（年/月/时相对日主；日干为「日主」） */
  ganShiShen: ShiShen | '日主'
  /** 藏干及十神 */
  canggan: { gan: TianGan; shiShen: ShiShen }[]
}

/** 完整八字盘 */
export interface BaZiChart {
  /** 输入公历 */
  solar: { year: number; month: number; day: number; hour: number; minute: number }
  pillars: {
    year: Pillar
    month: Pillar
    day: Pillar
    hour: Pillar
  }
  /** 日主 */
  dayMaster: TianGan
  /** 日主五行 */
  dayMasterWuXing: string
  /** 提示 */
  notes: string[]
}

/**
 * 公历转儒略日（含时分的小数日）。
 * @param y 年
 * @param m 月
 * @param d 日
 * @param hour 时
 * @param minute 分
 */
export function toJulianDay(y: number, m: number, d: number, hour = 0, minute = 0): number {
  const a = Math.floor((14 - m) / 12)
  const yy = y + 4800 - a
  const mm = m + 12 * a - 3
  const jdn =
    d +
    Math.floor((153 * mm + 2) / 5) +
    365 * yy +
    Math.floor(yy / 4) -
    Math.floor(yy / 100) +
    Math.floor(yy / 400) -
    32045
  return jdn + (hour - 12) / 24 + minute / 1440
}

/**
 * 由儒略日取日柱索引（0=甲子）。基准：已知 2000-01-01 为戊午。
 * @param jd 儒略日
 */
export function dayPillarIndex(jd: number): number {
  // 2000-01-01 12:00 UT ≈ JD 2451545.0 → 本地教学用日期正午
  // 公历 2000-01-01 日柱为戊午，JIAZI_60 中戊午 index = 54
  const day0 = Math.floor(jd + 0.5)
  const base = toJulianDay(2000, 1, 1, 12, 0)
  const baseIdx = 54
  const delta = Math.floor(day0 - Math.floor(base + 0.5))
  return ((baseIdx + delta) % 60 + 60) % 60
}

/**
 * 近似计算某年某节气的儒略日（黄经法简化）。
 * 节气序号：0=小寒 … 2=立春 … 24 循环；月支以「节」为准。
 * @param year 公历年
 * @param termIndex 0..23，0=小寒
 */
export function approxSolarTermJd(year: number, termIndex: number): number {
  // 以 2000 年春分附近为参考的简化公式（教学用）
  const Y = year
  const termAngle = termIndex * 15
  // 粗略：世纪数
  const centuries = (Y - 2000) / 100
  // 春分约 JD，再按 15° 节气偏移（年均约 365.2422/24 天）
  const vernal = 2451623.80984 + 365.24236 * (Y - 2000) + 0.0167 * centuries * centuries
  // termIndex=0 小寒约在春分前 ~ 89. something days；用角度差
  // 春分 = 黄经 0°，对应 termIndex 6（春分）
  const springEquinoxIndex = 6
  const dayPerTerm = 365.2422 / 24
  return vernal + (termIndex - springEquinoxIndex) * dayPerTerm
}

/**
 * 取「节」列表：立春(2)、惊蛰(4)、清明(6)、立夏(8)、芒种(10)、小暑(12)、
 * 立秋(14)、白露(16)、寒露(18)、立冬(20)、大雪(22)、小寒(0)。
 * 对应寅月起。
 */
const JIE_TERM_INDEX = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 0] as const

/**
 * 根据时刻定位年柱、月柱索引。
 * @param jd 事件儒略日
 * @param yearHint 公历年提示
 */
export function yearMonthFromJd(
  jd: number,
  yearHint: number
): { yearGanZhiIndex: number; monthZhiIndex: number; yearForStem: number } {
  // 立春：决定年柱
  const lichunThis = approxSolarTermJd(yearHint, 2)
  const lichunPrev = approxSolarTermJd(yearHint - 1, 2)
  const lichunNext = approxSolarTermJd(yearHint + 1, 2)

  let yearForStem = yearHint
  if (jd < lichunThis) yearForStem = yearHint - 1
  if (jd >= lichunNext) yearForStem = yearHint + 1

  // 年干支：以甲子年公式 (year-4)%60；立春后用 yearForStem
  const yearGanZhiIndex = ((yearForStem - 4) % 60 + 60) % 60

  // 找最近已过的「节」→ 寅月起算
  // 构造 yearForStem 与相邻年的节气点
  const points: { jd: number; monthZhi: number }[] = []
  for (const y of [yearForStem - 1, yearForStem, yearForStem + 1]) {
    JIE_TERM_INDEX.forEach((term, i) => {
      const termYear = term === 0 ? y + 1 : y // 小寒属下一年公历初
      // 对小寒特殊：挂在公历 y+1 年初，作为丑月结束/寅前
      const actualYear = term === 0 ? y + 1 : y
      // 月序：立春起寅=2 索引2；i=0 → 寅
      const zhiIndex = (2 + i) % 12
      points.push({ jd: approxSolarTermJd(actualYear, term), monthZhi: zhiIndex })
    })
  }
  points.sort((a, b) => a.jd - b.jd)

  let monthZhiIndex = 2
  for (const p of points) {
    if (jd >= p.jd) monthZhiIndex = p.monthZhi
    else break
  }

  // 抑制 unused
  void lichunPrev
  return { yearGanZhiIndex, monthZhiIndex, yearForStem }
}

/**
 * 五鼠遁：由日干推时干。
 * @param dayGan 日干
 * @param hourZhi 时支
 */
export function hourGanFromDay(dayGan: TianGan, hourZhi: DiZhi): TianGan {
  // 甲己还加甲，乙庚丙作初，丙辛从戊起，丁壬庚子居，戊癸何方发，壬子是真途
  const startMap: Record<TianGan, TianGan> = {
    甲: '甲',
    己: '甲',
    乙: '丙',
    庚: '丙',
    丙: '戊',
    辛: '戊',
    丁: '庚',
    壬: '庚',
    戊: '壬',
    癸: '壬'
  }
  const start = startMap[dayGan]
  const startIdx = TIANGAN.indexOf(start)
  const zhiIdx = DIZHI.indexOf(hourZhi)
  return TIANGAN[(startIdx + zhiIdx) % 10]
}

/**
 * 月干：五虎遁（由年干起寅月）。
 * @param yearGan 年干
 * @param monthZhi 月支
 */
export function monthGanFromYear(yearGan: TianGan, monthZhi: DiZhi): TianGan {
  // 甲己之年丙作首，乙庚之岁戊为头，丙辛之位从庚上，丁壬壬位顺行流，戊癸之年何处起，甲寅之上好追求
  const yinStart: Record<TianGan, TianGan> = {
    甲: '丙',
    己: '丙',
    乙: '戊',
    庚: '戊',
    丙: '庚',
    辛: '庚',
    丁: '壬',
    壬: '壬',
    戊: '甲',
    癸: '甲'
  }
  const start = yinStart[yearGan]
  const startIdx = TIANGAN.indexOf(start)
  // 寅=2，相对寅的偏移
  const offset = (DIZHI.indexOf(monthZhi) - 2 + 12) % 12
  return TIANGAN[(startIdx + offset) % 10]
}

/**
 * 组装单柱信息。
 * @param gan 天干
 * @param zhi 地支
 * @param dayMaster 日主；若为本柱日干则标日主
 * @param isDay 是否日柱
 */
function buildPillar(gan: TianGan, zhi: DiZhi, dayMaster: TianGan, isDay: boolean): Pillar {
  return {
    gan,
    zhi,
    gz: gan + zhi,
    ganShiShen: isDay ? '日主' : shishenOf(dayMaster, gan),
    canggan: CANGGAN[zhi].map((g) => ({ gan: g, shiShen: shishenOf(dayMaster, g) }))
  }
}

/**
 * 由公历出生时间排八字。
 * @param year 年
 * @param month 月
 * @param day 日
 * @param hour 时 0-23
 * @param minute 分
 */
export function buildBaZi(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute = 0
): BaZiChart {
  const jd = toJulianDay(year, month, day, hour, minute)
  const { yearGanZhiIndex, monthZhiIndex } = yearMonthFromJd(jd, year)

  const yearGz = JIAZI_60[yearGanZhiIndex]
  const yearGan = yearGz[0] as TianGan
  const yearZhi = yearGz[1] as DiZhi

  const monthZhi = DIZHI[monthZhiIndex]
  const monthGan = monthGanFromYear(yearGan, monthZhi)

  const dayIdx = dayPillarIndex(jd)
  const dayGz = JIAZI_60[dayIdx]
  const dayGan = dayGz[0] as TianGan
  const dayZhi = dayGz[1] as DiZhi

  const hourZhi = hourToZhi(hour)
  const hourGan = hourGanFromDay(dayGan, hourZhi)

  const notes = [
    '年柱以立春为界；月柱以节令为界（近似算法）。',
    '时辰按钟表划分，未校正真太阳时与出生地经度。',
    '「看别人」可对照对方四柱十神，但需对方准确出生时间。'
  ]

  return {
    solar: { year, month, day, hour, minute },
    dayMaster: dayGan,
    dayMasterWuXing: TIANGAN_WUXING[dayGan],
    pillars: {
      year: buildPillar(yearGan, yearZhi, dayGan, false),
      month: buildPillar(monthGan, monthZhi, dayGan, false),
      day: buildPillar(dayGan, dayZhi, dayGan, true),
      hour: buildPillar(hourGan, hourZhi, dayGan, false)
    },
    notes
  }
}

/**
 * 手工输入四柱干支排盘（用于学习对照）。
 * @param pillars 年月日时四组干支
 */
export function buildBaZiFromPillars(
  pillars: [string, string, string, string]
): BaZiChart {
  const parse = (gz: string): { gan: TianGan; zhi: DiZhi } => {
    if (gz.length !== 2) throw new Error(`干支须两字: ${gz}`)
    const gan = gz[0] as TianGan
    const zhi = gz[1] as DiZhi
    if (!TIANGAN.includes(gan) || !DIZHI.includes(zhi)) throw new Error(`非法干支: ${gz}`)
    return { gan, zhi }
  }
  const [y, m, d, h] = pillars.map(parse)
  const dayGan = d.gan
  return {
    solar: { year: 0, month: 0, day: 0, hour: 0, minute: 0 },
    dayMaster: dayGan,
    dayMasterWuXing: TIANGAN_WUXING[dayGan],
    pillars: {
      year: buildPillar(y.gan, y.zhi, dayGan, false),
      month: buildPillar(m.gan, m.zhi, dayGan, false),
      day: buildPillar(d.gan, d.zhi, dayGan, true),
      hour: buildPillar(h.gan, h.zhi, dayGan, false)
    },
    notes: ['手工四柱模式：不校验历法，仅练习十神与藏干。', `地支五行参考：${DIZHI_WUXING[d.zhi]}`]
  }
}
