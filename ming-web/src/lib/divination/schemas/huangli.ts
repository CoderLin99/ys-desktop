import { z } from "zod";
import { solarDateSchema } from "./common";

/**
 * 黄历日 API 请求体。
 */
export const huangliDayInputSchema = solarDateSchema.extend({
  /** 是否附带白话解读 */
  withPlain: z.boolean().default(true),
});

export type HuangliDayInput = z.infer<typeof huangliDayInputSchema>;

/**
 * 黄历择吉 API 请求体。
 */
export const huangliZejiInputSchema = z.object({
  /** 事项 id，见 ZEJI_MATTERS */
  matterId: z.string().min(1),
  fromYear: z.number().int().min(1900).max(2100),
  fromMonth: z.number().int().min(1).max(12),
  fromDay: z.number().int().min(1).max(31),
  /** 向后扫描天数，默认 60 */
  dayCount: z.number().int().min(1).max(180).default(60),
});

export type HuangliZejiInput = z.infer<typeof huangliZejiInputSchema>;
