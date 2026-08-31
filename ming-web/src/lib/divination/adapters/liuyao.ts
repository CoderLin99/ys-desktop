import { analyzeLiuYaoTrend } from "../engine/liuyao/trend";
import { castLiuYao, type LiuYaoResult, type YaoValue } from "../engine/liuyao/cast";
import type { LiuYaoInput } from "../schemas/liuyao";

/** 六爻 API 响应 */
export interface LiuYaoChartResult {
  benGuaName: string;
  bianGuaName: string;
  upper: string;
  lower: string;
  lines: LiuYaoResult["lines"];
  hints: string[];
  shadowFight: boolean;
  /** 走势摘要（事业向默认） */
  trend: {
    score: number;
    headline: string;
    shadowLike: boolean;
  };
}

/**
 * 六爻服务端起卦（铜钱法）。
 * @param input 起卦方式与可选占问
 */
export function buildLiuYaoChart(input: LiuYaoInput): LiuYaoChartResult {
  const values: YaoValue[] | undefined =
    input.mode === "manual" ? input.values : undefined;

  if (input.mode === "manual" && !values) {
    throw new Error("manual 模式须提供 6 个爻值");
  }

  const result = castLiuYao({
    dayGan: input.dayGan,
    values,
  });

  const trend = analyzeLiuYaoTrend(result, "career");

  return {
    benGuaName: result.benGuaName,
    bianGuaName: result.bianGuaName,
    upper: result.upper,
    lower: result.lower,
    lines: result.lines,
    hints: result.hints,
    shadowFight: result.shadowFight,
    trend: {
      score: trend.score,
      headline: trend.headline,
      shadowLike: trend.shadowLike,
    },
  };
}
