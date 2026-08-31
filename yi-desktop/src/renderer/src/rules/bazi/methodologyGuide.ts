/**
 * 读盘方法论：六块结构说明，并映射到本程序已编码实现。
 * 供学堂展示、AI 润色注入。
 */
import {
  CANGGAN_WEIGHT,
  DIZHI_WUXING,
  TIANGAN_WUXING,
  type DiZhi,
  type TianGan,
  type WuXing
} from '../constants'
import type { BaZiChart } from './chart'

/** 单条方法论卡片 */
export interface MethodologyItem {
  /** 短 id */
  id: string
  /** 标题 */
  title: string
  /** 一句话要义 */
  gist: string
  /** 读盘要点（学堂展示） */
  keyPoints: string
  /** 本程序落地项 */
  ourImpl: string[]
}

/** 六块读盘指南 */
export const METHODOLOGY_SECTIONS: MethodologyItem[] = [
  {
    id: 'pillars-daymaster',
    title: '四柱与日主',
    gist: '日柱天干为日主，全盘十神、强弱、喜用均相对日主展开。',
    keyPoints: '先定日主，再看月令定旺衰；按节气历排盘，不以农历生肖代替年柱。',
    ourImpl: [
      '年月日时由 lunar-javascript 按节气起柱（非近似节气）',
      '年柱立春为界；月柱以「节」为界',
      '真太阳时 + 夏令时可选（BaZiView）',
      '时辰未知可排三柱并对照十二时辰'
    ]
  },
  {
    id: 'wuxing-balance',
    title: '五行平衡',
    gist: '天干、地支、藏干分权计分，得出五行力量与喜用神，而非简单数个数。',
    keyPoints: '藏干本气/中气/余气分权（约 1.0 / 0.7 / 0.5）计五行力量，作为取用神基础。',
    ourImpl: [
      '藏干本气/中气/余气权重表 CANGGAN_WEIGHT（通根与细盘共用）',
      'summarizeWuxingBalance() 输出五行力量条与文案',
      'judgeStrength：得令 + 通根 + 透干',
      'pickUseful：扶抑为主，极端季节并入调候'
    ]
  },
  {
    id: 'shishen',
    title: '十神',
    gist: '以日主为中心，把其余干支译为财、官、印、食伤、比劫的人生结构。',
    keyPoints: '同五行分比肩劫财，生我分正偏印，我生分食神伤官，克我分正官七杀，我克分正偏财。',
    ourImpl: ['shishen.ts 相对日主计算', '细盘每柱主星/藏干十神', '断言与 AI 分区按十神专项输出']
  },
  {
    id: 'shensha',
    title: '神煞',
    gist: '天乙、桃花、驿马等传统标记，作辅证，不得压过用神格局。',
    keyPoints: '神煞可查 50+ 项（含三命通会体系），仍须服从格局喜用，不可单煞定论。',
    ourImpl: [
      'shensha.ts 全库查表（50+ 项，含天乙/文昌/桃花/红鸾/孤鸾等）',
      '按柱分组展示；断言优先级：用神 > 神煞',
      'RAG 已收录三命通会全文片段供 AI 取义'
    ]
  },
  {
    id: 'dayun',
    title: '大运',
    gist: '十年一运，换运如换季；须精确起运岁数与交运时刻，再叠流年流月。',
    keyPoints: '大运起运须精确到时辰；流年是叠加应期窗口，与大运同看。',
    ourImpl: [
      'yun.ts：EightChar.getYun 节气折算起运',
      'liunian.ts：大运/流年/流月日历点选注入命师',
      'TrendView 与每日运势叠流年流日评分'
    ]
  },
  {
    id: 'pattern',
    title: '格局',
    gist: '除五行强弱外，须看月令成格、从格、合化等特殊结构。',
    keyPoints: '须识别正格、从格、专旺、化气等结构，并处理地支合局改变五行。',
    ourImpl: [
      'cong.ts：真从/假从/从财杀儿旺',
      'hehua.ts：天干五合、地支六合三合与成化条件',
      'classics.ts：渊海/真诠等格局断语摘要',
      'geJuFromMonthStar 等成格辅助判断'
    ]
  }
]

/** 排盘五关校验（准确命盘前置条件） */
export const CHART_QUALITY_GATES: string[] = [
  '第一关 · 节气月建：月柱以节令为界，不用农历月份硬套',
  '第二关 · 立春年界：年柱以立春为界，不用春节',
  '第三关 · 真太阳时：出生地经度 + 均时差（可选）',
  '第四关 · 子时口径：本程序按整点时辰排时柱，与部分软件 23–01 早子时规则可能不同',
  '第五关 · 起运时刻：大运起运由节气折算，非写死八岁'
]

/**
 * 压成 AI / 学堂用的方法论文本包。
 */
export function buildMethodologyGuidePack(): string {
  const lines = ['【读盘方法论】子平常法六块结构，实现见本程序规则层。']
  for (const s of METHODOLOGY_SECTIONS) {
    lines.push(`《${s.title}》${s.gist}`)
    lines.push(`· ${s.ourImpl.join('；')}`)
  }
  lines.push('【排盘五关】' + CHART_QUALITY_GATES.join('；'))
  return lines.join('\n')
}

/** 五行力量汇总 */
export interface WuxingBalanceSummary {
  /** 各五行相对分（0–100 归一展示用） */
  scores: Record<WuXing, number>
  /** 一句说明 */
  text: string
  /** 最强与最弱五行 */
  strongest: WuXing
  weakest: WuXing
}

/**
 * 按藏干权重统计全盘五行力量。
 * @param chart 八字盘
 */
export function summarizeWuxingBalance(chart: BaZiChart): WuxingBalanceSummary {
  /** @type {Record<WuXing, number>} */
  const raw: Record<WuXing, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 }

  /**
   * 累加某天干力量。
   * @param gan 天干
   * @param w 权重
   */
  const addGan = (gan: TianGan, w: number) => {
    raw[TIANGAN_WUXING[gan]] += w
  }

  /**
   * 累加某地支（含藏干）。
   * @param zhi 地支
   * @param stemWeight 天干透出附加权重
   */
  const addZhi = (zhi: DiZhi, stemWeight = 0) => {
    raw[DIZHI_WUXING[zhi]] += 0.15
    for (const c of CANGGAN_WEIGHT[zhi]) {
      raw[TIANGAN_WUXING[c.gan]] += c.weight
    }
    if (stemWeight) raw[DIZHI_WUXING[zhi]] += stemWeight * 0.05
  }

  for (const p of [chart.pillars.year, chart.pillars.month, chart.pillars.day, chart.pillars.hour]) {
    if (!p) continue
    addGan(p.gan, 1.0)
    addZhi(p.zhi, 1.0)
  }

  const total = Object.values(raw).reduce((a, b) => a + b, 0) || 1
  /** @type {Record<WuXing, number>} */
  const scores = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 }
  for (const wx of Object.keys(scores) as WuXing[]) {
    scores[wx] = Math.round((raw[wx] / total) * 100)
  }

  const sorted = (Object.entries(scores) as [WuXing, number][]).sort((a, b) => b[1] - a[1])
  const strongest = sorted[0][0]
  const weakest = sorted[sorted.length - 1][0]
  const text = `五行力量（藏干加权）：${sorted.map(([w, s]) => `${w}${s}%`).join('、')}。偏旺${strongest}、偏弱${weakest}，取用神须先看日主在月令之强弱，不能单看数量。`

  return { scores, text, strongest, weakest }
}
