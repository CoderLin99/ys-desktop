/**
 * xuantian-bazi 神煞桥接（仅测试层对照）。
 */
import { calculateChart } from 'xuantian-bazi'
import type { GoldenSolarCase } from './cases'

/** xuantian pillar → 中文柱 */
const PILLAR_MAP: Record<string, '年' | '月' | '日' | '时'> = {
  year: '年',
  month: '月',
  day: '日',
  hour: '时'
}

/**
 * 将 xuantian 神煞名归一化为自研名称。
 * @param raw xuantian 原始名
 */
export function normalizeXuantianShenShaName(raw: string): string {
  return raw
    .replace(/勾绞煞/g, '勾煞')
    .replace(/文昌贵人/g, '文昌')
    .replace(/天厨贵人/g, '天厨')
    .replace(/国印贵人/g, '国印')
    .replace(/月德贵人/g, '月德')
    .replace(/天德贵人/g, '天德')
    .replace(/魁罡日/g, '魁罡')
    .replace(/正学堂/g, '学堂')
    .trim()
}

/**
 * 格式化 birthDate / birthTime 供 xuantian 使用。
 * @param c 公历样例
 */
function chartInputFromCase(c: GoldenSolarCase): {
  gender: 'male'
  birthDate: string
  birthTime: string
  sect: 2
  locale: 'zh-CN'
} {
  const pad = (n: number) => String(n).padStart(2, '0')
  return {
    gender: 'male',
    birthDate: `${c.year}-${pad(c.month)}-${pad(c.day)}`,
    birthTime: `${pad(c.hour ?? 0)}:${pad(c.minute ?? 0)}`,
    sect: 2,
    locale: 'zh-CN'
  }
}

/**
 * 从 xuantian 提取神煞名集合。
 * @param c 公历样例
 */
export function xuantianShenShaNames(c: GoldenSolarCase): string[] {
  const r = calculateChart(chartInputFromCase(c))
  const items = (r.shenSha as { shenShaItems?: { name: string }[] })?.shenShaItems ?? []
  return [...new Set(items.map((i) => normalizeXuantianShenShaName(i.name)))].sort()
}

/**
 * xuantian 分柱神煞。
 * @param c 公历样例
 */
export function xuantianShenShaByPillar(
  c: GoldenSolarCase
): Record<'年' | '月' | '日' | '时', string[]> {
  const r = calculateChart(chartInputFromCase(c))
  const items =
    (r.shenSha as { shenShaItems?: { name: string; pillar?: string }[] })?.shenShaItems ?? []
  const out: Record<'年' | '月' | '日' | '时', string[]> = { 年: [], 月: [], 日: [], 时: [] }
  for (const item of items) {
    const pillar = PILLAR_MAP[item.pillar ?? ''] ?? null
    if (!pillar) continue
    const name = normalizeXuantianShenShaName(item.name)
    if (!out[pillar].includes(name)) out[pillar].push(name)
  }
  return out
}
