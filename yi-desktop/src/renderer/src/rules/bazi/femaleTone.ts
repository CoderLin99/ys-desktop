/**
 * 女命现代口径：官杀双义（职场规则/压力/晋升 ↔ 相处名分/压力协作）分层书写，
 * 禁止「从夫」「宜室宜家」「嫁得好」等过时婚育判决；段数仍是象意不是恋爱次数。
 * 查法仍保留男财女官，只改断语层观感；男命逻辑不走本模块。
 */

/** 女命伤官见官入参 */
export interface FemaleShangGuanInput {
  /** 是否娱乐口风 */
  fun: boolean
}

/** 女命官杀双义入参（事业侧补强） */
export interface FemaleGuanShaCareerInput {
  /** 是否透正官 */
  hasGuan: boolean
  /** 是否透七杀 */
  hasSha: boolean
  /** 是否身弱 */
  weak: boolean
  /** 是否娱乐口风 */
  fun?: boolean
}

/**
 * 注入 AI 润色/推断：坤造须事业与姻缘并列，官杀分层，禁用过时话术。
 * 无性别入参时也可注入——仅在材料为坤造时生效。
 * @returns 提示词片段
 */
export function modernFemaleMingPromptGuide(): string {
  return [
    '【女命/坤造现代口径】若本造为女命或坤造：',
    '①事业与姻缘并列写，事业条目篇幅与权重不低于姻缘；禁止把女命写成「只论婚育」。',
    '②官杀双义必须分层：一层论职场规则/考核/压力/晋升，一层论相处名分/压力协作；禁止混成一句「嫁得好」「从夫」「宜室宜家」。',
    '③查法仍是女看官杀，但断语用现代相处与职场语言；情缘段数只许少/中/多波折，禁止恋爱次数。',
    '④伤官见官只作沟通/名分摩擦象，须写可化解（通关、沟通、用神运），禁止宿命判决。',
    '⑤印星学业复用现代口径：印≠学历高/会读书。'
  ].join('')
}

/**
 * 女命配偶星查法说明（现代相处口径，保留男财女官查法）。
 * @returns 一句映射文案
 */
export function femaleSpouseStarMapText(): string {
  return '女命配偶星查法仍看官杀：正官主正缘名分与稳定相处，七杀主偏缘或相处/协作中的压力管束——只表正偏与压力层次，不作从属判决'
}

/**
 * 女命官杀五行关系句：先点出夫星查法，再点职场双义，避免只剩婚育。
 * @param dayMaster 日主天干字
 * @param dayWx 日主五行
 * @param spouseWx 官杀对应五行
 * @returns 关系说明
 */
export function femaleGuanShaRelationLine(
  dayMaster: string,
  dayWx: string,
  spouseWx: string
): string {
  return (
    `克${dayMaster}（${dayWx}）者为${spouseWx}官杀：查法上${spouseWx}可作夫星；` +
    `同时官杀亦主职场规则、考核压力与晋升议题——姻缘与事业须分层看，勿只论婚育、勿把职场压力读成婚配判决`
  )
}

/**
 * 女命配偶总批利句：现代相处/名分，不用宜室宜家。
 * @param usefulOk 夫星五行是否落在用神
 * @param who 称呼（夫）
 * @returns 利面一句
 */
export function femaleSpouseGoodLine(usefulOk: boolean, who: '夫' = '夫'): string {
  return usefulOk
    ? `利：${who}星五行属用神，相处名分与协作节奏较顺，可论稳定经营`
    : `弊：${who}星五行不在用神，感情易耗身或名实不符，宜慢确认再定名分`
}

/**
 * 女命配偶总批弊句：身弱难任或压力协作，禁止从夫口吻。
 * @param weak 是否身弱
 * @param who 称呼（夫）
 * @returns 弊面一句
 */
export function femaleSpouseBurdenLine(weak: boolean, who: '夫' = '夫'): string {
  return weak
    ? `弊：身弱难任${who}星，过早定名分易累，宜先立身再谈长久相处`
    : `弊：岁运冲配偶宫或压力过重时，仍有口舌与分合之危，宜沟通协作勿硬扛`
}

/**
 * 女命情缘段数说明（象意，非恋爱次数）。
 * @param wave 段数档
 * @returns 说明句
 */
export function femaleRomanceWaveText(
  wave: '偏少' | '一段为主' | '多段波折' | '少' | '中' | '多波折'
): string {
  if (wave === '多段波折' || wave === '多波折') {
    return '情缘偏多段、易分合，不是精确「谈过几次」，只是桃花/多柱配偶星的象意'
  }
  if (wave === '偏少' || wave === '少') {
    return '情缘不密，宜先立身再谈名分，勿硬凑早定；不是「没人要」'
  }
  return '一段为主，间有波折，成事看用神运与沟通，不是恋爱次数'
}

/**
 * 女命伤官见官：沟通/名分摩擦 + 可化解，勿宿命。
 * @param input 口风
 * @returns 断语
 */
export function femaleShangGuanJianGuanLine(input: FemaleShangGuanInput): string {
  if (input.fun) {
    return '坤造伤官见官：嘴替与规矩易顶牛，恋爱与职场都像连续剧——先把话说清楚、用沟通通关，再定名分；不是注定婚灾。'
  }
  return (
    '女命伤官见官：主沟通方式与名分/规则摩擦象（职场考核与相处皆可显）；' +
    '宜以喜用通关、把诉求说清、缓定名分来化解，勿单凭此条作婚运宿命判决'
  )
}

/**
 * 女命事业侧：官杀双义补强句（与配偶星分层，禁止嫁得好）。
 * @param input 官杀与身强弱
 * @returns 补强断语；无官杀则空串
 */
export function femaleGuanShaCareerLine(input: FemaleGuanShaCareerInput): string {
  const { hasGuan, hasSha, weak, fun } = input
  if (!hasGuan && !hasSha) return ''
  const stars =
    hasGuan && hasSha ? '正官、七杀' : hasGuan ? '正官' : '七杀'
  if (fun) {
    return weak
      ? `${stars}在线：职场像有Boss副本，但血条偏虚——先攒装备再冲职级；别把官杀只理解成找对象。`
      : `${stars}在线：职场规则/压力/晋升戏份不输感情线——官杀先论工作副本，再另开一章谈相处，别混成婚育唯一剧本。`
  }
  return weak
    ? `${stars}透干：女命官杀须分层——事业侧主考核压力与规则约束，身弱宜先专业深耕再扛职级；相处侧另论名分协作，禁止写成婚育唯一判决。`
    : `${stars}透干：女命官杀双义分层——①职场规则、考核、管理压力与晋升议题；②相处名分与压力协作。两层分写，事业权重不低于姻缘，禁止过时从属话术。`
}

/**
 * 坤造总断标题附加：事业与姻缘并重。
 * @returns 短后缀（无句号）
 */
export function femaleHeadlineCareerMarriageBalance(): string {
  return '事业与姻缘并重，官杀职场/相处分层论'
}

/**
 * 过时女命话术黑名单（测试与自检用）。
 * @returns 禁止出现的子串列表
 */
export function femaleMingBannedPhrases(): readonly string[] {
  return ['从夫', '宜室宜家', '嫁得好', '宜家宜室', '夫唱妇随', '三从四德'] as const
}
