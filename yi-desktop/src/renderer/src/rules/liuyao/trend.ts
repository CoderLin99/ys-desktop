/**
 * 六爻事态走势解读（教学版）。
 *
 * 把一卦读成「近段走势」：
 * - 世爻：自己状态
 * - 应爻：环境/对方
 * - 动爻生克：变化方向
 * - 用神：事业看官鬼、财运看妻财、学习看父母、人际看兄弟/官鬼
 */
import type { LiuYaoResult, LiuQin, YaoLine } from './cast'

/** 问事类型 */
export type TrendTopic = 'overall' | 'career' | 'wealth' | 'relation'

/** 六爻走势结果 */
export interface LiuYaoTrend {
  topic: TrendTopic
  /** 综合分 0-100 */
  score: number
  band: '低' | '平' | '高'
  /** 近段走势一句话 */
  headline: string
  /** 分点说明 */
  points: string[]
  /** 行动建议 */
  advice: string
  /** 是否偏「虚惊/影子」 */
  shadowLike: boolean
}

/**
 * 取问事对应用神六亲。
 * @param topic 主题
 */
function usefulQin(topic: TrendTopic): LiuQin[] {
  if (topic === 'career') return ['官鬼', '父母']
  if (topic === 'wealth') return ['妻财', '子孙']
  if (topic === 'relation') return ['官鬼', '兄弟', '妻财']
  return ['官鬼', '妻财', '父母', '子孙']
}

/**
 * 单爻「力量」：动爻权重大，世应加分。
 * @param line 爻
 */
function lineWeight(line: YaoLine): number {
  let w = 1
  if (line.moving) w += 1.2
  if (line.isShi) w += 0.8
  if (line.isYing) w += 0.5
  return w
}

/**
 * 用神是否得生扶（简化：同卦中子孙生妻财、父母生子孙等用五行口诀近似）。
 * 这里用六亲生克口诀：
 * 父母→兄弟，兄弟→子孙，子孙→妻财，妻财→官鬼，官鬼→父母
 */
const QIN_SHENG: Record<LiuQin, LiuQin> = {
  父母: '兄弟',
  兄弟: '子孙',
  子孙: '妻财',
  妻财: '官鬼',
  官鬼: '父母'
}

/**
 * 由六爻结果推近段走势。
 * @param gua 起卦结果
 * @param topic 问事主题
 */
export function analyzeLiuYaoTrend(gua: LiuYaoResult, topic: TrendTopic = 'overall'): LiuYaoTrend {
  const targets = usefulQin(topic)
  const shi = gua.lines.find((l) => l.isShi)!
  const ying = gua.lines.find((l) => l.isYing)!
  const moving = gua.lines.filter((l) => l.moving)

  let score = 55

  // 用神出现与动
  for (const line of gua.lines) {
    if (!targets.includes(line.liuqin)) continue
    score += 6 * lineWeight(line)
    // 动而生世加分
    if (line.moving && QIN_SHENG[line.liuqin] === shi.liuqin) score += 8
    if (line.moving && QIN_SHENG[shi.liuqin] === line.liuqin) score -= 5
  }

  // 世爻被官鬼动克 → 压力
  if (moving.some((m) => m.liuqin === '官鬼') && shi.liuqin !== '官鬼') {
    score -= topic === 'career' ? 2 : 6
  }
  // 世动：主动求变
  if (shi.moving) score += 4
  // 应动克意味环境变
  if (ying.moving) score += ying.liuqin === '官鬼' ? -4 : 2

  if (gua.shadowFight) score -= 8

  score = Math.max(10, Math.min(95, Math.round(score)))
  const band: LiuYaoTrend['band'] = score >= 68 ? '高' : score <= 42 ? '低' : '平'

  const points: string[] = []
  points.push(`世爻为${shi.liuqin}${shi.moving ? '（动）' : ''}，代表你当前状态。`)
  points.push(`应爻为${ying.liuqin}${ying.moving ? '（动）' : ''}，代表对方/环境。`)
  if (moving.length) {
    points.push(`动爻：${moving.map((m) => `${m.position}爻${m.liuqin}`).join('、')}，事变由此起。`)
  } else {
    points.push('六爻安静：走势以惯性为主，不宜过度解读波动。')
  }

  const topicLabel =
    topic === 'career' ? '事业' : topic === 'wealth' ? '财运' : topic === 'relation' ? '人际' : '整体'

  let headline = ''
  if (band === '高') headline = `${topicLabel}近段偏顺，宜趁势推进，仍要留余地。`
  else if (band === '低') headline = `${topicLabel}近段阻力明显，宜收缩战线、先做核实。`
  else headline = `${topicLabel}近段平波，适合稳扎稳打、积小胜。`

  if (gua.shadowFight) {
    points.push('卦现虚争/讼象：部分压力可能来自误会或信息不全（跟影子打架）。')
  }

  const advice =
    band === '高'
      ? '把已经验证过的事做深；新开线控制在一条以内。'
      : band === '低'
        ? '暂停硬刚，先补信息与资源，再决定是否出手。'
        : '保持节奏，用复盘代替频繁变卦。'

  return {
    topic,
    score,
    band,
    headline,
    points,
    advice,
    shadowLike: gua.shadowFight
  }
}
