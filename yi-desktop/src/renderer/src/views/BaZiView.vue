<script setup lang="ts">
/**
 * 八字排盘页：公历/农历/手工四柱、真太阳时、细盘、断言与可选 AI 润色。
 */
import { computed, defineAsyncComponent, onActivated, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import SelectButton from 'primevue/selectbutton'
import {
  buildBaZi,
  buildBaZiFromPillars,
  buildHourVariants,
  DAY_CUTOVER_OPTIONS,
  type BaZiChart,
  type DayCutover,
  type HourVariant
} from '@rules/bazi/chart'
import { SHISHEN_BRIEF, explainShiShen } from '@rules/bazi/shishen'
import { collectShenSha, groupShenShaByPillar, type ShenShaHit } from '@rules/bazi/shensha'
import { formatShenShaStackSummary } from '@rules/bazi/shenshaStack'
import { analyzeBaZiTrend, type BaZiTrend } from '@rules/bazi/trend'
import { makeEvidence, type MetricAnchor, type RuleEvidence } from '@rules/bazi/evidence'
import { getMetricGloss, tableVersionNote } from '@rules/bazi/tables/load'
import MetricExplainPopover from '../components/MetricExplainPopover.vue'
import WxGlyph from '../components/WxGlyph.vue'
import { computeQiYun } from '@rules/bazi/yun'
import {
  YUN_BOOK_SUMMARIES,
  daYunModernHint,
  defaultYunIndex,
  formatDefaultYunForAi,
  listLiuNianOfYun,
  listLiuYueOfYear,
  type YunCalendarPick
} from '@rules/bazi/liunian'
import { renderLiteMarkdown, stripMdBold } from '@rules/bazi/mdLite'
import { glossPlainTalk } from '@rules/bazi/jargonPlain'
import type { WuXing } from '@rules/constants'
import { buildAssertion, type AssertionResult, type AssertionTone } from '@rules/bazi/assert'
import {
  buildDetailChart,
  ganColor,
  ganWuXing,
  zhiColor,
  zhiWuXing,
  type DetailChart
} from '@rules/bazi/detail'
import {
  formatLunarText,
  lunarMonthDays,
  lunarMonthsOfYear,
  lunarToSolar,
  solarToLunar
} from '@rules/bazi/calendar'
import {
  adjustToSolarTime,
  BIRTH_PLACES,
  CUSTOM_PLACE_KEY,
  birthPlaceId,
  birthPlaceScopeOf,
  findBirthPlaceById,
  placesByScope,
  shiftSolarDate,
  utcOffsetOf,
  type BirthPlaceScope
} from '@rules/bazi/solarTime'
import BirthPlacePicker from '../components/BirthPlacePicker.vue'
import {
  MING_AGENT_OPTIONS,
  askMingAgent,
  buildMingConsultFacts,
  createTypewriterSink,
  isAiConfigured,
  loadAiSettings,
  parsePolishLayers,
  pickPolishShowMode,
  inferAssertionWithAi,
  polishAssertionWithAi,
  saveAiSettings,
  translateAiTextToPlainTalk,
  type AiPolishSettings,
  type MingAgentId,
  type MingChatMessage
} from '@rules/bazi/aiPolish'
import { useBaziProfilesStore } from '../stores/baziProfiles'
import { storeToRefs } from 'pinia'
import { buildChartKey, useAiMemoryStore } from '../stores/aiMemory'
import { useAssistContextStore } from '../stores/assistContext'
/** 桌宠异步加载：运行时出错也不要拖垮整张排盘页 */
const WhalePet = defineAsyncComponent({
  loader: () => import('../components/WhalePet.vue'),
  /**
   * 桌宠加载失败时的占位，保证排盘主流程仍可用。
   */
  errorComponent: {
    template: '<span class="pet-fallback">命师</span>'
  }
})

/** 命例本地存储 */
const profilesStore = useBaziProfilesStore()
const { profiles, activeProfileId } = storeToRefs(profilesStore)
/** AI 会话记忆（本盘追问 + 最近总批） */
const aiMemoryStore = useAiMemoryStore()
/** 保存命例后的提示 */
const profileSaveMsg = ref('')

/** 起盘历法：公历 / 农历 / 手工四柱 */
const mode = ref<'solar' | 'lunar' | 'manual'>('solar')
const personName = ref('案例')
const year = ref(1999)
const month = ref(4)
const day = ref(13)
/** 农历年月日（月可为负表示闰月） */
const lunarYear = ref(1999)
const lunarMonth = ref(2)
const lunarDay = ref(27)
const hour = ref(3)
const minute = ref(0)
/** 时辰未知 */
const hourUnknown = ref(false)
const gender = ref<'male' | 'female'>('male')
/** 出生地范围：国内 / 国外 */
const placeScope = ref<BirthPlaceScope>('cn')
/** 出生地稳定 id；兼容旧命例纯市名 */
const placeName = ref(
  birthPlaceId(BIRTH_PLACES.find((p) => p.name === '北京' && !p.city) ?? BIRTH_PLACES[0])
)
/** 自定义东经（西经填负数） */
const customLongitude = ref(116.4)

/** 排盘历法选项，给 PrimeVue SelectButton 用 */
const modeOptions = [
  { label: '公历', value: 'solar' },
  { label: '农历', value: 'lunar' },
  { label: '四柱', value: 'manual' }
]
/** 性别选项 */
const genderOptions = [
  { label: '男', value: 'male' },
  { label: '女', value: 'female' }
]
/** 结果区「基本排盘 / 大运流年」 */
const resultTabOptions = [
  { label: '基本排盘', value: 'basic' },
  { label: '大运流年', value: 'pro' }
]

/**
 * 切换国内/国外后：若当前不在该范围，落到该范围首个市本级。
 */
watch(placeScope, (scope) => {
  if (placeName.value === CUSTOM_PLACE_KEY) return
  const hit = findBirthPlaceById(placeName.value, scope)
  if (!hit) {
    const first = placesByScope(scope).find((p) => !p.city) ?? placesByScope(scope)[0]
    placeName.value = first ? birthPlaceId(first) : CUSTOM_PLACE_KEY
  }
})
/** 是否叠加均时差（真太阳时） */
const useEot = ref(true)
/** 夏令时 */
const daylightSaving = ref(false)
/** 日柱换日口径：子初 / 晚子不换 */
const dayCutover = ref<DayCutover>('ziZheng')
/** 换日口径选项（文案偏引导，避免断语口吻） */
const dayCutoverOptions = DAY_CUTOVER_OPTIONS.map((o) => ({
  label: o.value === 'ziChu' ? '子初口径' : '晚子口径',
  value: o.value
}))
const assertTone = ref<AssertionTone>('ming')
const resultTab = ref<'basic' | 'pro'>('basic')

const manualYear = ref('己卯')
const manualMonth = ref('戊辰')
const manualDay = ref('乙未')
const manualHour = ref('戊寅')

const error = ref('')
const chart = ref<BaZiChart | null>(null)
const shensha = ref<ShenShaHit[]>([])
const assertion = ref<AssertionResult | null>(null)
const hourVariants = ref<HourVariant[]>([])
const detail = ref<DetailChart | null>(null)
/** 走势（含可复盘证据） */
const trendPack = ref<BaZiTrend | null>(null)
/** 点击指标打开的释义证据 */
const metricEvidence = ref<RuleEvidence | null>(null)
/** 词典浮层锚点（点击名词位置） */
const metricAnchor = ref<MetricAnchor | null>(null)

const aiSettings = ref<AiPolishSettings>(loadAiSettings())
const aiText = ref('')
/** 最近一次「润色断言」全文（术语向或已含白话结构） */
const aiTextClassic = ref('')
/** 最近一次「译成白话」全文 */
const aiTextPlain = ref('')
/** 当前查看：result=生成中原文、plain=白话、jargon=术语、classic=未拆层原文 */
const aiShowMode = ref<'result' | 'plain' | 'jargon' | 'classic'>('result')
const aiError = ref('')
const aiLoading = ref(false)
/** 是否正在做白话翻译（按钮文案用） */
const aiPlainLoading = ref(false)
/** 悬浮命师助手是否展开 */
const aiAssistantOpen = ref(false)
const route = useRoute()
/** 切走八字页时只藏浮层，不销毁润色与追问 */
const assistUiVisible = computed(() => false)
/** 坐堂命师席位 */
const consultAgent = ref<MingAgentId>('general')
/** 本盘追问记录 */
const consultMessages = ref<MingChatMessage[]>([])
/** 追问输入框 */
const consultDraft = ref('')
/** 追问是否在请求/输出中 */
const consultLoading = ref(false)
/** 追问过程中的草稿正文 */
const consultStream = ref('')
/**
 * 思考中轮播文案（Cursor/Codex 式等待反馈；有字写出后改显示正文）。
 */
const CONSULT_THINK_STEPS = [
  '参详本盘四柱…',
  '对照用神与忌神…',
  '梳理六亲与宫位…',
  '起草断语…'
] as const
/** 当前思考步骤下标 */
const consultThinkStep = ref(0)
/** 思考轮播定时器 */
let consultThinkTimer: ReturnType<typeof setInterval> | null = null

/**
 * 是否处于「思考中」：已发出追问、尚无正文。
 */
const consultThinking = computed(() => consultLoading.value && !consultStream.value.trim())

/**
 * 当前席位 + 轮播步骤，拼成状态行。
 */
const consultThinkLabel = computed(() => {
  const seat = MING_AGENT_OPTIONS.find((o) => o.id === consultAgent.value)?.label ?? '命师'
  return `${seat} · ${CONSULT_THINK_STEPS[consultThinkStep.value % CONSULT_THINK_STEPS.length]}`
})

/**
 * 启停思考轮播；有字流出时停在「起草断语」感即可。
 * @param on 是否开启
 */
function setConsultThinkSpin(on: boolean): void {
  if (consultThinkTimer) {
    clearInterval(consultThinkTimer)
    consultThinkTimer = null
  }
  if (!on) {
    consultThinkStep.value = 0
    return
  }
  consultThinkStep.value = 0
  consultThinkTimer = setInterval(() => {
    consultThinkStep.value = (consultThinkStep.value + 1) % CONSULT_THINK_STEPS.length
  }, 1400)
}

watch(consultThinking, (thinking) => {
  setConsultThinkSpin(thinking)
})

/** 润色发出后、正文未到之前的思考轮播文案 */
const POLISH_THINK_STEPS = [
  '对照用神与忌神…',
  '组织总批结构…',
  '起草白话断语…'
] as const
/** 推断模式思考轮播文案 */
const INFER_THINK_STEPS = [
  '权衡格局取舍…',
  '推演岁运应期…',
  '编织延伸推断…'
] as const
/** 当前 AI 任务：润色或推断（按钮/思考态用） */
const aiTaskMode = ref<'polish' | 'infer'>('polish')
/** 最近一次成功生成模式（重新生成时沿用） */
const lastAiMode = ref<'polish' | 'infer'>('polish')
/** 润色思考步骤下标 */
const polishThinkStep = ref(0)
/** 润色思考轮播定时器 */
let polishThinkTimer: ReturnType<typeof setInterval> | null = null

/**
 * 是否处于润色「思考中」：已发出、尚无正文。
 */
const polishThinking = computed(() => aiLoading.value && !aiText.value.trim())

/**
 * 润色思考状态行。
 */
const polishThinkLabel = computed(() => {
  const steps = aiTaskMode.value === 'infer' ? INFER_THINK_STEPS : POLISH_THINK_STEPS
  return `命师 · ${steps[polishThinkStep.value % steps.length]}`
})

/**
 * 启停润色思考轮播。
 * @param on 是否开启
 */
function setPolishThinkSpin(on: boolean): void {
  if (polishThinkTimer) {
    clearInterval(polishThinkTimer)
    polishThinkTimer = null
  }
  if (!on) {
    polishThinkStep.value = 0
    return
  }
  polishThinkStep.value = 0
  polishThinkTimer = setInterval(() => {
    const len = aiTaskMode.value === 'infer' ? INFER_THINK_STEPS.length : POLISH_THINK_STEPS.length
    polishThinkStep.value = (polishThinkStep.value + 1) % len
  }, 1400)
}

watch(polishThinking, (thinking) => {
  setPolishThinkSpin(thinking)
})

/** 当前排盘的节气大运 */
const yunResult = computed(() =>
  chart.value ? computeQiYun(chart.value, gender.value) : null
)
/** 点中的大运下标 */
const selectedYunIndex = ref(0)
/** 点中的流年公历；0 表示只选到运 */
const selectedYearValue = ref(0)
/** 点中的流月下标；0 表示未点月 */
const selectedYueIndex = ref(0)

/**
 * 当前命局喜用五行（给流年档位用）。
 */
function currentUseful(): WuXing[] {
  return (assertion.value?.structured.useful ?? []) as WuXing[]
}

/**
 * 当前命局忌神五行。
 */
function currentAvoid(): WuXing[] {
  return (assertion.value?.structured.avoid ?? []) as WuXing[]
}

/** 点选大运步 */
const selectedYunStep = computed(() => yunResult.value?.steps[selectedYunIndex.value] ?? null)

/** 点选大运下的流年列表 */
const liuNianYears = computed(() => {
  const step = selectedYunStep.value
  const c = chart.value
  if (!step || !c) return []
  return listLiuNianOfYun(step, c.solar.year, c.dayMaster, currentUseful(), currentAvoid())
})

/** 点选流年对象 */
const selectedLiuNian = computed(
  () => liuNianYears.value.find((y) => y.year === selectedYearValue.value) ?? null
)

/** 点选流年下的流月（交节时刻 + 大运流年三层） */
const liuYueItems = computed(() => {
  const year = selectedLiuNian.value
  const c = chart.value
  if (!year || !c) return []
  return listLiuYueOfYear(year.year, c.dayMaster, currentUseful(), currentAvoid(), {
    /** 当前大运干支，供三层同气/冲动 */
    daYunGz: selectedYunStep.value?.gz,
    /** 流年干支 */
    yearGz: year.gz,
    /** 日支，供流月冲日支 */
    natalDayZhi: c.pillars.day.zhi
  })
})

/** 点选流月 */
const selectedLiuYue = computed(
  () => liuYueItems.value.find((m) => m.index === selectedYueIndex.value) ?? null
)

/** 注入命师的岁运点选包 */
const yunPick = computed<YunCalendarPick | null>(() => {
  const step = selectedYunStep.value
  if (!step) return null
  const pick: YunCalendarPick = { daYun: step }
  if (selectedLiuNian.value) pick.year = selectedLiuNian.value
  if (selectedLiuYue.value) pick.month = selectedLiuYue.value
  return pick
})

/**
 * 润色/追问默认注入：当前大运 + 近几流年 + 今年流月；点选只作加写。
 */
const yunAiFacts = computed(() => {
  const steps = yunResult.value?.steps
  const c = chart.value
  if (!steps?.length || !c) return ''
  return formatDefaultYunForAi({
    steps,
    birthYear: c.solar.year,
    dayMaster: c.dayMaster,
    useful: currentUseful(),
    avoid: currentAvoid(),
    natalDayZhi: c.pillars.day.zhi,
    pick: yunPick.value
  })
})

/** 当前大运现代短读 */
const selectedYunHint = computed(() => {
  const step = selectedYunStep.value
  const c = chart.value
  if (!step || !c) return ''
  return daYunModernHint(step.gz, c.dayMaster, currentUseful(), currentAvoid())
})

/**
 * 点选一步大运；默认落到该步内的「今年」或第一年。
 * @param index 大运下标
 */
function selectYun(index: number): void {
  selectedYunIndex.value = index
  selectedYueIndex.value = 0
  const step = yunResult.value?.steps[index]
  if (!step || !chart.value) {
    selectedYearValue.value = 0
    return
  }
  const years = listLiuNianOfYun(
    step,
    chart.value.solar.year,
    chart.value.dayMaster,
    currentUseful(),
    currentAvoid()
  )
  const now = new Date().getFullYear()
  selectedYearValue.value = years.some((y) => y.year === now) ? now : (years[0]?.year ?? 0)
}

/**
 * 点选一流年；清掉流月以免串台。
 * @param year 公历年
 */
function selectLiuNianYear(year: number): void {
  selectedYearValue.value = year
  selectedYueIndex.value = 0
}

/**
 * 点选一流月。
 * @param index 1–12
 */
function selectLiuYue(index: number): void {
  selectedYueIndex.value = selectedYueIndex.value === index ? 0 : index
}

/**
 * 排盘后把日历对准当前年所在大运。
 */
function syncYunCalendar(): void {
  const steps = yunResult.value?.steps ?? []
  if (!steps.length) {
    selectedYunIndex.value = 0
    selectedYearValue.value = 0
    selectedYueIndex.value = 0
    return
  }
  selectYun(defaultYunIndex(steps))
}

/** DeepSeek 余额已迁至「大模型」配置页，助手弹窗不再查询 */

/**
 * 把助手正文里的 **加粗** 转成可渲染 HTML。
 * @param text 模型原文
 * @param forLayperson 为真时把残留术语改成「人话（命理叫某某）」
 */
function mdHtml(text: string, forLayperson = false): string {
  return renderLiteMarkdown(forLayperson ? glossPlainTalk(text) : text)
}

/** 润色正文 HTML（含思考后的逐字光标） */
const aiOutHtml = computed(() => {
  const body = renderLiteMarkdown(aiText.value)
  return aiLoading.value ? `${body}<span class="ai-cursor" aria-hidden="true">▍</span>` : body
})

/** 追问生成中的正文 HTML */
const consultStreamHtml = computed(
  () =>
    `${renderLiteMarkdown(glossPlainTalk(consultStream.value))}<span class="ai-cursor" aria-hidden="true">▍</span>`
)

onBeforeUnmount(() => {
  setConsultThinkSpin(false)
  setPolishThinkSpin(false)
  window.removeEventListener('resize', clampAssistBox)
  unbindAssistDragListeners()
})

/**
 * 是否已具备可调用条件（与全局助手同一判定）。
 */
const aiConfigured = computed(() => isAiConfigured(aiSettings.value))

/** 助手拖拽后的视口坐标；未拖过则为 null，走默认右下半屏 */
const assistBox = ref<{ left: number; top: number; width: number; height: number } | null>(null)
/** 标题栏是否正在拖拽 */
const assistDragging = ref(false)
/** 本次拖拽起点：指针位置 + 窗口左上角 */
let assistDragOrigin = { px: 0, py: 0, left: 0, top: 0 }

/**
 * 拖拽后的定位样式；未拖过不写 inline，保持默认右下半屏。
 */
const assistDragStyle = computed(() => {
  const box = assistBox.value
  if (!box) return undefined
  return {
    left: `${box.left}px`,
    top: `${box.top}px`,
    right: 'auto',
    bottom: 'auto',
    width: `${box.width}px`,
    height: `${box.height}px`
  }
})

/**
 * 把助手窗口限制在视口内，避免拖出屏幕或缩放后丢失。
 */
function clampAssistBox(): void {
  const box = assistBox.value
  if (!box) return
  const margin = 8
  const maxL = Math.max(margin, window.innerWidth - box.width - margin)
  const maxT = Math.max(margin, window.innerHeight - box.height - margin)
  assistBox.value = {
    ...box,
    left: Math.min(maxL, Math.max(margin, box.left)),
    top: Math.min(maxT, Math.max(margin, box.top))
  }
}

/**
 * 在 window 上监听移动/松开，指针滑出标题栏时仍能跟上。
 */
function bindAssistDragListeners(): void {
  unbindAssistDragListeners()
  window.addEventListener('pointermove', onAssistPointerMove)
  window.addEventListener('pointerup', onAssistPointerUp)
  window.addEventListener('mousemove', onAssistPointerMove)
  window.addEventListener('mouseup', onAssistPointerUp)
}

/**
 * 卸掉拖拽期间挂在 window 上的监听。
 */
function unbindAssistDragListeners(): void {
  window.removeEventListener('pointermove', onAssistPointerMove)
  window.removeEventListener('pointerup', onAssistPointerUp)
  window.removeEventListener('mousemove', onAssistPointerMove)
  window.removeEventListener('mouseup', onAssistPointerUp)
}

/** 当前盘四柱键（记忆索引） */
const currentChartKey = computed(() => (chart.value ? buildChartKey(chart.value) : ''))

/**
 * 从本机记忆恢复命师状态（打开助手时调用）。
 */
function loadAiMemory(): void {
  const key = currentChartKey.value
  if (!key) return
  const mem = aiMemoryStore.get(key)
  if (!mem) return
  consultAgent.value = mem.agentId
  consultMessages.value = [...mem.messages]
  lastAiMode.value = mem.lastMode
  if (mem.lastSummary.trim()) {
    aiTextClassic.value = mem.lastSummary
    aiText.value = mem.lastSummary
    const layers = parsePolishLayers(mem.lastSummary)
    aiShowMode.value = pickPolishShowMode(layers)
  }
}

/**
 * 把当前命师状态写入本机记忆。
 */
function saveAiMemory(): void {
  const key = currentChartKey.value
  if (!key) return
  aiMemoryStore.persist({
    chartKey: key,
    profileId: profilesStore.activeProfileId,
    agentId: consultAgent.value,
    messages: [...consultMessages.value],
    lastSummary: aiTextClassic.value || aiText.value,
    lastMode: lastAiMode.value
  })
}

/**
 * 打开/关闭悬浮命师助手；打开时刷新本机大模型配置并恢复记忆。
 * @param open 目标开合；省略则切换
 */
function toggleAiAssistant(open?: boolean): void {
  const next = open ?? !aiAssistantOpen.value
  if (next) {
    aiSettings.value = loadAiSettings()
    loadAiMemory()
    clampAssistBox()
  } else {
    unbindAssistDragListeners()
    assistDragging.value = false
  }
  aiAssistantOpen.value = next
}

/**
 * 标题栏按下：开始拖窗口（关闭按钮等控件不拖）。
 * @param ev 指针或鼠标按下事件
 */
function onAssistPointerDown(ev: PointerEvent | MouseEvent): void {
  if (assistDragging.value) return
  const target = ev.target as HTMLElement | null
  if (target?.closest('button, a, input, select, textarea, label')) return
  const panel = (ev.currentTarget as HTMLElement | null)?.closest('.ai-assist') as HTMLElement | null
  if (!panel) return
  ev.preventDefault()
  const r = panel.getBoundingClientRect()
  assistBox.value = { left: r.left, top: r.top, width: r.width, height: r.height }
  assistDragging.value = true
  assistDragOrigin = { px: ev.clientX, py: ev.clientY, left: r.left, top: r.top }
  bindAssistDragListeners()
}

/**
 * 拖拽中：随指针移动并夹紧视口，宽高保持按下时的半屏像素值。
 * @param ev 指针或鼠标移动事件
 */
function onAssistPointerMove(ev: PointerEvent | MouseEvent): void {
  if (!assistDragging.value || !assistBox.value) return
  const margin = 8
  const { width, height } = assistBox.value
  const maxL = Math.max(margin, window.innerWidth - width - margin)
  const maxT = Math.max(margin, window.innerHeight - height - margin)
  assistBox.value = {
    ...assistBox.value,
    left: Math.min(maxL, Math.max(margin, assistDragOrigin.left + ev.clientX - assistDragOrigin.px)),
    top: Math.min(maxT, Math.max(margin, assistDragOrigin.top + ev.clientY - assistDragOrigin.py))
  }
}

/**
 * 结束拖拽并卸掉 window 监听。
 */
function onAssistPointerUp(): void {
  if (!assistDragging.value) return
  assistDragging.value = false
  unbindAssistDragListeners()
}

window.addEventListener('resize', clampAssistBox)

/** 规则断言反馈：赞 / 踩 */
const assertFeedback = ref<'up' | 'down' | null>(null)
/** AI 润色反馈：赞 / 踩 */
const aiFeedback = ref<'up' | 'down' | null>(null)
/** 复制成功提示（规则 / AI） */
const copyToast = ref<'assert' | 'ai' | ''>('')
let copyToastTimer: ReturnType<typeof setTimeout> | null = null

/**
 * 将规则断言格式化为纯文本（供复制）。
 * @param a 断言结果
 */
function formatAssertionPlain(a: AssertionResult): string {
  const lines = [
    a.headline,
    '',
    ...a.items.map((it) => `【${it.category}】${it.text}`),
    '',
    a.disclaimer
  ]
  return lines.join('\n')
}

/**
 * 复制文本到剪贴板，并短暂显示「已复制」。
 * @param text 正文
 * @param which 提示落点
 */
async function copyContent(text: string, which: 'assert' | 'ai'): Promise<void> {
  const body = text.trim()
  if (!body) return
  try {
    await navigator.clipboard.writeText(body)
  } catch {
    // 降级：隐藏 textarea
    const ta = document.createElement('textarea')
    ta.value = body
    ta.style.position = 'fixed'
    ta.style.left = '-9999px'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
  }
  copyToast.value = which
  if (copyToastTimer) clearTimeout(copyToastTimer)
  copyToastTimer = setTimeout(() => {
    copyToast.value = ''
  }, 1600)
}

/**
 * 设置赞/踩反馈（再点一次取消）。
 * @param target 规则断言或 AI
 * @param value 赞或踩
 */
function setFeedback(target: 'assert' | 'ai', value: 'up' | 'down'): void {
  if (target === 'assert') {
    assertFeedback.value = assertFeedback.value === value ? null : value
  } else {
    aiFeedback.value = aiFeedback.value === value ? null : value
  }
}

/**
 * 重新生成规则断言（沿用当前排盘与口吻）。
 */
function regenerateAssertion(): void {
  assertFeedback.value = null
  run()
}

/**
 * 重新生成 AI 润色或推断（沿用上次模式）。
 */
async function regenerateAi(): Promise<void> {
  aiFeedback.value = null
  if (lastAiMode.value === 'infer') await runAiInfer()
  else await runAiPolish()
}

/** 当前用于排盘的经度与展示名 */
const currentPlace = computed(() => {
  if (placeName.value === CUSTOM_PLACE_KEY) {
    return {
      name: `自定义（东经${customLongitude.value}°）`,
      province: '自定义',
      longitude: customLongitude.value
    }
  }
  return (
    findBirthPlaceById(placeName.value, placeScope.value) ??
    findBirthPlaceById(placeName.value) ??
    placesByScope(placeScope.value).find((p) => !p.city) ??
    BIRTH_PLACES[0]
  )
})

/**
 * 从已选地点同步范围（例如载入命例后）。
 * @param id 地点 id 或旧版市名
 */
function syncPlaceScopeFromName(id: string): void {
  if (id === CUSTOM_PLACE_KEY) return
  const hit = findBirthPlaceById(id)
  if (hit) {
    placeScope.value = birthPlaceScopeOf(hit)
    placeName.value = birthPlaceId(hit)
  }
}

/** 农历月下拉 */
const lunarMonthOptions = computed(() => lunarMonthsOfYear(lunarYear.value))

/** 农历日上限 */
const lunarDayMax = computed(() => {
  try {
    return lunarMonthDays(lunarYear.value, lunarMonth.value)
  } catch {
    return 30
  }
})

watch(lunarDayMax, (max) => {
  if (lunarDay.value > max) lunarDay.value = max
})

/**
 * 解析排盘用的公历年月日时分（含农历转换与真太阳时）。
 */
function resolveSolarClock(): {
  y: number
  m: number
  d: number
  h: number | null
  mi: number
  notes: string[]
} {
  const notes: string[] = []
  let y = year.value
  let m = month.value
  let d = day.value

  if (mode.value === 'lunar') {
    const solar = lunarToSolar(lunarYear.value, lunarMonth.value, lunarDay.value)
    y = solar.year
    m = solar.month
    d = solar.day
    notes.push(
      `农历 ${formatLunarText({ year: lunarYear.value, month: lunarMonth.value, day: lunarDay.value })} → 公历 ${solar.text}`
    )
  } else if (mode.value === 'solar') {
    try {
      const lu = solarToLunar(y, m, d)
      notes.push(`公历对照农历：${lu.text}`)
    } catch {
      /* ignore */
    }
  }

  if (hourUnknown.value) {
    notes.push(`${currentPlace.value.name}（东经${currentPlace.value.longitude}°）· 时辰未知，未做真太阳时校正`)
    return { y, m, d, h: null, mi: 0, notes }
  }

  // 钟面时间：可选夏令时回拨 + 出生地经度/均时差
  if (!useEot.value && !daylightSaving.value) {
    notes.push(`${currentPlace.value.name} · 按北京时间钟面排盘（未做经度/均时差）`)
    return { y, m, d, h: hour.value, mi: minute.value, notes }
  }

  const adj = adjustToSolarTime(hour.value, minute.value, currentPlace.value.longitude, {
    // 勾选「真太阳时」才加均时差；仅夏令时时仍做经度校正
    useEquationOfTime: useEot.value,
    daylightSaving: daylightSaving.value,
    month: m,
    day: d,
    utcOffset: utcOffsetOf(currentPlace.value)
  })
  notes.push(
    `${currentPlace.value.name}（经度${currentPlace.value.longitude}° · UTC${utcOffsetOf(currentPlace.value) >= 0 ? '+' : ''}${utcOffsetOf(currentPlace.value)}）`
  )
  notes.push(adj.note)

  let ry = y
  let rm = m
  let rd = d
  if (adj.dateShift !== 0) {
    const shifted = shiftSolarDate(y, m, d, adj.dateShift)
    ry = shifted.year
    rm = shifted.month
    rd = shifted.day
  }

  return { y: ry, m: rm, d: rd, h: adj.hour, mi: adj.minute, notes }
}

/**
 * 将当前起盘表单保存为命例（供日运/首页/紫微/合盘套用）。
 */
function saveCurrentProfile(): void {
  profileSaveMsg.value = ''
  try {
    if (mode.value === 'manual') {
      profileSaveMsg.value = '手工四柱模式请先切回公历/农历再保存，或排盘后在日运页保存。'
      return
    }
    const clock = resolveSolarClock()
    const row = profilesStore.upsert({
      label: personName.value.trim() || '未命名',
      gender: gender.value,
      year: clock.y,
      month: clock.m,
      day: clock.d,
      hour: hourUnknown.value ? null : clock.h,
      minute: hourUnknown.value ? 0 : clock.mi,
      hourUnknown: hourUnknown.value,
      placeScope: placeScope.value,
      placeName: placeName.value,
      placeLongitude:
        placeName.value === CUSTOM_PLACE_KEY ? customLongitude.value : currentPlace.value.longitude,
      dayCutover: dayCutover.value,
      useEot: useEot.value,
      daylightSaving: daylightSaving.value
    })
    profilesStore.setActive(row.id)
    profileSaveMsg.value = `已保存命例「${row.label}」，可在紫微/合盘/日运套用。`
  } catch (e) {
    profileSaveMsg.value = e instanceof Error ? e.message : String(e)
  }
}

/**
 * 从已存命例套用到起盘表单（公历 + 出生地/换日口径）。
 * @param id 命例 id；空则忽略
 */
function applyProfile(id: string | null): void {
  if (!id) return
  const p = profilesStore.byId(id)
  if (!p) return
  mode.value = 'solar'
  personName.value = p.label
  gender.value = p.gender
  year.value = p.year
  month.value = p.month
  day.value = p.day
  hourUnknown.value = p.hourUnknown
  hour.value = p.hour ?? 12
  minute.value = p.minute ?? 0
  if (p.placeScope) placeScope.value = p.placeScope
  if (p.placeName) {
    syncPlaceScopeFromName(p.placeName)
    if (p.placeName === CUSTOM_PLACE_KEY && typeof p.placeLongitude === 'number') {
      customLongitude.value = p.placeLongitude
    }
  }
  if (p.dayCutover) dayCutover.value = p.dayCutover
  if (typeof p.useEot === 'boolean') useEot.value = p.useEot
  if (typeof p.daylightSaving === 'boolean') daylightSaving.value = p.daylightSaving
  profilesStore.setActive(id)
  profileSaveMsg.value = `已套用命例「${p.label}」`
  run(true)
}

/**
 * 清空命师助手：润色、追问与开合状态。仅用户点「排盘」时调用。
 */
function clearMingAssistant(): void {
  const key = currentChartKey.value
  if (key) aiMemoryStore.clear(key)
  aiText.value = ''
  aiTextClassic.value = ''
  aiTextPlain.value = ''
  aiError.value = ''
  aiShowMode.value = 'result'
  consultMessages.value = []
  consultStream.value = ''
  consultDraft.value = ''
  aiFeedback.value = null
  aiTaskMode.value = 'polish'
  lastAiMode.value = 'polish'
  aiAssistantOpen.value = false
}

/**
 * 执行排盘并生成细盘、神煞、断言、十二时辰对照。
 * @param resetAssistant 是否同时清空命师助手；切菜单不走排盘
 */
function run(resetAssistant = false): void {
  error.value = ''
  if (resetAssistant) clearMingAssistant()
  assertFeedback.value = null
  try {
    if (mode.value === 'manual') {
      chart.value = buildBaZiFromPillars([
        manualYear.value.trim(),
        manualMonth.value.trim(),
        manualDay.value.trim(),
        manualHour.value.trim()
      ])
    } else {
      const clock = resolveSolarClock()
      chart.value = buildBaZi(clock.y, clock.m, clock.d, clock.h, clock.mi, {
        dayCutover: dayCutover.value
      })
      chart.value.notes = [...clock.notes, ...chart.value.notes]
    }
    const c = chart.value
    shensha.value = collectShenSha(c)
    const byPillar = groupShenShaByPillar(shensha.value)
    detail.value = buildDetailChart(c, {
      name: personName.value,
      gender: gender.value,
      shenShaByPillar: byPillar
    })
    const trend = analyzeBaZiTrend(c, { gender: gender.value, yearSpan: 1 })
    trendPack.value = trend
    assertion.value = buildAssertion(c, trend, shensha.value, assertTone.value, gender.value)
    hourVariants.value = c.hourUnknown ? buildHourVariants(c.dayMaster) : []
    syncYunCalendar()
  } catch (e) {
    chart.value = null
    shensha.value = []
    assertion.value = null
    hourVariants.value = []
    detail.value = null
    trendPack.value = null
    metricEvidence.value = null
    metricAnchor.value = null
    error.value = e instanceof Error ? e.message : String(e)
  }
}

/**
 * 从点击事件取名词锚点矩形。
 * @param ev 鼠标/指针事件
 */
function anchorFromEvent(ev?: MouseEvent | null): MetricAnchor | null {
  const el = ev?.currentTarget
  if (!(el instanceof HTMLElement)) return null
  const r = el.getBoundingClientRect()
  return { left: r.left, top: r.top, right: r.right, bottom: r.bottom }
}

/**
 * 打开词典式释义小浮层（锚定点击名词旁）。
 * @param e 证据
 * @param ev 可选点击事件，用于定位
 */
function openMetric(e: RuleEvidence, ev?: MouseEvent | null): void {
  metricAnchor.value = anchorFromEvent(ev)
  metricEvidence.value = e
}

/**
 * 关闭指标释义。
 */
function closeMetric(): void {
  metricEvidence.value = null
  metricAnchor.value = null
}

/**
 * 点击天干十神：给出生克阴阳依据。
 * @param gan 天干；空则忽略
 * @param ev 点击事件
 */
function openShiShenOfGan(gan: string | undefined | null, ev?: MouseEvent): void {
  if (!chart.value || !gan) return
  const { evidence } = explainShiShen(chart.value.dayMaster, gan as import('@rules/constants').TianGan)
  openMetric(evidence, ev)
}

/**
 * 点击神煞名。
 * @param name 神煞名
 * @param ev 点击事件
 */
function openShenShaByName(name: string, ev?: MouseEvent): void {
  const hit = shensha.value.find((s) => s.name === name)
  if (!hit) {
    openMetric(
      makeEvidence({
        id: `shensha.${name}`,
        value: name,
        rule: `教学神煞查表（${tableVersionNote()}）`,
        basis: '本盘未命中该神煞，仅展示概念释义。',
        gloss: getMetricGloss(name)
      }),
      ev
    )
    return
  }
  openMetric(
    makeEvidence({
      id: `shensha.${hit.name}`,
      value: hit.name,
      rule: hit.rule,
      basis: hit.basis,
      gloss: hit.brief
    }),
    ev
  )
}

/**
 * 保存润色相关选项到本机（口风等；接口参数在「大模型」页配置）。
 */
function persistAi(): void {
  saveAiSettings(aiSettings.value)
}

/**
 * 调用可选 AI 润色规则断言（逐字写出）。
 */
async function runAiPolish(): Promise<void> {
  if (!assertion.value) return
  aiTaskMode.value = 'polish'
  lastAiMode.value = 'polish'
  aiLoading.value = true
  aiPlainLoading.value = false
  aiError.value = ''
  aiText.value = ''
  aiTextClassic.value = ''
  aiTextPlain.value = ''
  aiShowMode.value = 'result'
  persistAi()

  const sink = createTypewriterSink((shown) => {
    aiText.value = shown
  })

  try {
    const full = await polishAssertionWithAi(
      assertion.value.structured,
      assertion.value.aiSections,
      aiSettings.value,
      aiSettings.value.polishTone ?? 'ming',
      undefined,
      (accumulated) => {
        sink.push(accumulated)
      },
      yunAiFacts.value
    )
    sink.push(full)
    await sink.flush()
    aiTextClassic.value = full
    const layers = parsePolishLayers(full)
    aiShowMode.value = pickPolishShowMode(layers)
    saveAiMemory()
  } catch (e) {
    sink.snapTo(aiText.value)
    aiError.value = e instanceof Error ? e.message : String(e)
  } finally {
    aiLoading.value = false
  }
}

/**
 * 调用 AI 推断：在规则事实基础上延伸格局取舍与岁运应期（逐字写出）。
 */
async function runAiInfer(): Promise<void> {
  if (!assertion.value) return
  aiTaskMode.value = 'infer'
  lastAiMode.value = 'infer'
  aiLoading.value = true
  aiPlainLoading.value = false
  aiError.value = ''
  aiText.value = ''
  aiTextClassic.value = ''
  aiTextPlain.value = ''
  aiShowMode.value = 'result'
  persistAi()

  const sink = createTypewriterSink((shown) => {
    aiText.value = shown
  })

  try {
    const full = await inferAssertionWithAi(
      assertion.value.structured,
      assertion.value.aiSections,
      aiSettings.value,
      (accumulated) => {
        sink.push(accumulated)
      },
      yunAiFacts.value
    )
    sink.push(full)
    await sink.flush()
    aiTextClassic.value = full
    const layers = parsePolishLayers(full)
    // 推断与润色共用拆层；优先进白话页，避免「有拆层却切不到白话」
    aiShowMode.value = pickPolishShowMode(layers)
    saveAiMemory()
  } catch (e) {
    sink.snapTo(aiText.value)
    aiError.value = e instanceof Error ? e.message : String(e)
  } finally {
    aiLoading.value = false
  }
}

/**
 * 把当前 AI 润色结果再译成现代化白话（逐字写出）。
 */
async function runAiPlainTalk(): Promise<void> {
  const source = (aiTextClassic.value || aiText.value).trim()
  if (!source) {
    aiError.value = '请先完成「润色断言」，再译成白话'
    return
  }
  if (!aiTextClassic.value) aiTextClassic.value = source

  aiLoading.value = true
  aiPlainLoading.value = true
  aiError.value = ''
  aiShowMode.value = 'plain'
  persistAi()

  const sink = createTypewriterSink((shown) => {
    aiText.value = shown
  })
  aiText.value = ''

  try {
    const full = await translateAiTextToPlainTalk(source, aiSettings.value, (accumulated) => {
      sink.push(accumulated)
    })
    sink.push(full)
    await sink.flush()
    aiTextPlain.value = full
  } catch (e) {
    sink.snapTo(aiText.value)
    aiError.value = e instanceof Error ? e.message : String(e)
  } finally {
    aiLoading.value = false
    aiPlainLoading.value = false
  }
}

/**
 * 切换白话 / 术语 / 原文。
 * @param mode 展示层
 */
function setAiShowMode(mode: 'plain' | 'jargon' | 'classic'): void {
  /** 有原文或流式正文即可切层；不再只认 aiTextClassic，避免推断后切白话被误拦 */
  const hasBody = Boolean(aiTextClassic.value || aiText.value || aiTextPlain.value)
  if (!hasBody && mode !== 'classic') return
  if (mode === 'plain' && !polishLayers.value.sections.some((s) => s.plain) && !aiTextPlain.value) {
    return
  }
  if (mode === 'jargon' && !polishLayers.value.sections.some((s) => s.jargon)) {
    return
  }
  aiShowMode.value = mode
}

/** 当前润色拆层（随原文变化） */
const polishLayers = computed(() => parsePolishLayers(aiTextClassic.value || aiText.value))

/**
 * 润色/推断结果页签：生成中的 result 在 UI 上等同「原文」。
 */
const aiViewMode = computed({
  get: () => (aiShowMode.value === 'result' ? 'classic' : aiShowMode.value),
  /**
   * @param mode 白话 / 术语 / 原文
   */
  set: (mode: 'plain' | 'jargon' | 'classic') => {
    setAiShowMode(mode)
  }
})

/** 页签选项：按是否真有白话/术语正文启用，避免 hasSplit 仅因术语标签而误开空白话页 */
const aiViewOptions = computed(() => {
  const layers = polishLayers.value
  const hasPlain = layers.sections.some((s) => Boolean(s.plain)) || Boolean(aiTextPlain.value)
  const hasJargon = layers.sections.some((s) => Boolean(s.jargon))
  return [
    { label: '白话总批', value: 'plain', disabled: !hasPlain },
    { label: '术语依据', value: 'jargon', disabled: !hasJargon },
    { label: '原文', value: 'classic', disabled: !aiTextClassic.value && !aiText.value }
  ]
})

/** 复制用的当前层文本 */
const aiCopyText = computed(() => {
  if (aiShowMode.value === 'plain') {
    return stripMdBold(glossPlainTalk(polishLayers.value.plainText || aiText.value))
  }
  if (aiShowMode.value === 'jargon') return stripMdBold(polishLayers.value.jargonText || aiText.value)
  return stripMdBold(aiTextClassic.value || aiText.value)
})

/** 追问用的本盘事实包 */
const mingConsultFacts = computed(() => {
  if (!chart.value || !detail.value || !assertion.value) return ''
  const p = chart.value.pillars
  const pillars = [p.year.gz, p.month.gz, p.day.gz, p.hour?.gz ?? '时未知'].join(' ')
  /** 神煞条 + 叠见摘要（多柱相关度，非吉凶倍增） */
  const shaLines = shensha.value
    .map((s) => `${s.name}（${s.zhi.join('') || '干合'}·${s.pillars.join('')}柱｜${s.basis}）`)
    .join('；')
  const stackNote = formatShenShaStackSummary(shensha.value)
  const shenshaText = [shaLines || '无', stackNote].filter(Boolean).join('\n')
  return buildMingConsultFacts({
    name: detail.value.name,
    genderLabel: detail.value.genderLabel,
    pillars,
    /** 年/月/日/时天干十神，钉死模型不许改名 */
    pillarShiShen: [
      `年${p.year.gz}${p.year.ganShiShen}`,
      `月${p.month.gz}${p.month.ganShiShen}`,
      `日${p.day.gz}日主`,
      p.hour ? `时${p.hour.gz}${p.hour.ganShiShen}` : '时未知'
    ].join(' · '),
    dayMaster: `${chart.value.dayMaster}（${chart.value.dayMasterWuXing}）`,
    strength: `${assertion.value.structured.strength}`,
    useful: assertion.value.structured.useful.join('、'),
    avoid: assertion.value.structured.avoid.join('、'),
    usefulBasis: trendPack.value?.usefulEvidence?.basis ?? '',
    qiYun: detail.value.qiYun,
    daYun: detail.value.daYun.map((d) => `${d.ageFrom}岁${d.gz}`).join('、'),
    headline: assertion.value.headline,
    shensha: shenshaText,
    selectedYun: yunAiFacts.value,
    evidences: (assertion.value.structured.evidences || [])
      .map((e) => formatShenShaEvidenceLike(e))
      .join('\n')
  })
})

/**
 * 证据格式化为助手事实行（与神煞证据句同风格）。
 * @param e 证据
 */
function formatShenShaEvidenceLike(e: RuleEvidence): string {
  return `${e.id}: ${e.value}｜查法 ${e.rule}｜本盘 ${e.basis}`
}

const assistContext = useAssistContextStore()

/**
 * 有本盘事实时发布到八字槽位（不改成综合默认；仅本功能）。
 */
watch(
  mingConsultFacts,
  (facts) => {
    if (!facts.trim()) return
    assistContext.publish({
      id: 'bazi',
      title: '八字',
      factsText: facts,
      polishText: aiTextClassic.value || aiText.value || undefined
    })
  },
  { immediate: true }
)

onMounted(() => {
  assistContext.setActiveFeature('bazi')
})

onActivated(() => {
  assistContext.setActiveFeature('bazi')
})

/**
 * 向当前命师追问（带本盘与总批上下文）。
 */
async function runConsultAsk(): Promise<void> {
  const q = consultDraft.value.trim()
  if (!q || !assertion.value) return
  consultDraft.value = ''
  consultLoading.value = true
  consultStream.value = ''
  persistAi()
  consultMessages.value.push({ role: 'user', text: q })
  const sink = createTypewriterSink((shown) => {
    consultStream.value = shown
  })
  try {
    const full = await askMingAgent(
      q,
      {
        chartFacts: mingConsultFacts.value,
        polishText: aiTextClassic.value || formatAssertionPlain(assertion.value),
        agentId: consultAgent.value
      },
      consultMessages.value.slice(0, -1),
      aiSettings.value,
      (accumulated) => sink.push(accumulated)
    )
    sink.push(full)
    await sink.flush()
    consultMessages.value.push({ role: 'assistant', text: full })
    consultStream.value = ''
    saveAiMemory()
  } catch (e) {
    sink.snapTo(consultStream.value)
    consultMessages.value.push({
      role: 'assistant',
      text: e instanceof Error ? `未能作答：${e.message}` : String(e)
    })
    consultStream.value = ''
  } finally {
    consultLoading.value = false
  }
}

/** 日主简述 */
const dayBrief = computed(() => {
  if (!chart.value || !detail.value) return ''
  const tag = chart.value.hourUnknown ? '三柱' : '四柱'
  return `${detail.value.name} · ${detail.value.genderLabel} · ${tag} · 日主 ${chart.value.dayMaster}（${chart.value.dayMasterWuXing}）`
})

/** 供模板取色 */
const colorGan = ganColor
const colorZhi = zhiColor

/**
 * 强弱芯片语义（data-kind）。
 */
const strengthChipKind = computed(() => {
  const s = trendPack.value?.strength
  if (s === '偏强') return 'strong'
  if (s === '偏弱') return 'weak'
  return 'mid'
})

/**
 * 强弱芯片字标。
 */
const strengthChipIco = computed(() => {
  const s = trendPack.value?.strength
  if (s === '偏强') return '强'
  if (s === '偏弱') return '弱'
  return '中'
})

/**
 * 按神煞名取吉/慎/中，用于细盘标签色。
 * @param name 神煞名
 */
function shenShaToneOf(name: string): string {
  return shensha.value.find((s) => s.name === name)?.tone ?? '中'
}

/** 八字页分区锚点导航（AI 助手改为悬浮，不占锚点） */
const pageNav = [
  { id: 'bazi-form', label: '起盘', needChart: false },
  { id: 'bazi-chart', label: '排盘', needChart: true },
  { id: 'bazi-yun', label: '流年', needChart: true },
  { id: 'bazi-shensha', label: '神煞', needChart: true },
  { id: 'bazi-assert', label: '断言', needChart: true },
  { id: 'bazi-hours', label: '时辰', needChart: true }
] as const

/** 当前可见的分区导航（无排盘结果时只保留起盘） */
const visiblePageNav = computed(() =>
  pageNav.filter((item) => {
    if (!item.needChart) return true
    if (!chart.value) return false
    if (item.id === 'bazi-hours') return hourVariants.value.length > 0
    if (item.id === 'bazi-assert') return Boolean(assertion.value)
    return true
  })
)

/**
 * 滚动到页内分区（在主内容滚动容器内平滑定位）。
 * @param id 元素 id
 */
function jumpToSection(id: string): void {
  const el = document.getElementById(id)
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

run()
</script>

<template>
  <div class="page rise">
    <header class="head" id="bazi-top">
      <h1>八字排盘</h1>
      <p>
        可先填写公历、农历或手工四柱；出生地与真太阳时用于更贴近当地时刻的校正（教学近似，供参考）。
      </p>
    </header>

    <nav class="page-nav" aria-label="本页分区">
      <button
        v-for="item in visiblePageNav"
        :key="item.id"
        type="button"
        class="page-nav-item"
        @click="jumpToSection(item.id)"
      >
        {{ item.label }}
      </button>
    </nav>

    <div id="bazi-form" class="panel section-anchor">
      <SelectButton
        v-model="mode"
        class="pv-seg"
        :options="modeOptions"
        optionLabel="label"
        optionValue="value"
        :allowEmpty="false"
        aria-label="起盘历法"
      />

      <div class="profile-bar">
        <label class="profile-pick">
          已存命例
          <select
            :value="activeProfileId ?? ''"
            @change="
              applyProfile(($event.target as HTMLSelectElement).value || null)
            "
          >
            <option value="">自行填写</option>
            <option v-for="p in profiles" :key="p.id" :value="p.id">{{ p.label }}</option>
          </select>
        </label>
      </div>

      <form class="form" @submit.prevent="run(true)">
        <!-- 第一行：姓名 / 解读风格 / 性别 -->
        <label>
          姓名
          <input
            v-model="personName"
            class="w-name"
            maxlength="20"
            placeholder="选填，便于保存命例"
          />
        </label>
        <label>
          解读风格
          <select v-model="assertTone" class="w-tone" @change="() => run()">
            <option value="ming">命理综述</option>
            <option value="study">学习复盘</option>
            <option value="fun">轻松闲谈</option>
          </select>
        </label>
        <div class="pv-field">
          <span class="field-label">性别</span>
          <SelectButton
            v-model="gender"
            :options="genderOptions"
            optionLabel="label"
            optionValue="value"
            :allowEmpty="false"
            aria-label="性别"
          />
        </div>
        <template v-if="mode === 'solar'">
          <label>年 <input v-model.number="year" type="number" min="1900" max="2100" /></label>
          <label>月 <input v-model.number="month" type="number" min="1" max="12" /></label>
          <label>日 <input v-model.number="day" type="number" min="1" max="31" /></label>
        </template>
        <template v-else-if="mode === 'lunar'">
          <label>农历年 <input v-model.number="lunarYear" type="number" min="1900" max="2100" /></label>
          <label>
            农历月
            <select v-model.number="lunarMonth" class="w-month">
              <option v-for="opt in lunarMonthOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
          </label>
          <label>
            农历日
            <input v-model.number="lunarDay" type="number" min="1" :max="lunarDayMax" />
          </label>
        </template>
        <template v-if="mode === 'solar' || mode === 'lunar'">
          <!-- 时分单独占位，出生地整行下沉，避免与时辰挤在同一行错位 -->
          <label>
            时
            <input v-model.number="hour" type="number" min="0" max="23" :disabled="hourUnknown" />
          </label>
          <label>
            分
            <input v-model.number="minute" type="number" min="0" max="59" :disabled="hourUnknown" />
          </label>
          <div class="form-place-block">
            <div class="pv-field pv-place">
              <span class="field-label">出生地</span>
              <p class="field-hint">用于真太阳时校正，可按省市区选择或自定义经度</p>
              <BirthPlacePicker v-model="placeName" v-model:scope="placeScope" />
            </div>
            <label v-if="placeName === CUSTOM_PLACE_KEY">
              东经°
              <input
                v-model.number="customLongitude"
                class="w-lng"
                type="number"
                min="-180"
                max="180"
                step="0.01"
                title="东经填正数，西经填负数"
                placeholder="如 116.4"
              />
            </label>
          </div>
          <!-- 勾选项单独成行，避免和年月日挤在一起 -->
          <div class="form-checks">
            <label class="check">
              <input v-model="hourUnknown" type="checkbox" />
              时辰暂不清楚
            </label>
            <label
              class="check"
              title="有明确时辰时可勾选：按出生地经度差与均时差做校正"
            >
              <input v-model="useEot" type="checkbox" :disabled="hourUnknown" />
              参考真太阳时
            </label>
            <label
              class="check"
              title="有明确时辰时可勾选；国外可按当地当年是否实行夏令时选择"
            >
              <input v-model="daylightSaving" type="checkbox" :disabled="hourUnknown" />
              当时实行夏令时
            </label>
          </div>
          <div class="pv-field pv-cutover">
            <span class="field-label">日柱换日</span>
            <SelectButton
              v-model="dayCutover"
              :options="dayCutoverOptions"
              optionLabel="label"
              optionValue="value"
              :allowEmpty="false"
              aria-label="日柱换日口径"
              @update:model-value="() => mode !== 'manual' && run()"
            />
            <span class="soft cutover-hint">{{
              dayCutover === 'ziChu'
                ? '按子初：约 23:00 起可视为次日日柱'
                : '按子正：到次日 00:00 再换日柱'
            }}</span>
          </div>
        </template>
        <template v-else>
          <label>年柱 <input v-model="manualYear" class="w-pillar" maxlength="2" /></label>
          <label>月柱 <input v-model="manualMonth" class="w-pillar" maxlength="2" /></label>
          <label>日柱 <input v-model="manualDay" class="w-pillar" maxlength="2" /></label>
          <label>
            时柱
            <input
              v-model="manualHour"
              class="w-pillar"
              maxlength="2"
              placeholder="可不填"
            />
          </label>
        </template>
        <div class="form-actions">
          <button class="submit" type="submit">排盘</button>
          <button class="save-profile" type="button" @click="saveCurrentProfile">保存命例</button>
        </div>
        <p v-if="profileSaveMsg" class="soft save-msg">{{ profileSaveMsg }}</p>
      </form>
      <p v-if="error" class="err">{{ error }}</p>
    </div>

    <section v-if="chart && detail" id="bazi-chart" class="result section-anchor">
      <h2>{{ dayBrief }}</h2>
      <p v-if="chart.solar.year > 0" class="soft">
        公历 {{ chart.solar.year }}-{{ chart.solar.month }}-{{ chart.solar.day }}
        <template v-if="!chart.hourUnknown">
          {{ String(chart.solar.hour).padStart(2, '0') }}:{{ String(chart.solar.minute).padStart(2, '0') }}
        </template>
        <template v-else> 时辰未知</template>
        · 日空亡 {{ detail.dayKongWang.join('') }}
      </p>

      <div v-if="trendPack" class="metric-chips">
        <button
          type="button"
          class="metric-chip"
          :data-kind="strengthChipKind"
          @click="openMetric(trendPack.strengthEvidence, $event)"
        >
          <span class="chip-ico" aria-hidden="true">{{ strengthChipIco }}</span>
          <span class="chip-body">
            <em>强弱</em>
            {{ trendPack.strength }}（{{ trendPack.strengthScore }}）
          </span>
        </button>
        <button
          type="button"
          class="metric-chip"
          data-kind="useful"
          @click="openMetric(trendPack.usefulEvidence, $event)"
        >
          <span class="chip-ico" aria-hidden="true">喜</span>
          <span class="chip-body">
            <em>喜用</em>
            <span class="xi">喜{{ trendPack.useful.join('') }}</span>
            <span class="ji">忌{{ trendPack.avoid.join('') }}</span>
          </span>
        </button>
        <button
          type="button"
          class="metric-chip"
          data-kind="cong"
          @click="openMetric(trendPack.cong.evidence, $event)"
        >
          <span class="chip-ico" aria-hidden="true">从</span>
          <span class="chip-body">
            <em>格局</em>
            {{ trendPack.cong.kind }}{{ trendPack.cong.follow ? '·' + trendPack.cong.follow : '' }}
          </span>
        </button>
        <button
          type="button"
          class="metric-chip"
          data-kind="yun"
          @click="openMetric(trendPack.qiYunEvidence, $event)"
        >
          <span class="chip-ico" aria-hidden="true">运</span>
          <span class="chip-body">
            <em>起运</em>
            {{ trendPack.qiYunEvidence.value }}
          </span>
        </button>
      </div>
      <p class="soft chip-hint">点指标可看释义与本盘查法依据</p>

      <SelectButton
        v-model="resultTab"
        class="pv-seg result-tabs"
        :options="resultTabOptions"
        optionLabel="label"
        optionValue="value"
        :allowEmpty="false"
        aria-label="排盘结果视图"
      />

      <!-- 基本排盘表 -->
      <div v-show="resultTab === 'basic'" class="table-wrap">
        <table class="pan-table">
          <thead>
            <tr>
              <th class="row-lab"></th>
              <th v-for="p in detail.pillars" :key="p.label" class="col-lab">
                <span class="col-seal">{{ p.label }}</span>
                <span class="col-sub">柱</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th>主星</th>
              <td v-for="p in detail.pillars" :key="'m' + p.label">
                <span class="cell-soft">{{ p.mainStar }}</span>
              </td>
            </tr>
            <tr class="gan-row">
              <th>天干</th>
              <td v-for="p in detail.pillars" :key="'g' + p.label">
                <button
                  v-if="p.gan"
                  type="button"
                  class="gz-cell metric-link"
                  :style="{ color: colorGan(p.gan) }"
                  @click="openShiShenOfGan(p.gan, $event)"
                >
                  <WxGlyph :wx="ganWuXing(p.gan)" :size="18" />
                  <span class="gz-char">{{ p.gan }}</span>
                  <span class="wx-lab">{{ ganWuXing(p.gan) }}</span>
                </button>
                <span v-else class="muted">未知</span>
              </td>
            </tr>
            <tr class="zhi-row">
              <th>地支</th>
              <td v-for="p in detail.pillars" :key="'z' + p.label">
                <span v-if="p.zhi" class="gz-cell" :style="{ color: colorZhi(p.zhi) }">
                  <WxGlyph :wx="zhiWuXing(p.zhi)" :size="18" />
                  <span class="gz-char">{{ p.zhi }}</span>
                  <span class="wx-lab">{{ zhiWuXing(p.zhi) }}</span>
                </span>
                <span v-else class="muted">未知</span>
              </td>
            </tr>
            <tr class="cg-row">
              <th>藏干</th>
              <td v-for="p in detail.pillars" :key="'c' + p.label">
                <div v-if="p.canggan.length" class="cg-stack">
                  <div v-for="c in p.canggan" :key="c.gan + c.shiShen" class="cg">
                    <span class="cg-main">
                      <WxGlyph :wx="ganWuXing(c.gan)" :size="12" />
                      <span :style="{ color: colorGan(c.gan) }">{{ c.gan }}</span>
                    </span>
                    <span class="cg-role">{{ c.role }}</span>
                  </div>
                </div>
                <span v-else class="muted">—</span>
              </td>
            </tr>
            <tr class="sub-row">
              <th>副星</th>
              <td v-for="p in detail.pillars" :key="'s' + p.label">
                <div v-if="p.subStars.length" class="cg-stack">
                  <button
                    v-for="(s, i) in p.subStars"
                    :key="i"
                    type="button"
                    class="metric-link cg"
                    @click="openShiShenOfGan(p.canggan[i]?.gan, $event)"
                  >
                    {{ s }}
                  </button>
                </div>
                <span v-else class="muted">—</span>
              </td>
            </tr>
            <tr>
              <th>星运</th>
              <td v-for="p in detail.pillars" :key="'x' + p.label">
                <span class="cell-soft">{{ p.xingYun }}</span>
              </td>
            </tr>
            <tr>
              <th>自坐</th>
              <td v-for="p in detail.pillars" :key="'zz' + p.label">
                <span class="cell-soft">{{ p.ziZuo }}</span>
              </td>
            </tr>
            <tr>
              <th>空亡</th>
              <td v-for="p in detail.pillars" :key="'k' + p.label">
                <template v-if="!p.missing">
                  <span>{{ p.kongWangText }}</span>
                  <span v-if="p.kongWang" class="seal"> ·日空</span>
                </template>
                <span v-else class="muted">—</span>
              </td>
            </tr>
            <tr>
              <th>纳音</th>
              <td v-for="p in detail.pillars" :key="'n' + p.label">
                <span class="nayin">{{ p.naYin }}</span>
              </td>
            </tr>
            <tr class="sha-row">
              <th>神煞</th>
              <td v-for="p in detail.pillars" :key="'ss' + p.label" class="sha-cell">
                <div v-if="p.shenSha.length" class="sha-stack">
                  <button
                    v-for="n in p.shenSha"
                    :key="n"
                    type="button"
                    class="sha-chip"
                    :class="'tone-' + shenShaToneOf(n)"
                    :title="n + ' · ' + shenShaToneOf(n)"
                    @click="openShenShaByName(n, $event)"
                  >
                    <span class="sha-mark" aria-hidden="true">{{ shenShaToneOf(n) }}</span>
                    <span class="sha-name">{{ n }}</span>
                  </button>
                </div>
                <span v-else class="muted">—</span>
              </td>
            </tr>
          </tbody>
        </table>
        <p class="soft disc-line">{{ detail.qiYun }}</p>
      </div>

      <!-- 细盘页仍保留摘要条；完整日历在下方可点选 -->
      <div v-show="resultTab === 'pro'" class="pro-block">
        <p class="soft">点选大运、流年到月，见下方「大运 · 流年 · 流月」。选中时段会带进命师。</p>
      </div>

      <div class="notes">
        <p v-for="(n, i) in chart.notes" :key="i">{{ n }}</p>
      </div>

      <!-- 大运 / 流年 / 流月日历：点选后注入命师上下文 -->
      <div id="bazi-yun" class="block section-anchor yun-cal">
        <h2>大运 · 流年 · 流月</h2>
        <p class="soft">
          润色默认带近几年流年解读；点选某运/某年/某月只是加写焦点，不必追问才有流年。义理取三本书大意，不作原文照录。
        </p>
        <ul class="yun-books">
          <li v-for="b in YUN_BOOK_SUMMARIES" :key="b.id">
            <strong>《{{ b.title }}》</strong>
            {{ b.gist }}
          </li>
        </ul>
        <h3>大运</h3>
        <div class="strip yun-strip" role="list">
          <button
            v-for="(d, i) in yunResult?.steps ?? []"
            :key="d.gz + d.ageFrom"
            type="button"
            class="strip-item"
            :class="{ on: selectedYunIndex === i }"
            @click="selectYun(i)"
          >
            <span class="soft">{{ d.ageFrom }}–{{ d.ageTo }}岁</span>
            <strong>{{ d.gz }}</strong>
            <span>{{ d.startYear ? `${d.startYear}–${d.endYear}` : '岁数近似' }}</span>
          </button>
        </div>
        <p v-if="selectedYunHint" class="yun-hint">{{ selectedYunHint }}</p>
        <h3>流年</h3>
        <div class="strip yun-strip" role="list">
          <button
            v-for="y in liuNianYears"
            :key="y.year"
            type="button"
            class="strip-item"
            :class="['band-' + y.band, { on: selectedYearValue === y.year }]"
            @click="selectLiuNianYear(y.year)"
          >
            <span class="soft">{{ y.year }} · {{ y.age }}岁</span>
            <strong>{{ y.gz }}</strong>
            <span>{{ y.ganShiShen }} · {{ y.band }}</span>
          </button>
        </div>
        <p v-if="selectedLiuNian" class="yun-hint">{{ selectedLiuNian.hint }}</p>
        <h3 v-if="liuYueItems.length">流月（节令交月）</h3>
        <div v-if="liuYueItems.length" class="strip yun-strip" role="list">
          <button
            v-for="m in liuYueItems"
            :key="m.jie + m.startSolar"
            type="button"
            class="strip-item yue"
            :class="{ on: selectedYueIndex === m.index, jiao: m.jiaoYun, now: m.current }"
            @click="selectLiuYue(m.index)"
          >
            <span class="soft"
              >{{ m.jie }} · {{ m.startSolar.slice(5)
              }}{{ m.startHm !== '00:00' ? ' ' + m.startHm : '' }}</span
            >
            <strong>{{ m.gz }}</strong>
            <span>{{ m.zhi }}月 · {{ m.ganShiShen }}</span>
          </button>
        </div>
        <p v-if="selectedLiuYue" class="yun-hint">{{ selectedLiuYue.hint }}</p>
        <p class="soft">更完整的走势曲线见侧栏「走势」页。点选只论议题，不编造私人事件。</p>
      </div>

      <!-- 神煞总览 -->
      <div id="bazi-shensha" class="block section-anchor">
        <h2>神煞总览</h2>
        <p class="soft">每条均写明查法与本盘依据；象意仅作辅证，不得压过月令/格局/用神。</p>
        <ul v-if="shensha.length" class="sha-list">
          <li v-for="s in shensha" :key="s.name + s.zhi.join('')">
            <button type="button" class="sha-chip list" :class="'tone-' + s.tone" @click="openShenShaByName(s.name, $event)">
              <span class="sha-mark" aria-hidden="true">{{ s.tone }}</span>
              <span class="sha-name">{{ s.name }}</span>
              <span class="sha-loc">{{ s.zhi.join('') }} · {{ s.pillars.join('、') }}柱</span>
            </button>
            <span class="sha-rule">查法：{{ s.rule }}</span>
            <span class="sha-basis">本盘：{{ s.basis }}</span>
            <span class="soft">象意：{{ s.brief }}</span>
          </li>
        </ul>
        <p v-else class="soft">常用神煞表中未见命中。</p>
      </div>

      <!-- 规则断言 -->
      <div
        v-if="assertion"
        id="bazi-assert"
        class="block section-anchor"
        :class="{ fun: assertion.tone === 'fun' }"
      >
        <div class="block-head">
          <h2>{{ assertion.tone === 'fun' ? '娱乐断语' : assertion.tone === 'ming' ? '命理总断' : '规则断言' }}</h2>
          <div class="msg-actions" role="toolbar" aria-label="断言操作">
            <button
              type="button"
              class="icon-btn"
              title="有帮助"
              :class="{ on: assertFeedback === 'up' }"
              @click="setFeedback('assert', 'up')"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                <path
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.6"
                  d="M7 11v9H4v-9h3zm3 9h7.2a2 2 0 0 0 1.95-1.55l1.3-5.2A1.5 1.5 0 0 0 19 11h-5.2l.8-3.6A2 2 0 0 0 12.7 5L10 11v9z"
                />
              </svg>
            </button>
            <button
              type="button"
              class="icon-btn"
              title="没帮助"
              :class="{ on: assertFeedback === 'down' }"
              @click="setFeedback('assert', 'down')"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                <path
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.6"
                  d="M17 13V4h3v9h-3zm-3-9H6.8a2 2 0 0 0-1.95 1.55l-1.3 5.2A1.5 1.5 0 0 0 5 13h5.2l-.8 3.6A2 2 0 0 0 11.3 19L14 13V4z"
                />
              </svg>
            </button>
            <button type="button" class="icon-btn" title="重新生成" @click="regenerateAssertion">
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                <path
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linecap="round"
                  d="M4.5 12a7.5 7.5 0 0 1 12.7-5.4M19.5 12a7.5 7.5 0 0 1-12.7 5.4M16 4.5h4.2V8.7M8 19.5H3.8V15.3"
                />
              </svg>
            </button>
            <button
              type="button"
              class="icon-btn"
              :title="copyToast === 'assert' ? '已复制' : '复制'"
              @click="copyContent(formatAssertionPlain(assertion), 'assert')"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                <rect
                  x="8"
                  y="8"
                  width="11"
                  height="11"
                  rx="1.5"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.6"
                />
                <path
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.6"
                  d="M6 15H5a1.5 1.5 0 0 1-1.5-1.5v-9A1.5 1.5 0 0 1 5 3h9A1.5 1.5 0 0 1 15.5 4.5V6"
                />
              </svg>
            </button>
            <span v-if="copyToast === 'assert'" class="copy-tip">已复制</span>
          </div>
        </div>
        <p class="lead">{{ assertion.headline }}</p>
        <ul class="assert-list">
          <li v-for="(it, i) in assertion.items" :key="i">
            <span class="cat">{{ it.category }}</span>
            {{ it.text }}
            <small>{{ it.basis }}</small>
          </li>
        </ul>
        <p class="disc">{{ assertion.disclaimer }}</p>
      </div>

      <!-- 十二时辰对照 -->
      <div v-if="hourVariants.length" id="bazi-hours" class="block section-anchor">
        <h2>十二时辰对照</h2>
        <p class="soft">同一日主下十二时柱；看十神差异，哪些断语会随时间变。</p>
        <div class="variants">
          <article v-for="v in hourVariants" :key="v.zhi" class="var-item">
            <strong>{{ v.zhi }}时</strong>
            <span class="gz-sm">{{ v.pillar.gz }}</span>
            <span>{{ v.pillar.ganShiShen }}</span>
            <span class="soft">约 {{ v.clockHour }} 点</span>
          </article>
        </div>
      </div>

      <details class="brief">
        <summary>十神速查</summary>
        <ul>
          <li v-for="(text, name) in SHISHEN_BRIEF" :key="name">
            <button
              type="button"
              class="metric-link"
              @click="
                openMetric(
                  makeEvidence({
                    id: 'gloss.' + name,
                    value: String(name),
                    rule: '十神概念表',
                    basis: '未绑定本盘柱位，仅概念释义',
                    gloss: text
                  }),
                  $event
                )
              "
            >
              <strong>{{ name }}</strong>
            </button>
            — {{ text }}
          </li>
        </ul>
      </details>
    </section>

    <MetricExplainPopover
      :evidence="metricEvidence"
      :anchor="metricAnchor"
      @close="closeMetric"
    />

      <!-- 悬浮命师助手：润色 + 本盘追问（大模型配置在独立菜单） -->
      <Teleport to="body">
        <button
          v-show="assistUiVisible"
          type="button"
          class="ai-fab"
          :class="{ open: aiAssistantOpen, busy: aiLoading || consultLoading }"
          :disabled="!assertion"
          :title="assertion ? '打开命师助手' : '请先完成排盘'"
          aria-label="命师助手"
          @click="toggleAiAssistant()"
        >
          <WhalePet
            :open="aiAssistantOpen"
            :busy="aiLoading || consultLoading"
            :disabled="!assertion"
            label="命师"
          />
        </button>

        <!-- 遮罩不拦截滚轮/点击，背后排盘仍可滑动；关助手用面板上的关闭 -->
        <div v-if="aiAssistantOpen && assistUiVisible" class="ai-assist-mask" aria-hidden="true" />

        <aside
          v-if="aiAssistantOpen && assistUiVisible"
          class="ai-assist"
          :class="{ dragging: assistDragging }"
          :style="assistDragStyle"
          role="dialog"
          aria-label="命师助手"
          @keydown.esc="toggleAiAssistant(false)"
        >
          <header
            class="ai-assist-head"
            title="拖动可移动窗口"
            @pointerdown="onAssistPointerDown"
            @mousedown="onAssistPointerDown"
          >
            <div class="ai-assist-titles">
              <h2>命师助手</h2>
              <p>润色 / 推断 · 本盘追问 · 可拖动</p>
            </div>
            <div class="ai-assist-tools">
              <button type="button" class="icon-btn" title="关闭" aria-label="关闭" @click="toggleAiAssistant(false)">
                ×
              </button>
            </div>
          </header>

          <div class="ai-assist-body">
            <p v-if="!aiConfigured" class="ai-assist-banner">
              尚未配置大模型接口，请到侧栏「大模型」页填写。
            </p>

            <div class="form ai-form">
              <label>
                润色口风
                <select v-model="aiSettings.polishTone" class="w-tone" @change="persistAi">
                  <option value="ming">命理总批</option>
                  <option value="study">正经复盘</option>
                  <option value="fun">轻松戏说</option>
                </select>
              </label>
              <label class="check ai-plain-check" title="润色与推断共用：勾选后每段先「白话：」再「术语：」，才能切换白话总批">
                <input v-model="aiSettings.includePlainTalk" type="checkbox" @change="persistAi" />
                自带白话
              </label>
              <div class="ai-form-actions">
                <button
                  type="button"
                  class="submit"
                  :disabled="aiLoading || !assertion || !aiConfigured"
                  @click="runAiPolish"
                >
                  {{
                    polishThinking && aiTaskMode === 'polish'
                      ? '思考中…'
                      : aiLoading && !aiPlainLoading && aiTaskMode === 'polish'
                        ? '润色中…'
                        : 'AI 润色'
                  }}
                </button>
                <button
                  type="button"
                  class="submit infer"
                  :disabled="aiLoading || !assertion || !aiConfigured"
                  @click="runAiInfer"
                >
                  {{
                    polishThinking && aiTaskMode === 'infer'
                      ? '思考中…'
                      : aiLoading && !aiPlainLoading && aiTaskMode === 'infer'
                        ? '推断中…'
                        : 'AI 推断'
                  }}
                </button>
                <button
                  type="button"
                  class="chip"
                  :disabled="aiLoading || !(aiTextClassic || aiText) || !aiConfigured"
                  @click="runAiPlainTalk"
                >
                  {{ aiPlainLoading ? '翻译中…' : '译成白话' }}
                </button>
              </div>
            </div>
            <p v-if="aiError" class="err">{{ aiError }}</p>

            <div v-if="aiText || aiLoading" class="ai-out-wrap">
              <div v-if="aiTextClassic || aiTextPlain" class="ai-view-tabs">
                <SelectButton
                  v-model="aiViewMode"
                  :options="aiViewOptions"
                  optionLabel="label"
                  optionValue="value"
                  optionDisabled="disabled"
                  :allowEmpty="false"
                  aria-label="润色查看层"
                />
              </div>
              <div class="msg-actions ai-actions" role="toolbar" aria-label="AI 润色操作">
                <button
                  type="button"
                  class="icon-btn"
                  title="有帮助"
                  :disabled="aiLoading || !aiText"
                  :class="{ on: aiFeedback === 'up' }"
                  @click="setFeedback('ai', 'up')"
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                    <path
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.6"
                      d="M7 11v9H4v-9h3zm3 9h7.2a2 2 0 0 0 1.95-1.55l1.3-5.2A1.5 1.5 0 0 0 19 11h-5.2l.8-3.6A2 2 0 0 0 12.7 5L10 11v9z"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  class="icon-btn"
                  title="没帮助"
                  :disabled="aiLoading || !aiText"
                  :class="{ on: aiFeedback === 'down' }"
                  @click="setFeedback('ai', 'down')"
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                    <path
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.6"
                      d="M17 13V4h3v9h-3zm-3-9H6.8a2 2 0 0 0-1.95 1.55l-1.3 5.2A1.5 1.5 0 0 0 5 13h5.2l-.8 3.6A2 2 0 0 0 11.3 19L14 13V4z"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  class="icon-btn"
                  title="重新生成"
                  :disabled="aiLoading || !assertion || !aiConfigured"
                  @click="regenerateAi"
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                    <path
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.6"
                      stroke-linecap="round"
                      d="M4.5 12a7.5 7.5 0 0 1 12.7-5.4M19.5 12a7.5 7.5 0 0 1-12.7 5.4M16 4.5h4.2V8.7M8 19.5H3.8V15.3"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  class="icon-btn"
                  :title="copyToast === 'ai' ? '已复制' : '复制'"
                  :disabled="!aiText"
                  @click="copyContent(aiCopyText, 'ai')"
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                    <rect
                      x="8"
                      y="8"
                      width="11"
                      height="11"
                      rx="1.5"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.6"
                    />
                    <path
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.6"
                      d="M6 15H5a1.5 1.5 0 0 1-1.5-1.5v-9A1.5 1.5 0 0 1 5 3h9A1.5 1.5 0 0 1 15.5 4.5V6"
                    />
                  </svg>
                </button>
                <span v-if="copyToast === 'ai'" class="copy-tip">已复制</span>
              </div>
              <div v-if="polishThinking" class="think-box polish-think" aria-live="polite" aria-busy="true">
                <div class="think-row">
                  <span class="think-dots" aria-hidden="true">
                    <i /><i /><i />
                  </span>
                  <p class="think-label">{{ polishThinkLabel }}</p>
                </div>
                <p class="think-hint">
                  {{ aiTaskMode === 'infer' ? '正在延伸推断，请稍候…' : '正在组织总批，请稍候…' }}
                </p>
              </div>
              <div v-else-if="!aiLoading && aiShowMode === 'plain' && polishLayers.sections.some((s) => s.plain)" class="ai-layers">
                <article v-for="sec in polishLayers.sections.filter((s) => s.plain)" :key="'p' + sec.title" class="ai-sec">
                  <h3>{{ sec.title }}</h3>
                  <div class="md-body" v-html="mdHtml(sec.plain, true)" />
                </article>
              </div>
              <div v-else-if="!aiLoading && aiShowMode === 'jargon' && polishLayers.sections.some((s) => s.jargon)" class="ai-layers">
                <article v-for="sec in polishLayers.sections.filter((s) => s.jargon)" :key="'j' + sec.title" class="ai-sec jargon">
                  <h3>{{ sec.title }}</h3>
                  <div class="md-body" v-html="mdHtml(sec.jargon)" />
                </article>
              </div>
              <div v-else class="ai-out md-body" v-html="aiOutHtml" />
            </div>

            <div v-if="assertion" class="consult">
              <h3>本盘追问</h3>
              <p class="soft">命师带着当前四柱、用神和总批/推断回答；换盘清空对话，同盘记忆保存在本机。</p>
              <SelectButton
                v-model="consultAgent"
                class="consult-agents"
                :options="MING_AGENT_OPTIONS"
                optionLabel="label"
                optionValue="id"
                :allowEmpty="false"
                aria-label="命师席位"
              />
              <ul class="consult-log">
                <li v-for="(m, i) in consultMessages" :key="i" :class="m.role">
                  <span class="who">{{ m.role === 'user' ? '问' : '断' }}</span>
                  <div class="md-body" v-html="m.role === 'assistant' ? mdHtml(m.text, true) : mdHtml(m.text)" />
                </li>
                <li v-if="consultThinking" class="assistant thinking" aria-live="polite" aria-busy="true">
                  <span class="who">断</span>
                  <div class="think-box">
                    <div class="think-row">
                      <span class="think-dots" aria-hidden="true">
                        <i /><i /><i />
                      </span>
                      <p class="think-label">{{ consultThinkLabel }}</p>
                    </div>
                    <p class="think-hint">正在组织断语，请稍候…</p>
                  </div>
                </li>
                <li v-else-if="consultStream" class="assistant">
                  <span class="who">断</span>
                  <div class="md-body" v-html="consultStreamHtml" />
                </li>
              </ul>
              <form class="consult-form" @submit.prevent="runConsultAsk">
                <input
                  v-model="consultDraft"
                  maxlength="200"
                  placeholder="例如：为什么身弱就不宜早婚？"
                  :disabled="consultLoading || !aiConfigured"
                />
                <button
                  type="submit"
                  class="submit"
                  :disabled="consultLoading || !consultDraft.trim() || !aiConfigured"
                >
                  {{ consultLoading ? (consultThinking ? '思考中…' : '断语生成中…') : '追问' }}
                </button>
              </form>
            </div>
          </div>
        </aside>
      </Teleport>

  </div>
</template>

<style scoped>
.head h1 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 2rem;
  letter-spacing: 0.08em;
}
.head p {
  margin: 8px 0 0;
  color: var(--ink-soft);
  max-width: 40em;
  line-height: 1.6;
}
.page-nav {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  flex-wrap: nowrap;
  gap: 6px;
  margin: 14px 0 4px;
  padding: 8px 2px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
  /* 实底，避免滚动时正文透出造成「挡字」错觉 */
  background: var(--surface-solid);
  border-bottom: 1px solid var(--line);
}
.page-nav-item {
  flex: 0 0 auto;
  border: 1px solid var(--line);
  background: var(--surface-strong);
  color: var(--ink-soft);
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 0.8rem;
  cursor: pointer;
}
.page-nav-item:hover {
  color: var(--ink);
  border-color: var(--teal);
}
.section-anchor {
  scroll-margin-top: 52px;
}
.panel {
  margin-top: 22px;
  padding: 18px 20px;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: var(--surface-solid);
  box-shadow: 0 8px 24px color-mix(in srgb, var(--ink) 6%, transparent);
}
.pv-seg {
  margin-bottom: 14px;
  flex-wrap: wrap;
}
.form {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 14px;
  align-items: flex-end;
}
.form-checks {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 18px;
  width: 100%;
  min-height: 38px;
  padding: 2px 0;
}
/** 出生地整行：桌面/移动均落在时辰行下方，不与时/分并排 */
.form-place-block {
  flex: 1 1 100%;
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  gap: 12px 14px;
  align-items: flex-end;
}
.form-actions {
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  justify-content: flex-start;
  padding-top: 4px;
}
.profile-bar {
  margin: 0 0 12px;
}
.profile-pick {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.85rem;
  max-width: 280px;
}
.profile-pick select {
  min-height: var(--touch-min);
  padding: 6px 10px;
  border-radius: 10px;
  border: 1px solid var(--line);
  background: var(--input-bg);
  color: var(--ink);
}
.cutover-hint {
  display: block;
  margin-top: 6px;
  font-size: 0.78rem;
}

.save-profile {
  padding: 10px 18px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: transparent;
  cursor: pointer;
  font-size: 0.92rem;
}

.save-profile:hover {
  border-color: var(--teal);
  color: var(--teal);
}

.save-msg {
  margin: 8px 0 0;
  font-size: 0.88rem;
}
.pv-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.8rem;
  color: var(--ink-soft);
}
.field-label {
  line-height: 1.2;
}
/** 出生地等字段的引导说明，中性语气 */
.field-hint {
  margin: 0;
  font-size: 0.72rem;
  line-height: 1.35;
  color: var(--muted);
}
.pv-place-scope {
  flex: 0 0 auto;
}
.pv-place-scope :deep(.p-selectbutton) {
  flex-wrap: nowrap;
}
.pv-place {
  flex: 1 1 100%;
  width: 100%;
  min-width: 0;
}
.pv-place :deep(.place-picker) {
  width: 100%;
  max-width: 100%;
}
.pv-cutover {
  flex: 1 1 100%;
  width: 100%;
}
.form > label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.8rem;
  color: var(--ink-soft);
}
.form input,
.form select {
  width: 88px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--line);
  background: var(--input-bg);
  color: var(--ink);
}
.form input.w-name {
  width: 108px;
}
.form input.w-pillar {
  width: 72px;
}
.form input.w-lng {
  width: 96px;
}
.form select.w-tone,
.form select.w-month {
  width: auto;
  min-width: 128px;
}
.form input[type='checkbox'] {
  width: auto;
}
.submit {
  padding: 10px 18px;
  border: none;
  border-radius: 999px;
  background: var(--ink);
  color: var(--on-accent);
}
.submit:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
/** 推断按钮：描边样式，与润色主按钮区分 */
.submit.infer {
  background: transparent;
  color: var(--seal);
  border: 1px solid var(--seal);
}
label.check {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  padding-bottom: 0;
  min-height: 38px;
  font-size: 0.8rem;
  color: var(--ink-soft);
}
.err {
  color: var(--seal);
  margin: 10px 0 0;
}
.result {
  margin-top: 22px;
}
.result h2,
.block h2 {
  font-family: var(--font-display);
  font-size: 1.25rem;
  color: var(--teal);
  margin: 0 0 10px;
}
.result-tabs {
  margin: 14px 0;
}
.table-wrap {
  overflow-x: auto;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: var(--surface-solid);
  box-shadow: 0 10px 28px color-mix(in srgb, var(--ink) 7%, transparent);
}
.pan-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  min-width: 620px;
  font-size: 0.9rem;
}
.pan-table th,
.pan-table td {
  border-bottom: 1px solid var(--line);
  padding: 12px 10px;
  text-align: center;
  vertical-align: middle;
}
.pan-table tbody tr:last-child th,
.pan-table tbody tr:last-child td {
  border-bottom: none;
}
.pan-table thead th {
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--teal) 14%, var(--surface-solid)),
    color-mix(in srgb, var(--teal) 6%, var(--surface-solid))
  );
  font-family: var(--font-display);
  padding: 14px 10px;
}
.pan-table thead th.row-lab {
  background: transparent;
}
/**
 * 表头「年/月/日/时」必须保持 table-cell，禁止对 th 设 display:flex，
 * 否则四柱会掉出表格列模型、变成竖向叠排。
 */
