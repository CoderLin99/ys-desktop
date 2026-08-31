/**
 * 紫微斗数排盘：十二宫、十四主星、四化、常用辅星、大限。
 * 五行局按命宫干支推算；紫微/天府起星对齐通行「局数除日数」口诀（与 iztro 一致）。
 * 辅星等派系差异处以本盘自洽为准。
 */
import { Solar } from 'lunar-javascript'

/** 地支序（子=0） */
const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const
/** 天干 */
const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const

/** 十二宫名（自命宫逆时针） */
export const PALACE_NAMES = [
  '命宫',
  '兄弟',
  '夫妻',
  '子女',
  '财帛',
  '疾厄',
  '迁移',
  '交友',
  '官禄',
  '田宅',
  '福德',
  '父母'
] as const

/** 十四主星 */
export const MAJOR_STARS = [
  '紫微',
  '天机',
  '太阳',
  '武曲',
  '天同',
  '廉贞',
  '天府',
  '太阴',
  '贪狼',
  '巨门',
  '天相',
  '天梁',
  '七杀',
  '破军'
] as const

/** 四化名 */
export const SIHUA_NAMES = ['化禄', '化权', '化科', '化忌'] as const

export type PalaceName = (typeof PALACE_NAMES)[number]
export type SiHuaName = (typeof SIHUA_NAMES)[number]

/** 单星落点（可带四化） */
export interface ZiWeiStarHit {
  /** 星名 */
  name: string
  /** 是否主星 */
  major: boolean
  /** 四化（可空） */
  sihua?: SiHuaName
}

/** 单宫 */
export interface ZiWeiPalace {
  /** 宫名 */
  name: PalaceName
  /** 地支 */
  zhi: string
  /** 天干（五虎遁） */
  gan: string
  /** 主星 */
  majors: string[]
  /** 辅星 */
  minors: string[]
  /** 本宫星曜（含四化标记） */
  stars: ZiWeiStarHit[]
  /** 是否身宫 */
  isShen: boolean
  /** 大限起止周岁（含） */
  daXianFrom: number
  /** 大限结束周岁 */
  daXianTo: number
}

/** 四化条目 */
export interface ZiWeiSiHua {
  /** 化禄/权/科/忌 */
  kind: SiHuaName
  /** 飞化之星 */
  star: string
  /** 落宫名 */
  palace: PalaceName
  /** 落地支 */
  zhi: string
}

/** 大限一步 */
export interface ZiWeiDaXian {
  /** 宫名 */
  palace: PalaceName
  /** 地支 */
  zhi: string
  /** 起岁 */
  ageFrom: number
  /** 止岁 */
  ageTo: number
  /** 主星摘要 */
  majors: string[]
}

/** 排盘结果 */
export interface ZiWeiChart {
  /** 农历描述 */
  lunarLabel: string
  /** 年干支 */
  yearGanZhi: string
  /** 五行局 */
  wuXingJu: string
  /** 局数 2–6 */
  juNum: number
  /** 命宫地支 */
  mingZhi: string
  /** 身宫地支 */
  shenZhi: string
  /** 性别 */
  gender: 'male' | 'female'
  /** 十二宫 */
  palaces: ZiWeiPalace[]
  /** 生年四化 */
  sihua: ZiWeiSiHua[]
  /** 大限序列（自命宫起） */
  daXian: ZiWeiDaXian[]
  /** 完整断语行 */
  hints: string[]
  /** RAG 查询 */
  ragQuery: string
}

/** 五行局名 → 局数 */
const JU_NUM: Record<string, number> = {
  水二局: 2,
  木三局: 3,
  金四局: 4,
  土五局: 5,
  火六局: 6
}

/**
 * 命宫干支定五行局（纳音局数法）。
 * 算法对齐通行口诀与 iztro `getFiveElementsClass`：
 * 天干序号÷2+1，地支以六位循环÷2+1，相加满五去五，再查局表。
 *
 * @param mingGan 命宫天干（五虎遁）
 * @param mingZhi 命宫地支
 * @returns 水二局｜木三局｜金四局｜土五局｜火六局
 */
export function calcWuXingJu(mingGan: string, mingZhi: string): string {
  const table = ['木三局', '金四局', '水二局', '火六局', '土五局'] as const
  const ganIdx = GAN.indexOf(mingGan as (typeof GAN)[number])
  const zhiIdx = ZHI.indexOf(mingZhi as (typeof ZHI)[number])
  if (ganIdx < 0 || zhiIdx < 0) return '水二局'
  const stemNum = Math.floor(ganIdx / 2) + 1
  const branchNum = Math.floor((zhiIdx % 6) / 2) + 1
  let idx = stemNum + branchNum
  while (idx > 5) idx -= 5
  return table[idx - 1] ?? '水二局'
}

