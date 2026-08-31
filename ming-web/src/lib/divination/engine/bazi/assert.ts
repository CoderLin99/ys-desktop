/**
 * 规则模板断言：强弱 / 十神 / 神煞 / 经典义理 / 专项。
 * - ming：命理总批（默认）
 * - study：教学复盘
 * - fun：娱乐戏说
 */
import type { BaZiChart } from './chart'
import type { BaZiTrend } from './trend'
import type { ShenShaHit } from './shensha'
import { formatShenShaEvidence } from './shensha'
import { formatShenShaStackSummary } from './shenshaStack'
import { formatEvidence, type RuleEvidence } from './evidence'
import { explainShiShen, SHISHEN_BRIEF, type ShiShen } from './shishen'
import { buildClassicAssertLines } from './classics'
import { judgeCareer } from './career'
import {
  mingDisclaimer,
  mingHeadline,
  mingHealthText,
  mingKinText,
  mingLifeTexts,
  mingYingQiText
} from './ming'
import { summarizeWuxingBalance } from './methodologyGuide'
import { funZhengYinLine, yinCareerTopicLine, yinStudyTopicLine } from './studyTone'
import { femaleGuanShaCareerLine, femaleShangGuanJianGuanLine } from './femaleTone'

/** 断言语气：命理总批 / 学习 / 娱乐 */
export type AssertionTone = 'ming' | 'study' | 'fun'

/** 断言分类（含专项，供 UI 与 AI 分区） */
export type AssertionCategory =
  | '格局'
  | '十神'
  | '神煞'
  | '提示'
  | '流年彩头'
  | '经典'
  | '姻缘'
  | '事业'
  | '财运'
  | '学业'
  | '六亲'
  | '健康'
  | '应期'

/** 单条断言 */
export interface AssertionItem {
  /** 分类 */
  category: AssertionCategory
  /** 断语文案 */
  text: string
  /** 触发依据（便于复盘） */
  basis: string
}

/**
 * AI 润色用分区载荷：总断 + 喜用格局 + 专项 + 神煞/经典等。
 * 键名固定，便于 prompt 分区加载与按区输出。
 */
export interface AssertionAiSections {
  /** 一句话总断 */
  总断: string
  /** 格局 / 喜用 / 流年彩头类 */
  喜用格局: string[]
  /** 姻缘专项 */
  姻缘: string[]
  /** 事业专项 */
  事业: string[]
  /** 财运专项 */
  财运: string[]
  /** 学业专项 */
  学业: string[]
  /** 六亲宫 */
  六亲: string[]
  /** 健康 */
  健康: string[]
  /** 岁运应期 */
  应期: string[]
  /** 十神象意 */
  十神: string[]
  /** 神煞辅证 */
  神煞: string[]
  /** 经典义理条 */
  经典: string[]
  /** 时辰未知等提示 */
  提示: string[]
  /** 免责声明 */
  声明: string
}

/** 断言结果 */
export interface AssertionResult {
  /** 当前语气 */
  tone: AssertionTone
  /** 一句话总括 */
  headline: string
  /** 分条断语 */
  items: AssertionItem[]
  /** 结构化摘要（可交给 AI 润色） */
  structured: {
    dayMaster: string
    strength: string
    useful: string[]
    avoid: string[]
    shensha: string[]
    hourUnknown: boolean
    tone: AssertionTone
    classics: string[]
    /** 藏干加权五行力量摘要 */
    wuxingBalance: string
    /** 从格：不从 / 真从弱·从财 等 */
    cong: string
    /** 专项断语原文（机读） */
    topics: {
      marriage: string[]
      career: string[]
      wealth: string[]
      study: string[]
    }
    /** 可复盘证据链（强弱/喜用/从格/起运/十神等） */
    evidences: RuleEvidence[]
  }
  /** 已按分区整理，直接注入 AI */
  aiSections: AssertionAiSections
  disclaimer: string
}

