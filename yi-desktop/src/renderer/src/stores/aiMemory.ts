/**
 * AI 命师会话记忆：按四柱 chartKey 持久化追问、席位与最近总批/推断。
 * 数据仅存本机 localStorage，不上云。
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { MingAgentId, MingChatMessage } from '@rules/bazi/aiPolish'
import type { BaZiChart } from '@rules/bazi/chart'

/** 单盘 AI 记忆条目 */
export interface AiChartMemory {
  /** 四柱字符串，如「己卯 庚午 乙未 戊寅」 */
  chartKey: string
  /** 关联命例 id；无则 null */
  profileId: string | null
  /** 坐堂命师席位 */
  agentId: MingAgentId
  /** 本盘追问记录 */
  messages: MingChatMessage[]
  /** 最近一次润色或推断全文 */
  lastSummary: string
  /** 最近一次生成模式 */
  lastMode: 'polish' | 'infer'
  /** 更新时间 ISO */
  updatedAt: string
}

const STORAGE_KEY = 'yi-desktop-ai-memory'

/**
 * 从 localStorage 读取全部 chartKey → 记忆映射。
 */
function loadAll(): Record<string, AiChartMemory> {
  try {
    if (typeof localStorage === 'undefined') return {}
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, AiChartMemory>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

/**
 * 写入 localStorage。
 * @param map chartKey → 记忆
 */
function saveAll(map: Record<string, AiChartMemory>): void {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {
    /* 测试环境或无 storage 权限时跳过 */
  }
}

/**
 * 由排盘结果生成四柱键（换盘判定用）。
 * @param chart 八字盘
 */
export function buildChartKey(chart: BaZiChart): string {
  const p = chart.pillars
  return [p.year.gz, p.month.gz, p.day.gz, p.hour?.gz ?? '时未知'].join(' ')
}

/**
 * 由四柱字符串直接拼 chartKey（手工四柱模式）。
 * @param gzList 年柱…时柱干支
 */
export function buildChartKeyFromGz(gzList: string[]): string {
  const [y, m, d, h] = gzList
  return [y, m, d, h?.trim() || '时未知'].join(' ')
}

export const useAiMemoryStore = defineStore('aiMemory', () => {
  /** 全部记忆（按 chartKey 索引） */
  const byChart = ref<Record<string, AiChartMemory>>(loadAll())

  /**
   * 读取某盘记忆。
   * @param chartKey 四柱键
   */
  function get(chartKey: string): AiChartMemory | undefined {
    if (!chartKey) return undefined
    return byChart.value[chartKey]
  }

  /**
   * 保存或覆盖某盘记忆。
   * @param entry 记忆条目（chartKey 必填）
   */
  function persist(entry: Omit<AiChartMemory, 'updatedAt'> & { updatedAt?: string }): void {
    if (!entry.chartKey) return
    const row: AiChartMemory = {
      ...entry,
      messages: Array.isArray(entry.messages) ? entry.messages : [],
      lastSummary: entry.lastSummary ?? '',
      lastMode: entry.lastMode === 'infer' ? 'infer' : 'polish',
      updatedAt: entry.updatedAt ?? new Date().toISOString()
    }
    byChart.value = { ...byChart.value, [row.chartKey]: row }
    saveAll(byChart.value)
  }

  /**
   * 清空某盘记忆（换盘时调用）。
   * @param chartKey 四柱键
   */
  function clear(chartKey: string): void {
    if (!chartKey || !byChart.value[chartKey]) return
    const next = { ...byChart.value }
    delete next[chartKey]
    byChart.value = next
    saveAll(byChart.value)
  }

  /**
   * 测试/调试：清空全部记忆。
   */
  function clearAll(): void {
    byChart.value = {}
    saveAll({})
  }

  return { byChart, get, persist, clear, clearAll }
})
