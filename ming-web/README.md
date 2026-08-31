# ming-web

借鉴 [tianma-if/zhaoming](https://github.com/tianma-if/zhaoming) 的 **Web SaaS 架构**，新建独立项目。**不复制** zhaoming 的排盘/UI 功能；业务从 `ys-desktop` 按需迁移到此骨架。

## 架构

```text
Next.js App Router（营销 / 认证 / 工作台）
        ↓
Better Auth（邮箱密码，可扩展 OAuth）
        ↓
Postgres（Neon / Supabase / 自托管）
        ↓
/api/ai/chat — Vercel AI SDK 流式代理（Key 仅存服务端）
```

| 层级 | 选型 | 说明 |
|------|------|------|
| 框架 | Next.js 15 + React 19 + TS | 与 zhaoming 同路线，版本略保守 |
| UI | Tailwind 4 + shadcn/ui | 可继续加组件 |
| 鉴权 | Better Auth | `/api/auth/[...all]` |
| 数据库 | `pg` + SQL 迁移 | `db/migrations/` |
| AI | `ai` + `@ai-sdk/openai-compatible` | OpenAI 兼容接口 |
| 部署 | Vercel（推荐） | 也可 Docker / 自托管 |

## 目录结构

```text
ming-web/
  src/app/
    (marketing)/     # 公开 Landing
    (auth)/          # 登录 / 注册
    (dashboard)/     # 登录后工作台
    api/
      auth/          # Better Auth
      ai/chat/       # 流式 AI
      health/        # 探活
  src/lib/
    auth/            # 会话辅助
    ai/              # Provider / Prompt
    data/            # 业务 SQL
    divination/      # 排盘引擎接入点（待实现）
  db/migrations/     # 业务表 SQL
```

## 本地开发

```bash
cd ming-web
cp .env.example .env.local
# 填写 DATABASE_URL、BETTER_AUTH_SECRET、AI_* 

npm install
# 初始化 Better Auth 表（需 DATABASE_URL 可用）
npx @better-auth/cli migrate

# 业务表
psql "$DATABASE_URL" -f db/migrations/001_profiles.sql
psql "$DATABASE_URL" -f db/migrations/002_memberships.sql

npm run dev
# http://localhost:5555
```

## 服务端排盘 API（已实现）

均需 **登录**（Better Auth Cookie）。算法在 `src/lib/divination/engine/`，**禁止** Client Component import。

| 工具 | 方法 | 路径 |
|------|------|------|
| 八字 | POST | `/api/divination/bazi` |
| 紫微 | POST | `/api/divination/ziwei` |
| 六爻 | POST | `/api/divination/liuyao` |
| 黄历日 | POST | `/api/divination/huangli` |
| 黄历择吉 | POST | `/api/divination/huangli/zeji` |
| 阳宅风水 | POST | `/api/divination/fengshui` |

响应已脱敏（如八字无 `rule`/`basis`，风水/紫微无 `ragQuery`）。

```bash
npm run test:golden   # 46 项（八字+神煞+紫微 iztro+六爻+黄历+风水）
```

登录后 `/workspace` → **服务端排盘工具** 可一键测各 API。

### 请求示例

**紫微：**
```json
{ "year": 1990, "month": 5, "day": 1, "hour": 12, "gender": "female" }
```

**六爻（固定爻）：**
```json
{ "mode": "manual", "dayGan": "甲", "values": [8,7,8,7,7,7] }
```

**黄历择吉：**
```json
{ "matterId": "开业", "fromYear": 2026, "fromMonth": 8, "fromDay": 1, "dayCount": 30 }
```

**风水：**
```json
{ "year": 1990, "month": 5, "day": 1, "gender": "male", "headingDeg": 180 }
```

## 服务端八字排盘（已实现）

算法位于 `src/lib/divination/engine/`（**禁止 Client Component import**），经 API 对外：

```http
POST /api/divination/bazi
Content-Type: application/json
Cookie: （Better Auth 会话）

{
  "year": 1999,
  "month": 6,
  "day": 29,
  "hour": 7,
  "minute": 20,
  "dayCutover": "ziZheng"
}
```

响应仅含展示字段（四柱、神煞 brief），**不含**查法 `rule` / `basis`，降低逆向价值。

```bash
npm run test:golden   # 18 项八字+神煞黄金测试
```

登录后可在 `/workspace` 用「八字排盘（服务端）」面板验证。

## 与 ys-desktop 的关系

| | **ming-web（本项目）** | **ys-desktop** |
|--|------------------------|----------------|
| 形态 | Web SaaS | Tauri 桌面 + Vue Web |
| 排盘 | 待迁入 `lib/divination` | 已有 `rules/*` 本地引擎 |
| 会员 | `memberships` 表占位 | Supabase + 人工审批 MVP |
| 收费 | 适合网站订阅/积分 | 桌面难收费 |

**推荐迁移顺序：**

1. 把 `yi-desktop/src/renderer/src/rules/` 抽成共享包或复制到 `lib/divination/`
2. 增加 `POST /api/divination/create`（服务端排盘 + 入库，参考 zhaoming 模式）
3. 增加积分/会员校验 middleware
4. 国内支付（支付宝）或 Stripe 二选一

## 部署（Vercel）

1. Import 仓库，Root Directory 设为 `ming-web`
2. 环境变量：与 `.env.example` 一致
3. 生产 `BETTER_AUTH_URL` / `NEXT_PUBLIC_APP_URL` 改为正式域名
4. 在 Neon/Supabase 执行迁移 SQL

## 许可证

MIT（与 ys-desktop 一致；若迁移 GPL 组件请注意兼容性）
