/**
 * 健康检查（部署探活、CI smoke test）。
 */
export async function GET() {
  return Response.json({
    ok: true,
    service: "ming-web",
    timestamp: new Date().toISOString(),
  });
}
