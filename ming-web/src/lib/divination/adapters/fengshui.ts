import { analyzeFengShui, type FengShuiResult } from "../engine/fengshui/analyze";
import type { FengShuiInput } from "../schemas/fengshui";

/** 风水 API 响应（去掉 ragQuery 降低暴露） */
export type FengShuiChartResult = Omit<FengShuiResult, "ragQuery">;

/**
 * 阳宅风水综合推算。
 * @param input 宅主出生与朝向
 */
export function buildFengShuiChart(input: FengShuiInput): FengShuiChartResult {
  const result = analyzeFengShui({
    year: input.year,
    month: input.month,
    day: input.day,
    gender: input.gender,
    headingDeg: input.headingDeg,
    longitude: input.longitude,
    latitude: input.latitude,
    accuracy: input.accuracy,
  });

  const { ragQuery: _rag, ...rest } = result;
  void _rag;
  return rest;
}
