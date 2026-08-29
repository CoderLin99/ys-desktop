<script setup lang="ts">
/**
 * 主题入口：日间 / 暗夜 / 天气跟随（按当地实况整套换色）。
 */
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useThemeStore } from '../stores/theme'

const theme = useThemeStore()
const { mode, isDark, isWeather, weatherMood, weatherLoading, weatherLat, weatherLon } =
  storeToRefs(theme)

/** 展开小菜单 */
const open = ref(false)
const rootRef = ref<HTMLElement | null>(null)

/** 天气中文名 */
const moodLabel = computed(() => {
  const map: Record<string, string> = {
    clear: '晴',
    cloud: '多云',
    rain: '雨',
    snow: '雪',
    fog: '雾',
    storm: '雷雨',
    off: '未取到'
  }
  return map[weatherMood.value] || weatherMood.value
})

/** 天气模式副文案 */
const weatherHint = computed(() => {
  if (!isWeather.value) return '按当地天气换主题色'
  if (weatherLoading.value) return '正在读取当地天气…'
  const day = theme.weatherBase === 'dark' ? '夜' : '昼'
  const pos =
    weatherLat.value != null && weatherLon.value != null
      ? ` · ${weatherLat.value.toFixed(1)}°,${weatherLon.value.toFixed(1)}°`
      : ''
  return `当前：${moodLabel.value}·${day}${pos}`
})

/** 按钮 title */
const iconTitle = computed(() => {
  if (isWeather.value) return `主题：天气跟随（${moodLabel.value}）`
  return isDark.value ? '主题设置（当前暗夜）' : '主题设置（当前日间）'
})

/**
 * 切换菜单。
 */
function toggleMenu(): void {
  open.value = !open.value
}

/**
 * 点外部关闭。
 * @param ev 指针
 */
function onDoc(ev: PointerEvent): void {
  if (!open.value) return
  const t = ev.target
  if (t instanceof Node && rootRef.value?.contains(t)) return
  open.value = false
}

/**
 * 选主题并关菜单。
 * @param next 目标模式
 */
async function pick(next: 'light' | 'dark' | 'weather'): Promise<void> {
  await theme.setMode(next)
  open.value = false
}

onMounted(() => document.addEventListener('pointerdown', onDoc, true))
onBeforeUnmount(() => document.removeEventListener('pointerdown', onDoc, true))
</script>

<template>
  <div ref="rootRef" class="theme-wrap">
    <button
      type="button"
      class="theme-icon"
      :title="iconTitle"
      :aria-label="iconTitle"
      :aria-expanded="open"
      @click="toggleMenu"
    >
      <!-- 天气跟随：云朵 -->
      <svg v-if="isWeather" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path
          fill="currentColor"
          d="M7.5 18.5h9.2a3.8 3.8 0 0 0 .4-7.58A5.5 5.5 0 0 0 7.1 12.2 3.6 3.6 0 0 0 7.5 18.5z"
        />
      </svg>
      <svg v-else-if="!isDark" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path
          fill="currentColor"
          d="M16.5 13.2A7.2 7.2 0 0 1 10.8 4.4 7.4 7.4 0 1 0 19.6 13.2a7.1 7.1 0 0 1-3.1 0z"
        />
      </svg>
      <svg v-else viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <circle cx="12" cy="12" r="4.2" fill="currentColor" />
        <g fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round">
          <path
            d="M12 3.2v2.1M12 18.7v2.1M3.2 12h2.1M18.7 12h2.1M5.7 5.7l1.5 1.5M16.8 16.8l1.5 1.5M5.7 18.3l1.5-1.5M16.8 7.2l1.5-1.5"
          />
        </g>
      </svg>
    </button>

    <div v-if="open" class="theme-menu" role="menu">
      <button
        type="button"
        role="menuitem"
        :class="{ on: mode === 'light' }"
        @click="pick('light')"
      >
        日间
      </button>
      <button
        type="button"
        role="menuitem"
        :class="{ on: mode === 'dark' }"
        @click="pick('dark')"
      >
        暗夜
      </button>
      <button
        type="button"
        role="menuitem"
        class="weather"
        :class="{ on: mode === 'weather' }"
        :disabled="weatherLoading && mode === 'weather'"
        @click="pick('weather')"
      >
        天气跟随
        <small>{{ weatherHint }}</small>
      </button>
      <p class="tip">
        天气主题用 Open-Meteo 免费接口（无需 Key）：按当地天气换整套配色，夜间自动暗底；离线则保持上次明暗。
      </p>
    </div>
  </div>
</template>

<style scoped>
.theme-wrap {
  position: relative;
  flex: 0 0 auto;
}
.theme-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: 1px solid var(--line);
  border-radius: 50%;
  background: var(--surface-strong);
  color: var(--ink);
  cursor: pointer;
}
.theme-icon:hover {
  border-color: var(--teal);
  color: var(--teal);
}
.theme-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 60;
  min-width: 196px;
  padding: 6px;
  border-radius: 12px;
  border: 1px solid var(--line);
  background: var(--surface-solid);
  box-shadow: var(--shadow);
  display: grid;
  gap: 4px;
}
.theme-menu button {
  display: grid;
  gap: 2px;
  text-align: left;
  border: none;
  background: transparent;
  color: var(--ink);
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  min-height: 40px;
}
.theme-menu button:hover,
.theme-menu button.on {
  background: color-mix(in srgb, var(--teal) 16%, transparent);
}
.theme-menu button.weather small {
  color: var(--ink-soft);
  font-size: 0.75rem;
}
.theme-menu .tip {
  margin: 4px 6px 2px;
  font-size: 0.7rem;
  line-height: 1.4;
  color: var(--ink-soft);
}
</style>
