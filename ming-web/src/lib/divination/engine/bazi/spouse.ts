/**
 * 配偶星落柱断法：男看财、女看官杀；妻/夫年龄看落年日月时，情缘段数看星多寡与神煞。
 *
 * 江湖口「被你克的才是老婆」= 十神「我克者为财」。壬水克火，妻星是火（丙偏财、丁正财），
 * 不是克土——土克水是官杀。年龄只论倾向，不写「不可能比自己大」这种绝对句。
 */
import { KE, TIANGAN_WUXING, type CangGanRole, type TianGan, type WuXing } from '../constants'
import type { BaZiChart, Pillar } from './chart'
import type { BaZiTrend } from './trend'
import { shishenOf, type ShiShen } from './shishen'
import type { ShenShaHit } from './shensha'
import {
  femaleGuanShaRelationLine,
  femaleRomanceWaveText,
  femaleSpouseBurdenLine,
  femaleSpouseGoodLine
} from './femaleTone'

/** 柱位 */
export type SpousePillar = '年' | '月' | '日' | '时'

/** 配偶星一条落点 */
export interface SpouseStarHit {
  /** 天干 */
  gan: TianGan
  /** 正偏财或正官七杀 */
  star: '正财' | '偏财' | '正官' | '七杀'
  /** 落哪一柱 */
  pillar: SpousePillar
  /** 天干或藏干层次 */
  layer: '天干' | CangGanRole
}

/** 妻/夫年龄倾向（正配为主） */
export type SpouseAgeHint = '偏大' | '相当' | '偏小' | '不明'

/** 情缘段数倾向：象意，不是恋爱次数 */
export type RomanceWave = '偏少' | '一段为主' | '多段波折'

/** 配偶象总批 */
export interface SpouseJudgement {
  /** 配偶对应五行（男=财=我克，女=官杀=克我） */
  spouseWx: WuXing
  /** 正配星名 */
  properStar: '正财' | '正官'
  /** 偏缘星名 */
  sideStar: '偏财' | '七杀'
  /** 全部落点 */
  hits: SpouseStarHit[]
  /** 正配年龄倾向 */
  ageHint: SpouseAgeHint
  /** 情缘段数倾向 */
  romanceWave: RomanceWave
  /** 总批（吉凶并陈） */
  text: string
}

const PILLAR_KEYS: Array<{ key: 'year' | 'month' | 'day' | 'hour'; label: SpousePillar }> = [
  { key: 'year', label: '年' },
  { key: 'month', label: '月' },
  { key: 'day', label: '日' },
  { key: 'hour', label: '时' }
]

/**
 * 男命配偶五行为「我克者」（财），女命为「克我者」（官杀）。
 * @param dayWx 日主五行
 * @param gender 乾坤
 */
export function spouseWuXing(dayWx: WuXing, gender: 'male' | 'female'): WuXing {
  if (gender === 'male') return KE[dayWx]
  const entry = (Object.keys(KE) as WuXing[]).find((x) => KE[x] === dayWx)
  return entry ?? dayWx
}

/**
 * 该十神是否为本造配偶星。
 * @param star 十神
 * @param gender 乾坤
 */
function isSpouseStar(star: ShiShen, gender: 'male' | 'female'): star is SpouseStarHit['star'] {
  if (gender === 'male') return star === '正财' || star === '偏财'
  return star === '正官' || star === '七杀'
}

/**
 * 扫描四柱天干与藏干，标出配偶星落点。
 * @param chart 盘
 * @param gender 乾坤
 */
export function collectSpouseStarHits(chart: BaZiChart, gender: 'male' | 'female'): SpouseStarHit[] {
  const hits: SpouseStarHit[] = []
  for (const { key, label } of PILLAR_KEYS) {
    const pillar: Pillar | null = chart.pillars[key]
    if (!pillar) continue
    const ganStar = shishenOf(chart.dayMaster, pillar.gan)
    if (label !== '日' && isSpouseStar(ganStar, gender)) {
      hits.push({ gan: pillar.gan, star: ganStar, pillar: label, layer: '天干' })
    }
    for (const c of pillar.canggan) {
      if (!isSpouseStar(c.shiShen, gender)) continue
      hits.push({ gan: c.gan, star: c.shiShen, pillar: label, layer: c.role })
    }
  }
  return hits
}

/**
 * 落点权重：天干/本气最重，年柱主「年长」，时柱主「年幼」。
 * @param hit 一条落点
 */
function ageWeight(hit: SpouseStarHit): number {
  const layerScore = hit.layer === '天干' || hit.layer === '本气' ? 3 : hit.layer === '中气' ? 2 : 1
  if (hit.pillar === '年') return 2 * layerScore
  if (hit.pillar === '时') return -2 * layerScore
  if (hit.pillar === '日') return 0
  return 0
}

/**
 * 以正配星为主推断年龄倾向；无正配则用偏星，力度打折。
 * @param hits 落点
 * @param proper 正财或正官
 * @param hourUnknown 缺时则不把「偏小」说死
 */
export function spouseAgeFromHits(
  hits: SpouseStarHit[],
  proper: '正财' | '正官',
  hourUnknown: boolean
): SpouseAgeHint {
  const main = hits.filter((h) => h.star === proper)
  const pool = main.length ? main : hits
  if (!pool.length) return '不明'
  const score = pool.reduce((s, h) => s + ageWeight(h), 0)
  if (score >= 3) return '偏大'
  if (score <= -3 && !hourUnknown) return '偏小'
  if (score <= -3 && hourUnknown) return '相当'
  return '相当'
}

