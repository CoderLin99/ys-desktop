import "server-only";

import { buildBaziChart } from "@/lib/divination/adapters/bazi";
import { baziInputSchema } from "@/lib/divination/schemas/bazi";
import {
  parseJsonBody,
  requireApiSession,
  unauthorizedResponse,
} from "@/lib/divination/http/require-session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/divination/bazi — 服务端八字排盘。
 */
export async function POST(request: Request) {
  if (!(await requireApiSession())) return unauthorizedResponse();

  const body = await parseJsonBody(request);
  if (body === null) {
    return Response.json({ error: "无效 JSON" }, { status: 400 });
  }

  const parsed = baziInputSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "参数无效" },
      { status: 400 },
    );
  }

  try {
    const chart = buildBaziChart(parsed.data);
    return Response.json({
      divinationType: "bazi",
      chart,
      computedAt: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "排盘失败";
    return Response.json({ error: message }, { status: 500 });
  }
}
