/**
 * 出生地与真太阳时（教学近似）。
 *
 * 规则：
 * - 北京时间按东经 120° 计
 * - 经度差每 1° ≈ 4 分钟；东加西减
 * - 「真太阳时」另加均时差方程近似（可选）
 * - 夏令时：勾选则钟面时间先减 1 小时再校正（中国 1986–1991 曾用）
 */
import birthPlacesCnTable from './tables/birthPlacesCn.json'

/** 国内 / 国外 */
export type BirthPlaceScope = 'cn' | 'intl'

/** 常用城市经度（东经为正，西经为负） */
export interface BirthPlace {
  /** 展示名（市或区县） */
  name: string
  /** 省（国内）或国家/地区（国外） */
  province: string
  /** 东经度数（西经为负） */
  longitude: number
  /** 北纬（预留） */
  latitude?: number
  /** 国内 cn / 国外 intl；缺省视为国内 */
  scope?: BirthPlaceScope
  /**
   * 民用时区相对 UTC 的小时偏移（可含半点如 5.5、9.5）。
   * 缺省按经度推近似：round(lon/15)；国内默认 8。
   */
  utcOffset?: number
  /** 英文别名，便于搜索（如 London / New York） */
  aliases?: string[]
  /**
   * 区县级时填写所属地级市，便于真太阳时更贴近出生街道经度。
   * 市本级可空。
   */
  city?: string
}

/** 范围切换选项（UI） */
export const BIRTH_PLACE_SCOPE_OPTIONS: { label: string; value: BirthPlaceScope }[] = [
  { label: '国内', value: 'cn' },
  { label: '国外', value: 'intl' }
]

/** 自定义经度占位名（UI 用） */
export const CUSTOM_PLACE_KEY = '__custom__'

/**
 * 出生地所属范围。
 * @param p 地点
 */
export function birthPlaceScopeOf(p: BirthPlace): BirthPlaceScope {
  return p.scope === 'intl' ? 'intl' : 'cn'
}

/**
 * 按国内/国外筛地点。
 * @param scope 范围
 */
export function placesByScope(scope: BirthPlaceScope): BirthPlace[] {
  return BIRTH_PLACES.filter((p) => birthPlaceScopeOf(p) === scope)
}

/** 压缩表一行 → BirthPlace */
interface CnPlaceRow {
  /** 市或区县名 */
  n: string
  /** 省 */
  p: string
  /** 所属地级市（区县才有） */
  c?: string
  /** 东经 */
  lo: number
  /** 北纬 */
  la?: number
}

/**
 * 展开 GB/T 2260 国内出生地表（由 scripts/generate-birth-places-cn.mjs 生成）。
 * @param rows 压缩行
 */
function expandCnBirthPlaces(rows: CnPlaceRow[]): BirthPlace[] {
  return rows.map((r) => {
    const place: BirthPlace = {
      name: r.n,
      province: r.p,
      longitude: r.lo,
      scope: 'cn'
    }
    if (r.c) place.city = r.c
    if (typeof r.la === 'number') place.latitude = r.la
    return place
  })
}

/** 国内全量：地级市 + 区县（经度缺省继承地级市） */
const CN_BIRTH_PLACES: BirthPlace[] = expandCnBirthPlaces(
  (birthPlacesCnTable as { places: CnPlaceRow[] }).places
)

