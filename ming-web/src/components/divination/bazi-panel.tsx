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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** 八字 API 返回的 chart 摘要（与后端 Public 字段对齐） */
interface BaziApiChart {
  pillars: {
    year: { ganZhi: string };
    month: { ganZhi: string };
    day: { ganZhi: string };
    hour: { ganZhi: string } | null;
  };
  shenSha: Array<{ name: string; pillars: string[] }>;
}

/**
 * 八字排盘测试面板：调用服务端 /api/divination/bazi，验证算法不在前端。
 */
export function BaziPanel() {
  const [year, setYear] = useState("1999");
  const [month, setMonth] = useState("6");
  const [day, setDay] = useState("29");
  const [hour, setHour] = useState("7");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chart, setChart] = useState<BaziApiChart | null>(null);

  /** 请求服务端排盘 */
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setChart(null);

    try {
      const res = await fetch("/api/divination/bazi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          year: Number(year),
          month: Number(month),
          day: Number(day),
          hour: Number(hour),
          minute: 20,
        }),
      });
      const data = (await res.json()) as { chart?: BaziApiChart; error?: string };
      if (!res.ok) {
        setError(data.error ?? `HTTP ${res.status}`);
        return;
      }
      setChart(data.chart ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "请求失败");
    } finally {
      setLoading(false);
    }
  }

  const pillars = chart
    ? [
        chart.pillars.year.ganZhi,
        chart.pillars.month.ganZhi,
        chart.pillars.day.ganZhi,
        chart.pillars.hour?.ganZhi ?? "—",
      ].join(" · ")
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>八字排盘（服务端）</CardTitle>
        <CardDescription>
          算法在 Node 运行，浏览器仅收到结果 JSON。需先登录。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-4">
          <div className="space-y-1">
            <Label htmlFor="bazi-year">年</Label>
            <Input id="bazi-year" value={year} onChange={(e) => setYear(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="bazi-month">月</Label>
            <Input id="bazi-month" value={month} onChange={(e) => setMonth(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="bazi-day">日</Label>
            <Input id="bazi-day" value={day} onChange={(e) => setDay(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="bazi-hour">时 (0-23)</Label>
            <Input id="bazi-hour" value={hour} onChange={(e) => setHour(e.target.value)} />
          </div>
          <Button type="submit" disabled={loading} className="sm:col-span-4">
            {loading ? "排盘中…" : "服务端排盘"}
          </Button>
        </form>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {pillars ? (
          <div className="rounded-md border bg-muted/40 p-3 text-sm">
            <p className="font-medium">四柱：{pillars}</p>
            <p className="mt-2 text-muted-foreground">
              神煞 {chart?.shenSha.length ?? 0} 项：
              {chart?.shenSha.slice(0, 8).map((s) => s.name).join("、")}
              {(chart?.shenSha.length ?? 0) > 8 ? "…" : ""}
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
