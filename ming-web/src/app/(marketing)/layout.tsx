import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/site-header";

export const metadata: Metadata = {
  title: "ming-web",
  description: "借鉴 zhaoming 架构的命理 Web SaaS 脚手架",
};

/**
 * 营销区布局（Landing、关于等公开页）。
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteHeader />
      {children}
    </>
  );
}
