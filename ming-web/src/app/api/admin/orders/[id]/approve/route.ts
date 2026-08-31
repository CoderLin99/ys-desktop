import "server-only";

import {
  isErrorResponse,
  requireAdminSession,
} from "@/lib/membership/http/admin";
import { approveOrder } from "@/lib/membership/orders";
import { MEMBERSHIP_APPROVE_DAYS } from "@/lib/membership/constants";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/orders/[id]/approve — 审批通过并开通会员。
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requireAdminSession();
  if (isErrorResponse(session)) return session;

  const { id } = await context.params;
  let days = MEMBERSHIP_APPROVE_DAYS;
  try {
    const body = (await request.json()) as { days?: number };
    if (body.days && body.days > 0 && body.days <= 365) {
      days = body.days;
    }
  } catch {
    /* 使用默认天数 */
  }

  try {
    const order = await approveOrder(id, days);
    return Response.json({ order, days });
  } catch (err) {
    const message = err instanceof Error ? err.message : "审批失败";
    return Response.json({ error: message }, { status: 400 });
  }
}
