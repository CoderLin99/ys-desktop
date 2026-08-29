/**
 * 干支合化细法（三命通会大意，可编码条件）。
 * 天干五合要月令或透出化神才言「成化」；地支六合/三合成象，不硬写成已化。
 */
import { TIANGAN_WUXING, type DiZhi, type TianGan, type WuXing } from '../constants'
import type { BaZiChart } from './chart'

/** 一条合化断 */
export interface HeHuaLine {
  /** 合的种类 */
  kind: '天干五合' | '地支六合' | '地支三合'
  /** 合的字 */
  pair: string
  /** 是否达到成化条件 */
  hua: boolean
  /** 化神五行；未成化可空 */
  huaWx: WuXing | ''
  /** 断语 */
  text: string
}

/** 天干五合及所化 */
const GAN_HE: { a: TianGan; b: TianGan; wx: WuXing }[] = [
  { a: '甲', b: '己', wx: '土' },
  { a: '乙', b: '庚', wx: '金' },
  { a: '丙', b: '辛', wx: '水' },
  { a: '丁', b: '壬', wx: '木' },
  { a: '戊', b: '癸', wx: '火' }
]

/** 地支六合 */
const ZHI_LIUHE: [DiZhi, DiZhi][] = [
  ['子', '丑'],
  ['寅', '亥'],
  ['卯', '戌'],
  ['辰', '酉'],
  ['巳', '申'],
  ['午', '未']
]

/** 地支三合局 */
const ZHI_SANHE: { zhi: DiZhi[]; wx: WuXing; name: string }[] = [
  { zhi: ['申', '子', '辰'], wx: '水', name: '申子辰' },
  { zhi: ['寅', '午', '戌'], wx: '火', name: '寅午戌' },
  { zhi: ['巳', '酉', '丑'], wx: '金', name: '巳酉丑' },
  { zhi: ['亥', '卯', '未'], wx: '木', name: '亥卯未' }
]

/**
 * 四柱上出现的天干（缺时不计时柱）。
 * @param chart 盘
 */
function stemSet(chart: BaZiChart): Set<TianGan> {
  const s = new Set<TianGan>([
    chart.pillars.year.gan,
    chart.pillars.month.gan,
    chart.pillars.day.gan
  ])
  if (chart.pillars.hour) s.add(chart.pillars.hour.gan)
  return s
}

/**
 * 四柱地支集合。
 * @param chart 盘
 */
function zhiList(chart: BaZiChart): DiZhi[] {
  const z: DiZhi[] = [
    chart.pillars.year.zhi,
    chart.pillars.month.zhi,
    chart.pillars.day.zhi
  ]
  if (chart.pillars.hour) z.push(chart.pillars.hour.zhi)
  return z
}

/**
 * 化神是否得月令或透干（成化门槛的压缩条件）。
 * @param chart 盘
 * @param wx 化神五行
 */
function huaShenYouQi(chart: BaZiChart, wx: WuXing): boolean {
  const monthWx = TIANGAN_WUXING[chart.pillars.month.gan]
  if (monthWx === wx) return true
  const monthZhiWx = (
    {
      寅: '木',
      卯: '木',
      巳: '火',
      午: '火',
      申: '金',
      酉: '金',
      亥: '水',
      子: '水',
      辰: '土',
      戌: '土',
      丑: '土',
      未: '土'
    } as Record<DiZhi, WuXing>
  )[chart.pillars.month.zhi]
  if (monthZhiWx === wx) return true
  return [...stemSet(chart)].some((g) => TIANGAN_WUXING[g] === wx)
}

/**
 * 扫描本局天干五合、地支六合与三合。
 * @param chart 盘
 */
export function collectHeHua(chart: BaZiChart): HeHuaLine[] {
  const lines: HeHuaLine[] = []
  const stems = stemSet(chart)
  for (const row of GAN_HE) {
    if (!stems.has(row.a) || !stems.has(row.b)) continue
    const hua = huaShenYouQi(chart, row.wx)
    lines.push({
      kind: '天干五合',
      pair: `${row.a}${row.b}`,
      hua,
      huaWx: hua ? row.wx : '',
      text: hua
        ? `天干${row.a}${row.b}合化${row.wx}：月令或透干有化神，合化有气，论事可顺${row.wx}之气。`
        : `天干${row.a}${row.b}合而不化：局中化神${row.wx}不得月令，只作牵绊、说合，不当已改五行。`
    })
  }

  const zhis = zhiList(chart)
  const zhiSet = new Set(zhis)
  for (const [a, b] of ZHI_LIUHE) {
    if (!zhiSet.has(a) || !zhiSet.has(b)) continue
    lines.push({
      kind: '地支六合',
      pair: `${a}${b}`,
      hua: false,
      huaWx: '',
      text: `地支${a}${b}六合：人事多牵绊、说合、结盟；是否成化仍看月令，本程序只标合象。`
    })
  }

  for (const ju of ZHI_SANHE) {
    const hit = ju.zhi.filter((z) => zhiSet.has(z))
    if (hit.length < 2) continue
    const full = hit.length >= 3
    lines.push({
      kind: '地支三合',
      pair: ju.name,
      hua: full && huaShenYouQi(chart, ju.wx),
      huaWx: full ? ju.wx : '',
      text: full
        ? `${ju.name}三合${ju.wx}局较全，${huaShenYouQi(chart, ju.wx) ? '化神有气，可作旺党' : '会而不化，只论一气党助'}。`
        : `${ju.name}见${hit.join('')}半合：有${ju.wx}党之象，力量不足三合全。`
    })
  }

  return lines
}
