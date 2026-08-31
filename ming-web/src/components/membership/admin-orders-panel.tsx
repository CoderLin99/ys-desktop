"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { orderStatusLabel } from "@/lib/membership/order-status";

/** 订单列表项 */
interface AdminOrder {
  id: string;
  email: string;
  order_no: string;
  status: string;
  note: string | null;
  proof_data: string | null;
  admin_note: string | null;
  created_at: string;
}

/**
 * 管理员：订单审批（通过 / 拒绝）。
 * @param defaultApproveDays 站点配置的默认开通天数
 */
export function AdminOrdersPanel({
  defaultApproveDays = 30,
}: {
  /** 来自站点配置的默认审批开通天数 */
  defaultApproveDays?: number;
}) {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [approveDays, setApproveDays] = useState(defaultApproveDays);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    setApproveDays(defaultApproveDays);
  }, [defaultApproveDays]);

  /** 加载订单 */
  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const q = filter === "pending" ? "?status=pending" : "";
      const res = await fetch(`/api/admin/orders${q}`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "加载失败");
      setOrders(data.orders ?? []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  /** 审批通过 */
  async function approve(id: string) {
    try {
      const res = await fetch(`/api/admin/orders/${id}/approve`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: approveDays }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "失败");
      }
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "审批失败");
    }
  }

  /** 拒绝 */
  async function reject(id: string, adminNote: string) {
    try {
      const res = await fetch(`/api/admin/orders/${id}/reject`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminNote }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "失败");
      }
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "操作失败");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          筛选
          <select
            className="ml-2 rounded border px-2 py-1"
            value={filter}
            onChange={(e) => setFilter(e.target.value as "pending" | "all")}
          >
            <option value="pending">待审批</option>
            <option value="all">全部</option>
          </select>
        </label>
        <label className="text-sm">
          开通天数
          <Input
            type="number"
            className="ml-2 inline-block w-20"
            min={1}
            max={365}
            value={approveDays}
            onChange={(e) => setApproveDays(Number(e.target.value))}
          />
        </label>
        <Button type="button" variant="outline" size="sm" onClick={load}>
          刷新
        </Button>
      </div>

      {err ? <p className="text-sm text-destructive">{err}</p> : null}
      {loading ? <p className="text-sm text-muted-foreground">加载中…</p> : null}

      {!loading && orders.length === 0 ? (
        <p className="text-sm text-muted-foreground">暂无订单</p>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => (
            <Card key={o.id}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  {o.order_no}
                  <span className="text-xs font-normal text-muted-foreground">
                    {orderStatusLabel(o.status)}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>
                  {o.email} · {new Date(o.created_at).toLocaleString("zh-CN")}
                </p>
                {o.note ? <p className="text-muted-foreground">备注：{o.note}</p> : null}
                {o.proof_data ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={o.proof_data}
                    alt="付款截图"
                    className="max-h-48 rounded border"
                  />
                ) : null}
                {o.status === "pending" ? (
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button type="button" size="sm" onClick={() => approve(o.id)}>
                      通过 (+{approveDays}天)
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => reject(o.id, "未收到款项")}
                    >
                      拒绝
                    </Button>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
