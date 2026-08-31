import "server-only";

import { buildZiWeiChartPublic } from "@/lib/divination/adapters/ziwei";
import { ziweiInputSchema } from "@/lib/divination/schemas/ziwei";
import {
  parseJsonBody,
  requireApiSession,
  unauthorizedResponse,
} from "@/lib/divination/http/require-session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/divination/ziwei — 服务端紫微斗数排盘。
 */
export async function POST(request: Request) {
  if (!(await requireApiSession())) return unauthorizedResponse();

  const body = await parseJsonBody(request);
  if (body === null) {
    return Response.json({ error: "无效 JSON" }, { status: 400 });
  }

  const parsed = ziweiInputSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "参数无效" },
      { status: 400 },
    );
  }

  try {
    const chart = buildZiWeiChartPublic(parsed.data);
    return Response.json({
      divinationType: "ziwei",
      chart,
      computedAt: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "排盘失败";
    return Response.json({ error: message }, { status: 500 });
  }
}
