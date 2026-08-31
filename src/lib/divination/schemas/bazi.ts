import { z } from "zod";

/** 晚子换日口径 */
export const dayCutoverSchema = z.enum(["ziChu", "ziZheng"]);

/**
 * 八字排盘 API 请求体。
 * hour 省略或 null 表示时辰未知（三柱）。
 */
export const baziInputSchema = z.object({
  year: z.number().int().min(1900).max(2100),
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(31),
  hour: z.number().int().min(0).max(23).nullable().optional(),
  minute: z.number().int().min(0).max(59).default(0),
  dayCutover: dayCutoverSchema.default("ziZheng"),
  /** 可选备注名，入库时用 */
  subjectName: z.string().max(64).optional(),
});

export type BaziInput = z.infer<typeof baziInputSchema>;