/** 国外主要城市（手工维护） */
const INTL_BIRTH_PLACES: BirthPlace[] = [
  { name: '东京', province: '日本', longitude: 139.69, latitude: 35.68, scope: 'intl', utcOffset: 9, aliases: ['Tokyo'] },
  { name: '大阪', province: '日本', longitude: 135.5, latitude: 34.69, scope: 'intl', utcOffset: 9, aliases: ['Osaka'] },
  { name: '首尔', province: '韩国', longitude: 126.98, latitude: 37.57, scope: 'intl', utcOffset: 9, aliases: ['Seoul'] },
  { name: '釜山', province: '韩国', longitude: 129.08, latitude: 35.18, scope: 'intl', utcOffset: 9, aliases: ['Busan'] },
  { name: '新加坡', province: '新加坡', longitude: 103.85, latitude: 1.29, scope: 'intl', utcOffset: 8, aliases: ['Singapore'] },
  { name: '吉隆坡', province: '马来西亚', longitude: 101.69, latitude: 3.14, scope: 'intl', utcOffset: 8, aliases: ['Kuala Lumpur'] },
  { name: '曼谷', province: '泰国', longitude: 100.5, latitude: 13.75, scope: 'intl', utcOffset: 7, aliases: ['Bangkok'] },
  { name: '河内', province: '越南', longitude: 105.85, latitude: 21.03, scope: 'intl', utcOffset: 7, aliases: ['Hanoi'] },
  { name: '胡志明市', province: '越南', longitude: 106.67, latitude: 10.82, scope: 'intl', utcOffset: 7, aliases: ['Ho Chi Minh'] },
  { name: '雅加达', province: '印尼', longitude: 106.85, latitude: -6.21, scope: 'intl', utcOffset: 7, aliases: ['Jakarta'] },
  { name: '马尼拉', province: '菲律宾', longitude: 120.98, latitude: 14.6, scope: 'intl', utcOffset: 8, aliases: ['Manila'] },
  { name: '新德里', province: '印度', longitude: 77.21, latitude: 28.61, scope: 'intl', utcOffset: 5.5, aliases: ['New Delhi', 'Delhi'] },
  { name: '孟买', province: '印度', longitude: 72.88, latitude: 19.08, scope: 'intl', utcOffset: 5.5, aliases: ['Mumbai'] },
  { name: '迪拜', province: '阿联酋', longitude: 55.27, latitude: 25.2, scope: 'intl', utcOffset: 4, aliases: ['Dubai'] },
  { name: '利雅得', province: '沙特', longitude: 46.72, latitude: 24.71, scope: 'intl', utcOffset: 3, aliases: ['Riyadh'] },
  { name: '莫斯科', province: '俄罗斯', longitude: 37.62, latitude: 55.76, scope: 'intl', utcOffset: 3, aliases: ['Moscow'] },
  { name: '伊斯坦布尔', province: '土耳其', longitude: 28.98, latitude: 41.01, scope: 'intl', utcOffset: 3, aliases: ['Istanbul'] },
  { name: '开罗', province: '埃及', longitude: 31.24, latitude: 30.04, scope: 'intl', utcOffset: 2, aliases: ['Cairo'] },
  { name: '约翰内斯堡', province: '南非', longitude: 28.05, latitude: -26.2, scope: 'intl', utcOffset: 2, aliases: ['Johannesburg'] },
  { name: '伦敦', province: '英国', longitude: -0.13, latitude: 51.51, scope: 'intl', utcOffset: 0, aliases: ['London'] },
  { name: '巴黎', province: '法国', longitude: 2.35, latitude: 48.86, scope: 'intl', utcOffset: 1, aliases: ['Paris'] },
  { name: '柏林', province: '德国', longitude: 13.41, latitude: 52.52, scope: 'intl', utcOffset: 1, aliases: ['Berlin'] },
  { name: '法兰克福', province: '德国', longitude: 8.68, latitude: 50.11, scope: 'intl', utcOffset: 1, aliases: ['Frankfurt'] },
  { name: '阿姆斯特丹', province: '荷兰', longitude: 4.9, latitude: 52.37, scope: 'intl', utcOffset: 1, aliases: ['Amsterdam'] },
  { name: '布鲁塞尔', province: '比利时', longitude: 4.35, latitude: 50.85, scope: 'intl', utcOffset: 1, aliases: ['Brussels'] },
  { name: '苏黎世', province: '瑞士', longitude: 8.54, latitude: 47.38, scope: 'intl', utcOffset: 1, aliases: ['Zurich'] },
  { name: '维也纳', province: '奥地利', longitude: 16.37, latitude: 48.21, scope: 'intl', utcOffset: 1, aliases: ['Vienna'] },
  { name: '罗马', province: '意大利', longitude: 12.5, latitude: 41.9, scope: 'intl', utcOffset: 1, aliases: ['Rome'] },
  { name: '米兰', province: '意大利', longitude: 9.19, latitude: 45.46, scope: 'intl', utcOffset: 1, aliases: ['Milan'] },
  { name: '马德里', province: '西班牙', longitude: -3.7, latitude: 40.42, scope: 'intl', utcOffset: 1, aliases: ['Madrid'] },
  { name: '巴塞罗那', province: '西班牙', longitude: 2.17, latitude: 41.39, scope: 'intl', utcOffset: 1, aliases: ['Barcelona'] },
  { name: '里斯本', province: '葡萄牙', longitude: -9.14, latitude: 38.72, scope: 'intl', utcOffset: 0, aliases: ['Lisbon'] },
  { name: '斯德哥尔摩', province: '瑞典', longitude: 18.07, latitude: 59.33, scope: 'intl', utcOffset: 1, aliases: ['Stockholm'] },
  { name: '奥斯陆', province: '挪威', longitude: 10.75, latitude: 59.91, scope: 'intl', utcOffset: 1, aliases: ['Oslo'] },
  { name: '哥本哈根', province: '丹麦', longitude: 12.57, latitude: 55.68, scope: 'intl', utcOffset: 1, aliases: ['Copenhagen'] },
  { name: '赫尔辛基', province: '芬兰', longitude: 24.94, latitude: 60.17, scope: 'intl', utcOffset: 2, aliases: ['Helsinki'] },
  { name: '华沙', province: '波兰', longitude: 21.01, latitude: 52.23, scope: 'intl', utcOffset: 1, aliases: ['Warsaw'] },
  { name: '布拉格', province: '捷克', longitude: 14.42, latitude: 50.08, scope: 'intl', utcOffset: 1, aliases: ['Prague'] },
  { name: '雅典', province: '希腊', longitude: 23.73, latitude: 37.98, scope: 'intl', utcOffset: 2, aliases: ['Athens'] },
  { name: '纽约', province: '美国', longitude: -74.01, latitude: 40.71, scope: 'intl', utcOffset: -5, aliases: ['New York', 'NYC'] },
  { name: '洛杉矶', province: '美国', longitude: -118.24, latitude: 34.05, scope: 'intl', utcOffset: -8, aliases: ['Los Angeles', 'LA'] },
  { name: '旧金山', province: '美国', longitude: -122.42, latitude: 37.77, scope: 'intl', utcOffset: -8, aliases: ['San Francisco'] },
  { name: '芝加哥', province: '美国', longitude: -87.63, latitude: 41.88, scope: 'intl', utcOffset: -6, aliases: ['Chicago'] },
  { name: '西雅图', province: '美国', longitude: -122.33, latitude: 47.61, scope: 'intl', utcOffset: -8, aliases: ['Seattle'] },
  { name: '休斯顿', province: '美国', longitude: -95.37, latitude: 29.76, scope: 'intl', utcOffset: -6, aliases: ['Houston'] },
  { name: '华盛顿', province: '美国', longitude: -77.04, latitude: 38.91, scope: 'intl', utcOffset: -5, aliases: ['Washington'] },
  { name: '波士顿', province: '美国', longitude: -71.06, latitude: 42.36, scope: 'intl', utcOffset: -5, aliases: ['Boston'] },
  { name: '温哥华', province: '加拿大', longitude: -123.12, latitude: 49.28, scope: 'intl', utcOffset: -8, aliases: ['Vancouver'] },
  { name: '多伦多', province: '加拿大', longitude: -79.38, latitude: 43.65, scope: 'intl', utcOffset: -5, aliases: ['Toronto'] },
  { name: '蒙特利尔', province: '加拿大', longitude: -73.57, latitude: 45.5, scope: 'intl', utcOffset: -5, aliases: ['Montreal'] },
  { name: '墨西哥城', province: '墨西哥', longitude: -99.13, latitude: 19.43, scope: 'intl', utcOffset: -6, aliases: ['Mexico City'] },
  { name: '圣保罗', province: '巴西', longitude: -46.63, latitude: -23.55, scope: 'intl', utcOffset: -3, aliases: ['Sao Paulo'] },
  { name: '里约热内卢', province: '巴西', longitude: -43.17, latitude: -22.91, scope: 'intl', utcOffset: -3, aliases: ['Rio'] },
  { name: '布宜诺斯艾利斯', province: '阿根廷', longitude: -58.38, latitude: -34.6, scope: 'intl', utcOffset: -3, aliases: ['Buenos Aires'] },
  { name: '悉尼', province: '澳大利亚', longitude: 151.21, latitude: -33.87, scope: 'intl', utcOffset: 10, aliases: ['Sydney'] },
  { name: '墨尔本', province: '澳大利亚', longitude: 144.96, latitude: -37.81, scope: 'intl', utcOffset: 10, aliases: ['Melbourne'] },
  { name: '布里斯班', province: '澳大利亚', longitude: 153.03, latitude: -27.47, scope: 'intl', utcOffset: 10, aliases: ['Brisbane'] },
  { name: '珀斯', province: '澳大利亚', longitude: 115.86, latitude: -31.95, scope: 'intl', utcOffset: 8, aliases: ['Perth'] },
  { name: '奥克兰', province: '新西兰', longitude: 174.76, latitude: -36.85, scope: 'intl', utcOffset: 12, aliases: ['Auckland'] },
  // 国外补充（对照常见排盘站城市粒度：都会区 + 主要侨居城）
  { name: '横滨', province: '日本', longitude: 139.64, latitude: 35.44, scope: 'intl', utcOffset: 9, aliases: ['Yokohama'] },
  { name: '名古屋', province: '日本', longitude: 136.91, latitude: 35.18, scope: 'intl', utcOffset: 9, aliases: ['Nagoya'] },
  { name: '札幌', province: '日本', longitude: 141.35, latitude: 43.06, scope: 'intl', utcOffset: 9, aliases: ['Sapporo'] },
  { name: '福冈', province: '日本', longitude: 130.4, latitude: 33.59, scope: 'intl', utcOffset: 9, aliases: ['Fukuoka'] },
  { name: '金边', province: '柬埔寨', longitude: 104.92, latitude: 11.56, scope: 'intl', utcOffset: 7, aliases: ['Phnom Penh'] },
  { name: '仰光', province: '缅甸', longitude: 96.16, latitude: 16.87, scope: 'intl', utcOffset: 6.5, aliases: ['Yangon'] },
  { name: '科伦坡', province: '斯里兰卡', longitude: 79.86, latitude: 6.93, scope: 'intl', utcOffset: 5.5, aliases: ['Colombo'] },
  { name: '伊斯兰堡', province: '巴基斯坦', longitude: 73.05, latitude: 33.68, scope: 'intl', utcOffset: 5, aliases: ['Islamabad'] },
  { name: '特拉维夫', province: '以色列', longitude: 34.78, latitude: 32.09, scope: 'intl', utcOffset: 2, aliases: ['Tel Aviv'] },
  { name: '内罗毕', province: '肯尼亚', longitude: 36.82, latitude: -1.29, scope: 'intl', utcOffset: 3, aliases: ['Nairobi'] },
  { name: '拉各斯', province: '尼日利亚', longitude: 3.38, latitude: 6.52, scope: 'intl', utcOffset: 1, aliases: ['Lagos'] },
  { name: '都柏林', province: '爱尔兰', longitude: -6.26, latitude: 53.35, scope: 'intl', utcOffset: 0, aliases: ['Dublin'] },
  { name: '爱丁堡', province: '英国', longitude: -3.19, latitude: 55.95, scope: 'intl', utcOffset: 0, aliases: ['Edinburgh'] },
  { name: '曼彻斯特', province: '英国', longitude: -2.24, latitude: 53.48, scope: 'intl', utcOffset: 0, aliases: ['Manchester'] },
  { name: '慕尼黑', province: '德国', longitude: 11.58, latitude: 48.14, scope: 'intl', utcOffset: 1, aliases: ['Munich'] },
  { name: '汉堡', province: '德国', longitude: 9.99, latitude: 53.55, scope: 'intl', utcOffset: 1, aliases: ['Hamburg'] },
  { name: '日内瓦', province: '瑞士', longitude: 6.14, latitude: 46.2, scope: 'intl', utcOffset: 1, aliases: ['Geneva'] },
  { name: '布达佩斯', province: '匈牙利', longitude: 19.04, latitude: 47.5, scope: 'intl', utcOffset: 1, aliases: ['Budapest'] },
  { name: '布加勒斯特', province: '罗马尼亚', longitude: 26.1, latitude: 44.43, scope: 'intl', utcOffset: 2, aliases: ['Bucharest'] },
  { name: '迈阿密', province: '美国', longitude: -80.19, latitude: 25.76, scope: 'intl', utcOffset: -5, aliases: ['Miami'] },
  { name: '亚特兰大', province: '美国', longitude: -84.39, latitude: 33.75, scope: 'intl', utcOffset: -5, aliases: ['Atlanta'] },
  { name: '达拉斯', province: '美国', longitude: -96.8, latitude: 32.78, scope: 'intl', utcOffset: -6, aliases: ['Dallas'] },
  { name: '丹佛', province: '美国', longitude: -104.99, latitude: 39.74, scope: 'intl', utcOffset: -7, aliases: ['Denver'] },
  { name: '凤凰城', province: '美国', longitude: -112.07, latitude: 33.45, scope: 'intl', utcOffset: -7, aliases: ['Phoenix'] },
  { name: '檀香山', province: '美国', longitude: -157.86, latitude: 21.31, scope: 'intl', utcOffset: -10, aliases: ['Honolulu', 'Hawaii'] },
  { name: '渥太华', province: '加拿大', longitude: -75.7, latitude: 45.42, scope: 'intl', utcOffset: -5, aliases: ['Ottawa'] },
  { name: '卡尔加里', province: '加拿大', longitude: -114.07, latitude: 51.05, scope: 'intl', utcOffset: -7, aliases: ['Calgary'] },
  { name: '圣地亚哥', province: '智利', longitude: -70.67, latitude: -33.45, scope: 'intl', utcOffset: -4, aliases: ['Santiago'] },
  { name: '利马', province: '秘鲁', longitude: -77.04, latitude: -12.05, scope: 'intl', utcOffset: -5, aliases: ['Lima'] },
  { name: '阿德莱德', province: '澳大利亚', longitude: 138.6, latitude: -34.93, scope: 'intl', utcOffset: 9.5, aliases: ['Adelaide'] },
  { name: '堪培拉', province: '澳大利亚', longitude: 149.13, latitude: -35.28, scope: 'intl', utcOffset: 10, aliases: ['Canberra'] },
  { name: '惠灵顿', province: '新西兰', longitude: 174.78, latitude: -41.29, scope: 'intl', utcOffset: 12, aliases: ['Wellington'] },
  // 华人常居 / 更多都会
  { name: '香港', province: '中国香港', longitude: 114.17, latitude: 22.32, scope: 'intl', utcOffset: 8, aliases: ['Hong Kong', 'HK'] },
  { name: '九龙', province: '中国香港', city: '香港', longitude: 114.18, latitude: 22.32, scope: 'intl', utcOffset: 8, aliases: ['Kowloon'] },
  { name: '新界', province: '中国香港', city: '香港', longitude: 114.17, latitude: 22.38, scope: 'intl', utcOffset: 8, aliases: ['New Territories'] },
  { name: '澳门', province: '中国澳门', longitude: 113.54, latitude: 22.2, scope: 'intl', utcOffset: 8, aliases: ['Macau', 'Macao'] },
  { name: '台北', province: '中国台湾', longitude: 121.57, latitude: 25.04, scope: 'intl', utcOffset: 8, aliases: ['Taipei'] },
  { name: '新北', province: '中国台湾', longitude: 121.47, latitude: 25.01, scope: 'intl', utcOffset: 8, aliases: ['New Taipei'] },
  { name: '台中', province: '中国台湾', longitude: 120.67, latitude: 24.15, scope: 'intl', utcOffset: 8, aliases: ['Taichung'] },
  { name: '台南', province: '中国台湾', longitude: 120.21, latitude: 22.99, scope: 'intl', utcOffset: 8, aliases: ['Tainan'] },
  { name: '高雄', province: '中国台湾', longitude: 120.3, latitude: 22.63, scope: 'intl', utcOffset: 8, aliases: ['Kaohsiung'] },
  { name: '桃园', province: '中国台湾', longitude: 121.3, latitude: 24.99, scope: 'intl', utcOffset: 8, aliases: ['Taoyuan'] },
  { name: '槟城', province: '马来西亚', longitude: 100.33, latitude: 5.42, scope: 'intl', utcOffset: 8, aliases: ['Penang', 'George Town'] },
  { name: '柔佛新山', province: '马来西亚', longitude: 103.76, latitude: 1.49, scope: 'intl', utcOffset: 8, aliases: ['Johor Bahru'] },
  { name: '怡保', province: '马来西亚', longitude: 101.09, latitude: 4.6, scope: 'intl', utcOffset: 8, aliases: ['Ipoh'] },
  { name: '清迈', province: '泰国', longitude: 98.98, latitude: 18.79, scope: 'intl', utcOffset: 7, aliases: ['Chiang Mai'] },
  { name: '普吉', province: '泰国', longitude: 98.39, latitude: 7.88, scope: 'intl', utcOffset: 7, aliases: ['Phuket'] },
  { name: '多哈', province: '卡塔尔', longitude: 51.53, latitude: 25.29, scope: 'intl', utcOffset: 3, aliases: ['Doha'] },
  { name: '阿布扎比', province: '阿联酋', longitude: 54.37, latitude: 24.45, scope: 'intl', utcOffset: 4, aliases: ['Abu Dhabi'] },
  { name: '多伦多万锦', province: '加拿大', city: '多伦多', longitude: -79.34, latitude: 43.86, scope: 'intl', utcOffset: -5, aliases: ['Markham'] },
  { name: '列治文', province: '加拿大', city: '温哥华', longitude: -123.14, latitude: 49.17, scope: 'intl', utcOffset: -8, aliases: ['Richmond'] },
  { name: '法拉盛', province: '美国', city: '纽约', longitude: -73.83, latitude: 40.76, scope: 'intl', utcOffset: -5, aliases: ['Flushing'] },
  { name: '圣盖博', province: '美国', city: '洛杉矶', longitude: -118.11, latitude: 34.1, scope: 'intl', utcOffset: -8, aliases: ['San Gabriel'] },
  { name: '伦敦华埠', province: '英国', city: '伦敦', longitude: -0.13, latitude: 51.51, scope: 'intl', utcOffset: 0, aliases: ['Chinatown London'] },
  { name: '墨尔本唐人街', province: '澳大利亚', city: '墨尔本', longitude: 144.97, latitude: -37.81, scope: 'intl', utcOffset: 10, aliases: ['Chinatown Melbourne'] }
]

