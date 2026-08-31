import { describe, expect, it } from 'vitest'
import { analyzeBaZiTrend, buildDaYun, judgeStrength, pickUseful } from './bazi/trend'
import { explainShiShen, shishenOf } from './bazi/shishen'
import {
  buildBaZi,
  buildBaZiFromPillars,
  buildHourVariants,
  dayPillarIndex,
  hourGanFromDay,
  toJulianDay
} from './bazi/chart'
import { collectShenSha, kongWangOfDay, groupShenShaByPillar } from './bazi/shensha'
import { buildAssertion } from './bazi/assert'
import { judgeSpouse } from './bazi/spouse'
import { judgeCareer } from './bazi/career'
import { judgeKinNetwork, wuxingEdge } from './bazi/kin'
import { buildDetailChart, changShengOf, nayinOf } from './bazi/detail'
import {
  buildClassicAssertLines,
  buildClassicsKnowledgePack,
  CLASSIC_BOOKS,
  CLASSIC_INFERENCE_NOTE,
  geJuFromMonthStar,
  groupClassicBooksBySchool,
  tiaoHouOfMonth
} from './bazi/classics'
import { lunarToSolar, solarToLunar } from './bazi/calendar'
import { adjustToSolarTime, pickBirthPlaceByQuery, placesByScope } from './bazi/solarTime'
import { castLiuYao, liuqinOf, bitsToGua } from './liuyao/cast'
import { analyzeLiuYaoTrend } from './liuyao/trend'

describe('十神', () => {
  it('甲日见乙为劫财，见丙为食神', () => {
    expect(shishenOf('甲', '乙')).toBe('劫财')
    expect(shishenOf('甲', '丙')).toBe('食神')
    expect(shishenOf('甲', '戊')).toBe('偏财')
    expect(shishenOf('甲', '庚')).toBe('七杀')
    expect(shishenOf('甲', '壬')).toBe('偏印')
    expect(shishenOf('壬', '丙')).toBe('偏财')
    expect(shishenOf('壬', '丁')).toBe('正财')
    expect(shishenOf('壬', '戊')).toBe('七杀')
  })

  it('explainShiShen 与 shishenOf 一致且带本盘依据', () => {
    const { name, evidence } = explainShiShen('壬', '丁')
    expect(name).toBe('正财')
    expect(shishenOf('壬', '丁')).toBe(name)
    expect(evidence.basis).toMatch(/壬/)
    expect(evidence.basis).toMatch(/丁/)
    expect(evidence.rule.length).toBeGreaterThan(0)
    expect(evidence.gloss.length).toBeGreaterThan(0)
  })
})

describe('八字排盘', () => {
  it('五鼠遁：甲日亥时为乙亥', () => {
    expect(hourGanFromDay('甲', '亥')).toBe('乙')
  })

  it('1999-06-29 在小暑前应为午月庚午（非未月辛未）', () => {
    // 对照盘：小暑约 1999-07-07，6/29 仍属芒种后午月
    const chart = buildBaZi(1999, 6, 29, 7, 20)
    expect(chart.pillars.year.gz).toBe('己卯')
    expect(chart.pillars.month.gz).toBe('庚午')
    expect(chart.pillars.day.gz).toBe('壬子')
    expect(chart.pillars.hour?.gz).toBe('甲辰')
  })

  it('日柱连续：相邻两日差 1', () => {
    const a = dayPillarIndex(toJulianDay(2000, 1, 1, 12, 0))
    const b = dayPillarIndex(toJulianDay(2000, 1, 2, 12, 0))
    expect((b - a + 60) % 60).toBe(1)
  })

  it('能排出四柱', () => {
    const chart = buildBaZi(1990, 5, 20, 14, 30)
    expect(chart.pillars.day.ganShiShen).toBe('日主')
    expect(chart.pillars.year.gz.length).toBe(2)
    expect(chart.dayMasterWuXing).toBeTruthy()
    expect(chart.hourUnknown).toBe(false)
    expect(chart.pillars.hour?.gz.length).toBe(2)
  })

  it('时辰未知时排三柱，并可对照十二时辰', () => {
    const chart = buildBaZi(1990, 5, 20, null)
    expect(chart.hourUnknown).toBe(true)
    expect(chart.pillars.hour).toBeNull()
    const variants = buildHourVariants(chart.dayMaster)
    expect(variants).toHaveLength(12)
    expect(variants[0].pillar.gz.length).toBe(2)
  })
})

describe('农历与真太阳时', () => {
  it('农历一九九九年二月廿七对应公历1999-04-13', () => {
    const s = lunarToSolar(1999, 2, 27)
    expect(s.year).toBe(1999)
    expect(s.month).toBe(4)
    expect(s.day).toBe(13)
    const l = solarToLunar(1999, 4, 13)
    expect(l.month).toBe(2)
    expect(l.day).toBe(27)
  })

  it('乌鲁木齐经度校正明显西偏', () => {
    const adj = adjustToSolarTime(12, 0, 87.62, { useEquationOfTime: false })
    expect(adj.totalMinutes).toBeLessThan(-100)
    expect(adj.hour).toBeLessThan(12)
  })

  it('搜城市可自动带出最佳出生地', () => {
    expect(pickBirthPlaceByQuery('')).toBeNull()
    expect(pickBirthPlaceByQuery('北京')?.name).toBe('北京')
    const hit = pickBirthPlaceByQuery('杭')
    expect(hit).not.toBeNull()
    expect(hit!.name.includes('杭') || hit!.province.includes('杭')).toBe(true)
  })

  it('国外城市可按范围检索', () => {
    expect(placesByScope('intl').some((p) => p.name === '东京')).toBe(true)
    expect(placesByScope('cn').every((p) => p.scope !== 'intl')).toBe(true)
    expect(pickBirthPlaceByQuery('东京', 'intl')?.province).toBe('日本')
    expect(pickBirthPlaceByQuery('纽约')?.longitude).toBeLessThan(0)
  })
})

