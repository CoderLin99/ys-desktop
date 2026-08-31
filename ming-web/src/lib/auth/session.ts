import { headers } from "next/headers";
import { getAuth } from "@/lib/auth";

/** 会话用户信息（简化类型，避免泄漏 Better Auth 内部结构） */
export interface SessionUser {
  id: string;
  email: string;
  name: string;
  image?: string | null;
}

/**
 * 在 Server Component / Route Handler 中获取当前登录用户。
 * @returns 未登录时 null
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getAuth().api.getSession({
    headers: await headers(),
  });

  if (!session?.user) return null;

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    image: session.user.image,
  };
}

/**
 * 要求已登录，否则返回 null（由调用方 redirect）。
 */
export async function requireSessionUser(): Promise<SessionUser | null> {
  return getSessionUser();
}
