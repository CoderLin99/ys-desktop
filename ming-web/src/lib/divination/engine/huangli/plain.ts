/**
 * 黄历白话：把宜忌/冲煞/建除等传统词译成现代人话（教学向，非命运判决）。
 */
import type { HuangliDay } from './day'

/** 单条宜/忌的白话条目 */
export interface HuangliPlainItem {
  /** 原文（黄历词） */
  raw: string
  /** 现代白话 */
  plain: string
}

/** 黄历日白话解读包 */
export interface HuangliPlainRead {
  /** 今日一句话总览 */
  headline: string
  /** 生活节奏建议（宜做什么节奏、慎什么） */
  vibe: string
  /** 宜：原词 + 白话 */
  yi: HuangliPlainItem[]
  /** 忌：原词 + 白话 */
  ji: HuangliPlainItem[]
  /** 冲煞白话 */
  chongSha: string
  /** 值神白话 */
  tianShen: string
  /** 建除白话 */
  zhiXing: string
  /** 二十八宿白话 */
  xiu: string
  /** 彭祖百忌白话（合并干支） */
  pengZu: string
  /** 方位白话 */
  direction: string
  /** 底部免责一句 */
  disclaimer: string
}

/**
 * 宜忌传统词 → 现代生活对照（覆盖 lunar-javascript 常见条目）。
 * 未命中时用通用兜底句。
 */
const YI_JI_PLAIN: Record<string, string> = {
  祭祀: '缅怀、感恩、扫墓或安静的仪式感活动',
  祈福: '许愿、祈愿、给自己打气（仪式感即可）',
  求嗣: '备孕、谈生育规划相关的事',
  开光: '开业仪式、启用新物件/新空间',
  塑绘: '装修美化、画画、做视觉设计',
  齐醮: '宗教或庄重仪式相关安排',
  斋醮: '斋戒、清净修行类活动',
  订盟: '订婚、定下长期合作意向',
  纳采: '提亲、正式谈婚嫁意向',
  问名: '提亲问名、交换基本信息（婚嫁流程）',
  嫁娶: '结婚、登记、办喜事',
  纳婿: '招赘、男方入女家相关安排',
  归宁: '回娘家探望',
  分居: '分家、分开居住相关安排',
  动土: '开工挖土、装修破土、大改水电',
  破土: '动工破土、开槽开挖',
  起基: '打地基、奠基',
  定磉: '定地基石、基础定位',
  安葬: '安葬、迁葬等丧葬事务',
  修坟: '修整墓地',
  修造: '房屋修缮、装修改造',
  修门: '修门、换门框',
  上梁: '封顶、关键结构节点完工',
  合脊: '屋脊合拢、封顶节点',
  入宅: '搬家入住、乔迁',
  移徙: '搬家、换住处',
  开市: '开业、开张、上线开卖',
  交易: '签约买卖、大额交易',
  立券: '签合同、立字据',
  纳财: '收款、进账、理财入账',
  开仓: '开仓放货、库存大调动',
  出货财: '出货出钱、放款',
  置产: '置业、买房买大件资产',
  栽种: '种植、园艺、绿化',
  牧养: '养宠、畜牧相关',
  纳畜: '购置家畜/宠物',
  造畜稠: '建牲口棚/宠物窝相关',
  教牛马: '训养牲口（现代可对照训宠）',
  捕捉: '捕捞、抓捕类事务（现代少用）',
  取渔: '捕鱼、渔业相关',
  畋猎: '打猎类（现代基本不适用）',
  结网: '织网、准备渔猎工具（现代少用）',
  割蜜: '取蜜、收获类劳作',
  经络: '针灸、经络调理类医疗',
  针灸: '针灸理疗',
  求医: '挂号看病、求诊',
  治病: '治疗调养',
  疗病: '看病治疗',
  求医疗病: '就医、体检、求诊',
  探病: '探访病人',
  理发: '理发、造型、形象打理',
  沐浴: '洗澡、清洁、做SPA',
  整手足甲: '美甲、手足护理',
  裁衣: '做衣服、改衣、选购正装',
  合帐: '做帐幔、床品窗帘类',
  冠笄: '成人礼、重要装扮仪式',
  会亲友: '聚会、探亲、社交见面',
  进人口: '招人、加人、收徒',
  雇佣: '雇人、找帮手',
  雇庸: '雇人、找帮手',
  出行: '出门旅行、出差上路',
  乘船: '乘船出行、水路行程',
  安床: '换床、安新床、布置卧室',
  作灶: '厨房改造、装灶台',
  安门: '装门、换门',
  补垣: '修补围墙篱笆',
  塞穴: '堵漏洞、填坑补缺',
  平治道涂: '修路、整地、清理通道',
  修饰垣墙: '粉刷墙面、修整围墙外观',
  造桥: '修桥、重大基建（现代少用）',
  掘井: '打井、深挖工程',
  开池: '挖池、挖坑工程',
  开渠: '开渠、排水沟工程',
  开厕: '建厕、卫浴施工',
  伐木: '砍伐、大拆木结构',
  作梁: '做房梁、承重结构施工',
  竖柱: '立柱、竖结构',
  开柱眼: '开榫眼、结构开孔',
  架马: '搭脚手架、支模架',
  盖屋: '盖房、封顶施工',
  造船: '造船、大型载具相关',
  造车器: '造车、机械载具相关',
  安机械: '安装机器设备',
  安碓磑: '安碾磨等重设备（现代少用）',
  筑堤: '筑堤、护坡工程',
  破屋: '拆旧屋',
  坏垣: '拆墙',
  拆卸: '拆除、拆机拆装',
  放水: '排水、放水',
  开生坟: '预修寿坟（现代少用）',
  合寿木: '寿材相关（现代少用）',
  入殓: '入殓等丧葬事务',
  移柩: '移棺、出殡相关',
  行丧: '办丧事、出殡',
  除服: '脱孝服、结束丧期仪式',
  成服: '穿孝服等丧仪',
  立碑: '立碑、立纪念碑',
  启钻: '启钻开坟相关（现代少用）',
  谢土: '完工祭土、收工仪式',
  归岫: '归葬、迁葬入穴（现代少用）',
  词讼: '打官司、调解纠纷',
  赴任: '履新、上任、入职报到',
  临政: '上任处理公务',
  习艺: '学艺、考证、技能培训',
  入学: '入学、开课、报班',
  考试: '考试、面试测评',
  扫舍: '大扫除、清理环境',
  解除: '化解、结束旧事、解约善后',
  造仓: '建仓、扩库房',
  造庙: '建庙、宗教场所营建',
  安香: '安神位、安香火',
  出火: '分香、分火（民俗）',
  挂匾: '挂牌、揭幕',
  酬神: '还愿、答谢仪式',
  普渡: '普度、祭祀超度类仪式',
  雕刻: '雕刻、精细手工',
  断蚁: '灭蚁除虫',
  诸事不宜: '今天别硬开大事，能拖则拖、能简则简',
  馀事勿取: '除标明事项外，别的事也宜少折腾',
  无: '本日该项无特别条目'
}

