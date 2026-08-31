/**
 * 事业路线：用神五行定行业象，月令/透干十神定任职方式，日主定做事风格。
 * 只给「适合哪类工作」的倾向，禁止写成保证工种或具体公司。
 */
import { TIANGAN_WUXING, type TianGan, type WuXing } from '../constants'
import type { BaZiChart } from './chart'
import type { BaZiTrend } from './trend'
import type { ShiShen } from './shishen'
import type { ShenShaHit } from './shensha'
import { yinCareerGoodLine } from './studyTone'
import { femaleGuanShaCareerLine } from './femaleTone'

/** 任职方式：官职 / 技艺 / 印绶 / 财营 / 合伙 */
export type CareerPath = '官职管理' | '技艺表达' | '印绶专业' | '财营经营' | '协作合伙'

/** 事业总批 */
export interface CareerJudgement {
  /** 任职方式 */
  path: CareerPath
  /** 用神五行对应的适合行业 */
  jobs: string[]
  /** 忌神五行对应的慎入行业 */
  avoidJobs: string[]
  /** 吉凶并陈总批 */
  text: string
}

/** 用神/忌神五行 → 行业象（教学归纳，非岗位录用保证） */
const WX_INDUSTRY: Record<WuXing, readonly string[]> = {
  木: ['教育培训', '文化出版', '园林家具', '服装设计', '咨询策划'],
  火: ['电子信息', '能源电力', '餐饮娱乐', '传播演讲', '光学光电'],
  土: ['建筑地产', '农业仓储', '本地服务', '中介信托'],
  金: ['金融法律', '机械金属', '汽车军工', '审计风控'],
  水: ['物流贸易', '航运水利', '旅游流动', '信息咨询', '饮料百货']
}

/** 十神 → 岗位象 */
const STAR_JOB: Record<ShiShen, string> = {
  正官: '体制或大机构职级、合规行政',
  七杀: '强竞争、军警法、应急攻坚、高压带队',
  正印: '文书资质、平台专业岗、技能进修（非学历高低）',
  偏印: '技术研发、策划设计、专项深钻',
  食神: '技艺服务、餐饮、温和创作与教学',
  伤官: '创意设计、技术发明、表达演辩、自由专业',
  正财: '财务会计、实业、稳健经营',
  偏财: '贸易销售、投资流动、商务开拓',
  比肩: '合伙协作、同行技术、自主执业',
  劫财: '竞争销售、开拓抢局（须防争财）'
}

/** 日主做事风格（性格象，行业仍以用神为准） */
const DAY_STYLE: Record<TianGan, string> = {
  甲: '宜带头做骨架、管项目，忌纯螺丝钉',
  乙: '宜柔性设计、协调服务，忌硬碰硬刚',
  丙: '宜公开场合、传播带动，忌长期阴暗后台',
  丁: '宜精细打磨、灯火文书，忌粗放蛮干',
  戊: '宜厚重信任、基建落地，忌飘忽投机',
  己: '宜本地服务、中介整合，忌好高骛远',
  庚: '宜决断执行、机械军工，忌优柔寡断',
  辛: '宜精密珠宝、细节金融，忌脏累粗活长期耗身',
  壬: '宜流动策划、信息开拓，忌一岗到老毫无变化',
  癸: '宜研究细作、医药文秘，忌抛头露面硬场'
}

/**
 * 去重并截断行业列表，避免断语过长。
 * @param items 行业
 * @param limit 最多条数
 */
function takeJobs(items: string[], limit: number): string[] {
  return [...new Set(items)].slice(0, limit)
}

/**
 * 按五行表展开行业象。
 * @param wxs 五行列表
 */
function industriesOf(wxs: WuXing[]): string[] {
  return wxs.flatMap((wx) => [...WX_INDUSTRY[wx]])
}

/**
 * 月令提纲与透干决定任职方式；身弱则官杀财路线降级为依人/专业。
 * @param chart 盘
 * @param unique 透干十神
 * @param weak 是否身弱
 */
export function pickCareerPath(
  chart: BaZiChart,
  unique: ShiShen[],
  weak: boolean
): CareerPath {
  const monthStar = chart.pillars.month.ganShiShen
  const hasGuan = unique.includes('正官') || unique.includes('七杀')
  const hasShiShang = unique.includes('食神') || unique.includes('伤官')
  const hasYin = unique.includes('正印') || unique.includes('偏印')
  const hasCai = unique.includes('正财') || unique.includes('偏财')
  const hasBi = unique.includes('比肩') || unique.includes('劫财')

  /** 月干十神优先作提纲 */
  if (monthStar === '食神' || monthStar === '伤官') return '技艺表达'
  if (monthStar === '正印' || monthStar === '偏印') return '印绶专业'
  if ((monthStar === '正官' || monthStar === '七杀') && !weak) return '官职管理'
  if ((monthStar === '正财' || monthStar === '偏财') && !weak) return '财营经营'
  if (monthStar === '比肩' || monthStar === '劫财') return '协作合伙'

  if (weak) {
    if (hasYin) return '印绶专业'
    if (hasShiShang) return '技艺表达'
    if (hasBi) return '协作合伙'
    return '印绶专业'
  }
  if (hasGuan) return '官职管理'
  if (hasCai) return '财营经营'
  if (hasShiShang) return '技艺表达'
  if (hasYin) return '印绶专业'
  return '协作合伙'
}

