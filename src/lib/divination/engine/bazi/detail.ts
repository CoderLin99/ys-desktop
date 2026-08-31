/**
 * 八字细盘扩展：纳音、十二长生、空亡标注、五行色、起运摘要。
 * 对照常见排盘软件的「基本排盘」行结构，教学精度。
 */
import {
  DIZHI,
  DIZHI_WUXING,
  JIAZI_60,
  TIANGAN,
  TIANGAN_WUXING,
  TIANGAN_YANG,
  type CangGanRole,
  type DiZhi,
  type TianGan,
  type WuXing
} from '../constants'
import type { BaZiChart, Pillar } from './chart'
import { kongWangOfDay, kongWangOfGz } from './shensha'
import { shishenOf } from './shishen'
import { yearGanZhi } from './trend'
import { computeQiYun } from './yun'

/** 十二长生名称（顺排） */
export const CHANGSHENG_NAMES = [
  '长生',
  '沐浴',
  '冠带',
  '临官',
  '帝旺',
  '衰',
  '病',
  '死',
  '墓',
  '绝',
  '胎',
  '养'
] as const

export type ChangSheng = (typeof CHANGSHENG_NAMES)[number]

/** 五行展示色：走主题 CSS 变量，日夜/天气可跟换 */
export const WUXING_COLOR: Record<WuXing, string> = {
  木: 'var(--wx-wood)',
  火: 'var(--wx-fire)',
  土: 'var(--wx-earth)',
  金: 'var(--wx-metal)',
  水: 'var(--wx-water)'
}

/** 五行对应 CSS class（模板用） */
export const WUXING_CLASS: Record<WuXing, string> = {
  木: 'wx-木',
  火: 'wx-火',
  土: 'wx-土',
  金: 'wx-金',
  水: 'wx-水'
}

/** 六十甲子纳音（与 JIAZI_60 同序，两干支一组同纳音） */
const NAYIN_PAIRS = [
  '海中金',
  '炉中火',
  '大林木',
  '路旁土',
  '剑锋金',
  '山头火',
  '涧下水',
  '城头土',
  '白蜡金',
  '杨柳木',
  '泉中水',
  '屋上土',
  '霹雳火',
  '松柏木',
  '长流水',
  '砂中金',
  '山下火',
  '平地木',
  '壁上土',
  '金箔金',
  '覆灯火',
  '天河水',
  '大驿土',
  '钗钏金',
  '桑柘木',
  '大溪水',
  '砂中土',
  '天上火',
  '石榴木',
  '大海水'
] as const

/**
 * 查干支纳音。
 * @param gz 干支两字
 */
export function nayinOf(gz: string): string {
  const idx = JIAZI_60.indexOf(gz)
  if (idx < 0) return '—'
  return NAYIN_PAIRS[Math.floor(idx / 2)]
}

/** 各天干「长生」所在地支 */
const CHANGSHENG_START: Record<TianGan, DiZhi> = {
  甲: '亥',
  乙: '午',
  丙: '寅',
  丁: '酉',
  戊: '寅',
  己: '酉',
  庚: '巳',
  辛: '子',
  壬: '申',
  癸: '卯'
}

/**
 * 十二长生：某干相对某支的状态。
 * 阳干顺行，阴干逆行。
 * @param gan 天干
 * @param zhi 地支
 */
export function changShengOf(gan: TianGan, zhi: DiZhi): ChangSheng {
  const start = CHANGSHENG_START[gan]
  const startIdx = DIZHI.indexOf(start)
  const zhiIdx = DIZHI.indexOf(zhi)
  const yang = TIANGAN_YANG[gan]
  const offset = yang
    ? (zhiIdx - startIdx + 12) % 12
    : (startIdx - zhiIdx + 12) % 12
  return CHANGSHENG_NAMES[offset]
}

/**
 * 天干五行色。
 * @param gan 天干
 */
export function ganColor(gan: TianGan): string {
  return WUXING_COLOR[TIANGAN_WUXING[gan]]
}

/**
 * 天干所属五行。
 * @param gan 天干
 */
export function ganWuXing(gan: TianGan): WuXing {
  return TIANGAN_WUXING[gan]
}

/**
 * 地支五行色。
 * @param zhi 地支
 */
export function zhiColor(zhi: DiZhi): string {
  return WUXING_COLOR[DIZHI_WUXING[zhi]]
}

/**
 * 地支本气五行。
 * @param zhi 地支
 */
export function zhiWuXing(zhi: DiZhi): WuXing {
  return DIZHI_WUXING[zhi]
}

/** 单柱细盘行 */
export interface PillarDetail {
  /** 柱标签 */
  label: '年' | '月' | '日' | '时'
  /** 是否缺柱 */
  missing: boolean
  /** 主星（天干十神；日柱为日主/元男元女） */
  mainStar: string
  gan?: TianGan
  zhi?: DiZhi
  gz?: string
  /** 藏干（含本气中气余气，便于对照细盘） */
  canggan: { gan: TianGan; shiShen: string; role: CangGanRole; weight: number }[]
  /** 副星（藏干十神文案） */
  subStars: string[]
  /** 星运：日主在该支的十二长生 */
  xingYun: string
  /** 自坐：本柱天干在本支的十二长生 */
  ziZuo: string
  /** 该柱地支是否落「日旬」空亡 */
  kongWang: boolean
  /** 本柱干支所在旬的空亡两支（细盘展示，如「子丑」） */
  kongWangText: string
  /** 纳音 */
  naYin: string
  /** 本柱神煞名列表 */
  shenSha: string[]
}

