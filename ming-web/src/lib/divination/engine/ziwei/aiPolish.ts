/**
 * 紫微斗数 AI 润色：优先 ziwei 学派语料，按完整盘（主星/辅星/四化/大限）作答。
 */
import { loadAiSettings, runSimpleAiChat } from '../bazi/aiPolish'
import { buildRagKnowledgeContext } from '../bazi/rag/buildContext'
import { formatZiWeiFacts, type ZiWeiChart } from './chart'

/**
 * 润色紫微完整盘：允许依据已排出的四化、辅星、大限综断，禁止瞎编未给出的星。
 * @param chart 排盘结果
 */
export async function polishZiWei(chart: ZiWeiChart): Promise<string> {
  const settings = loadAiSettings()
  const rag = await buildRagKnowledgeContext({
    structured: { mingZhi: chart.mingZhi, ju: chart.wuXingJu },
    queryOverride: chart.ragQuery,
    schoolsAllow: ['ziwei'],
    headerLabel: '紫微书库',
    topK: 6,
    maxChars: 6000
  })

  const system = [
    '你是紫微斗数说明助手。这是完整盘展示：含十二宫主星、常用辅星、生年四化与大限。',
    '只能依据用户给出的已排盘事实与摘录组织语言；可以解读四化、辅星与大限的相互作用。',
    '禁止编造事实中未出现的星曜、四化或宫位安星。',
    '不要把八字十神或风水葬法套进紫微。'
  ].join('\n')

  const user = [
    '【已排盘事实】',
    formatZiWeiFacts(chart),
    '',
    rag,
    '',
    '请用中文完整说明：命宫总评、事业财帛倾向、感情宫提示、生年四化要点、近期大限注意。'
  ].join('\n')

  return runSimpleAiChat(settings, system, user, 0.55)
}
