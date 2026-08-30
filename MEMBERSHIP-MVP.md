# MVP 人工审批 · 10 分钟上线清单

> 完整文档见 [MEMBERSHIP.md](./MEMBERSHIP.md)。本文只讲 **最快跑通**：邮箱注册 → 扫码 → 你点通过 → 用户能用 AI。

## 你要准备

- [Supabase](https://supabase.com) 免费账号
- [Cloudflare](https://dash.cloudflare.com) 免费账号（Worker）
- 一张支付宝收款码图片（可放图床或 `yi-desktop/public/`）

---

## Step 1 · Supabase（约 5 分钟）

1. 新建 Project
2. **SQL Editor** 依次执行：
   - `supabase/migrations/001_membership.sql`
   - `supabase/migrations/002_mvp_orders_unique_pending.sql`
3. **Authentication → Providers → Email**：开启，勾选 **Confirm email**
4. **Settings → API** 复制：
   - Project URL → `VITE_SUPABASE_URL`
   - anon public → `VITE_SUPABASE_ANON_KEY`
   - service_role → 给 Worker 用（**不要**写进前端）

5. 浏览器打开你的站点，**注册管理员邮箱** → 收信验证

6. SQL Editor 执行（换成你的邮箱）：

```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
```

---

## Step 2 · Cloudflare Worker（约 3 分钟）

```bash
cd cloudflare/worker
npm install
```

编辑 `wrangler.toml`，`[vars]` 里填：

```toml
SUPABASE_URL = "https://xxxx.supabase.co"
```

```bash
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
# 粘贴 Supabase 的 service_role key

npm run deploy
```

记下输出的地址，例如 `https://yi-cloud-api.xxx.workers.dev` → `VITE_CLOUD_API_URL`

---

## Step 3 · 前端 .env（约 1 分钟）

```bash
cd yi-desktop
cp .env.example .env
```

填写：

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_CLOUD_API_URL=https://yi-cloud-api.xxx.workers.dev
VITE_ALIPAY_QR_URL=/alipay-qr.png
```

收款码：把图片放到 `yi-desktop/src/renderer/public/alipay-qr.png`（构建后会进 dist）

检查环境：

```bash
npm run membership:check
npm run web
```

---

## Step 4 · 管理端配置大模型（首次必做）

1. 用管理员账号登录 → 侧栏 **管理** → **大模型**
2. 新增一条：DeepSeek 或硅基流动，填 **API Key**，勾选 **默认 + 启用**
3. 保存

> 不配模型的话，用户即使会员有效，AI 也会报「管理员尚未配置大模型」。

---

## Step 5 · 日常审批流程（MVP）

| 角色 | 操作 |
|------|------|
| **用户** | 注册 → 验证邮箱 → **会员中心** → 扫码转账 → 填备注（写邮箱）→ **我已支付，申请开通** |
| **你** | 打开 **管理 → 订单审批** → 对照支付宝到账 → 点 **通过**（默认 +30 天） |

通过后用户刷新页面即可用 **命师助手 / 八字 AI**。

---

## 常见问题

**Q：用户说提交了但你看不到订单？**  
A：确认 TA 已登录且 RLS 迁移已执行；管理账号 `role=admin`。

**Q：AI 仍提示未开通？**  
A：检查 `memberships.expire_at` 是否未来时间；用户需重新登录或刷新。

**Q：AI 报 503 未配置模型？**  
A：管理端 `/admin/models` 至少一条 enabled + is_default。

**Q：本地想先不测 Worker？**  
A：不配 `VITE_CLOUD_API_URL` 时走桌面模式，仍用「大模型配置」本机 Key。

---

## 一键检查

```bash
cd yi-desktop && npm run membership:check
```
