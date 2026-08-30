/**
 * 当地天气主题：Open-Meteo 免费无 Key，按 weather_code + is_day 驱动整套主题色。
 * @see https://open-meteo.com/
 */
import { getCurrentPosition } from './deviceLocation'

/** 天气主题种类（off = 未启用 / 拉取失败） */
export type WeatherMood = 'clear' | 'cloud' | 'rain' | 'snow' | 'fog' | 'storm' | 'off'

/** 一次天气快照：氛围 + 是否白天（用于自动日间/暗夜底） */
export interface WeatherSnapshot {
  /** 天气氛围 */
  mood: WeatherMood
  /** 当地是否白天 */
  isDay: boolean
  /** 纬度（用于展示） */
  latitude: number
  /** 经度 */
  longitude: number
}

/** WMO weather_code → 氛围 */
const CODE_MOOD: Array<{ max: number; mood: Exclude<WeatherMood, 'off'> }> = [
  { max: 1, mood: 'clear' },
  { max: 3, mood: 'cloud' },
  { max: 48, mood: 'fog' },
  { max: 67, mood: 'rain' },
  { max: 77, mood: 'snow' },
  { max: 82, mood: 'rain' },
  { max: 86, mood: 'snow' },
  { max: 99, mood: 'storm' }
]

/**
 * 把 WMO 天气码映射为氛围。
 * @param code Open-Meteo weather_code
 */
export function weatherCodeToMood(code: number): Exclude<WeatherMood, 'off'> {
  for (const row of CODE_MOOD) {
    if (code <= row.max) return row.mood
  }
  return 'cloud'
}

/**
 * 写到 html[data-weather]，供 CSS 整套换色。
 * @param mood 氛围；off 时移除属性
 */
export function applyWeatherToDocument(mood: WeatherMood): void {
  const root = document.documentElement
  if (!mood || mood === 'off') {
    delete root.dataset.weather
    return
  }
  root.dataset.weather = mood
}

/**
 * 带超时的 fetch（兼容无 AbortSignal.timeout 的 WebView）。
 * @param url 请求地址
 * @param ms 超时毫秒
 */
async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const ctrl = new AbortController()
  const timer = window.setTimeout(() => ctrl.abort(), ms)
  try {
    return await fetch(url, { signal: ctrl.signal })
  } finally {
    window.clearTimeout(timer)
  }
}

/**
 * 用定位（失败则北京）拉取当地天气码与昼夜。
 * @returns 快照；网络失败返回 mood=off
 */
export async function fetchWeatherSnapshot(): Promise<WeatherSnapshot> {
  let lat = 39.9
  let lon = 116.41
  try {
    const loc = await Promise.race([
      getCurrentPosition(),
      new Promise<null>((resolve) => {
        window.setTimeout(() => resolve(null), 5000)
      })
    ])
    if (loc) {
      lat = loc.latitude
      lon = loc.longitude
    }
  } catch {
    /* 用默认坐标 */
  }

  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}` +
    `&longitude=${lon.toFixed(4)}&current=weather_code,is_day&timezone=auto`

  try {
    const res = await fetchWithTimeout(url, 8000)
    if (!res.ok) {
      return { mood: 'off', isDay: true, latitude: lat, longitude: lon }
    }
    const data = (await res.json()) as {
      current?: { weather_code?: number; is_day?: number }
    }
    const code = Number(data.current?.weather_code)
    if (!Number.isFinite(code)) {
      return { mood: 'off', isDay: true, latitude: lat, longitude: lon }
    }
    return {
      mood: weatherCodeToMood(code),
      isDay: Number(data.current?.is_day) !== 0,
      latitude: lat,
      longitude: lon
    }
  } catch {
    return { mood: 'off', isDay: true, latitude: lat, longitude: lon }
  }
}

/** @deprecated 兼容旧调用：仅返回氛围 */
export async function fetchWeatherMood(): Promise<WeatherMood> {
  const snap = await fetchWeatherSnapshot()
  return snap.mood
}
