/**
 * 八字黄金样例：buildBaZi 与 lunar-javascript EightChar 交叉校验。
 */
import { buildBaZi } from '../bazi/chart'
import {
  BAZI_GOLDEN_CASES,
  eightCharPillarsFromSolar,
  pillarGzFromChart,
  type GoldenSolarCase
} from './cases'

/**
 * 断言 buildBaZi 与样例期望四柱一致。
 * @param c 黄金样例
 */
export function assertBaZiGoldenCase(c: GoldenSolarCase): void {
  const chart = buildBaZi(c.year, c.month, c.day, c.hour, c.minute ?? 0, {
    dayCutover: c.dayCutover
  })
  const got = pillarGzFromChart(chart)
  if (JSON.stringify(got) !== JSON.stringify(c.expected)) {
    throw new Error(
      `[${c.label}] 四柱不符\n  得到 ${JSON.stringify(got)}\n  期望 ${JSON.stringify(c.expected)}`
    )
  }
}

/**
 * 断言 buildBaZi 与 lunar-javascript 直接取柱一致（有钟点时）。
 * @param c 黄金样例
 */
export function assertBaZiMatchesEightCharDirect(c: GoldenSolarCase): void {
  if (c.hour === null) return
  const direct = eightCharPillarsFromSolar(
    c.year,
    c.month,
    c.day,
    c.hour,
    c.minute ?? 0,
    c.dayCutover ?? 'ziZheng'
  )
  const fromBuild = pillarGzFromChart(
    buildBaZi(c.year, c.month, c.day, c.hour, c.minute ?? 0, {
      dayCutover: c.dayCutover
    })
  )
  if (JSON.stringify(fromBuild) !== JSON.stringify(direct)) {
    throw new Error(
      `[${c.label}] buildBaZi 与 EightChar 直取不一致\n  build ${JSON.stringify(fromBuild)}\n  direct ${JSON.stringify(direct)}`
    )
  }
}
