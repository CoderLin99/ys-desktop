/**
 * 六爻：铜钱起卦、六亲、世应、六神与教学断语。
 *
 * 规则归纳：
 * 1. 三枚铜钱：三背=老阳(9动)，两背=少阴(8)，两字=少阳(7)，三字=老阴(6动)
 * 2. 自下而上装六爻
 * 3. 六亲：兄弟/子孙/妻财/官鬼/父母（相对本宫五行）
 * 4. 世应：八宫世位口诀
 * 5. 「跟影子打架」：用神落空、应爻发动克世却无实应、或心象争讼类提示
 */
import { KE, SHENG, type WuXing } from '../constants'

/** 单爻阴阳：阳 true */
export type YaoValue = 6 | 7 | 8 | 9

/** 八卦 */
export const BAGUA = ['乾', '兑', '离', '震', '巽', '坎', '艮', '坤'] as const
export type BaGua = (typeof BAGUA)[number]

/** 八卦二进制：初爻为低位，1=阳 0=阴（先天数简化用京房） */
export const BAGUA_BITS: Record<BaGua, number> = {
  乾: 0b111,
  兑: 0b110,
  离: 0b101,
  震: 0b100,
  巽: 0b011,
  坎: 0b010,
  艮: 0b001,
  坤: 0b000
}

/** 八卦五行 */
export const BAGUA_WUXING: Record<BaGua, WuXing> = {
  乾: '金',
  兑: '金',
  离: '火',
  震: '木',
  巽: '木',
  坎: '水',
  艮: '土',
  坤: '土'
}

/** 六神顺序（甲乙起青龙） */
export const LIUSHEN = ['青龙', '朱雀', '勾陈', '螣蛇', '白虎', '玄武'] as const
export type LiuShen = (typeof LIUSHEN)[number]

export type LiuQin = '兄弟' | '子孙' | '妻财' | '官鬼' | '父母'

export interface YaoLine {
  /** 爻位 1..6 初到上 */
  position: number
  /** 铜钱值 */
  value: YaoValue
  /** 是否阳爻 */
  yang: boolean
  /** 是否动爻 */
  moving: boolean
  /** 六亲 */
  liuqin: LiuQin
  /** 六神 */
  liushen: LiuShen
  /** 是否世爻 */
  isShi: boolean
  /** 是否应爻 */
  isYing: boolean
  /** 地支纳甲（简化展示用） */
  naJiaZhi: string
}

export interface LiuYaoResult {
  /** 本卦名 */
  benGuaName: string
  /** 变卦名（无动则同本卦） */
  bianGuaName: string
  /** 上卦 / 下卦 */
  upper: BaGua
  lower: BaGua
  /** 六爻（初→上） */
  lines: YaoLine[]
  /** 教学断语 */
  hints: string[]
  /** 是否触发「影子争斗」类象 */
  shadowFight: boolean
}

/** 纳甲地支表：宫名 → 初到上六支（京房常用） */
const NAJIA: Record<BaGua, string[]> = {
  乾: ['子', '寅', '辰', '午', '申', '戌'],
  坤: ['未', '巳', '卯', '丑', '亥', '酉'],
  震: ['子', '寅', '辰', '午', '申', '戌'],
  巽: ['丑', '亥', '酉', '未', '巳', '卯'],
  坎: ['寅', '辰', '午', '申', '戌', '子'],
  离: ['卯', '丑', '亥', '酉', '未', '巳'],
  艮: ['辰', '午', '申', '戌', '子', '寅'],
  兑: ['巳', '卯', '丑', '亥', '酉', '未']
}

/**
 * 由三爻比特取八卦名。
 * @param bits 低位为初爻，1阳0阴
 */
export function bitsToGua(bits: number): BaGua {
  const found = (Object.entries(BAGUA_BITS) as [BaGua, number][]).find(([, b]) => b === (bits & 0b111))
  if (!found) throw new Error(`无法识别卦码: ${bits}`)
  return found[0]
}

/**
 * 六十四卦命名：下上组合。
 * @param lower 下卦
 * @param upper 上卦
 */
export function guaName(lower: BaGua, upper: BaGua): string {
  if (lower === upper) return `${lower}为${wuXingAlias(lower)}`
  return `${upper}${lower}`
}

/**
 * 纯卦别名用五行字（乾为天等）。
 * @param g 卦
 */
function wuXingAlias(g: BaGua): string {
  const map: Record<BaGua, string> = {
    乾: '天',
    坤: '地',
    震: '雷',
    巽: '风',
    坎: '水',
    离: '火',
    艮: '山',
    兑: '泽'
  }
  return map[g]
}

/**
 * 相对本宫五行取六亲。
 * @param palace 本宫五行
 * @param lineWx 爻五行（此处用纳甲地支五行简化，传入已算好的）
 */
export function liuqinOf(palace: WuXing, lineWx: WuXing): LiuQin {
  if (lineWx === palace) return '兄弟'
  if (SHENG[palace] === lineWx) return '子孙'
  if (KE[palace] === lineWx) return '妻财'
  if (KE[lineWx] === palace) return '官鬼'
  return '父母' // 生宫
}

