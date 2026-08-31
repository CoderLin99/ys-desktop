/**
 * 大运 / 流年 / 流月日历：细盘式点选到年甚至月，并把时段注入命师上下文。
 * 义理取《八字大运详解》《大运学图说》《命理预测与大限运势》大意（原创摘要，禁止原文照抄）。
 * 断语用现代口径：职场/现金流/进修考证，不写科举钦点、学历光环或具体私人事件。
 */
import { Solar } from 'lunar-javascript'
import { TIANGAN_WUXING, type DiZhi, type TianGan, type WuXing } from '../constants'
import { shishenOf, type ShiShen } from './shishen'
import { yearGanZhi } from './trend'
import type { YunStep } from './yun'

/** 岁运书目义理摘要（非原文） */
export interface YunBookSummary {
  /** 书目短 id */
  id: string
  /** 显示书名 */
  title: string
  /** 可编码的原创大意 */
  gist: string
}

/** 一步大运上的公历流年 */
export interface LiuNianYear {
  /** 公历年 */
  year: number
  /** 立春后年柱 */
  gz: string
  /** 年干十神 */
  ganShiShen: ShiShen | '—'
  /** 周岁近似（当年−出生年） */
  age: number
  /** 喜用粗档 */
  band: '喜' | '平' | '忌'
  /** 现代口径短断 */
  hint: string
}

/** 一流年下的节令流月 */
export interface LiuYueItem {
  /** 1–12，寅月起 */
  index: number
  /** 节令名 */
  jie: string
  /** 月支 */
  zhi: string
  /** 交节公历日 YYYY-MM-DD */
  startSolar: string
  /** 交节时刻 HH:mm；历书无时刻则为 00:00 */
  startHm: string
  /** 下一节令公历日（本流月止于该日前） */
  endSolar: string
  /** 相对对照日是否落在交节 ±3 日窗口 */
  jiaoYun: boolean
  /** 对照日是否落在本流月内 */
  current: boolean
  /** 大运+流年+流月三层叠加短读 */
  layerHint: string
  /** 月柱干支 */
  gz: string
  /** 月干十神 */
  ganShiShen: ShiShen | '—'
  /** 现代口径短断（含三层与交运） */
  hint: string
}

/** 流月叠加上下文：大运、日支、对照日 */
export interface LiuYueOverlay {
  /** 当前大运干支 */
  daYunGz?: string
  /** 流年干支；缺省按公历年立春后年柱 */
  yearGz?: string
  /** 日支，用于冲日支 */
  natalDayZhi?: DiZhi
  /** 对照日，默认今天 */
  asOf?: Date
}

/** 日历点选结果，供命师上下文 */
export interface YunCalendarPick {
  /** 大运步 */
  daYun: YunStep
  /** 点选流年；未点则为整步大运 */
  year?: LiuNianYear
  /** 点选流月；未点则只到年 */
  month?: LiuYueItem
}

/** 节令起月：立春寅、惊蛰卯……小寒丑 */
const JIE_YUE: { jie: string; zhi: string }[] = [
  { jie: '立春', zhi: '寅' },
  { jie: '惊蛰', zhi: '卯' },
  { jie: '清明', zhi: '辰' },
  { jie: '立夏', zhi: '巳' },
  { jie: '芒种', zhi: '午' },
  { jie: '小暑', zhi: '未' },
  { jie: '立秋', zhi: '申' },
  { jie: '白露', zhi: '酉' },
  { jie: '寒露', zhi: '戌' },
  { jie: '立冬', zhi: '亥' },
  { jie: '大雪', zhi: '子' },
  { jie: '小寒', zhi: '丑' }
]

/** 地支六冲，用于流月冲动大运/日支 */
const LIU_CHONG: Record<string, string> = {
  子: '午',
  午: '子',
  丑: '未',
  未: '丑',
  寅: '申',
  申: '寅',
  卯: '酉',
  酉: '卯',
  辰: '戌',
  戌: '辰',
  巳: '亥',
  亥: '巳'
}

