"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

/** 侧边栏导航项 */
function buildNavItems(isAdmin: boolean) {
  const items = [
    { href: "/workspace", label: "工作台" },
    { href: "/member", label: "会员中心" },
    { href: "/settings", label: "设置" },
  ];
  if (isAdmin) {
    items.push({ href: "/admin/orders", label: "订单审批" });
  }
  return items;
}

interface DashboardShellProps {
  /** 当前登录用户展示名 */
  userName: string;
  /** 是否管理员（显示审批入口） */
  isAdmin?: boolean;
  children: React.ReactNode;
}

/**
 * 登录后工作台布局：侧栏 + 顶栏 + 内容区（借鉴 zhaoming dashboard 分区）。
 */
export function DashboardShell({
  userName,
  isAdmin = false,
  children,
}: DashboardShellProps) {
  const pathname = usePathname();
  const navItems = buildNavItems(isAdmin);

  /** 登出并回到首页 */
  async function handleSignOut() {
    await authClient.signOut();
    window.location.href = "/";
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto flex min-h-screen max-w-6xl">
        <aside className="hidden w-56 shrink-0 border-r bg-background p-4 md:block">
          <div className="mb-6 text-sm font-medium">{userName}</div>
          <nav className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "block rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted",
                  pathname.startsWith(item.href) && "bg-muted font-medium",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <Separator className="my-4" />
          <Button variant="outline" size="sm" className="w-full" onClick={handleSignOut}>
            退出登录
          </Button>
        </aside>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
