/**
 * 返回纯文本 Response（非流式兜底或错误提示）。
 * @param body 响应正文
 * @param status HTTP 状态码
 */
export function textResponse(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
