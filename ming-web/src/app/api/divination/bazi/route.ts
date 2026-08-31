import "server-only";

import { headers } from "next/headers";
import { getAuth } from "@/lib/auth";
import { buildBaziChart } from "@/lib/divination/adapters/bazi";
import { baziInputSchema } from "@/lib/divination/schemas/bazi";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/divination/bazi
 * 服务端八字排盘（需登录；算法仅运行于 Node，不下发前端）。
 */
export async function POST(request: Request) {
  const session = await getAuth().api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return Response.json({ error: "请先登录" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
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