/** 交节前后视为换月窗口的天数 */
const JIAO_YUN_DAYS = 3

/** 节令找不到历书时的公历近似（月/日），仅兜底 */
const JIE_FALLBACK_MD: Record<string, [number, number]> = {
  立春: [2, 4],
  惊蛰: [3, 6],
  清明: [4, 5],
  立夏: [5, 6],
  芒种: [6, 6],
  小暑: [7, 7],
  立秋: [8, 8],
  白露: [9, 8],
  寒露: [10, 8],
  立冬: [11, 7],
  大雪: [12, 7],
  小寒: [1, 6]
}

/**
 * 三本岁运书的原创义理摘要。只取可编码大意，禁止诗赋原文。
 */
export const YUN_BOOK_SUMMARIES: YunBookSummary[] = [
  {
    id: 'dayun-xiangjie',
    title: '八字大运详解',
    gist: '大运是十年气运总纲：先看这一步对日主的生克、与喜用是否到位，再落到流年细节。换运如换季，不宜用单年否定十年主题。'
  },
  {
    id: 'dayun-tushuo',
    title: '大运学图说',
    gist: '岁运宜对照看：大运定阶段起伏，流年是叠加的应期窗口。图解的价值在「哪一步转势」，而不是把某年写成终身判决。'
  },
  {
    id: 'daxian-yunshi',
    title: '命理预测与大限运势',
    gist: '大限/大运论阶段主题（事业、财、健康、关系），预测应落在「这段时间什么议题更显」。禁止编造车祸、中奖日期等私人事件。'
  }
]

/**
 * 把三本书摘要压成命师可吃的短知识。
 * @returns 多行文本
 */
export function formatYunBookPack(): string {
  return [
    '【岁运义理】取大运详解 / 大运学图说 / 大限运势大意，非原文。',
    ...YUN_BOOK_SUMMARIES.map((b) => `《${b.title}》${b.gist}`)
  ].join('\n')
}

/**
 * 十神 → 现代议题（不当科举、不当学历光环）。
 * @param ss 十神
 * @returns 议题短句
 */
function modernTopicOf(ss: ShiShen): string {
  const map: Record<ShiShen, string> = {
    正官: '职场规则、考核、责任编制类议题',
    七杀: '压力挑战、竞聘破局，防硬刚与过劳',
    正印: '进修考证、平台资质（不等于学历高或会读书）',
    偏印: '偏门思路、非主流技能，决策宜收束',
    食神: '表达、技艺、作品变现',
    伤官: '创新发声、不服约束，注意分寸与口舌',
    比肩: '合作并行、同辈对照，边界要清',
    劫财: '行动力与分利，防冲动破财',
    正财: '正当收入、回款与开销节奏',
    偏财: '机会财、兼职偏业，投资宜谨慎'
  }
  return map[ss]
}

/**
 * 按喜用粗判流年/流月档位与短断。
 * @param gan 天干
 * @param dayMaster 日主
 * @param useful 喜用五行
 * @param avoid 忌神五行
 * @returns 档位与hint
 */
function judgeGanTone(
  gan: TianGan,
  dayMaster: TianGan,
  useful: WuXing[],
  avoid: WuXing[]
): { ss: ShiShen; band: LiuNianYear['band']; hint: string } {
  const ss = shishenOf(dayMaster, gan)
  const wx = TIANGAN_WUXING[gan]
  const hitUseful = useful.includes(wx)
  const hitAvoid = avoid.includes(wx)
  const band: LiuNianYear['band'] = hitUseful ? '喜' : hitAvoid ? '忌' : '平'
  const mood =
    band === '喜' ? '喜用到位，议题较顺，仍须自己推进' : band === '忌' ? '忌神当值，宜守、防过劳或口舌' : '中性时段，成事看选择与执行'
  return { ss, band, hint: `${modernTopicOf(ss)}。${mood}。` }
}

