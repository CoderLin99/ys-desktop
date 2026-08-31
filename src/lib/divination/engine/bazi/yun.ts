/**
 * 节气起运：用 lunar-javascript 的出生到下一（或上一）节间距折算岁数。
 *
 * 阳男阴女顺排、阴男阳女逆排；与手工「一律 8 岁起运」相比，早运/晚运会差好几岁。
 * 手工盘无公历生日时退回月柱顺逆近似，避免空白。
 */
import { Solar } from 'lunar-javascript'
import { JIAZI_60, TIANGAN_YANG, type TianGan } from '../constants'
import type { BaZiChart } from './chart'
import { makeEvidence, type RuleEvidence } from './evidence'
import { getMetricGloss, tableVersionNote } from './tables/load'

/** 一步已清洗的大运（跳过童限空干支） */
export interface YunStep {
  /** 干支 */
  gz: string
  /** 起运周岁 */
  ageFrom: number
  /** 本步结束周岁 */
  ageTo: number
  /** 起始公历年；手工盘为 0 */
  startYear: number
  /** 结束公历年 */
  endYear: number
}

/** 起运总结果 */
export interface QiYunResult {
  /** 起运间隔年 */
  startYears: number
  /** 起运间隔月 */
  startMonths: number
  /** 起运间隔日 */
  startDays: number
  /** 第一运周岁 */
  startAge: number
  /** 细盘展示文案 */
  text: string
  /** 大运步（默认 8 步） */
  steps: YunStep[]
  /** lunar=节气折算；fallback=无生日时的月柱顺逆 */
  source: 'lunar' | 'fallback'
  /** 可复盘证据 */
  evidence: RuleEvidence
}

/**
 * 按年干阴阳与性别决定大运顺逆（阳男阴女顺，阴男阳女逆）。
 * @param yearGan 年干
 * @param gender 乾坤
 */
export function daYunForward(yearGan: TianGan, gender: 'male' | 'female'): boolean {
  const yangYear = TIANGAN_YANG[yearGan]
  return (gender === 'male' && yangYear) || (gender === 'female' && !yangYear)
}

/**
 * 无公历生日时：从月柱下一柱起顺/逆排，岁数按 8+10n 近似。
 * 只给手工盘用，避免「没有节气可折」时细盘空白。
 * @param chart 盘
 * @param gender 乾坤
 * @param count 步数
 */
function fallbackYun(chart: BaZiChart, gender: 'male' | 'female', count: number): QiYunResult {
  const forward = daYunForward(chart.pillars.year.gan, gender)
  let idx = JIAZI_60.indexOf(chart.pillars.month.gz)
  if (idx < 0) idx = 0
  const steps: YunStep[] = []
  for (let i = 0; i < count; i++) {
    idx = forward ? (idx + 1) % 60 : (idx - 1 + 60) % 60
    const ageFrom = 8 + i * 10
    steps.push({
      gz: JIAZI_60[idx],
      ageFrom,
      ageTo: ageFrom + 9,
      startYear: 0,
      endYear: 0
    })
  }
  return {
    startYears: 8,
    startMonths: 0,
    startDays: 0,
    startAge: 8,
    text: `手工盘无公历生日，起运按约 8 岁近似（${forward ? '顺' : '逆'}排）。`,
    steps,
    source: 'fallback',
    evidence: makeEvidence({
      id: 'qiyun',
      value: '约8岁起运（近似）',
      rule: `无公历生日退回月柱顺逆近似（${tableVersionNote()}）`,
      basis: `年干${chart.pillars.year.gan}${forward ? '顺' : '逆'}排；首运约8岁`,
      steps: [
        `年干${chart.pillars.year.gan}·${gender === 'male' ? '乾' : '坤'}→${forward ? '顺' : '逆'}`,
        '无节气可折，按8+10n近似'
      ],
      gloss: getMetricGloss('起运')
    })
  }
}

/**
 * 从公历八字盘计算起运与大运序列。
 * @param chart 八字盘（须有 solar.year 才能走节气）
 * @param gender 乾坤
 * @param count 需要的大运步数
 */
export function computeQiYun(
  chart: BaZiChart,
  gender: 'male' | 'female',
  count = 8
): QiYunResult {
  if (chart.solar.year <= 0) return fallbackYun(chart, gender, count)

  const hour = chart.hourUnknown ? 12 : (chart.solar.hour ?? 12)
  const minute = chart.hourUnknown ? 0 : chart.solar.minute
  const eight = Solar.fromYmdHms(
    chart.solar.year,
    chart.solar.month,
    chart.solar.day,
    hour,
    minute,
    0
  )
    .getLunar()
    .getEightChar()

  // lunar-javascript：1=男 0=女；缺时用正午，避免默认 0 点把起运拉偏
  const yun = eight.getYun(gender === 'male' ? 1 : 0)
  const startYears = yun.getStartYear()
  const startMonths = yun.getStartMonth()
  const startDays = yun.getStartDay()

  const steps: YunStep[] = []
  for (const d of yun.getDaYun()) {
    const gz = String(d.getGanZhi() || '')
    if (gz.length < 2) continue
    steps.push({
      gz,
      ageFrom: d.getStartAge(),
      ageTo: d.getEndAge(),
      startYear: d.getStartYear(),
      endYear: d.getEndYear()
    })
    if (steps.length >= count) break
  }

  if (!steps.length) return fallbackYun(chart, gender, count)

  const first = steps[0]
  const genderLabel = gender === 'male' ? '乾造' : '坤造'
  const forward = daYunForward(chart.pillars.year.gan, gender)
  const text = `起运约出生后 ${startYears}年${startMonths}月${startDays}日（节气间距折算）· 约 ${first.startYear} 年（${first.ageFrom}岁）交${first.gz}大运。按${genderLabel}${forward ? '顺' : '逆'}排。`

  return {
    startYears,
    startMonths,
    startDays,
    startAge: first.ageFrom,
    text,
    steps,
    source: 'lunar',
    evidence: makeEvidence({
      id: 'qiyun',
      value: `${first.ageFrom}岁交${first.gz}`,
      rule: `阳男阴女顺、阴男阳女逆；节气间距折算（${tableVersionNote()}）`,
      basis: text,
      steps: [
        `年干${chart.pillars.year.gan}·${genderLabel}→${forward ? '顺' : '逆'}排`,
        `距节气 ${startYears}年${startMonths}月${startDays}日`,
        `折算约${first.ageFrom}岁交${first.gz}（${first.startYear}年）`
      ],
      gloss: getMetricGloss('起运')
    })
  }
}

/**
 * 按周岁（公历年−出生年）落在哪一步大运。
 * 起运前落到第一步并视为童限叠运，避免流年无大运可乘。
 * @param steps 大运步
 * @param age 周岁近似（当年−出生年）
 */
export function daYunAtAge(steps: YunStep[], age: number): YunStep {
  if (!steps.length) {
    return { gz: '甲子', ageFrom: 0, ageTo: 9, startYear: 0, endYear: 0 }
  }
  const hit = [...steps].reverse().find((s) => age >= s.ageFrom)
  return hit ?? steps[0]
}

/**
 * 仅排出大运干支（测试与手工盘兼容旧接口）。
 * @param chart 盘
 * @param gender 乾坤
 * @param count 步数
 */
export function listDaYunGz(chart: BaZiChart, gender: 'male' | 'female', count = 8): string[] {
  return computeQiYun(chart, gender, count).steps.map((s) => s.gz)
}