/**
 * 内置出生地：国内来自 GB/T 2260 全量区划；国外为常用侨居城。
 * 找不到时请选「自定义经度」手工填写。
 * 国内表更新：npm run places:cn
 */
export const BIRTH_PLACES: BirthPlace[] = [...CN_BIRTH_PLACES, ...INTL_BIRTH_PLACES]

/** 区县列「全市」哨兵：选市本级经度 */
export const PLACE_CITYWIDE = '__citywide__'

/**
 * 出生地稳定 id（省|市|名），用于级联与存档，避免「朝阳」重名。
 * @param p 地点
 */
export function birthPlaceId(p: BirthPlace): string {
  if (p.province === '自定义') return CUSTOM_PLACE_KEY
  return `${p.province}|${p.city ?? ''}|${p.name}`
}

/**
 * 用 id 反查地点；兼容旧存档仅存市名。
 * @param id birthPlaceId 或旧版纯市名
 * @param scope 可选范围
 */
export function findBirthPlaceById(id: string, scope?: BirthPlaceScope): BirthPlace | null {
  if (!id || id === CUSTOM_PLACE_KEY) return null
  const base = scope ? placesByScope(scope) : BIRTH_PLACES
  const byId = base.find((p) => birthPlaceId(p) === id)
  if (byId) return byId
  // 旧命例：只存了 name
  const byName = base.filter((p) => p.name === id)
  if (byName.length === 1) return byName[0]
  if (byName.length > 1) {
    // 优先市本级（无 city）
    return byName.find((p) => !p.city) ?? byName[0]
  }
  return null
}

