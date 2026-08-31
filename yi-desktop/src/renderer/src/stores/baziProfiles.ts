/**
 * 命例本地存储：对齐工作台「个人记录」，数据存 localStorage，不上云。
 * 可跨八字 / 紫微 / 合盘 / 日运套用。
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { DayCutover } from '@rules/bazi/chart'
import type { BirthPlaceScope } from '@rules/bazi/solarTime'

/** 一条命例 */
export interface BaziProfile {
  /** 唯一 id */
  id: string
  /** 昵称/备注 */
  label: string
  /** 性别 */
  gender: 'male' | 'female'
  /** 公历年 */
  year: number
  /** 公历月 */
  month: number
  /** 公历日 */
  day: number
  /** 0–23；null 表示时辰未知 */
  hour: number | null
  /** 分钟 0–59 */
  minute?: number
  /** 是否三柱模式 */
  hourUnknown: boolean
  /** 出生地范围 */
  placeScope?: BirthPlaceScope
  /** 出生地市名；自定义经度时为特殊键 */
  placeName?: string
  /** 自定义东经（西经负） */
  placeLongitude?: number
  /** 日柱换日口径 */
  dayCutover?: DayCutover
  /** 是否真太阳时 */
  useEot?: boolean
  /** 是否夏令时 */
  daylightSaving?: boolean
  /** 创建时间 ISO */
  createdAt: string
}

const STORAGE_KEY = 'yi-desktop-bazi-profiles'

/**
 * 生成随机 id。
 */
function newId(): string {
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

/**
 * 从 localStorage 读取命例列表。
 */
function loadProfiles(): BaziProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw) as BaziProfile[]
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

/**
 * 写入 localStorage。
 * @param list 命例列表
 */
function saveProfiles(list: BaziProfile[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

export const useBaziProfilesStore = defineStore('baziProfiles', () => {
  /** 全部命例 */
  const profiles = ref<BaziProfile[]>(loadProfiles())
  /** 每日运势 / 合盘默认选中的命例 id */
  const activeProfileId = ref<string | null>(profiles.value[0]?.id ?? null)

  /**
   * 新增或更新命例。
   * @param input 字段（无 id 则新建）
   */
  function upsert(input: Omit<BaziProfile, 'id' | 'createdAt'> & { id?: string }): BaziProfile {
    const now = new Date().toISOString()
    if (input.id) {
      const idx = profiles.value.findIndex((p) => p.id === input.id)
      if (idx >= 0) {
        const next = { ...profiles.value[idx], ...input, createdAt: profiles.value[idx].createdAt }
        profiles.value[idx] = next
        saveProfiles(profiles.value)
        return next
      }
    }
    const row: BaziProfile = {
      id: newId(),
      label: input.label,
      gender: input.gender,
      year: input.year,
      month: input.month,
      day: input.day,
      hour: input.hour,
      minute: input.minute ?? 0,
      hourUnknown: input.hourUnknown,
      placeScope: input.placeScope,
      placeName: input.placeName,
      placeLongitude: input.placeLongitude,
      dayCutover: input.dayCutover,
      useEot: input.useEot,
      daylightSaving: input.daylightSaving,
      createdAt: now
    }
    profiles.value = [row, ...profiles.value]
    if (!activeProfileId.value) activeProfileId.value = row.id
    saveProfiles(profiles.value)
    return row
  }

  /**
   * 删除命例。
   * @param id 命例 id
   */
  function remove(id: string): void {
    profiles.value = profiles.value.filter((p) => p.id !== id)
    if (activeProfileId.value === id) {
      activeProfileId.value = profiles.value[0]?.id ?? null
    }
    saveProfiles(profiles.value)
  }

  /**
   * 设置当前活跃命例。
   * @param id 命例 id
   */
  function setActive(id: string | null): void {
    activeProfileId.value = id
  }

  /**
   * 按 id 取命例。
   * @param id 命例 id
   */
  function byId(id: string | null): BaziProfile | undefined {
    if (!id) return undefined
    return profiles.value.find((p) => p.id === id)
  }

  return { profiles, activeProfileId, upsert, remove, setActive, byId }
})
