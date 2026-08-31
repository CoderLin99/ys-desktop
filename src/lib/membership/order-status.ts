/** 订单状态中文 */
const LABELS: Record<string, string> = {
  draft: "待付款/上传截图",
  pending: "待审批",
  approved: "已通过",
  rejected: "已拒绝",
};

/**
 * 订单状态展示文案。
 * @param status 状态码
 */
export function orderStatusLabel(status: string): string {
  return LABELS[status] ?? status;
}
