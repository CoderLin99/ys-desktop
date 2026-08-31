"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ToolId = "bazi" | "ziwei" | "liuyao" | "huangli" | "fengshui";

/** 工具配置 */
const TOOLS: { id: ToolId; label: string; endpoint: string; body: () => object }[] = [
  {
    id: "bazi",
    label: "八字",
    endpoint: "/api/divination/bazi",
    body: () => ({
      year: 1999,
      month: 6,
      day: 29,
      hour: 7,
      minute: 20,
    }),
  },
  {
    id: "ziwei",
    label: "紫微",
    endpoint: "/api/divination/ziwei",
    body: () => ({
      year: 1990,
      month: 5,
      day: 1,
      hour: 12,
      gender: "female",
    }),
  },
  {
    id: "liuyao",
    label: "六爻",
    endpoint: "/api/divination/liuyao",
    body: () => ({
      mode: "manual",
      dayGan: "甲",
      values: [8, 7, 8, 7, 7, 7],
    }),
  },
  {
    id: "huangli",
    label: "黄历",
    endpoint: "/api/divination/huangli",
    body: () => ({
      year: 2026,
      month: 8,
      day: 28,
      withPlain: true,
    }),
  },
  {
    id: "fengshui",
    label: "风水",
    endpoint: "/api/divination/fengshui",
    body: () => ({
      year: 1990,
      month: 5,
      day: 1,
      gender: "male",
      headingDeg: 180,
    }),
  },
];

/**
 * 服务端排盘工具面板：一键测各门类 API（需登录）。
 */
export function DivinationToolsPanel() {
  const [active, setActive] = useState<ToolId>("bazi");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  /** 调用当前选中工具的 API */
  async function handleRun(e: FormEvent) {
    e.preventDefault();
    const tool = TOOLS.find((t) => t.id === active)!;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(tool.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(tool.body()),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? `HTTP ${res.status}`);
        return;
      }
      setResult(JSON.stringify(data, null, 2));
    } catch (err) {
      setError(err instanceof Error ? err.message : "请求失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>服务端排盘工具</CardTitle>
        <CardDescription>
          八字 / 紫微 / 六爻 / 黄历 / 风水 — 算法均在 Node，需登录。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {TOOLS.map((t) => (
            <Button
              key={t.id}
              type="button"
              variant={active === t.id ? "default" : "outline"}
              size="sm"
              onClick={() => setActive(t.id)}
            >
              {t.label}
            </Button>
          ))}
        </div>
        <form onSubmit={handleRun}>
          <Button type="submit" disabled={loading}>
            {loading ? "请求中…" : `测试 ${TOOLS.find((t) => t.id === active)?.label} API`}
          </Button>
        </form>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {result ? (
          <pre className="max-h-80 overflow-auto rounded-md border bg-muted/40 p-3 text-xs">
            {result}
          </pre>
        ) : null}
      </CardContent>
    </Card>
  );
}
