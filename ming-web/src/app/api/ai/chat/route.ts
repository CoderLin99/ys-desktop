import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { headers } from "next/headers";
import { getAuth } from "@/lib/auth";
import { buildSystemPrompt } from "@/lib/ai/prompts";
import { getAiModel } from "@/lib/ai/provider";
import { ensureUserProfile } from "@/lib/data/profiles";
import { isAiConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * 通用 AI 流式对话（架构占位：后续可拆分为 /api/ai/divination 等业务路由）。
 * 请求体：{ messages: UIMessage[] }
 */
export async function POST(request: Request) {
  if (!isAiConfigured()) {
    return Response.json(
      { error: "AI 未配置，请在 .env.local 设置 AI_BASE_URL / AI_API_KEY / AI_MODEL" },
      { status: 503 },
    );
  }

  const session = await getAuth().api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return Response.json({ error: "请先登录" }, { status: 401 });
  }

  await ensureUserProfile(session.user.id, session.user.email);

  const body = (await request.json()) as { messages?: UIMessage[] };
  const messages = body.messages ?? [];

  const result = streamText({
    model: getAiModel(),
    system: buildSystemPrompt(),
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
