/**
 * 全局主题：日间 / 暗夜 / 天气跟随（按当地 Open-Meteo 整套换色）。
 */
import { defineStore } from 'pinia'
import {
  applyWeatherToDocument,
  fetchWeatherSnapshot,
  type WeatherMood
} from '../utils/weatherTheme'

/** localStorage 键名 */
const THEME_KEY = 'yi-desktop-theme'
/** 天气轮询句柄（避免重复 hydrate 叠多个定时器） */
let weatherTimer: number | null = null

/** 主题取值：天气为第三模式，开启后按当地实况换色 */
export type ThemeMode = 'light' | 'dark' | 'weather'

/**
 * 把明暗底写到 <html data-theme>（天气模式下由 is_day 驱动）。
 * @param base 明亮或暗夜底
 */
export function applyThemeBaseToDocument(base: 'light' | 'dark'): void {
  document.documentElement.dataset.theme = base
}

/**
 * 读取本机已存主题模式。
 */
export function readStoredTheme(): ThemeMode {
  try {
    const v = localStorage.getItem(THEME_KEY)
    if (v === 'dark' || v === 'weather') return v
    // 兼容旧版 weather-follow 开关
    if (localStorage.getItem('yi-desktop-weather-follow') === '1') return 'weather'
    return 'light'
  } catch {
    return 'light'
  }
}

/**
 * 启动时尽早上色（天气模式先用日间底，稍后由 hydrate 刷新）。
 */
export function hydrateThemeEarly(): void {
  const mode = readStoredTheme()
  if (mode === 'weather') {
    applyThemeBaseToDocument('light')
    return
  }
  applyThemeBaseToDocument(mode)
  applyWeatherToDocument('off')
}

/**
 * 启动天气主题定时刷新（约 30 分钟）。
 * @param store 主题 store
 */
function ensureWeatherTimer(store: {
  mode: ThemeMode
  refreshWeather: () => Promise<void>
}): void {
  if (typeof window === 'undefined' || weatherTimer != null) return
  weatherTimer = window.setInterval(() => {
    if (store.mode === 'weather') void store.refreshWeather()
  }, 30 * 60 * 1000)
}

export const useThemeStore = defineStore('theme', {
  state: () => ({
    /** 当前模式：日间 / 暗夜 / 天气跟随 */
    mode: 'light' as ThemeMode,
    /** 天气主题下实际明暗底（由 is_day 决定） */
    weatherBase: 'light' as 'light' | 'dark',
    /** 当前天气氛围 */
    weatherMood: 'off' as WeatherMood,
    /** 天气请求中 */
    weatherLoading: false,
    /** 最近一次定位纬度（展示用） */
    weatherLat: null as number | null,
    /** 最近一次定位经度 */
    weatherLon: null as number | null
  }),
  getters: {
    /** 界面是否按暗色底渲染 */
    isDark: (s) =>
      s.mode === 'dark' || (s.mode === 'weather' && s.weatherBase === 'dark'),
    /** 是否天气跟随模式 */
    isWeather: (s) => s.mode === 'weather'
  },
  actions: {
    /**
     * 应用并持久化主题模式。
     * @param mode 日间 / 暗夜 / 天气
     */
    async setMode(mode: ThemeMode): Promise<void> {
      this.mode = mode
      try {
        localStorage.setItem(THEME_KEY, mode)
        // 清掉旧开关键，避免下次被误读
        localStorage.removeItem('yi-desktop-weather-follow')
      } catch {
        /* 隐私模式 */
      }

      if (mode === 'weather') {
        ensureWeatherTimer(this)
        await this.refreshWeather()
        return
      }

      // 显式日间/暗夜：清天气着色，强制写 data-theme，避免平板上残留 weather 半透明层
      applyWeatherToDocument('off')
      this.weatherMood = 'off'
      this.weatherBase = mode
      applyThemeBaseToDocument(mode)
      document.documentElement.style.colorScheme = mode === 'dark' ? 'dark' : 'light'
    },
    /**
     * 兼容旧 UI：开关天气跟随。
     * @param on 是否开启
     */
    async setWeatherFollow(on: boolean): Promise<void> {
      if (on) await this.setMode('weather')
      else await this.setMode(this.weatherBase === 'dark' ? 'dark' : 'light')
    },
    /** 拉取当地天气并整套换色 */
    async refreshWeather(): Promise<void> {
      if (this.mode !== 'weather') return
      this.weatherLoading = true
      try {
        const snap = await fetchWeatherSnapshot()
        this.weatherLat = snap.latitude
        this.weatherLon = snap.longitude
        if (snap.mood === 'off') {
          // 拉取失败：保留明暗底，去掉天气着色
          this.weatherMood = 'off'
          applyWeatherToDocument('off')
          applyThemeBaseToDocument(this.weatherBase)
          return
        }
        this.weatherMood = snap.mood
        this.weatherBase = snap.isDay ? 'light' : 'dark'
        applyThemeBaseToDocument(this.weatherBase)
        applyWeatherToDocument(snap.mood)
      } finally {
        this.weatherLoading = false
      }
    },
    /** 从本机恢复 */
    hydrate(): void {
      const mode = readStoredTheme()
      void this.setMode(mode)
    },
    /** 在日间/暗夜间对调（天气模式下改为退出到对侧） */
    toggle(): void {
      if (this.mode === 'weather') {
        void this.setMode(this.weatherBase === 'dark' ? 'light' : 'dark')
        return
      }
      void this.setMode(this.mode === 'dark' ? 'light' : 'dark')
    }
  }
})
