/**
 * 八字排盘核心。
 *
 * 规则归纳：
 * - 年柱：以立春为界（非春节）
 * - 月柱：以「节」为界（寅月起于立春）
 * - 日柱：连续六十甲子
 * - 时柱：日干起时辰，五鼠遁；时辰未知时可排三柱，并对照十二时辰
 *
 * 年月日时柱统一由 lunar-javascript（节气历）排出，避免自研近似节气导致月柱错位。
 */
import { Solar } from 'lunar-javascript'
import {
  CANGGAN_WEIGHT,
  DIZHI,
  TIANGAN,
  TIANGAN_WUXING,
  DIZHI_WUXING,
  type CangGanRole,
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
  /** 藏干及十神（含本气中气余气权重） */
  canggan: { gan: TianGan; shiShen: ShiShen; role: CangGanRole; weight: number }[]
}

/** 公历输入；hour 为 null 表示时辰未知（三柱盘） */
export interface SolarInput {
  year: number
  month: number
  day: number
  /** 0-23；null = 未知时辰 */
  hour: number | null
  minute: number
}

/** 完整八字盘 */
export interface BaZiChart {
  /** 输入公历 */
  solar: SolarInput
  pillars: {
    year: Pillar
    month: Pillar
    day: Pillar
    /** 时辰未知时为 null */
    hour: Pillar | null
  }
  /** 是否缺时辰（三柱模式） */
  hourUnknown: boolean
  /** 日主 */
  dayMaster: TianGan
  /** 日主五行 */
  dayMasterWuXing: string
  /** 提示 */
  notes: string[]
}

/** 十二时辰对照中的一条 */
export interface HourVariant {
  /** 时支 */
  zhi: DiZhi
  /** 时柱 */
  pillar: Pillar
  /** 教学用代表钟点（该时辰中段） */
  clockHour: number
}

/**
 * 日柱换日口径（晚子时 23:00–00:00）。
 * - ziChu：子初换日（23:00 起算次日日柱），对应 lunar-javascript EightChar sect=1
 * - ziZheng：晚子不换（至 00:00 才换日），对应 sect=2（库默认）
 */
export type DayCutover = 'ziChu' | 'ziZheng'

/** 换日口径 UI 选项 */
export const DAY_CUTOVER_OPTIONS: { label: string; value: DayCutover; hint: string }[] = [
  { label: '子初换日', value: 'ziChu', hint: '23:00 起日柱算次日' },
  { label: '晚子不换', value: 'ziZheng', hint: '至 00:00 才换日柱' }
]

/**
 * 换日口径 → lunar-javascript EightChar.setSect 取值。
 * @param cutover 换日口径
 */
export function dayCutoverToSect(cutover: DayCutover): 1 | 2 {
  return cutover === 'ziChu' ? 1 : 2
}

/** buildBaZi 可选参数 */
export interface BuildBaZiOptions {
  /** 日柱换日口径；缺省晚子不换（与库默认一致） */
  dayCutover?: DayCutover
}

/**
 * 各时辰用于对照排盘的代表钟点（时辰中段近似）。
 * 子时用 0 点代表（23–1）。
 */
