/**
 * 命理总断用数据集：穷通日干月令取用、六亲宫、脏腑、岁运应期。
 * 断语按子平成法下判断，不再写成课堂讲义。
 */
import { DIZHI, TIANGAN, TIANGAN_WUXING, type DiZhi, type TianGan, type WuXing } from '../constants'
import type { BaZiChart } from './chart'
import type { BaZiTrend } from './trend'
import type { ShiShen } from './shishen'
import { judgeSpouse } from './spouse'
import { judgeCareer } from './career'
import { judgeKinNetwork } from './kin'
import type { ShenShaHit } from './shensha'
import { mingYinStudyText } from './studyTone'
import {
  femaleGuanShaRelationLine,
  femaleHeadlineCareerMarriageBalance,
  femaleRomanceWaveText,
  femaleShangGuanJianGuanLine
} from './femaleTone'

/** 穷通取用结果 */
export interface QiongTongUse {
  /** 调候用神天干 */
  gans: TianGan[]
  /** 对应五行 */
  wx: WuXing[]
  /** 局中已见的用神干 */
  seen: TianGan[]
  /** 局中未见的用神干 */
  missing: TianGan[]
  /** 总批一句 */
  text: string
}

/**
 * 穷通宝鉴 / 造化元钥一派常用「日干×月支」调候用神（压缩表，非原文）。
 * 顺序与 DIZHI 相同：子丑寅卯辰巳午未申酉戌亥。
 */
const QIONGTONG_BY_MONTH: Record<TianGan, readonly string[]> = {
  甲: ['丁', '丁丙', '丙庚', '庚', '庚丙', '癸', '癸', '癸', '丁壬', '丁', '丁庚', '庚丙'],
  乙: ['丙', '丙', '丙', '丙', '癸丙', '癸', '癸', '癸', '丙癸', '丙癸', '癸丙', '丙戊'],
  丙: ['甲', '壬甲', '壬', '壬', '壬甲', '壬', '壬', '壬', '壬甲', '壬', '甲壬', '甲'],
  丁: ['甲庚', '甲庚', '甲庚', '甲庚', '甲庚', '甲庚', '壬', '甲壬', '甲庚', '甲庚', '甲庚', '甲庚'],
  戊: ['丙甲', '丙甲', '丙甲', '丙甲', '甲丙', '甲丙', '壬甲', '癸丙', '丙甲', '丙甲', '甲丙', '丙甲'],
  己: ['丙甲', '丙甲', '丙甲', '丙甲', '丙甲', '癸丙', '癸丙', '癸丙', '丙癸', '丙癸', '丙癸', '丙甲'],
  庚: ['丁丙', '丁丙', '丁甲', '丁甲', '甲丁', '癸丁', '癸', '丁甲', '丁甲', '丁', '甲丁', '丁丙'],
  辛: ['壬丙', '壬丙', '壬甲', '壬甲', '壬甲', '壬', '壬', '壬', '壬甲', '壬', '壬甲', '壬丙'],
  壬: ['戊丙', '丙甲', '戊丙', '戊辛', '甲庚', '辛甲', '辛甲', '辛甲', '戊丁', '甲戊', '甲丙', '戊丙'],
  癸: ['辛丙', '辛丙', '辛丙', '辛丙', '辛丙', '辛', '庚辛', '庚辛', '丁', '辛丙', '辛丁', '庚辛']
}

/**
 * 把「丙庚」这类连写拆成天干列表。
 * @param packed 连写天干
 */
function parsePackedGans(packed: string): TianGan[] {
  const out: TianGan[] = []
  for (const ch of packed) {
    if ((TIANGAN as readonly string[]).includes(ch)) out.push(ch as TianGan)
  }
  return out
}

/**
 * 收集四柱天干与藏干（缺时不计时柱）。
 * @param chart 盘
 */
function allGansOnChart(chart: BaZiChart): TianGan[] {
  const pillars = [
    chart.pillars.year,
    chart.pillars.month,
    chart.pillars.day,
    ...(chart.pillars.hour ? [chart.pillars.hour] : [])
  ]
  const gans: TianGan[] = []
  for (const p of pillars) {
    gans.push(p.gan)
    for (const c of p.canggan) gans.push(c.gan)
  }
  return gans
}

