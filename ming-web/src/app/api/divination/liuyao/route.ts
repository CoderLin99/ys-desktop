import "server-only";

import { buildLiuYaoChart } from "@/lib/divination/adapters/liuyao";
import { liuyaoInputSchema } from "@/lib/divination/schemas/liuyao";
import {
  parseJsonBody,
  requireApiSession,
  unauthorizedResponse,
} from "@/lib/divination/http/require-session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/divination/liuyao — 服务端六爻起卦。
 */
export async function POST(request: Request) {
  if (!(await requireApiSession())) return unauthorizedResponse();

  const body = await parseJsonBody(request);
  if (body === null) {
    return Response.json({ error: "无效 JSON" }, { status: 400 });
  }

  const parsed = liuyaoInputSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "参数无效" },
      { status: 400 },
    );
  }

  try {
    const chart = buildLiuYaoChart(parsed.data);
    return Response.json({
      divinationType: "liuyao",
      chart,
      computedAt: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "起卦失败";
    return Response.json({ error: message }, { status: 500 });
  }
}
