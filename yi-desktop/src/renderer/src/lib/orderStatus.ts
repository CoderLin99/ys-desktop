/**
 * 订单状态中文映射（MVP 人工审批）。
 */
export const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: '待审批',
  approved: '已通过',
  rejected: '已拒绝'
}

/**
 * 取订单状态展示文案。
 * @param status 数据库 status
 */
export function orderStatusLabel(status: string | null | undefined): string {
  if (!status) return '—'
  return ORDER_STATUS_LABEL[status] ?? status
}