export const HOUR_ZHI_CLOCK: Record<DiZhi, number> = {
  子: 0,
  丑: 1,
  寅: 3,
  卯: 5,
  辰: 7,
  巳: 9,
  午: 11,
  未: 13,
  申: 15,
  酉: 17,
  戌: 19,
  亥: 21
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
  // 粗略：世纪数
  const centuries = (Y - 2000) / 100
  // 春分约 JD，再按 15° 节气偏移（年均约 365.2422/24 天）
  const vernal = 2451623.80984 + 365.24236 * (Y - 2000) + 0.0167 * centuries * centuries
  // termIndex=0 小寒约在春分前；春分 = 黄经 0°，对应 termIndex 6（春分）
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
  const points: { jd: number; monthZhi: number }[] = []
  for (const y of [yearForStem - 1, yearForStem, yearForStem + 1]) {
    JIE_TERM_INDEX.forEach((term, i) => {
      const actualYear = term === 0 ? y + 1 : y
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
export function buildPillar(gan: TianGan, zhi: DiZhi, dayMaster: TianGan, isDay: boolean): Pillar {
  return {
    gan,
    zhi,
    gz: gan + zhi,
    ganShiShen: isDay ? '日主' : shishenOf(dayMaster, gan),
    canggan: CANGGAN_WEIGHT[zhi].map((c) => ({
      gan: c.gan,
      shiShen: shishenOf(dayMaster, c.gan),
      role: c.role,
      weight: c.weight
    }))
  }
}

/**
 * 由公历出生时间排八字。
 * 年/月柱按真实节气（立春、惊蛰…小暑等）划分，与主流排盘一致。
 * @param year 年
 * @param month 月
 * @param day 日
 * @param hour 时 0-23；传 null / undefined 表示时辰未知（三柱）
 * @param minute 分（时辰未知时忽略）
 * @param options 换日口径等
 */
export function buildBaZi(
  year: number,
  month: number,
  day: number,
  hour?: number | null,
  minute = 0,
  options: BuildBaZiOptions = {}
): BaZiChart {
  const hourUnknown = hour === null || hour === undefined
  // 缺时辰时用正午锚定年月日柱，避免跨日子时边界抖动
  const useHour = hourUnknown ? 12 : hour
  const useMinute = hourUnknown ? 0 : minute
  const dayCutover: DayCutover = options.dayCutover ?? 'ziZheng'

  const solar = Solar.fromYmdHms(year, month, day, useHour, useMinute, 0)
  const eight = solar.getLunar().getEightChar()
  // 晚子时日柱：sect1=子初换日，sect2=晚子不换
  eight.setSect?.(dayCutoverToSect(dayCutover))

  const yearGz = eight.getYear()
  const monthGz = eight.getMonth()
  const dayGz = eight.getDay()
  const yearGan = yearGz[0] as TianGan
  const yearZhi = yearGz[1] as DiZhi
  const monthGan = monthGz[0] as TianGan
  const monthZhi = monthGz[1] as DiZhi
  const dayGan = dayGz[0] as TianGan
  const dayZhi = dayGz[1] as DiZhi

  let hourPillar: Pillar | null = null
  if (!hourUnknown) {
    // 时支取自库；时干按「当日日干 × 五鼠遁」自算。
    // lunar-javascript 在晚子不换（sect=2）时：日柱仍是当日，时干却按次日干遁
    //（例：2000-01-01 23:00 日戊午、库给甲子；正统戊日子时为壬子），与十二时辰对照表不一致。
    const timeGzLib = eight.getTime()
    const hourZhi = timeGzLib[1] as DiZhi
    const hourGan = hourGanFromDay(dayGan, hourZhi)
    hourPillar = buildPillar(hourGan, hourZhi, dayGan, false)
  }

  const cutoverNote =
    dayCutover === 'ziChu'
      ? '日柱换日：子初换日（23:00 起算次日）。'
      : '日柱换日：晚子不换（至 00:00 才换日）。'
  const notes = [
    '年柱以立春为界；月柱以节令为界（节气历，与农历月份无关）。',
    cutoverNote,
    hourUnknown
      ? '时辰未知：仅排年月日三柱；强弱与部分神煞精度下降，可对照下方十二时辰。'
      : '时辰按钟表划分；若已开真太阳时，请以校正后的钟点为准。',
    '「看别人」可对照对方四柱十神，但需对方准确出生时间。'
  ]

  return {
    solar: { year, month, day, hour: hourUnknown ? null : useHour, minute: useMinute },
    hourUnknown,
    dayMaster: dayGan,
    dayMasterWuXing: TIANGAN_WUXING[dayGan],
    pillars: {
      year: buildPillar(yearGan, yearZhi, dayGan, false),
      month: buildPillar(monthGan, monthZhi, dayGan, false),
      day: buildPillar(dayGan, dayZhi, dayGan, true),
      hour: hourPillar
    },
    notes
  }
}

/**
 * 对已知日干排出十二时辰时柱（缺时辰对照用）。
 * @param dayGan 日干
 */
export function buildHourVariants(dayGan: TianGan): HourVariant[] {
  return DIZHI.map((zhi) => {
    const gan = hourGanFromDay(dayGan, zhi)
    return {
      zhi,
      clockHour: HOUR_ZHI_CLOCK[zhi],
      pillar: buildPillar(gan, zhi, dayGan, false)
    }
  })
}

/**
 * 手工输入干支排盘。
 * @param pillars 年月日时；时柱传空字符串表示未知
 */
export function buildBaZiFromPillars(
  pillars: [string, string, string, string | '']
): BaZiChart {
  const parse = (gz: string): { gan: TianGan; zhi: DiZhi } => {
    if (gz.length !== 2) throw new Error(`干支须两字: ${gz}`)
    const gan = gz[0] as TianGan
    const zhi = gz[1] as DiZhi
    if (!TIANGAN.includes(gan) || !DIZHI.includes(zhi)) throw new Error(`非法干支: ${gz}`)
    return { gan, zhi }
  }
  const y = parse(pillars[0])
  const m = parse(pillars[1])
  const d = parse(pillars[2])
  const hourRaw = pillars[3]?.trim() ?? ''
  const hourUnknown = hourRaw === ''
  const h = hourUnknown ? null : parse(hourRaw)
  const dayGan = d.gan
  return {
    solar: { year: 0, month: 0, day: 0, hour: null, minute: 0 },
    hourUnknown,
    dayMaster: dayGan,
    dayMasterWuXing: TIANGAN_WUXING[dayGan],
    pillars: {
      year: buildPillar(y.gan, y.zhi, dayGan, false),
      month: buildPillar(m.gan, m.zhi, dayGan, false),
      day: buildPillar(d.gan, d.zhi, dayGan, true),
      hour: h ? buildPillar(h.gan, h.zhi, dayGan, false) : null
    },
    notes: [
      hourUnknown
        ? '手工三柱模式：时柱未知，仅练习年月日元与十神。'
        : '手工四柱模式：不校验历法，仅练习十神与藏干。',
      `地支五行参考：${DIZHI_WUXING[d.zhi]}`
    ]
  }
}
