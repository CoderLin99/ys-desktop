/**
 * 神煞叠见：同名神煞落多柱时的加重理解（辅证，不得压过用神格局）。
 *
 * 依据要点（OpenFate / 三命通会用法归纳）：
 * - 重复 = 查表证据变多、相关度提高，≠ 吉凶成倍、≠ 事件必然
 * - 须保留柱位路径；仍受旺衰、十神、喜忌约束
 * - 岁运再引动只标时段，不回写成终身
 */
import type { ShenShaHit } from './shensha'

/** 叠见档位 */
export type ShenShaStackLevel = '单见' | '两柱' | '三柱及以上'

/**
 * 按落柱数取叠见档。
 * @param pillarCount 柱数
 */
export function stackLevelOf(pillarCount: number): ShenShaStackLevel {
  if (pillarCount >= 3) return '三柱及以上'
  if (pillarCount === 2) return '两柱'
  return '单见'
}

/**
 * 常见神煞的叠见人话（按名匹配；未列出的用通用句）。
 * key = 神煞展示名
 */
const STACK_PLAIN: Record<string, { two: string; three: string }> = {
  天乙贵人: {
    two: '两柱天乙：贵人照应面更广，遇阻易有转机；仍须身能任、喜用有气，否则贵人缘接不住。',
    three: '三柱及以上天乙：贵人网络与化解通道叠重，相关度高；仍禁止当成「事事有人救」，须看喜忌与岁运引动。'
  },
  文昌: {
    two: '文昌两柱：文书、考试、表达议题更显；宜落到可交付成果，忌空谈。',
    three: '文昌多柱：文事气场叠重，进修考证表达线更值得看；仍看印食是否为用。'
  },
  驿马: {
    two: '驿马两柱：走动、迁徙、出差变动议题加重；吉凶看是否逢用神财官、有无冲破。',
    three: '驿马多柱：奔波动象叠重，宜规划节奏，忌无目的瞎忙；冲马之年议题更显。'
  },
  桃花: {
    two: '桃花两柱：人缘魅力与情感议题加重；为用则助缘，为忌或叠红艳须防纠缠。',
    three: '桃花多柱：异性缘/社交曝光叠重，段数易偏多波折象；禁止写成恋爱次数，须看日支与配偶星。'
  },
  华盖: {
    two: '华盖两柱：钻研、艺术、信仰独处象加重；宜深耕一技，防过度孤僻。',
    three: '华盖多柱：玄学/技艺钻研气场叠重，宜实修出品，忌空想空谈。'
  },
  羊刃: {
    two: '羊刃两柱：锋芒与压力冲突象加重；宜用在决断岗位，忌硬刚耗身。',
    three: '羊刃多柱：刃气叠重，冲突与手术象须慎读；岁运冲刃时尤其要收。'
  },
  将星: {
    two: '将星两柱：统御、担当议题更显；宜在责权利清晰处用力。',
    three: '将星多柱：权威统御气场叠重，仍须看官杀印是否有情。'
  },
  红鸾: {
    two: '红鸾两柱：喜庆姻缘变动象加重；应期待用神与配偶星，勿单凭神煞定婚期。',
    three: '红鸾多柱：喜庆议题叠重，仍须吉凶并陈。'
  },
  天喜: {
    two: '天喜两柱：欢庆人缘助兴象加重。',
    three: '天喜多柱：喜气叠重，宜把握社交窗口，勿当作终身好运。'
  },
  太极贵人: {
    two: '太极两柱：悟性玄学缘加重，宜深研戒空谈。',
    three: '叠见三柱及以上，俗称「三太极」：悟性与玄学缘叠重，宜深研实修、善思辨，忌流于空想空谈。'
  },
  孤辰: {
    two: '孤辰两柱：独立疏离感加重，未必不吉，宜主动经营连接。',
    three: '孤辰多柱：独处象叠重，防自我封闭。'
  },
  寡宿: {
    two: '寡宿两柱：内向独处象加重。',
    three: '寡宿多柱：独处气场叠重，宜平衡社交。'
  }
}

/**
 * 通用叠见句。
 * @param name 神煞名
 * @param level 档位
 * @param pillars 落柱
 */
function genericStackPlain(
  name: string,
  level: ShenShaStackLevel,
  pillars: string[]
): string {
  const where = pillars.join('、')
  if (level === '两柱') {
    return `${name}叠见${where}两柱：该象相关度提高，须结合喜忌与十神看，禁止吉凶倍增理解。`
  }
  return `${name}叠见${where}等${pillars.length}柱：证据面加宽、相关度高，仍非必然事件，须岁运引动与用神同参。`
}

/**
 * 生成单条神煞的叠见理解（单见返回空串）。
 * @param hit 命中
 */
export function shenShaStackPlainOf(hit: ShenShaHit): string {
  const n = hit.pillars.length
  const level = stackLevelOf(n)
  if (level === '单见') return ''
  const table = STACK_PLAIN[hit.name]
  if (table) return level === '两柱' ? table.two : table.three
  return genericStackPlain(hit.name, level, hit.pillars)
}

/**
 * 用叠见理解 enrichment brief（原地或返回新对象）。
 * @param hits 原命中列表
 */
export function enrichShenShaWithStacks(hits: ShenShaHit[]): ShenShaHit[] {
  return hits.map((h) => {
    const stack = shenShaStackPlainOf(h)
    if (!stack) return h
    // 太极三柱已在 collect 写过三太极，避免重复堆砌
    if (h.name === '太极贵人' && h.pillars.length >= 3 && h.brief.includes('三太极')) {
      return h
    }
    return {
      ...h,
      brief: `${h.brief} ${stack}`,
      basis: `${h.basis}；【叠见】落${h.pillars.join('、')}共${h.pillars.length}柱，相关度提高而非吉凶倍增`
    }
  })
}

/**
 * 汇总本盘所有叠见神煞，供助手事实包 / 断言。
 * @param hits 命中（建议已 enrich）
 */
export function formatShenShaStackSummary(hits: ShenShaHit[]): string {
  const lines = hits
    .filter((h) => h.pillars.length >= 2)
    .map((h) => {
      const plain = shenShaStackPlainOf(h) || h.brief
      return `${h.name}（${h.pillars.join('、')}·${h.pillars.length}柱）${plain}`
    })
  if (!lines.length) return ''
  return [
    '【神煞叠见】同名落多柱=证据相关度提高，不是吉凶翻倍，也不是事件必然；须服从用神格局与岁运引动。',
    ...lines
  ].join('\n')
}

/**
 * 注入 AI：神煞叠见总原则。
 */
export function shenShaStackPromptGuide(): string {
  return [
    '【神煞叠见】若事实包标注某神煞落两柱或三柱及以上：',
    '①表示查表证据变多、该象相关度提高，禁止理解成吉凶成倍或注定发生；',
    '②须点明落哪几柱，并结合喜忌、十神、旺衰；身弱不任则吉神也接不住；',
    '③辅证不得压过月令格局用神；岁运再引动只论该时段，不回写成终身。'
  ].join('')
}