/**
 * 一级列表：国内=省，国外=国家/地区。
 * @param scope 范围
 */
export function listPlaceLevel1(scope: BirthPlaceScope): string[] {
  const set = new Set<string>()
  for (const p of placesByScope(scope)) set.add(p.province)
  return [...set]
}

/**
 * 二级列表：国内=地级市，国外=城市。
 * @param scope 范围
 * @param level1 省或国家
 */
export function listPlaceLevel2(scope: BirthPlaceScope, level1: string): string[] {
  const set = new Set<string>()
  for (const p of placesByScope(scope)) {
    if (p.province !== level1) continue
    if (p.city) set.add(p.city)
    else set.add(p.name)
  }
  return [...set]
}

/**
 * 三级列表：区县；首项为全市（市本级）。无区县时仅「全市」。
 * @param scope 范围
 * @param level1 省/国家
 * @param level2 市
 */
export function listPlaceLevel3(
  scope: BirthPlaceScope,
  level1: string,
  level2: string
): { id: string; label: string }[] {
  const districts = placesByScope(scope).filter(
    (p) => p.province === level1 && p.city === level2
  )
  const cityWide = placesByScope(scope).find(
    (p) => p.province === level1 && !p.city && p.name === level2
  )
  const out: { id: string; label: string }[] = []
  if (cityWide) {
    out.push({ id: PLACE_CITYWIDE, label: scope === 'cn' ? '全市' : '全城' })
  }
  for (const d of districts) {
    out.push({ id: birthPlaceId(d), label: d.name })
  }
  // 仅有区县、无市本级条目时，仍列出区县
  if (!out.length && districts.length) {
    for (const d of districts) out.push({ id: birthPlaceId(d), label: d.name })
  }
  return out
}