/**
 * 从干支串取出天干；非法则空。
 * @param gz 干支
 * @returns 天干或空
 */
function ganOfGz(gz: string): TianGan | null {
  const g = gz.charAt(0) as TianGan
  return '甲乙丙丁戊己庚辛壬癸'.includes(g) ? g : null
}

/**
 * 一步大运覆盖的公历年（节气起运有年；手工盘用出生年+岁数近似）。
 * @param step 大运步
 * @param birthYear 出生公历年；手工盘可为 0
 * @returns 升序年份
 */
export function yearsOfYunStep(step: YunStep, birthYear: number): number[] {
  if (step.startYear > 0 && step.endYear >= step.startYear) {
    const years: number[] = []
    for (let y = step.startYear; y <= step.endYear; y++) years.push(y)
    return years
  }
  const base = birthYear > 0 ? birthYear : new Date().getFullYear() - step.ageFrom
  const years: number[] = []
  for (let age = step.ageFrom; age <= step.ageTo; age++) years.push(base + age)
  return years
}

/**
 * 排出一步大运下的流年列表（可点选到年）。
 * @param step 大运步
 * @param birthYear 出生年
 * @param dayMaster 日主
 * @param useful 喜用
 * @param avoid 忌神
 */
export function listLiuNianOfYun(
  step: YunStep,
  birthYear: number,
  dayMaster: TianGan,
  useful: WuXing[],
  avoid: WuXing[]
): LiuNianYear[] {
  return yearsOfYunStep(step, birthYear).map((year) => {
    const gz = yearGanZhi(year)
    const gan = ganOfGz(gz)
    const age = birthYear > 0 ? year - birthYear : step.ageFrom
    if (!gan) {
      return { year, gz, ganShiShen: '—', age, band: '平', hint: '年柱不明，只作年表对照。' }
    }
    const tone = judgeGanTone(gan, dayMaster, useful, avoid)
    return {
      year,
      gz,
      ganShiShen: tone.ss,
      age,
      band: tone.band,
      hint: tone.hint
    }
  })
}

/**
 * 读取历书节气表；失败则空对象。
 * @param year 公历年
 */
function jieQiTableOf(year: number): Record<string, Solar> {
  try {
    const lunar = Solar.fromYmd(year, 6, 15).getLunar() as unknown as {
      getJieQiTable?: () => Record<string, Solar>
    }
    const table = lunar.getJieQiTable?.()
    return table && typeof table === 'object' ? table : {}
  } catch {
    return {}
  }
}

/**
 * 解析节令对应的公历时刻（优先历书交节时分）。
 * @param year 流年公历年（立春所在年）
 * @param jie 节令名
 */
function solarOfJie(year: number, jie: string): Solar {
  const table = jieQiTableOf(year)
  const hit = table[jie]
  if (hit && typeof hit.getYear === 'function') return hit
  const [m, d] = JIE_FALLBACK_MD[jie] ?? [2, 4]
  const y = jie === '小寒' ? year + 1 : year
  return Solar.fromYmd(y, m, d)
}

/**
 * 两位补零。
 * @param n 数字
 */
function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/**
 * 节气公历日 YYYY-MM-DD。
 * @param solar 历书点
 */
function solarYmd(solar: Solar): string {
  return `${solar.getYear()}-${pad2(solar.getMonth())}-${pad2(solar.getDay())}`
}

/**
 * 节气时刻 HH:mm；无 getHour 时按 00:00。
 * @param solar 历书点
 */
function solarHm(solar: Solar): string {
  const hour = typeof solar.getHour === 'function' ? solar.getHour() : 0
  const minute = typeof solar.getMinute === 'function' ? solar.getMinute() : 0
  return `${pad2(hour)}:${pad2(minute)}`
}

/**
 * 节气本地毫秒，用于交运窗口比较。
 * @param solar 历书点
 */
