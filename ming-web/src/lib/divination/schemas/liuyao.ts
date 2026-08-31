import { z } from "zod";

/** 六爻铜钱值 */
const yaoValueSchema = z.union([
  z.literal(6),
  z.literal(7),
  z.literal(8),
  z.literal(9),
]);

/**
 * 六爻起卦 API 请求体。
 * - manual：指定六爻；random：服务端随机（不可复现）
 */
export const liuyaoInputSchema = z.object({
  mode: z.enum(["random", "manual"]).default("random"),
  /** 起六神用日干，默认甲 */
  dayGan: z.string().min(1).max(1).default("甲"),
  /** manual 模式必填：初爻→上爻 */
  values: z.array(yaoValueSchema).length(6).optional(),
  /** 占问摘要（仅展示，不参与装卦） */
  question: z.string().max(200).optional(),
});

export type LiuYaoInput = z.infer<typeof liuyaoInputSchema>;
