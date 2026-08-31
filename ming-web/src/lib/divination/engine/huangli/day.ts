/**
 * 黄历日盘：基于 lunar-javascript 的宜忌、冲煞、神煞与干支信息。
 */
import { Solar } from 'lunar-javascript'

/** 黄历日结果 */
export interface HuangliDay {
  /** 公历 Y-M-D */
  solarLabel: string
  /** 农历中文 */
  lunarLabel: string
  /** 年干支 */
  yearGz: string
  /** 月干支 */
  monthGz: string
  /** 日干支 */
  dayGz: string
  /** 年纳音 */
  yearNaYin: string
  /** 月纳音 */
  monthNaYin: string
  /** 日纳音 */
  dayNaYin: string
  /** 宜 */
  yi: string[]
  /** 忌 */
  ji: string[]
  /** 冲（地支） */
  chong: string
  /** 冲描述 */
  chongDesc: string
  /** 煞方 */
  sha: string
  /** 值神 */
  tianShen: string
  /** 黄道/黑道 */
  tianShenType: string
  /** 值神吉凶 */
  tianShenLuck: string
  /** 吉神 */
  jiShen: string[]
  /** 凶煞 */
  xiongSha: string[]
  /** 彭祖百忌·干 */
  pengZuGan: string
  /** 彭祖百忌·支 */
  pengZuZhi: string
  /** 二十八宿 */
  xiu: string
  /** 宿吉凶 */
  xiuLuck: string
  /** 宿歌 */
  xiuSong: string
  /** 建除十二神 */
  zhiXing: string
  /** 生肖 */
  shengXiao: string
  /** 节日 */
  festivals: string[]
  /** 其他纪念日 */
  otherFestivals: string[]
  /** 喜神方位 */
  posXi: string
  /** 福神方位 */
  posFu: string
  /** 财神方位 */
  posCai: string
  /** 阳贵人 */
  posYangGui: string
  /** 阴贵人 */
  posYinGui: string
  /** 九星简述 */
  nineStar: string
}

/**
 * 构建指定公历日的完整黄历。
 * @param y 公历年
 * @param m 公历月 1–12
 * @param d 公历日
 */
export function buildHuangliDay(y: number, m: number, d: number): HuangliDay {
  const solar = Solar.fromYmd(y, m, d)
  const lunar = solar.getLunar()
  const festivals = [
    ...(lunar.getFestivals?.() ?? []),
    ...(typeof solar.getFestivals === 'function' ? solar.getFestivals() : [])
  ]
  const otherFestivals = lunar.getOtherFestivals?.() ?? []
  const nine = lunar.getDayNineStar?.()
  const nineStar = nine && typeof nine.toString === 'function' ? String(nine.toString()) : ''

  return {
    solarLabel: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
    lunarLabel: `${lunar.getYearInChinese?.() ?? lunar.getYear()}年${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`,
    yearGz: lunar.getYearInGanZhi(),
    monthGz: lunar.getMonthInGanZhi(),
    dayGz: lunar.getDayInGanZhi(),
    yearNaYin: lunar.getYearNaYin(),
    monthNaYin: lunar.getMonthNaYin(),
    dayNaYin: lunar.getDayNaYin(),
    yi: lunar.getDayYi() ?? [],
    ji: lunar.getDayJi() ?? [],
    chong: lunar.getDayChong() ?? '',
    chongDesc: lunar.getDayChongDesc() ?? '',
    sha: lunar.getDaySha() ?? '',
    tianShen: lunar.getDayTianShen() ?? '',
    tianShenType: lunar.getDayTianShenType() ?? '',
    tianShenLuck: lunar.getDayTianShenLuck() ?? '',
    jiShen: lunar.getDayJiShen() ?? [],
    xiongSha: lunar.getDayXiongSha() ?? [],
    pengZuGan: lunar.getPengZuGan() ?? '',
    pengZuZhi: lunar.getPengZuZhi() ?? '',
    xiu: lunar.getXiu() ?? '',
    xiuLuck: lunar.getXiuLuck() ?? '',
    xiuSong: lunar.getXiuSong() ?? '',
    zhiXing: lunar.getZhiXing() ?? '',
    shengXiao: lunar.getDayShengXiao() ?? '',
    festivals,
    otherFestivals,
    posXi: lunar.getDayPositionXi() ?? lunar.getPositionXi?.() ?? '',
    posFu: lunar.getDayPositionFu() ?? lunar.getPositionFu?.() ?? '',
    posCai: lunar.getDayPositionCai() ?? lunar.getPositionCai?.() ?? '',
    posYangGui: lunar.getDayPositionYangGui() ?? '',
    posYinGui: lunar.getDayPositionYinGui() ?? '',
    nineStar
  }
}

/**
 * 生成助手追问用黄历事实文本。
 * @param day 黄历日
 */
export function formatHuangliFacts(day: HuangliDay): string {
  const lines = [
    `公历 ${day.solarLabel} · 农历 ${day.lunarLabel}`,
    `干支：年 ${day.yearGz}（${day.yearNaYin}） 月 ${day.monthGz}（${day.monthNaYin}） 日 ${day.dayGz}（${day.dayNaYin}）`,
    `生肖日：${day.shengXiao} · 建除：${day.zhiXing} · 二十八宿：${day.xiu}（${day.xiuLuck}）`,
    `值神：${day.tianShen}（${day.tianShenType}/${day.tianShenLuck}）`,
    `冲：${day.chongDesc || day.chong} · 煞：${day.sha}`,
    `宜：${day.yi.join('、') || '—'}`,
    `忌：${day.ji.join('、') || '—'}`,
    `吉神：${day.jiShen.join('、') || '—'}`,
    `凶煞：${day.xiongSha.join('、') || '—'}`,
    `彭祖百忌：${day.pengZuGan}；${day.pengZuZhi}`,
    `方位：喜神${day.posXi} 福神${day.posFu} 财神${day.posCai} 阳贵${day.posYangGui} 阴贵${day.posYinGui}`,
    day.nineStar ? `九星：${day.nineStar}` : '',
    day.xiuSong ? `宿歌：${day.xiuSong}` : '',
    day.festivals.length ? `节日：${day.festivals.join('、')}` : '',
    day.otherFestivals.length ? `其他：${day.otherFestivals.join('、')}` : ''
  ]
  return lines.filter(Boolean).join('\n')
}
