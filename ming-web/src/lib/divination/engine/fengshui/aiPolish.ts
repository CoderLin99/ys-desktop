/**
 * 阳宅风水 AI 润色：强制 yangzhai RAG，禁止阴宅/葬法语料；要求完整方位说明。
 */
import { loadAiSettings, runSimpleAiChat } from '../bazi/aiPolish'
import { buildRagKnowledgeContext } from '../bazi/rag/buildContext'
import type { FengShuiResult } from './analyze'

/**
 * 根据结构化方位卡润色说明（坐向、八宅、年月飞星、定位一并叙述）。
 * @param result 推算结果
 */
export async function polishFengShui(result: FengShuiResult): Promise<string> {
  const settings = loadAiSettings()
  const rag = await buildRagKnowledgeContext({
    structured: {
      sitting: result.sittingFacing.sitting,
      facing: result.sittingFacing.facing,
      mingGua: result.baZhai.mingGuaName,
      houseMatch: result.houseMatch
    },
    queryOverride: result.ragQuery,
    schoolsAllow: ['yangzhai'],
    excludeSchools: ['yinzhai'],
    headerLabel: '阳宅书库',
    topK: 6,
    maxChars: 6000
  })

  const system = [
    '你是阳宅风水说明助手。只能依据用户给出的「已计算事实」与阳宅古籍摘录组织语言。',
    '禁止引用葬经、阴宅、墓地、点穴、倒杖等说法。',
    '禁止编造未给出的飞星数字或形峦实勘（龙砂水穴）。',
    '口吻务实克制，给出可执行的室内方位建议，并声明非实地勘察。',
    '必须完整说明：坐向、宅命八宅、流年飞星、流月飞星，以及已给出的经纬度/精度（若有）。'
  ].join('\n')

  const yearBoard = result.feixing.cells
    .map((c) => `${c.label}${c.gua}:${c.star}`)
    .join(' · ')
  const monthBoard = result.monthFeixing.cells
    .map((c) => `${c.label}${c.gua}:${c.star}`)
    .join(' · ')

  const user = [
    '【已计算事实】',
    ...result.bullets,
    '',
    '【方位卡】',
    ...result.cards.map(
      (c) =>
        `${c.gua}：八宅${c.baZhaiStar}(${c.baZhaiLuck})；流年${c.yearStar || '-'}；流月${c.monthStar || '-'}；${c.tip}`
    ),
    '',
    `【流年九宫】${yearBoard}`,
    `【流月九宫】${monthBoard}`,
    '',
    rag,
    '',
    '请用中文分节完整输出（勿极简条列）：1) 坐向与宅命总评 2) 吉位用法与慎方位 3) 流年飞星注意 4) 流月飞星注意 5) 定位与使用边界。每节写清依据与可执行建议。'
  ].join('\n')

  return runSimpleAiChat(settings, system, user, 0.5)
}
