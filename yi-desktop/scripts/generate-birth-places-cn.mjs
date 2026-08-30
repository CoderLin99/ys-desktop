/**
 * 从 @province-city-china/level（GB/T 2260）生成国内省→市→区出生地表。
 * 经度：优先复用 solarTime 旧表中的精确值；区县缺省继承地级市；市缺省用省会。
 *
 * 用法：node scripts/generate-birth-places-cn.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import level from '@province-city-china/level'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const outPath = path.join(root, 'src/renderer/src/rules/bazi/tables/birthPlacesCn.json')
const solarPath = path.join(root, 'src/renderer/src/rules/bazi/solarTime.ts')

/** 省会经度兜底（市表缺漏时） */
const PROVINCE_CAPITAL_LON = {
  北京: [116.41, 39.9],
  天津: [117.2, 39.13],
  河北: [114.51, 38.04],
  山西: [112.55, 37.87],
  内蒙古: [111.75, 40.84],
  辽宁: [123.43, 41.8],
  吉林: [125.32, 43.88],
  黑龙江: [126.53, 45.8],
  上海: [121.47, 31.23],
  江苏: [118.8, 32.06],
  浙江: [120.15, 30.28],
  安徽: [117.28, 31.86],
  福建: [119.3, 26.08],
  江西: [115.86, 28.68],
  山东: [117.0, 36.65],
  河南: [113.65, 34.76],
  湖北: [114.31, 30.52],
  湖南: [112.98, 28.19],
  广东: [113.26, 23.13],
  广西: [108.37, 22.82],
  海南: [110.35, 20.02],
  重庆: [106.55, 29.56],
  四川: [104.07, 30.67],
  贵州: [106.71, 26.57],
  云南: [102.71, 25.04],
  西藏: [91.11, 29.97],
  陕西: [108.94, 34.34],
  甘肃: [103.83, 36.06],
  青海: [101.78, 36.62],
  宁夏: [106.23, 38.49],
  新疆: [87.62, 43.79],
  香港: [114.17, 22.32],
  澳门: [113.54, 22.2],
  台湾: [121.56, 25.04]
}

/**
 * 省级短名：去掉省/市/自治区等后缀。
 * @param {string} name
 */
function shortProvince(name) {
  return name
    .replace(/维吾尔自治区$/, '')
    .replace(/壮族自治区$/, '')
    .replace(/回族自治区$/, '')
    .replace(/自治区$/, '')
    .replace(/特别行政区$/, '')
    .replace(/省$/, '')
    .replace(/市$/, '')
}

/**
 * 地级短名。
 * @param {string} name
 */
function shortCity(name) {
  let n = name
    .replace(/各行政区划$/, '')
    .replace(/自治区直辖县级行政区划$/, '')
    .replace(/省直辖县级行政区划$/, '')
  // 「海南省-自治区直辖…」类占位名
  if (n.includes('直辖') || n.includes('行政区划')) return '省直辖'
  n = n
    .replace(/朝鲜族自治州$/, '')
    .replace(/藏族羌族自治州$/, '')
    .replace(/藏族自治州$/, '')
    .replace(/彝族自治州$/, '')
    .replace(/回族自治州$/, '')
    .replace(/蒙古族藏族自治州$/, '')
    .replace(/哈萨克自治州$/, '')
    .replace(/柯尔克孜自治州$/, '')
    .replace(/傣族自治州$/, '')
    .replace(/白族自治州$/, '')
    .replace(/傈僳族自治州$/, '')
    .replace(/景颇族自治州$/, '')
    .replace(/壮族苗族自治州$/, '')
    .replace(/苗族侗族自治州$/, '')
    .replace(/布依族苗族自治州$/, '')
    .replace(/土家族苗族自治州$/, '')
    .replace(/自治州$/, '')
    .replace(/地区$/, '')
    .replace(/盟$/, '')
    .replace(/市$/, '')
  return n
}

/**
 * 区县短名（与现有 UI 一致：泉港区→泉港；滨海新区保留）。
 * @param {string} name
 */
function shortDistrict(name) {
  if (/新区$|风景名胜区$/.test(name)) return name
  if (/林区$|矿区$|特区$/.test(name)) return name.replace(/区$/, '')
  return name
    .replace(/自治县$/, '')
    .replace(/各族自治县$/, '')
    .replace(/县$/, '')
    .replace(/区$/, '')
    .replace(/自治旗$/, '')
    .replace(/旗$/, '')
    .replace(/市$/, '')
}

/**
 * 经纬度种子：优先已有 birthPlacesCn.json，其次旧 solarTime 硬编码（迁移期）。
 * @returns {Map<string, { lon: number, lat?: number }>}
 */
function loadLonSeed() {
  /** @type {Map<string, { lon: number, lat?: number }>} */
  const map = new Map()

  /**
   * @param {string} province
   * @param {string} [city]
   * @param {string} name
   * @param {number} lon
   * @param {number} [lat]
   */
  function put(province, city, name, lon, lat) {
    const full = `${province}|${city ?? ''}|${name}`
    map.set(full, { lon, lat })
    if (!city) map.set(`${province}|${name}`, { lon, lat })
  }

  if (fs.existsSync(outPath)) {
    try {
      const prev = JSON.parse(fs.readFileSync(outPath, 'utf8'))
      for (const r of prev.places || []) {
        put(r.p, r.c, r.n, r.lo, r.la)
      }
    } catch {
      /* ignore corrupt prev */
    }
  }

  if (fs.existsSync(solarPath)) {
    const text = fs.readFileSync(solarPath, 'utf8')
    const re =
      /\{\s*name:\s*'([^']+)',\s*province:\s*'([^']+)'(?:,\s*city:\s*'([^']+)')?,\s*longitude:\s*(-?[0-9.]+)(?:,\s*latitude:\s*(-?[0-9.]+))?(?:,\s*scope:\s*'intl')?/g
    let m
    while ((m = re.exec(text))) {
      if (m[0].includes("scope: 'intl'")) continue
      put(m[2], m[3], m[1], Number(m[4]), m[5] ? Number(m[5]) : undefined)
    }
  }
  return map
}

