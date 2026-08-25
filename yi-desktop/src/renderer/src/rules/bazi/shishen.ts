/**
 * 十神规则：以日干为日主，判其他天干相对关系。
 */
import { KE, SHENG, TIANGAN_WUXING, TIANGAN_YANG, type TianGan } from '../constants'

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

/** 十神教学释义（倾向描述，非定论） */
export const SHISHEN_BRIEF: Record<ShiShen, string> = {
  比肩: '同辈自立、分担与竞争；看别人时多「同类对照」。',
  劫财: '争夺、分财、行动力；易与人抢同一资源。',
  食神: '表达、享受、才艺；输出顺畅。',
  伤官: '挑剔、革新、口才；不服约束。',
  偏财: '偏业、浮动财、机会财；眼光活。',
  正财: '正当收入、务实、节制；稳定求财。',
  七杀: '压力、挑战、果决；对敌对力量敏感。',
  正官: '规则、职位、责任；社会评价与约束。',
  偏印: '偏门学问、灵感；非常规信息通道。',
  正印: '学习、贵人、庇护；吸收他人知识。'
}

/**
 * 计算 other 相对 dayGan（日主）的十神。
 * @param dayGan 日干
 * @param other 待判天干
 */
export function shishenOf(dayGan: TianGan, other: TianGan): ShiShen {
  const me = TIANGAN_WUXING[dayGan]
  const ox = TIANGAN_WUXING[other]
  const same = TIANGAN_YANG[dayGan] === TIANGAN_YANG[other]

  if (ox === me) return same ? '比肩' : '劫财'
  if (SHENG[me] === ox) return same ? '食神' : '伤官'
  if (KE[me] === ox) return same ? '偏财' : '正财'
  if (KE[ox] === me) return same ? '七杀' : '正官'
  return same ? '偏印' : '正印'
}
