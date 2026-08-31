-- 003_membership_orders_ai.sql
-- 会员订单（支付宝/微信收款码 + 人工审批）+ AI 试用次数

-- 完善 memberships（若 002 已建则补充约束）
alter table memberships
  alter column plan set default 'monthly';

comment on column memberships.expire_at is '会员到期时间；null 表示未开通';

-- 订单（draft → pending → approved/rejected）
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references profiles (user_id) on delete cascade,
  email text not null,
  order_no text not null,
  status text not null default 'draft'
    check (status in ('draft', 'pending', 'approved', 'rejected')),
  note text,
  -- 付款截图：base64 data URL（MVP 存库，免对象存储）
  proof_data text,
  admin_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create unique index if not exists orders_order_no_unique on orders (order_no);

create unique index if not exists orders_one_open_per_user
  on orders (user_id)
  where status in ('draft', 'pending');

create index if not exists orders_status_created_idx on orders (status, created_at desc);

comment on table orders is '会员开通订单：扫码转账 + 截图人工审批';

-- 非会员 AI 试用计数（会员不限次，不 increment）
create table if not exists ai_usage (
  user_id text primary key references profiles (user_id) on delete cascade,
  trial_used int not null default 0 check (trial_used >= 0),
  updated_at timestamptz not null default now()
);

comment on table ai_usage is '非会员 AI 试用次数；trial_used 达到上限后须开通会员';

comment on column ai_usage.trial_used is '已使用的 AI 试用次数，上限见应用配置（默认 3）';