describe('神煞与断言', () => {
  it('1999-01-10 三柱神煞含常见项', () => {
    const chart = buildBaZi(1999, 1, 10, null)
    expect(chart.pillars.year.gz).toBe('戊寅')
    expect(chart.pillars.month.gz).toBe('乙丑')
    expect(chart.pillars.day.gz).toBe('壬戌')
    const sha = collectShenSha(chart)
    const names = sha.map((s) => s.name)
    expect(names).toEqual(expect.arrayContaining(['文昌', '天厨', '寡宿', '华盖', '阴差阳错']))
    expect(names).toEqual(expect.arrayContaining(['天乙贵人', '金舆', '红鸾']))
  })

  it('1999-01-10 壬水乾造：妻星是火，正财在日支不主年长', () => {
    // 同盘六字：戊寅 乙丑 壬戌。壬克火为财（丙偏财、丁正财），土是官杀不是妻。
    const chart = buildBaZi(1999, 1, 10, null)
    const trend = analyzeBaZiTrend(chart, { gender: 'male', yearSpan: 1 })
    const sha = collectShenSha(chart)
    const unique = [
      chart.pillars.year.ganShiShen,
      chart.pillars.month.ganShiShen
    ].filter((s): s is Exclude<typeof s, '日主'> => s !== '日主')
    const spouse = judgeSpouse(chart, trend, unique, 'male', sha)
    expect(spouse.spouseWx).toBe('火')
    expect(spouse.properStar).toBe('正财')
    expect(spouse.hits.some((h) => h.gan === '丁' && h.star === '正财' && h.pillar === '日')).toBe(true)
    expect(spouse.hits.some((h) => h.gan === '丙' && h.star === '偏财' && h.pillar === '年')).toBe(true)
    expect(spouse.ageHint).toBe('相当')
    expect(spouse.text).toMatch(/克火为财/)
    expect(spouse.text).toMatch(/不主年长/)
    expect(spouse.text).not.toMatch(/不可能/)
    const asrt = buildAssertion(chart, trend, sha, 'ming', 'male')
    const marriage = asrt.items.find((i) => i.category === '姻缘')?.text ?? ''
    expect(marriage).toMatch(/克火为财/)
    expect(marriage).toMatch(/不主年长/)
  })

  it('1999-01-10 壬水乾造：月令伤官，事业落到技艺与用神行业', () => {
    const chart = buildBaZi(1999, 1, 10, null)
    const trend = analyzeBaZiTrend(chart, { gender: 'male', yearSpan: 1 })
    const sha = collectShenSha(chart)
    const unique = [
      chart.pillars.year.ganShiShen,
      chart.pillars.month.ganShiShen
    ].filter((s): s is Exclude<typeof s, '日主'> => s !== '日主')
    const career = judgeCareer(chart, trend, unique, sha)
    expect(chart.pillars.month.ganShiShen).toBe('伤官')
    expect(career.path).toBe('技艺表达')
    expect(career.jobs.length).toBeGreaterThan(0)
    expect(career.text).toMatch(/适合：/)
    expect(career.text).toMatch(/慎入：/)
    expect(career.text).toMatch(/利：/)
    expect(career.text).toMatch(/弊：/)
    const asrt = buildAssertion(chart, trend, sha, 'ming', 'male')
    const careerText = asrt.items.find((i) => i.category === '事业')?.text ?? ''
    expect(careerText).toMatch(/技艺表达/)
    expect(careerText).toMatch(/适合：/)
  })

  it('1999-06-29 壬水坤造：关系网元女、官杀藏干、月火被克', () => {
    // 朋友对照盘：己卯 庚午 壬子 甲辰。女命找官；年己克壬=正官，月午藏丁=正官，壬克午=我克父母宫火。
    const chart = buildBaZi(1999, 6, 29, 7, 0)
    expect(chart.pillars.year.gz).toBe('己卯')
    expect(chart.pillars.month.gz).toBe('庚午')
    expect(chart.pillars.day.gz).toBe('壬子')
    expect(chart.pillars.hour?.gz).toBe('甲辰')
    expect(wuxingEdge('水', '土')).toBe('克我')
    expect(wuxingEdge('水', '金')).toBe('生我')
    expect(wuxingEdge('水', '火')).toBe('我克')
    expect(wuxingEdge('水', '木')).toBe('我生')
    const trend = analyzeBaZiTrend(chart, { gender: 'female', yearSpan: 1 })
    const kin = judgeKinNetwork(chart, trend, 'female')
    expect(kin.selfLabel).toBe('元女')
    expect(kin.dayWx).toBe('水')
    expect(kin.spouseMap).toMatch(/正官主正缘/)
    expect(kin.text).toMatch(/元女/)
    expect(kin.text).toMatch(/正官/)
    expect(kin.text).toMatch(/我克/)
    expect(kin.text).toMatch(/生我/)
    expect(kin.text).not.toMatch(/村妇|没读过书|小妾/)
    const year = kin.nodes.find((n) => n.palace === '年')
    const month = kin.nodes.find((n) => n.palace === '月')
    expect(year?.ganEdge).toBe('克我')
    expect(month?.ganEdge).toBe('生我')
    expect(month?.zhiEdge).toBe('我克')
    const asrt = buildAssertion(chart, trend, collectShenSha(chart), 'ming', 'female')
    const kinText = asrt.items.find((i) => i.category === '六亲')?.text ?? ''
    expect(kinText).toMatch(/关系网/)
    expect(kinText).toMatch(/利：/)
    expect(kinText).toMatch(/弊：/)
  })

  it('1999-06-29 全库神煞含天喜勾煞飞刃等（对照常见项）', () => {
    const chart = buildBaZi(1999, 6, 29, 7, 20)
    expect(chart.pillars.month.gz).toBe('庚午')
    const sha = collectShenSha(chart)
    const names = sha.map((s) => s.name)
    expect(names).toEqual(
      expect.arrayContaining(['天喜', '勾煞', '飞刃', '红艳煞', '禄神', '将星', '天乙贵人'])
    )
    const by = groupShenShaByPillar(sha)
    expect(by.月.length).toBeGreaterThan(1)
    expect(by.日.length).toBeGreaterThan(3)
  })

  it('甲子日空亡为戌亥', () => {
    expect(kongWangOfDay('甲子')).toEqual(['戌', '亥'])
  })

  it('纳音与十二长生可查', () => {
    expect(nayinOf('甲子')).toBe('海中金')
    expect(changShengOf('甲', '亥')).toBe('长生')
    expect(changShengOf('甲', '卯')).toBe('帝旺')
  })

  it('能收集神煞并生成规则断言与细盘', () => {
    const chart = buildBaZi(1999, 4, 13, 3, 0)
    const sha = collectShenSha(chart)
    expect(Array.isArray(sha)).toBe(true)
    // 每条神煞须带查法与本盘依据，禁止只有空象意
    for (const s of sha) {
      expect(s.rule.length).toBeGreaterThan(0)
      expect(s.basis.length).toBeGreaterThan(0)
      expect(s.basis).toMatch(/柱|日|年|月|干|支|表|查/)
    }
    const by = groupShenShaByPillar(sha)
    expect(by.年).toBeDefined()
    const detail = buildDetailChart(chart, {
      name: '案例',
      gender: 'male',
      shenShaByPillar: by
    })
    expect(detail.genderLabel).toBe('乾造')
    expect(detail.pillars).toHaveLength(4)
    expect(detail.pillars[2].mainStar).toBe('元男')
    expect(detail.pillars[0].naYin.length).toBeGreaterThan(0)
    expect(detail.daYun.length).toBe(8)

    const trend = analyzeBaZiTrend(chart, { gender: 'male', yearSpan: 1 })
    const assertion = buildAssertion(chart, trend, sha, 'study')
    expect(assertion.items.length).toBeGreaterThan(0)
    expect(assertion.headline).toContain(chart.dayMaster)
    expect(assertion.tone).toBe('study')
    // 专项分区须齐备，供 AI 按区加载
    expect(assertion.aiSections.姻缘.length).toBeGreaterThan(0)
    expect(assertion.aiSections.事业.length).toBeGreaterThan(0)
    expect(assertion.aiSections.财运.length).toBeGreaterThan(0)
    expect(assertion.aiSections.学业.length).toBeGreaterThan(0)
    expect(assertion.structured.topics.career.length).toBeGreaterThan(0)

    const fun = buildAssertion(chart, trend, sha, 'fun')
    expect(fun.tone).toBe('fun')
    expect(fun.disclaimer).toContain('娱乐')
    expect(fun.headline).toContain('娱乐')
    expect(fun.aiSections.姻缘.length).toBeGreaterThan(0)

    const ming = buildAssertion(chart, trend, sha, 'ming', 'male')
    expect(ming.tone).toBe('ming')
    expect(ming.headline).toContain('总批')
    expect(ming.aiSections.应期.length).toBeGreaterThan(0)
    expect(ming.aiSections.六亲.length).toBeGreaterThan(0)
    expect(ming.aiSections.健康.length).toBeGreaterThan(0)
    expect(ming.disclaimer).toContain('子平成法')
  })

  it('经典义理断言含真诠与穷通', () => {
    const chart = buildBaZi(1999, 1, 10, null)
    const trend = analyzeBaZiTrend(chart, { gender: 'male', yearSpan: 1 })
    const lines = buildClassicAssertLines(chart, trend, ['七杀', '伤官'])
    const books = lines.map((l) => l.book)
    expect(books).toEqual(
      expect.arrayContaining(['子平真诠', '穷通宝鉴', '滴天髓', '千里命稿', '渊海子平'])
    )
    expect(geJuFromMonthStar('伤官')).toContain('伤官')
    expect(tiaoHouOfMonth('丑').need).toBe('暖')
    expect(lines.find((l) => l.book === '穷通宝鉴')?.text).toContain('穷通取用')
  })

  it('书库知识包含扩展书目且可按体系分组', () => {
    expect(CLASSIC_BOOKS.length).toBeGreaterThanOrEqual(18)
    const pack = buildClassicsKnowledgePack()
    expect(pack).toContain('五行精纪')
    expect(pack).toContain('神峰通考')
    expect(pack).toContain('珞琭子消息赋')
    expect(pack).toContain('评价优先级')
    expect(pack).toContain('足够支撑')
    expect(pack).toContain(CLASSIC_INFERENCE_NOTE.slice(0, 12))
    expect(pack.length).toBeGreaterThan(500)
    const groups = groupClassicBooksBySchool()
    expect(groups.some((g) => g.school === 'bazi' && g.books.length > 0)).toBe(true)
  })

  it('离线 RAG 索引可 BM25 检索用神格局段落', async () => {
    const { readFileSync, existsSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    const indexPath = resolve('src/renderer/public/rag/classics-index.json')
    if (!existsSync(indexPath)) {
      expect(true).toBe(true)
      return
    }
    const { searchBm25Index } = await import('./bazi/rag/bm25')
    const { buildRagQuery } = await import('./bazi/rag/queryFromFacts')
    const index = JSON.parse(readFileSync(indexPath, 'utf8'))
    expect(index.docCount).toBeGreaterThan(50)
    const query = buildRagQuery({
      structured: {
        dayMaster: '甲（木）',
        strength: '偏弱',
        useful: ['水', '木'],
        avoid: ['金', '土'],
        cong: '不从',
        classics: ['子平真诠', '穷通宝鉴']
      }
    })
    const hits = searchBm25Index(index, query, 5)
    expect(hits.length).toBeGreaterThan(0)
    expect(hits.some((h) => h.doc.text.length > 20)).toBe(true)
    expect(hits.some((h) => h.doc.title.includes('真诠') || h.doc.title.includes('穷通'))).toBe(true)
  })

  it('AI 分区 prompt 含姻缘事业等专项', async () => {
    const { formatAiSectionsForPrompt } = await import('./bazi/aiPolish')
    const chart = buildBaZi(1990, 5, 20, 14, 0)
    const trend = analyzeBaZiTrend(chart, { gender: 'male', yearSpan: 1 })
    const sha = collectShenSha(chart)
    const assertion = buildAssertion(chart, trend, sha, 'ming', 'male')
    const block = formatAiSectionsForPrompt(assertion.aiSections)
    expect(block).toContain('【总断】')
    expect(block).toContain('【姻缘】')
    expect(block).toContain('【事业】')
    expect(block).toContain('【财运】')
    expect(block).toContain('【学业】')
    expect(block).toContain('【应期】')
    expect(block).toContain('【六亲】')
  })

  it('OpenAI SSE 缓冲可抽出逐字 delta', async () => {
    const { consumeOpenAiSseBuffer } = await import('./bazi/aiPolish')
    const deltas: string[] = []
    let rest = consumeOpenAiSseBuffer(
      'data: {"choices":[{"delta":{"content":"总"}}]}\n\ndata: {"choices":[{"delta":{"content":"断"}}]}\n',
      (d) => deltas.push(d)
    )
    expect(deltas.join('')).toBe('总断')
    // 半包行应留在 rest，下次补全后再解析
    rest = consumeOpenAiSseBuffer(
      rest + 'data: {"choices":[{"delta":{"content":"完"}}]}\n\ndata: [DONE]\n\n',
      (d) => deltas.push(d)
    )
    expect(deltas.join('')).toBe('总断完')
    expect(rest).toBe('')
  })

  it('逐字揭示器会分步吐出整包文本', async () => {
    const { createTypewriterSink } = await import('./bazi/aiPolish')
    const frames: string[] = []
    const sink = createTypewriterSink((s) => frames.push(s), { intervalMs: 1 })
    sink.push('甲乙丙')
    await sink.flush()
    expect(frames.at(-1)).toBe('甲乙丙')
    expect(frames.length).toBeGreaterThan(1)
  })
})

describe('AI 模型列表解析', () => {
  it('OpenAI 兼容 /models 响应可抽出 id', async () => {
    const { fetchAiModels } = await import('./bazi/aiPolish')
    const original = globalThis.fetch
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ data: [{ id: 'deepseek-reasoner' }, { id: 'deepseek-chat' }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })) as typeof fetch
    try {
      const ids = await fetchAiModels({
        baseUrl: 'https://api.deepseek.com/v1',
        apiKey: 'test-key'
      })
      expect(ids[0]).toBe('deepseek-chat')
      expect(ids).toContain('deepseek-reasoner')
    } finally {
      globalThis.fetch = original
    }
  })

  it('AI 默认润色口风为命理总批 ming', async () => {
    const { loadAiSettings } = await import('./bazi/aiPolish')
    const key = 'yi-desktop-ai-polish'
    const prev = globalThis.localStorage?.getItem(key)
    globalThis.localStorage?.removeItem(key)
    try {
      expect(loadAiSettings().polishTone).toBe('ming')
      expect(loadAiSettings().includePlainTalk).toBe(true)
    } finally {
      if (prev != null) globalThis.localStorage?.setItem(key, prev)
      else globalThis.localStorage?.removeItem(key)
    }
  })

  it('白话优先指南要求断命篇幅与流年分区', async () => {
    const { plainTalkOutputGuide, buildPlainTalkTranslateMessages, mingNarrativeGuide } =
      await import('./bazi/aiPolish')
    const guide = plainTalkOutputGuide()
    expect(guide).toContain('白话：')
    expect(guide).toContain('月令')
    expect(guide).toContain('对照表')
    expect(guide).toContain('零基础')
    expect(guide).toContain('流年')
    expect(guide).toContain('断命')
    expect(mingNarrativeGuide()).toContain('默认岁运窗口')
    const msgs = buildPlainTalkTranslateMessages('【总断】身弱喜印')
    expect(msgs.system).toContain('断命')
    expect(msgs.system).toContain('流年')
    expect(msgs.user).toContain('身弱喜印')
  })
})

