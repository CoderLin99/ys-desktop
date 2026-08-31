declare module "lunar-javascript" {
  export class Solar {
    static fromYmd(year: number, month: number, day: number): Solar;
    static fromYmdHms(
      year: number,
      month: number,
      day: number,
      hour: number,
      minute: number,
      second: number,
    ): Solar;
    getLunar(): Lunar;
    getFestivals?(): string[];
  }

  export class Lunar {
    getEightChar(): EightChar;
    getSolar(): Solar;
    getYear(): number;
    getMonth(): number;
    getDay(): number;
    getYearGan(): string;
    getYearZhi(): string;
    getTimeZhi(): string;
    getYearInGanZhi(): string;
    getMonthInGanZhi(): string;
    getDayInGanZhi(): string;
    getYearNaYin(): string;
    getMonthNaYin(): string;
    getDayNaYin(): string;
    getYearInChinese?(): string;
    getMonthInChinese(): string;
    getDayInChinese(): string;
    getFestivals?(): string[];
    getOtherFestivals?(): string[];
    getDayNineStar?(): { toString(): string };
    getDayYi(): string[];
    getDayJi(): string[];
    getDayChong(): string;
    getDayChongDesc(): string;
    getDaySha(): string;
    getDayTianShen(): string;
    getDayTianShenType(): string;
    getDayTianShenLuck(): string;
    getDayJiShen(): string[];
    getDayXiongSha(): string[];
    getPengZuGan(): string;
    getPengZuZhi(): string;
    getXiu(): string;
    getXiuLuck(): string;
    getXiuSong(): string;
    getZhiXing(): string;
    getYearShengXiao(): string;
    getDayShengXiao(): string;
    getPositionXi?(): string;
    getPositionFu?(): string;
    getPositionCai?(): string;
    getDayPositionXi(): string;
    getDayPositionFu(): string;
    getDayPositionCai(): string;
    getDayPositionYangGui(): string;
    getDayPositionYinGui(): string;
    getPrevJieQi(): { getName(): string; getSolar?(): Solar };
    getJieQiTable?(): Record<string, { toYmd?(): string; isBefore?(s: unknown): boolean }>;
  }

  export class LunarYear {
    static fromYear(year: number): LunarYear;
  }

  export class LunarMonth {
    static fromYm(year: number, month: number): LunarMonth;
  }

  export interface EightChar {
    getYear(): string;
    getMonth(): string;
    getDay(): string;
    getTime(): string;
    getYearGan(): string;
    getYearZhi(): string;
    getMonthGan(): string;
    getMonthZhi(): string;
    getDayGan(): string;
    getDayZhi(): string;
    getTimeGan(): string;
    getTimeZhi(): string;
    setSect?(sect: 1 | 2): void;
  }
}
