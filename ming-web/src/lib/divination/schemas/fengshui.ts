import { z } from "zod";
import { birthInputSchema } from "./common";

/**
 * 阳宅风水 API 请求体。
 */
export const fengshuiInputSchema = birthInputSchema.extend({
  /** 门向角：正北=0，顺时针 */
  headingDeg: z.number().min(0).max(360),
  longitude: z.number().optional(),
  latitude: z.number().optional(),
  accuracy: z.number().optional(),
});

export type FengShuiInput = z.infer<typeof fengshuiInputSchema>;
