"use client";

import { createAuthClient } from "better-auth/react";
import { getAppBaseUrl } from "@/lib/env-client";

/**
 * 浏览器端 Better Auth 客户端（登录/注册/登出）。
 * baseURL 在客户端通过 NEXT_PUBLIC_APP_URL 或当前 origin 推断。
 */
export const authClient = createAuthClient({
  baseURL: getAppBaseUrl(),
});
