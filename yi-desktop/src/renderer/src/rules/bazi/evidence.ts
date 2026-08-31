/**
 * 八字规则可复盘证据：每条结论须带查法 + 本盘代入，禁止空口象意。
 */

/** 单条可复盘证据 */
export interface RuleEvidence {
  /** 指标 id，如 strength / useful / shishen.month / shensha.天乙 */
  id: string
  /** 结论摘要（格子上的短值） */
  value: string
  /** 规则出处（公式名 + 表版本） */
  rule: string
  /** 本盘代入过程 */
  basis: string
  /** 可选分步 */
  steps?: string[]
  /** 概念释义（点击弹出；与本盘无关） */
  gloss: string
}

/**
 * 格式化为断言 / 助手用的证据句。
 * @param e 证据
 */
export function formatEvidence(e: RuleEvidence): string {
  const steps =
    e.steps && e.steps.length ? `；步骤：${e.steps.join(' → ')}` : ''
  return `【结论】${e.value}；【查法】${e.rule}；【本盘】${e.basis}${steps}；【释义】${e.gloss}`
}

/**
 * 组装证据对象（补默认空 steps）。
 * @param partial 字段
 */
export function makeEvidence(
  partial: Omit<RuleEvidence, 'steps'> & { steps?: string[] }
): RuleEvidence {
  return {
    id: partial.id,
    value: partial.value,
    rule: partial.rule,
    basis: partial.basis,
    gloss: partial.gloss,
    steps: partial.steps?.length ? partial.steps : undefined
  }
}

/** 词典浮层锚点：点击名词的视口矩形 */
export interface MetricAnchor {
  /** 左 */
  left: number
  /** 上 */
  top: number
  /** 右 */
  right: number
  /** 下 */
  bottom: number
}
