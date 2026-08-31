-- 002_memberships.sql
-- 会员/订阅占位表（后续对接支付宝、Stripe 或积分包）

create table if not exists memberships (
  user_id text primary key,
  plan text not null default 'free',
  expire_at timestamptz,
  credits int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table memberships is '会员权益：plan + 到期时间 + 积分余额';
