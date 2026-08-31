/**
 * 玄空飞星：流年盘与流月盘，供阳宅方位宜忌卡。
 */

/** 洛书九宫位置（阅读序：西北→东北…中） */
export const LUOSHU_POS = [
  { key: 'nw', label: '西北', gua: '乾' },
  { key: 'n', label: '正北', gua: '坎' },
  { key: 'ne', label: '东北', gua: '艮' },
  { key: 'w', label: '正西', gua: '兑' },
  { key: 'c', label: '中宫', gua: '中' },
  { key: 'e', label: '正东', gua: '震' },
  { key: 'sw', label: '西南', gua: '坤' },
  { key: 's', label: '正南', gua: '离' },
  { key: 'se', label: '东南', gua: '巽' }
] as const

/** 单宫飞星 */
export interface FeiXingCell {
  /** 方位 key */
  key: string
  /** 方位名 */
  label: string
  /** 卦 */
  gua: string
  /** 飞星 1–9 */
  star: number
  /** 星性说明 */
  tip: string
}

/** 流年飞星结果 */
export interface YearFeiXingResult {
  /** 流年（立春年） */
  year: number
  /** 入中星 */
  centerStar: number
  /** 九宫 */
  cells: FeiXingCell[]
  /** 总述 */
  summary: string[]
}

/** 流月飞星结果（结构与年盘一致，另记月份） */
export interface MonthFeiXingResult {
  /** 公历年 */
  year: number
  /** 公历月 1–12（按节气寅月序近似） */
  month: number
  /** 入中星 */
  centerStar: number
  /** 九宫 */
  cells: FeiXingCell[]
  /** 总述 */
  summary: string[]
}

/**
 * 九星星性说明：供方位卡与 AI 完整叙述，勿写「轻量」。
 */
const STAR_TIP: Record<number, string> = {
  1: '一白贪狼水：主智慧、文教、流动与人缘；宜读书、文书、远行，忌浑浊死水积滞。',
  2: '二黑巨门土：病符主病痛阻滞；宜清整、少久卧病位，重大手术与动土宜择吉规避。',
  3: '三碧禄存木：主是非口舌、争讼变动；慎签约对峙，宜疏导沟通、少硬碰。',
  4: '四绿文曲木：文昌桃花，利学艺文墨与社交；亦主情感纠葛，宜洁净书桌书案。',
  5: '五黄廉贞土：关煞最重，宜静不宜动土装修；可镇静少扰，避开此方大事兴工。',
  6: '六白武曲金：权贵武金，利决断、升迁与金属器械；刚燥时防伤筋骨、争权。',
  7: '七赤破军金：破耗口舌，防盗损与口舌是非；少开金口硬碰，财物宜收管。',
  8: '八白左辅土：当令旺星，主财山进益；宜守成进取、置业置产，忌过度投机。',
  9: '九紫右弼火：喜庆文明、名誉与喜事；亦主燥热急躁，防火气口舌与熬夜。'
}

/**
 * 公元年 → 流年入中星（以 2024 入中 3 为锚逆推）。
 * @param year 立春后流年
 */
export function yearCenterStar(year: number): number {
  const anchorYear = 2024
  const anchorCenter = 3
  let s = anchorCenter + (anchorYear - year)
  s = ((s % 9) + 9) % 9
  return s === 0 ? 9 : s
}

/**
 * 流月入中星：三合年支口诀起寅月，再按月序逆飞。
 * 子午卯酉年寅月 8；辰戌丑未年寅月 5；寅申巳亥年寅月 2。
 * @param year 公历年
 * @param month 公历月 1–12（以节气寅月≈2 月为第 1 步近似）
 */
export function monthCenterStar(year: number, month: number): number {
  // 年支序：以 1984 甲子为锚（子=0）
  const zhiIdx = ((year - 1984) % 12 + 12) % 12
  let yinCenter = 2
  if ([0, 3, 6, 9].includes(zhiIdx)) yinCenter = 8 // 子卯午酉
  else if ([1, 4, 7, 10].includes(zhiIdx)) yinCenter = 5 // 丑辰未戌
  else yinCenter = 2 // 寅巳申亥

  // 寅月≈公历 2 月为序 0；1 月视为上年亥月（序 11）
  const yinOrd = month >= 2 ? month - 2 : month + 10
  let s = yinCenter - yinOrd
  s = ((s % 9) + 9) % 9
  return s === 0 ? 9 : s
}

/**
 * 自中宫起洛书顺飞宫序：中→乾→兑→艮→离→坎→坤→震→巽
 */
const FLY_ORDER_KEYS = ['c', 'nw', 'w', 'ne', 's', 'n', 'sw', 'e', 'se'] as const

/**
 * 按入中星排出九宫飞星单元格。
 * @param centerStar 入中星 1–9
 */
function buildCells(centerStar: number): FeiXingCell[] {
  const byKey = new Map<string, number>()
  for (let i = 0; i < 9; i++) {
    let star = centerStar - i
    while (star <= 0) star += 9
    byKey.set(FLY_ORDER_KEYS[i], star)
  }
  return LUOSHU_POS.map((p) => {
    const star = byKey.get(p.key) || 5
    return {
      key: p.key,
      label: p.label,
      gua: p.gua,
      star,
      tip: STAR_TIP[star] || ''
    }
  })
}

/**
 * 从九宫提炼五黄/八白等要点。
 * @param label 盘面标签（如「流年」「流月」）
 * @param cells 九宫
 * @param centerStar 入中
 */
function summarizeBoard(label: string, cells: FeiXingCell[], centerStar: number): string[] {
  const five = cells.find((c) => c.star === 5)
  const eight = cells.find((c) => c.star === 8)
  const two = cells.find((c) => c.star === 2)
  return [
    `${label}飞星，入中为 ${centerStar}。`,
    eight ? `当旺八白在${eight.label}（${eight.gua}），宜适度振作、理财置业。` : '',
    five ? `五黄在${five.label}（${five.gua}），宜少动土装修、大事缓议。` : '',
    two ? `二黑在${two.label}（${two.gua}），宜清整少久卧，注意身心节律。` : ''
  ].filter(Boolean)
}

/**
 * 排出流年九宫飞星。
 * @param year 公历年（建议已按立春校正）
 */
export function buildYearFeiXing(year: number): YearFeiXingResult {
  const centerStar = yearCenterStar(year)
  const cells = buildCells(centerStar)
  return {
    year,
    centerStar,
    cells,
    summary: [
      ...summarizeBoard(`${year} 年流年`, cells, centerStar),
      '此为流年飞星盘，宜与坐向、八宅吉位同参；未叠加宅运山向三般卦细盘。'
    ]
  }
}

/**
 * 排出流月九宫飞星（入中 + 九宫）。
 * @param year 公历年
 * @param month 公历月 1–12
 */
export function buildMonthFeiXing(year: number, month: number): MonthFeiXingResult {
  const m = Math.min(12, Math.max(1, Math.round(month)))
  const centerStar = monthCenterStar(year, m)
  const cells = buildCells(centerStar)
  return {
    year,
    month: m,
    centerStar,
    cells,
    summary: [
      ...summarizeBoard(`${year} 年 ${m} 月流月`, cells, centerStar),
      '流月盘用于当月方位加减；重大兴工仍以流年五黄与宅命吉位为主。'
    ]
  }
}
