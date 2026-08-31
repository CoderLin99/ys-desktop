/**
 * 二十四山 / 坐向：由罗盘朝向角（度，正北=0 顺时针）推坐山向首。
 */

/** 二十四山名称（从子起顺时针） */
export const ERSHISI_SHAN = [
  '子',
  '癸',
  '丑',
  '艮',
  '寅',
  '甲',
  '卯',
  '乙',
  '辰',
  '巽',
  '巳',
  '丙',
  '午',
  '丁',
  '未',
  '坤',
  '申',
  '庚',
  '酉',
  '辛',
  '戌',
  '乾',
  '亥',
  '壬'
] as const

export type ShanName = (typeof ERSHISI_SHAN)[number]

/** 坐向结果 */
export interface SittingFacing {
  /** 朝向角 0–360（门/立面朝向 ≈ 向） */
  headingDeg: number
  /** 向山 */
  facing: ShanName
  /** 坐山（向的对宫） */
  sitting: ShanName
  /** 八卦宫位（向所属） */
  facingGua: string
  /** 坐所属八卦 */
  sittingGua: string
}

/** 山 → 八卦 */
const SHAN_TO_GUA: Record<ShanName, string> = {
  子: '坎',
  癸: '坎',
  丑: '艮',
  艮: '艮',
  寅: '艮',
  甲: '震',
  卯: '震',
  乙: '震',
  辰: '巽',
  巽: '巽',
  巳: '巽',
  丙: '离',
  午: '离',
  丁: '离',
  未: '坤',
  坤: '坤',
  申: '坤',
  庚: '兑',
  酉: '兑',
  辛: '兑',
  戌: '乾',
  乾: '乾',
  亥: '乾',
  壬: '坎'
}

/**
 * 将角度规范到 [0, 360)。
 * @param deg 原始角度
 */
export function normalizeDeg(deg: number): number {
  let d = deg % 360
  if (d < 0) d += 360
  return d
}

/**
 * 朝向角 → 二十四山索引（每山 15°，子山中心在 0°）。
 * @param headingDeg 正北为 0，顺时针
 */
export function headingToShanIndex(headingDeg: number): number {
  const d = normalizeDeg(headingDeg)
  // 子山中心 0°，区间 [-7.5, 7.5) → 加 7.5 后整除 15
  return Math.floor((d + 7.5) / 15) % 24
}

/**
 * 由朝向（向）推坐向。
 * @param headingDeg 设备朝向 / 房屋朝向（门向外方向）
 */
export function resolveSittingFacing(headingDeg: number): SittingFacing {
  const facingIdx = headingToShanIndex(headingDeg)
  const sittingIdx = (facingIdx + 12) % 24
  const facing = ERSHISI_SHAN[facingIdx]
  const sitting = ERSHISI_SHAN[sittingIdx]
  return {
    headingDeg: normalizeDeg(headingDeg),
    facing,
    sitting,
    facingGua: SHAN_TO_GUA[facing],
    sittingGua: SHAN_TO_GUA[sitting]
  }
}