function solarTimeMs(solar: Solar): number {
  const [h, mi] = solarHm(solar).split(':').map(Number)
  return new Date(solar.getYear(), solar.getMonth() - 1, solar.getDay(), h, mi).getTime()
}

/**
 * 下一节令时刻：本流年最后一步（小寒）接到次年立春。
 * @param year 立春所在公历年
 * @param index 0–11
 */
function nextJieSolar(year: number, index: number): Solar {
  if (index + 1 < JIE_YUE.length) return solarOfJie(year, JIE_YUE[index + 1].jie)
  return solarOfJie(year + 1, '立春')
}

/**
 * 大运 + 流年 + 流月三层叠加（神峰岁运对照大意）。
 * @param monthGz 流月干支
 * @param yearGz 流年干支
 * @param daYunGz 大运干支
 * @param natalDayZhi 日支
 * @param useful 喜用
 * @param avoid 忌神
 */
function layerHintOf(
  monthGz: string,
  yearGz: string,
  daYunGz: string | undefined,
  natalDayZhi: DiZhi | undefined,
  useful: WuXing[],
  avoid: WuXing[]
): string {
  const parts: string[] = []
  const monthGan = ganOfGz(monthGz)
  if (monthGan) {
    const wx = TIANGAN_WUXING[monthGan]
    if (useful.includes(wx)) parts.push('流月叠喜用')
    else if (avoid.includes(wx)) parts.push('流月叠忌神')
  }
  const yearGan = ganOfGz(yearGz)
  if (yearGan && monthGan && TIANGAN_WUXING[yearGan] === TIANGAN_WUXING[monthGan]) {
    parts.push('流年流月同气，当月议题更显')
  }
  if (daYunGz && daYunGz.length >= 2) {
    const dyGan = ganOfGz(daYunGz)
    if (dyGan && monthGan && TIANGAN_WUXING[dyGan] === TIANGAN_WUXING[monthGan]) {
      parts.push('与大运同气')
    }
    if (monthGz.length >= 2 && LIU_CHONG[monthGz[1]] === daYunGz[1]) {
      parts.push('流月冲动大运，阶段议题易翻盘')
    }
  }
  if (natalDayZhi && monthGz.length >= 2 && LIU_CHONG[monthGz[1]] === natalDayZhi) {
    parts.push('流月冲日支，身体或亲密关系议题更显')
  }
  return parts.length
    ? `三层：${parts.join('；')}。`
    : '三层：大运为纲、流年定向、流月只论当月显不显。'
}

/**
 * 一流年下的十二节令流月（交节时刻 + 交运窗口 + 三层叠加）。
 * @param year 公历流年
 * @param dayMaster 日主
 * @param useful 喜用
 * @param avoid 忌神
 * @param overlay 大运/日支/对照日；可空
 */
export function listLiuYueOfYear(
  year: number,
  dayMaster: TianGan,
  useful: WuXing[],
  avoid: WuXing[],
  overlay?: LiuYueOverlay
): LiuYueItem[] {
  const asOf = overlay?.asOf ?? new Date()
  const asOfMs = asOf.getTime()
  const yearGz = overlay?.yearGz ?? yearGanZhi(year)
  const windowMs = JIAO_YUN_DAYS * 24 * 60 * 60 * 1000
  return JIE_YUE.map((row, i) => {
    const solar = solarOfJie(year, row.jie)
    const next = nextJieSolar(year, i)
    const startMs = solarTimeMs(solar)
    const endMs = solarTimeMs(next)
    let gz = '—'
    try {
      gz = solar.getLunar().getEightChar().getMonth() || '—'
    } catch {
      gz = '—'
    }
    const gan = ganOfGz(gz)
    const tone = gan
      ? judgeGanTone(gan, dayMaster, useful, avoid)
      : { ss: '—' as const, band: '平' as const, hint: '月柱不明。' }
    const jiaoYun = Math.abs(asOfMs - startMs) <= windowMs
    const current = asOfMs >= startMs && asOfMs < endMs
    const layerHint = layerHintOf(
      gz,
      yearGz,
      overlay?.daYunGz,
      overlay?.natalDayZhi,
      useful,
      avoid
    )
    const jiaoText = jiaoYun ? '交节三日窗口，气运交接宜观望、少开新局。' : ''
    return {
      index: i + 1,
      jie: row.jie,
      zhi: row.zhi,
      startSolar: solarYmd(solar),
      startHm: solarHm(solar),
      endSolar: solarYmd(next),
      jiaoYun,
      current,
      layerHint,
      gz,
      ganShiShen: tone.ss,
      hint: `${tone.hint}${layerHint}${jiaoText}`
    }
  })
}