/** 建除十二神白话 */
const ZHI_XING_PLAIN: Record<string, string> = {
  建: '适合开启、立项、定方向',
  除: '适合清理、去旧、解决问题',
  满: '适合收成、圆满类事务，忌再硬加码',
  平: '适合平常事务、协商、走流程',
  定: '适合拍板定案、签约定调',
  执: '适合执行、推进已定计划',
  破: '气场偏「破」、易反复，大事宜缓',
  危: '偏谨慎日，高风险决策宜收',
  成: '适合收尾、成交、完成交付',
  收: '适合收敛、归档、收款收尾',
  开: '适合公开、启动、摊开来做',
  闭: '适合收口、保密、少开新局'
}

/** 黄道/黑道白话 */
const TIAN_SHEN_TYPE_PLAIN: Record<string, string> = {
  黄道: '传统上偏顺、宜推进的日子类型',
  黑道: '传统上偏谨慎、宜守成的日子类型'
}

/** 值神吉凶白话 */
const LUCK_PLAIN: Record<string, string> = {
  吉: '偏顺利',
  凶: '偏谨慎',
  平: '平常'
}

/**
 * 翻译单条宜/忌词。
 * @param raw 黄历原词
 */
export function plainYiJi(raw: string): string {
  const key = raw.trim()
  if (YI_JI_PLAIN[key]) return YI_JI_PLAIN[key]
  // 去常见前后缀再试
  const stripped = key.replace(/^(宜|忌)/, '')
  if (YI_JI_PLAIN[stripped]) return YI_JI_PLAIN[stripped]
  return `传统事项「${key}」：按字面理解即可，现代可对照相近生活事务`
}

/**
 * 把宜/忌列表译成白话条目。
 * @param list 原词列表
 */
function mapYiJiList(list: string[]): HuangliPlainItem[] {
  return list.map((raw) => ({ raw, plain: plainYiJi(raw) }))
}

/**
 * 冲煞白话。
 * @param day 黄历日
 */
function plainChongSha(day: HuangliDay): string {
  const animal = day.chongDesc || day.chong || '—'
  const sha = day.sha || '—'
  return `今天冲「${animal}」：属相相冲的人可当个心情提醒，不必过度紧张。煞在「${sha}」方：大事可少往这方向硬冲（民俗参考）。`
}

/**
 * 值神白话。
 * @param day 黄历日
 */
function plainTianShen(day: HuangliDay): string {
  const type = TIAN_SHEN_TYPE_PLAIN[day.tianShenType] ?? `类型「${day.tianShenType || '—'}」`
  const luck = LUCK_PLAIN[day.tianShenLuck] ?? (day.tianShenLuck || '平常')
  return `值神「${day.tianShen || '—'}」：${type}，整体${luck}。`
}

/**
 * 建除白话。
 * @param day 黄历日
 */