/**
 * 穷通取用：按日干月令取调候用神，并对照局中是否出现。
 * @param chart 八字盘
 */
export function qiongTongOfChart(chart: BaZiChart): QiongTongUse {
  const monthIdx = DIZHI.indexOf(chart.pillars.month.zhi)
  const packed = QIONGTONG_BY_MONTH[chart.dayMaster][monthIdx] ?? ''
  const gans = parsePackedGans(packed)
  const wx = [...new Set(gans.map((g) => TIANGAN_WUXING[g]))]
  const pool = allGansOnChart(chart)
  const seen = gans.filter((g) => pool.includes(g))
  const missing = gans.filter((g) => !pool.includes(g))
  const text =
    missing.length === 0
      ? `${chart.dayMaster}生${chart.pillars.month.zhi}月，穷通取用${gans.join('、')}，局中皆见，调候有着，气势可发。`
      : seen.length
        ? `${chart.dayMaster}生${chart.pillars.month.zhi}月，穷通取用${gans.join('、')}；已见${seen.join('、')}，不见${missing.join('、')}，须待岁运补出，方能大展。`
        : `${chart.dayMaster}生${chart.pillars.month.zhi}月，穷通取用${gans.join('、')}，局中不见，早年多憋屈，用神到位之运才是发身之时。`
  return { gans, wx, seen, missing, text }
}

/** 日主五行对应脏腑（传统对应，用于健康总批） */
const ZANGFU: Record<WuXing, string> = {
  木: '肝胆、筋目',
  火: '心小肠、血脉',
  土: '脾胃、湿滞',
  金: '肺大肠、呼吸道',
  水: '肾膀胱、泌尿生殖'
}

/**
 * 命书式总断标题。
 * @param chart 盘
 * @param trend 强弱喜用
 * @param gender 乾坤
 */
export function mingHeadline(
  chart: BaZiChart,
  trend: BaZiTrend,
  gender: 'male' | 'female'
): string {
  const who = gender === 'male' ? '乾造' : '坤造'
  const ling = trend.strengthBreakdown.deLing ? '得令' : '失令'
  const col = chart.hourUnknown ? '三柱' : '四柱'
  const congBit =
    trend.cong.kind !== '不从'
      ? `${trend.cong.kind}${trend.cong.follow ? '·' + trend.cong.follow : ''}。`
      : ''
  return `【${who}${col}总批】日主${chart.dayMaster}${ling}${trend.strength}。${congBit}利：用神取${trend.useful.join('、')}到位可发；弊：忌神${trend.avoid.join('、')}当令须守。${
    gender === 'female' ? femaleHeadlineCareerMarriageBalance() + '。' : ''
  }`
}

/**
 * 命书收尾（传统总批口径，不再写「教学」）。
 */
export function mingDisclaimer(): string {
  return '以上依子平成法总批：月令、穷通取用、六亲宫与岁运应期为主，神煞为辅。岁运仍须逐年参详。'
}

/**
 * 当前大运与下步应期。
 * @param chart 盘
 * @param trend 走势（须带 dayun）
 */
export function mingYingQiText(chart: BaZiChart, trend: BaZiTrend): string {
  if (!trend.dayun.length) return '大运未排，应期不论。'
  const age = chart.solar.year > 0 ? new Date().getFullYear() - chart.solar.year : 28
  const cur =
    [...trend.dayun].reverse().find((d) => age >= d.ageFrom) ?? trend.dayun[0]
  const idx = trend.dayun.findIndex((d) => d.gz === cur.gz && d.ageFrom === cur.ageFrom)
  const next = idx >= 0 ? trend.dayun[idx + 1] : undefined
  const good = cur.score >= 60
  const nowLine = good
    ? `利：当前${cur.gz}运（${cur.ganShiShen}，约${cur.ageFrom}–${cur.ageTo}岁）与用神同气，宜进取、可成事。弊：流年叠忌神仍须收手，不可当作一路顺风。`
    : `利：当前${cur.gz}运（${cur.ganShiShen}，约${cur.ageFrom}–${cur.ageTo}岁）宜守成、可保身。弊：与用神相驳，少开新局、勿加杠杆。`
  const nextLine = next
    ? next.score >= 60
      ? `交${next.gz}运（${next.ganShiShen}，约${next.ageFrom}岁）后局面转宽，可作进运看，仍防交运前后动荡。`
      : `交${next.gz}运（${next.ganShiShen}，约${next.ageFrom}岁）后仍须谨慎，勿在驳运上加码。`
    : ''
  return `${nowLine}${nextLine}换步前后三日及流月交节窗口宜收，勿叠加大动作。`
}