describe('八字走势', () => {
  it('能给出强弱、大运与流年曲线', () => {
    const chart = buildBaZi(1990, 5, 20, 14, 0)
    const strength = judgeStrength(chart)
    expect(['偏弱', '中和', '偏强']).toContain(strength.level)

    const dun = buildDaYun(chart, 'male', 8)
    expect(dun).toHaveLength(8)
    expect(dun[0]).toHaveLength(2)

    const trend = analyzeBaZiTrend(chart, { gender: 'male', fromYear: 2024, yearSpan: 12 })
    expect(trend.years).toHaveLength(12)
    expect(trend.useful.length).toBeGreaterThan(0)
    expect(trend.years[0].score).toBeGreaterThanOrEqual(8)
    expect(trend.years[0].aspects.career).toBeTruthy()
    expect(trend.strengthBreakdown.wangXiang).toBeTruthy()
    expect(trend.dayun[0].ageFrom).toBeGreaterThan(0)
    expect(trend.years[0].gz).toBe('甲辰')
    expect(trend.strengthEvidence.basis).toMatch(/月令|通根/)
    expect(trend.usefulEvidence.basis.length).toBeGreaterThan(0)
    expect(trend.qiYunEvidence.basis.length).toBeGreaterThan(0)
    expect(trend.cong.evidence.id).toBe('cong')
    expect(trend.evidences.length).toBeGreaterThanOrEqual(4)
    expect(strength.evidence.steps?.length).toBeGreaterThan(0)
  })

  it('藏干权重与月令旺相表可用', async () => {
    const { CANGGAN_WEIGHT, monthWangXiang } = await import('./constants')
    expect(CANGGAN_WEIGHT.寅[0]).toMatchObject({ gan: '甲', role: '本气', weight: 0.6 })
    expect(monthWangXiang('午', '火')).toBe('旺')
    expect(monthWangXiang('午', '金')).toBe('死')
    expect(monthWangXiang('子', '水')).toBe('旺')
  })

  it('1999-06-29 坤造按节气起运，首运辛未约 4 岁而非写死 8 岁', async () => {
    const { computeQiYun } = await import('./bazi/yun')
    const { pickUseful } = await import('./bazi/trend')
    const chart = buildBaZi(1999, 6, 29, 7, 0)
    const yun = computeQiYun(chart, 'female', 8)
    expect(yun.source).toBe('lunar')
    expect(yun.startYears).toBe(2)
    expect(yun.steps[0].gz).toBe('辛未')
    expect(yun.steps[0].ageFrom).toBe(4)
    const detail = buildDetailChart(chart, {
      name: '林',
      gender: 'female',
      shenShaByPillar: { 年: [], 月: [], 日: [], 时: [] }
    })
    expect(detail.qiYun).toContain('节气')
    expect(detail.daYun[0].gz).toBe('辛未')
    expect(detail.daYun[0].ageFrom).toBe(4)
    expect(detail.pillars[1].canggan[0].role).toBe('本气')

    const winter = pickUseful('水', '偏弱', '子')
    expect(winter.useful).toContain('火')
  })

  it('穷通：壬日午月取辛甲', async () => {
    const { qiongTongOfChart } = await import('./bazi/ming')
    const chart = buildBaZi(1999, 6, 29, 7, 0)
    expect(chart.pillars.month.zhi).toBe('午')
    expect(chart.dayMaster).toBe('壬')
    const qt = qiongTongOfChart(chart)
    expect(qt.gans).toEqual(['辛', '甲'])
  })
})

