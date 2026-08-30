/**
 * 云端会员 + Worker AI 模式配置（Web 托管时使用）。
 */
import { isTauriRuntime } from '../tauriBridge'

/**
 * 是否配置了 Supabase（邮箱登录）。
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    import.meta.env.VITE_SUPABASE_URL?.trim() && import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()
  )
}

/**
 * 是否配置了 Cloud Worker（Web AI 代理）。
 */
export function isCloudApiConfigured(): boolean {
  return Boolean(import.meta.env.VITE_CLOUD_API_URL?.trim())
}

/**
 * Web 托管是否走「会员 + 云端 AI」模式（非 Tauri 且已配 Worker）。
 */
export function isCloudMembershipMode(): boolean {
  return isCloudApiConfigured() && isSupabaseConfigured() && !isTauriRuntime()
}

/**
 * 支付宝收款码展示 URL（可选）。
 */
export function alipayQrUrl(): string {
  return (import.meta.env.VITE_ALIPAY_QR_URL || '').trim()
}