/** 娱乐版十神断语 */
const FUN_SHISHEN: Record<ShiShen, string> = {
  比肩: '命里多「自己人」——朋友圈像分身术，合作有戏，抢蛋糕也常见。',
  劫财: '财来财去像坐过山车；出手快、分利也快，钱包要系安全带。',
  食神: '嘴巴和手艺是本命福星，吃得好、玩得开，才气容易变现。',
  伤官: '嘴比刀快、脑比规矩野；适合搞事情，不适合被摁着听话。',
  偏财: '偏门机会嗅觉灵，横财想想可以，梭哈请量力。',
  正财: '正路来钱稳，适合工资党与存钱党；暴富剧本不太贴你。',
  七杀: '压力山海，杀出重围也像开挂；别硬刚无谓的局。',
  正官: '规矩与名分罩身，仕途/职级感强，自由派会觉得绑手绑脚。',
  偏印: '怪才、冷知识、深夜灵感批发商；旁人听不懂你在兴奋啥。',
  正印: funZhengYinLine()
}

/** 娱乐版神煞断语（常见名） */
const FUN_SHENSHA: Record<string, string> = {
  天乙贵人: '贵人光环已点亮——卡点、扯皮、求人时，运气比别人厚一寸。',
  文昌: '笔杆子与考场气场在线，适合考证、写稿、靠脑子吃饭。',
  驿马: '命带跑动键：出差、搬家、跳槽、说走就走的戏份偏多。',
  桃花: '人缘与魅力值偏高，桃花不必强求，防的是烂桃花凑热闹。',
  华盖: '文艺魂、信仰感、独处充电；热闹局可能让你想遁走。',
  孤辰: '有点「独行侠」滤镜，不是没朋友，是更享受自己的节奏。',
  寡宿: '内心戏丰富，适合深耕一亩三分地，少跟风内耗。',
  羊刃: '刀锋人格：决断狠、脾气也利；成事快，伤人也快，收着点用。',
  魁罡: '气场偏强、不服软，适合掌舵；人际上别处处当裁判。',
  空亡: '这支力量像「信号不稳」——事上易落空或延期，宜补救、别死磕。',
  天厨: '口福与食禄感不错，适合靠手艺或厨艺吃饭。',
  金舆: '场面与出行体面感，婚恋/座驾类象可参考。',
  红鸾: '喜庆姻缘象上线，别把每个暧昧都当成终章。',
  阴差阳错: '感情易阴差阳错，沟通确认很重要。',
  天德合: '天德合照，做事易得旁助力。',
  月德合: '月德合照，名分与贵气有加持感。',
  德秀贵人: '文秀气在线，学习表达有加分。',
  太极贵人: '悟性与玄学缘，适合钻研。',
  /** 仅作娱乐口风备用文案；叠三柱时由断言按柱数选用，展示名仍是太极贵人 */
  三太极: '太极贵人叠三柱（三太极），悟性与玄学缘更显，宜深研勿空谈。',
  福星贵人: '衣食福气象，宜惜福。',
  国印: '印信名位象，文书章印相关。',
  禄神: '俸禄稳定感，正财路更贴。',
  天医: '医药疗愈缘，宜关注身心。',
  将星: '统御领导象，适合扛事。',
  亡神: '变动隐晦，防失察。',
  血刃: '冲突血光象（娱乐慎读）。'
}

/**
 * 收集四柱天干十神（不含日主）。
 * @param chart 盘
 */
function stemShiShenList(chart: BaZiChart): ShiShen[] {
  const list: ShiShen[] = []
  const pillars = [chart.pillars.year, chart.pillars.month, chart.pillars.hour]
  for (const p of pillars) {
    if (!p) continue
    if (p.ganShiShen !== '日主') list.push(p.ganShiShen)
  }
  return list
}

/**
 * 娱乐版格局总括。
 * @param chart 盘
 * @param trend 走势
 */