/** 地支 → 五行（六爻纳甲用） */
const ZHI_WX: Record<string, WuXing> = {
  子: '水',
  亥: '水',
  寅: '木',
  卯: '木',
  巳: '火',
  午: '火',
  申: '金',
  酉: '金',
  辰: '土',
  戌: '土',
  丑: '土',
  未: '土'
}

/**
 * 八宫世爻位置（1初…6上）：本宫世在6，一世在1，二世2，三世3，四世4，五世5，游魂4，归魂3。
 * 简化：用下上卦关系估算宫位世爻——完整八宫需宫主表；此处用常见快捷：
 * 若内外相同世在6；否则按变爻数近似（教学版）。
 *
 * 更稳妥教学版：固定「本卦按京房八宫表」。内置简化表：按上下卦编码查世位。
 */
const SHI_POS: Record<string, number> = buildShiTable()

/**
 * 构建简化世爻表：键为「下|上」。
 * 完整八宫较繁，这里嵌入常用世位推法：
 * 世爻口诀按「宫主纯卦世六，依次变初～五得一世～五世，再变四为游魂，内三归魂」。
 */
function buildShiTable(): Record<string, number> {
  const table: Record<string, number> = {}
  const palaceOrder: BaGua[] = ['乾', '兑', '离', '震', '巽', '坎', '艮', '坤']

  for (const palace of palaceOrder) {
    // 世位序列对应的卦（变爻规则）
    let bits = BAGUA_BITS[palace] | (BAGUA_BITS[palace] << 3) // 上下同
    const shiSeq = [6, 1, 2, 3, 4, 5, 4, 3] // 本、一…五、游、归
    const flip = [0, 0, 1, 2, 3, 4, 3, 0] // 相对本宫翻哪些爻（索引示意）

    // 本宫
    const put = (b: number, shi: number) => {
      const lower = bitsToGua(b & 0b111)
      const upper = bitsToGua((b >> 3) & 0b111)
      table[`${lower}|${upper}`] = shi
    }
    put(bits, 6)

    // 一世到五世：依次翻第 1..5 爻
    for (let i = 1; i <= 5; i++) {
      bits ^= 1 << (i - 1)
      put(bits, i === 5 ? 5 : i)
    }
    // 游魂：翻第4爻（从五世）
    bits ^= 1 << 3
    put(bits, 4)
    // 归魂：翻内卦三爻回到本宫内卦
    const inner = BAGUA_BITS[palace]
    bits = (bits & 0b111000) | inner
    put(bits, 3)

    void shiSeq
    void flip
  }
  return table
}

/**
 * 由日干起六神（装在初爻，向上排）。
 * @param dayGan 日干文字
 */
export function liushenStart(dayGan: string): number {
  if ('甲乙'.includes(dayGan)) return 0
  if ('丙丁'.includes(dayGan)) return 1
  if ('戊'.includes(dayGan)) return 2
  if ('己'.includes(dayGan)) return 3
  if ('庚辛'.includes(dayGan)) return 4
  return 5 // 壬癸
}

/**
 * 掷一爻：模拟三枚铜钱。
 * @param rng 随机函数，默认 Math.random
 */
export function castOneYao(rng: () => number = Math.random): YaoValue {
  // 字=0 背=1；三枚和：0→6老阴，1→7少阳，2→8少阴，3→9老阳
  let backs = 0
  for (let i = 0; i < 3; i++) backs += rng() < 0.5 ? 1 : 0
  return ([6, 7, 8, 9] as YaoValue[])[backs]
}

/**
 * 铜钱起六爻并装卦。
 * @param options 可选日干（起六神）、自定义六爻值、随机源
 */