/**
 * 生年四化表：年干 → [禄,权,科,忌] 星名。
 */
const SIHUA_BY_GAN: Record<string, [string, string, string, string]> = {
  甲: ['廉贞', '破军', '武曲', '太阳'],
  乙: ['天机', '天梁', '紫微', '太阴'],
  丙: ['天同', '天机', '文昌', '廉贞'],
  丁: ['太阴', '天同', '天机', '巨门'],
  戊: ['贪狼', '太阴', '右弼', '天机'],
  己: ['武曲', '贪狼', '天梁', '文曲'],
  庚: ['太阳', '武曲', '太阴', '天同'],
  辛: ['巨门', '太阳', '文曲', '文昌'],
  壬: ['天梁', '紫微', '左辅', '武曲'],
  癸: ['破军', '巨门', '太阴', '贪狼']
}

/**
 * 五虎遁：年干起寅月干，推各支天干。
 * @param yearGan 年干
 * @param zhi 地支
 */
function ganForZhi(yearGan: string, zhi: string): string {
  const startMap: Record<string, number> = {
    甲: 2,
    己: 2,
    乙: 4,
    庚: 4,
    丙: 6,
    辛: 6,
    丁: 8,
    壬: 8,
    戊: 0,
    癸: 0
  }
  const yinGanIdx = startMap[yearGan] ?? 2
  const zhiIdx = ZHI.indexOf(zhi as (typeof ZHI)[number])
  const offset = (zhiIdx - 2 + 12) % 12
  return GAN[(yinGanIdx + offset) % 10]
}

/**
 * 安命宫地支索引。
 * @param month 农历月 1–12
 * @param hourZhiIdx 时支 0–11
 */
export function calcMingZhiIndex(month: number, hourZhiIdx: number): number {
  const monthPos = (2 + (month - 1)) % 12
  return (monthPos - hourZhiIdx + 120) % 12
}

/**
 * 安身宫地支索引。
 * @param month 农历月
 * @param hourZhiIdx 时支
 */
export function calcShenZhiIndex(month: number, hourZhiIdx: number): number {
  const monthPos = (2 + (month - 1)) % 12
  return (monthPos + hourZhiIdx) % 12
}

/**
 * 紫微星地支序（子=0）。
 * 口诀：局数除日数，商数宫前走；有余则加数凑整，奇数逆回、偶数顺行。
 * 对齐 iztro `getStartIndex`（其内部以寅=0，此处换算为子=0）。
 *
 * @param day 农历日（初一=1）
 * @param ju 局数 2–6
 */
export function calcZiWeiIndex(day: number, ju: number): number {
  let offset = -1
  let quotient = 0
  let remainder = -1
  do {
    offset += 1
    const divisor = day + offset
    quotient = Math.floor(divisor / ju)
    remainder = divisor % ju
  } while (remainder !== 0)

  quotient %= 12
  // iztro 寅宫起算索引
  let yinIdx = quotient - 1
  if (offset % 2 === 0) yinIdx += offset
  else yinIdx -= offset
  yinIdx = ((yinIdx % 12) + 12) % 12
  // 寅=0 → 子=0
  return (yinIdx + 2) % 12
}

/**
 * 天府星地支序（子=0）：与紫微相对（寅宫起对宫公式换算）。
 * 紫微在寅则天府同宫；其余为「十二减去紫微寅序」再换子序。
 *
 * @param ziweiIdx 紫微地支序（子=0）
 */
export function calcTianFuIndex(ziweiIdx: number): number {
  const yinIdx = (ziweiIdx - 2 + 12) % 12
  const tianfuYin = (12 - yinIdx) % 12
  return (tianfuYin + 2) % 12
}

/** 紫微系相对偏移 */
const ZIWEI_SERIES: { name: string; offset: number }[] = [
  { name: '紫微', offset: 0 },
  { name: '天机', offset: -1 },
  { name: '太阳', offset: -3 },
  { name: '武曲', offset: -4 },
  { name: '天同', offset: -5 },
  { name: '廉贞', offset: -8 }
]

