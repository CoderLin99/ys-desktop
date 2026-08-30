/**
 * Supabase 客户端单例（邮箱注册 / 登录 / 会员表读写）。
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { isSupabaseConfigured } from './cloudConfig'

/** 业务库类型（简化） */
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; email: string; role: 'user' | 'admin'; created_at: string }
      }
      memberships: {
        Row: { user_id: string; expire_at: string; plan: string; updated_at: string }
      }
      orders: {
        Row: {
          id: string
          user_id: string
          email: string
          order_no: string
          status: 'draft' | 'pending' | 'approved' | 'rejected'
          note: string | null
          proof_url: string | null
          admin_note: string | null
          created_at: string
          reviewed_at: string | null
        }
        Insert: {
          user_id: string
          email: string
          order_no: string
          status?: 'draft' | 'pending' | 'approved' | 'rejected'
          note?: string | null
          proof_url?: string | null
        }
      }
      llm_configs: {
        Row: {
          id: string
          name: string
          base_url: string
          api_key: string
          model: string
          enabled: boolean
          is_default: boolean
          created_at: string
          updated_at: string
        }
      }
    }
  }
}

let client: SupabaseClient<Database> | null = null

/**
 * 获取 Supabase 客户端；未配置时抛错。
 */
export function getSupabase(): SupabaseClient<Database> {
  if (!isSupabaseConfigured()) {
    throw new Error('未配置 Supabase：请在 .env 中设置 VITE_SUPABASE_URL 与 VITE_SUPABASE_ANON_KEY')
  }
  if (!client) {
    client = createClient<Database>(
      import.meta.env.VITE_SUPABASE_URL!,
      import.meta.env.VITE_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      }
    )
  }
  return client
}
