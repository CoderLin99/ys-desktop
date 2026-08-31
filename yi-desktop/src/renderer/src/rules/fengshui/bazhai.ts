/**
 * 八宅派：宅主命卦 + 游年九星方位吉凶（轻量实现）。
 */
import { Solar } from 'lunar-javascript'

/** 东四命 / 西四命 */
export type MingGroup = 'east' | 'west'

/** 九宫方位名（不含中） */
export const BAGUA_DIRS = ['坎', '坤', '震', '巽', '乾', '兑', '艮', '离'] as const
export type BaguaDir = (typeof BAGUA_DIRS)[number]

/** 游年星与吉凶 */
export interface YouNianStar {
  /** 星名 */
  name: string
  /** 吉凶等级 */
  luck: '吉' | '次吉' | '凶' | '次凶'
  /** 简注 */
  tip: string
}

/** 八宅分析结果 */
export interface BaZhaiResult {
  /** 立春后农历年支对应的命卦数 1–9（洛书） */
  mingGuaNum: number
  /** 命卦名 */
  mingGuaName: string
  /** 东四/西四 */
  group: MingGroup
  /** 宅主年（立春校正后） */
  yearUsed: number
  /** 各宫游年 */
  sectors: { gua: BaguaDir; star: YouNianStar }[]
  /** 简述 */
  summary: string[]
}

const GUA_NAMES = ['', '坎', '坤', '震', '巽', '中', '乾', '兑', '艮', '离']

/** 命卦 → 东四/西四 */
const EAST_GUA = new Set([1, 3, 4, 9]) // 坎震巽离

/**
 * 东四宅游年（从命卦宫起：伏位→天医→生气→延年→祸害→六煞→五鬼→绝命）
 * 西四宅同序，宫位环不同。
 */
const STAR_SEQ: YouNianStar[] = [
  { name: '伏位', luck: '次吉', tip: '守成为宜，宜静守本业' },
  { name: '天医', luck: '吉', tip: '宜养生、求医、贵人' },
  { name: '生气', luck: '吉', tip: '宜进取、开业、求财' },
  { name: '延年', luck: '吉', tip: '宜和合、合作、久远事' },
  { name: '祸害', luck: '次凶', tip: '口舌是非，宜化解少动' },
  { name: '六煞', luck: '次凶', tip: '纠葛牵绊，感情事慎' },
  { name: '五鬼', luck: '凶', tip: '变动急躁，防火灾盗贼' },
  { name: '绝命', luck: '凶', tip: '耗损破败，重大决策宜缓' }
]

/**
 * 东四命：坎1→震3→巽4→离9 环上的宫序（顺飞游年）。
 * 索引对应 STAR_SEQ。
 */
const EAST_RING: BaguaDir[] = ['坎', '艮', '震', '巽', '离', '坤', '兑', '乾']
/** 西四命环 */
const WEST_RING: BaguaDir[] = ['乾', '兑', '艮', '离', '坎', '震', '巽', '坤']

/**
 * 取立春后的「命理年」（未过立春用上一年）。
 * @param year 公历年
 * @param month 月
 * @param day 日
 */
export function destinyYear(year: number, month: number, day: number): number {
  const solar = Solar.fromYmd(year, month, day)
  const lunar = solar.getLunar()
  const jq = lunar.getPrevJieQi()
  // 简化：若当前节气名在立春前的冬月段，用 getYear 已由 lunar 处理；再用八字年柱年
  const y = lunar.getYear()
  // lunar-javascript 的 getYear 已按春节；八宅多用立春。再校正：
  const lichun = Solar.fromYmd(year, 2, 4)
  try {
    const table = lunar.getJieQiTable?.() as Record<string, { toYmd?: () => string }> | undefined
    const lc = table?.['立春']
    if (lc && typeof (lc as { isBefore?: (s: unknown) => boolean }).isBefore === 'function') {
      // 有立春对象时：公历日在立春前则 year-1
    }
  } catch {
    /* ignore */
  }
  // 实用近似：2 月 4 日前用上一年
  if (month < 2 || (month === 2 && day < 4)) {
    return year - 1
  }
  void jq
  void lichun
  void y
  return year
}

/**
 * 男命/女命命卦数（洛书）。
 * @param year 立春年
 * @param gender male | female
 */
export function calcMingGuaNum(year: number, gender: 'male' | 'female'): number {
  const sumDigits = (n: number): number => {
    let s = 0
    for (const ch of String(Math.abs(n))) s += Number(ch)
    return s > 9 ? sumDigits(s) : s
  }
  if (gender === 'male') {
    // （100 - 年尾两位数）% 9，0→9；现代常用：(11 - (年%10+…）简化为
    let n = sumDigits(year)
    while (n > 9) n = sumDigits(n)
    // 男：11 - n（洛书），0/10→2 等传统写法
    let g = 11 - n
    if (g <= 0) g += 9
    if (g === 5) g = 2 // 男寄坤→艮 常见作 2；此处男五黄寄坤用 2 艮
    return g
  }
  // 女：年数之和 + 4，再取个位等；常用 n+4 后归 1–9
  let n = sumDigits(year) + 4
  while (n > 9) n = sumDigits(n)
  if (n === 5) n = 8 // 女五黄寄艮→坤 用 8
  return n === 0 ? 9 : n
}

/**
 * 排出宅主八宅游年盘。
 * @param input 出生公历 + 性别
 */
export function analyzeBaZhai(input: {
  year: number
  month: number
  day: number
  gender: 'male' | 'female'
}): BaZhaiResult {
  const yearUsed = destinyYear(input.year, input.month, input.day)
  let mingGuaNum = calcMingGuaNum(yearUsed, input.gender)
  if (mingGuaNum === 5) mingGuaNum = input.gender === 'male' ? 2 : 8
  const mingGuaName = GUA_NAMES[mingGuaNum] || String(mingGuaNum)
  const group: MingGroup = EAST_GUA.has(mingGuaNum) ? 'east' : 'west'
  const ring = group === 'east' ? EAST_RING : WEST_RING

  // 以命卦所在宫为伏位起点
  const startIdx = ring.indexOf(mingGuaName as BaguaDir)
  const base = startIdx >= 0 ? startIdx : 0
  const sectors = STAR_SEQ.map((star, i) => ({
    gua: ring[(base + i) % 8],
    star
  }))

  const good = sectors.filter((s) => s.star.luck === '吉').map((s) => `${s.gua}方·${s.star.name}`)
  const bad = sectors.filter((s) => s.star.luck === '凶').map((s) => `${s.gua}方·${s.star.name}`)

  return {
    mingGuaNum,
    mingGuaName,
    group,
    yearUsed,
    sectors,
    summary: [
      `宅主${input.gender === 'male' ? '男' : '女'}命，立春年 ${yearUsed}，命卦${mingGuaName}（${group === 'east' ? '东四命' : '西四命'}）。`,
      `吉位侧重：${good.join('、') || '—'}。`,
      `慎防：${bad.join('、') || '—'}。`,
      '八宅论方位宜忌，需与坐向对照；不作形峦实勘。'
    ]
  }
}

/**
 * 判断坐向卦是否与命卦同组（东四宅/西四宅相配）。
 * @param mingGroup 命组
 * @param sittingGua 坐山所属卦
 */
export function houseMatchesMing(mingGroup: MingGroup, sittingGua: string): boolean {
  const east = new Set(['坎', '震', '巽', '离'])
  const isEastHouse = east.has(sittingGua)
  return mingGroup === 'east' ? isEastHouse : !isEastHouse
}