/**
 * 情缘段数：星散多柱 + 桃花类神煞加分，孤鸾寡宿减分。不是「谈过几次」的计数。
 * @param hits 配偶星落点
 * @param shensha 神煞
 * @param unique 透干十神
 * @param gender 乾坤
 */
export function romanceWaveOf(
  hits: SpouseStarHit[],
  shensha: ShenShaHit[],
  unique: ShiShen[],
  gender: 'male' | 'female'
): RomanceWave {
  const names = new Set(shensha.map((s) => s.name))
  let score = 0
  const pillars = new Set(hits.map((h) => h.pillar))
  if (pillars.size >= 2) score += 1
  if (hits.length >= 3) score += 1
  if (names.has('桃花') || names.has('红艳煞')) score += 1
  if (names.has('红鸾')) score += 1
  if (names.has('阴差阳错')) score += 1
  if (gender === 'male' && unique.some((s) => s === '比肩' || s === '劫财') && hits.length) score += 1
  if (gender === 'female' && unique.includes('伤官') && unique.includes('正官')) score += 2
  if (names.has('孤鸾') || names.has('孤鸾煞') || names.has('寡宿') || names.has('华盖')) score -= 1
  if (score >= 3) return '多段波折'
  if (score <= 0) return '偏少'
  return '一段为主'
}

/**
 * 把年龄倾向写成总批用语：相当=不主年长，禁止「不可能比自己大」。
 * @param hint 年龄档
 * @param who 妻/夫
 */
function ageSentence(hint: SpouseAgeHint, who: '妻' | '夫'): string {
  if (hint === '偏大') return `正${who}年龄倾向比自己大（年柱财官有力）`
  if (hint === '偏小') return `正${who}年龄倾向比自己小（时柱财官有力）`
  if (hint === '不明') return `正${who}星不显，年龄不论死，须待岁运引出再看`
  return `正${who}不主年长（正星不在年柱天干/本气，多在日支配偶宫或月柱）`
}

/**
 * 本造配偶象总批：五行、落柱、年龄、段数、吉凶并陈。
 * @param chart 盘
 * @param trend 强弱喜用
 * @param unique 透干十神
 * @param gender 乾坤
 * @param shensha 神煞
 */
export function judgeSpouse(
  chart: BaZiChart,
  trend: BaZiTrend,
  unique: ShiShen[],
  gender: 'male' | 'female',
  shensha: ShenShaHit[]
): SpouseJudgement {
  const dayWx = TIANGAN_WUXING[chart.dayMaster]
  const spouseWx = spouseWuXing(dayWx, gender)
  const properStar: '正财' | '正官' = gender === 'male' ? '正财' : '正官'
  const sideStar: '偏财' | '七杀' = gender === 'male' ? '偏财' : '七杀'
  const who = gender === 'male' ? '妻' : '夫'
  const hits = collectSpouseStarHits(chart, gender)
  const ageHint = spouseAgeFromHits(hits, properStar, chart.hourUnknown)
  const romanceWave = romanceWaveOf(hits, shensha, unique, gender)

  const loc =
    hits
      .map((h) => `${h.pillar}柱${h.layer}${h.gan}（${h.star}）`)
      .join('、') || '四柱未见'

  /** 女命用现代双义关系句；男命仍只论财=妻星 */
  const relation =
    gender === 'male'
      ? `${chart.dayMaster}（${dayWx}）克${spouseWx}为财，${spouseWx}即妻星`
      : femaleGuanShaRelationLine(chart.dayMaster, dayWx, spouseWx)

  /** 女命段数口吻偏「先立身」；男命保持原口径 */
  const waveText =
    gender === 'female'
      ? femaleRomanceWaveText(romanceWave)
      : romanceWave === '多段波折'
        ? '情缘偏多段、易分合，不是精确「谈过几次」，只是桃花/多柱配偶星的象意'
        : romanceWave === '偏少'
          ? '情缘不密，宜晚成或先独处，勿硬凑早婚'
          : '一段为主，间有波折，成事看用神运'

  const usefulOk = trend.useful.includes(spouseWx)
  const weak = trend.strength === '偏弱'
  /** 男命日支见官杀 = 妻宫混压力，与财星落点分开看 */
  const palaceKill =
    gender === 'male' &&
    chart.pillars.day.canggan.some((c) => c.shiShen === '七杀' || c.shiShen === '正官')

  /** 女命利弊改现代相处/协作；男命保持原句 */
  const good =
    gender === 'female'
      ? femaleSpouseGoodLine(usefulOk)
      : usefulOk
        ? `利：${who}星五行属用神，缘可成`
        : `弊：${who}星五行不在用神，感情易耗身或名实不符`
  const burden =
    gender === 'female'
      ? femaleSpouseBurdenLine(weak)
      : weak
        ? `弊：身弱难任${who}星，早婚易累，宜晚成`
        : palaceKill
          ? `弊：配偶宫夹杂官杀，口舌压力有，须择能助身者`
          : `弊：比劫争财或岁运冲配偶宫时，仍有分合之危`

  const text = [
    `${gender === 'male' ? '乾造' : '坤造'}${relation}。`,
    `落点：${loc}。`,
    `${ageSentence(ageHint, who)}。`,
    `${waveText}。`,
    `${good}；${burden}。`
  ].join('')

  return { spouseWx, properStar, sideStar, hits, ageHint, romanceWave, text }
}
