declare module "lunar-javascript" {
  export class Solar {
    static fromYmdHms(
      year: number,
      month: number,
      day: number,
      hour: number,
      minute: number,
      second: number,
    ): Solar;
    getLunar(): Lunar;
  }

  export class Lunar {
    getEightChar(): EightChar;
    getSolar(): Solar;
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