/**
 * 由三级选择解析最终地点。
 * @param scope 范围
 * @param level1 省/国家
 * @param level2 市
 * @param level3Id PLACE_CITYWIDE 或区县 birthPlaceId
 */
export function resolveCascadePlace(
  scope: BirthPlaceScope,
  level1: string,
  level2: string,
  level3Id: string
): BirthPlace | null {
  if (level3Id && level3Id !== PLACE_CITYWIDE) {
    return findBirthPlaceById(level3Id, scope)
  }
  return (
    placesByScope(scope).find((p) => p.province === level1 && !p.city && p.name === level2) ?? null
  )
}

/**
 * 从地点反推三级路径（供滚轮回显）。
 * @param p 地点
 */
export function cascadePathOf(p: BirthPlace): {
  level1: string
  level2: string
  level3Id: string
} {
  const level1 = p.province
  const level2 = p.city ?? p.name
  const level3Id = p.city ? birthPlaceId(p) : PLACE_CITYWIDE
  return { level1, level2, level3Id }
}

/**
 * 按关键词过滤出生地（匹配市名或省/国家名）；可限定国内/国外。
 * @param keyword 搜索词
 * @param scope 可选范围
 */
export function filterBirthPlaces(keyword: string, scope?: BirthPlaceScope): BirthPlace[] {
  const base = scope ? placesByScope(scope) : BIRTH_PLACES
  const q = keyword.trim().toLowerCase()
  if (!q) return base
  return base.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.province.toLowerCase().includes(q) ||
      (p.city?.toLowerCase().includes(q) ?? false) ||
      (p.aliases?.some((a) => a.toLowerCase().includes(q)) ?? false)
  )
}

