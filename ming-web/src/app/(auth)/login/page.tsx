import { Suspense } from "react";
import { LoginForm } from "./login-form";

/**
 * 登录页入口（Suspense 包裹 useSearchParams）。
 */
export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-center text-sm text-muted-foreground">加载中…</div>}>
      <LoginForm />
    </Suspense>
  );
}
