/**
 * 黄金样例对照：八字四柱锁定 + 紫微与 iztro 对齐（命宫/身宫/五行局/主星）。
 *
 * 运行：npm run test:golden
 * 或：npx vitest run src/renderer/src/rules/golden/golden.test.ts
 */
import { describe, expect, it } from 'vitest'
import { BAZI_GOLDEN_CASES, ZIWEI_GOLDEN_CASES } from './cases'
import { assertBaZiGoldenCase, assertBaZiMatchesEightCharDirect } from './compareBazi'
import {
  assertZiWeiMajorStarsMatchIztro,
  assertZiWeiSoulBodyMatchesIztro,
  compareZiWeiWithIztro
} from './compareZiWei'
import { buildZiWeiChart, calcTianFuIndex, calcWuXingJu, calcZiWeiIndex } from '../ziwei/chart'

describe('黄金样例 · 八字四柱', () => {
  it.each(BAZI_GOLDEN_CASES)('$label 与期望四柱一致', (c) => {
    assertBaZiGoldenCase(c)
  })

  it.each(BAZI_GOLDEN_CASES.filter((c) => c.hour !== null))(
    '$label buildBaZi 与 EightChar 直取一致',
    (c) => {
      assertBaZiMatchesEightCharDirect(c)
    }
  )
})

describe('黄金样例 · 紫微单元算法', () => {
  it('丁亥命宫 → 土五局', () => {
    expect(calcWuXingJu('丁', '亥')).toBe('土五局')
  })

  it('局数除日数：7 日土五局 → 紫微在子', () => {
    // 对齐 iztro 例：初七土五局，紫微安子
    expect(calcZiWeiIndex(7, 5)).toBe(0) // 子
    expect(calcTianFuIndex(0)).toBe(4) // 辰
  })

  it('口诀例：27 日木三局 → 紫微在戌', () => {
    // 寅起 9 格到戌；子序戌=10
    expect(calcZiWeiIndex(27, 3)).toBe(10)
  })

  it('口诀例：13 日火六局 → 紫微在亥', () => {
    expect(calcZiWeiIndex(13, 6)).toBe(11)
  })

  it('口诀例：6 日土五局 → 紫微在未', () => {
    expect(calcZiWeiIndex(6, 5)).toBe(7)
  })
})

describe('黄金样例 · 紫微结构自检', () => {
  it.each(ZIWEI_GOLDEN_CASES)('$label 十二宫/四化/大限完整', (c) => {
    const chart = buildZiWeiChart(c)
    expect(chart.palaces).toHaveLength(12)
    expect(chart.palaces[0]?.name).toBe('命宫')
    expect(chart.sihua).toHaveLength(4)
    expect(chart.daXian.length).toBeGreaterThanOrEqual(8)
    expect(chart.wuXingJu).toBe(c.expectIztro.wuXingJu)
  })
})

describe('黄金样例 · 紫微 vs iztro（命宫身宫五行局）', () => {
  it.each(ZIWEI_GOLDEN_CASES)('$label 命宫身宫五行局与 iztro 一致', (c) => {
    const result = compareZiWeiWithIztro(c)
    assertZiWeiSoulBodyMatchesIztro(c, result)
  })
})

describe('黄金样例 · 紫微 vs iztro（十四主星布局）', () => {
  it.each(ZIWEI_GOLDEN_CASES)('$label 主星十二宫与 iztro 一致', (c) => {
    const result = compareZiWeiWithIztro(c)
    assertZiWeiMajorStarsMatchIztro(c, result)
  })
})