export function castLiuYao(options?: {
  dayGan?: string
  values?: YaoValue[]
  rng?: () => number
}): LiuYaoResult {
  const rng = options?.rng ?? Math.random
  const values: YaoValue[] =
    options?.values ?? Array.from({ length: 6 }, () => castOneYao(rng))
  if (values.length !== 6) throw new Error('须六爻')

  const yangs = values.map((v) => v === 7 || v === 9)
  const lowerBits = (yangs[0] ? 1 : 0) | (yangs[1] ? 2 : 0) | (yangs[2] ? 4 : 0)
  const upperBits = (yangs[3] ? 1 : 0) | (yangs[4] ? 2 : 0) | (yangs[5] ? 4 : 0)
  const lower = bitsToGua(lowerBits)
  const upper = bitsToGua(upperBits)

  // 变卦：动爻阴阳反转
  const bianYang = yangs.map((y, i) => (values[i] === 6 || values[i] === 9 ? !y : y))
  const bLower = bitsToGua((bianYang[0] ? 1 : 0) | (bianYang[1] ? 2 : 0) | (bianYang[2] ? 4 : 0))
  const bUpper = bitsToGua((bianYang[3] ? 1 : 0) | (bianYang[4] ? 2 : 0) | (bianYang[5] ? 4 : 0))

  // 本宫取下卦宫（简化：用下卦五行作宫）
  const palaceWx = BAGUA_WUXING[lower]
  const shi = SHI_POS[`${lower}|${upper}`] ?? 6
  const ying = ((shi + 2 - 1) % 6) + 1 // 世隔两位为应

  const najia = NAJIA[lower].map((z, i) => (i < 3 ? z : NAJIA[upper][i]))
  // 上下卦纳甲：初二三用下卦，四五上用上卦
  const zhis = [
    NAJIA[lower][0],
    NAJIA[lower][1],
    NAJIA[lower][2],
    NAJIA[upper][3],
    NAJIA[upper][4],
    NAJIA[upper][5]
  ]

  const dayGan = options?.dayGan ?? '甲'
  const ls0 = liushenStart(dayGan[0])

  const lines: YaoLine[] = values.map((value, i) => {
    const position = i + 1
    const zhi = zhis[i]
    const wx = ZHI_WX[zhi]
    return {
      position,
      value,
      yang: yangs[i],
      moving: value === 6 || value === 9,
      liuqin: liuqinOf(palaceWx, wx),
      liushen: LIUSHEN[(ls0 + i) % 6],
      isShi: position === shi,
      isYing: position === ying,
      naJiaZhi: zhi
    }
  })

  void najia

  const moving = lines.filter((l) => l.moving)
  const hints: string[] = []
  hints.push(`本卦：${guaName(lower, upper)}；变卦：${guaName(bLower, bUpper)}。`)
  hints.push(`世在第 ${shi} 爻，应在第 ${ying} 爻；世为自己，应为对方/事情另一端。`)

  if (moving.length === 0) {
    hints.push('六爻安静：事态尚稳，宜看用神旺衰与世应远近，不宜过度臆测。')
  } else {
    hints.push(`动爻 ${moving.map((m) => m.position).join('、')}：动而有变，先看动爻生克世应。`)
  }

  // 「跟影子打架」启发式
  let shadowFight = false
  const shiLine = lines.find((l) => l.isShi)!
  const yingLine = lines.find((l) => l.isYing)!

  // 应爻发动且为官鬼，或螣蛇/玄武临应，或问争却无实克
  if (
    yingLine.moving &&
    (yingLine.liuqin === '官鬼' || yingLine.liushen === '螣蛇' || yingLine.liushen === '玄武')
  ) {
    shadowFight = true
  }
  if (shiLine.liushen === '螣蛇' && moving.some((m) => m.liuqin === '官鬼')) {
    shadowFight = true
  }
  // 天水讼类：下坎上乾
  if (lower === '坎' && upper === '乾') {
    shadowFight = true
    hints.push('卦象近「天水讼」：宜止争，不宜硬刚。')
  }

  if (shadowFight) {
    hints.push(
      '【跟影子打架】提示：对立可能来自误会、投射或信息不完整——先核实事实，再决定是否交涉。'
    )
  } else {
    hints.push('若问人际冲突：核对用神是否为「官鬼/兄弟」，并区分应爻（对方）与自己的世爻。')
  }

  return {
    benGuaName: guaName(lower, upper),
    bianGuaName: guaName(bLower, bUpper),
    upper,
    lower,
    lines,
    hints,
    shadowFight
  }
}

/** 规则说明文本（UI「规则」页） */
export const RULE_DOCS = {
  bazi: [
    '天干10、地支12，日干为日主；其余干按生克合阴阳定十神。',
    '年柱看大环境/长辈，月柱看月令格局，日柱看自身与配偶宫，时柱看结果/子女。',
    '时辰未知可排三柱，并用十二时辰对照看哪些结论稳定。',
    '细盘行：主星/藏干（本气中气余气）/星运/自坐/空亡/纳音/神煞（参照常见排盘软件结构）。',
    '强弱：月令旺相休囚死 + 藏干通根权重 + 天干透出；喜用先扶抑，冬夏并入调候；真从则改写喜用。',
    '从格：身极弱无根无助且月令财官食伤可真从弱；身极旺印比成党可真从强；假从岁运一变须改回扶抑。',
    '大运按出生到节气间距折算起运岁数（阳男阴女顺、阴男阳女逆）；流年用立春后年柱。',
    '流月按节令交节时刻起月，交节前后三日为换月窗口；大运+流年+流月三层同气或冲动日支时议题更显。',
    '神煞：天乙/文昌/驿马/桃花/华盖/孤辰寡宿/羊刃/魁罡/空亡/禄神/太极/福星/天医/将星/国印/亡神/血刃。',
    '断言：融合渊海/真诠/千里/穷通/三命/滴天髓义理摘要 + 十神神煞；学习/娱乐两套口吻。',
    '历法：公历/农历互转；出生地经度 + 均时差做真太阳时校正（可关）；夏令时可选。'
  ],
  liuyao: [
    '铜钱起卦自下而上；6/9为动爻，变卦看发展。',
    '世爻=自己，应爻=对方或事的另一端；六亲定用神（官鬼压力、父母文书、妻财钱财等）。',
    '走势：用神得动生则顺，官鬼妄动克世则阻；一事一卦看近段。',
    '「跟影子打架」：应爻虚动、螣蛇/玄武、讼象——多是心象之争，先核实再动手。'
  ]
}
