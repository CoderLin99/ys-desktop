/**
 * 生成对外订单号：YI + 年月日 + 6 位随机码。
 * 例：YI20260830-A3F9K2
 */
export function generateOrderNo(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let rand = ''
  for (let i = 0; i < 6; i++) {
    rand += chars[Math.floor(Math.random() * chars.length)]
  }
  return `YI${y}${m}${day}-${rand}`
}

/**
 * 校验订单号格式。
 * @param orderNo 订单号
 */
export function isValidOrderNo(orderNo: string): boolean {
  return /^YI\d{8}-[A-Z0-9]{6}$/.test(orderNo.trim())
}
