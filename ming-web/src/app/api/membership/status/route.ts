import { getSessionUser } from "@/lib/auth/session";
import { getMembershipStatus } from "@/lib/membership/access";
import { getLatestOrder, getOpenOrder } from "@/lib/membership/orders";

export const dynamic = "force-dynamic";

/**
 * GET /api/membership/status — 会员与 AI 试用状态。
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return Response.json({ error: "请先登录" }, { status: 401 });
  }

  const status = await getMembershipStatus(user.id);
  const openOrder = await getOpenOrder(user.id);
  const latestOrder = await getLatestOrder(user.id);

  return Response.json({
    ...status,
    openOrder: openOrder
      ? {
          id: openOrder.id,
          orderNo: openOrder.order_no,
          status: openOrder.status,
        }
      : null,
    latestOrder: latestOrder
      ? {
          id: latestOrder.id,
          orderNo: latestOrder.order_no,
          status: latestOrder.status,
          createdAt: latestOrder.created_at,
        }
      : null,
  });
}
