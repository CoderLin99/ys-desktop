import { redirect } from "next/navigation";
import { AdminSettingsPanel } from "@/components/membership/admin-settings-panel";
import { getSessionUser } from "@/lib/auth/session";
import { isAdmin } from "@/lib/data/profiles";

export const dynamic = "force-dynamic";

/**
 * 管理端站点配置（仅 admin）。
 */
export default async function AdminSettingsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?redirect=/admin/settings");
  const admin = await isAdmin(user.id);
  if (!admin) redirect("/workspace");

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">站点配置</h1>
      <p className="text-sm text-muted-foreground">
        在此调整非会员 AI 试用次数与订单审批默认开通天数，无需改代码或重启服务。
      </p>
      <AdminSettingsPanel />
    </div>
  );
}
