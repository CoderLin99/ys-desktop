"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
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
import { getAlipayQrUrl, getWechatQrUrl } from "@/lib/env-client";
import { orderStatusLabel } from "@/lib/membership/order-status";

/** 会员状态 API 响应 */
interface MembershipStatusResponse {
  isMember: boolean;
  isAdmin: boolean;
  expireAt: string | null;
  trialUsed: number;
  trialLimit: number;
  trialRemaining: number;
  canUseAi: boolean;
  openOrder: { id: string; orderNo: string; status: string } | null;
  latestOrder: { orderNo: string; status: string; createdAt: string } | null;
}

/**
 * 会员中心：支付宝/微信扫码 + 订单号 + 截图审批（沿用 ys-desktop 流程）。
 */
export function MemberCenter() {
  const [status, setStatus] = useState<MembershipStatusResponse | null>(null);
  const [note, setNote] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const alipayQr = getAlipayQrUrl();
  const wechatQr = getWechatQrUrl();

  /** 刷新会员状态 */
  const refresh = useCallback(async () => {
    const res = await fetch("/api/membership/status", { credentials: "include" });
    if (res.ok) {
      setStatus((await res.json()) as MembershipStatusResponse);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /** 生成订单号 */
  async function createOrder() {
    setLoading(true);
    setErr("");
    setMsg("");
    try {
      const res = await fetch("/api/orders/create", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "创建失败");
      setMsg(`订单号：${data.order.order_no}，转账时请备注此订单号`);
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "创建失败");
    } finally {
      setLoading(false);
    }
  }

  /** 复制订单号 */
  async function copyOrderNo() {
    const no = status?.openOrder?.orderNo;
    if (!no) return;
    await navigator.clipboard.writeText(no);
    setMsg("订单号已复制");
  }

  /** 提交截图审批 */
  async function submitOrder(e: FormEvent) {
    e.preventDefault();
    if (!proofFile) {
      setErr("请上传付款截图");
      return;
    }
    setLoading(true);
    setErr("");
    setMsg("");
    try {
      const form = new FormData();
      form.append("proof", proofFile);
      form.append("note", note);
      if (status?.openOrder?.id) {
        form.append("orderId", status.openOrder.id);
      }
      const res = await fetch("/api/orders/submit", {
        method: "POST",
        credentials: "include",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "提交失败");
      setMsg("已提交审批，请等待管理员处理");
      setProofFile(null);
      setNote("");
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "提交失败");
    } finally {
      setLoading(false);
    }
  }

  const expireLabel = status?.expireAt
    ? new Date(status.expireAt).toLocaleDateString("zh-CN")
    : "未开通";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">会员中心</h1>
        <p className="text-muted-foreground">
          排盘免费；AI 解读非会员可试用 {status?.trialLimit ?? 3} 次。开通后不限次。
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">当前权益</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            会员状态：
            {status?.isMember ? (
              <span className="font-medium text-green-700">有效至 {expireLabel}</span>
            ) : (
              <span className="text-muted-foreground">未开通</span>
            )}
          </p>
          {!status?.isMember ? (
            <p className="text-muted-foreground">
              AI 试用：已用 {status?.trialUsed ?? 0} / {status?.trialLimit ?? 3}，剩余{" "}
              {status?.trialRemaining ?? "—"} 次
            </p>
          ) : (
            <p className="text-muted-foreground">AI 解读：不限次数</p>
          )}
          {status?.latestOrder ? (
            <p className="text-muted-foreground">
              最近订单：{status.latestOrder.orderNo}（
              {orderStatusLabel(status.latestOrder.status)}）
            </p>
          ) : null}
        </CardContent>
      </Card>

      {!status?.isMember ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">开通会员</CardTitle>
            <CardDescription>
              1. 生成订单号 → 2. 扫码转账（备注订单号）→ 3. 上传截图 → 4. 等待审批
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap gap-8 justify-center">
              <div className="text-center">
                <p className="mb-2 text-sm font-medium">支付宝</p>
                <Image
                  src={alipayQr}
                  alt="支付宝收款码"
                  width={200}
                  height={200}
                  className="mx-auto rounded-md border"
                  unoptimized
                />
              </div>
              <div className="text-center">
                <p className="mb-2 text-sm font-medium">微信</p>
                <Image
                  src={wechatQr}
                  alt="微信收款码"
                  width={200}
                  height={200}
                  className="mx-auto rounded-md border"
                  unoptimized
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={createOrder} disabled={loading}>
                {status?.openOrder ? "已有订单号" : "生成订单号"}
              </Button>
              {status?.openOrder ? (
                <>
                  <code className="rounded bg-muted px-2 py-1 text-sm">
                    {status.openOrder.orderNo}
                  </code>
                  <Button type="button" variant="outline" size="sm" onClick={copyOrderNo}>
                    复制
                  </Button>
                </>
              ) : null}
            </div>

            {status?.openOrder?.status === "draft" ? (
              <form onSubmit={submitOrder} className="space-y-3 border-t pt-4">
                <div className="space-y-2">
                  <Label htmlFor="proof">付款截图</Label>
                  <Input
                    id="proof"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="note">备注（可选）</Label>
                  <Input
                    id="note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="转账时间、金额等"
                  />
                </div>
                <Button type="submit" disabled={loading}>
                  我已支付，提交审批
                </Button>
              </form>
            ) : status?.openOrder?.status === "pending" ? (
              <p className="text-sm text-amber-700">订单审批中，请耐心等待</p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {msg ? <p className="text-sm text-green-700">{msg}</p> : null}
      {err ? <p className="text-sm text-destructive">{err}</p> : null}

      <p className="text-sm text-muted-foreground">
        <Link href="/workspace" className="underline">
          返回工作台
        </Link>
      </p>
    </div>
  );
}
