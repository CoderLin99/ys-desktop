import "server-only";

import {
  isErrorResponse,
  requireAdminSession,
} from "@/lib/membership/http/admin";
import {
  getSiteSettings,
  updateSiteSettings,
} from "@/lib/membership/settings";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/settings — 读取站点配置（仅 admin）。
 */
export async function GET() {
  const session = await requireAdminSession();
  if (isErrorResponse(session)) return session;

  const settings = await getSiteSettings();
  return Response.json({ settings });
}

/**
 * PATCH /api/admin/settings — 更新站点配置（仅 admin）。
 * Body: { aiTrialLimit?: number; membershipApproveDays?: number }
 */
export async function PATCH(request: Request) {
  const session = await requireAdminSession();
  if (isErrorResponse(session)) return session;

  let body: {
    aiTrialLimit?: number;
    membershipApproveDays?: number;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "请求体须为 JSON" }, { status: 400 });
  }

  try {
    const settings = await updateSiteSettings(body, session.userId);
    return Response.json({ settings });
  } catch (err) {
    const message = err instanceof Error ? err.message : "更新失败";
    return Response.json({ error: message }, { status: 400 });
  }
}