/**
 * 根据搜索词自动挑选最合适的出生地（用于输入时联动下拉）。
 * 优先：区县名全等 → 市名全等 → 前缀 → 省/国家全等 → 过滤列表首条（区县优先于市本级）。
 * @param keyword 搜索词
 * @param scope 可选范围
 * @returns 命中的出生地；无关键词或无命中时返回 null
 */
export function pickBirthPlaceByQuery(
  keyword: string,
  scope?: BirthPlaceScope
): BirthPlace | null {
  const q = keyword.trim()
  if (!q) return null
  const list = filterBirthPlaces(q, scope)
  if (!list.length) return null
  const lower = q.toLowerCase()
  /** 区县全等优先（如「泉港」） */
  const exactDistrict = list.find((p) => p.city && p.name.toLowerCase() === lower)
  if (exactDistrict) return exactDistrict
  const exactName = list.find((p) => p.name.toLowerCase() === lower)
  if (exactName) return exactName
  const nameStartsDistrict = list.find((p) => p.city && p.name.toLowerCase().startsWith(lower))
  if (nameStartsDistrict) return nameStartsDistrict
  const nameStarts = list.find((p) => p.name.toLowerCase().startsWith(lower))
  if (nameStarts) return nameStarts
  const exactProvince = list.find((p) => p.province.toLowerCase() === lower)
  if (exactProvince) return exactProvince
  // 同名时优先区县（经度更贴街道）
  const withDistrict = list.find((p) => !!p.city)
  return withDistrict ?? list[0]
}

