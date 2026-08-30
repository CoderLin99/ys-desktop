#!/usr/bin/env node
/**
 * MVP 会员环境检查：本地 .env 是否齐全，并打印下一步操作。
 * 用法：node scripts/membership-check.mjs
 */
import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const envPath = resolve(root, '.env')

/** 从 .env 文件解析键值 */
function parseEnv(text) {
  const out = {}
  for (const line of text.split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i < 1) continue
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim()
  }
  return out
}

const env = existsSync(envPath) ? parseEnv(readFileSync(envPath, 'utf8')) : {}
const required = [
  ['VITE_SUPABASE_URL', 'Supabase 项目 URL'],
  ['VITE_SUPABASE_ANON_KEY', 'Supabase anon key（前端）'],
  ['VITE_CLOUD_API_URL', 'Cloudflare Worker 地址']
]
const optional = [['VITE_ALIPAY_QR_URL', '支付宝收款码图片 URL（建议配置）']]

console.log('\n=== 易学桌面 · 会员 MVP 环境检查 ===\n')

if (!existsSync(envPath)) {
  console.log('❌ 未找到 yi-desktop/.env')
  console.log('   请复制 .env.example → .env 并填写\n')
} else {
  console.log(`✓ 已读取 ${envPath}\n`)
}

let ok = true
for (const [key, label] of required) {
  const val = env[key]
  if (val && val.length > 3 && !val.includes('xxxx')) {
    console.log(`✓ ${label}`)
  } else {
    console.log(`✗ ${label}（${key}）`)
    ok = false
  }
}
for (const [key, label] of optional) {
  const val = env[key]
  console.log(val ? `✓ ${label}` : `○ ${label}（可选）`)
}

console.log('\n--- Supabase（一次性）---')
console.log('1. 执行 supabase/migrations/001_membership.sql')
console.log('2. 执行 supabase/migrations/002_mvp_orders_unique_pending.sql')
console.log('3. 执行 supabase/migrations/003_order_no_and_proofs.sql')
console.log('4. Auth 开启 Email + Confirm email')
console.log('4. 注册后：update profiles set role=\'admin\' where email=\'你的邮箱\';')

console.log('\n--- Cloudflare Worker ---')
console.log('cd cloudflare/worker && npm i')
console.log('wrangler.toml 填 SUPABASE_URL')
console.log('npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY')
console.log('npm run deploy')

console.log('\n--- 本地验证 ---')
console.log('npm run web')
console.log('注册 → 验证邮箱 → /member 提交申请 → /admin/orders 审批')

console.log(ok ? '\n✅ 必填项已齐，可 npm run web\n' : '\n⚠️  请先补全 .env 必填项\n')

process.exit(ok ? 0 : 1)
