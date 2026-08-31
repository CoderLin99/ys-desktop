/**
 * 八字 / 六爻共用基础常量与五行生克。
 *
 * 可程序化规则：
 * 1. 天干 10、地支 12，合成 60 甲子
 * 2. 五行相生：木→火→土→金→水→木
 * 3. 五行相克：木→土→水→火→金→木
 */

/** 天干表 */
export const TIANGAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const

/** 地支表 */
export const DIZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const

export type TianGan = (typeof TIANGAN)[number]
export type DiZhi = (typeof DIZHI)[number]
export type WuXing = '木' | '火' | '土' | '金' | '水'

/** 天干五行 */
export const TIANGAN_WUXING: Record<TianGan, WuXing> = {
  甲: '木',
  乙: '木',
  丙: '火',
  丁: '火',
  戊: '土',
  己: '土',
  庚: '金',
  辛: '金',
  壬: '水',
  癸: '水'
}

/** 地支五行 */
export const DIZHI_WUXING: Record<DiZhi, WuXing> = {
  子: '水',
  丑: '土',
  寅: '木',
  卯: '木',
  辰: '土',
  巳: '火',
  午: '火',
  未: '土',
  申: '金',
  酉: '金',
  戌: '土',
  亥: '水'
}

/** 天干是否为阳 */
export const TIANGAN_YANG: Record<TianGan, boolean> = Object.fromEntries(
  TIANGAN.map((g, i) => [g, i % 2 === 0])
) as Record<TianGan, boolean>

/** 地支是否为阳 */
export const DIZHI_YANG: Record<DiZhi, boolean> = Object.fromEntries(
  DIZHI.map((z, i) => [z, i % 2 === 0])
) as Record<DiZhi, boolean>

/** 相生：键生值 */
export const SHENG: Record<WuXing, WuXing> = {
  木: '火',
  火: '土',
  土: '金',
  金: '水',
  水: '木'
}

/** 相克：键克值 */
export const KE: Record<WuXing, WuXing> = {
  木: '土',
  土: '水',
  水: '火',
  火: '金',
  金: '木'
}

/** 六十甲子 */
export const JIAZI_60: string[] = Array.from({ length: 60 }, (_, i) => TIANGAN[i % 10] + DIZHI[i % 12])

/** 地支藏干（本气在前） */
export const CANGGAN: Record<DiZhi, readonly TianGan[]> = {
  子: ['癸'],
  丑: ['己', '癸', '辛'],
  寅: ['甲', '丙', '戊'],
  卯: ['乙'],
  辰: ['戊', '乙', '癸'],
  巳: ['丙', '庚', '戊'],
  午: ['丁', '己'],
  未: ['己', '丁', '乙'],
  申: ['庚', '壬', '戊'],
  酉: ['辛'],
  戌: ['戊', '辛', '丁'],
  亥: ['壬', '甲']
}

/** 藏干层次：本气最重，余气最轻 */
export type CangGanRole = '本气' | '中气' | '余气'

/** 单条藏干权重（总和约 1，用于强弱通根） */
export interface CangGanWeight {
  /** 藏干 */
  gan: TianGan
  /** 0–1 相对权重 */
  weight: number
  /** 本气 / 中气 / 余气 */
  role: CangGanRole
}

/**
 * 地支藏干本气中气余气权重（子平常用教学表）。
 * 通根、旺衰比「每个藏干等权」更接近传统取用。
 */
