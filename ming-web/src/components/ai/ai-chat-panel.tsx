"use client";

import Link from "next/link";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

/** 会员状态（AI 配额） */
interface AiQuotaStatus {
  isMember: boolean;
  trialUsed: number;
  trialLimit: number;
  trialRemaining: number;
  canUseAi: boolean;
}

/**
 * AI 流式对话：非会员 3 次试用，会员不限次。
 */
export function AiChatPanel() {
  const [input, setInput] = useState("");
  const [quota, setQuota] = useState<AiQuotaStatus | null>(null);
  const [quotaErr, setQuotaErr] = useState<string | null>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/ai/chat",
      }),
    [],
  );

  const { messages, sendMessage, status, error } = useChat({
    transport,
  });

  const busy = status === "streaming" || status === "submitted";

  /** 拉取试用/会员状态 */
  const refreshQuota = useCallback(async () => {
    const res = await fetch("/api/membership/status", { credentials: "include" });
    if (res.ok) {
      const data = (await res.json()) as AiQuotaStatus;
      setQuota(data);
      setQuotaErr(null);
    }
  }, []);

  useEffect(() => {
    void refreshQuota();
  }, [refreshQuota]);

  /** 发送用户消息 */
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    if (quota && !quota.canUseAi) {
      setQuotaErr("试用次数已用完，请开通会员");
      return;
    }
    setInput("");
    setQuotaErr(null);
    await sendMessage({ text });
    await refreshQuota();
  }

  const quotaHint = quota
    ? quota.isMember
      ? "会员：AI 不限次数"
      : `试用：剩余 ${quota.trialRemaining} / ${quota.trialLimit} 次`
    : "加载配额…";

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI 解读</CardTitle>
        <CardDescription>
          {quotaHint}。排盘免费，解读需登录。
          {!quota?.isMember ? (
            <>
              {" "}
              <Link href="/member" className="underline">
                开通会员
              </Link>
            </>
          ) : null}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="min-h-[240px] space-y-3 rounded-md border bg-background p-4 text-sm">
          {messages.length === 0 ? (
            <p className="text-muted-foreground">输入问题开始 AI 流式解读…</p>
          ) : (
            messages.map((message) => (
              <div key={message.id} className="space-y-1">
                <p className="font-medium">{message.role === "user" ? "你" : "AI"}</p>
                <p className="whitespace-pre-wrap text-muted-foreground">
                  {message.parts
                    .filter((part) => part.type === "text")
                    .map((part) => part.text)
                    .join("")}
                </p>
              </div>
            ))
          )}
        </div>
        {quotaErr ? (
          <p className="text-sm text-destructive">
            {quotaErr}{" "}
            <Link href="/member" className="underline">
              去开通
            </Link>
          </p>
        ) : null}
        {error ? (
          <p className="text-sm text-destructive">
            {error.message}
            {error.message.includes("试用") ? (
              <>
                {" "}
                <Link href="/member" className="underline">
                  开通会员
                </Link>
              </>
            ) : null}
          </p>
        ) : null}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入问题…"
            disabled={busy || (quota !== null && !quota.canUseAi)}
          />
          <Button
            type="submit"
            disabled={busy || (quota !== null && !quota.canUseAi)}
          >
            发送
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
