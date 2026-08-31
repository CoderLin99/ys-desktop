/**
 * 浏览器端环境（仅 NEXT_PUBLIC_* 与 window.location）。
 */

/**
 * 客户端应用根 URL，用于 Better Auth fetch。
 * @returns 完整 URL 字符串
 */
export function getAppBaseUrl(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:5555";
}
