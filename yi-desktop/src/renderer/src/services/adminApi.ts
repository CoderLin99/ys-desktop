/**
 * 管理端：订单审批、会员延期、大模型配置 CRUD。
 */
import { getSupabase, type Database } from '../lib/supabase'

type OrderRow = Database['public']['Tables']['orders']['Row']
type MembershipRow = Database['public']['Tables']['memberships']['Row']
type LlmRow = Database['public']['Tables']['llm_configs']['Row']
type ProfileRow = Database['public']['Tables']['profiles']['Row']

/**
 * 列出订单（可按状态过滤）。
 * @param status 可选状态
 */
export async function listOrders(
  status?: OrderRow['status']
): Promise<OrderRow[]> {
  const sb = getSupabase()
  let q = sb.from('orders').select('*').order('created_at', { ascending: false })
  if (status) q = q.eq('status', status)
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return data ?? []
}

/**
 * 审批通过：更新订单 + 写入/延长会员。
 * @param orderId 订单 id
 * @param days 开通天数，默认 30
 */
export async function approveOrder(orderId: string, days = 30): Promise<void> {
  const sb = getSupabase()
  const { data: order, error: oErr } = await sb.from('orders').select('*').eq('id', orderId).single()
  if (oErr || !order) throw new Error(oErr?.message || '订单不存在')

  const now = new Date()
  const { data: existing } = await sb
    .from('memberships')
    .select('expire_at')
    .eq('user_id', order.user_id)
    .maybeSingle()

  let expire = new Date(now)
  if (existing?.expire_at && new Date(existing.expire_at) > now) {
    expire = new Date(existing.expire_at)
  }
  expire.setDate(expire.getDate() + days)

  const { error: mErr } = await sb.from('memberships').upsert({
    user_id: order.user_id,
    expire_at: expire.toISOString(),
    plan: 'monthly',
    updated_at: now.toISOString()
  })
  if (mErr) throw new Error(mErr.message)

  const { error: uErr } = await sb
    .from('orders')
    .update({
      status: 'approved',
      reviewed_at: now.toISOString()
    })
    .eq('id', orderId)
  if (uErr) throw new Error(uErr.message)
}

/**
 * 拒绝订单。
 * @param orderId 订单 id
 * @param adminNote 拒绝原因
 */
export async function rejectOrder(orderId: string, adminNote?: string): Promise<void> {
  const sb = getSupabase()
  const { error } = await sb
    .from('orders')
    .update({
      status: 'rejected',
      admin_note: adminNote?.trim() || null,
      reviewed_at: new Date().toISOString()
    })
    .eq('id', orderId)
  if (error) throw new Error(error.message)
}

/**
 * 列出全部会员。
 */
export async function listMemberships(): Promise<
  Array<MembershipRow & { email?: string }>
> {
  const sb = getSupabase()
  const { data: mems, error } = await sb.from('memberships').select('*').order('expire_at', {
    ascending: false
  })
  if (error) throw new Error(error.message)
  const { data: profiles } = await sb.from('profiles').select('id, email')
  const emailMap = new Map((profiles ?? []).map((p) => [p.id, p.email]))
  return (mems ?? []).map((m) => ({ ...m, email: emailMap.get(m.user_id) }))
}

/**
 * 手动调整会员到期。
 */
export async function setMembershipExpire(userId: string, expireAt: string): Promise<void> {
  const sb = getSupabase()
  const { error } = await sb.from('memberships').upsert({
    user_id: userId,
    expire_at: expireAt,
    plan: 'manual',
    updated_at: new Date().toISOString()
  })
  if (error) throw new Error(error.message)
}

/**
 * 列出用户资料。
 */
export async function listProfiles(): Promise<ProfileRow[]> {
  const sb = getSupabase()
  const { data, error } = await sb.from('profiles').select('*').order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data ?? []
}

/**
 * 列出大模型配置。
 */
export async function listLlmConfigs(): Promise<LlmRow[]> {
  const sb = getSupabase()
  const { data, error } = await sb.from('llm_configs').select('*').order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data ?? []
}

/**
 * 新建或更新大模型配置。
 */
export async function saveLlmConfig(
  row: Partial<LlmRow> & Pick<LlmRow, 'name' | 'base_url' | 'model'>
): Promise<void> {
  const sb = getSupabase()
  const payload = {
    name: row.name,
    base_url: row.base_url.replace(/\/$/, ''),
    model: row.model,
    api_key: row.api_key || '',
    enabled: row.enabled ?? true,
    is_default: row.is_default ?? false,
    updated_at: new Date().toISOString()
  }
  if (row.id) {
    const patch = { ...payload }
    if (!patch.api_key) delete (patch as { api_key?: string }).api_key
    const { error } = await sb.from('llm_configs').update(patch).eq('id', row.id)
    if (error) throw new Error(error.message)
  } else {
    if (!payload.api_key) throw new Error('新建配置必须填写 API Key')
    const { error } = await sb.from('llm_configs').insert(payload)
    if (error) throw new Error(error.message)
  }
}

/**
 * 删除大模型配置。
 */
export async function deleteLlmConfig(id: string): Promise<void> {
  const sb = getSupabase()
  const { error } = await sb.from('llm_configs').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

/**
 * Key 脱敏展示。
 */
export function maskApiKey(key: string): string {
  const k = (key || '').trim()
  if (k.length <= 8) return '****'
  return `${k.slice(0, 4)}****${k.slice(-4)}`
}
