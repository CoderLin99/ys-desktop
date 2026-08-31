"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { FormEvent, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

/**
 * AI 对话占位组件：验证 /api/ai/chat 流式链路（业务 Prompt 后续替换）。
 */
export function AiChatPanel() {
  const [input, setInput] = useState("");

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

  /** 发送用户消息 */
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    await sendMessage({ text });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI 对话（架构验证）</CardTitle>
        <CardDescription>
          需配置 AI_BASE_URL / AI_API_KEY / AI_MODEL；排盘等业务数据尚未接入。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="min-h-[240px] space-y-3 rounded-md border bg-background p-4 text-sm">
          {messages.length === 0 ? (
            <p className="text-muted-foreground">发送一条消息测试流式回复…</p>
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
        {error ? (
          <p className="text-sm text-destructive">{error.message}</p>
        ) : null}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入问题…"
            disabled={busy}
          />
          <Button type="submit" disabled={busy}>
            发送
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
