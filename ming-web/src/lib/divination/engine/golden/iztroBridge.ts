/**
 * iztro 对照桥：与自研盘使用同一公历钟点推导时支序。
 */
import { Solar } from 'lunar-javascript'

/** 十二地支序（与 ziwei/chart、iztro 时辰序对齐） */
export const ZHI_ORDER = [
  '子',
  '丑',
  '寅',
  '卯',
  '辰',
  '巳',
  '午',
  '未',
  '申',
  '酉',
  '戌',
  '亥'
] as const

export type ZhiName = (typeof ZHI_ORDER)[number]

/**
 * 由公历钟点取时支名（与 lunar-javascript 一致）。
 * @param year 公历年
 * @param month 公历月
 * @param day 公历日
 * @param hour 0–23 钟点
 */
export function clockHourToTimeZhi(
  year: number,
  month: number,
  day: number,
  hour: number
): ZhiName {
  const solar = Solar.fromYmdHms(year, month, day, hour, 0, 0)
  const zhi = solar.getLunar().getTimeZhi()
  if (!(ZHI_ORDER as readonly string[]).includes(zhi)) {
    throw new Error(`无法解析时支：${zhi}`)
  }
  return zhi as ZhiName
}

/**
 * iztro `bySolar` 的 timeIndex（0=早子 … 与自研 hourZhiIdx 同序）。
 * @param year 公历年
 * @param month 公历月
 * @param day 公历日
 * @param hour 0–23 钟点
 */
export function iztroTimeIndexFromClockHour(
  year: number,
  month: number,
  day: number,
  hour: number
): number {
  const zhi = clockHourToTimeZhi(year, month, day, hour)
  return Math.max(0, ZHI_ORDER.indexOf(zhi))
}

/**
 * 格式化为 iztro 阳历字符串 `YYYY-M-D`。
 * @param year 年
 * @param month 月
 * @param day 日
 */
export function iztroSolarDateStr(year: number, month: number, day: number): string {
  return `${year}-${month}-${day}`
}

/**
 * 自研性别 → iztro 性别字面量。
 * @param gender 性别
 */
export function iztroGenderLabel(gender: 'male' | 'female'): '男' | '女' {
  return gender === 'male' ? '男' : '女'
}
