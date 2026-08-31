/**
 * 六亲关系网：以元男/元女为中心，按宫位 + 五行生克标「谁生谁、谁克谁、谁耗谁」。
 *
 * 可编码：宫位角色、生克边、正偏配偶星映射、被克≠全坏。
 * 禁止：村妇/学历/具体私人事件等观感判决。
 */
import { DIZHI_WUXING, KE, SHENG, TIANGAN_WUXING, type WuXing } from '../constants'
import type { BaZiChart, Pillar } from './chart'
import type { BaZiTrend } from './trend'
import type { ShiShen } from './shishen'
import { femaleSpouseStarMapText } from './femaleTone'

/** 宫位 */
export type KinPalace = '年' | '月' | '日' | '时'

/** 生克边（相对日主） */
export type KinEdge = '生我' | '我生' | '克我' | '我克' | '同我'

/** 单宫关系节点 */
export interface KinNode {
  /** 宫位 */
  palace: KinPalace
  /** 六亲角色 */
  role: string
  /** 干支 */
  gz: string
  /** 天干五行 */
  ganWx: WuXing
  /** 地支五行 */
  zhiWx: WuXing
  /** 天干相对日主的边 */
  ganEdge: KinEdge
  /** 地支相对日主的边 */
  zhiEdge: KinEdge
  /** 天干十神（日柱为元男/元女） */
  star: string
  /** 一句象意（资源流，非人事诽谤） */
  hint: string
}

/** 关系网总批 */
export interface KinNetwork {
  /** 中心标签 */
  selfLabel: '元男' | '元女'
  /** 日主五行 */
  dayWx: WuXing
  /** 各宫节点 */
  nodes: KinNode[]
  /** 配偶星文案 */
  spouseMap: string
  /** 吉凶并陈总批 */
  text: string
}

/**
 * 两五行相对关系（从 me 看 other）。
 * @param me 日主五行
 * @param other 对方五行
 */
export function wuxingEdge(me: WuXing, other: WuXing): KinEdge {
  if (other === me) return '同我'
  if (SHENG[other] === me) return '生我'
  if (SHENG[me] === other) return '我生'
  if (KE[other] === me) return '克我'
  if (KE[me] === other) return '我克'
  return '同我'
}

/**
 * 生克边 → 资源流口语（被克可表付出，不是纯凶）。
 * @param edge 边
 * @param role 六亲角色
 * @param weak 身弱时克我压力更大
 */
function edgeHint(edge: KinEdge, role: string, weak: boolean): string {
  if (edge === '生我') return `${role}偏生扶：助力、庇护、给资源（被你用）`
  if (edge === '我生') return `${role}偏泄我：你费神、费力，对方吃你输出`
  if (edge === '我克') return `${role}偏被你克：你花钱/操心更多，对方耗你`
  if (edge === '克我') {
    return weak
      ? `${role}偏克我：压力重，宜晚任、择能护身者；亦主对方为你立规矩或留物`
      : `${role}偏克我：有管束、名分或付出给你，非纯坏；身能任则成器`
  }
  return `${role}与我同类：同气有伴，亦易争资源`
}

/**
 * 宫位角色名（朋友口：年祖辈、月父母、日自己、时子女）。
 * @param palace 宫
 * @param gender 乾坤
 */
function palaceRole(palace: KinPalace, gender: 'male' | 'female'): string {
  if (palace === '年') return '祖辈/早年长辈'
  if (palace === '月') return '父母/门户长辈'
  if (palace === '日') return gender === 'male' ? '元男（自己）' : '元女（自己）'
  return '子女/晚辈产出'
}

/**
 * 男命正财=正配、偏财=偏缘；女命正官=正夫、七杀=偏缘压力。
 * @param gender 乾坤
 */
export function spouseStarMapText(gender: 'male' | 'female'): string {
  return gender === 'male'
    ? '男命配偶星：正财主正配，偏财主偏缘（非「小妾」判决，只表正偏层次）'
    : femaleSpouseStarMapText()
}

/**
 * 从柱取相对日主的生克与十神摘要。
 * @param chart 盘
 * @param pillar 柱
 * @param palace 宫
 * @param gender 乾坤
 * @param weak 身弱
 */
function nodeOf(
  chart: BaZiChart,
  pillar: Pillar,
  palace: KinPalace,
  gender: 'male' | 'female',
  weak: boolean
): KinNode {
  const dayWx = TIANGAN_WUXING[chart.dayMaster]
  const ganWx = TIANGAN_WUXING[pillar.gan]
  const zhiWx = DIZHI_WUXING[pillar.zhi]
  const ganEdge = wuxingEdge(dayWx, ganWx)
  const zhiEdge = wuxingEdge(dayWx, zhiWx)
  const role = palaceRole(palace, gender)
  const star =
    palace === '日'
      ? gender === 'male'
        ? '元男'
        : '元女'
      : String(pillar.ganShiShen)

  /** 日柱看配偶宫地支；其余看天干边为主、支边辅 */
  let hint: string
  if (palace === '日') {
    const palaceEdge = zhiEdge
    const spouse =
      gender === 'male'
        ? palaceEdge === '我克'
          ? '日支属财气，妻宫有财象'
          : '日支非纯财气，妻宫看藏干财星'
        : palaceEdge === '克我'
          ? '日支属官杀气，相处名分/压力协作象（职场官杀另见事业）'
          : '日支非纯官杀，相处看藏干官杀；职场义另论'
    hint = `${spouse}；地支对日主「${palaceEdge}」——${edgeHint(palaceEdge, '配偶宫', weak)}`
  } else {
    const primary = ganEdge
    const secondary = zhiEdge !== ganEdge ? `；支气「${zhiEdge}」${edgeHint(zhiEdge, '地支', weak)}` : ''
    hint = `干气「${primary}」——${edgeHint(primary, role, weak)}${secondary}`
  }

  return {
    palace,
    role,
    gz: pillar.gz,
    ganWx,
    zhiWx,
    ganEdge,
    zhiEdge,
    star,
    hint
  }
}