describe('命理总断：吉凶并陈与姻缘倾向', () => {
  it('parsePolishLayers 把白话和术语拆开，互不混入', async () => {
    const { parsePolishLayers } = await import('./bazi/aiPolish')
    const layers = parsePolishLayers(
      '【姻缘】\n白话：婚宜晚成，情缘偏多段。\n术语：身弱财透，桃花叠见。\n【事业】\n白话：先依人成事。\n术语：印为用神。'
    )
    expect(layers.hasSplit).toBe(true)
    expect(layers.plainText).toContain('婚宜晚成')
    expect(layers.plainText).not.toContain('身弱财透')
    expect(layers.jargonText).toContain('身弱财透')
    expect(layers.jargonText).not.toContain('婚宜晚成')
  })

  it('glossPlainTalk 把身弱改成人话并加命理注释', async () => {
    const { glossPlainTalk } = await import('./bazi/jargonPlain')
    const once = glossPlainTalk('此造身弱，再遇身弱则更累。')
    expect(once).toContain('气势偏虚')
    expect(once).toContain('命理叫身弱')
    expect(once.match(/命理叫身弱/g)?.length).toBe(1)
    expect(once).not.toMatch(/此造身弱/)
  })

  it('姻缘只给少/中/多波折，不写恋爱次数，且各专项吉凶并陈', async () => {
    const { judgeMarriageOutlook, mingLifeTexts } = await import('./bazi/ming')
    const chart = buildBaZi(1999, 6, 29, 7, 0)
    const trend = analyzeBaZiTrend(chart, { gender: 'female', fromYear: 2024, yearSpan: 12 })
    const shensha = collectShenSha(chart)
    /** 透干十神，不含日主本身 */
    const unique = [
      chart.pillars.year.ganShiShen,
      chart.pillars.month.ganShiShen,
      ...(chart.pillars.hour ? [chart.pillars.hour.ganShiShen] : [])
    ].filter((s) => s !== '日主')
    const outlook = judgeMarriageOutlook(chart, trend, unique, 'female', shensha)
    expect(['少', '中', '多波折']).toContain(outlook.wave)
    expect(['可成', '晚成', '口舌', '分合']).toContain(outlook.grain)
    expect(outlook.text).toMatch(/利：/)
    expect(outlook.text).toMatch(/弊：/)
    expect(outlook.text).not.toMatch(/谈过\s*\d+\s*次/)
    expect(outlook.basisStars.join('、')).toMatch(/配偶宫/)

    const life = mingLifeTexts(chart, trend, unique, 'female', shensha)
    expect(life.career).toMatch(/利：/)
    expect(life.career).toMatch(/弊：/)
    expect(life.wealth).toMatch(/利：/)
    expect(life.wealth).toMatch(/弊：/)
    expect(life.study).toMatch(/利：/)
    expect(life.study).toMatch(/弊：/)
    expect(life.marriage).not.toMatch(/谈过\s*\d+\s*次/)

    const assertion = buildAssertion(chart, trend, shensha, 'ming', 'female')
    const marriage = assertion.items.find((i) => i.category === '姻缘')
    expect(marriage?.text).toContain(outlook.wave)
    expect(marriage?.text).not.toMatch(/谈过\s*\d+\s*次/)
    expect(assertion.items.some((i) => i.category === '格局' && /利：/.test(i.text) && /弊：/.test(i.text))).toBe(
      true
    )
    expect(assertion.items.find((i) => i.category === '六亲')?.text).toMatch(/利：/)
    expect(assertion.items.find((i) => i.category === '应期')?.text).toMatch(/利：/)
  })

  it('印为用学业不断学历高，大专只算有学历', async () => {
    const { mingYinStudyText, modernYinStudyPromptGuide, yinCareerGoodLine } = await import(
      './bazi/studyTone'
    )
    const { plainTalkOutputGuide, buildPlainTalkTranslateMessages } = await import('./bazi/aiPolish')

    /** 身弱印为用：可论进修考证，不可写成证书是命门 */
    const yinUseful = mingYinStudyText({
      hasYin: true,
      weak: true,
      hasCai: false,
      hasShiShang: false,
      avoid: '火'
    })
    expect(yinUseful).toMatch(/利：/)
    expect(yinUseful).toMatch(/弊：/)
    expect(yinUseful).not.toMatch(/大专/)
    expect(yinUseful).toMatch(/不等于学历高|不等于会读书/)
    expect(yinUseful).not.toContain('学业证书是命门')
    expect(yinUseful).not.toContain('学历光环')

    const guide = modernYinStudyPromptGuide()
    expect(guide).toMatch(/心里清楚|内部/)
    expect(guide).toContain('禁止写成')
    expect(guide).toMatch(/不要提|禁止每段复读/)
    expect(plainTalkOutputGuide()).toMatch(/心里清楚|内部/)
    expect(buildPlainTalkTranslateMessages('【学业】印为用').system).toContain('印为用')

    const careerGood = yinCareerGoodLine()
    expect(careerGood).toContain('不等于学历高')
    expect(careerGood).not.toContain('依平台、学历、贵人')

    const chart = buildBaZi(1999, 6, 29, 7, 0)
    const trend = analyzeBaZiTrend(chart, { gender: 'female', fromYear: 2024, yearSpan: 12 })
    const shensha = collectShenSha(chart)
    const unique = [
      chart.pillars.year.ganShiShen,
      chart.pillars.month.ganShiShen,
      ...(chart.pillars.hour ? [chart.pillars.hour.ganShiShen] : [])
    ].filter((s) => s !== '日主')
    const { mingLifeTexts } = await import('./bazi/ming')
    const life = mingLifeTexts(chart, trend, unique, 'female', shensha)
    expect(life.study).not.toContain('学业证书是命门')
    expect(life.study).not.toContain('学历光环')
    expect(life.career).not.toContain('依平台、学历、贵人')

    const mingAssert = buildAssertion(chart, trend, shensha, 'ming', 'female')
    const studyTexts = mingAssert.items
      .filter((i) => i.category === '学业')
      .map((i) => i.text)
      .join('\n')
    expect(studyTexts).not.toContain('学业证书是命门')
    expect(studyTexts).not.toMatch(/读书考试滤镜/)
  })

  it('女命现代口径：官杀职场分层、禁过时话、伤官见官可化解、事业不弱于姻缘', async () => {
    const {
      femaleMingBannedPhrases,
      femaleShangGuanJianGuanLine,
      modernFemaleMingPromptGuide
    } = await import('./bazi/femaleTone')
    const { plainTalkOutputGuide } = await import('./bazi/aiPolish')
    const { judgeSpouse } = await import('./bazi/spouse')
    const { spouseStarMapText } = await import('./bazi/kin')

    const chart = buildBaZi(1999, 6, 29, 7, 0)
    const trend = analyzeBaZiTrend(chart, { gender: 'female', fromYear: 2024, yearSpan: 12 })
    const shensha = collectShenSha(chart)
    const unique = [
      chart.pillars.year.ganShiShen,
      chart.pillars.month.ganShiShen,
      ...(chart.pillars.hour ? [chart.pillars.hour.ganShiShen] : [])
    ].filter((s) => s !== '日主')

    const { mingLifeTexts, mingHeadline } = await import('./bazi/ming')
    const life = mingLifeTexts(chart, trend, unique, 'female', shensha)
    const banned = femaleMingBannedPhrases()
    for (const phrase of banned) {
      expect(life.marriage).not.toContain(phrase)
      expect(life.career).not.toContain(phrase)
    }
    /** 官杀双义：事业侧须点职场/晋升，且禁止混成嫁娶判决 */
    expect(life.career).toMatch(/职场|晋升|考核|职级/)
    expect(life.career).toMatch(/分层|勿当作婚配|禁止写成|禁止过时/)
    expect(life.marriage).toMatch(/职场|分层|相处/)
    expect(life.marriage).not.toMatch(/谈过\s*\d+\s*次/)

    const headline = mingHeadline(chart, trend, 'female')
    expect(headline).toMatch(/事业与姻缘并重/)

    const spouse = judgeSpouse(chart, trend, unique, 'female', shensha)
    expect(spouse.text).toMatch(/职场|分层/)
    for (const phrase of banned) {
      expect(spouse.text).not.toContain(phrase)
    }

    expect(spouseStarMapText('female')).toMatch(/不作从属判决/)
    expect(femaleShangGuanJianGuanLine({ fun: false })).toMatch(/可化解|沟通/)
    expect(femaleShangGuanJianGuanLine({ fun: false })).not.toMatch(/注定|必婚灾/)

    const guide = modernFemaleMingPromptGuide()
    expect(guide).toContain('事业与姻缘并列')
    expect(guide).toContain('从夫')
    expect(plainTalkOutputGuide()).toContain('女命/坤造现代口径')

    const assertion = buildAssertion(chart, trend, shensha, 'ming', 'female')
    const cats = assertion.items.map((i) => i.category)
    const careerIdx = cats.indexOf('事业')
    const marriageIdx = cats.indexOf('姻缘')
    expect(careerIdx).toBeGreaterThanOrEqual(0)
    expect(marriageIdx).toBeGreaterThanOrEqual(0)
    /** 女命总批里事业条目排在姻缘之前，且含职场双义补强 */
    expect(careerIdx).toBeLessThan(marriageIdx)
    const careerText = assertion.items.filter((i) => i.category === '事业').map((i) => i.text).join('\n')
    const marriageText = assertion.items.filter((i) => i.category === '姻缘').map((i) => i.text).join('\n')
    expect(careerText).toMatch(/职场|晋升|考核|职级/)
    expect(careerText.length).toBeGreaterThan(80)
    for (const phrase of banned) {
      expect(careerText).not.toContain(phrase)
      expect(marriageText).not.toContain(phrase)
    }

    /** 男命不回退：仍姻缘在前，且无女命强制后缀 */
    const maleChart = buildBaZi(1990, 5, 1, 12, 0)
    const maleTrend = analyzeBaZiTrend(maleChart, { gender: 'male', fromYear: 2024, yearSpan: 12 })
    const maleSha = collectShenSha(maleChart)
    const maleAssert = buildAssertion(maleChart, maleTrend, maleSha, 'ming', 'male')
    const maleCats = maleAssert.items.map((i) => i.category)
    expect(maleCats.indexOf('姻缘')).toBeLessThan(maleCats.indexOf('事业'))
    expect(mingHeadline(maleChart, maleTrend, 'male')).not.toMatch(/事业与姻缘并重/)
  })
})

