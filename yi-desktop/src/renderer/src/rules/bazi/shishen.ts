/**
 * 十神规则：以日干为日主，判其他天干相对关系；须可复盘。
 */
import { KE, SHENG, TIANGAN_WUXING, TIANGAN_YANG, type TianGan } from '../constants'
import { makeEvidence, type RuleEvidence } from './evidence'
import { getMetricGloss, getShiShenBrief, tableVersionNote } from './tables/load'

export type ShiShen =
  | '比肩'
  | '劫财'
  | '食神'
  | '伤官'
  | '偏财'
  | '正财'
  | '七杀'
  | '正官'
  | '偏印'
  | '正印'

/** 十神教学释义（来自 tables/shishen-brief.json） */
export const SHISHEN_BRIEF: Record<ShiShen, string> = {
  比肩: getShiShenBrief('比肩'),
  劫财: getShiShenBrief('劫财'),
  食神: getShiShenBrief('食神'),
  伤官: getShiShenBrief('伤官'),
  偏财: getShiShenBrief('偏财'),
  正财: getShiShenBrief('正财'),
  七杀: getShiShenBrief('七杀'),
  正官: getShiShenBrief('正官'),
  偏印: getShiShenBrief('偏印'),
  正印: getShiShenBrief('正印')
}

/**
 * 计算 other 相对 dayGan（日主）的十神。
 * @param dayGan 日干
 * @param other 待判天干
 */
export function shishenOf(dayGan: TianGan, other: TianGan): ShiShen {
  return explainShiShen(dayGan, other).name
}

/**
 * 十神判定 + 可复盘依据。
 * @param dayGan 日干
 * @param other 待判天干
 */
export function explainShiShen(
  dayGan: TianGan,
  other: TianGan
): { name: ShiShen; evidence: RuleEvidence } {
  const me = TIANGAN_WUXING[dayGan]
  const ox = TIANGAN_WUXING[other]
  const same = TIANGAN_YANG[dayGan] === TIANGAN_YANG[other]
  const polarity = same ? '同性' : '异性'

  let name: ShiShen
  let how: string
  if (ox === me) {
    name = same ? '比肩' : '劫财'
    how = `同五行${me}且${polarity}`
  } else if (SHENG[me] === ox) {
    name = same ? '食神' : '伤官'
    how = `日主${me}生对方${ox}且${polarity}`
  } else if (KE[me] === ox) {
    name = same ? '偏财' : '正财'
    how = `日主${me}克对方${ox}且${polarity}`
  } else if (KE[ox] === me) {
    name = same ? '七杀' : '正官'
    how = `对方${ox}克日主${me}且${polarity}`
  } else {
    name = same ? '偏印' : '正印'
    how = `对方${ox}生日主${me}且${polarity}`
  }

  const evidence = makeEvidence({
    id: `shishen.${dayGan}.${other}`,
    value: name,
    rule: `十神生克阴阳表（${tableVersionNote()}）`,
    basis: `日干${dayGan}（${me}）对${other}（${ox}）：${how}→${name}`,
    steps: [
      `日干${dayGan}=${me}`,
      `${other}=${ox}`,
      how,
      `结论${name}`
    ],
    gloss: getMetricGloss(name) || getShiShenBrief(name)
  })
  return { name, evidence }
}
