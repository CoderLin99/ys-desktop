/**
 * 设备定位与罗盘朝向（Web Geolocation + DeviceOrientation）。
 * Android WebView 需 Manifest 声明定位权限；朝向在 HTTPS / Tauri 环境可用。
 */

/** GPS 读数 */
export interface GeoReading {
  /** 纬度 */
  latitude: number
  /** 经度 */
  longitude: number
  /** 精度米 */
  accuracy?: number
}

/** 罗盘读数 */
export interface CompassReading {
  /** 朝向角：正北=0，顺时针 0–360 */
  headingDeg: number
  /** 来源说明 */
  source: string
}

/**
 * 请求一次 GPS 定位。
 */
export function getCurrentPosition(): Promise<GeoReading> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('当前环境不支持定位'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy
        })
      },
      (err) => reject(new Error(err.message || '定位失败')),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 5000 }
    )
  })
}

/**
 * 从 DeviceOrientation 事件提取罗盘角（尽量用 webkitCompassHeading）。
 * @param ev 方向事件
 */
export function headingFromOrientation(ev: DeviceOrientationEvent): number | null {
  const anyEv = ev as DeviceOrientationEvent & { webkitCompassHeading?: number }
  if (typeof anyEv.webkitCompassHeading === 'number' && !Number.isNaN(anyEv.webkitCompassHeading)) {
    return ((anyEv.webkitCompassHeading % 360) + 360) % 360
  }
  // 标准：alpha 为相对设备的 z 轴转动；绝对方向需 absolute
  if (ev.absolute && typeof ev.alpha === 'number') {
    // 常见近似：heading ≈ 360 - alpha
    return ((360 - ev.alpha) % 360 + 360) % 360
  }
  if (typeof ev.alpha === 'number') {
    return ((360 - ev.alpha) % 360 + 360) % 360
  }
  return null
}

/**
 * 申请 iOS 罗盘权限（若存在）。
 */
export async function requestCompassPermission(): Promise<void> {
  const DOE = DeviceOrientationEvent as unknown as {
    requestPermission?: () => Promise<PermissionState>
  }
  if (typeof DOE.requestPermission === 'function') {
    const st = await DOE.requestPermission()
    if (st !== 'granted') throw new Error('未获得罗盘权限')
  }
}

/**
 * 监听罗盘，返回取消函数。
 * @param onReading 回调
 */
export function watchCompass(onReading: (r: CompassReading) => void): () => void {
  const handler = (ev: Event) => {
    const h = headingFromOrientation(ev as DeviceOrientationEvent)
    if (h == null) return
    onReading({ headingDeg: h, source: 'device-orientation' })
  }
  window.addEventListener('deviceorientationabsolute', handler as EventListener, true)
  window.addEventListener('deviceorientation', handler as EventListener, true)
  return () => {
    window.removeEventListener('deviceorientationabsolute', handler as EventListener, true)
    window.removeEventListener('deviceorientation', handler as EventListener, true)
  }
}
