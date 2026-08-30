/**
 * mystilight-8char 神煞桥接（仅测试层对照，不进入生产 bundle）。
 */
import paipan from 'mystilight-8char'
import type { GoldenSolarCase } from './cases'

/**  mystilight 柱键 → 中文柱名 */
const PILLAR_KEY: Record<string, '年' | '月' | '日' | '时'> = {
  nian: '年',
  yue: '月',
  ri: '日',
  shi: '时'
}

/**
 * 将 mystilight 神煞标签归一化为自研引擎名称。
 * @param raw mystilight 原始标签，如「天乙贵人(日)」
 */
export function normalizeMystilightShenShaName(raw: string): string {
  return raw
    .replace(/\(日\)|\(年\)|\(月\)|\(时\)/g, '')
    .replace(/勾绞煞/g, '勾煞')
    .replace(/文昌贵人/g, '文昌')
    .replace(/天厨贵人/g, '天厨')
    .replace(/国印贵人/g, '国印')
    .replace(/月德贵人/g, '月德')
    .replace(/天德贵人/g, '天德')
    .replace(/魁罡日/g, '魁罡')
    .replace(/孤鸾(?!煞)/g, '孤鸾煞')
    .trim()
}

/**
 * 从 mystilight 结果提取神煞名集合（去重）。
 * @param c 公历样例
 */
export function mystilightShenShaNames(c: GoldenSolarCase): string[] {
  const r = paipan.getCurrentEightCharJSON({
    year: c.year,
    month: c.month,
    day: c.day,
    hour: c.hour ?? 0,
    minute: c.minute ?? 0,
    sect: 2,
    gender: 1
  })
  const shensha = (r as { shensha?: Record<string, string[]> }).shensha ?? {}
  const names = new Set<string>()
  for (const key of Object.keys(PILLAR_KEY)) {
    for (const raw of shensha[key] ?? []) {
      names.add(normalizeMystilightShenShaName(raw))
    }
  }
  return [...names].sort()
}

/**
 *  mystilight 分柱神煞（归一化后）。
 * @param c 公历样例
 */
export function mystilightShenShaByPillar(
  c: GoldenSolarCase
): Record<'年' | '月' | '日' | '时', string[]> {
  const r = paipan.getCurrentEightCharJSON({
    year: c.year,
    month: c.month,
    day: c.day,
    hour: c.hour ?? 0,
    minute: c.minute ?? 0,
    sect: 2,
    gender: 1
  })
  const shensha = (r as { shensha?: Record<string, string[]> }).shensha ?? {}
  const out: Record<'年' | '月' | '日' | '时', string[]> = { 年: [], 月: [], 日: [], 时: [] }
  for (const [key, pillar] of Object.entries(PILLAR_KEY)) {
    for (const raw of shensha[key] ?? []) {
      const name = normalizeMystilightShenShaName(raw)
      if (!out[pillar].includes(name)) out[pillar].push(name)
    }
  }
  return out
}
