-- 004_site_settings.sql
-- 站点可配置项（后台管理页维护，替代硬编码常量）

create table if not exists site_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now(),
  updated_by text references profiles (user_id) on delete set null
);

comment on table site_settings is '站点配置键值表；如 AI 试用上限、审批默认开通天数';

comment on column site_settings.key is '配置键，如 ai_trial_limit、membership_approve_days';
comment on column site_settings.value is '配置值（字符串存储，应用层解析为数字等）';
comment on column site_settings.updated_by is '最后修改的管理员 user_id';

-- 默认配置（与 constants.ts 保持一致）
insert into site_settings (key, value)
values
  ('ai_trial_limit', '3'),
  ('membership_approve_days', '30')
on conflict (key) do nothing;