function funPatternLines(chart: BaZiChart, trend: BaZiTrend): AssertionItem[] {
  const dm = chart.dayMaster
  const wx = chart.dayMasterWuXing
  const lines: AssertionItem[] = []

  if (trend.strength === '偏弱') {
    lines.push({
      category: '格局',
      text: `日主${dm}（${wx}）偏软：像电池不够满，好运多半要「借东风」——贵人、靠山、团队比单打独斗香。`,
      basis: `强弱${trend.strength}`
    })
  } else if (trend.strength === '偏强') {
    lines.push({
      category: '格局',
      text: `日主${dm}（${wx}）偏硬：行动力像满电手机，敢冲；但电量太满也会发烫——学会泄、耗、变现，故事更好看。`,
      basis: `强弱${trend.strength}`
    })
  } else {
    lines.push({
      category: '格局',
      text: `日主${dm}（${wx}）大致中和：剧本不极端，成事看选择与执行；流年一偏，戏份就跟着变。`,
      basis: `强弱${trend.strength}`
    })
  }

  lines.push({
    category: '流年彩头',
    text:
      trend.strength === '偏弱'
        ? '人生弧线娱乐版：前半像支线任务攒装备，中后段主线才解锁。'
        : trend.strength === '偏强'
          ? '人生弧线娱乐版：开场就能开打，中段学会「收着打」才更有后劲。'
          : '人生弧线娱乐版：平稳通关型，隐藏彩蛋靠自己挖。',
    basis: 'lifeArc fun'
  })

  return lines
}

/**
 * 把经典断语转成断言条目（娱乐口吻略改写）。
 * @param classic 经典条
 * @param fun 是否娱乐
 */
function classicToItem(
  classic: { book: string; text: string; basis: string },
  fun: boolean
): AssertionItem {
  return {
    category: '经典',
    text: fun ? `【${classic.book}·戏说】${classic.text}` : `【${classic.book}】${classic.text}`,
    basis: `${classic.book}/${classic.basis}`
  }
}

/**
 * 是否命中指定神煞名。
 * @param shensha 神煞列表
 * @param name 神煞名
 */
function hasShenSha(shensha: ShenShaHit[], name: string): boolean {
  return shensha.some((s) => s.name === name)
}

/**
 * 生成姻缘 / 事业 / 财运 / 学业专项断语（原创模板，可机读注入 AI）。
 * 优先级仍服从月令喜用：专项只作人事象意，不作终身判决。
 * @param chart 八字盘
 * @param trend 强弱喜用
 * @param unique 透干十神去重
 * @param shensha 神煞命中
 * @param fun 是否娱乐口吻
 * @param gender 性别：男命配偶星取财，女命取官杀（教学近似）
 */
