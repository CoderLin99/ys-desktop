import "server-only";

import { requireApiSession, unauthorizedResponse } from "@/lib/divination/http/require-session";
import {
  fileToProofDataUrl,
  getOpenOrder,
  submitOrder,
} from "@/lib/membership/orders";

export const dynamic = "force-dynamic";

/**
 * POST /api/orders/submit — 上传付款截图并提交审批（multipart）。
 */
export async function POST(request: Request) {
  const session = await requireApiSession();
  if (!session) return unauthorizedResponse();

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "无效表单" }, { status: 400 });
  }

  const file = form.get("proof");
  if (!(file instanceof File)) {
    return Response.json({ error: "请上传付款截图" }, { status: 400 });
  }

  const note = String(form.get("note") ?? "").slice(0, 500);
  const orderId = String(form.get("orderId") ?? "");

  let targetId = orderId;
  if (!targetId) {
    const open = await getOpenOrder(session.userId);
    if (!open) {
      return Response.json({ error: "请先生成订单号" }, { status: 400 });
    }
    targetId = open.id;
  }

  try {
    const proofDataUrl = await fileToProofDataUrl(file);
    const order = await submitOrder(
      targetId,
      session.userId,
      proofDataUrl,
      note || undefined,
    );
    return Response.json({ order });
  } catch (err) {
    const message = err instanceof Error ? err.message : "提交失败";
    return Response.json({ error: message }, { status: 400 });
  }
}
