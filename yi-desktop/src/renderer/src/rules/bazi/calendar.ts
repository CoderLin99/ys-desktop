/**
 * 公历 / 农历互转（依赖 lunar-javascript）。
 * 农历闰月用负数月份表示（与库约定一致，如闰四月 = -4）。
 */
import { Lunar, LunarMonth, LunarYear, Solar } from 'lunar-javascript'

/** 农历日期 */
export interface LunarDate {
  year: number
  /** 1..12；闰月为负，如闰四月 = -4 */
  month: number
  day: number
}

/** 公历日期 */
export interface SolarDate {
  year: number
  month: number
  day: number
}

/**
 * 公历 → 农历。
 * @param y 年
 * @param m 月 1-12
 * @param d 日
 */
export function solarToLunar(y: number, m: number, d: number): LunarDate & { text: string } {
  const lunar = Solar.fromYmd(y, m, d).getLunar()
  return {
    year: lunar.getYear(),
    month: lunar.getMonth(),
    day: lunar.getDay(),
    text: lunar.toString()
  }
}

/**
 * 农历 → 公历。
 * @param y 农历年
 * @param m 农历月（闰月传负数）
 * @param d 农历日
 */
export function lunarToSolar(y: number, m: number, d: number): SolarDate & { text: string } {
  const solar = Lunar.fromYmd(y, m, d).getSolar()
  return {
    year: solar.getYear(),
    month: solar.getMonth(),
    day: solar.getDay(),
    text: `${solar.getYear()}-${String(solar.getMonth()).padStart(2, '0')}-${String(solar.getDay()).padStart(2, '0')}`
  }
}

/**
 * 当年农历可选月份列表（含闰月）。
 * @param year 农历年
 */
export function lunarMonthsOfYear(year: number): { value: number; label: string }[] {
  const leapMonth = LunarYear.fromYear(year).getLeapMonth()
  const list: { value: number; label: string }[] = []
  for (let m = 1; m <= 12; m++) {
    list.push({ value: m, label: `${m}月` })
    if (leapMonth === m) {
      list.push({ value: -m, label: `闰${m}月` })
    }
  }
  return list
}

/**
 * 农历某月天数。
 * @param year 农历年
 * @param month 农历月（可为负）
 */
export function lunarMonthDays(year: number, month: number): number {
  return LunarMonth.fromYm(year, month).getDayCount()
}

/**
 * 格式化农历展示。
 * @param lunar 农历
 */
export function formatLunarText(lunar: LunarDate): string {
  try {
    return Lunar.fromYmd(lunar.year, lunar.month, lunar.day).toString()
  } catch {
    const m = lunar.month < 0 ? `闰${-lunar.month}` : String(lunar.month)
    return `${lunar.year}年${m}月${lunar.day}日`
  }
}
