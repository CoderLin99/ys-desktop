/**
 * 小鲸娘自言自语：短句气泡，口吻偏命理助手，不出现「流式」二字。
 * 做法对齐 live2d-widget 的随机台词，而不是整段讲义。
 */
export const PET_IDLE_TIPS: string[] = [
  '先看月令，再看日主强弱哦。',
  '大运定十年主题，流年只是应期。',
  '印星旺不等于会读书，现代得分开看。',
  '点我可以追问这张盘～',
  '真太阳时开了吗？经度会改时辰。',
  '吉凶并陈才贴切，单说好运我可不敢。',
  '神煞只是旁证，别拿华盖吓人。',
  '……想了想，还是先排盘再说。'
]

/** 忙碌（润色/追问）时的气泡 */
export const PET_BUSY_TIPS: string[] = [
  '让我想想这句怎么说得贴切……',
  '对照喜用神呢，稍等。',
  '岁运叠上去，我再理一理。',
  '嗯……不要编私人事件，这个我记得。'
]

/**
 * 从列表里抽一句，尽量不与上一句重复。
 * @param pool 台词池
 * @param prev 上一句，可空
 */
export function pickPetTip(pool: string[], prev = ''): string {
  if (pool.length === 0) return ''
  if (pool.length === 1) return pool[0]
  const others = pool.filter((t) => t !== prev)
  return others[Math.floor(Math.random() * others.length)] ?? pool[0]
}

/**
 * 下一档随机间隔（毫秒）。
 * @param minMs 下限
 * @param maxMs 上限
 */
export function nextPetDelay(minMs: number, maxMs: number): number {
  return minMs + Math.random() * (maxMs - minMs)
}
