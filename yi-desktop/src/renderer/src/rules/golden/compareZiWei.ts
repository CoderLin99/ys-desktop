/**
 * 紫微黄金样例：自研盘与 iztro 参照对比（开发依赖 iztro，仅测试环境使用）。
 */
import { astro } from 'iztro'
import { buildZiWeiChart, type ZiWeiChart } from '../ziwei/chart'
import {
  iztroGenderLabel,
  iztroSolarDateStr,
  iztroTimeIndexFromClockHour
} from './iztroBridge'
import type { GoldenZiWeiCase } from './cases'

/** iztro 参照摘要 */
export interface IztroRefSummary {
  /** 命宫地支 */
  soulBranch: string
  /** 身宫地支 */
  bodyBranch: string
  /** 五行局 */
  fiveElementsClass: string
  /** 紫微星所在宫地支 */
  ziweiBranch: string
}

/** 主星布局差异 */
export interface ZiWeiMajorStarDiff {
  /** 宫地支 */
  zhi: string
  /** 自研主星列表（排序后） */
  ours: string[]
  /** iztro 主星列表（排序后） */
  iztro: string[]
}

/** 完整对照结果 */
export interface ZiWeiIztroCompareResult {
  /** 自研盘 */
  ours: ZiWeiChart
  /** iztro 摘要 */
  iztro: IztroRefSummary
  /** 主星不一致的宫位 */
  majorStarDiffs: ZiWeiMajorStarDiff[]
  /** 主星完全一致的宫位数（0–12） */
  majorStarMatchCount: number
}

/**
 * 读取 iztro 星盘参照。
 * @param c 黄金样例
 */
function loadIztroAstrolabe(c: GoldenZiWeiCase) {
  const ti = iztroTimeIndexFromClockHour(c.year, c.month, c.day, c.hour)
  return astro.bySolar(
    iztroSolarDateStr(c.year, c.month, c.day),
    ti,
    iztroGenderLabel(c.gender),
    true,
    'zh-CN'
  )
}

/**
 * 读取 iztro 参照摘要。
 * @param c 黄金样例
 */
export function loadIztroRef(c: GoldenZiWeiCase): IztroRefSummary {
  const astrolabe = loadIztroAstrolabe(c)
  return {
    soulBranch: astrolabe.earthlyBranchOfSoulPalace,
    bodyBranch: astrolabe.earthlyBranchOfBodyPalace,
    fiveElementsClass: astrolabe.fiveElementsClass,
    ziweiBranch: astrolabe.star('紫微')?.palace()?.earthlyBranch ?? ''
  }
}

/**
 * 自研紫微盘与 iztro 对照。
 * @param c 黄金样例
 */
export function compareZiWeiWithIztro(c: GoldenZiWeiCase): ZiWeiIztroCompareResult {
  const ours = buildZiWeiChart({
    year: c.year,
    month: c.month,
    day: c.day,
    hour: c.hour,
    gender: c.gender
  })
  const astrolabe = loadIztroAstrolabe(c)
  const iztroRef = {
    soulBranch: astrolabe.earthlyBranchOfSoulPalace,
    bodyBranch: astrolabe.earthlyBranchOfBodyPalace,
    fiveElementsClass: astrolabe.fiveElementsClass,
    ziweiBranch: astrolabe.star('紫微')?.palace()?.earthlyBranch ?? ''
  }

  const majorStarDiffs: ZiWeiMajorStarDiff[] = []
  let majorStarMatchCount = 0

  for (const p of ours.palaces) {
    const izP = astrolabe.palaces.find((x) => x.earthlyBranch === p.zhi)
    const izMajors = (izP?.majorStars ?? []).map((s) => s.name).sort()
    const ourMajors = [...p.majors].sort()
    if (izMajors.join(',') === ourMajors.join(',')) {
      majorStarMatchCount += 1
    } else {
      majorStarDiffs.push({ zhi: p.zhi, ours: ourMajors, iztro: izMajors })
    }
  }

  return { ours, iztro: iztroRef, majorStarDiffs, majorStarMatchCount }
}

/**
 * 校验命宫、身宫、五行局与 iztro / 期望一致；不一致则抛错。
 * @param c 黄金样例
 * @param result 对照结果
 */
export function assertZiWeiSoulBodyMatchesIztro(
  c: GoldenZiWeiCase,
  result: ZiWeiIztroCompareResult
): void {
  const expect = c.expectIztro
  if (result.ours.mingZhi !== expect.mingZhi) {
    throw new Error(`[${c.label}] 命宫期望 ${expect.mingZhi}，得到 ${result.ours.mingZhi}`)
  }
  if (result.ours.shenZhi !== expect.shenZhi) {
    throw new Error(`[${c.label}] 身宫期望 ${expect.shenZhi}，得到 ${result.ours.shenZhi}`)
  }
  if (result.ours.wuXingJu !== expect.wuXingJu) {
    throw new Error(`[${c.label}] 五行局期望 ${expect.wuXingJu}，得到 ${result.ours.wuXingJu}`)
  }
  if (result.ours.mingZhi !== result.iztro.soulBranch) {
    throw new Error(
      `[${c.label}] 命宫与 iztro 不一致：自研 ${result.ours.mingZhi}，iztro ${result.iztro.soulBranch}`
    )
  }
  if (result.ours.shenZhi !== result.iztro.bodyBranch) {
    throw new Error(
      `[${c.label}] 身宫与 iztro 不一致：自研 ${result.ours.shenZhi}，iztro ${result.iztro.bodyBranch}`
    )
  }
  if (result.ours.wuXingJu !== result.iztro.fiveElementsClass) {
    throw new Error(
      `[${c.label}] 五行局与 iztro 不一致：自研 ${result.ours.wuXingJu}，iztro ${result.iztro.fiveElementsClass}`
    )
  }
}

/**
 * 校验十四主星十二宫布局与 iztro 完全一致。
 * @param c 黄金样例
 * @param result 对照结果
 */
export function assertZiWeiMajorStarsMatchIztro(
  c: GoldenZiWeiCase,
  result: ZiWeiIztroCompareResult
): void {
  if (result.majorStarDiffs.length === 0) return
  const detail = result.majorStarDiffs
    .map((d) => `${d.zhi}: 自研[${d.ours.join(',')}] vs iztro[${d.iztro.join(',')}]`)
    .join('\n  ')
  throw new Error(
    `[${c.label}] 主星布局与 iztro 不一致（${result.majorStarMatchCount}/12）\n  ${detail}`
  )
}
