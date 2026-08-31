-- 001_profiles.sql
-- 业务用户档案（Better Auth 的 user 表由 CLI 迁移创建，此处只扩展业务字段）

create table if not exists profiles (
  user_id text primary key,
  display_name text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_role_idx on profiles (role);

comment on table profiles is '用户业务档案，与 Better Auth user.id 对应';