/**
 * 月令对年柱的额外边（门户火土金等对祖辈宫）。
 * @param chart 盘
 */
function monthVsYearLine(chart: BaZiChart): string {
  const monthWx = DIZHI_WUXING[chart.pillars.month.zhi]
  const yearGanWx = TIANGAN_WUXING[chart.pillars.year.gan]
  const yearZhiWx = DIZHI_WUXING[chart.pillars.year.zhi]
  const toGan = wuxingEdge(monthWx, yearGanWx)
  const toZhi = wuxingEdge(monthWx, yearZhiWx)
  const bits: string[] = []
  if (toGan === '我克' || toGan === '克我') {
    bits.push(`月令${monthWx}对年干${yearGanWx}为「${toGan}」`)
  }
  if (toZhi === '我克' || toZhi === '克我') {
    bits.push(`月令${monthWx}对年支${yearZhiWx}为「${toZhi}」`)
  }
  if (!bits.length) return ''
  return `门户对祖辈：${bits.join('，')}——象意费心或资源外流，不作人格判决。`
}

/**
 * 汇总配偶星透干；藏干另见姻缘扫描。
 * @param chart 盘
 * @param gender 乾坤
 */
function spouseHitsLine(chart: BaZiChart, gender: 'male' | 'female'): string {
  const pillars: Array<{ label: KinPalace; p: Pillar }> = [
    { label: '年', p: chart.pillars.year },
    { label: '月', p: chart.pillars.month },
    { label: '日', p: chart.pillars.day },
    ...(chart.pillars.hour ? [{ label: '时' as const, p: chart.pillars.hour }] : [])
  ]
  const tou: string[] = []
  const cang: string[] = []
  const want =
    gender === 'male' ? (['正财', '偏财'] as const) : (['正官', '七杀'] as const)
  for (const { label, p } of pillars) {
    if (label !== '日' && want.includes(p.ganShiShen as (typeof want)[number])) {
      tou.push(`${label}干${p.gan}（${p.ganShiShen}）`)
    }
    for (const c of p.canggan) {
      if (want.includes(c.shiShen as (typeof want)[number])) {
        cang.push(`${label}支藏${c.gan}（${c.shiShen}/${c.role}）`)
      }
    }
  }
  const labelProper = gender === 'male' ? '正财正配' : '正官正缘名分'
  const labelSide = gender === 'male' ? '偏财偏缘' : '七杀偏缘/相处压力'
  return `${labelProper}/${labelSide}：透干${tou.join('、') || '无'}；藏干${cang.join('、') || '无'}。`
}

/**
 * 本造六亲关系网总批。
 * @param chart 盘
 * @param trend 强弱喜用
 * @param gender 乾坤
 */
export function judgeKinNetwork(
  chart: BaZiChart,
  trend: BaZiTrend,
  gender: 'male' | 'female'
): KinNetwork {
  const dayWx = TIANGAN_WUXING[chart.dayMaster]
  const selfLabel = gender === 'male' ? '元男' : '元女'
  const weak = trend.strength === '偏弱'
  const nodes: KinNode[] = [
    nodeOf(chart, chart.pillars.year, '年', gender, weak),
    nodeOf(chart, chart.pillars.month, '月', gender, weak),
    nodeOf(chart, chart.pillars.day, '日', gender, weak)
  ]
  if (chart.pillars.hour) {
    nodes.push(nodeOf(chart, chart.pillars.hour, '时', gender, weak))
  }

  const spouseMap = spouseStarMapText(gender)
  const cross = monthVsYearLine(chart)
  const spouseHits = spouseHitsLine(chart, gender)

  const lines = nodes.map(
    (n) => `${n.palace}柱${n.gz}（${n.role}，${n.star}，干${n.ganWx}/支${n.zhiWx}）：${n.hint}`
  )

  const good = '利：生我、同气得用处可依；被克处若身能任，可化为名分与规矩。'
  const bad = weak
    ? `弊：身弱难任克我与我克之重负，早婚早管人易累；忌神「${trend.avoid.join('、')}」年亲缘易耗。`
    : `弊：我克处易费钱费神，克我处口舌压力仍有；忌神「${trend.avoid.join('、')}」年勿硬刚。`

  const text = [
    `以${selfLabel}（${chart.dayMaster}${dayWx}）为中心看关系网。`,
    spouseMap + '。',
    spouseHits,
    ...lines.map((l) => l + '。'),
    cross,
    `${good}${bad}`
  ]
    .filter(Boolean)
    .join('')

  return { selfLabel, dayWx, nodes, spouseMap, text }
}
