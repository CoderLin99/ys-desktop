import { z } from "zod";

/**
 * 服务端环境变量 Schema（借鉴 zhaoming：集中校验，避免散落 process.env）。
 */
const serverEnvSchema = z.object({
  /** Postgres 连接串（Neon / Supabase / 本地 Docker 均可） */
  DATABASE_URL: z.string().min(1).optional(),
  /** Better Auth 服务端密钥，至少 32 位 */
  BETTER_AUTH_SECRET: z.string().min(32).optional(),
  /** 应用对外 URL，如 http://localhost:5555 */
  BETTER_AUTH_URL: z.string().url().optional(),
  /** AI 提供商：openai-compatible | gateway（预留） */
  AI_PROVIDER: z.enum(["openai-compatible", "gateway"]).default("openai-compatible"),
  /** OpenAI 兼容接口 Base URL */
  AI_BASE_URL: z.string().url().optional(),
  /** 模型 ID，如 deepseek-chat */
  AI_MODEL: z.string().optional(),
  /** 大模型 API Key（仅服务端） */
  AI_API_KEY: z.string().optional(),
});

/** 解析后的服务端环境（构建阶段允许缺省，运行时再报错） */
export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedEnv: ServerEnv | null = null;

/**
 * 读取并缓存服务端环境变量。
 * @returns 校验后的 env 对象
 */
export function getEnv(): ServerEnv {
  if (cachedEnv) return cachedEnv;

  cachedEnv = serverEnvSchema.parse({
    DATABASE_URL: process.env.DATABASE_URL,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    AI_PROVIDER: process.env.AI_PROVIDER ?? "openai-compatible",
    AI_BASE_URL: process.env.AI_BASE_URL,
    AI_MODEL: process.env.AI_MODEL,
    AI_API_KEY: process.env.AI_API_KEY,
  });

  return cachedEnv;
}

/**
 * 应用根 URL（Better Auth、AI Referer 等共用）。
 * @returns 完整 base URL，缺省时本地开发地址
 */
export function getAppBaseUrl(): string {
  const env = getEnv();
  return env.BETTER_AUTH_URL ?? "http://localhost:5555";
}

/**
 * 数据库连接串；未配置时抛出明确错误。
 */
export function getDatabaseUrl(): string {
  const url = getEnv().DATABASE_URL;
  if (!url) {
    throw new Error("未配置 DATABASE_URL，请在 .env.local 中填写 Postgres 连接串");
  }
  return url;
}

/**
 * 是否已配置可用的 AI 密钥（用于 API 路由前置检查）。
 */
export function isAiConfigured(): boolean {
  const env = getEnv();
  return Boolean(env.AI_API_KEY && env.AI_BASE_URL && env.AI_MODEL);
}
