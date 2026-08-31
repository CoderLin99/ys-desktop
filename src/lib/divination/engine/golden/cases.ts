import { Solar } from 'lunar-javascript'
import { buildBaZi, type BaZiChart, type DayCutover } from '../bazi/chart'

/** 黄金样例：公历输入 */
export interface GoldenSolarCase {
  /** 用例说明 */
  label: string
  /** 公历年 */
  year: number
  /** 公历月 */
  month: number
  /** 公历日 */
  day: number
  /** 0–23；null 表示时辰未知（三柱） */
  hour: number | null
  /** 分；默认 0 */
  minute?: number
  /** 晚子换日口径 */
  dayCutover?: DayCutover
  /** 期望四柱干支 */
  expected: {
    year: string
    month: string
    day: string
    /** 空字符串表示无时柱 */
    hour: string
  }
}

/**
 * 八字黄金样例：柱干支来自节气历对照（lunar-javascript / 手工核验）。
 * 新增样例时请同时跑 buildBaZi 与外部排盘工具核对。
 */
/** 神煞黄金样例（通行口诀 + 修复回归） */
export interface GoldenShenShaCase extends GoldenSolarCase {
  /** 必须命中的神煞名 */
  mustContain: string[]
  /** 修复后不应误报的神煞 */
  mustNotContain?: string[]
  /** 分柱最少项数 */
  minByPillar?: Partial<Record<'年' | '月' | '日' | '时', number>>
}

export const BAZI_GOLDEN_CASES: GoldenSolarCase[] = [
  {
    label: '1999-06-29 小暑前午月',
    year: 1999,
    month: 6,
    day: 29,
    hour: 7,
    minute: 20,
    expected: { year: '己卯', month: '庚午', day: '壬子', hour: '甲辰' }
  },
  {
    label: '1999-01-10 三柱',
    year: 1999,
    month: 1,
    day: 10,
    hour: null,
    expected: { year: '戊寅', month: '乙丑', day: '壬戌', hour: '' }
  },
  {
    label: '1990-05-20 未时',
    year: 1990,
    month: 5,
    day: 20,
    hour: 14,
    minute: 30,
    expected: { year: '庚午', month: '辛巳', day: '乙酉', hour: '癸未' }
  },
  {
    label: '2000-01-01 正午',
    year: 2000,
    month: 1,
    day: 1,
    hour: 12,
    expected: { year: '己卯', month: '丙子', day: '戊午', hour: '戊午' }
  },
  {
    label: '1988-12-10 未时',
    year: 1988,
    month: 12,
    day: 10,
    hour: 14,
    minute: 10,
    expected: { year: '戊辰', month: '甲子', day: '己亥', hour: '辛未' }
  },
  {
    label: '2024-02-04 立春当日午时（年柱仍属癸卯）',
    year: 2024,
    month: 2,
    day: 4,
    hour: 11,
    expected: { year: '癸卯', month: '乙丑', day: '戊戌', hour: '戊午' }
  }
]

/**
 * 神煞黄金样例：mustContain 来自修复后 collectShenSha 与通行表核对。
 * mustNotContain 用于锁定已知误报回归（如子月天德、学堂误用文昌表）。
 */