export function buildSpecialTopicItems(
  chart: BaZiChart,
  trend: BaZiTrend,
  unique: ShiShen[],
  shensha: ShenShaHit[],
  fun: boolean,
  gender: 'male' | 'female' = 'male'
): AssertionItem[] {
  const items: AssertionItem[] = []
  const dayZhi = chart.pillars.day.zhi
  const hasGuan = unique.includes('正官')
  const hasSha = unique.includes('七杀')
  const hasCai = unique.includes('正财') || unique.includes('偏财')
  const hasYin = unique.includes('正印') || unique.includes('偏印')
  const hasShiShang = unique.includes('食神') || unique.includes('伤官')
  const hasShang = unique.includes('伤官')
  const hasTaoHua = hasShenSha(shensha, '桃花')
  const hasHongLuan = hasShenSha(shensha, '红鸾')
  const hasYinCha = hasShenSha(shensha, '阴差阳错')
  const hasWenChang = hasShenSha(shensha, '文昌')
  /** 按性别取配偶星是否透干 */
  const spouseStarOk = gender === 'male' ? hasCai : hasGuan || hasSha
  const spouseLabel =
    gender === 'male'
      ? '财星（正偏财）'
      : hasGuan && hasSha
        ? '官杀'
        : hasGuan
          ? '正官'
          : hasSha
            ? '七杀'
            : '官杀（正官/七杀）'

  // —— 姻缘 ——
  items.push({
    category: '姻缘',
    text: fun
      ? `日支${dayZhi}作「配偶宫」：${gender === 'male' ? '乾造' : '坤造'}配偶星主看${spouseLabel}；先问喜用顾不顾得上感情线，再谈桃花神煞。`
      : gender === 'female'
        ? `日支${dayZhi}为配偶宫；女命配偶星取${spouseLabel}（查法仍是官杀）。宜先看相处名分与沟通，神煞仅辅证；官杀职场义另见事业条，勿混成婚育唯一判决。`
        : `日支${dayZhi}为配偶宫教学近似；男命配偶星取${spouseLabel}。宜先看日支得气与配偶星是否得用，神煞仅辅证，勿单凭桃花定终身。`,
    basis: `日支${dayZhi}/${gender}`
  })
  if (hasTaoHua || hasHongLuan) {
    items.push({
      category: '姻缘',
      text: fun
        ? `${[hasTaoHua && '桃花', hasHongLuan && '红鸾'].filter(Boolean).join('、')}在线：人缘滤镜打开，约会局偏多；防的是热闹有余、确认不足。`
        : `见${[hasTaoHua && '桃花', hasHongLuan && '红鸾'].filter(Boolean).join('、')}：人际魅力与喜庆变动象增强，宜作辅证，权重低于日支、配偶星与喜用。`,
      basis: '桃花/红鸾'
    })
  }
  if (hasYinCha) {
    items.push({
      category: '姻缘',
      text: fun
        ? '阴差阳错上身：消息对不上、节奏错半拍的戏码易出现——重要约定请复述确认。'
        : '阴差阳错：感情沟通易偏差，重要事项宜书面确认；不作必然分手断语。',
      basis: '阴差阳错'
    })
  }
  if (spouseStarOk) {
    items.push({
      category: '姻缘',
      text: fun
        ? `${gender === 'male' ? '财星' : spouseLabel}透出：感情戏里「资源/名分」有角色可演；是否长久仍看喜用与沟通。`
        : `配偶星（${spouseLabel}）透干：姻缘议题可论；身${trend.strength}时，${
            trend.strength === '偏弱' ? '配偶星若为忌宜缓步经营' : '较能任配偶星，仍须看是否与喜用同向'
          }。`,
      basis: `配偶星/${gender}`
    })
  } else {
    items.push({
      category: '姻缘',
      text: fun
        ? '配偶星天干不太透：不是注定单身，可能戏份在藏干或岁运里解锁——急着官宣不如先把沟通练明白。'
        : `天干未见明显配偶星（${spouseLabel}）：姻缘宜更重日支与岁运引动，避免硬凑。`,
      basis: '配偶星未透'
    })
  }
  if (gender === 'female' && hasShang && hasGuan) {
    items.push({
      category: '姻缘',
      text: femaleShangGuanJianGuanLine({ fun }),
      basis: '女命伤官见官'
    })
  }

  const career = judgeCareer(chart, trend, unique, shensha, gender)

  // —— 事业 ——
  items.push({
    category: '事业',
    text: fun
      ? `赛道「${career.path}」：适合 ${career.jobs.join('、')}；慎入 ${career.avoidJobs.join('、') || '忌神过旺的行当'}。不是 offer 保证。`
      : career.text,
    basis: `用神${trend.useful.join('、')} · 月令${chart.pillars.month.ganShiShen}`
  })
  if (hasGuan || hasSha) {
    const femaleCareerExtra = gender === 'female' ? femaleGuanShaCareerLine({ hasGuan, hasSha, weak: trend.strength === '偏弱', fun }) : ''
    items.push({
      category: '事业',
      text: femaleCareerExtra
        ? femaleCareerExtra
        : fun
          ? `${hasSha ? '七杀' : '正官'}透出：职场像副本 Boss——有印化/有制则掉装备，无救则容易被压力按在地上摩擦。`
          : `${hasGuan ? '正官' : ''}${hasGuan && hasSha ? '、' : ''}${hasSha ? '七杀' : ''}透干：名职、考核、管理压力象；有印化或食伤制杀则较成器，否则宜先立规范再冲刺。`,
      basis: '官杀/事业'
    })
  }
  if (hasShiShang) {
    items.push({
      category: '事业',
      text: fun
        ? '食伤透出：靠作品、表达、手艺吃饭更贴人设；适合内容、设计、技艺岗，不适合纯忍气吞声的螺丝钉。'
        : '食伤透干：技艺、表达、创意输出为事业长板；宜落在可交付成果上，忌空谈。',
      basis: '食伤/事业'
    })
  }
  if (hasYin) {
    items.push({
      category: '事业',
      text: yinCareerTopicLine(fun),
      basis: '印/事业'
    })
  }

  // —— 财运 ——
  items.push({
    category: '财运',
    text: fun
      ? hasCai
        ? `财星透出且身${trend.strength}：${
            trend.strength === '偏弱'
              ? '看见钱也可能搬不动——先养身再求财，别杠杆拉满。'
              : '有机会把眼光换成存款；正财稳、偏财活，梭哈仍要量力。'
          }`
        : `财星不太透：财运更吃「食伤生财」与流年引动；闷头存钱党也可，别迷信横财剧本。`
      : hasCai
        ? `财星透干：求财象显。身${trend.strength}时，${
            trend.strength === '偏弱' ? '须防财多身弱、有财难任' : '较能任财，仍看财是否有源、有根'
          }；正财偏稳、偏财偏活。`
        : '财星透干不显：财运宜看食伤是否能生财、岁运是否引出财星，勿断「终生无财」。',
    basis: hasCai ? '财星' : '财运缺透'
  })
  if (unique.includes('劫财') || unique.includes('比肩')) {
    items.push({
      category: '财运',
      text: fun
        ? '比劫现身：分钱、合伙、抢单戏码偏多——合同写清楚，比讲义气管用。'
        : '比劫透干：竞争与分财象；合作宜权责清晰，防争财耗利。',
      basis: '比劫/财运'
    })
  }

  // —— 学业 ——
  items.push({
    category: '学业',
    text: yinStudyTopicLine({
      fun,
      hasYin,
      hasWenChang,
      hasShiShang,
      useful: trend.useful.join('、')
    }),
    basis: hasWenChang ? '印/文昌' : '学业'
  })
  if (hasCai && hasYin && trend.strength !== '偏强') {
    items.push({
      category: '学业',
      text: fun
        ? '财印同台：想赚钱的心和想进修的心互掐——排好优先级，别边上课边想逃课创业然后两头空。'
        : '财印并见：须防财坏印——求财干扰学业/贵人；通关或身强则缓。',
      basis: '财印/学业'
    })
  }

  return items
}