/** 细盘总结果 */
export interface DetailChart {
  /** 展示用姓名 */
  name: string
  /** 乾造 / 坤造 */
  genderLabel: string
  /** 日主空亡两支 */
  dayKongWang: DiZhi[]
  /** 四柱细盘（时柱可能 missing） */
  pillars: PillarDetail[]
  /** 起运摘要（教学近似） */
  qiYun: string
  /** 大运干支列表（前 8 步） */
  daYun: { gz: string; ganShiShen: string; ageFrom: number }[]
  /** 近流年若干 */
  liuNian: { year: number; gz: string; ganShiShen: string }[]
}

/**
 * 组装单柱细盘。
 * @param label 柱名
 * @param pillar 柱数据
 * @param dayMaster 日主
 * @param dayKw 日空亡
 * @param gender 性别
 * @param shenShaNames 本柱神煞
 */
function pillarDetail(
  label: '年' | '月' | '日' | '时',
  pillar: Pillar | null,
  dayMaster: TianGan,
  dayKw: DiZhi[],
  gender: 'male' | 'female',
  shenShaNames: string[]
): PillarDetail {
  if (!pillar) {
    return {
      label,
      missing: true,
      mainStar: '未知',
      canggan: [],
      subStars: [],
      xingYun: '—',
      ziZuo: '—',
      kongWang: false,
      kongWangText: '—',
      naYin: '—',
      shenSha: []
    }
  }
  const mainStar =
    label === '日' ? (gender === 'male' ? '元男' : '元女') : String(pillar.ganShiShen)
  return {
    label,
    missing: false,
    mainStar,
    gan: pillar.gan,
    zhi: pillar.zhi,
    gz: pillar.gz,
    canggan: pillar.canggan.map((c) => ({
      gan: c.gan,
      shiShen: c.shiShen,
      role: c.role,
      weight: c.weight
    })),
    subStars: pillar.canggan.map((c) => `${c.shiShen}·${c.role}`),
    xingYun: changShengOf(dayMaster, pillar.zhi),
    ziZuo: changShengOf(pillar.gan, pillar.zhi),
    kongWang: dayKw.includes(pillar.zhi),
    kongWangText: kongWangOfGz(pillar.gz).join(''),
    naYin: nayinOf(pillar.gz),
    shenSha: shenShaNames
  }
}

/**
 * 起运摘要：有公历生日走节气折算，否则退回约 8 岁。
 * 保留此函数以免旧调用方断裂；新盘请直接用 computeQiYun。
 * @param birthYear 出生年
 * @param gender 性别
 */
export function approxQiYunText(birthYear: number, gender: 'male' | 'female'): string {
  if (birthYear <= 0) return '手工盘未推起运岁数。'
  return `起运需完整公历生日才能按节气折算；仅有年份时仍按约 8 岁近似。按${gender === 'male' ? '乾造' : '坤造'}顺逆排运。`
}

/**
 * 生成细盘数据包。
 * @param chart 八字盘
 * @param options 姓名、性别、神煞按柱映射、流年起年
 */
export function buildDetailChart(
  chart: BaZiChart,
  options: {
    name?: string
    gender: 'male' | 'female'
    /** 柱标签 → 神煞名 */
    shenShaByPillar: Record<'年' | '月' | '日' | '时', string[]>
    fromYear?: number
  }
): DetailChart {
  const dayKw = kongWangOfDay(chart.pillars.day.gz)
  const genderLabel = options.gender === 'male' ? '乾造' : '坤造'
  const order: Array<{ key: 'year' | 'month' | 'day' | 'hour'; label: '年' | '月' | '日' | '时' }> = [
    { key: 'year', label: '年' },
    { key: 'month', label: '月' },
    { key: 'day', label: '日' },
    { key: 'hour', label: '时' }
  ]

  const pillars = order.map(({ key, label }) =>
    pillarDetail(
      label,
      chart.pillars[key],
      chart.dayMaster,
      dayKw,
      options.gender,
      options.shenShaByPillar[label] ?? []
    )
  )

  const yun = computeQiYun(chart, options.gender, 8)
  const daYun = yun.steps.map((step) => ({
    gz: step.gz,
    ganShiShen: shishenOf(chart.dayMaster, step.gz[0] as TianGan),
    ageFrom: step.ageFrom
  }))

  const fromYear = options.fromYear ?? new Date().getFullYear()
  const liuNian = Array.from({ length: 10 }, (_, i) => {
    const y = fromYear + i
    const gz = yearGanZhi(y)
    return {
      year: y,
      gz,
      ganShiShen: shishenOf(chart.dayMaster, gz[0] as TianGan)
    }
  })

  return {
    name: (options.name ?? '').trim() || '未命名',
    genderLabel,
    dayKongWang: dayKw,
    pillars,
    qiYun: yun.text,
    daYun,
    liuNian
  }
}

void TIANGAN
