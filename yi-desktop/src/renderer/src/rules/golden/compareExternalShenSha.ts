/**
 * 自研神煞 vs mystilight-8char / xuantian-bazi 交叉对照。
 */
import { buildBaZi } from '../bazi/chart'
import { collectShenSha, groupShenShaByPillar } from '../bazi/shensha'
import type { GoldenSolarCase } from './cases'
import { mystilightShenShaNames } from './mystilightBridge'
import { xuantianShenShaNames } from './xuantianBridge'

/** 对照报告 */
export interface ShenShaCompareReport {
  /** 样例说明 */
  label: string
  /** 自研神煞名 */
  ours: string[]
  /** mystilight 神煞名 */
  mystilight: string[]
  /** xuantian 神煞名 */
  xuantian: string[]
  /** 自研与 mystilight 交集 */
  overlapMystilight: string[]
  /** 自研与 xuantian 交集 */
  overlapXuantian: string[]
  /** 自研独有 */
  onlyOurs: string[]
  /** mystilight 独有 */
  onlyMystilight: string[]
  /** xuantian 独有 */
  onlyXuantian: string[]
}

/**
 * 生成三方神煞对照报告。
 * @param c 黄金样例（需有钟点时用全四柱样例）
 */
export function compareShenShaWithExternal(c: GoldenSolarCase): ShenShaCompareReport {
  const chart = buildBaZi(c.year, c.month, c.day, c.hour, c.minute ?? 0, {
    dayCutover: c.dayCutover
  })
  const ours = collectShenSha(chart)
    .map((h) => h.name)
    .sort()
  const mystilight = mystilightShenShaNames(c)
  const xuantian = xuantianShenShaNames(c)
  const overlapMystilight = ours.filter((n) => mystilight.includes(n))
  const overlapXuantian = ours.filter((n) => xuantian.includes(n))
  return {
    label: c.label,
    ours,
    mystilight,
    xuantian,
    overlapMystilight,
    overlapXuantian,
    onlyOurs: ours.filter((n) => !mystilight.includes(n) && !xuantian.includes(n)),
    onlyMystilight: mystilight.filter((n) => !ours.includes(n)),
    onlyXuantian: xuantian.filter((n) => !ours.includes(n))
  }
}

/**
 * 断言自研与 xuantian 在「核心神煞」上高度一致（允许扩展项差异）。
 * @param c 样例
 * @param coreNames 必须三方都命中的神煞
 */
export function assertCoreShenShaMatchesXuantian(
  c: GoldenSolarCase,
  coreNames: string[]
): void {
  const report = compareShenShaWithExternal(c)
  const missing = coreNames.filter((n) => !report.overlapXuantian.includes(n))
  if (missing.length) {
    throw new Error(
      `[${c.label}] 与 xuantian 核心神煞不一致，缺：${missing.join('、')}\n` +
        `  自研 ${report.ours.join('、')}\n` +
        `  xuantian ${report.xuantian.join('、')}`
    )
  }
}

/**
 * 断言 mystilight 与自研在指定神煞上对齐（用于口径接近项）。
 * @param c 样例
 * @param names 应对齐的神煞名
 */
export function assertShenShaMatchesMystilight(c: GoldenSolarCase, names: string[]): void {
  const report = compareShenShaWithExternal(c)
  const missing = names.filter((n) => !report.overlapMystilight.includes(n))
  if (missing.length) {
    throw new Error(
      `[${c.label}] 与 mystilight 不一致，缺：${missing.join('、')}\n` +
        `  自研 ${report.ours.join('、')}\n` +
        `  mystilight ${report.mystilight.join('、')}`
    )
  }
}

/**
 * 调试：打印分柱对照（测试失败时可用）。
 * @param c 样例
 */
export function debugPillarCompare(c: GoldenSolarCase): void {
  const chart = buildBaZi(c.year, c.month, c.day, c.hour, c.minute ?? 0)
  const ours = groupShenShaByPillar(collectShenSha(chart))
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ label: c.label, ours }, null, 2))
}
