/**
 * 可审计查表加载：权重/释义从 JSON 读，算法在各引擎文件。
 */
import meta from './meta.json'
import wuxing from './wuxing.json'
import strengthWeights from './strength-weights.json'
import shishenBrief from './shishen-brief.json'
import tiaohou from './tiaohou.json'
import gloss from './gloss.json'
import type { WangXiang, WuXing } from '../../constants'

/** 表版本说明文案（注入 rule 字段） */
export function tableVersionNote(): string {
  return `${meta.label} v${meta.version}（${meta.revised}）`
}

/** 强弱打分权重 */
export function getStrengthWeights(): {
  wangXiangScore: Record<WangXiang, number>
  baseScore: number
  weakBelow: number
  strongAbove: number
  deDiRootMin: number
  ganBoostFactor: number
  rootBoostFactor: number
} {
  return {
    wangXiangScore: strengthWeights.wangXiangScore as Record<WangXiang, number>,
    baseScore: strengthWeights.baseScore,
    weakBelow: strengthWeights.weakBelow,
    strongAbove: strengthWeights.strongAbove,
    deDiRootMin: strengthWeights.deDiRootMin,
    ganBoostFactor: strengthWeights.ganBoostFactor,
    rootBoostFactor: strengthWeights.rootBoostFactor
  }
}

/**
 * 十神概念释义。
 * @param ss 十神名
 */
export function getShiShenBrief(ss: string): string {
  return (shishenBrief as Record<string, string>)[ss] ?? ''
}

/**
 * 指标概念释义（点击弹层用）。
 * @param key 指标名或结论短值
 */
export function getMetricGloss(key: string): string {
  return (gloss as Record<string, string>)[key] ?? '教学指标：点击查看本盘查法与代入过程。'
}

/**
 * 按月支取调候配置。
 * @param monthZhi 月支
 */
export function getTiaoHouRow(monthZhi: string): {
  need: '暖' | '润' | '平'
  usefulHint: WuXing[]
  text: string
} {
  const map = tiaohou as Record<
    string,
    { need: '暖' | '润' | '平'; usefulHint: WuXing[]; text: string }
  >
  if ('亥子丑'.includes(monthZhi)) return map['亥子丑']
  if ('巳午未'.includes(monthZhi)) return map['巳午未']
  if ('寅卯辰'.includes(monthZhi)) return map['寅卯辰']
  return map['申酉戌']
}

/** 审计用五行生克快照（与 constants 应对齐） */
export function getWuxingAudit() {
  return wuxing
}

/** meta 原文 */
export function getTablesMeta() {
  return meta
}