describe('六爻', () => {
  it('比特识别乾坤', () => {
    expect(bitsToGua(0b111)).toBe('乾')
    expect(bitsToGua(0b000)).toBe('坤')
  })

  it('六亲：木宫见木为兄弟，见火为子孙', () => {
    expect(liuqinOf('木', '木')).toBe('兄弟')
    expect(liuqinOf('木', '火')).toBe('子孙')
    expect(liuqinOf('木', '土')).toBe('妻财')
    expect(liuqinOf('木', '金')).toBe('官鬼')
    expect(liuqinOf('木', '水')).toBe('父母')
  })

  it('指定爻值起卦，天水讼触发影子提示', () => {
    const r = castLiuYao({ values: [8, 7, 8, 7, 7, 7], dayGan: '甲' })
    expect(r.lower).toBe('坎')
    expect(r.upper).toBe('乾')
    expect(r.shadowFight).toBe(true)
  })

  it('六爻走势能输出近段评分', () => {
    const r = castLiuYao({ values: [8, 7, 8, 7, 7, 7], dayGan: '甲' })
    const t = analyzeLiuYaoTrend(r, 'career')
    expect(t.score).toBeGreaterThanOrEqual(10)
    expect(t.headline).toContain('事业')
    expect(t.shadowLike).toBe(true)
  })
})

describe('助手轻量 Markdown', () => {
  it('把 **加粗** 转成 strong，并去掉裸星号', async () => {
    const { stripMdBold, renderLiteMarkdown, matchModuleTitleLine } = await import('./bazi/mdLite')
    expect(stripMdBold('见 **正官辛金** 当令')).toBe('见 正官辛金 当令')
    expect(renderLiteMarkdown('见 **正官辛金** 当令')).toBe(
      '见 <strong class="md-em">正官辛金</strong> 当令'
    )
    expect(renderLiteMarkdown('<script>')).toBe('&lt;script&gt;')
    expect(renderLiteMarkdown('## 事业\n正文')).toContain('class="md-h2"')
    expect(renderLiteMarkdown('## 事业\n正文')).toContain('事业')
    expect(renderLiteMarkdown('## 事业\n\n\n\n正文')).not.toMatch(/md-h2><\/div><br><br><br/)
    expect(matchModuleTitleLine('【财运】')).toBe('财运')
    expect(matchModuleTitleLine('**事业**')).toBe('事业')
    expect(renderLiteMarkdown('【婚恋】\n相处尚可')).toContain('class="md-h2"')
  })
})

describe('DeepSeek 余额人话错误', () => {
  it('401 / 无网给出可读说明', async () => {
    const { humanizeDeepSeekBalanceError } = await import('./bazi/aiPolish')
    expect(humanizeDeepSeekBalanceError(401)).toContain('密钥')
    expect(humanizeDeepSeekBalanceError(0)).toContain('连不上')
    expect(humanizeDeepSeekBalanceError(402)).toContain('余额不足')
  })
})

