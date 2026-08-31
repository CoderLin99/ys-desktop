import "server-only";

import { buildFengShuiChart } from "@/lib/divination/adapters/fengshui";
import { fengshuiInputSchema } from "@/lib/divination/schemas/fengshui";
import {
  parseJsonBody,
  requireApiSession,
  unauthorizedResponse,
} from "@/lib/divination/http/require-session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/divination/fengshui — 服务端阳宅风水推算。
 */
export async function POST(request: Request) {
  if (!(await requireApiSession())) return unauthorizedResponse();

  const body = await parseJsonBody(request);
  if (body === null) {
    return Response.json({ error: "无效 JSON" }, { status: 400 });
  }

  const parsed = fengshuiInputSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "参数无效" },
      { status: 400 },
    );
  }

  try {
    const chart = buildFengShuiChart(parsed.data);
    return Response.json({
      divinationType: "fengshui",
      chart,
      computedAt: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "风水推算失败";
    return Response.json({ error: message }, { status: 500 });
  }
}
