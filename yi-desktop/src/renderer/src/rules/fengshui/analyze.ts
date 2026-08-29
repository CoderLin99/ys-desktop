/**
 * 阳宅综合推算：坐向 + 八宅 + 流年/流月飞星 → 结构化方位卡。
 */
import { resolveSittingFacing, type SittingFacing } from './compass'
import { analyzeBaZhai, houseMatchesMing, destinyYear, type BaZhaiResult } from './bazhai'
import {
  buildMonthFeiXing,
  buildYearFeiXing,
  type MonthFeiXingResult,
  type YearFeiXingResult
} from './feixing'

/** 综合输入 */
export interface FengShuiInput {
  /** 宅主公历年 */
  year: number
  /** 月 */
  month: number
  /** 日 */
  day: number
  /** 性别 */
  gender: 'male' | 'female'
  /** 朝向角（门向外，正北=0） */
  headingDeg: number
  /** 可选：经度 */
  longitude?: number
  /** 可选：纬度 */
  latitude?: number
  /** 可选：精度（米） */
  accuracy?: number
}

/** 方位建议卡 */
export interface DirectionCard {
  /** 方位八卦 */
  gua: string
  /** 八宅星 */
  baZhaiStar: string
  /** 八宅吉凶 */
  baZhaiLuck: string
  /** 流年星 */
  yearStar: number
  /** 流月星 */
  monthStar: number
  /** 综合提示 */
  tip: string
}

/** 综合结果 */
export interface FengShuiResult {
  sittingFacing: SittingFacing
  baZhai: BaZhaiResult
  /** 流年飞星 */
  feixing: YearFeiXingResult
  /** 流月飞星 */
  monthFeixing: MonthFeiXingResult
  /** 宅命与坐山是否同组 */
  houseMatch: boolean
  cards: DirectionCard[]
  /** 纬度（若有） */
  latitude?: number
  /** 经度（若有） */
  longitude?: number
  /** GPS 精度米（若有） */
  accuracy?: number
  /** 供 AI / 展示的摘要行 */
  bullets: string[]
  /** RAG 查询用关键词 */
  ragQuery: string
}

/**
 * 执行阳宅综合推算（年盘+月盘+定位信息写入结果）。
 * @param input 宅主与朝向
 */
export function analyzeFengShui(input: FengShuiInput): FengShuiResult {
  const sittingFacing = resolveSittingFacing(input.headingDeg)
  const baZhai = analyzeBaZhai(input)
  const now = new Date()
  const flowYear = destinyYear(now.getFullYear(), now.getMonth() + 1, now.getDate())
  const flowMonth = now.getMonth() + 1
  const feixing = buildYearFeiXing(flowYear)
  const monthFeixing = buildMonthFeiXing(flowYear, flowMonth)
  const houseMatch = houseMatchesMing(baZhai.group, sittingFacing.sittingGua)

  const yearByGua = new Map(feixing.cells.filter((c) => c.gua !== '中').map((c) => [c.gua, c]))
  const monthByGua = new Map(
    monthFeixing.cells.filter((c) => c.gua !== '中').map((c) => [c.gua, c])
  )

  const cards: DirectionCard[] = baZhai.sectors.map((s) => {
    const yx = yearByGua.get(s.gua)
    const mx = monthByGua.get(s.gua)
    const yearPart = yx ? `流年${yx.star}：${yx.tip}` : ''
    const monthPart = mx ? `流月${mx.star}：${mx.tip}` : ''
    return {
      gua: s.gua,
      baZhaiStar: s.star.name,
      baZhaiLuck: s.star.luck,
      yearStar: yx?.star ?? 0,
      monthStar: mx?.star ?? 0,
      tip: [s.star.tip, yearPart, monthPart].filter(Boolean).join('；')
    }
  })

  const hasLoc = input.latitude != null && input.longitude != null
  const locLines: string[] = []
  if (hasLoc) {
    locLines.push(
      `定位坐标：纬度 ${input.latitude!.toFixed(5)}，经度 ${input.longitude!.toFixed(5)}。`
    )
    if (input.accuracy != null) {
      locLines.push(`定位精度约 ${Math.round(input.accuracy)} 米。`)
    }
  } else {
    locLines.push('未使用 GPS 坐标，朝向为手填或罗盘读数；形峦实勘不在盘内。')
  }

  const bullets = [
    ...locLines,
    `坐${sittingFacing.sitting}向${sittingFacing.facing}（坐${sittingFacing.sittingGua}向${sittingFacing.facingGua}，朝向角约 ${Math.round(sittingFacing.headingDeg)}°）。`,
    houseMatch
      ? '坐山与宅命同组，八宅相配较顺，吉位宜作常用活动与床灶布置参考。'
      : '坐山与宅命不同组，宜以室内摆场补救吉位，勿仅凭大门朝向断吉凶。',
    ...baZhai.summary,
    ...feixing.summary,
    ...monthFeixing.summary,
    '综合说明：先定坐向与宅命吉凶位，再叠流年/流月飞星作当令加减；重大装修避开五黄方。'
  ]

  const ragQuery = [
    '阳宅',
    '宅经',
    sittingFacing.sittingGua,
    sittingFacing.facingGua,
    baZhai.mingGuaName,
    houseMatch ? '东四西四相配' : '宅命不配',
    ...cards.filter((c) => c.baZhaiLuck === '吉').map((c) => c.gua + '吉'),
    '流年飞星',
    '流月飞星',
    '宜忌',
    '方位'
  ].join(' ')

  return {
    sittingFacing,
    baZhai,
    feixing,
    monthFeixing,
    houseMatch,
    cards,
    latitude: input.latitude,
    longitude: input.longitude,
    accuracy: input.accuracy,
    bullets,
    ragQuery
  }
}
