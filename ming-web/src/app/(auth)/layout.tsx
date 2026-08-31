import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "登录 · ming-web",
};

/**
 * 认证区布局：居中卡片，无 dashboard 侧栏。
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
