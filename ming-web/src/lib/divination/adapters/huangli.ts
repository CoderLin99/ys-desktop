import { buildHuangliDay, type HuangliDay } from "../engine/huangli/day";
import { buildHuangliPlainRead, type HuangliPlainRead } from "../engine/huangli/plain";
import { scanZeJiDays, ZEJI_MATTERS, type ZeJiHit } from "../engine/huangli/zeji";
import type { HuangliDayInput, HuangliZejiInput } from "../schemas/huangli";

/** 黄历日 API 响应 */
export interface HuangliDayResult {
  day: HuangliDay;
  plain?: HuangliPlainRead;
}

/**
 * 构建单日黄历（可选白话）。
 * @param input 公历日期
 */
export function buildHuangliDayPublic(input: HuangliDayInput): HuangliDayResult {
  const day = buildHuangliDay(input.year, input.month, input.day);
  return {
    day,
    plain: input.withPlain ? buildHuangliPlainRead(day) : undefined,
  };
}

/** 择吉 API 响应 */
export interface HuangliZejiResult {
  matterId: string;
  hits: Array<
    Pick<ZeJiHit, "solarLabel" | "lunarLabel" | "dayGz" | "matchedYi" | "plainTips">
  >;
  /** 可选事项列表（供前端展示） */
  matters: typeof ZEJI_MATTERS;
}

/**
 * 黄历择吉扫描。
 * @param input 起始日与事项
 */
export function buildHuangliZejiPublic(input: HuangliZejiInput): HuangliZejiResult {
  const from = new Date(input.fromYear, input.fromMonth - 1, input.fromDay);
  const hits = scanZeJiDays(input.matterId, from, input.dayCount);

  return {
    matterId: input.matterId,
    hits: hits.map((h) => ({
      solarLabel: h.solarLabel,
      lunarLabel: h.lunarLabel,
      dayGz: h.dayGz,
      matchedYi: h.matchedYi,
      plainTips: h.plainTips,
    })),
    matters: ZEJI_MATTERS,
  };
}
