/**
 * 会员订单：生成订单号、上传付款截图、提交审批。
 */
import { getSupabase, type Database } from '../lib/supabase'
import { generateOrderNo } from '../lib/orderNo'

type OrderRow = Database['public']['Tables']['orders']['Row']

const PROOF_BUCKET = 'order-proofs'
const MAX_PROOF_BYTES = 5 * 1024 * 1024

/**
 * 创建 draft 订单并返回订单号（用户先去付款）。
 * @param userId 用户 id
 * @param email 用户邮箱
 */
export async function createDraftOrder(userId: string, email: string): Promise<OrderRow> {
  const sb = getSupabase()
  let lastErr: Error | null = null

  for (let attempt = 0; attempt < 5; attempt++) {
    const orderNo = generateOrderNo()
    const { data, error } = await sb
      .from('orders')
      .insert({
        user_id: userId,
        email,
        order_no: orderNo,
        status: 'draft',
        note: null,
        proof_url: null
      })
      .select('*')
      .single()

    if (!error && data) return data
    lastErr = new Error(error?.message || '创建订单失败')
    if (!/unique|duplicate/i.test(error?.message || '')) break
  }

  throw lastErr ?? new Error('创建订单失败，请稍后重试')
}

/**
 * 上传付款截图到 Supabase Storage。
 * @param userId 用户 id
 * @param orderNo 订单号
 * @param file 图片文件
 * @returns 公开访问 URL
 */
export async function uploadOrderProof(
  userId: string,
  orderNo: string,
  file: File
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('请上传图片格式的付款截图（JPG/PNG/WebP）')
  }
  if (file.size > MAX_PROOF_BYTES) {
    throw new Error('截图不能超过 5MB')
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext) ? ext : 'jpg'
  const path = `${userId}/${orderNo}.${safeExt}`

  const sb = getSupabase()
  const { error } = await sb.storage.from(PROOF_BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type
  })
  if (error) throw new Error(`截图上传失败：${error.message}`)

  const { data } = sb.storage.from(PROOF_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

/**
 * 提交 draft 订单：写入截图 URL + 备注，状态改为 pending 待审批。
 * @param orderId 订单 uuid
 * @param userId 当前用户
 * @param proofUrl 截图 URL
 * @param note 可选补充说明
 */
export async function submitDraftOrder(
  orderId: string,
  userId: string,
  proofUrl: string,
  note?: string
): Promise<void> {
  if (!proofUrl.trim()) throw new Error('请先上传付款截图')

  const sb = getSupabase()
  const { error } = await sb
    .from('orders')
    .update({
      status: 'pending',
      proof_url: proofUrl.trim(),
      note: note?.trim() || null
    })
    .eq('id', orderId)
    .eq('user_id', userId)
    .eq('status', 'draft')

  if (error) throw new Error(error.message)
}
