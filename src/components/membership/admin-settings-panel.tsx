"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

/** 站点配置快照（与 API 一致） */
interface SiteSettings {
  aiTrialLimit: number;
  membershipApproveDays: number;
}

/**
 * 管理员：站点配置（AI 试用次数、审批默认开通天数）。
 */
export function AdminSettingsPanel() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [aiTrialLimit, setAiTrialLimit] = useState(3);
  const [membershipApproveDays, setMembershipApproveDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  /** 从 API 加载当前配置 */
  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await fetch("/api/admin/settings", { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "加载失败");
      const s = data.settings as SiteSettings;
      setSettings(s);
      setAiTrialLimit(s.aiTrialLimit);
      setMembershipApproveDays(s.membershipApproveDays);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /** 保存配置到数据库 */
  async function save() {
    setSaving(true);
    setMsg("");
    setErr("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aiTrialLimit, membershipApproveDays }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "保存失败");
      const s = data.settings as SiteSettings;
      setSettings(s);
      setAiTrialLimit(s.aiTrialLimit);
      setMembershipApproveDays(s.membershipApproveDays);
      setMsg("已保存，新用户立即生效；已用完旧上限的用户仍按当时规则。");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">加载配置中…</p>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>会员与 AI</CardTitle>
          <CardDescription>
            修改后立即生效；非会员 AI 试用按当前上限与已用次数计算剩余额度。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="block space-y-1 text-sm">
            <span className="font-medium">非会员 AI 试用次数</span>
            <Input
              type="number"
              min={0}
              max={100}
              value={aiTrialLimit}
              onChange={(e) => setAiTrialLimit(Number(e.target.value))}
            />
            <span className="text-muted-foreground">
              0 表示关闭试用；当前线上值：{settings?.aiTrialLimit ?? "—"}
            </span>
          </label>

          <label className="block space-y-1 text-sm">
            <span className="font-medium">订单审批默认开通天数</span>
            <Input
              type="number"
              min={1}
              max={365}
              value={membershipApproveDays}
              onChange={(e) => setMembershipApproveDays(Number(e.target.value))}
            />
            <span className="text-muted-foreground">
              订单审批页「开通天数」初始值；审批时可临时改。当前：{" "}
              {settings?.membershipApproveDays ?? "—"} 天
            </span>
          </label>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button type="button" onClick={save} disabled={saving}>
              {saving ? "保存中…" : "保存配置"}
            </Button>
            <Button type="button" variant="outline" onClick={load} disabled={saving}>
              重新加载
            </Button>
          </div>

          {msg ? <p className="text-sm text-green-600">{msg}</p> : null}
          {err ? <p className="text-sm text-destructive">{err}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
