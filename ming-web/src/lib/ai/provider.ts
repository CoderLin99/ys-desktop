import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";
import { getAppBaseUrl, getEnv } from "@/lib/env";

/**
 * 根据环境变量解析 Vercel AI SDK 可用的 chat 模型。
 * @param modelId 可选覆盖，默认读 AI_MODEL
 */
export function getAiModel(modelId?: string): LanguageModel {
  const env = getEnv();
  const resolvedModelId = modelId ?? env.AI_MODEL;

  if (!env.AI_BASE_URL || !env.AI_API_KEY || !resolvedModelId) {
    throw new Error(
      "AI 未配置：请设置 AI_BASE_URL、AI_API_KEY、AI_MODEL",
    );
  }

  if (env.AI_PROVIDER === "openai-compatible") {
    const isOpenRouter = env.AI_BASE_URL.includes("openrouter.ai");
    const appBaseUrl = getAppBaseUrl();
    const openRouterHeaders =
      isOpenRouter && appBaseUrl
        ? {
            "HTTP-Referer": appBaseUrl,
            "X-OpenRouter-Title": "ming-web",
          }
        : undefined;

    return createOpenAICompatible({
      baseURL: env.AI_BASE_URL,
      apiKey: env.AI_API_KEY,
      name: isOpenRouter ? "openrouter" : "custom-compatible",
      headers: openRouterHeaders,
    }).chatModel(resolvedModelId);
  }

  throw new Error(`暂不支持的 AI_PROVIDER: ${env.AI_PROVIDER}`);
}
