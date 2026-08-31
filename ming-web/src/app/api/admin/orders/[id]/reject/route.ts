import "server-only";

import {
  isErrorResponse,
  requireAdminSession,
} from "@/lib/membership/http/admin";
import { rejectOrder } from "@/lib/membership/orders";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/orders/[id]/reject — 拒绝订单。
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requireAdminSession();
  if (isErrorResponse(session)) return session;

  const { id } = await context.params;
  let adminNote: string | undefined;
  try {
    const body = (await request.json()) as { adminNote?: string };
    adminNote = body.adminNote;
  } catch {
    /* 无备注 */
  }

  try {
    const order = await rejectOrder(id, adminNote);
    return Response.json({ order });
  } catch (err) {
    const message = err instanceof Error ? err.message : "操作失败";
    return Response.json({ error: message }, { status: 400 });
  }
}
