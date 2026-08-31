import "server-only";

import { buildHuangliDayPublic } from "@/lib/divination/adapters/huangli";
import { huangliDayInputSchema } from "@/lib/divination/schemas/huangli";
import {
  parseJsonBody,
  requireApiSession,
  unauthorizedResponse,
} from "@/lib/divination/http/require-session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/divination/huangli — 服务端黄历日盘。
 */
export async function POST(request: Request) {
  if (!(await requireApiSession())) return unauthorizedResponse();

  const body = await parseJsonBody(request);
  if (body === null) {
    return Response.json({ error: "无效 JSON" }, { status: 400 });
  }

  const parsed = huangliDayInputSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "参数无效" },
      { status: 400 },
    );
  }

  try {
    const result = buildHuangliDayPublic(parsed.data);
    return Response.json({
      divinationType: "huangli",
      ...result,
      computedAt: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "黄历查询失败";
    return Response.json({ error: message }, { status: 500 });
  }
}