/**
 * 查经纬度：精确 → 市本级 → 省会。
 * @param {Map<string, { lon: number, lat?: number }>} seed
 * @param {string} province
 * @param {string} [city]
 * @param {string} [name]
 */
function lookupCoord(seed, province, city, name) {
  if (name) {
    const hit =
      seed.get(`${province}|${city ?? ''}|${name}`) ||
      seed.get(`${province}|${city}|${name}`) ||
      seed.get(`${province}||${name}`)
    if (hit) return hit
  }
  if (city) {
    const hit = seed.get(`${province}||${city}`) || seed.get(`${province}|${city}`)
    if (hit) return hit
  }
  const cap = PROVINCE_CAPITAL_LON[province]
  if (cap) return { lon: cap[0], lat: cap[1] }
  return { lon: 116.4, lat: 39.9 }
}

/**
 * 写入一条出生地（压缩字段：n/p/c/lo/la）。
 * @param {object[]} out
 * @param {{ name: string, province: string, city?: string, lon: number, lat?: number }} row
 */
function pushPlace(out, row) {
  /** @type {Record<string, unknown>} */
  const item = { n: row.name, p: row.province, lo: Number(row.lon.toFixed(4)) }
  if (row.city) item.c = row.city
  if (typeof row.lat === 'number' && Number.isFinite(row.lat)) {
    item.la = Number(row.lat.toFixed(4))
  }
  out.push(item)
}

/**
 * 台湾无 GB 区划树：保留手工常用市。
 * @param {object[]} out
 * @param {Map<string, { lon: number, lat?: number }>} seed
 */
function appendTaiwan(out, seed) {
  const cities = ['台北', '新北', '桃园', '台中', '台南', '高雄', '新竹', '嘉义', '基隆', '宜兰', '花莲', '台东', '澎湖']
  for (const name of cities) {
    const coord = lookupCoord(seed, '台湾', undefined, name)
    pushPlace(out, { name, province: '台湾', lon: coord.lon, lat: coord.lat })
  }
}

/**
 * 主生成逻辑。
 */
function main() {
  const seed = loadLonSeed()
  /** @type {object[]} */
  const out = []
  const data = Array.isArray(level) ? level : level.default || level

  for (const prov of data) {
    const province = shortProvince(prov.name)
    // 台湾单独手工；level 里常为空
    if (province === '台湾') continue

    const children = prov.children || []
    const isMunicipality = ['北京', '天津', '上海', '重庆'].includes(province)

    if (isMunicipality || children.every((c) => !(c.children && c.children.length))) {
      // 直辖市 / 港澳：子节点即区县
      const cityName = province
      const cityCoord = lookupCoord(seed, province, undefined, cityName)
      pushPlace(out, {
        name: cityName,
        province,
        lon: cityCoord.lon,
        lat: cityCoord.lat
      })
      for (const dist of children) {
        // 跳过无意义占位
        if (!dist.name || dist.name.includes('行政区划')) continue
        const dName = shortDistrict(dist.name)
        // 「市辖区」短名会变成「市辖」，无实际区划意义
        if (!dName || dName === cityName || dName === '市辖') continue
        const coord = lookupCoord(seed, province, cityName, dName)
        // 区县无精确坐标时继承市
        const use = seed.has(`${province}|${cityName}|${dName}`)
          ? coord
          : cityCoord
        pushPlace(out, {
          name: dName,
          province,
          city: cityName,
          lon: use.lon,
          lat: use.lat
        })
      }
      continue
    }

    for (const cityNode of children) {
      const rawCity = cityNode.name || ''
      // 省直辖县级：把子县当作「省直辖」下的区县
      const cityName = shortCity(rawCity)
      if (!cityName) continue

      const dists = cityNode.children || []
      const cityCoord = lookupCoord(seed, province, undefined, cityName)

      // 市本级（全市）
      pushPlace(out, {
        name: cityName,
        province,
        lon: cityCoord.lon,
        lat: cityCoord.lat
      })

      for (const dist of dists) {
        if (!dist.name) continue
        const dName = shortDistrict(dist.name)
        if (!dName || dName === '市辖') continue
        // 与市同名的市辖区跳过（少见）
        if (dName === cityName && dists.length > 1) continue
        const exact = seed.get(`${province}|${cityName}|${dName}`)
        const coord = exact || cityCoord
        pushPlace(out, {
          name: dName,
          province,
          city: cityName,
          lon: coord.lon,
          lat: coord.lat
        })
      }
    }
  }

  appendTaiwan(out, seed)

  const payload = {
    _meta: {
      source: '@province-city-china/level',
      generatedAt: new Date().toISOString().slice(0, 10),
      count: out.length,
      note: 'n=name p=province c=city lo=longitude la=latitude；区县缺经度继承地级市'
    },
    places: out
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, JSON.stringify(payload), 'utf8')
  const cities = out.filter((p) => !p.c).length
  const districts = out.filter((p) => p.c).length
  console.log(
    `Wrote ${out.length} places (${cities} cities, ${districts} districts) → ${path.relative(root, outPath)}`
  )
}

main()