.col-lab {
  text-align: center;
  vertical-align: middle;
}
.col-seal {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  margin: 0 auto 2px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--teal) 18%, transparent);
  color: var(--teal);
  font-size: 0.95rem;
  font-weight: 700;
}
.col-sub {
  display: block;
  font-size: 0.72rem;
  letter-spacing: 0.16em;
  color: var(--ink-soft);
  font-family: var(--font-ui);
  font-weight: 500;
}
.pan-table tbody th {
  text-align: left;
  width: 4.8em;
  color: var(--ink-soft);
  font-weight: 600;
  background: color-mix(in srgb, var(--surface) 70%, var(--surface-solid));
  letter-spacing: 0.08em;
  font-size: 0.82rem;
}
.pan-table tbody tr:nth-child(even) td {
  background: color-mix(in srgb, var(--teal) 3%, transparent);
}
.pan-table .gan-row td,
.pan-table .zhi-row td {
  padding-top: 14px;
  padding-bottom: 14px;
  background: color-mix(in srgb, var(--gold) 4%, transparent);
}
.gz-cell {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
  min-width: 0;
  min-height: 0;
  font: inherit;
}
span.gz-cell {
  cursor: default;
}
.gz-char {
  font-family: var(--font-display);
  font-size: 1.7rem;
  letter-spacing: 0.06em;
  font-weight: 700;
  line-height: 1;
}
.wx-lab {
  font-size: 0.68rem;
  letter-spacing: 0.14em;
  opacity: 0.75;
  font-family: var(--font-ui);
  font-weight: 600;
}
.cell-soft {
  color: var(--ink-soft);
}
.nayin {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--gold) 12%, transparent);
  color: var(--ink);
  font-size: 0.82rem;
}
.cg-stack {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 6px;
  padding: 2px 0;
}
.cg-main {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.cg {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  font-size: 0.82rem;
  line-height: 1.35;
  color: var(--ink-soft);
  margin: 0;
  padding: 6px 4px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--surface) 55%, transparent);
}
.cg + .cg {
  margin-top: 6px;
}
td .cg.metric-link {
  width: 100%;
  border: 1px solid transparent;
  background: color-mix(in srgb, var(--teal) 6%, transparent);
  cursor: pointer;
  font: inherit;
  color: var(--ink-soft);
}
td .cg.metric-link + .cg.metric-link {
  margin-top: 6px;
}
.cg-role {
  margin-left: 0;
  font-size: 0.68rem;
  color: var(--muted);
  letter-spacing: 0.06em;
}
.sha-cell {
  text-align: left;
  vertical-align: top;
  padding: 10px 8px !important;
}
.sha-stack {
  display: flex;
  flex-direction: column;
  gap: 5px;
  align-items: stretch;
}
.sha-chip {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 6px;
  margin: 0;
  padding: 5px 8px 5px 5px;
  border-radius: 10px;
  border: 1px solid var(--line);
  background: var(--surface-strong);
  cursor: pointer;
  text-align: left;
  font: inherit;
  min-height: 0;
  min-width: 0;
  transition: border-color 0.15s ease, transform 0.15s ease;
}
.sha-chip:hover {
  transform: translateY(-1px);
  border-color: color-mix(in srgb, var(--teal) 40%, var(--line));
}
.sha-mark {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 7px;
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0;
  color: var(--on-accent);
  background: var(--muted);
}
.sha-name {
  font-size: 0.78rem;
  color: var(--ink);
  line-height: 1.25;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sha-chip.tone-吉 {
  border-color: color-mix(in srgb, var(--teal) 35%, var(--line));
  background: color-mix(in srgb, var(--teal) 10%, var(--surface-strong));
}
.sha-chip.tone-吉 .sha-mark {
  background: var(--teal);
}
.sha-chip.tone-慎 {
  border-color: color-mix(in srgb, var(--seal) 35%, var(--line));
  background: color-mix(in srgb, var(--seal) 10%, var(--surface-strong));
}
.sha-chip.tone-慎 .sha-mark {
  background: var(--seal);
}
.sha-chip.tone-中 {
  border-color: color-mix(in srgb, var(--gold) 35%, var(--line));
  background: color-mix(in srgb, var(--gold) 10%, var(--surface-strong));
}
.sha-chip.tone-中 .sha-mark {
  background: var(--gold);
  color: var(--on-deep);
}
/* 兼容旧 class，避免别处残留 */
.sha-tag {
  display: none;
}
.pan-table .big {
  font-family: var(--font-display);
  font-size: 1.65rem;
  letter-spacing: 0.08em;
  font-weight: 600;
}
.seal {
  color: var(--seal);
  font-weight: 700;
}
.muted {
  color: var(--muted);
}
.disc-line {
  padding: 10px 12px;
  margin: 0;
}
.pro-block h3 {
  margin: 14px 0 8px;
  font-family: var(--font-display);
  font-size: 1.05rem;
  color: var(--teal);
}
.strip {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 6px;
}
.strip-item {
  flex: 0 0 auto;
  min-width: 88px;
  padding: 10px;
  background: var(--surface-strong);
  border: 1px solid var(--line);
  border-top: 2px solid var(--teal);
  display: grid;
  gap: 2px;
  font-size: 0.8rem;
  color: inherit;
  text-align: left;
  cursor: default;
}
button.strip-item {
  cursor: pointer;
  font: inherit;
}
button.strip-item.on {
  border-color: var(--teal);
  background: color-mix(in srgb, var(--teal) 18%, var(--surface-strong));
}
button.strip-item.band-喜 {
  border-top: 3px solid var(--metric-xi);
  background: color-mix(in srgb, var(--metric-xi) 8%, var(--surface-strong));
}
button.strip-item.band-忌 {
  border-top: 3px solid var(--metric-ji);
  background: color-mix(in srgb, var(--metric-ji) 8%, var(--surface-strong));
}
button.strip-item.band-平 {
  border-top: 3px solid var(--metric-cong);
  background: color-mix(in srgb, var(--metric-cong) 8%, var(--surface-strong));
}
/** 交节三日窗口 */
button.strip-item.jiao {
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--gold) 55%, transparent);
}
/** 对照日落在本流月 */
button.strip-item.now:not(.on) {
  border-top-color: var(--gold);
}
.yun-cal h3 {
  margin: 14px 0 8px;
  font-family: var(--font-display);
  font-size: 1.05rem;
  color: var(--teal);
}
.yun-books {
  margin: 0 0 12px;
  padding-left: 1.15em;
  color: var(--ink-soft);
  line-height: 1.65;
  font-size: 0.86rem;
}
.yun-hint {
  margin: 8px 0 0;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--surface);
  color: var(--ink-soft);
  font-size: 0.86rem;
  line-height: 1.55;
}
.md-body {
  white-space: normal;
  word-break: break-word;
  line-height: 1.65;
}
.md-body :deep(strong),
.md-body :deep(.md-em) {
  color: var(--teal);
  font-weight: 700;
  background: color-mix(in srgb, var(--teal) 12%, transparent);
  padding: 0 0.2em;
  border-radius: 4px;
}
.md-body :deep(.md-h2) {
  display: block;
  margin: 0.75em 0 0.28em;
  padding: 0.32em 0.65em;
  border-left: 4px solid var(--teal);
  border-radius: 0 10px 10px 0;
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--teal) 18%, var(--surface-solid)),
    color-mix(in srgb, var(--teal) 6%, transparent)
  );
  color: var(--ink);
  font-family: var(--font-display);
  font-size: 1.08rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  line-height: 1.35;
}
.md-body :deep(.md-h2:first-child) {
  margin-top: 0;
}
.strip-item strong {
  font-family: var(--font-display);
  font-size: 1.2rem;
  letter-spacing: 0.06em;
}
.block {
  margin-top: 22px;
}
.block.fun {
  padding: 14px 16px;
  border-radius: 12px;
  background: rgba(181, 64, 42, 0.06);
  border-left: 3px solid var(--seal);
}
.block.fun .lead {
  color: var(--seal);
}
.pillars {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-top: 12px;
}
.pillar {
  padding: 14px;
  border-top: 3px solid var(--teal);
  background: var(--surface-strong);
}
.pillar h3 {
  margin: 0;
  font-size: 0.85rem;
  color: var(--ink-soft);
  font-weight: 600;
}
.gz {
  margin: 8px 0 4px;
  font-family: var(--font-display);
  font-size: 1.8rem;
  letter-spacing: 0.12em;
}
.gz.unknown {
  color: var(--ink-soft);
  font-size: 1.4rem;
}
.ss {
  margin: 0;
  color: var(--seal);
  font-size: 0.95rem;
}
.pillar ul {
  margin: 10px 0 0;
  padding: 0;
  list-style: none;
  font-size: 0.8rem;
  color: var(--ink-soft);
  line-height: 1.6;
}
.notes,
.soft,
.disc {
  color: var(--ink-soft);
  line-height: 1.7;
  font-size: 0.92rem;
}
.sha-list,
.assert-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 10px;
}
.sha-list li,
.assert-list li {
  display: grid;
  gap: 4px;
  padding: 12px 0;
  border-bottom: 1px solid var(--line);
  color: var(--ink-soft);
  line-height: 1.55;
  font-size: 0.92rem;
}
.sha-chip.list {
  grid-template-columns: auto 1fr auto;
  width: 100%;
  box-sizing: border-box;
}
.sha-loc {
  font-size: 0.72rem;
  color: var(--ink-soft);
  letter-spacing: 0.04em;
}
.sha-rule,
.sha-basis {
  font-size: 0.86rem;
  color: var(--ink);
}
.metric-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 10px 0 4px;
}
.metric-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--line);
  background: var(--surface-solid);
  border-radius: 14px;
  padding: 8px 12px 8px 8px;
  cursor: pointer;
  font-size: 0.88rem;
  color: var(--ink);
  text-align: left;
  box-shadow: 0 1px 0 color-mix(in srgb, var(--ink) 6%, transparent);
  transition: border-color 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease;
}
.metric-chip:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow);
}
.chip-ico {
  flex: 0 0 auto;
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  font-family: var(--font-display);
  font-size: 0.82rem;
  letter-spacing: 0;
  color: var(--on-accent);
  background: var(--teal);
}
.chip-body {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 6px;
  line-height: 1.25;
}
.chip-body em {
  font-style: normal;
  font-size: 0.68rem;
  letter-spacing: 0.12em;
  color: var(--muted);
  width: 100%;
}
.chip-body .xi {
  color: var(--metric-xi);
  font-weight: 600;
}
.chip-body .ji {
  color: var(--metric-ji);
  font-weight: 600;
}
.metric-chip[data-kind='strong'] {
  border-color: color-mix(in srgb, var(--metric-strong) 45%, var(--line));
  box-shadow: inset 3px 0 0 var(--metric-strong);
}
.metric-chip[data-kind='strong'] .chip-ico {
  background: var(--metric-strong);
}
.metric-chip[data-kind='weak'] {
  border-color: color-mix(in srgb, var(--metric-weak) 45%, var(--line));
  box-shadow: inset 3px 0 0 var(--metric-weak);
}
.metric-chip[data-kind='weak'] .chip-ico {
  background: var(--metric-weak);
}
.metric-chip[data-kind='mid'] {
  border-color: color-mix(in srgb, var(--metric-mid) 45%, var(--line));
  box-shadow: inset 3px 0 0 var(--metric-mid);
}
.metric-chip[data-kind='mid'] .chip-ico {
  background: var(--metric-mid);
}
.metric-chip[data-kind='useful'] {
  border-color: color-mix(in srgb, var(--metric-xi) 40%, var(--line));
  box-shadow: inset 3px 0 0 var(--metric-xi);
}
.metric-chip[data-kind='useful'] .chip-ico {
  background: linear-gradient(135deg, var(--metric-xi), var(--metric-ji));
}
.metric-chip[data-kind='cong'] {
  border-color: color-mix(in srgb, var(--metric-cong) 45%, var(--line));
  box-shadow: inset 3px 0 0 var(--metric-cong);
}
.metric-chip[data-kind='cong'] .chip-ico {
  background: var(--metric-cong);
  color: var(--on-deep);
}
.metric-chip[data-kind='yun'] {
  border-color: color-mix(in srgb, var(--metric-yun) 45%, var(--line));
  box-shadow: inset 3px 0 0 var(--metric-yun);
}
.metric-chip[data-kind='yun'] .chip-ico {
  background: var(--metric-yun);
}
.chip-hint {
  margin: 0 0 10px;
  font-size: 0.82rem;
}
button.metric-link {
  border: none;
  background: none;
  padding: 0;
  margin: 0;
  cursor: pointer;
  text-decoration: underline;
  text-decoration-style: dotted;
  text-underline-offset: 3px;
  color: inherit;
  font: inherit;
}
button.metric-link.big {
  font-size: inherit;
}
.tone-吉 {
  color: var(--teal);
}
.tone-慎 {
  color: var(--seal);
}
.tone-中 {
  color: var(--gold);
}
.cat {
  display: inline-block;
  width: fit-content;
  padding: 0 8px;
  border-radius: 999px;
  font-size: 0.72rem;
  background: color-mix(in srgb, var(--teal) 12%, transparent);
  color: var(--teal);
  margin-bottom: 2px;
}
.assert-list small {
  color: var(--muted);
  font-size: 0.75rem;
}
.lead {
  font-family: var(--font-display);
  font-size: 1.1rem;
  margin: 0 0 10px;
}
.variants {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 8px;
}
.var-item {
  padding: 10px;
  background: var(--surface-strong);
  border-top: 2px solid var(--line);
  display: grid;
  gap: 2px;
  font-size: 0.82rem;
}
.gz-sm {
  font-family: var(--font-display);
  font-size: 1.15rem;
  letter-spacing: 0.08em;
}
/* 命师入口：贴右侧，叠在「回顶部」按钮上方 */
.ai-fab {
  position: fixed;
  right: 18px;
  left: auto;
  bottom: calc(
    var(--dock-back-top-bottom) + var(--dock-back-top-height) + var(--dock-fab-gap) +
      env(safe-area-inset-bottom, 0px)
  );
  z-index: 55;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  border-radius: 20px;
  overflow: visible;
  background: transparent;
  color: var(--ink);
  box-shadow: none;
  cursor: pointer;
}
.ai-fab:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.ai-fab:not(:disabled):hover {
  transform: translateY(-3px);
}
/* 大窗已开时隐藏入口，避免挡阅读区（面板内有关闭） */
.ai-fab.open {
  display: none;
}
/* 仅做淡化，不挡指针：滚轮和点击落到背后主区 */
.ai-assist-mask {
  position: fixed;
  inset: 0;
  z-index: 56;
  pointer-events: none;
  background: rgba(20, 35, 28, 0.08);
}
html[data-theme='dark'] .ai-assist-mask {
  background: rgba(0, 0, 0, 0.28);
}
/* 约 66vw × 70vh，仍可拖拽；遮罩不挡背后滚动 */
.ai-assist {
  position: fixed;
  right: 20px;
  bottom: calc(16px + env(safe-area-inset-bottom, 0px));
  top: auto;
  left: auto;
  z-index: 57;
  display: flex;
  flex-direction: column;
  width: 66vw;
  height: 70vh;
  max-width: calc(100vw - 32px);
  max-height: calc(100vh - 32px);
  border: 1px solid var(--line);
  border-radius: 16px;
  background: var(--surface-solid);
  box-shadow: var(--shadow);
  overflow: hidden;
  pointer-events: auto;
}
.ai-assist-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--line);
  background: var(--surface-strong);
  cursor: grab;
  touch-action: none;
  user-select: none;
}
.ai-assist-titles {
  min-width: 0;
  flex: 1;
}
.ai-assist-tools {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
}
.ai-assist.dragging .ai-assist-head {
  cursor: grabbing;
}
.ai-assist-head .icon-btn {
  cursor: pointer;
}
.ai-assist-head h2 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.1rem;
  color: var(--teal);
}
.ai-assist-head p {
  margin: 4px 0 0;
  font-size: 0.78rem;
  color: var(--ink-soft);
}
.ai-balance {
  margin: 0;
  font-size: 0.75rem;
  color: var(--teal);
  max-width: 160px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ai-balance.err {
  color: var(--seal);
}
.bal-btn {
  margin-top: 0;
}
.ai-assist-body {
  flex: 1;
  min-height: 0;
  padding: 14px 18px 20px;
  overflow: auto;
}
.ai-assist-banner {
  margin: 0 0 10px;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(181, 64, 42, 0.08);
  color: var(--seal);
  font-size: 0.88rem;
}
.ai-assist-banner a,
.ai-assist-meta a {
  color: var(--teal);
  text-decoration: underline;
}
.ai-assist-meta {
  margin: 0 0 10px;
  font-size: 0.82rem;
}
.chip {
  border: 1px solid var(--line);
  background: var(--surface-strong);
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 0.8rem;
  color: var(--ink-soft);
}
.chip.on {
  border-color: var(--teal);
  color: var(--ink);
  background: color-mix(in srgb, var(--teal) 14%, var(--surface-strong));
}
.chip:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.ai-form {
  display: grid;
  grid-template-columns: minmax(160px, 1fr) auto;
  gap: 10px 16px;
  align-items: end;
  margin-bottom: 8px;
}
.ai-form > label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.8rem;
  color: var(--ink-soft);
}
.ai-form .check {
  min-height: 38px;
  padding-bottom: 2px;
}
.ai-form-actions {
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.ai-view-tabs {
  margin-bottom: 8px;
}
.ai-view-tabs :deep(.p-selectbutton) {
  flex-wrap: wrap;
}
.ai-out-wrap {
  margin-top: 12px;
}
.ai-actions {
  justify-content: flex-end;
  margin-bottom: 6px;
}
.ai-out {
  margin-top: 0;
  padding: 14px 16px;
  background: var(--surface-strong);
  border-left: 3px solid var(--teal);
  font-size: 0.95rem;
  line-height: 1.75;
  color: var(--ink-soft);
  white-space: pre-wrap;
  word-break: break-word;
}
/* 白话 / 术语拆层：每段独立卡片，避免混在同一段 */
.ai-layers {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 0;
}
.ai-sec {
  margin: 0;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--surface-strong);
  border: 1px solid var(--line);
}
.ai-sec h3 {
  margin: 0 0 6px;
  font-size: 0.85rem;
  color: var(--teal);
}
.ai-sec p {
  margin: 0;
  font-size: 0.95rem;
  white-space: pre-wrap;
  line-height: 1.75;
}
.ai-sec.jargon {
  background: rgba(20, 35, 28, 0.04);
}
/* 本盘追问：带着当前四柱与总批继续问命师 */
.consult {
  margin-top: 16px;
  padding: 14px 16px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--surface);
}
.consult h3 {
  margin: 0 0 4px;
  font-size: 1rem;
}
.consult-agents {
  display: flex;
  flex-wrap: wrap;
  margin: 10px 0;
}
.consult-agents :deep(.p-selectbutton) {
  flex-wrap: wrap;
}
.consult-log {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: min(42vh, 480px);
  overflow: auto;
}
.consult-log li {
  display: flex;
  gap: 8px;
  margin: 8px 0;
}
.consult-log .who {
  flex: 0 0 auto;
  font-size: 0.75rem;
  color: var(--teal);
}
.consult-log p,
.consult-log .md-body {
  margin: 0;
  white-space: normal;
  line-height: 1.6;
  flex: 1;
  min-width: 0;
}
.consult-log .thinking .who {
  color: var(--muted);
}
.think-box {
  flex: 1;
  min-width: 0;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--teal) 28%, var(--line));
  background: linear-gradient(
    110deg,
    color-mix(in srgb, var(--surface-solid) 70%, transparent) 0%,
    color-mix(in srgb, var(--teal) 10%, transparent) 45%,
    color-mix(in srgb, var(--surface-solid) 70%, transparent) 90%
  );
  background-size: 200% 100%;
  animation: think-shimmer 1.6s ease-in-out infinite;
}
.think-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.think-dots {
  display: inline-flex;
  gap: 4px;
}
.think-dots i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--teal);
  opacity: 0.35;
  animation: think-dot 1.2s ease-in-out infinite;
}
.think-dots i:nth-child(2) {
  animation-delay: 0.2s;
}
.think-dots i:nth-child(3) {
  animation-delay: 0.4s;
}
.think-label {
  margin: 0;
  font-size: 0.88rem;
  color: var(--muted);
  letter-spacing: 0.02em;
}
.think-hint {
  margin: 6px 0 0;
  font-size: 0.78rem;
  color: color-mix(in srgb, var(--muted) 80%, transparent);
}
@keyframes think-shimmer {
  0% {
    background-position: 100% 0;
  }
  100% {
    background-position: -100% 0;
  }
}
@keyframes think-dot {
  0%,
  80%,
  100% {
    opacity: 0.3;
    transform: translateY(0);
  }
  40% {
    opacity: 1;
    transform: translateY(-2px);
  }
}
.consult-form {
  display: flex;
  gap: 8px;
  margin-top: 10px;
  align-items: stretch;
}
.consult-form input {
  flex: 1;
  min-width: 0;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--line);
  background: var(--input-bg);
}
.block-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}
.block-head h2 {
  margin: 0;
}
.msg-actions {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}
.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--ink-soft);
  cursor: pointer;
}
.icon-btn:hover:not(:disabled) {
  background: rgba(20, 35, 28, 0.08);
  color: var(--ink);
}
.icon-btn.on {
  color: var(--teal);
  background: rgba(45, 106, 90, 0.12);
}
.icon-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.copy-tip {
  margin-left: 4px;
  font-size: 0.75rem;
  color: var(--teal);
}
.ai-cursor {
  display: inline-block;
  margin-left: 1px;
  color: var(--teal);
  animation: ai-blink 0.9s step-end infinite;
}
@keyframes ai-blink {
  50% {
    opacity: 0;
  }
}
.brief {
  margin-top: 14px;
  padding: 12px 14px;
  border: 1px dashed var(--line);
  border-radius: 12px;
}
.brief ul {
  margin: 8px 0 0;
  padding-left: 1.1em;
  color: var(--ink-soft);
  line-height: 1.7;
}
@media (max-width: 900px) {
  /* 起盘表单：双列紧凑；年/月/日等同宽，避免整列过长 */
  .form {
    align-items: stretch;
  }
  .form > label,
  .form > .pv-field {
    flex: 1 1 calc(50% - 8px);
    min-width: min(100%, 132px);
  }
  .form > label:has(input.w-name),
  .form > label:has(select.w-tone),
  .form > .form-place-block,
  .form > .form-checks,
  .form > .form-actions,
  .form > .pv-cutover {
    flex: 1 1 100%;
  }
  .form input,
  .form select {
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
  }
  .page-nav-item {
    min-height: 36px;
    padding: 8px 14px;
  }
  .section-anchor {
    scroll-margin-top: 56px;
  }
  .panel {
    padding: 14px 12px;
  }
  .pan-table {
    min-width: 520px;
    font-size: 0.82rem;
  }
  .pan-table .gz-char {
    font-size: 1.35rem;
  }
  .pillars {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }
  /* 与全局 assistant.css 对齐：抽屉落在 Tab 之上，勿再写 bottom:0 */
  .ai-fab {
    right: max(8px, env(safe-area-inset-right, 0px));
    left: auto;
    bottom: calc(var(--fab-stack-bottom) + env(safe-area-inset-bottom, 0px));
    z-index: 52;
  }
  .ai-assist {
    left: 0 !important;
    right: 0 !important;
    top: auto !important;
    bottom: calc(var(--tab-bar-height) + env(safe-area-inset-bottom, 0px)) !important;
    width: 100vw !important;
    max-width: 100vw !important;
    height: auto !important;
    max-height: calc(
      100dvh - var(--topbar-height, 48px) - var(--tab-bar-height) - env(safe-area-inset-top, 0px) -
        env(safe-area-inset-bottom, 0px) - 8px
    ) !important;
    min-height: min(52dvh, 420px);
    border-radius: 16px 16px 0 0;
    transform: none !important;
  }
  .ai-form {
    grid-template-columns: 1fr;
  }
  .ai-assist-head {
    flex-wrap: wrap;
  }
  .ai-assist-tools {
    width: 100%;
    justify-content: flex-end;
  }
  .ai-assist-body {
    padding-bottom: 12px;
  }
}

@media (max-width: 420px) {
  .form > label,
  .form > .pv-field {
    flex: 1 1 100%;
  }
  .pillars {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
