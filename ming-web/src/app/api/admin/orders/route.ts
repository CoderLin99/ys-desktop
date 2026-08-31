import "server-only";

import {
  isErrorResponse,
  requireAdminSession,
} from "@/lib/membership/http/admin";
import { listOrders } from "@/lib/membership/orders";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/orders — 管理员订单列表。
 */
export async function GET(request: Request) {
  const session = await requireAdminSession();
  if (isErrorResponse(session)) return session;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? undefined;

  const orders = await listOrders(status ?? undefined);
  return Response.json({ orders });
}
