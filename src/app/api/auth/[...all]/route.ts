import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/auth";

/** 强制动态，避免构建阶段静态分析连接数据库 */
export const dynamic = "force-dynamic";

const handler = toNextJsHandler(getAuth());

export const { GET, POST } = handler;
