import { z } from "zod";

/** 性别（紫微、风水等共用） */
export const genderSchema = z.enum(["male", "female"]);

/** 公历出生信息（紫微、风水等共用） */
export const birthInputSchema = z.object({
  year: z.number().int().min(1900).max(2100),
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(31),
  hour: z.number().int().min(0).max(23).nullable().optional(),
  minute: z.number().int().min(0).max(59).default(0),
  gender: genderSchema,
});

export type BirthInput = z.infer<typeof birthInputSchema>;

/** 公历日期（黄历等共用） */
export const solarDateSchema = z.object({
  year: z.number().int().min(1900).max(2100),
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(31),
});

export type SolarDateInput = z.infer<typeof solarDateSchema>;