/**
 * 下拉展示名：省/国家 · 市（国外附 UTC）
 * @param p 出生地
 */
export function formatPlaceLabel(p: BirthPlace): string {
  /** 区县：省 · 市 · 区；市本级：省 · 市 */
  let base: string
  if (p.city) {
    base = `${p.province} · ${p.city} · ${p.name}`
  } else if (p.province === p.name) {
    base = p.name
  } else {
    base = `${p.province} · ${p.name}`
  }
  if (birthPlaceScopeOf(p) !== 'intl') return base
  const off = utcOffsetOf(p)
  const sign = off >= 0 ? '+' : ''
  return `${base} · UTC${sign}${off}`
}

/**
 * 出生地民用 UTC 偏移（小时）。
 * @param p 地点
 */
export function utcOffsetOf(p: BirthPlace): number {
  if (typeof p.utcOffset === 'number' && Number.isFinite(p.utcOffset)) return p.utcOffset
  // 自定义经度：按经线近似，避免误用东八区
  if (p.province === '自定义') return Math.round(p.longitude / 15)
  if (birthPlaceScopeOf(p) === 'cn') return 8
  // 按经度近似标准时区（每 15° 一区）
  return Math.round(p.longitude / 15)
}

/**
 * 标准时区经线（东经）：UTC 偏移 × 15。
 * @param utcOffset 小时
 */
