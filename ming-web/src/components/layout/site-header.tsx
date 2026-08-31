import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * 营销站顶栏：品牌 + 登录/工作台入口。
 */
export function SiteHeader() {
  return (
    <header className="border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="font-semibold tracking-tight">
          ming-web
        </Link>
        <nav className="flex items-center gap-2">
          <Link href="/login" className={cn(buttonVariants({ variant: "ghost" }))}>
            登录
          </Link>
          <Link href="/register" className={cn(buttonVariants())}>
            注册
          </Link>
        </nav>
      </div>
    </header>
  );
}