describe('大运流年日历', () => {
  it('能排出一步大运下的流年与十二节令流月', async () => {
    const { computeQiYun } = await import('./bazi/yun')
    const {
      listLiuNianOfYun,
      listLiuYueOfYear,
      formatYunPickFacts,
      YUN_BOOK_SUMMARIES
    } = await import('./bazi/liunian')
    const chart = buildBaZi(1999, 6, 29, 7, 0)
    const yun = computeQiYun(chart, 'female', 8)
    const years = listLiuNianOfYun(yun.steps[0], 1999, chart.dayMaster, ['火'], ['金'])
    expect(years.length).toBeGreaterThanOrEqual(8)
    expect(years[0].gz.length).toBe(2)
    expect(years[0].hint).not.toMatch(/科举|钦点|学历光环/)
    const months = listLiuYueOfYear(years[0].year, chart.dayMaster, ['火'], ['金'])
    expect(months).toHaveLength(12)
    expect(months[0].jie).toBe('立春')
    expect(months[0].zhi).toBe('寅')
    expect(months[0].startHm).toMatch(/^\d{2}:\d{2}$/)
    expect(months[0].endSolar).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(months[0].layerHint).toContain('三层')
    const monthsLayer = listLiuYueOfYear(years[0].year, chart.dayMaster, ['火'], ['金'], {
      daYunGz: yun.steps[0].gz,
      yearGz: years[0].gz,
      natalDayZhi: chart.pillars.day.zhi,
      asOf: new Date(`${months[0].startSolar}T12:00:00`)
    })
    expect(monthsLayer[0].jiaoYun).toBe(true)
    expect(monthsLayer[0].current).toBe(true)
    const facts = formatYunPickFacts({ daYun: yun.steps[0], year: years[0], month: months[0] })
    expect(facts).toContain('点选流年')
    expect(facts).toContain('点选流月')
    expect(YUN_BOOK_SUMMARIES.map((b) => b.title).join()).toContain('八字大运详解')
  })

  it('润色默认岁运窗口含近几年流年而不必点选', async () => {
    const { computeQiYun } = await import('./bazi/yun')
    const { formatDefaultYunForAi } = await import('./bazi/liunian')
    const chart = buildBaZi(1999, 6, 29, 7, 0)
    const yun = computeQiYun(chart, 'female', 8)
    const pack = formatDefaultYunForAi({
      steps: yun.steps,
      birthYear: 1999,
      dayMaster: chart.dayMaster,
      useful: ['火'],
      avoid: ['金'],
      natalDayZhi: chart.pillars.day.zhi,
      nowYear: 2026
    })
    expect(pack).toContain('默认岁运窗口')
    expect(pack).toContain('近几流年')
    expect(pack).toContain('2026（今年）')
    expect(pack).toContain('2025')
    expect(pack).toContain('2027')
    expect(pack).toContain('润色必须写【流年】')
  })

  it('追问事实包能带上点选岁运', async () => {
    const { buildMingConsultFacts } = await import('./bazi/aiPolish')
    const text = buildMingConsultFacts({
      name: '案例',
      genderLabel: '坤造',
      pillars: '己卯 庚午 乙未 戊寅',
      dayMaster: '乙',
      strength: '偏弱',
      useful: '木',
      avoid: '金',
      qiYun: '约4岁起运',
      daYun: '4岁辛未',
      headline: '总批',
      shensha: '天乙',
      selectedYun: '点选流年 2010 庚寅'
    })
    expect(text).toContain('点选流年 2010')
  })
})

describe('从格与合化细法', () => {
  it('普通通根盘不从，喜用仍走扶抑', () => {
    const chart = buildBaZi(1999, 6, 29, 7, 20)
    const trend = analyzeBaZiTrend(chart, { gender: 'female', yearSpan: 1 })
    expect(trend.cong.kind).toBe('不从')
    expect(trend.cong.overrideUseful).toBe(false)
  })

  it('极弱无根印比之造可入从弱', () => {
    const chart = buildBaZiFromPillars(['庚申', '辛酉', '甲戌', '辛酉'])
    const trend = analyzeBaZiTrend(chart, { gender: 'male', yearSpan: 1 })
    expect(['真从弱', '假从弱']).toContain(trend.cong.kind)
    expect(trend.cong.follow).toMatch(/^从/)
    if (trend.cong.overrideUseful) {
      expect(trend.useful.length).toBeGreaterThan(0)
      expect(trend.useful).not.toContain('木')
    }
  })

  it('天干五合可扫描到甲己', async () => {
    const { collectHeHua } = await import('./bazi/hehua')
    const chart = buildBaZi(1999, 6, 29, 7, 20)
    const lines = collectHeHua(chart)
    expect(lines.some((l) => l.pair === '甲己' && l.kind === '天干五合')).toBe(true)
  })
})

describe('合盘与日运', () => {
  it('合盘产出四维评分与综合分', async () => {
    const { analyzeHeHun } = await import('./bazi/hehun')
    const a = buildBaZi(1990, 5, 20, 8, 0)
    const b = buildBaZi(1992, 8, 15, 14, 0)
    const r = analyzeHeHun(a, b, 'male', 'female', 'marriage')
    expect(r.dimensions).toHaveLength(4)
    expect(r.score).toBeGreaterThan(0)
    expect(r.score).toBeLessThanOrEqual(100)
    expect(['佳', '可', '慎']).toContain(r.band)
    expect(r.lines[0]).toContain('合婚')
  })

  it('每日运势含流日与分项', async () => {
    const { buildDailyFortune } = await import('./bazi/dailyFortune')
    const chart = buildBaZi(1990, 5, 20, 8, 0)
    const f = buildDailyFortune(chart, 'male', new Date(2026, 7, 28))
    expect(f.dayGz.length).toBe(2)
    expect(f.yearGz.length).toBe(2)
    expect(f.aspects.length).toBe(5)
    expect(f.doList.length).toBeGreaterThan(0)
    expect(['高', '平', '低']).toContain(f.band)
  })
})

describe('读盘方法论', () => {
  it('buildMethodologyGuidePack 含六块与五关', async () => {
    const { buildMethodologyGuidePack, METHODOLOGY_SECTIONS, CHART_QUALITY_GATES } = await import(
      './bazi/methodologyGuide'
    )
    expect(METHODOLOGY_SECTIONS.length).toBe(6)
    expect(CHART_QUALITY_GATES.length).toBe(5)
    const pack = buildMethodologyGuidePack()
    expect(pack).toContain('四柱与日主')
    expect(pack).toContain('五行平衡')
    expect(pack).toContain('排盘五关')
  })

  it('summarizeWuxingBalance 产出五行百分比', async () => {
    const { summarizeWuxingBalance } = await import('./bazi/methodologyGuide')
    const chart = buildBaZi(1990, 5, 20, 8, 0)
    const wx = summarizeWuxingBalance(chart)
    const sum = wx.scores.木 + wx.scores.火 + wx.scores.土 + wx.scores.金 + wx.scores.水
    expect(sum).toBeGreaterThanOrEqual(95)
    expect(sum).toBeLessThanOrEqual(105)
    expect(wx.text).toContain('五行力量')
    expect(wx.strongest).toBeTruthy()
    expect(wx.weakest).toBeTruthy()
  })

  it('buildAssertion 含 wuxingBalance 字段', () => {
    const chart = buildBaZi(1999, 6, 29, 7, 20)
    const trend = analyzeBaZiTrend(chart, { gender: 'female', yearSpan: 1 })
    const shensha = collectShenSha(chart)
    const assertion = buildAssertion(chart, trend, shensha, 'ming', 'female')
    expect(assertion.structured.wuxingBalance).toContain('五行力量')
  })
})