export function standardMeridianOf(utcOffset: number): number {
  return utcOffset * 15
}

/** 东八区标准经线 */
export const STANDARD_LONGITUDE = 120

/** 真太阳时校正结果 */
export interface SolarTimeAdjust {
  /** 校正后用于排盘的小时 0-23；若跨日会反映在 dateShift */
  hour: number
  /** 校正后分钟 */
  minute: number
  /** 相对原公历日的偏移（-1/0/1） */
  dateShift: number
  /** 总校正分钟（经度+均时差+夏令时） */
  totalMinutes: number
  /** 说明文案 */
  note: string
}

/**
 * 均时差近似（分钟）：简化傅里叶，教学够用。
 * @param month 公历月
 * @param day 公历日
 */
export function equationOfTimeMinutes(month: number, day: number): number {
  const dayOfYear =
    [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334][month - 1] + day
  const b = ((2 * Math.PI) / 365) * (dayOfYear - 81)
  return 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b)
}

/**
 * 由当地民用钟面时间推真太阳时（或平太阳时）。
 * 经度差相对「该时区标准经线」utcOffset×15°，国内默认东八区 120°E。
 * @param clockHour 当地钟面时 0-23
 * @param clockMinute 当地钟面分
 * @param longitude 出生地东经（西经为负）
 * @param options 均时差/夏令时/月日/UTC 偏移
 */
export function adjustToSolarTime(
  clockHour: number,
  clockMinute: number,
  longitude: number,
  options: {
    useEquationOfTime?: boolean
    daylightSaving?: boolean
    month?: number
    day?: number
    /** 民用 UTC 偏移小时；缺省按东八区 8 */
    utcOffset?: number
  } = {}
): SolarTimeAdjust {
  let total = 0
  const parts: string[] = []
  const utcOffset = typeof options.utcOffset === 'number' ? options.utcOffset : 8
  const meridian = standardMeridianOf(utcOffset)

  if (options.daylightSaving) {
    total -= 60
    parts.push('夏令时-60分')
  }

  const lonDelta = (longitude - meridian) * 4
  total += lonDelta
  parts.push(`经度差(相对UTC${utcOffset >= 0 ? '+' : ''}${utcOffset})${lonDelta >= 0 ? '+' : ''}${lonDelta.toFixed(1)}分`)

  if (options.useEquationOfTime && options.month && options.day) {
    const eot = equationOfTimeMinutes(options.month, options.day)
    total += eot
    parts.push(`均时差${eot >= 0 ? '+' : ''}${eot.toFixed(1)}分`)
  }

  const clockTotal = clockHour * 60 + clockMinute + total
  let dayShift = 0
  let mins = clockTotal
  while (mins < 0) {
    mins += 24 * 60
    dayShift -= 1
  }
  while (mins >= 24 * 60) {
    mins -= 24 * 60
    dayShift += 1
  }

  const hour = Math.floor(mins / 60)
  let minute = Math.round(mins % 60)
  if (minute === 60) {
    minute = 0
  }

  return {
    hour,
    minute,
    dateShift: dayShift,
    totalMinutes: Math.round(total * 10) / 10,
    note:
      `真太阳时校正：${parts.join('，')}；合计 ${total >= 0 ? '+' : ''}${total.toFixed(1)} 分钟` +
      (dayShift !== 0 ? `（跨日 ${dayShift > 0 ? '+' : ''}${dayShift}）` : '')
  }
}

/**
 * 公历日期加减天数。
 * @param y 年
 * @param m 月
 * @param d 日
 * @param shift 天数偏移
 */
export function shiftSolarDate(
  y: number,
  m: number,
  d: number,
  shift: number
): { year: number; month: number; day: number } {
  const dt = new Date(y, m - 1, d + shift)
  return { year: dt.getFullYear(), month: dt.getMonth() + 1, day: dt.getDate() }
}