/**
 * 将断言条目按 AI 分区汇总。
 * @param headline 总断
 * @param items 全部条目
 * @param disclaimer 声明
 */
export function partitionAssertionForAi(
  headline: string,
  items: AssertionItem[],
  disclaimer: string
): AssertionAiSections {
  /** 按分类抽取文案 */
  const of = (cat: AssertionCategory | AssertionCategory[]): string[] => {
    const set = new Set(Array.isArray(cat) ? cat : [cat])
    return items.filter((i) => set.has(i.category)).map((i) => i.text)
  }
  return {
    总断: headline,
    喜用格局: of(['格局', '流年彩头']),
    姻缘: of('姻缘'),
    事业: of('事业'),
    财运: of('财运'),
    学业: of('学业'),
    六亲: of('六亲'),
    健康: of('健康'),
    应期: of('应期'),
    十神: of('十神'),
    神煞: of('神煞'),
    经典: of('经典'),
    提示: of('提示'),
    声明: disclaimer
  }
}

/**
 * 基于规则生成断言。
 * @param chart 八字盘
 * @param trend 走势
 * @param shensha 神煞命中
 * @param tone 语气，默认命理总批
 * @param gender 乾坤，用于六亲与配偶星
 */
export function buildAssertion(
  chart: BaZiChart,
  trend: BaZiTrend,
  shensha: ShenShaHit[],
  tone: AssertionTone = 'ming',
  gender: 'male' | 'female' = 'male'
): AssertionResult {
  const fun = tone === 'fun'
  const ming = tone === 'ming'
  const items: AssertionItem[] = []
  const stems = stemShiShenList(chart)
  const unique = [...new Set(stems)]

  const classics = buildClassicAssertLines(chart, trend, stems)
  for (const c of classics) {
    items.push(classicToItem(c, fun))
  }

  if (fun) {
    items.push(...funPatternLines(chart, trend))
  } else if (ming) {
    items.push({
      category: '格局',
      text: trend.patternSummary.replace(/教学近似|勿作人生唯一依据/g, ''),
      basis: formatEvidence(trend.strengthEvidence)
    })
    items.push({
      category: '格局',
      text: `利：用神${trend.useful.join('、')}到位则成格可发。弊：忌神${trend.avoid.join('、')}当令则破格阻滞。${trend.lifeArc}`,
      basis: formatEvidence(trend.usefulEvidence)
    })
    items.push({
      category: '格局',
      text: trend.cong.text,
      basis: formatEvidence(trend.cong.evidence)
    })
    items.push({
      category: '格局',
      text: trend.qiYunEvidence.value,
      basis: formatEvidence(trend.qiYunEvidence)
    })
    const life = mingLifeTexts(chart, trend, unique, gender, shensha)
    /** 女命事业与姻缘并列，事业先写以补强权重；男命仍姻缘在前 */
    if (gender === 'female') {
      items.push({
        category: '事业',
        text: life.career,
        basis: `用神${trend.useful.join('、')} · 月令${chart.pillars.month.ganShiShen}`
      })
      items.push({ category: '姻缘', text: life.marriage, basis: life.outlook.basisStars.join('、') })
    } else {
      items.push({ category: '姻缘', text: life.marriage, basis: life.outlook.basisStars.join('、') })
      items.push({
        category: '事业',
        text: life.career,
        basis: `用神${trend.useful.join('、')} · 月令${chart.pillars.month.ganShiShen}`
      })
    }
    items.push({ category: '财运', text: life.wealth, basis: '财星/食伤' })
    items.push({ category: '学业', text: life.study, basis: '印/食伤' })
    items.push({
      category: '六亲',
      text: mingKinText(chart, trend, unique, gender),
      basis: `元${gender === 'male' ? '男' : '女'}·宫位生克`
    })
    items.push({ category: '健康', text: mingHealthText(chart, trend), basis: '日主五行' })
    items.push({ category: '应期', text: mingYingQiText(chart, trend), basis: '大运' })
  } else {
    items.push({
      category: '格局',
      text: trend.patternSummary,
      basis: formatEvidence(trend.strengthEvidence)
    })
    items.push({
      category: '格局',
      text: `喜用倾向：${trend.useful.join('、')}；慎用：${trend.avoid.join('、')}。${trend.lifeArc}`,
      basis: formatEvidence(trend.usefulEvidence)
    })
    items.push({
      category: '格局',
      text: `${trend.cong.text}｜起运：${trend.qiYunEvidence.value}`,
      basis: [formatEvidence(trend.cong.evidence), formatEvidence(trend.qiYunEvidence)].join(' ‖ ')
    })
    items.push(...buildSpecialTopicItems(chart, trend, unique, shensha, false, gender))
  }

  if (fun) {
    items.push(...buildSpecialTopicItems(chart, trend, unique, shensha, true, gender))
  }

  if (chart.hourUnknown) {
    items.push({
      category: '提示',
      text: fun
        ? '时辰神秘失踪：本局按「三柱半成品」开玩，时柱戏份未解锁；十二时辰对照才是隐藏 DLC。'
        : ming
          ? '时辰未知，时柱子女宫与部分神煞不论；总批以年月日三柱为准，须对照十二时辰补完。'
          : '时辰未知，时柱相关十神与部分神煞未计入；下列断语以年月日三柱为准，结论宜对照十二时辰。',
      basis: 'hourUnknown'
    })
  }

  for (const ss of unique) {
    const count = stems.filter((x) => x === ss).length
    const samplePillar = [chart.pillars.year, chart.pillars.month, chart.pillars.hour].find(
      (p) => p && p.ganShiShen === ss
    )
    const explained = samplePillar
      ? explainShiShen(chart.dayMaster, samplePillar.gan)
      : null
    items.push({
      category: '十神',
      text: fun
        ? `透出${ss}${count > 1 ? `×${count}` : ''}：${FUN_SHISHEN[ss]}`
        : `透出${ss}${count > 1 ? `×${count}` : ''}：${SHISHEN_BRIEF[ss]}`,
      basis: explained
        ? formatEvidence(explained.evidence)
        : `天干十神统计×${count}`
    })
  }

  // 组合类已在经典条覆盖，娱乐版再补一句口语
  if (fun && unique.includes('伤官') && unique.includes('正官')) {
    items.push({
      category: '十神',
      text: '伤官见官：内心戏「我不服」遇上「你得服」——职场连续剧高发，嘴替请慎用。',
      basis: '伤官+正官'
    })
  }
  if (fun && unique.includes('七杀') && (unique.includes('正印') || unique.includes('偏印'))) {
    items.push({
      category: '十神',
      text: '杀印相生：Boss 难打，但打完能掉装备——压力可变权威，别中途弃游。',
      basis: '七杀+印'
    })
  }

  for (const s of shensha) {
    const where = s.pillars.join('、')
    /** 太极贵人叠三柱及以上：娱乐口风改用三太极加重句，展示名仍用太极贵人 */
    const funLine =
      s.name === '太极贵人' && s.pillars.length >= 3
        ? FUN_SHENSHA['三太极']
        : FUN_SHENSHA[s.name]
    const evidence = formatShenShaEvidence(s)
    items.push({
      category: '神煞',
      text: fun
        ? `${s.name}（${s.zhi.join('') || '干合'}·${where}柱）：${funLine ?? s.brief}｜依据：${s.basis}`
        : `${s.name}（${s.zhi.join('') || '干合'}，见${where}柱）。${evidence}`,
      basis: `${s.name}|${s.rule}|${s.basis}`
    })
  }

  /** 有叠见时追加可复盘汇总（相关度提高≠吉凶倍增） */
  const stackSummary = formatShenShaStackSummary(shensha)
  if (stackSummary) {
    items.push({
      category: '神煞',
      text: stackSummary,
      basis: 'shensha-stack-summary'
    })
  }

  if (!shensha.length) {
    items.push({
      category: '神煞',
      text: fun
        ? '本教学神煞表暂无命中——不算「命中无神」，只是这张娱乐卡组没抽到。'
        : ming
          ? '常用神煞未触发，总批以月令、用神、六亲宫为准。'
          : '常用神煞表中未见命中；不代表无其他神煞，仅说明本教学表未触发。',
      basis: 'empty'
    })
  }

  const headline = fun
    ? chart.hourUnknown
      ? `【娱乐三柱】日主${chart.dayMaster}${trend.strength} · 喜${trend.useful.join('')}`
      : `【娱乐戏说】日主${chart.dayMaster}${trend.strength} · 喜${trend.useful.join('')}`
    : ming
      ? mingHeadline(chart, trend, gender)
      : chart.hourUnknown
        ? `三柱经典粗断：日主${chart.dayMaster}${trend.strength}，喜${trend.useful.join('')}`
        : `四柱经典粗断：日主${chart.dayMaster}${trend.strength}，喜${trend.useful.join('')}`

  const disclaimer = fun
    ? '本段含经典义理压缩版 + 专项戏说 + 娱乐口吻，纯属学习玩乐，切勿当真、勿用于重大决策。'
    : ming
      ? mingDisclaimer()
      : '以上融合子平系经典义理摘要、专项象意与规则模板，仅供学习复盘；非命运判决，勿单凭神煞或断语定终身。'

  const aiSections = partitionAssertionForAi(headline, items, disclaimer)
  const wxBalance = summarizeWuxingBalance(chart)

  return {
    tone,
    headline,
    items,
    structured: {
      dayMaster: `${chart.dayMaster}（${chart.dayMasterWuXing}）`,
      strength: `${trend.strength}（${trend.strengthScore}）`,
      useful: trend.useful,
      avoid: trend.avoid,
      shensha: shensha.map((s) => `${s.name}:${s.zhi.join('')}|${s.basis}`),
      hourUnknown: chart.hourUnknown,
      tone,
      classics: classics.map((c) => c.book),
      wuxingBalance: wxBalance.text,
      cong:
        trend.cong.kind === '不从'
          ? '不从'
          : `${trend.cong.kind}${trend.cong.follow ? '·' + trend.cong.follow : ''}`,
      topics: {
        marriage: aiSections.姻缘,
        career: aiSections.事业,
        wealth: aiSections.财运,
        study: aiSections.学业
      },
      evidences: [
        ...trend.evidences,
        ...unique.map((ss) => {
          const p = [chart.pillars.year, chart.pillars.month, chart.pillars.hour].find(
            (x) => x && x.ganShiShen === ss
          )
          return p ? explainShiShen(chart.dayMaster, p.gan).evidence : null
        }).filter((x): x is RuleEvidence => !!x)
      ]
    },
    aiSections,
    disclaimer
  }
}