describe('AI 推断与记忆', () => {
  it('推断 system 提示强调延伸推断且禁止与用神矛盾', async () => {
    const { buildInferSystemPrompt } = await import('./bazi/aiPolish')
    const prompt = buildInferSystemPrompt(true)
    expect(prompt).toContain('延伸推断')
    expect(prompt).toContain('格局取舍')
    expect(prompt).toContain('岁运应期')
    expect(prompt).toContain('不得与用神')
    expect(prompt).toContain('禁止编造')
    // 须与润色共用白话/术语拆层格式，否则界面无法切「白话总批」
    expect(prompt).toContain('白话与术语必须拆开')
    expect(prompt).toContain('白话：')
    expect(prompt).toContain('术语：')
  })

  it('推断关闭白话时只要求术语行', async () => {
    const { buildInferSystemPrompt } = await import('./bazi/aiPolish')
    const prompt = buildInferSystemPrompt(false)
    expect(prompt).toContain('只写「术语：」')
    expect(prompt).toContain('不要写「白话：」行')
    expect(prompt).not.toContain('白话与术语必须拆开')
  })

  it('pickPolishShowMode 优先白话再术语', async () => {
    const { parsePolishLayers, pickPolishShowMode } = await import('./bazi/aiPolish')
    const withPlain = parsePolishLayers(
      '【总断】\n白话：近年宜稳。\n术语：用神为印。'
    )
    expect(pickPolishShowMode(withPlain)).toBe('plain')
    const jargonOnly = parsePolishLayers('【总断】\n术语：身弱用印。')
    expect(jargonOnly.hasSplit).toBe(true)
    expect(pickPolishShowMode(jargonOnly)).toBe('jargon')
    const raw = parsePolishLayers('一段没有标签的原文')
    expect(raw.hasSplit).toBe(false)
    expect(pickPolishShowMode(raw)).toBe('classic')
  })

  it('buildInferMessages 注入分区断语与方法论', async () => {
    const { buildInferMessages } = await import('./bazi/aiPolish')
    const chart = buildBaZi(1990, 5, 20, 14, 0)
    const trend = analyzeBaZiTrend(chart, { gender: 'male', yearSpan: 1 })
    const sha = collectShenSha(chart)
    const assertion = buildAssertion(chart, trend, sha, 'ming', 'male')
    const built = await buildInferMessages(assertion.structured, assertion.aiSections, {
      enabled: true,
      baseUrl: 'http://127.0.0.1:11434/v1',
      apiKey: '',
      model: 'qwen2.5:7b',
      polishTone: 'ming',
      includePlainTalk: true
    })
    const body = JSON.parse(built.body) as { messages: Array<{ role: string; content: string }> }
    expect(body.messages[0].content).toContain('延伸推断')
    expect(body.messages[1].content).toContain('【分区规则断语')
    expect(body.messages[1].content).toContain('读盘方法论')
  })

  it('chartKey 与 aiMemory 可持久化追问', async () => {
    const { createPinia, setActivePinia } = await import('pinia')
    setActivePinia(createPinia())
    const { buildChartKey, useAiMemoryStore } = await import('../stores/aiMemory')
    const chart = buildBaZi(1990, 5, 20, 8, 0)
    const key = buildChartKey(chart)
    expect(key).toMatch(/^\S+ \S+ \S+ \S+$/)
    const store = useAiMemoryStore()
    store.clearAll()
    store.persist({
      chartKey: key,
      profileId: 'p_test',
      agentId: 'marriage',
      messages: [{ role: 'user', text: '姻缘如何？' }],
      lastSummary: '【总断】白话：示例',
      lastMode: 'infer'
    })
    const mem = store.get(key)
    expect(mem?.agentId).toBe('marriage')
    expect(mem?.messages[0].text).toContain('姻缘')
    expect(mem?.lastMode).toBe('infer')
    store.clear(key)
    expect(store.get(key)).toBeUndefined()
  })
})

describe('小鲸娘台词', () => {
  it('抽一句且尽量不与上一句重复', async () => {
    const { pickPetTip, PET_IDLE_TIPS } = await import('../components/petTips')
    const a = pickPetTip(PET_IDLE_TIPS)
    expect(PET_IDLE_TIPS).toContain(a)
    const b = pickPetTip(PET_IDLE_TIPS, a)
    expect(b).not.toBe(a)
    expect(PET_IDLE_TIPS.join()).not.toContain('流式')
  })
})

describe('阳宅风水', () => {
  it('朝向推坐向与八宅命卦', async () => {
    const { resolveSittingFacing } = await import('./fengshui/compass')
    const { analyzeFengShui } = await import('./fengshui/analyze')
    const sf = resolveSittingFacing(180)
    expect(sf.facing).toBe('午')
    expect(sf.sitting).toBe('子')
    const r = analyzeFengShui({
      year: 1990,
      month: 5,
      day: 1,
      gender: 'male',
      headingDeg: 180
    })
    expect(r.baZhai.mingGuaName).toBeTruthy()
    expect(r.cards.length).toBe(8)
    expect(r.monthFeixing.cells.length).toBe(9)
    expect(r.cards[0].monthStar).toBeGreaterThan(0)
    expect(r.ragQuery).toContain('阳宅')
  })
})

describe('太极贵人 / 三太极', () => {
  it('叠见三柱时展示名仍为太极贵人，推断写入三太极加重', () => {
    // 甲日太极在子午；年午、月子、日午 → 三柱皆太极
    const chart = buildBaZiFromPillars(['甲午', '丙子', '甲午', '己巳'])
    const sha = collectShenSha(chart)
    const hit = sha.find((s) => s.name === '太极贵人')
    expect(hit?.name).toBe('太极贵人')
    expect(hit?.pillars.length).toBeGreaterThanOrEqual(3)
    expect(hit?.brief).toContain('三太极')
    expect(hit?.basis).toContain('三太极')
    // enrich 防重：已有三太极文案时不应再叠一句「叠见三柱…」堆砌
    const tripleCount = (hit?.brief.match(/三太极/g) ?? []).length
    expect(tripleCount).toBe(1)
  })
})

describe('命师长设定与神煞叠见', () => {
  it('buildMingAgentRolePrompt(general) 含事业细项与健康学业', async () => {
    const { buildMingAgentRolePrompt, MING_DISCLAIMER_FOOTER, generalModulesPolishGuide } =
      await import('./bazi/mingAgents')
    const general = buildMingAgentRolePrompt('general')
    expect(general).toContain('事业')
    expect(general).toContain('职业倾向')
    expect(general).toContain('创业/打工适配')
    expect(general).toContain('工作层次')
    expect(general).toContain('健康')
    expect(general).toContain('学业')
    expect(general).toContain('婚恋')
    expect(general).toContain('子女')
    expect(general).toContain('六亲')
    expect(general).toContain('财运')
    expect(general).toContain('总断')
    expect(general).toContain('断一下')
    expect(general).toContain(MING_DISCLAIMER_FOOTER)
    expect(general).not.toMatch(/大专/)
    expect(generalModulesPolishGuide()).toContain('总断')
    const marriage = buildMingAgentRolePrompt('marriage')
    expect(marriage).toContain('婚恋')
    expect(marriage).toContain('姻缘席')
    expect(marriage).toContain(MING_DISCLAIMER_FOOTER)
    expect(marriage).toMatch(/禁止主动展开|用户未点名/)
    expect(marriage).not.toContain('【六亲】')
    expect(marriage).toMatch(/专席一般不写「总断」/)
  })

  it('enrichShenShaWithStacks / formatShenShaStackSummary / stackLevelOf', async () => {
    const {
      enrichShenShaWithStacks,
      formatShenShaStackSummary,
      stackLevelOf,
      shenShaStackPlainOf
    } = await import('./bazi/shenshaStack')
    expect(stackLevelOf(1)).toBe('单见')
    expect(stackLevelOf(2)).toBe('两柱')
    expect(stackLevelOf(3)).toBe('三柱及以上')

    /** 构造两柱天乙叠见 */
    const raw = [
      {
        name: '天乙贵人',
        zhi: ['丑', '未'] as import('../constants').DiZhi[],
        pillars: ['年', '日'] as Array<'年' | '月' | '日' | '时'>,
        brief: '贵人照应。',
        tone: '吉' as const,
        rule: '按日干/年干查贵人支',
        basis: '日干甲→丑未；见年日'
      }
    ]
    const enriched = enrichShenShaWithStacks([...raw])
    expect(enriched[0].brief).toContain('两柱天乙')
    expect(enriched[0].basis).toContain('叠见')
    expect(shenShaStackPlainOf(raw[0])).toContain('两柱天乙')
    const summary = formatShenShaStackSummary(enriched)
    expect(summary).toContain('神煞叠见')
    expect(summary).toContain('天乙贵人')
    expect(summary).toContain('相关度提高')
    expect(summary).toContain('不是吉凶翻倍')
  })
})

