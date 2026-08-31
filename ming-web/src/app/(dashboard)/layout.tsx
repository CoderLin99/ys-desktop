import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { getSessionUser } from "@/lib/auth/session";

/** 工作台依赖会话，禁止静态预渲染 */
export const dynamic = "force-dynamic";

/**
 * 工作台布局：服务端校验登录，未登录跳转 /login。
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login?redirect=/workspace");
  }

  return (
    <DashboardShell userName={user.name || user.email}>
      {children}
    </DashboardShell>
  );
}