/**
 * 六亲宫总批：关系网（宫位×生克×耗神）+ 吉凶并陈。
 * @param chart 盘
 * @param trend 强弱
 * @param unique 透干十神（保留参数，供调用方一致）
 * @param gender 乾坤
 */
export function mingKinText(
  chart: BaZiChart,
  trend: BaZiTrend,
  unique: ShiShen[],
  gender: 'male' | 'female'
): string {
  void unique
  return judgeKinNetwork(chart, trend, gender).text
}

/**
 * 健康总批：日主脏腑 + 忌神过旺所伤。
 * @param chart 盘
 * @param trend 喜用忌
 */
export function mingHealthText(chart: BaZiChart, trend: BaZiTrend): string {
  const wx = chart.dayMasterWuXing as WuXing
  const avoid = trend.avoid.join('、')
  return `利：用神到位之年，${ZANGFU[wx]}可缓、体质易养。弊：日主属${wx}，忌神${avoid}当令之年此处最宜保养，勿过劳硬撑，叠并之年须防旧疾反复。`
}

/** 地支六冲，用来看夫妻宫是否被年/月冲（波折象，不是离婚判决） */
const LIU_CHONG: Record<DiZhi, DiZhi> = {
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

/** 情缘象意档：少/中/多波折，禁止映射成「谈过 N 次」 */
export type RomanceWave = '少' | '中' | '多波折'

/** 婚质档：可成 / 晚成 / 口舌 / 分合 */
export type MarriageGrain = '可成' | '晚成' | '口舌' | '分合'

/** 姻缘可编码倾向（象意，非户口本计数） */
export interface MarriageOutlook {
  /** 情缘段数倾向 */
  wave: RomanceWave
  /** 婚姻质量倾向 */
  grain: MarriageGrain
  /** 看过哪些星，写入依据 */
  basisStars: string[]
  /** 合成总批（吉凶并陈） */
  text: string
}

/**
 * 是否命中指定神煞。
 * @param shensha 神煞列表
 * @param name 神煞名
 */
function hitSha(shensha: ShenShaHit[], name: string): boolean {
  return shensha.some((s) => s.name === name)
}

/**
 * 按性别取配偶星十神。
 * 男命看财，女命看官杀——这是子平常法，不是性别刻板印象作文。
 * @param gender 乾坤
 */
function spouseStars(gender: 'male' | 'female'): ShiShen[] {
  return gender === 'male' ? ['正财', '偏财'] : ['正官', '七杀']
}

/**
 * 统计配偶星透干与藏干次数（用于情缘象，不是恋爱计数）。
 * @param chart 盘
 * @param stars 配偶星
 */
function countSpouseStar(chart: BaZiChart, stars: ShiShen[]): { tou: number; cang: number } {
  let tou = 0
  let cang = 0
  const pillars = [
    chart.pillars.year,
    chart.pillars.month,
    chart.pillars.day,
    ...(chart.pillars.hour ? [chart.pillars.hour] : [])
  ]
  for (const p of pillars) {
    if (p.ganShiShen !== '日主' && stars.includes(p.ganShiShen)) tou += 1
    for (const c of p.canggan) {
      if (stars.includes(c.shiShen)) cang += 1
    }
  }
  return { tou, cang }
}

/**
 * 姻缘可编码倾向：情缘段数用神煞与配偶星「出现层次」估波折，婚质看任星、口舌、分合。
 * 只许输出少/中/多波折，禁止写成「谈过三次恋爱」。
 * @param chart 盘
 * @param trend 强弱喜用与大运
 * @param unique 透干十神
 * @param gender 乾坤
 * @param shensha 神煞命中
 */
export function judgeMarriageOutlook(
  chart: BaZiChart,
  trend: BaZiTrend,
  unique: ShiShen[],
  gender: 'male' | 'female',
  shensha: ShenShaHit[] = []
): MarriageOutlook {
  const stars = spouseStars(gender)
  const { tou, cang } = countSpouseStar(chart, stars)
  const taoHua = hitSha(shensha, '桃花')
  const hongYan = hitSha(shensha, '红艳煞')
  const hongLuan = hitSha(shensha, '红鸾')
  const tianXi = hitSha(shensha, '天喜')
  const guLuan = hitSha(shensha, '孤鸾煞')
  const yinCha = hitSha(shensha, '阴差阳错')
  const biJie = unique.includes('比肩') || unique.includes('劫财')
  const shangGuan = unique.includes('伤官') && unique.includes('正官')
  const dayZhi = chart.pillars.day.zhi
  const chongGong =
    LIU_CHONG[dayZhi] === chart.pillars.year.zhi || LIU_CHONG[dayZhi] === chart.pillars.month.zhi
  const weak = trend.strength === '偏弱'
  const canRen = !weak && tou > 0

  const basisStars: string[] = [`日支${dayZhi}配偶宫`]
  if (tou) basisStars.push(`配偶星透${tou}`)
  if (cang) basisStars.push(`配偶星藏${cang}`)
  if (taoHua) basisStars.push('桃花')
  if (hongYan) basisStars.push('红艳')
  if (hongLuan) basisStars.push('红鸾')
  if (tianXi) basisStars.push('天喜')
  if (guLuan) basisStars.push('孤鸾')
  if (yinCha) basisStars.push('阴差阳错')
  if (biJie) basisStars.push('比劫')
  if (shangGuan) basisStars.push('伤官见官')
  if (chongGong) basisStars.push('夫妻宫被冲')

  let pts = 0
  if (taoHua) pts += 2
  if (hongYan) pts += 2
  if (hongLuan) pts += 1
  if (tianXi) pts += 1
  if (guLuan) pts += 1
  if (tou > 0) pts += 1
  if (cang > 0 && tou === 0) pts += 1
  if (biJie) pts += 1
  if (shangGuan) pts += 1
  if (chongGong) pts += 1
  const wave: RomanceWave = pts <= 1 ? '少' : pts <= 3 ? '中' : '多波折'

  let grain: MarriageGrain = '可成'
  if (guLuan || (biJie && tou > 0 && gender === 'male')) grain = '分合'
  else if (shangGuan || yinCha) grain = '口舌'
  else if (weak || (tou === 0 && cang === 0)) grain = '晚成'

  const waveText =
    gender === 'female'
      ? femaleRomanceWaveText(wave)
      : wave === '少'
        ? '情缘象偏清简，不宜理解成「没人缘」，而是段数不多、来得慢'
        : wave === '中'
          ? '情缘有几段象，易遇也易择，不是精确恋爱次数'
          : '桃花类星叠见，情缘偏多段、波折偏多，仍不是户口本上的次数'

  const good =
    canRen
      ? gender === 'female'
        ? '身能任配偶星，名分与相处可稳定经营，婚可论长久'
        : '身能任配偶星，名分可成，婚可论长久'
      : tou > 0
        ? '配偶星已透，婚缘议题可论，宜待身旺用神运再成'
        : cang > 0
          ? '配偶星藏支中，缘在暗处或岁运引出'
          : gender === 'female'
            ? '婚缘不在天干抢戏，宜先立身事业，晚成仍可成，不必以无婚论'
            : '婚缘不在天干抢戏，晚成仍可成，不必以无婚论'

  /** 女命伤官见官用可化解口径；男命保持原句 */
  const bad =
    grain === '分合'
      ? '孤鸾或比劫争星，主分合、重合象，成后仍须防争'
      : grain === '口舌'
        ? gender === 'female' && shangGuan
          ? femaleShangGuanJianGuanLine({ fun: false })
          : '伤官见官或阴差阳错，口舌顶撞多，硬碰则败、沟通则合'
        : grain === '晚成'
          ? gender === 'female'
            ? '身弱不能早任或配偶星不透，过早定名分易累，宜先立身再成'
            : '身弱不能早任或配偶星不透，早婚易累，宜晚成'
          : '可成之中仍有波折：忌神运、比劫年防口角分居之象'

  const yunHit = trend.dayun.some(
    (d) => stars.includes(d.ganShiShen) && d.score >= 55
  )
  const yunText = yunHit
    ? '大运见配偶星且不太驳，可作引动婚缘的应期看。'
    : '婚缘应期待配偶星或用神运，忌神运不宜草率定名分。'

  const who = gender === 'male' ? '男命' : '女命'
  /** 落柱与年龄倾向来自配偶星扫描，不改写段数档（段数以 wave 为准） */
  const spouse = judgeSpouse(chart, trend, unique, gender, shensha)
  const loc =
    spouse.hits.length > 0
      ? spouse.hits.map((h) => `${h.pillar}柱${h.layer}${h.gan}（${h.star}）`).join('、')
      : '四柱未见配偶星透藏'
  const ageLine =
    spouse.ageHint === '偏大'
      ? '正配年龄倾向偏大（年柱配偶星有力）'
      : spouse.ageHint === '偏小'
        ? '正配年龄倾向偏小（时柱配偶星有力）'
        : spouse.ageHint === '不明'
          ? '正配星不显，年龄不论死'
          : '正配不主年长'
  const dayWx = TIANGAN_WUXING[chart.dayMaster]
  const relation =
    gender === 'male'
      ? `${chart.dayMaster}（${dayWx}）克${spouse.spouseWx}为财，${spouse.spouseWx}即妻星`
      : femaleGuanShaRelationLine(chart.dayMaster, dayWx, spouse.spouseWx)
  const text = `${who}日支${dayZhi}为配偶宫。${relation}。落点：${loc}。${ageLine}。情缘段数倾向「${wave}」：${waveText}。婚质「${grain}」——利：${good}；弊：${bad}。${yunText}依据：${basisStars.join('、')}。禁止把段数理解成「谈过几次恋爱」。`

  return { wave, grain, basisStars, text }
}

/**
 * 命理口径的事业 / 财 / 姻缘 / 学业。每条必须吉凶并陈，禁止只报喜。
 * @param chart 盘
 * @param trend 走势
 * @param unique 透干
 * @param gender 乾坤
 * @param shensha 神煞（姻缘取桃花红鸾等）
 */
export function mingLifeTexts(
  chart: BaZiChart,
  trend: BaZiTrend,
  unique: ShiShen[],
  gender: 'male' | 'female',
  shensha: ShenShaHit[] = []
): {
  marriage: string
  career: string
  wealth: string
  study: string
  /** 姻缘可编码倾向，供断言写依据 */
  outlook: MarriageOutlook
} {
  const hasCai = unique.includes('正财') || unique.includes('偏财')
  const hasYin = unique.includes('正印') || unique.includes('偏印')
  const hasShiShang = unique.includes('食神') || unique.includes('伤官')
  const weak = trend.strength === '偏弱'
  const avoid = trend.avoid.join('、')
  const outlook = judgeMarriageOutlook(chart, trend, unique, gender, shensha)
  const marriage = outlook.text
  /** 女命传入 gender，事业线补强官杀职场双义 */
  const career = judgeCareer(chart, trend, unique, shensha, gender).text

  const wealth = hasCai
    ? weak
      ? `利：财星已透，财运议题可论。弊：身弱见财难任，求财反耗身；忌杠杆，比劫运可帮身亦可夺财。`
      : `利：身能任财，正财稳、偏财活，财运之年可进取。弊：比劫分利、忌神「${avoid}」年须收手，防表面风光实则破耗。`
    : hasShiShang
      ? `利：财不透而食伤透，财从手艺来，流年出财星是进账窗口。弊：未变现前易空忙，忌神年回款慢、勿赌偏财。`
      : `利：衣食看俸禄与用神运，仍可积少。弊：财星不显，难言横财，忌神年防破耗。`

  /** 学业用当代口径：印为用 ≠ 学历高 / 会读书，大专只算有学历 */
  const study = mingYinStudyText({ hasYin, weak, hasCai, hasShiShang, avoid })

  return { marriage, career, wealth, study, outlook }
}