/**
 * 默认点到「当前公历年」所在大运；没有则第一步。
 * @param steps 大运
 * @param nowYear 当前年
 * @returns 下标
 */
export function defaultYunIndex(steps: YunStep[], nowYear = new Date().getFullYear()): number {
  const i = steps.findIndex((s) => s.startYear > 0 && nowYear >= s.startYear && nowYear <= s.endYear)
  return i >= 0 ? i : 0
}

/**
 * 某公历年落在哪一步大运上。
 * @param steps 大运
 * @param year 公历年
 * @param birthYear 出生年
 */
function stepOfYear(steps: YunStep[], year: number, birthYear: number): YunStep | undefined {
  const hit = steps.find((s) => yearsOfYunStep(s, birthYear).includes(year))
  if (hit) return hit
  return steps.find((s) => s.startYear > 0 && year >= s.startYear && year <= s.endYear)
}

/** 润色默认岁运窗口入参 */
export interface DefaultYunAiInput {
  /** 大运步 */
  steps: YunStep[]
  /** 出生公历年；手工盘可为 0 */
  birthYear: number
  /** 日主 */
  dayMaster: TianGan
  /** 喜用 */
  useful: WuXing[]
  /** 忌神 */
  avoid: WuXing[]
  /** 日支，供流月冲日支 */
  natalDayZhi?: DiZhi
  /** 用户点选；可空 */
  pick?: YunCalendarPick | null
  /** 对照年，默认今年 */
  nowYear?: number
  /** 窗口向前取几年，默认 1 */
  backYears?: number
  /** 窗口向后取几年，默认 4 */
  forwardYears?: number
}

/**
 * 润色/追问默认注入的岁运窗口：当前大运 + 近几流年 + 今年流月。
 * 点选只作加写，不能取代本窗口，避免「不追问就没有流年」。
 * @param input 大运与喜用
 * @returns 多行事实；无大运则空串
 */
