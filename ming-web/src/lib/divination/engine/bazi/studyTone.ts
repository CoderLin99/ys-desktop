/**
 * 印星 / 学业的当代口径：印为用只论学习、文书、贵人、平台、资质议题，
 * 不等于学历高、会读书、学术型或文凭优势。
 *
 * 当代「有学历」很宽：义务教育、高中、大专、本科都算有学历；
 * 大专是专科层次，不等于「多会读书」。
 */

/** 命理学业专项入参 */
export interface YinStudyToneInput {
  /** 是否印星（正印/偏印）透干 */
  hasYin: boolean
  /** 是否身弱（印常为用） */
  weak: boolean
  /** 是否财星并见（须防财坏印） */
  hasCai: boolean
  /** 是否食伤透干（实作/作品路线） */
  hasShiShang: boolean
  /** 忌神五行连写，用于忌神年提示 */
  avoid: string
}

/** 学业分区句入参（规则断言，非命理总批） */
export interface YinStudyTopicInput {
  /** 是否娱乐口风 */
  fun: boolean
  /** 是否印星透干 */
  hasYin: boolean
  /** 是否见文昌 */
  hasWenChang: boolean
  /** 是否食伤透干 */
  hasShiShang: boolean
  /** 喜用五行连写 */
  useful: string
}

/**
 * 注入 AI：学业/印星内部口径（模型遵守即可，禁止每段反复讲大专/学历层次）。
 * @returns 提示词片段
 */
export function modernYinStudyPromptGuide(): string {
  return [
    '【学业/印星·内部口径】印主学习、文书、贵人、平台、资质；印为用可论进修考证技能，禁止写成「学历高/会读书/学业证书是命门/学历光环」。',
    '层次口径（如大专属专科等）你心里清楚即可，禁止每段复读、禁止主动展开「有没有学历」说教；用户未问学历层次时不要提。'
  ].join('')
}

/**
 * 命理学业专项：印为用不写成学历高（层次口径不写入对外断语）。
 * @param input 印/财/食伤与身强弱
 * @returns 吉凶并陈的学业断语
 */
export function mingYinStudyText(input: YinStudyToneInput): string {
  const { hasYin, weak, hasCai, hasShiShang, avoid } = input
  if (hasYin) {
    if (weak) {
      return `利：印为用，可论进修、考证、技能与平台资质，印运宜加码学习。弊：不等于学历高或会读书；身弱贪多易不消化，忌神「${avoid}」年考证易延。`
    }
    if (hasCai) {
      return `利：印星有气可走技能进修、专业资质，不必攀学历高低。弊：财印并见，求财易冲学业，身强可兼、分心则两头空；勿把印旺说成文凭优势。`
    }
    return `利：印星有气，文书、进修、考证议题可论。弊：印多为忌则想多做少；印旺≠会读书，忌神年文书阻滞。`
  }
  if (hasShiShang) {
    return `利：印轻食伤重，实作、作品、手艺路线更贴。弊：纯应试死记不易顺，忌神年发表易惹口舌；手艺不等于学历优势。`
  }
  return `利：用神年加码学习、考证仍有功。弊：印与食伤皆不显，学业平常，忌神年不宜强考；勿因缺印就断成没学历。`
}

/**
 * 事业「印绶专业」利句：依平台/资质，不写学历优势。
 * @returns 吉面一句
 */
export function yinCareerGoodLine(): string {
  return '利：宜依平台、贵人、技能资质成事，走专业岗或考证路线；印为用只论学习议题，不等于学历高或会读书'
}

/**
 * 娱乐口风正印十神句。不把印写成学历光环。
 * @returns 娱乐断语
 */
export function funZhengYinLine(): string {
  return '贵人与进修机缘常在，适合充电考证；印旺不是学历光环，别理解成很会读书，也别变成只想不干。'
}

/**
 * 印星事业专项句（规则断言分区）。
 * @param fun 是否娱乐口风
 * @returns 事业分区断语
 */
export function yinCareerTopicLine(fun: boolean): string {
  return fun
    ? '印星透出：贵人、平台、考证机缘常在线；不等于学历很高或很会读书，别变成「只收藏教程不交作业」。'
    : '印星透干：贵人、文书、资质与平台助力偏显；宜转化为可持续能力，勿断成学历高或会读书。'
}

/**
 * 学业专项规则句（assert 分区）。
 * @param input 印/文昌/食伤与口风
 * @returns 学业分区断语
 */
export function yinStudyTopicLine(input: YinStudyTopicInput): string {
  const { fun, hasYin, hasWenChang, hasShiShang, useful } = input
  if (fun) {
    if (hasYin || hasWenChang) {
      return `印${hasYin ? '透' : '弱'}${hasWenChang ? '·文昌' : ''}：可论进修考证、技能文书，不等于会读书或学历高。别只收藏书单不翻开。`
    }
    if (hasShiShang) {
      return '食伤亮相：自学、表达、作品集路线更香，死记硬背考场未必是主舞台；手艺不等于学历。'
    }
    return `学业看印与文昌：本局印星不抢戏，进修宜选「用中学」；喜用「${useful}」年份宜加码学习。`
  }
  if (hasYin || hasWenChang) {
    return `印星${hasYin ? '透干' : '不显'}${hasWenChang ? '，又见文昌' : ''}：学业、文书、考试议题可论，印为用≠学历高；仍须结合身强弱，印多为喜则进修有益。`
  }
  if (hasShiShang) {
    return '食伤透干而印不显：偏技艺、表达、实作学习，纯理论应试未必最顺；勿把缺印理解成没学历。'
  }
  return `印与文昌皆不突出：学业评价宜看岁运引动印星与喜用「${useful}」是否到位；缺印不等于没学历。`
}
