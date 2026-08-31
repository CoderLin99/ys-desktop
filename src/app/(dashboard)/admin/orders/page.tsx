import { redirect } from "next/navigation";
import { AdminOrdersPanel } from "@/components/membership/admin-orders-panel";
import { getSessionUser } from "@/lib/auth/session";
import { isAdmin } from "@/lib/data/profiles";
import { getMembershipApproveDays } from "@/lib/membership/settings";

export const dynamic = "force-dynamic";

/**
 * 管理端订单审批（仅 admin）。
 */
export default async function AdminOrdersPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?redirect=/admin/orders");
  const admin = await isAdmin(user.id);
  if (!admin) redirect("/workspace");

  const defaultApproveDays = await getMembershipApproveDays();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">订单审批</h1>
      <p className="text-sm text-muted-foreground">
        对照支付宝/微信到账后点击通过，默认开通 {defaultApproveDays}{" "}
        天会员（可在「站点配置」修改默认值）。
      </p>
      <AdminOrdersPanel defaultApproveDays={defaultApproveDays} />
    </div>
  );
}