export function formatDefaultYunForAi(input: DefaultYunAiInput): string {
  if (!input.steps.length) return ''
  const nowYear = input.nowYear ?? new Date().getFullYear()
  const from = nowYear - (input.backYears ?? 1)
  const to = nowYear + (input.forwardYears ?? 4)
  const curStep =
    stepOfYear(input.steps, nowYear, input.birthYear) ??
    input.steps[defaultYunIndex(input.steps, nowYear)] ??
    input.steps[0]
  const lines = [
    '【默认岁运窗口】润色必须写【流年】分区，按下列年份逐年解读；用户点选只是加写焦点，不能省略本窗口。',
    `当前大运 ${curStep.gz}（约${curStep.ageFrom}–${curStep.ageTo}岁` +
      (curStep.startYear ? `，${curStep.startYear}–${curStep.endYear}` : '') +
      '）'
  ]
  const daHint = daYunModernHint(curStep.gz, input.dayMaster, input.useful, input.avoid)
  if (daHint) lines.push(`大运议题 ${daHint}`)

  lines.push('【近几流年】')
  for (let y = from; y <= to; y++) {
    const step = stepOfYear(input.steps, y, input.birthYear)
    const gz = yearGanZhi(y)
    const gan = ganOfGz(gz)
    const age = input.birthYear > 0 ? y - input.birthYear : 0
    const mark = y === nowYear ? '（今年）' : ''
    if (!gan) {
      lines.push(`${y}${mark} 年柱不明`)
      continue
    }
    const tone = judgeGanTone(gan, input.dayMaster, input.useful, input.avoid)
    const ageBit = age > 0 ? `，约${age}岁` : ''
    const dunBit = step ? `，行${step.gz}运` : '，未入列出的大运'
    lines.push(
      `${y}${mark} ${gz}（${tone.ss}${ageBit}${dunBit}，档${tone.band}）${tone.hint}`
    )
  }

  const thisYearMonths = listLiuYueOfYear(
    nowYear,
    input.dayMaster,
    input.useful,
    input.avoid,
    {
      daYunGz: curStep.gz,
      yearGz: yearGanZhi(nowYear),
      natalDayZhi: input.natalDayZhi,
      asOf: new Date(nowYear, new Date().getMonth(), new Date().getDate())
    }
  )
  const curMonth = thisYearMonths.find((m) => m.current)
  if (curMonth) {
    lines.push(
      `今年流月 ${curMonth.jie}起${curMonth.zhi}月 ${curMonth.gz}（${curMonth.ganShiShen}，交节 ${curMonth.startSolar} ${curMonth.startHm}）`
    )
    lines.push(`流月议题 ${curMonth.hint}`)
  }

  const pick = input.pick
  if (pick?.year && (pick.year.year < from || pick.year.year > to)) {
    lines.push(
      `点选加写流年 ${pick.year.year} ${pick.year.gz}（${pick.year.ganShiShen}，档${pick.year.band}）${pick.year.hint}`
    )
  }
  if (pick?.month) {
    lines.push(
      `点选加写流月 ${pick.month.jie}起${pick.month.zhi}月 ${pick.month.gz}，交节 ${pick.month.startSolar} ${pick.month.startHm}`
    )
  }

  lines.push(formatYunBookPack())
  lines.push('流年只论议题显不显（职场、钱、关系、身体），禁止编造车祸、中奖、具体私人事件；吉凶并陈。')
  return lines.join('\n')
}

/**
 * 把点选时段压成命师事实行。
 * @param pick 日历选择
 * @returns 多行文本；未选则空串
 */
export function formatYunPickFacts(pick: YunCalendarPick | null): string {
  if (!pick) return ''
  const { daYun, year, month } = pick
  const lines = [
    `点选大运 ${daYun.gz}（约${daYun.ageFrom}–${daYun.ageTo}岁` +
      (daYun.startYear ? `，${daYun.startYear}–${daYun.endYear}` : '') +
      '）'
  ]
  if (year) {
    lines.push(`点选流年 ${year.year} ${year.gz}（${year.ganShiShen}，约${year.age}岁，档${year.band}）`)
    lines.push(`流年议题 ${year.hint}`)
  }
  if (month) {
    lines.push(
      `点选流月 ${month.jie}起${month.zhi}月 ${month.gz}（${month.ganShiShen}，交节 ${month.startSolar} ${month.startHm} 至 ${month.endSolar}）`
    )
    if (month.jiaoYun) lines.push('该月落在交节三日窗口，气运交接宜观望。')
    lines.push(`流月议题 ${month.hint}`)
    if (month.layerHint) lines.push(month.layerHint)
  }
  lines.push(formatYunBookPack())
  lines.push('围绕点选时段谈应期主题，禁止编造具体私人事件；吉凶并陈。')
  return lines.join('\n')
}

/**
 * 大运步本身的现代短读（未点流年时展示）。
 * @param gz 大运干支
 * @param dayMaster 日主
 * @param useful 喜用
 * @param avoid 忌神
 */
export function daYunModernHint(
  gz: string,
  dayMaster: TianGan,
  useful: WuXing[],
  avoid: WuXing[]
): string {
  const gan = ganOfGz(gz)
  if (!gan) return '大运干支不明。'
  return judgeGanTone(gan, dayMaster, useful, avoid).hint
}
