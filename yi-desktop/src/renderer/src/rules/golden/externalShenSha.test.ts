/**
 * 三方神煞对照测试（自研 vs xuantian-bazi / mystilight-8char）。
 *
 * 口径说明：三方库流派/覆盖范围不同，测试断言「核心交集」而非完全一致。
 */
import { describe, expect, it } from 'vitest'
import { BAZI_GOLDEN_CASES } from './cases'
import { compareShenShaWithExternal } from './compareExternalShenSha'

/** 各样例与 xuantian 应对齐的核心神煞（经手工对照） */
const XUANTIAN_CORE: Record<string, string[]> = {
  '1999-06-29 小暑前午月': [
    '天乙贵人',
    '桃花',
    '羊刃',
    '红鸾',
    '天喜',
    '勾煞',
    '飞刃',
    '红艳煞',
    '华盖',
    '太极贵人',
    '福星贵人',
    '孤鸾煞',
    '九丑日',
    '空亡'
  ],
  '1990-05-20 未时': [
    '天乙贵人',
    '桃花',
    '红鸾',
    '勾煞',
    '亡神',
    '天德',
    '月德',
    '文昌',
    '太极贵人',
    '福星贵人',
    '空亡',
    '金舆'
  ],
  '2000-01-01 正午': [
    '天乙贵人',
    '桃花',
    '羊刃',
    '红鸾',
    '天喜',
    '勾煞',
    '飞刃',
    '九丑日',
    '孤鸾煞',
    '将星',
    '空亡',
    '血刃'
  ],
  '1988-12-10 未时': [
    '天乙贵人',
    '桃花',
    '红鸾',
    '勾煞',
    '亡神',
    '华盖',
    '太极贵人',
    '福星贵人',
    '红艳煞',
    '天医',
    '飞刃',
    '空亡',
    '金舆'
  ],
  '2024-02-04 立春当日午时（年柱仍属癸卯）': [
    '天乙贵人',
    '桃花',
    '天喜',
    '勾煞',
    '羊刃',
    '魁罡',
    '十恶大败',
    '天德合',
    '月德合',
    '文昌',
    '太极贵人',
    '福星贵人'
  ]
}

/** 与 mystilight 应对齐的基础项 */
const MYSTILIGHT_CORE: Record<string, string[]> = {
  '1999-06-29 小暑前午月': [
    '天乙贵人',
    '桃花',
    '羊刃',
    '红鸾',
    '天喜',
    '华盖',
    '太极贵人',
    '福星贵人',
    '红艳煞',
    '孤鸾煞',
    '九丑日',
    '空亡',
    '飞刃',
    '血刃'
  ],
  '1990-05-20 未时': [
    '天乙贵人',
    '桃花',
    '红鸾',
    '勾煞',
    '亡神',
    '天德',
    '月德',
    '文昌',
    '太极贵人',
    '福星贵人',
    '空亡',
    '金舆',
    '学堂'
  ],
  '2000-01-01 正午': [
    '天乙贵人',
    '桃花',
    '羊刃',
    '红鸾',
    '天喜',
    '孤鸾煞',
    '九丑日',
    '将星',
    '空亡',
    '飞刃',
    '血刃'
  ],
  '1988-12-10 未时': [
    '天乙贵人',
    '桃花',
    '红鸾',
    '勾煞',
    '亡神',
    '华盖',
    '太极贵人',
    '福星贵人',
    '红艳煞',
    '天医',
    '空亡',
    '金舆'
  ],
  '2024-02-04 立春当日午时（年柱仍属癸卯）': [
    '天乙贵人',
    '桃花',
    '天喜',
    '羊刃',
    '魁罡',
    '十恶大败',
    '天德合',
    '月德合',
    '文昌',
    '太极贵人',
    '福星贵人'
  ]
}

describe('神煞 · 对照 xuantian / mystilight', () => {
  const fullCases = BAZI_GOLDEN_CASES.filter((c) => c.hour !== null)

  it.each(fullCases)('$label 与 xuantian 核心交集', (c) => {
    const core = XUANTIAN_CORE[c.label]
    expect(core, `未配置 ${c.label} 的 xuantian 对照表`).toBeDefined()
    const report = compareShenShaWithExternal(c)
    for (const name of core!) {
      expect(report.overlapXuantian, `缺少 ${name}`).toContain(name)
    }
    /** 主样例 1999-06-29：与 xuantian 交集应 ≥14 项 */
    if (c.label.includes('1999-06-29')) {
      expect(report.overlapXuantian.length).toBeGreaterThanOrEqual(14)
    }
  })

  it.each(fullCases)('$label 与 mystilight 核心交集', (c) => {
    const core = MYSTILIGHT_CORE[c.label]
    expect(core, `未配置 ${c.label} 的 mystilight 对照表`).toBeDefined()
    const report = compareShenShaWithExternal(c)
    for (const name of core!) {
      expect(report.overlapMystilight, `缺少 ${name}`).toContain(name)
    }
  })

  it('1999-06-29 对照摘要：自研更全；三方均含童子煞但落柱口径可能不同', () => {
    const c = fullCases.find((x) => x.label.includes('1999-06-29'))!
    const r = compareShenShaWithExternal(c)
    expect(r.onlyOurs).toEqual(
      expect.arrayContaining(['禄神', '将星', '灾煞', '绞煞', '地网'])
    )
    expect(r.onlyMystilight).toEqual(expect.arrayContaining(['词馆']))
    expect(r.ours).toContain('童子煞')
    expect(r.xuantian).toContain('童子煞')
    expect(r.mystilight).toContain('童子煞')
  })
})