function plainZhiXing(day: HuangliDay): string {
  const z = day.zhiXing || ''
  const tip = ZHI_XING_PLAIN[z] ?? '按当日宜忌行事即可'
  return `建除「${z || '—'}」日：${tip}。`
}

/**
 * 二十八宿白话。
 * @param day 黄历日
 */
function plainXiu(day: HuangliDay): string {
  const luck = LUCK_PLAIN[day.xiuLuck] ?? (day.xiuLuck || '平常')
  return `二十八宿「${day.xiu || '—'}」宿：传统标为${luck}。宿歌多是口诀记忆，可当文化趣闻，别当硬性禁令。`
}

/**
 * 彭祖百忌白话（把文言口诀译成人话提醒）。
 * @param day 黄历日
 */
function plainPengZu(day: HuangliDay): string {
  const gan = day.pengZuGan || ''
  const zhi = day.pengZuZhi || ''
  const bits: string[] = []
  if (gan) bits.push(glossPengZuLine(gan))
  if (zhi) bits.push(glossPengZuLine(zhi))
  if (!bits.length) return '本日彭祖百忌无特别条目。'
  return `彭祖百忌（古口诀，仅作提醒）：${bits.join('；')}。`
}

/**
 * 单句彭祖口诀的粗译。
 * @param line 如「乙不栽植千株不长」
 */
function glossPengZuLine(line: string): string {
  const t = line.trim()
  // 常见「X不……」句式：保留原句并补一句人话
  const m = t.match(/^(.+?)不(.+)$/)
  if (m) {
    return `「${t}」→ 旧说这一天不太适合硬做「${m[2]}」一类事，可改期或缩小动作`
  }
  return `「${t}」→ 当一句小心提示即可`
}

/**
 * 方位白话。
 * @param day 黄历日
 */
function plainDirection(day: HuangliDay): string {
  return `民俗方位参考：喜神${day.posXi || '—'}、福神${day.posFu || '—'}、财神${day.posCai || '—'}、阳贵${day.posYangGui || '—'}、阴贵${day.posYinGui || '—'}。可当「今天想讨个好彩头时往哪边走」的趣味提示。`
}

/**
 * 从宜忌与黄黑道生成今日 vibe + headline。
 * @param day 黄历日
 */
function buildHeadline(day: HuangliDay): { headline: string; vibe: string } {
  const isHuang = day.tianShenType === '黄道'
  const isHei = day.tianShenType === '黑道'
  const yiN = day.yi.length
  const jiN = day.ji.length
  const z = day.zhiXing

  let vibe: string
  if (z === '破' || z === '危' || z === '闭') {
    vibe = '今天节奏宜「守」：少开大项目，把已有的事做稳、沟通说清楚。'
  } else if (z === '成' || z === '定' || z === '开' || z === '建') {
    vibe = '今天节奏宜「推」：适合拍板、推进、启动，但仍要对着「忌」避开雷区。'
  } else if (isHei) {
    vibe = '今天偏谨慎日：小事照做，大额签约/动土/婚嫁类可再核对忌项。'
  } else if (isHuang) {
    vibe = '今天整体偏顺：可按「宜」办事，别只看宜不看忌。'
  } else {
    vibe = '平常日子：对照下方白话宜忌安排即可。'
  }

  const tone = isHuang ? '黄道偏顺' : isHei ? '黑道宜慎' : '平常'
  const headline = `${day.solarLabel} · ${tone} · 宜${yiN}项 / 忌${jiN}项 · 建除「${z || '—'}」`
  return { headline, vibe }
}

/**
 * 构建整日白话解读。
 * @param day 黄历日盘
 */
export function buildHuangliPlainRead(day: HuangliDay): HuangliPlainRead {
  const { headline, vibe } = buildHeadline(day)
  return {
    headline,
    vibe,
    yi: mapYiJiList(day.yi),
    ji: mapYiJiList(day.ji),
    chongSha: plainChongSha(day),
    tianShen: plainTianShen(day),
    zhiXing: plainZhiXing(day),
    xiu: plainXiu(day),
    pengZu: plainPengZu(day),
    direction: plainDirection(day),
    disclaimer: '黄历是民俗通书摘要，供文化参考与日程提醒，不作命运判决，也不替代法规与专业意见。'
  }
}

/**
 * 把白话解读拼进助手事实包。
 * @param day 黄历日
 * @param plain 白话包
 */
export function formatHuangliPlainFacts(day: HuangliDay, plain: HuangliPlainRead): string {
  const yiLines = plain.yi.map((x) => `${x.raw}→${x.plain}`).join('；')
  const jiLines = plain.ji.map((x) => `${x.raw}→${x.plain}`).join('；')
  return [
    `【白话总览】${plain.headline}`,
    plain.vibe,
    `宜（白话）：${yiLines || '—'}`,
    `忌（白话）：${jiLines || '—'}`,
    plain.chongSha,
    plain.tianShen,
    plain.zhiXing,
    plain.xiu,
    plain.pengZu,
    plain.direction,
    plain.disclaimer
  ].join('\n')
}