/** 天府系相对偏移 */
const TIANFU_SERIES: { name: string; offset: number }[] = [
  { name: '天府', offset: 0 },
  { name: '太阴', offset: 1 },
  { name: '贪狼', offset: 2 },
  { name: '巨门', offset: 3 },
  { name: '天相', offset: 4 },
  { name: '天梁', offset: 5 },
  { name: '七杀', offset: 6 },
  { name: '破军', offset: 10 }
]

/**
 * 文昌：按时支安星（戌起子时逆行）。
 * @param hourZhiIdx 时支
 */
function wenChangIndex(hourZhiIdx: number): number {
  return (10 - hourZhiIdx + 120) % 12
}

/**
 * 文曲：按时支安星（辰起子时顺行）。
 * @param hourZhiIdx 时支
 */
function wenQuIndex(hourZhiIdx: number): number {
  return (4 + hourZhiIdx) % 12
}

/**
 * 左辅：按农历月（辰起正月顺）。
 * @param month 农历月
 */
function zuoFuIndex(month: number): number {
  return (4 + (month - 1)) % 12
}

/**
 * 右弼：按农历月（戌起正月逆）。
 * @param month 农历月
 */
function youBiIndex(month: number): number {
  return (10 - (month - 1) + 120) % 12
}

/**
 * 天魁：年干表。
 * @param yearGan 年干
 */
function tianKuiIndex(yearGan: string): number {
  const map: Record<string, number> = {
    甲: 1,
    戊: 1,
    庚: 1, // 丑
    乙: 0,
    己: 0, // 子
    丙: 11,
    丁: 11, // 亥
    壬: 3,
    癸: 3, // 卯
    辛: 4 // 午→午=6? 通行辛魁在午
  }
  if (yearGan === '辛') return 6
  return map[yearGan] ?? 1
}

/**
 * 天钺：年干表。
 * @param yearGan 年干
 */
function tianYueIndex(yearGan: string): number {
  const map: Record<string, number> = {
    甲: 7,
    戊: 7,
    庚: 7, // 未
    乙: 8,
    己: 8, // 申
    丙: 5,
    丁: 5, // 巳
    壬: 5,
    癸: 5, // 巳
    辛: 2 // 寅
  }
  return map[yearGan] ?? 7
}

/**
 * 禄存：年干安禄。
 * @param yearGan 年干
 */
function luCunIndex(yearGan: string): number {
  const map: Record<string, number> = {
    甲: 2,
    乙: 3,
    丙: 5,
    丁: 6,
    戊: 5,
    己: 6,
    庚: 8,
    辛: 9,
    壬: 11,
    癸: 0
  }
  return map[yearGan] ?? 2
}

/**
 * 擎羊：禄存前一辰。
 * @param luIdx 禄存地支序
 */
function qingYangIndex(luIdx: number): number {
  return (luIdx + 1) % 12
}

/**
 * 陀罗：禄存后一辰。
 * @param luIdx 禄存地支序
 */
function tuoLuoIndex(luIdx: number): number {
  return (luIdx + 11) % 12
}

/**
 * 火星：年支三合局起，按时支顺数（简化口诀）。
 * @param yearZhiIdx 年支
 * @param hourZhiIdx 时支
 */
function huoXingIndex(yearZhiIdx: number, hourZhiIdx: number): number {
  // 寅午戌起丑、申子辰起寅、巳酉丑起卯、亥卯未起酉
  let start = 1 // 丑
  const y = yearZhiIdx
  if ([2, 6, 10].includes(y)) start = 1
  else if ([8, 0, 4].includes(y)) start = 2
  else if ([5, 9, 1].includes(y)) start = 3
  else start = 9
  return (start + hourZhiIdx) % 12
}

/**
 * 铃星：年支三合局起，按时支顺数（简化）。
 * @param yearZhiIdx 年支
 * @param hourZhiIdx 时支
 */
function lingXingIndex(yearZhiIdx: number, hourZhiIdx: number): number {
  // 寅午戌起卯、其余起戌（通行简化）
  const start = [2, 6, 10].includes(yearZhiIdx) ? 3 : 10
  return (start + hourZhiIdx) % 12
}

/**
 * 排紫微完整盘。
 * @param input 公历出生与性别
 */
