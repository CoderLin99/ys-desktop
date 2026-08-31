import { headers } from "next/headers";
import { getAuth } from "@/lib/auth";

/**
 * API 路由共用：校验 Better Auth 会话。
 * @returns 用户 id 与邮箱；未登录返回 null
 */
export async function requireApiSession(): Promise<{
  userId: string;
  email: string;
} | null> {
  const session = await getAuth().api.getSession({
    headers: await headers(),
  });
  if (!session?.user) return null;
  return {
    userId: session.user.id,
    email: session.user.email,
  };
}

/**
 * 未登录 JSON 401。
 */
export function unauthorizedResponse(): Response {
  return Response.json({ error: "请先登录" }, { status: 401 });
}

/**
 * 解析 JSON 请求体；失败返回 null。
 * @param request HTTP 请求
 */
export async function parseJsonBody(request: Request): Promise<unknown | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
