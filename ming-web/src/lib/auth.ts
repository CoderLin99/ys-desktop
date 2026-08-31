import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { Pool } from "pg";
import { getAppBaseUrl, getDatabaseUrl, getEnv } from "@/lib/env";

/** Better Auth 单例类型 */
type AuthInstance = ReturnType<typeof createAuth>;

/** Better Auth 单例，避免 dev 热重载重复创建 */
let authInstance: AuthInstance | null = null;

/**
 * 创建 Better Auth 实例（邮箱密码登录；OAuth 可按 env 后续扩展）。
 */
function createAuth() {
  const env = getEnv();

  const database = new Pool({
    connectionString: getDatabaseUrl(),
  });

  return betterAuth({
    appName: "ming-web",
    baseURL: getAppBaseUrl(),
    secret:
      env.BETTER_AUTH_SECRET ??
      "development-placeholder-secret-change-me-1234567890",
    database,
    emailAndPassword: {
      enabled: true,
      /** 生产环境建议开启邮箱验证 */
      requireEmailVerification: false,
    },
    plugins: [nextCookies()],
  });
}

/**
 * 服务端鉴权入口（API Route、Server Component 共用）。
 */
export function getAuth(): AuthInstance {
  if (!authInstance) {
    authInstance = createAuth();
  }
  return authInstance;
}

