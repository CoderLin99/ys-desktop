/**
 * lunar-javascript 最小类型声明（库本身无完整 d.ts）。
 */
declare module 'lunar-javascript' {
  export class Solar {
    static fromYmd(y: number, m: number, d: number): Solar
    /** 含时分秒的公历时刻 */
    static fromYmdHms(y: number, m: number, d: number, h: number, mi: number, s: number): Solar
    getYear(): number
    getMonth(): number
    getDay(): number
    /** 交节时刻·时（0–23） */
    getHour(): number
    /** 交节时刻·分 */
    getMinute(): number
    getLunar(): Lunar
    toYmd(): string
    /** 公历节日名列表 */
    getFestivals?(): string[]
  }

  /** 四柱干支（节气起月） */
  export class EightChar {
    /** 年柱干支，如「己卯」 */
    getYear(): string
    /** 月柱干支 */
    getMonth(): string
    /** 日柱干支 */
    getDay(): string
    /** 时柱干支 */
    getTime(): string

    /**
     * 晚子时日柱口径：1=子初换日(23:00起算次日)，2=晚子不换(至00:00才换，默认)。
     * @param sect 1 或 2
     */
    setSect(sect: number): void

    /** 当前换日口径 */
    getSect(): number
    /**
     * 起运。gender：1 男 0 女；sect 默认 1（三天折一岁）。
     * @param gender 1=乾造 0=坤造
     * @param sect 起运算法派别，缺省 1
     */
    getYun(gender: number, sect?: number): Yun
  }

  /** 起运结果（年/月/日为折算后的起运间隔，不是公历年） */
  export class Yun {
    /** 起运间隔·年 */
    getStartYear(): number
    /** 起运间隔·月 */
    getStartMonth(): number
    /** 起运间隔·日 */
    getStartDay(): number
    /** 大运列表；下标 0 常为童限（干支可空） */
    getDaYun(n?: number): DaYun[]
  }

  /** 一步大运 */
  export class DaYun {
    /** 干支；童限可能为空串 */
    getGanZhi(): string
    /** 起运周岁（库内算法） */
    getStartAge(): number
    /** 本步结束周岁 */
    getEndAge(): number
    /** 本步起始公历年 */
    getStartYear(): number
    /** 本步结束公历年 */
    getEndYear(): number
  }

  /** 九星对象（toString 可读） */
  export class NineStar {
    toString(): string
    getName?(): string
  }

  export class Lunar {
    static fromYmd(y: number, m: number, d: number): Lunar
    getYear(): number
    getMonth(): number
    getDay(): number
    getSolar(): Solar
    /** 子平八字 */
    getEightChar(): EightChar
    /** 节气表：键为「立春」等，值为交节公历 */
    getJieQiTable(): Record<string, Solar>
    /** 上一节气 */
    getPrevJieQi?(): { getName(): string } | string
    toString(): string

    /** 年干 */
    getYearGan(): string
    /** 年支 */
    getYearZhi(): string
    /** 时支 */
    getTimeZhi(): string
    /** 农历月中文 */
    getMonthInChinese(): string
    /** 农历日中文 */
    getDayInChinese(): string
    /** 农历年中文数字 */
    getYearInChinese?(): string

    /** 年干支 */
    getYearInGanZhi(): string
    /** 月干支 */
    getMonthInGanZhi(): string
    /** 日干支 */
    getDayInGanZhi(): string
    /** 年纳音 */
    getYearNaYin(): string
    /** 月纳音 */
    getMonthNaYin(): string
    /** 日纳音 */
    getDayNaYin(): string

    /** 宜 */
    getDayYi(): string[]
    /** 忌 */
    getDayJi(): string[]
    /** 日冲地支 */
    getDayChong(): string
    /** 日冲描述 */
    getDayChongDesc(): string
    /** 日煞方位 */
    getDaySha(): string
    getChong?(): string
    getSha?(): string

    /** 值神 */
    getDayTianShen(): string
    /** 黄道/黑道 */
    getDayTianShenType(): string
    /** 值神吉凶 */
    getDayTianShenLuck(): string
    /** 吉神宜趋 */
    getDayJiShen(): string[]
    /** 凶煞宜忌 */
    getDayXiongSha(): string[]

    /** 彭祖百忌·天干 */
    getPengZuGan(): string
    /** 彭祖百忌·地支 */
    getPengZuZhi(): string

    /** 二十八宿 */
    getXiu(): string
    getXiuLuck(): string
    getXiuSong(): string
    /** 建除十二神 */
    getZhiXing(): string
    /** 日生肖 */
    getDayShengXiao(): string

    /** 农历节日 */
    getFestivals(): string[]
    /** 其他纪念日 */
    getOtherFestivals(): string[]

    getPositionXi?(): string
    getPositionFu?(): string
    getPositionCai?(): string
    getDayPositionXi(): string
    getDayPositionFu(): string
    getDayPositionCai(): string
    getDayPositionYangGui(): string
    getDayPositionYinGui(): string
    getDayNineStar(): NineStar
  }

  export class LunarYear {
    static fromYear(year: number): LunarYear
    getLeapMonth(): number
  }

  export class LunarMonth {
    static fromYm(year: number, month: number): LunarMonth
    getDayCount(): number
  }
}