describe('黄历日盘', () => {
  it('排出宜忌与干支', async () => {
    const { buildHuangliDay, formatHuangliFacts } = await import('./huangli/day')
    const d = buildHuangliDay(2026, 8, 28)
    expect(d.yi.length).toBeGreaterThan(0)
    expect(d.dayGz).toMatch(/^[\u4e00-\u9fff]{2}$/)
    expect(formatHuangliFacts(d)).toContain('宜')
  })

  it('白话解读含宜忌人话与总览', async () => {
    const { buildHuangliDay } = await import('./huangli/day')
    const { buildHuangliPlainRead, plainYiJi } = await import('./huangli/plain')
    const d = buildHuangliDay(2026, 8, 29)
    const p = buildHuangliPlainRead(d)
    expect(p.headline).toContain('2026-08-29')
    expect(p.vibe.length).toBeGreaterThan(4)
    expect(p.yi.length).toBe(d.yi.length)
    expect(p.ji.length).toBe(d.ji.length)
    expect(p.chongSha).toContain('冲')
    expect(p.pengZu).toContain('彭祖')
    expect(plainYiJi('嫁娶')).toContain('结婚')
    expect(plainYiJi('未知奇词')).toContain('未知奇词')
  })

  it('择吉可按事项筛日', async () => {
    const { scanZeJiDays, ZEJI_MATTERS } = await import('./huangli/zeji')
    expect(ZEJI_MATTERS.length).toBeGreaterThan(3)
    const hits = scanZeJiDays('开业', new Date(2026, 7, 1), 30)
    expect(Array.isArray(hits)).toBe(true)
  })
})

describe('日柱换日口径', () => {
  it('子初与晚子不换在 23 点可产生不同日柱', async () => {
    const { buildBaZi } = await import('./bazi/chart')
    const a = buildBaZi(1999, 6, 29, 23, 30, { dayCutover: 'ziChu' })
    const b = buildBaZi(1999, 6, 29, 23, 30, { dayCutover: 'ziZheng' })
    expect(a.notes.some((n) => n.includes('子初'))).toBe(true)
    expect(b.notes.some((n) => n.includes('晚子不换'))).toBe(true)
    const diverged =
      a.pillars.day.gz !== b.pillars.day.gz ||
      (a.pillars.hour && b.pillars.hour && a.pillars.hour.gz !== b.pillars.hour.gz)
    expect(diverged).toBe(true)
  })

  it('晚子不换时柱须按当日日干五鼠遁（修正库次日干遁错位）', () => {
    // 2000-01-01 23:00 晚子不换：日戊午；戊日子时=壬子（库曾错给甲子=次日己遁）
    const c = buildBaZi(2000, 1, 1, 23, 0, { dayCutover: 'ziZheng' })
    expect(c.pillars.day.gz).toBe('戊午')
    expect(c.pillars.hour?.gz).toBe(hourGanFromDay(c.dayMaster, '子') + '子')
    expect(c.pillars.hour?.gz).toBe('壬子')
  })

  it('子初换日 23 点：日时同干且与五鼠遁一致', () => {
    const c = buildBaZi(2000, 1, 1, 23, 0, { dayCutover: 'ziChu' })
    expect(c.pillars.day.gz).toBe('己未')
    expect(c.pillars.hour?.gz).toBe(hourGanFromDay(c.dayMaster, '子') + '子')
    expect(c.pillars.hour?.gz).toBe('甲子')
  })

  it('日间时辰时柱与五鼠遁、十二时辰对照一致', () => {
    for (const h of [0, 1, 7, 11, 14, 19, 22]) {
      const c = buildBaZi(2000, 1, 1, h, 0)
      const z = c.pillars.hour!.zhi
      const expectGz = hourGanFromDay(c.dayMaster, z) + z
      expect(c.pillars.hour!.gz).toBe(expectGz)
      const v = buildHourVariants(c.dayMaster).find((x) => x.zhi === z)
      expect(v?.pillar.gz).toBe(expectGz)
    }
  })
})

describe('出生地 UTC', () => {
  it('国外城市带明确 utcOffset，英文别名可搜', async () => {
    const { pickBirthPlaceByQuery, utcOffsetOf, filterBirthPlaces } = await import(
      './bazi/solarTime'
    )
    const ny = pickBirthPlaceByQuery('New York', 'intl')
    expect(ny?.name).toBe('纽约')
    expect(utcOffsetOf(ny!)).toBe(-5)
    const byAlias = filterBirthPlaces('London', 'intl')
    expect(byAlias.some((p) => p.name === '伦敦')).toBe(true)
  })

  it('泉港区可搜索且级联解析', async () => {
    const {
      pickBirthPlaceByQuery,
      listPlaceLevel3,
      resolveCascadePlace,
      birthPlaceId,
      PLACE_CITYWIDE
    } = await import('./bazi/solarTime')
    const qg = pickBirthPlaceByQuery('泉港', 'cn')
    expect(qg?.name).toBe('泉港')
    expect(qg?.city).toBe('泉州')
    expect(qg!.longitude).toBeGreaterThan(118)
    const districts = listPlaceLevel3('cn', '福建', '泉州')
    expect(districts.some((d) => d.label === '泉港')).toBe(true)
    expect(districts.some((d) => d.id === PLACE_CITYWIDE)).toBe(true)
    const resolved = resolveCascadePlace('cn', '福建', '泉州', birthPlaceId(qg!))
    expect(resolved?.name).toBe('泉港')
  })

  it('国内出生地覆盖全国区县量级', async () => {
    const { placesByScope, listPlaceLevel1, listPlaceLevel2, listPlaceLevel3, pickBirthPlaceByQuery } =
      await import('./bazi/solarTime')
    const cn = placesByScope('cn')
    // GB/T 2260：地级 300+ + 区县约 3000
    expect(cn.length).toBeGreaterThan(3000)
    expect(listPlaceLevel1('cn').length).toBeGreaterThanOrEqual(34)
    expect(listPlaceLevel2('cn', '河北').length).toBeGreaterThan(10)
    const sjz = listPlaceLevel3('cn', '河北', '石家庄')
    expect(sjz.length).toBeGreaterThan(10)
    // 抽样：朝阳区（北京）、天河（广州）可搜
    expect(pickBirthPlaceByQuery('天河', 'cn')?.city).toBe('广州')
    expect(pickBirthPlaceByQuery('朝阳', 'cn')?.province).toBeTruthy()
  })
})

describe('紫微完整排盘', () => {
  it('排出十二宫、四化与大限', async () => {
    const { buildZiWeiChart, formatZiWeiFacts } = await import('./ziwei/chart')
    const c = buildZiWeiChart({ year: 1990, month: 5, day: 1, hour: 12, gender: 'female' })
    expect(c.palaces).toHaveLength(12)
    expect(c.palaces[0].name).toBe('命宫')
    expect(c.sihua).toHaveLength(4)
    expect(c.daXian.length).toBeGreaterThanOrEqual(8)
    // 丁亥命宫 → 土五局；紫微在子、命宫天机（对齐 iztro）
    expect(c.wuXingJu).toBe('土五局')
    expect(c.mingZhi).toBe('亥')
    expect(c.palaces[0].majors).toContain('天机')
    expect(c.palaces.find((p) => p.majors.includes('紫微'))?.zhi).toBe('子')
    expect(formatZiWeiFacts(c)).toContain('十二宫')
    expect(c.ragQuery).toContain('紫微')
  })

  it('命宫干支定五行局与起紫微星口诀', async () => {
    const { calcWuXingJu, calcZiWeiIndex, calcTianFuIndex } = await import('./ziwei/chart')
    expect(calcWuXingJu('丁', '亥')).toBe('土五局')
    expect(calcZiWeiIndex(7, 5)).toBe(0)
    expect(calcTianFuIndex(0)).toBe(4)
  })
})
