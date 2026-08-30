# 会员体系部署指南（邮箱注册 + 人工审批 + 云端 AI）

Web 版：**排盘等功能免费**；**AI 解答需会员**。桌面/Tauri 仍可使用本机 API Key（BYOK）。

## 架构

```text
GitHub Pages / Cloudflare Pages（Vue 前端）
        ↓ JWT
Supabase（邮箱 Auth + profiles + memberships + orders + llm_configs）
        ↓ Service Role
Cloudflare Worker（/api/ai/chat 代理大模型，Key 不下发前端）
```

## 1. Supabase

1. 创建项目 → [supabase.com](https://supabase.com)
2. SQL Editor 执行仓库根目录 `supabase/migrations/001_membership.sql`
3. Authentication → Providers → 开启 Email，建议开启 **Confirm email**
4. Project Settings → API：复制 **URL** 与 **anon key**
5. 注册你的管理员账号后执行：

```sql
update public.profiles set role = 'admin' where email = '你的邮箱@example.com';
```

6. 管理后台 → 大模型：在 Web `/admin/models` 添加 DeepSeek/硅基 等配置（**至少一条默认且启用**）

## 2. Cloudflare Worker

```bash
cd cloudflare/worker
npm install
# 配置 wrangler.toml 中 SUPABASE_URL；Secret：
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
# 可选：限制 CORS
# wrangler secret 或在 Dashboard 设置 CORS_ORIGIN=https://xxx.pages.dev

npm run deploy
```

记下 Worker 地址，例如 `https://yi-cloud-api.xxx.workers.dev`

## 3. 前端环境变量

复制 `yi-desktop/.env.example` 为 `yi-desktop/.env`：

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_CLOUD_API_URL=https://yi-cloud-api.xxx.workers.dev
VITE_ALIPAY_QR_URL=https://你的图床/alipay-qr.png
```

本地验证：

```bash
cd yi-desktop
npm install
npm run web
```

## 4. 静态托管

与 README「零成本 Web 部署」相同：`npm run build:vite`，产物 `dist/`。

**注意**：构建时需能读到 `.env`（或 CI 里配置 Secrets 为 `VITE_*`）。

## 5. 运营流程

### 用户（C 端）

1. `/register` 邮箱注册 → 邮件验证
2. `/login` 登录
3. `/member` 扫码转账 → 「我已支付，申请开通」
4. 会员有效后使用命师助手 / 八字 AI

### 管理员

1. `/admin/orders` 对照支付宝到账 → **通过**（默认 +30 天）
2. `/admin/members` 手动调整到期
3. `/admin/models` 维护 API Key 与默认模型

## 6. 桌面版说明

未配置 `VITE_CLOUD_API_URL` 或未走 Web 构建时，行为与原来一致：用户在「大模型配置」自填 Key，不经会员体系。

## 7. 安全要点

- **Service Role Key** 仅放 Worker Secret，勿写入前端
- **llm_configs.api_key** 仅 admin RLS 可读；C 端永远拿不到
- 生产环境务必配置 **CORS_ORIGIN** 为实际前端域名
