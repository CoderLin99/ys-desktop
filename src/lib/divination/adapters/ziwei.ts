import { buildZiWeiChart, type ZiWeiChart } from "../engine/ziwei/chart";
import type { ZiWeiInput } from "../schemas/ziwei";

/** 对外紫微宫位（不含 ragQuery 等内部字段） */
export interface PublicZiWeiPalace {
  name: string;
  zhi: string;
  gan: string;
  majors: string[];
  minors: string[];
  stars: Array<{ name: string; major: boolean; sihua?: string }>;
  isShen: boolean;
  daXianFrom: number;
  daXianTo: number;
}

/** 紫微 API 响应 */
export interface ZiWeiChartResult {
  lunarLabel: string;
  yearGanZhi: string;
  wuXingJu: string;
  juNum: number;
  mingZhi: string;
  shenZhi: string;
  gender: "male" | "female";
  palaces: PublicZiWeiPalace[];
  sihua: Array<{ kind: string; star: string; palace: string; zhi: string }>;
  daXian: Array<{ palace: string; zhi: string; ageFrom: number; ageTo: number; majors: string[] }>;
  hints: string[];
}

/**
 * 紫微斗数服务端排盘。
 * @param input 公历出生与性别
 */
export function buildZiWeiChartPublic(input: ZiWeiInput): ZiWeiChartResult {
  const chart: ZiWeiChart = buildZiWeiChart({
    year: input.year,
    month: input.month,
    day: input.day,
    hour: input.hour ?? null,
    gender: input.gender,
  });

  return {
    lunarLabel: chart.lunarLabel,
    yearGanZhi: chart.yearGanZhi,
    wuXingJu: chart.wuXingJu,
    juNum: chart.juNum,
    mingZhi: chart.mingZhi,
    shenZhi: chart.shenZhi,
    gender: chart.gender,
    palaces: chart.palaces.map((p) => ({
      name: p.name,
      zhi: p.zhi,
      gan: p.gan,
      majors: p.majors,
      minors: p.minors,
      stars: p.stars.map((s) => ({
        name: s.name,
        major: s.major,
        sihua: s.sihua,
      })),
      isShen: p.isShen,
      daXianFrom: p.daXianFrom,
      daXianTo: p.daXianTo,
    })),
    sihua: chart.sihua.map((s) => ({
      kind: s.kind,
      star: s.star,
      palace: s.palace,
      zhi: s.zhi,
    })),
    daXian: chart.daXian.map((d) => ({
      palace: d.palace,
      zhi: d.zhi,
      ageFrom: d.ageFrom,
      ageTo: d.ageTo,
      majors: d.majors,
    })),
    hints: chart.hints,
  };
}
