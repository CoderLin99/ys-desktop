/**
 * 命师助手上下文：各功能槽位独立存盘；默认只用当前页，综合引用需显式勾选。
 */
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { MingChatMessage } from '@rules/bazi/aiPolish'

/** 功能槽位 id */
export type AssistFeatureId =
  | 'home'
  | 'bazi'
  | 'ziwei'
  | 'fengshui'
  | 'hehun'
  | 'daily'
  | 'trend'
  | 'liuyao'
  | 'huangli'

/** 单槽上下文 */
export interface AssistSlot {
  /** 功能 id */
  id: AssistFeatureId
  /** 展示名 */
  title: string
  /** 结构化事实文本（追问用） */
  factsText: string
  /** 已出总批/润色（可空） */
  polishText?: string
  /** 更新时间 ISO */
  updatedAt: string
}

/** 功能中文名 */
export const ASSIST_FEATURE_LABEL: Record<AssistFeatureId, string> = {
  home: '首页',
  bazi: '八字',
  ziwei: '紫微',
  fengshui: '风水',
  hehun: '合盘',
  daily: '日运',
  trend: '走势',
  liuyao: '六爻',
  huangli: '黄历'
}

/**
 * 跨页助手上下文仓库（槽位独立，追问默认本页）。
 */
export const useAssistContextStore = defineStore('assistContext', () => {
  /** 各功能最新结果（互不覆盖） */
  const slots = ref<Partial<Record<AssistFeatureId, AssistSlot>>>({})
  /** 当前路由对应功能 */
  const activeFeature = ref<AssistFeatureId | null>(null)
  /**
   * 额外纳入综合的功能 id（不含当前页；当前页始终单独使用或与勾选项合并）。
   * 默认空：只答本页。
   */
  const extraIncludeIds = ref<AssistFeatureId[]>([])
  /** 各功能独立对话（互不串台） */
  const chats = ref<Partial<Record<AssistFeatureId, MingChatMessage[]>>>({})
  /** 当前页注册的润色回调 */
  const polishRunner = ref<null | (() => Promise<void>)>(null)
  /** 当前页润色是否可用 */
  const polishReady = ref(false)

  /**
   * 发布或更新某功能上下文（不自动勾选进综合）。
   * @param slot 槽位内容
   */
  function publish(slot: Omit<AssistSlot, 'updatedAt'> & { updatedAt?: string }): void {
    const next: AssistSlot = {
      ...slot,
      updatedAt: slot.updatedAt || new Date().toISOString()
    }
    slots.value = { ...slots.value, [slot.id]: next }
  }

  /**
   * 清空某功能盘面与对话。
   * @param id 功能 id
   */
  function clear(id: AssistFeatureId): void {
    const copy = { ...slots.value }
    delete copy[id]
    slots.value = copy
    extraIncludeIds.value = extraIncludeIds.value.filter((x) => x !== id)
    const chatCopy = { ...chats.value }
    delete chatCopy[id]
    chats.value = chatCopy
  }

  /**
   * 切换路由功能：重置「另引」勾选，保持各槽与对话独立。
   * @param id 功能 id 或 null
   */
  function setActiveFeature(id: AssistFeatureId | null): void {
    activeFeature.value = id
    // 换页后默认只看本页，不把上一页材料带进追问
    extraIncludeIds.value = []
    polishRunner.value = null
    polishReady.value = false
  }

  /**
   * 注册当前页润色能力。
   * @param runner 润色函数；null 表示无
   * @param ready 是否可点
   */
  function registerPolish(runner: (() => Promise<void>) | null, ready: boolean): void {
    polishRunner.value = runner
    polishReady.value = ready
  }

  /**
   * 切换是否另引某功能（当前页不可关）。
   * @param id 功能 id
   * @param on 是否纳入
   */
  function setExtraIncluded(id: AssistFeatureId, on: boolean): void {
    if (id === activeFeature.value) return
    if (on) {
      if (!extraIncludeIds.value.includes(id)) {
        extraIncludeIds.value = [...extraIncludeIds.value, id]
      }
    } else {
      extraIncludeIds.value = extraIncludeIds.value.filter((x) => x !== id)
    }
  }

  /**
   * 读取某功能对话副本。
   * @param id 功能 id
   */
  function getChat(id: AssistFeatureId): MingChatMessage[] {
    return [...(chats.value[id] || [])]
  }

  /**
   * 写入某功能对话。
   * @param id 功能 id
   * @param messages 完整消息列表
   */
  function setChat(id: AssistFeatureId, messages: MingChatMessage[]): void {
    chats.value = { ...chats.value, [id]: [...messages] }
  }

  /**
   * 清空当前功能对话。
   */
  function clearActiveChat(): void {
    const id = activeFeature.value
    if (!id) return
    const copy = { ...chats.value }
    delete copy[id]
    chats.value = copy
  }

  /** 本页槽位 */
  const activeSlot = computed(() => {
    const id = activeFeature.value
    return id ? slots.value[id] ?? null : null
  })

  /** 已有数据的其他功能（供另引勾选） */
  const otherFilledSlots = computed(() => {
    const active = activeFeature.value
    return (Object.values(slots.value) as AssistSlot[])
      .filter((s) => s.id !== active && s.factsText?.trim())
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
  })

  /** 本次追问实际用到的功能 id：本页 + 显式另引 */
  const askFeatureIds = computed((): AssistFeatureId[] => {
    const ids: AssistFeatureId[] = []
    if (activeFeature.value) ids.push(activeFeature.value)
    for (const id of extraIncludeIds.value) {
      if (!ids.includes(id)) ids.push(id)
    }
    return ids
  })

  /**
   * 拼追问事实：默认仅本页；勾选后才拼接其他功能。
   */
  function buildAskFacts(): string {
    const parts: string[] = []
    for (const id of askFeatureIds.value) {
      const s = slots.value[id]
      if (!s?.factsText?.trim()) continue
      parts.push(`【${s.title}】\n${s.factsText.trim()}`)
    }
    return parts.join('\n\n')
  }

  /**
   * 拼追问总批块。
   */
  function buildAskPolish(): string {
    const parts: string[] = []
    for (const id of askFeatureIds.value) {
      const s = slots.value[id]
      if (!s?.polishText?.trim()) continue
      parts.push(`【${s.title}·已出文案】\n${s.polishText.trim().slice(0, 4000)}`)
    }
    return parts.join('\n\n') || '（尚无润色总批，请先按事实作答）'
  }

  /** 是否多功能综合（显式另引了其他盘） */
  const isMultiFeatureAsk = computed(() => askFeatureIds.value.length > 1)

  /** 本页是否已有可追问事实 */
  const hasActiveFacts = computed(() => Boolean(activeSlot.value?.factsText?.trim()))

  return {
    slots,
    activeFeature,
    extraIncludeIds,
    chats,
    polishRunner,
    polishReady,
    activeSlot,
    otherFilledSlots,
    askFeatureIds,
    isMultiFeatureAsk,
    hasActiveFacts,
    publish,
    clear,
    setActiveFeature,
    registerPolish,
    setExtraIncluded,
    getChat,
    setChat,
    clearActiveChat,
    buildAskFacts,
    buildAskPolish
  }
})
