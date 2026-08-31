import { z } from "zod";
import { birthInputSchema } from "./common";

/**
 * 紫微斗数 API 请求体。
 */
export const ziweiInputSchema = birthInputSchema;

export type ZiWeiInput = z.infer<typeof ziweiInputSchema>;
