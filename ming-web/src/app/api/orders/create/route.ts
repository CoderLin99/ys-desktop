import "server-only";

import { requireApiSession, unauthorizedResponse } from "@/lib/divination/http/require-session";
import { createDraftOrder, getOpenOrder } from "@/lib/membership/orders";

export const dynamic = "force-dynamic";

/**
 * POST /api/orders/create — 生成 draft 订单号。
 */
export async function POST() {
  const session = await requireApiSession();
  if (!session) return unauthorizedResponse();

  const existing = await getOpenOrder(session.userId);
  if (existing) {
    return Response.json({ order: existing });
  }

  const order = await createDraftOrder(session.userId, session.email);
  return Response.json({ order });
}