/**
 * 任职方式对应的岗位补充（与用神行业叠加）。
 * @param path 任职方式
 */
function pathJobs(path: CareerPath): string[] {
  if (path === '官职管理') return ['行政管理', '合规风控', '大机构职级']
  if (path === '技艺表达') return ['专业技术', '设计创作', '内容表达']
  if (path === '印绶专业') return ['文书培训', '资质技能岗', '平台专业岗']
  if (path === '财营经营') return ['经营销售', '财务实业']
  return ['合伙协作', '自主执业']
}

/**
 * 神煞对事业的辅证（权重低于用神）。
 * @param shensha 神煞
 */
function shaCareerHint(shensha: ShenShaHit[]): string {
  const names = new Set(shensha.map((s) => s.name))
  const bits: string[] = []
  if (names.has('文昌')) bits.push('有文昌，文书考试设计类加分')
  if (names.has('驿马')) bits.push('有驿马，外勤出差、跨地业务更贴')
  if (names.has('将星')) bits.push('有将星，带队管理象可作辅证')
  if (names.has('华盖')) bits.push('有华盖，宜钻研、艺术或冷门专业')
  return bits.length ? bits.join('；') + '。' : ''
}

/**
 * 本造事业总批：适合什么工作、慎入什么、利弊。
 * 女命传入 gender=female 时，官杀补强职场线并与配偶象分层。
 * @param chart 盘
 * @param trend 强弱喜用
 * @param unique 透干十神
 * @param shensha 神煞辅证
 * @param gender 乾坤；缺省按男命口径（不改男命观感）
 */
export function judgeCareer(
  chart: BaZiChart,
  trend: BaZiTrend,
  unique: ShiShen[],
  shensha: ShenShaHit[] = [],
  gender: 'male' | 'female' = 'male'
): CareerJudgement {
  const weak = trend.strength === '偏弱'
  const path = pickCareerPath(chart, unique, weak)
  const jobs = takeJobs([...industriesOf(trend.useful), ...pathJobs(path)], 6)
  const avoidJobs = takeJobs(industriesOf(trend.avoid), 4)
  const monthStar = chart.pillars.month.ganShiShen
  const monthLine = monthStar === '日主' ? '月干同我' : `月令提纲见${monthStar}`
  const starBits = unique.map((s) => STAR_JOB[s]).filter(Boolean)
  const starLine = starBits.length ? `透干象：${[...new Set(starBits)].join('；')}。` : ''
  const shaLine = shaCareerHint(shensha)
  const hasGuan = unique.includes('正官')
  const hasSha = unique.includes('七杀')

  /** 女命官职线点明职场晋升，避免被读成婚育 */
  const good =
    path === '官职管理'
      ? gender === 'female'
        ? '利：身能任官杀，可走职级、管理、规则内晋升；官杀此处先论职场，勿当作婚配判决'
        : '利：身能任官杀，可走职级、管理、规则内晋升'
      : path === '技艺表达'
        ? '利：食伤有气，宜凭手艺、作品、专业输出吃饭'
        : path === '印绶专业'
          ? yinCareerGoodLine()
          : path === '财营经营'
            ? '利：身能任财，可走经营、销售、实业'
            : '利：宜协作、合伙或自主执业，不必死守编制'

  const bad = weak
    ? `弊：身弱难任官杀财的重压，过早管人或创业易累；忌神「${trend.avoid.join('、')}」年不宜硬扛职级`
    : `弊：忌神「${trend.avoid.join('、')}」行业与年份易破格，跳槽硬刚或改行到忌神象限须慎`

  /** 女命追加官杀双义事业补强，与姻缘条目并列 */
  const femaleBoost =
    gender === 'female'
      ? femaleGuanShaCareerLine({ hasGuan, hasSha, weak, fun: false })
      : ''

  const text = [
    `${chart.dayMaster}日做事风格：${DAY_STYLE[chart.dayMaster]}。`,
    `${monthLine}，任职方式「${path}」。`,
    `用神「${trend.useful.join('、')}」，适合：${jobs.join('、')}。`,
    avoidJobs.length ? `忌神「${trend.avoid.join('、')}」，慎入：${avoidJobs.join('、')}。` : '',
    starLine,
    shaLine,
    femaleBoost ? `${femaleBoost}。` : '',
    `${good}；${bad}。`
  ]
    .filter(Boolean)
    .join('')

  return { path, jobs, avoidJobs, text }
}
