/**
 * 邮箱登录 / 会员状态 / 管理端角色 Pinia Store。
 */
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Session, User } from '@supabase/supabase-js'
import { getSupabase, type Database } from '../lib/supabase'
import { isCloudMembershipMode, isSupabaseConfigured } from '../lib/cloudConfig'
import { isAiConfigured, loadAiSettings } from '@rules/bazi/aiPolish'
import { isTauriRuntime } from '../tauriBridge'
import {
  createDraftOrder,
  submitDraftOrder,
  uploadOrderProof
} from '../services/orderService'

type ProfileRow = Database['public']['Tables']['profiles']['Row']
type MembershipRow = Database['public']['Tables']['memberships']['Row']
type OrderRow = Database['public']['Tables']['orders']['Row']

export const useAuthStore = defineStore('auth', () => {
  /** 当前 Supabase 会话 */
  const session = ref<Session | null>(null)
  /** 当前用户 */
  const user = ref<User | null>(null)
  /** 用户资料 */
  const profile = ref<ProfileRow | null>(null)
  /** 会员记录 */
  const membership = ref<MembershipRow | null>(null)
  /** 最近订单（任意状态） */
  const latestOrder = ref<OrderRow | null>(null)
  /** 未完结订单：draft 或 pending */
  const openOrder = ref<OrderRow | null>(null)
  /** 初始化中 */
  const booting = ref(false)
  /** 是否已完成首次 init */
  const initialized = ref(false)
  /** 业务错误文案 */
  const error = ref('')

  /** 是否已登录 */
  const isLoggedIn = computed(() => Boolean(session.value?.user))
  /** 邮箱是否已验证 */
  const emailVerified = computed(() => Boolean(user.value?.email_confirmed_at))
  /** 是否管理员 */
  const isAdmin = computed(() => profile.value?.role === 'admin')
  /** 会员是否在有效期内 */
  const isMember = computed(() => {
    if (!membership.value?.expire_at) return false
    return new Date(membership.value.expire_at) > new Date()
  })
  /** 是否有待审批申请（已提交截图） */
  const hasPendingOrder = computed(() => openOrder.value?.status === 'pending')
  /** 是否有 draft 订单（已生成订单号，待付款上传） */
  const hasDraftOrder = computed(() => openOrder.value?.status === 'draft')

  /** 管理员待审批数量（仅 admin 拉取后有效） */
  const adminPendingCount = ref(0)

  /** 会员到期展示 */
  const memberExpireLabel = computed(() => {
    if (!membership.value?.expire_at) return '未开通'
    const d = new Date(membership.value.expire_at)
    return d.toLocaleString('zh-CN', { dateStyle: 'medium', timeStyle: 'short' })
  })

  /**
   * 是否可使用 AI：Tauri 走本机 Key；Web 走会员 + 云端。
   */
  const canUseAi = computed(() => {
    if (isTauriRuntime()) return isAiConfigured(loadAiSettings())
    if (isCloudMembershipMode()) {
      return isLoggedIn.value && emailVerified.value && isMember.value
    }
    return isAiConfigured(loadAiSettings())
  })

  /**
   * 刷新 profile / membership / 最近订单。
   */
  async function refreshProfile(): Promise<void> {
    if (!isSupabaseConfigured() || !user.value) {
      profile.value = null
      membership.value = null
      latestOrder.value = null
      openOrder.value = null
      adminPendingCount.value = 0
      return
    }
    const sb = getSupabase()
    const uid = user.value.id
    const [pRes, mRes, oRes, openRes] = await Promise.all([
      sb.from('profiles').select('*').eq('id', uid).maybeSingle(),
      sb.from('memberships').select('*').eq('user_id', uid).maybeSingle(),
      sb
        .from('orders')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      sb
        .from('orders')
        .select('*')
        .eq('user_id', uid)
        .in('status', ['draft', 'pending'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    ])
    profile.value = pRes.data ?? null
    membership.value = mRes.data ?? null
    latestOrder.value = oRes.data ?? null
    openOrder.value = openRes.data ?? null

    if (profile.value?.role === 'admin') {
      const { count } = await sb
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
      adminPendingCount.value = count ?? 0
    } else {
      adminPendingCount.value = 0
    }
  }

  /**
   * 应用会话到 store。
   * @param s Supabase 会话
   */
  async function applySession(s: Session | null): Promise<void> {
    session.value = s
    user.value = s?.user ?? null
    await refreshProfile()
  }

  /**
   * 启动时恢复登录态并订阅 auth 变化。
   */
  async function init(): Promise<void> {
    if (!isSupabaseConfigured() || initialized.value) return
    booting.value = true
    error.value = ''
    try {
      const sb = getSupabase()
      const { data } = await sb.auth.getSession()
      await applySession(data.session)
      sb.auth.onAuthStateChange((_event, s) => {
        void applySession(s)
      })
      initialized.value = true
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      booting.value = false
    }
  }

  /**
   * 邮箱密码注册。
   * @param email 邮箱
   * @param password 密码
   */
  async function register(email: string, password: string): Promise<void> {
    error.value = ''
    const sb = getSupabase()
    const { error: err } = await sb.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: `${window.location.origin}${window.location.pathname}#/login` }
    })
    if (err) throw new Error(err.message)
  }

  /**
   * 邮箱密码登录。
   */
  async function login(email: string, password: string): Promise<void> {
    error.value = ''
    const sb = getSupabase()
    const { data, error: err } = await sb.auth.signInWithPassword({
      email: email.trim(),
      password
    })
    if (err) throw new Error(err.message)
    await applySession(data.session)
  }

  /**
   * 退出登录。
   */
  async function logout(): Promise<void> {
    const sb = getSupabase()
    await sb.auth.signOut()
    await applySession(null)
  }

  /**
   * 发送密码重置邮件。
   */
  async function resetPassword(email: string): Promise<void> {
    const sb = getSupabase()
    const { error: err } = await sb.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}${window.location.pathname}#/login`
    })
    if (err) throw new Error(err.message)
  }

  /**
   * 生成 draft 订单号（第一步）。
   */
  async function createMembershipOrder(): Promise<OrderRow> {
    if (!user.value) throw new Error('请先登录')
    if (!emailVerified.value) throw new Error('请先验证邮箱')
    if (openOrder.value) throw new Error('您已有进行中的订单，请继续完成付款与提交')
    const row = await createDraftOrder(
      user.value.id,
      user.value.email || profile.value?.email || ''
    )
    await refreshProfile()
    return row
  }

  /**
   * 上传截图并提交审批（第二步）。
   * @param file 付款截图
   * @param note 补充说明
   */
  async function submitMembershipOrder(file: File, note?: string): Promise<void> {
    if (!user.value) throw new Error('请先登录')
    const order = openOrder.value
    if (!order || order.status !== 'draft') {
      throw new Error('请先生成订单号')
    }
    const proofUrl = await uploadOrderProof(user.value.id, order.order_no, file)
    await submitDraftOrder(order.id, user.value.id, proofUrl, note)
    await refreshProfile()
  }

  return {
    session,
    user,
    profile,
    membership,
    latestOrder,
    openOrder,
    hasPendingOrder,
    hasDraftOrder,
    adminPendingCount,
    booting,
    error,
    isLoggedIn,
    emailVerified,
    isAdmin,
    isMember,
    memberExpireLabel,
    canUseAi,
    initialized,
    init,
    login,
    register,
    logout,
    resetPassword,
    createMembershipOrder,
    submitMembershipOrder,
    refreshProfile
  }
})
