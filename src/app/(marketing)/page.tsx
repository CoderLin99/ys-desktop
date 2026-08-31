import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * 营销首页：说明架构定位，不包含具体排盘功能（功能后续从 ys-desktop 迁移）。
 */
export default function HomePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <section className="space-y-6">
        <p className="text-sm text-muted-foreground">Web SaaS 脚手架</p>
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight">
          按 zhaoming 架构新建的独立 Web 项目
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          Next.js 全栈 · Better Auth · Postgres · Vercel AI SDK。
          排盘与 AI 解读等业务能力请在此骨架上接入，不复制 zhaoming 功能代码。
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/register" className={cn(buttonVariants({ size: "lg" }))}>
            开始搭建
          </Link>
          <Link
            href="/workspace"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
          >
            进入工作台
          </Link>
        </div>
      </section>

      <section className="mt-16 grid gap-4 md:grid-cols-3">
        {[
          {
            title: "全栈单体",
            desc: "App Router + API Routes，部署 Vercel / 自托管均可",
          },
          {
            title: "鉴权与数据",
            desc: "Better Auth + Postgres，用户与业务表分离迁移",
          },
          {
            title: "AI 流式",
            desc: "服务端代理大模型 Key，前端 useChat 流式展示",
          },
        ].map((item) => (
          <Card key={item.title}>
            <CardHeader>
              <CardTitle className="text-base">{item.title}</CardTitle>
              <CardDescription>{item.desc}</CardDescription>
            </CardHeader>
            <CardContent />
          </Card>
        ))}
      </section>
    </div>
  );
}
