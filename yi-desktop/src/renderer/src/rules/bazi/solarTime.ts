/**
 * 出生地与真太阳时（教学近似）。
 *
 * 规则：
 * - 北京时间按东经 120° 计
 * - 经度差每 1° ≈ 4 分钟；东加西减
 * - 「真太阳时」另加均时差方程近似（可选）
 * - 夏令时：勾选则钟面时间先减 1 小时再校正（中国 1986–1991 曾用）
 */

/** 国内 / 国外 */
export type BirthPlaceScope = 'cn' | 'intl'

/** 常用城市经度（东经为正，西经为负） */
export interface BirthPlace {
  /** 展示名（市） */
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

/**
 * 内置出生地：覆盖各省会、计划单列市与常见地级市（经度为市区近似中心）。
 * 找不到时请选「自定义经度」手工填写。
 */
export const BIRTH_PLACES: BirthPlace[] = [
  // 华北
  { name: '北京', province: '北京', longitude: 116.41, latitude: 39.9 },
  { name: '天津', province: '天津', longitude: 117.2, latitude: 39.13 },
  { name: '石家庄', province: '河北', longitude: 114.51 },
  { name: '唐山', province: '河北', longitude: 118.18 },
  { name: '秦皇岛', province: '河北', longitude: 119.6 },
  { name: '邯郸', province: '河北', longitude: 114.49 },
  { name: '保定', province: '河北', longitude: 115.46 },
  { name: '张家口', province: '河北', longitude: 114.88 },
  { name: '承德', province: '河北', longitude: 117.96 },
  { name: '沧州', province: '河北', longitude: 116.86 },
  { name: '廊坊', province: '河北', longitude: 116.7 },
  { name: '衡水', province: '河北', longitude: 115.67 },
  { name: '太原', province: '山西', longitude: 112.55 },
  { name: '大同', province: '山西', longitude: 113.3 },
  { name: '阳泉', province: '山西', longitude: 113.58 },
  { name: '长治', province: '山西', longitude: 113.12 },
  { name: '晋城', province: '山西', longitude: 112.85 },
  { name: '朔州', province: '山西', longitude: 112.43 },
  { name: '晋中', province: '山西', longitude: 112.75 },
  { name: '运城', province: '山西', longitude: 111.01 },
  { name: '忻州', province: '山西', longitude: 112.73 },
  { name: '临汾', province: '山西', longitude: 111.52 },
  { name: '吕梁', province: '山西', longitude: 111.14 },
  { name: '呼和浩特', province: '内蒙古', longitude: 111.75 },
  { name: '包头', province: '内蒙古', longitude: 109.84 },
  { name: '乌海', province: '内蒙古', longitude: 106.83 },
  { name: '赤峰', province: '内蒙古', longitude: 118.89 },
  { name: '通辽', province: '内蒙古', longitude: 122.26 },
  { name: '鄂尔多斯', province: '内蒙古', longitude: 109.99 },
  { name: '呼伦贝尔', province: '内蒙古', longitude: 119.77 },
  { name: '巴彦淖尔', province: '内蒙古', longitude: 107.39 },
  { name: '乌兰察布', province: '内蒙古', longitude: 113.11 },
  // 东北
  { name: '沈阳', province: '辽宁', longitude: 123.43 },
  { name: '大连', province: '辽宁', longitude: 121.62 },
  { name: '鞍山', province: '辽宁', longitude: 122.99 },
  { name: '抚顺', province: '辽宁', longitude: 123.96 },
  { name: '本溪', province: '辽宁', longitude: 123.77 },
  { name: '丹东', province: '辽宁', longitude: 124.38 },
  { name: '锦州', province: '辽宁', longitude: 121.14 },
  { name: '营口', province: '辽宁', longitude: 122.24 },
  { name: '阜新', province: '辽宁', longitude: 121.67 },
  { name: '辽阳', province: '辽宁', longitude: 123.17 },
  { name: '盘锦', province: '辽宁', longitude: 122.07 },
  { name: '铁岭', province: '辽宁', longitude: 123.84 },
  { name: '朝阳', province: '辽宁', longitude: 120.45 },
  { name: '葫芦岛', province: '辽宁', longitude: 120.84 },
  { name: '长春', province: '吉林', longitude: 125.32 },
  { name: '吉林市', province: '吉林', longitude: 126.55 },
  { name: '四平', province: '吉林', longitude: 124.37 },
  { name: '辽源', province: '吉林', longitude: 125.14 },
  { name: '通化', province: '吉林', longitude: 125.94 },
  { name: '白山', province: '吉林', longitude: 126.43 },
  { name: '松原', province: '吉林', longitude: 124.82 },
  { name: '白城', province: '吉林', longitude: 122.84 },
  { name: '延吉', province: '吉林', longitude: 129.51 },
  { name: '哈尔滨', province: '黑龙江', longitude: 126.53 },
  { name: '齐齐哈尔', province: '黑龙江', longitude: 123.92 },
  { name: '鸡西', province: '黑龙江', longitude: 130.98 },
  { name: '鹤岗', province: '黑龙江', longitude: 130.28 },
  { name: '双鸭山', province: '黑龙江', longitude: 131.16 },
  { name: '大庆', province: '黑龙江', longitude: 125.1 },
  { name: '伊春', province: '黑龙江', longitude: 128.9 },
  { name: '佳木斯', province: '黑龙江', longitude: 130.36 },
  { name: '七台河', province: '黑龙江', longitude: 131.02 },
  { name: '牡丹江', province: '黑龙江', longitude: 129.62 },
  { name: '黑河', province: '黑龙江', longitude: 127.5 },
  { name: '绥化', province: '黑龙江', longitude: 126.99 },
  // 华东
  { name: '上海', province: '上海', longitude: 121.47 },
  { name: '南京', province: '江苏', longitude: 118.8 },
  { name: '无锡', province: '江苏', longitude: 120.31 },
  { name: '徐州', province: '江苏', longitude: 117.28 },
  { name: '常州', province: '江苏', longitude: 119.95 },
  { name: '苏州', province: '江苏', longitude: 120.62 },
  { name: '南通', province: '江苏', longitude: 120.86 },
  { name: '连云港', province: '江苏', longitude: 119.18 },
  { name: '淮安', province: '江苏', longitude: 119.02 },
  { name: '盐城', province: '江苏', longitude: 120.14 },
  { name: '扬州', province: '江苏', longitude: 119.42 },
  { name: '镇江', province: '江苏', longitude: 119.45 },
  { name: '泰州', province: '江苏', longitude: 119.92 },
  { name: '宿迁', province: '江苏', longitude: 118.28 },
  { name: '杭州', province: '浙江', longitude: 120.15 },
  { name: '宁波', province: '浙江', longitude: 121.55 },
  { name: '温州', province: '浙江', longitude: 120.7 },
  { name: '嘉兴', province: '浙江', longitude: 120.76 },
  { name: '湖州', province: '浙江', longitude: 120.1 },
  { name: '绍兴', province: '浙江', longitude: 120.58 },
  { name: '金华', province: '浙江', longitude: 119.65 },
  { name: '衢州', province: '浙江', longitude: 118.87 },
  { name: '舟山', province: '浙江', longitude: 122.11 },
  { name: '台州', province: '浙江', longitude: 121.42 },
  { name: '丽水', province: '浙江', longitude: 119.92 },
  { name: '合肥', province: '安徽', longitude: 117.23 },
  { name: '芜湖', province: '安徽', longitude: 118.38 },
  { name: '蚌埠', province: '安徽', longitude: 117.39 },
  { name: '淮南', province: '安徽', longitude: 117.02 },
  { name: '马鞍山', province: '安徽', longitude: 118.51 },
  { name: '淮北', province: '安徽', longitude: 116.8 },
  { name: '铜陵', province: '安徽', longitude: 117.81 },
  { name: '安庆', province: '安徽', longitude: 117.05 },
  { name: '黄山', province: '安徽', longitude: 118.32 },
  { name: '滁州', province: '安徽', longitude: 118.32 },
  { name: '阜阳', province: '安徽', longitude: 115.81 },
  { name: '宿州', province: '安徽', longitude: 116.98 },
  { name: '六安', province: '安徽', longitude: 116.51 },
  { name: '亳州', province: '安徽', longitude: 115.78 },
  { name: '池州', province: '安徽', longitude: 117.49 },
  { name: '宣城', province: '安徽', longitude: 118.76 },
  { name: '福州', province: '福建', longitude: 119.3 },
  { name: '厦门', province: '福建', longitude: 118.09 },
  { name: '莆田', province: '福建', longitude: 119.01 },
  { name: '三明', province: '福建', longitude: 117.64 },
  { name: '泉州', province: '福建', longitude: 118.59 },
  { name: '漳州', province: '福建', longitude: 117.65 },
  { name: '南平', province: '福建', longitude: 118.18 },
  { name: '龙岩', province: '福建', longitude: 117.02 },
  { name: '宁德', province: '福建', longitude: 119.53 },
  { name: '南昌', province: '江西', longitude: 115.86 },
  { name: '景德镇', province: '江西', longitude: 117.18 },
  { name: '萍乡', province: '江西', longitude: 113.85 },
  { name: '九江', province: '江西', longitude: 116.0 },
  { name: '新余', province: '江西', longitude: 114.92 },
  { name: '鹰潭', province: '江西', longitude: 117.07 },
  { name: '赣州', province: '江西', longitude: 114.93 },
  { name: '吉安', province: '江西', longitude: 114.99 },
  { name: '宜春', province: '江西', longitude: 114.39 },
  { name: '抚州', province: '江西', longitude: 116.36 },
  { name: '上饶', province: '江西', longitude: 117.97 },
  { name: '济南', province: '山东', longitude: 117.0 },
  { name: '青岛', province: '山东', longitude: 120.38 },
  { name: '淄博', province: '山东', longitude: 118.05 },
  { name: '枣庄', province: '山东', longitude: 117.56 },
  { name: '东营', province: '山东', longitude: 118.67 },
  { name: '烟台', province: '山东', longitude: 121.45 },
  { name: '潍坊', province: '山东', longitude: 119.16 },
  { name: '济宁', province: '山东', longitude: 116.59 },
  { name: '泰安', province: '山东', longitude: 117.09 },
  { name: '威海', province: '山东', longitude: 122.12 },
  { name: '日照', province: '山东', longitude: 119.53 },
  { name: '临沂', province: '山东', longitude: 118.36 },
  { name: '德州', province: '山东', longitude: 116.36 },
  { name: '聊城', province: '山东', longitude: 115.99 },
  { name: '滨州', province: '山东', longitude: 117.97 },
  { name: '菏泽', province: '山东', longitude: 115.48 },
  // 华中
  { name: '郑州', province: '河南', longitude: 113.63 },
  { name: '开封', province: '河南', longitude: 114.34 },
  { name: '洛阳', province: '河南', longitude: 112.45 },
  { name: '平顶山', province: '河南', longitude: 113.19 },
  { name: '安阳', province: '河南', longitude: 114.35 },
  { name: '鹤壁', province: '河南', longitude: 114.3 },
  { name: '新乡', province: '河南', longitude: 113.88 },
  { name: '焦作', province: '河南', longitude: 113.24 },
  { name: '濮阳', province: '河南', longitude: 115.03 },
  { name: '许昌', province: '河南', longitude: 113.83 },
  { name: '漯河', province: '河南', longitude: 114.02 },
  { name: '三门峡', province: '河南', longitude: 111.19 },
  { name: '南阳', province: '河南', longitude: 112.54 },
  { name: '商丘', province: '河南', longitude: 115.65 },
  { name: '信阳', province: '河南', longitude: 114.08 },
  { name: '周口', province: '河南', longitude: 114.7 },
  { name: '驻马店', province: '河南', longitude: 114.02 },
  { name: '武汉', province: '湖北', longitude: 114.31 },
  { name: '黄石', province: '湖北', longitude: 115.04 },
  { name: '十堰', province: '湖北', longitude: 110.8 },
  { name: '宜昌', province: '湖北', longitude: 111.29 },
  { name: '襄阳', province: '湖北', longitude: 112.14 },
  { name: '鄂州', province: '湖北', longitude: 114.89 },
  { name: '荆门', province: '湖北', longitude: 112.2 },
  { name: '孝感', province: '湖北', longitude: 113.92 },
  { name: '荆州', province: '湖北', longitude: 112.24 },
  { name: '黄冈', province: '湖北', longitude: 114.88 },
  { name: '咸宁', province: '湖北', longitude: 114.32 },
  { name: '随州', province: '湖北', longitude: 113.38 },
  { name: '恩施', province: '湖北', longitude: 109.49 },
  { name: '长沙', province: '湖南', longitude: 112.98 },
  { name: '株洲', province: '湖南', longitude: 113.13 },
  { name: '湘潭', province: '湖南', longitude: 112.94 },
  { name: '衡阳', province: '湖南', longitude: 112.61 },
  { name: '邵阳', province: '湖南', longitude: 111.47 },
  { name: '岳阳', province: '湖南', longitude: 113.13 },
  { name: '常德', province: '湖南', longitude: 111.69 },
  { name: '张家界', province: '湖南', longitude: 110.48 },
  { name: '益阳', province: '湖南', longitude: 112.36 },
  { name: '郴州', province: '湖南', longitude: 113.03 },
  { name: '永州', province: '湖南', longitude: 111.61 },
  { name: '怀化', province: '湖南', longitude: 110.0 },
  { name: '娄底', province: '湖南', longitude: 112.0 },
  { name: '吉首', province: '湖南', longitude: 109.7 },
  // 华南
  { name: '广州', province: '广东', longitude: 113.26 },
  { name: '韶关', province: '广东', longitude: 113.6 },
  { name: '深圳', province: '广东', longitude: 114.06 },
  { name: '珠海', province: '广东', longitude: 113.58 },
  { name: '汕头', province: '广东', longitude: 116.68 },
  { name: '佛山', province: '广东', longitude: 113.12 },
  { name: '江门', province: '广东', longitude: 113.09 },
  { name: '湛江', province: '广东', longitude: 110.36 },
  { name: '茂名', province: '广东', longitude: 110.93 },
  { name: '肇庆', province: '广东', longitude: 112.47 },
  { name: '惠州', province: '广东', longitude: 114.42 },
  { name: '梅州', province: '广东', longitude: 116.12 },
  { name: '汕尾', province: '广东', longitude: 115.36 },
  { name: '河源', province: '广东', longitude: 114.7 },
  { name: '阳江', province: '广东', longitude: 111.98 },
  { name: '清远', province: '广东', longitude: 113.05 },
  { name: '东莞', province: '广东', longitude: 113.75 },
  { name: '中山', province: '广东', longitude: 113.39 },
  { name: '潮州', province: '广东', longitude: 116.63 },
  { name: '揭阳', province: '广东', longitude: 116.37 },
  { name: '云浮', province: '广东', longitude: 112.04 },
  { name: '南宁', province: '广西', longitude: 108.37 },
  { name: '柳州', province: '广西', longitude: 109.41 },
  { name: '桂林', province: '广西', longitude: 110.29 },
  { name: '梧州', province: '广西', longitude: 111.28 },
  { name: '北海', province: '广西', longitude: 109.12 },
  { name: '防城港', province: '广西', longitude: 108.35 },
  { name: '钦州', province: '广西', longitude: 108.62 },
  { name: '贵港', province: '广西', longitude: 109.6 },
  { name: '玉林', province: '广西', longitude: 110.15 },
  { name: '百色', province: '广西', longitude: 106.62 },
  { name: '贺州', province: '广西', longitude: 111.55 },
  { name: '河池', province: '广西', longitude: 108.09 },
  { name: '来宾', province: '广西', longitude: 109.23 },
  { name: '崇左', province: '广西', longitude: 107.37 },
  { name: '海口', province: '海南', longitude: 110.35 },
  { name: '三亚', province: '海南', longitude: 109.51 },
  { name: '三沙', province: '海南', longitude: 112.35 },
  { name: '儋州', province: '海南', longitude: 109.58 },
  // 西南
  { name: '重庆', province: '重庆', longitude: 106.55 },
  { name: '成都', province: '四川', longitude: 104.07 },
  { name: '自贡', province: '四川', longitude: 104.78 },
  { name: '攀枝花', province: '四川', longitude: 101.72 },
  { name: '泸州', province: '四川', longitude: 105.44 },
  { name: '德阳', province: '四川', longitude: 104.4 },
  { name: '绵阳', province: '四川', longitude: 104.74 },
  { name: '广元', province: '四川', longitude: 105.84 },
  { name: '遂宁', province: '四川', longitude: 105.57 },
  { name: '内江', province: '四川', longitude: 105.06 },
  { name: '乐山', province: '四川', longitude: 103.77 },
  { name: '南充', province: '四川', longitude: 106.11 },
  { name: '眉山', province: '四川', longitude: 103.85 },
  { name: '宜宾', province: '四川', longitude: 104.64 },
  { name: '广安', province: '四川', longitude: 106.63 },
  { name: '达州', province: '四川', longitude: 107.5 },
  { name: '雅安', province: '四川', longitude: 103.04 },
  { name: '巴中', province: '四川', longitude: 106.75 },
  { name: '资阳', province: '四川', longitude: 104.64 },
  { name: '西昌', province: '四川', longitude: 102.26 },
  { name: '康定', province: '四川', longitude: 101.96 },
  { name: '马尔康', province: '四川', longitude: 102.22 },
  { name: '贵阳', province: '贵州', longitude: 106.71 },
  { name: '六盘水', province: '贵州', longitude: 104.85 },
  { name: '遵义', province: '贵州', longitude: 106.93 },
  { name: '安顺', province: '贵州', longitude: 105.95 },
  { name: '毕节', province: '贵州', longitude: 105.29 },
  { name: '铜仁', province: '贵州', longitude: 109.19 },
  { name: '兴义', province: '贵州', longitude: 104.9 },
  { name: '凯里', province: '贵州', longitude: 107.98 },
  { name: '都匀', province: '贵州', longitude: 107.52 },
  { name: '昆明', province: '云南', longitude: 102.71 },
  { name: '曲靖', province: '云南', longitude: 103.8 },
  { name: '玉溪', province: '云南', longitude: 102.55 },
  { name: '保山', province: '云南', longitude: 99.17 },
  { name: '昭通', province: '云南', longitude: 103.72 },
  { name: '丽江', province: '云南', longitude: 100.23 },
  { name: '普洱', province: '云南', longitude: 100.97 },
  { name: '临沧', province: '云南', longitude: 100.09 },
  { name: '楚雄', province: '云南', longitude: 101.55 },
  { name: '个旧', province: '云南', longitude: 103.16 },
  { name: '文山', province: '云南', longitude: 104.24 },
  { name: '景洪', province: '云南', longitude: 100.8 },
  { name: '大理', province: '云南', longitude: 100.24 },
  { name: '芒市', province: '云南', longitude: 98.59 },
  { name: '泸水', province: '云南', longitude: 98.86 },
  { name: '香格里拉', province: '云南', longitude: 99.71 },
  { name: '拉萨', province: '西藏', longitude: 91.11 },
  { name: '日喀则', province: '西藏', longitude: 88.88 },
  { name: '昌都', province: '西藏', longitude: 97.18 },
  { name: '林芝', province: '西藏', longitude: 94.36 },
  { name: '山南', province: '西藏', longitude: 91.77 },
  { name: '那曲', province: '西藏', longitude: 92.06 },
  // 西北
  { name: '西安', province: '陕西', longitude: 108.94 },
  { name: '铜川', province: '陕西', longitude: 108.98 },
  { name: '宝鸡', province: '陕西', longitude: 107.24 },
  { name: '咸阳', province: '陕西', longitude: 108.71 },
  { name: '渭南', province: '陕西', longitude: 109.49 },
  { name: '延安', province: '陕西', longitude: 109.49 },
  { name: '汉中', province: '陕西', longitude: 107.03 },
  { name: '榆林', province: '陕西', longitude: 109.74 },
  { name: '安康', province: '陕西', longitude: 109.03 },
  { name: '商洛', province: '陕西', longitude: 109.94 },
  { name: '兰州', province: '甘肃', longitude: 103.83 },
  { name: '嘉峪关', province: '甘肃', longitude: 98.28 },
  { name: '金昌', province: '甘肃', longitude: 102.19 },
  { name: '白银', province: '甘肃', longitude: 104.17 },
  { name: '天水', province: '甘肃', longitude: 105.72 },
  { name: '武威', province: '甘肃', longitude: 102.64 },
  { name: '张掖', province: '甘肃', longitude: 100.46 },
  { name: '平凉', province: '甘肃', longitude: 106.68 },
  { name: '酒泉', province: '甘肃', longitude: 98.51 },
  { name: '庆阳', province: '甘肃', longitude: 107.64 },
  { name: '定西', province: '甘肃', longitude: 104.63 },
  { name: '陇南', province: '甘肃', longitude: 104.92 },
  { name: '临夏', province: '甘肃', longitude: 103.21 },
  { name: '合作', province: '甘肃', longitude: 102.91 },
  { name: '西宁', province: '青海', longitude: 101.78 },
  { name: '海东', province: '青海', longitude: 102.1 },
  { name: '海晏', province: '青海', longitude: 100.9 },
  { name: '银川', province: '宁夏', longitude: 106.23 },
  { name: '石嘴山', province: '宁夏', longitude: 106.38 },
  { name: '吴忠', province: '宁夏', longitude: 106.2 },
  { name: '固原', province: '宁夏', longitude: 106.29 },
  { name: '中卫', province: '宁夏', longitude: 105.19 },
  { name: '乌鲁木齐', province: '新疆', longitude: 87.62 },
  { name: '克拉玛依', province: '新疆', longitude: 84.87 },
  { name: '吐鲁番', province: '新疆', longitude: 89.19 },
  { name: '哈密', province: '新疆', longitude: 93.51 },
  { name: '昌吉', province: '新疆', longitude: 87.31 },
  { name: '博乐', province: '新疆', longitude: 82.07 },
  { name: '库尔勒', province: '新疆', longitude: 86.15 },
  { name: '阿克苏', province: '新疆', longitude: 80.26 },
  { name: '阿图什', province: '新疆', longitude: 76.17 },
  { name: '喀什', province: '新疆', longitude: 75.99 },
  { name: '和田', province: '新疆', longitude: 79.93 },
  { name: '伊宁', province: '新疆', longitude: 81.32 },
  { name: '塔城', province: '新疆', longitude: 82.98 },
  { name: '阿勒泰', province: '新疆', longitude: 88.14 },
  { name: '石河子', province: '新疆', longitude: 86.04 },
  // 港澳台
  { name: '香港', province: '香港', longitude: 114.17 },
  { name: '澳门', province: '澳门', longitude: 113.54 },
  { name: '台北', province: '台湾', longitude: 121.56 },
  { name: '高雄', province: '台湾', longitude: 120.31 },
  { name: '台中', province: '台湾', longitude: 120.67 },
  { name: '台南', province: '台湾', longitude: 120.21 },
  { name: '新竹', province: '台湾', longitude: 120.97 },
  { name: '嘉义', province: '台湾', longitude: 120.45 },
  // —— 国外主要城市（东经正 / 西经负；province=国家或地区）——
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
  { name: '奥克兰', province: '新西兰', longitude: 174.76, latitude: -36.85, scope: 'intl', utcOffset: 12, aliases: ['Auckland'] }
]

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
      (p.aliases?.some((a) => a.toLowerCase().includes(q)) ?? false)
  )
}

/**
 * 根据搜索词自动挑选最合适的出生地（用于输入时联动下拉）。
 * 优先：市名全等 → 市名以关键词开头 → 省/国家全等 → 过滤列表首条。
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
  const exactName = list.find((p) => p.name.toLowerCase() === lower)
  if (exactName) return exactName
  const nameStarts = list.find((p) => p.name.toLowerCase().startsWith(lower))
  if (nameStarts) return nameStarts
  const exactProvince = list.find((p) => p.province.toLowerCase() === lower)
  if (exactProvince) return exactProvince
  return list[0]
}

/**
 * 下拉展示名：省/国家 · 市（国外附 UTC）
 * @param p 出生地
 */
export function formatPlaceLabel(p: BirthPlace): string {
  const base = p.province === p.name ? p.name : `${p.province} · ${p.name}`
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