export function buildZiWeiChart(input: {
  year: number
  month: number
  day: number
  hour: number | null
  gender: 'male' | 'female'
}): ZiWeiChart {
  const hour = input.hour == null ? 12 : input.hour
  const solar = Solar.fromYmdHms(input.year, input.month, input.day, hour, 0, 0)
  const lunar = solar.getLunar()
  const month = Math.abs(lunar.getMonth())
  const day = lunar.getDay()
  const timeZhi = lunar.getTimeZhi()
  const hourZhiIdx = Math.max(0, ZHI.indexOf(timeZhi as (typeof ZHI)[number]))
  const yearGan = lunar.getYearGan()
  const yearZhi = lunar.getYearZhi()
  const yearZhiIdx = Math.max(0, ZHI.indexOf(yearZhi as (typeof ZHI)[number]))
  const yearGanZhi = `${yearGan}${yearZhi}`

  const mingIdx = calcMingZhiIndex(month, hourZhiIdx)
  const shenIdx = calcShenZhiIndex(month, hourZhiIdx)
  const mingZhi = ZHI[mingIdx]
  const shenZhi = ZHI[shenIdx]
  const mingGan = ganForZhi(yearGan, mingZhi)
  const wuXingJu = calcWuXingJu(mingGan, mingZhi)
  const ju = JU_NUM[wuXingJu] || 2
  const ziweiIdx = calcZiWeiIndex(day, ju)
  const tianfuIdx = calcTianFuIndex(ziweiIdx)

  /** 地支 → 主星 */
  const majorsAt = new Map<number, string[]>()
  /** 地支 → 辅星 */
  const minorsAt = new Map<number, string[]>()
  const addMajor = (idx: number, name: string) => {
    const i = (idx + 120) % 12
    const arr = majorsAt.get(i) || []
    arr.push(name)
    majorsAt.set(i, arr)
  }
  const addMinor = (idx: number, name: string) => {
    const i = (idx + 120) % 12
    const arr = minorsAt.get(i) || []
    arr.push(name)
    minorsAt.set(i, arr)
  }

  for (const s of ZIWEI_SERIES) addMajor(ziweiIdx + s.offset, s.name)
  for (const s of TIANFU_SERIES) addMajor(tianfuIdx + s.offset, s.name)

  const luIdx = luCunIndex(yearGan)
  addMinor(wenChangIndex(hourZhiIdx), '文昌')
  addMinor(wenQuIndex(hourZhiIdx), '文曲')
  addMinor(zuoFuIndex(month), '左辅')
  addMinor(youBiIndex(month), '右弼')
  addMinor(tianKuiIndex(yearGan), '天魁')
  addMinor(tianYueIndex(yearGan), '天钺')
  addMinor(luIdx, '禄存')
  addMinor(qingYangIndex(luIdx), '擎羊')
  addMinor(tuoLuoIndex(luIdx), '陀罗')
  addMinor(huoXingIndex(yearZhiIdx, hourZhiIdx), '火星')
  addMinor(lingXingIndex(yearZhiIdx, hourZhiIdx), '铃星')

  /** 星名 → 地支序（主+辅，后写覆盖同名罕见） */
  const starZhi = new Map<string, number>()
  for (const [zi, names] of majorsAt) for (const n of names) starZhi.set(n, zi)
  for (const [zi, names] of minorsAt) for (const n of names) starZhi.set(n, zi)

  /** 四化：星 → 化名 */
  const sihuaOfStar = new Map<string, SiHuaName>()
  const sihuaTable = SIHUA_BY_GAN[yearGan] || SIHUA_BY_GAN['甲']
  const kinds = SIHUA_NAMES
  for (let i = 0; i < 4; i++) {
    sihuaOfStar.set(sihuaTable[i], kinds[i])
  }

  /** 阳男阴女顺行大限，阴男阳女逆行 */
  const yearGanYang = ['甲', '丙', '戊', '庚', '壬'].includes(yearGan)
  const shun =
    (input.gender === 'male' && yearGanYang) || (input.gender === 'female' && !yearGanYang)

  const palaces: ZiWeiPalace[] = []
  for (let i = 0; i < 12; i++) {
    const zhiIdx = (mingIdx - i + 12) % 12
    const zhi = ZHI[zhiIdx]
    const majors = majorsAt.get(zhiIdx) || []
    const minors = minorsAt.get(zhiIdx) || []
    const stars: ZiWeiStarHit[] = [
      ...majors.map((name) => ({
        name,
        major: true as const,
        sihua: sihuaOfStar.get(name)
      })),
      ...minors.map((name) => ({
        name,
        major: false as const,
        sihua: sihuaOfStar.get(name)
      }))
    ]
    const ageFrom = ju + i * 10
    const ageTo = ageFrom + 9
    palaces.push({
      name: PALACE_NAMES[i],
      zhi,
      gan: ganForZhi(yearGan, zhi),
      majors,
      minors,
      stars,
      isShen: zhiIdx === shenIdx,
      daXianFrom: ageFrom,
      daXianTo: ageTo
    })
  }

  // 大限：顺则按宫序 0..11，逆则 0,11,10...
  const daXian: ZiWeiDaXian[] = []
  for (let step = 0; step < 12; step++) {
    const palaceIdx = shun ? step : (12 - step) % 12
    const p = palaces[palaceIdx === 0 && !shun && step > 0 ? 0 : palaceIdx]
    // 逆行：命宫为第 0 步，其后为父母、福德…（宫序逆）
    const idx = shun ? step : step === 0 ? 0 : 12 - step
    const palace = palaces[idx]
    daXian.push({
      palace: palace.name,
      zhi: palace.zhi,
      ageFrom: ju + step * 10,
      ageTo: ju + step * 10 + 9,
      majors: palace.majors
    })
    void p
  }

  const sihua: ZiWeiSiHua[] = kinds.map((kind, i) => {
    const star = sihuaTable[i]
    const zhiIdx = starZhi.get(star)
    const palace =
      zhiIdx == null
        ? palaces[0]
        : palaces.find((p) => ZHI.indexOf(p.zhi as (typeof ZHI)[number]) === zhiIdx) || palaces[0]
    return {
      kind,
      star,
      palace: palace.name,
      zhi: palace.zhi
    }
  })

  const mingPalace = palaces[0]
  const mingStars = mingPalace.majors.join('、') || '空宫'
  const mingMinors = mingPalace.minors.join('、') || '无'
  const sihuaLine = sihua.map((s) => `${s.kind}${s.star}在${s.palace}`).join('；')
  const dx0 = daXian[0]

  const hints = [
    `农历 ${lunar.toString()}，${input.gender === 'male' ? '男' : '女'}命，年柱 ${yearGanZhi}。`,
    `命宫在${mingPalace.gan}${mingZhi}，身宫在${shenZhi}，${wuXingJu}。`,
    `命宫主星：${mingStars}；辅星：${mingMinors}。`,
    `生年四化：${sihuaLine}。`,
    `大限${shun ? '顺行' : '逆行'}：首限 ${dx0.ageFrom}–${dx0.ageTo} 岁走${dx0.palace}（${dx0.zhi}）。`,
    mingPalace.majors.includes('紫微')
      ? '紫微入命，气度偏贵，宜担当亦忌骄矜；须合四化与对宫同参。'
      : mingPalace.majors.includes('天机')
        ? '天机入命，心思灵敏，宜策划忌多疑；辅以昌曲更利文书。'
        : mingPalace.majors.includes('太阳')
          ? '太阳入命，光明外向，注意耗神；忌化忌叠火铃。'
          : mingPalace.majors.includes('武曲')
            ? '武曲入命，刚毅理财，宜决断忌孤克。'
            : mingPalace.majors.length
              ? `命宫坐${mingStars}，须合财帛官禄与生年四化综断。`
              : '命宫空宫，借对宫星曜论用，忌妄断。'
  ]

  const ragQuery = [
    '紫微',
    '斗数',
    '命宫',
    mingZhi,
    wuXingJu,
    ...mingPalace.majors,
    ...mingPalace.minors.slice(0, 4),
    ...sihua.map((s) => s.kind + s.star),
    '四化',
    '大限'
  ].join(' ')

  return {
    lunarLabel: lunar.toString(),
    yearGanZhi,
    wuXingJu,
    juNum: ju,
    mingZhi,
    shenZhi,
    gender: input.gender,
    palaces,
    sihua,
    daXian,
    hints,
    ragQuery
  }
}

/**
 * 生成追问用事实文本。
 * @param chart 排盘结果
 */
export function formatZiWeiFacts(chart: ZiWeiChart): string {
  const lines = [
    ...chart.hints,
    '',
    '【十二宫】',
    ...chart.palaces.map((p) => {
      const starTxt = p.stars
        .map((s) => `${s.name}${s.sihua ? `[${s.sihua}]` : ''}`)
        .join('、')
      return `${p.name}(${p.gan}${p.zhi})${p.isShen ? '[身]' : ''} 大限${p.daXianFrom}-${p.daXianTo}：${starTxt || '空'}`
    }),
    '',
    '【大限】',
    ...chart.daXian
      .slice(0, 8)
      .map((d) => `${d.ageFrom}-${d.ageTo}岁 ${d.palace}(${d.zhi}) ${d.majors.join('、') || '空'}`)
  ]
  return lines.join('\n')
}