export const BAZI_SHENSHA_GOLDEN_CASES: GoldenShenShaCase[] = [
  {
    label: '1999-01-10 三柱 · 壬日丑月',
    year: 1999,
    month: 1,
    day: 10,
    hour: null,
    expected: { year: '戊寅', month: '乙丑', day: '壬戌', hour: '' },
    mustContain: [
      '文昌',
      '天厨',
      '寡宿',
      '华盖',
      '阴差阳错',
      '天乙贵人',
      '金舆',
      '红鸾',
      '天德合',
      '月德合'
    ],
    mustNotContain: ['学堂', '词馆', '天德']
  },
  {
    label: '1999-06-29 午月 · 壬子日',
    year: 1999,
    month: 6,
    day: 29,
    hour: 7,
    minute: 20,
    expected: { year: '己卯', month: '庚午', day: '壬子', hour: '甲辰' },
    mustContain: [
      '天喜',
      '勾煞',
      '飞刃',
      '红艳煞',
      '禄神',
      '将星',
      '天乙贵人',
      '羊刃',
      '孤鸾煞',
      '九丑日'
    ],
    minByPillar: { 月: 2, 日: 3 }
  },
  {
    label: '1990-05-20 巳月 · 乙日',
    year: 1990,
    month: 5,
    day: 20,
    hour: 14,
    minute: 30,
    expected: { year: '庚午', month: '辛巳', day: '乙酉', hour: '癸未' },
    mustContain: ['天德', '月德', '学堂', '文昌', '天乙贵人', '将星'],
    mustNotContain: ['词馆']
  },
  {
    label: '2000-01-01 子月 · 戊日',
    year: 2000,
    month: 1,
    day: 1,
    hour: 12,
    expected: { year: '己卯', month: '丙子', day: '戊午', hour: '戊午' },
    mustContain: ['天乙贵人', '禄神', '将星', '桃花', '羊刃'],
    mustNotContain: ['天德', '天德合']
  },
  {
    label: '1988-12-10 子月 · 己日',
    year: 1988,
    month: 12,
    day: 10,
    hour: 14,
    minute: 10,
    expected: { year: '戊辰', month: '甲子', day: '己亥', hour: '辛未' },
    mustContain: ['天乙贵人', '天医', '华盖', '红鸾', '亡神'],
    mustNotContain: ['天德', '天德合']
  },
  {
    label: '2024-02-04 丑月 · 魁罡日',
    year: 2024,
    month: 2,
    day: 4,
    hour: 11,
    expected: { year: '癸卯', month: '乙丑', day: '戊戌', hour: '戊午' },
    mustContain: ['魁罡', '十恶大败', '天德合', '月德合', '寡宿', '华盖'],
    mustNotContain: ['天德']
  }
]

/** 紫微 / iztro 对照用公历样例 */
export interface GoldenZiWeiCase {
  /** 说明 */
  label: string
  year: number
  month: number
  day: number
  hour: number
  gender: 'male' | 'female'
  /** 与 iztro 应对齐的命宫、身宫、五行局 */
  expectIztro: { mingZhi: string; shenZhi: string; wuXingJu: string }
}

export const ZIWEI_GOLDEN_CASES: GoldenZiWeiCase[] = [
  {
    label: '1990-05-01 女 午时',
    year: 1990,
    month: 5,
    day: 1,
    hour: 12,
    gender: 'female',
    expectIztro: { mingZhi: '亥', shenZhi: '亥', wuXingJu: '土五局' }
  },
  {
    label: '1988-12-10 男 未时',
    year: 1988,
    month: 12,
    day: 10,
    hour: 14,
    gender: 'male',
    expectIztro: { mingZhi: '巳', shenZhi: '未', wuXingJu: '土五局' }
  },
  {
    label: '2000-08-16 女 巳时',
    year: 2000,
    month: 8,
    day: 16,
    hour: 10,
    gender: 'female',
    expectIztro: { mingZhi: '卯', shenZhi: '丑', wuXingJu: '土五局' }
  },
  {
    label: '1995-03-15 男 卯时',
    year: 1995,
    month: 3,
    day: 15,
    hour: 6,
    gender: 'male',
    expectIztro: { mingZhi: '子', shenZhi: '午', wuXingJu: '火六局' }
  },
  {
    label: '1985-07-20 女 亥时',
    year: 1985,
    month: 7,
    day: 20,
    hour: 22,
    gender: 'female',
    expectIztro: { mingZhi: '申', shenZhi: '午', wuXingJu: '水二局' }
  }
]

/**
 * 用 lunar-javascript EightChar 直接取四柱（对照 buildBaZi 的内部参照）。
 * @param year 年
 * @param month 月
 * @param day 日
 * @param hour 时
 * @param minute 分
 * @param dayCutover 换日口径
 */
export function eightCharPillarsFromSolar(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  dayCutover: DayCutover = 'ziZheng'
): { year: string; month: string; day: string; hour: string } {
  const solar = Solar.fromYmdHms(year, month, day, hour, minute, 0)
  const eight = solar.getLunar().getEightChar()
  eight.setSect?.(dayCutover === 'ziChu' ? 1 : 2)
  return {
    year: eight.getYear(),
    month: eight.getMonth(),
    day: eight.getDay(),
    hour: eight.getTime()
  }
}

/**
 * 提取 buildBaZi 的四柱字符串。
 * @param chart 八字盘
 */
export function pillarGzFromChart(chart: BaZiChart): {
  year: string
  month: string
  day: string
  hour: string
} {
  return {
    year: chart.pillars.year.gz,
    month: chart.pillars.month.gz,
    day: chart.pillars.day.gz,
    hour: chart.pillars.hour?.gz ?? ''
  }
}
