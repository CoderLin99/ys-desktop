-- 会员体系：邮箱注册、订单审批、会员有效期、大模型配置
-- 在 Supabase SQL Editor 中执行，或通过 supabase db push

-- 用户资料（与 auth.users 1:1）
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

-- 会员有效期
create table if not exists public.memberships (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  expire_at timestamptz not null,
  plan text not null default 'monthly',
  updated_at timestamptz not null default now()
);

-- 开通申请 / 订单（人工审批）
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  email text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  note text,
  proof_url text,
  admin_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

-- 大模型配置（仅管理端维护；Key 由 Worker 读取）
create table if not exists public.llm_configs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  base_url text not null,
  api_key text not null,
  model text not null,
  enabled boolean not null default true,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 是否管理员
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

-- 新用户注册时自动建 profile
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, coalesce(new.email, ''), 'user');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;
alter table public.memberships enable row level security;
alter table public.orders enable row level security;
alter table public.llm_configs enable row level security;

-- profiles：本人可读；管理员可读全部
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select using (auth.uid() = id or public.is_admin());

drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin on public.profiles
  for update using (public.is_admin());

-- memberships：本人可读；管理员可读写
drop policy if exists memberships_select_own on public.memberships;
create policy memberships_select_own on public.memberships
  for select using (auth.uid() = user_id or public.is_admin());

drop policy if exists memberships_admin_all on public.memberships;
create policy memberships_admin_all on public.memberships
  for all using (public.is_admin()) with check (public.is_admin());

-- orders：用户提交/查看自己的；管理员可读写
drop policy if exists orders_insert_own on public.orders;
create policy orders_insert_own on public.orders
  for insert with check (auth.uid() = user_id);

drop policy if exists orders_select_own on public.orders;
create policy orders_select_own on public.orders
  for select using (auth.uid() = user_id or public.is_admin());

drop policy if exists orders_update_admin on public.orders;
create policy orders_update_admin on public.orders
  for update using (public.is_admin());

-- llm_configs：仅管理员
drop policy if exists llm_configs_admin on public.llm_configs;
create policy llm_configs_admin on public.llm_configs
  for all using (public.is_admin()) with check (public.is_admin());

-- 默认模型唯一：启用 is_default 时取消其它默认
create or replace function public.ensure_single_default_llm()
returns trigger
language plpgsql
as $$
begin
  if new.is_default then
    update public.llm_configs set is_default = false where id <> new.id;
  end if;
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists llm_configs_default on public.llm_configs;
create trigger llm_configs_default
  before insert or update on public.llm_configs
  for each row execute function public.ensure_single_default_llm();

-- 首个管理员：注册后手动执行
-- update public.profiles set role = 'admin' where email = '你的邮箱@example.com';