export const CANGGAN_WEIGHT: Record<DiZhi, readonly CangGanWeight[]> = {
  子: [{ gan: '癸', weight: 1, role: '本气' }],
  丑: [
    { gan: '己', weight: 0.6, role: '本气' },
    { gan: '癸', weight: 0.3, role: '中气' },
    { gan: '辛', weight: 0.1, role: '余气' }
  ],
  寅: [
    { gan: '甲', weight: 0.6, role: '本气' },
    { gan: '丙', weight: 0.3, role: '中气' },
    { gan: '戊', weight: 0.1, role: '余气' }
  ],
  卯: [{ gan: '乙', weight: 1, role: '本气' }],
  辰: [
    { gan: '戊', weight: 0.6, role: '本气' },
    { gan: '乙', weight: 0.3, role: '中气' },
    { gan: '癸', weight: 0.1, role: '余气' }
  ],
  巳: [
    { gan: '丙', weight: 0.6, role: '本气' },
    { gan: '庚', weight: 0.3, role: '中气' },
    { gan: '戊', weight: 0.1, role: '余气' }
  ],
  午: [
    { gan: '丁', weight: 0.7, role: '本气' },
    { gan: '己', weight: 0.3, role: '中气' }
  ],
  未: [
    { gan: '己', weight: 0.6, role: '本气' },
    { gan: '丁', weight: 0.3, role: '中气' },
    { gan: '乙', weight: 0.1, role: '余气' }
  ],
  申: [
    { gan: '庚', weight: 0.6, role: '本气' },
    { gan: '壬', weight: 0.3, role: '中气' },
    { gan: '戊', weight: 0.1, role: '余气' }
  ],
  酉: [{ gan: '辛', weight: 1, role: '本气' }],
  戌: [
    { gan: '戊', weight: 0.6, role: '本气' },
    { gan: '辛', weight: 0.3, role: '中气' },
    { gan: '丁', weight: 0.1, role: '余气' }
  ],
  亥: [
    { gan: '壬', weight: 0.7, role: '本气' },
    { gan: '甲', weight: 0.3, role: '中气' }
  ]
}

/** 月令对五行的旺相休囚死 */
export type WangXiang = '旺' | '相' | '休' | '囚' | '死'

/** 旺相休囚死 → 强弱加减系数 */
export const WANGXIANG_SCORE: Record<WangXiang, number> = {
  旺: 18,
  相: 10,
  休: 0,
  囚: -8,
  死: -14
}

/**
 * 月令旺相休囚死（四季土月单独取土旺）。
 * @param monthZhi 月支
 * @param wx 所测五行
 */
export function monthWangXiang(monthZhi: DiZhi, wx: WuXing): WangXiang {
  const table = (order: WuXing[]): Record<WuXing, WangXiang> => {
    const names: WangXiang[] = ['旺', '相', '休', '囚', '死']
    return {
      [order[0]]: names[0],
      [order[1]]: names[1],
      [order[2]]: names[2],
      [order[3]]: names[3],
      [order[4]]: names[4]
    } as Record<WuXing, WangXiang>
  }
  // 旺、相、休、囚、死 五行序
  if (monthZhi === '寅' || monthZhi === '卯') return table(['木', '火', '水', '金', '土'])[wx]
  if (monthZhi === '巳' || monthZhi === '午') return table(['火', '土', '木', '水', '金'])[wx]
  if (monthZhi === '申' || monthZhi === '酉') return table(['金', '水', '土', '火', '木'])[wx]
  if (monthZhi === '亥' || monthZhi === '子') return table(['水', '木', '金', '土', '火'])[wx]
  // 辰戌丑未：土旺金相火休木囚水死
  return table(['土', '金', '火', '木', '水'])[wx]
}

/**
 * 公历小时 → 时辰地支（钟表近似，未做真太阳时）。
 * @param hour 0..23
 */
export function hourToZhi(hour: number): DiZhi {
  if (hour < 0 || hour > 23) throw new Error(`小时超出范围: ${hour}`)
  if (hour === 23 || hour < 1) return '子'
  const map: DiZhi[] = ['丑', '丑', '寅', '寅', '卯', '卯', '辰', '辰', '巳', '巳', '午', '午', '未', '未', '申', '申', '酉', '酉', '戌', '戌', '亥', '亥']
  return map[hour - 1]
}

/**
 * 判断五行 a 对 b 的关系。
 * @param a 主动五行
 * @param b 被动五行
 */
export function wuxingRelation(
  a: WuXing,
  b: WuXing
): 'same' | 'sheng' | 'ke' | 'beisheng' | 'beike' {
  if (a === b) return 'same'
  if (SHENG[a] === b) return 'sheng'
  if (KE[a] === b) return 'ke'
  if (SHENG[b] === a) return 'beisheng'
  return 'beike'
}
