/**
 * 八字神煞黄金样例：collectShenSha 与手工核验/通行口诀对照。
 */
import { buildBaZi } from '../bazi/chart'
import { collectShenSha, groupShenShaByPillar } from '../bazi/shensha'
import type { GoldenShenShaCase } from './cases'

/**
 * 断言单盘神煞命中符合黄金样例。
 * @param c 神煞黄金样例
 */
export function assertShenShaGoldenCase(c: GoldenShenShaCase): void {
  const chart = buildBaZi(c.year, c.month, c.day, c.hour, c.minute ?? 0, {
    dayCutover: c.dayCutover
  })
  const hits = collectShenSha(chart)
  const names = hits.map((h) => h.name)
  const missing = c.mustContain.filter((n) => !names.includes(n))
  if (missing.length) {
    throw new Error(
      `[${c.label}] 缺少神煞：${missing.join('、')}\n  得到 ${names.sort().join('、')}`
    )
  }
  for (const bad of c.mustNotContain ?? []) {
    if (names.includes(bad)) {
      throw new Error(`[${c.label}] 不应命中 ${bad}，但仍在结果中`)
    }
  }
  if (c.minByPillar) {
    const by = groupShenShaByPillar(hits)
    for (const [p, min] of Object.entries(c.minByPillar) as Array<
      ['年' | '月' | '日' | '时', number]
    >) {
      if ((by[p]?.length ?? 0) < min) {
        throw new Error(
          `[${c.label}] ${p}柱神煞不足 ${min} 项，实际 ${by[p]?.join('、') ?? '—'}`
        )
      }
    }
  }
  for (const h of hits) {
    if (!h.rule || !h.basis) {
      throw new Error(`[${c.label}] 神煞 ${h.name} 缺少 rule/basis`)
    }
  }
}
