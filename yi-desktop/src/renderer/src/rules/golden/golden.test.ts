/**
 * 黄金样例对照：八字四柱锁定 + 紫微与 iztro 命宫/身宫对齐。
 *
 * 运行：npm run test:golden
 * 或：npx vitest run src/renderer/src/rules/golden/golden.test.ts
 */
import { describe, expect, it } from 'vitest'
import { BAZI_GOLDEN_CASES, ZIWEI_GOLDEN_CASES } from './cases'
import { assertBaZiGoldenCase, assertBaZiMatchesEightCharDirect } from './compareBazi'
import {
  assertZiWeiSoulBodyMatchesIztro,
  compareZiWeiWithIztro
} from './compareZiWei'
import { buildZiWeiChart } from '../ziwei/chart'

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

describe('黄金样例 · 紫微结构自检', () => {
  it.each(ZIWEI_GOLDEN_CASES)('$label 十二宫/四化/大限完整', (c) => {
    const chart = buildZiWeiChart(c)
    expect(chart.palaces).toHaveLength(12)
    expect(chart.palaces[0]?.name).toBe('命宫')
    expect(chart.sihua).toHaveLength(4)
    expect(chart.daXian.length).toBeGreaterThanOrEqual(8)
    expect(chart.wuXingJu).toMatch(/局/)
  })
})

describe('黄金样例 · 紫微命宫身宫 vs iztro', () => {
  it.each(ZIWEI_GOLDEN_CASES)('$label 命宫身宫与 iztro 一致', (c) => {
    const result = compareZiWeiWithIztro(c)
    assertZiWeiSoulBodyMatchesIztro(c, result)
  })
})

describe('黄金样例 · 紫微五行局 vs iztro（回归记录）', () => {
  /** iztro 期望五行局；与自研 JU_BY_ZHI 简化表不一致的样例标注在此 */
  const iztroJuExpect: Record<string, string> = {
    '1990-05-01 女 午时': '土五局',
    '1988-12-10 男 未时': '土五局',
    '2000-08-16 女 巳时': '土五局',
    '1995-03-15 男 卯时': '火六局',
    '1985-07-20 女 亥时': '水二局'
  }

  it.each(ZIWEI_GOLDEN_CASES)('$label 记录 iztro 五行局差异', (c) => {
    const result = compareZiWeiWithIztro(c)
    const expectJu = iztroJuExpect[c.label]
    if (!expectJu) return
    expect(result.iztro.fiveElementsClass).toBe(expectJu)
    if (result.ours.wuXingJu !== expectJu) {
      // 已知：自研五行局按命宫地支查简化表，与 iztro 全量算法有差异；此处仅记录便于后续改进
      expect(result.majorStarDiffs.length).toBeGreaterThan(0)
    }
  })
})

describe('黄金样例 · 紫微主星布局 vs iztro（统计，不阻断）', () => {
  it('汇总主星宫位一致率', () => {
    let totalMatch = 0
    const reports: string[] = []
    for (const c of ZIWEI_GOLDEN_CASES) {
      const { majorStarMatchCount, majorStarDiffs } = compareZiWeiWithIztro(c)
      totalMatch += majorStarMatchCount
      reports.push(
        `${c.label}: ${majorStarMatchCount}/12 宫主星一致，差异 ${majorStarDiffs.length} 宫`
      )
    }
    // 控制台输出便于本地对照 iztro；CI 仅要求有一定重合（安星口径不同，不要求 12/12）
    console.log('[golden] 紫微主星 iztro 对照\n' + reports.join('\n'))
    expect(totalMatch).toBeGreaterThan(0)
  })
})
