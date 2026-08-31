import { requireApiSession, unauthorizedResponse } from "@/lib/divination/http/require-session";
import { isAdmin } from "@/lib/data/profiles";

/**
 * 要求管理员权限，否则返回 403 Response。
 * @returns 会话用户 id；失败时返回 Response
 */
export async function requireAdminSession(): Promise<
  { userId: string; email: string } | Response
> {
  const session = await requireApiSession();
  if (!session) return unauthorizedResponse();
  const admin = await isAdmin(session.userId);
  if (!admin) {
    return Response.json({ error: "需要管理员权限" }, { status: 403 });
  }
  return session;
}

/** 判断是否为 Response（类型守卫） */
export function isErrorResponse(
  value: unknown,
): value is Response {
  return value instanceof Response;
}
