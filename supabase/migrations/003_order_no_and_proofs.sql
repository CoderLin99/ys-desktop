-- 订单号 + 付款截图存储 + draft 状态（先生成订单号，付款后上传截图再提交审批）

-- 1) 订单号与 draft 状态
alter table public.orders
  add column if not exists order_no text;

-- 放宽 status：draft=已生成订单号待付款/上传；pending=已提交待审批
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders
  add constraint orders_status_check
  check (status in ('draft', 'pending', 'approved', 'rejected'));

-- 为已有数据补订单号（若存在）
update public.orders
set order_no = 'YI' || to_char(created_at, 'YYYYMMDD') || '-' || upper(substr(replace(id::text, '-', ''), 1, 6))
where order_no is null;

alter table public.orders alter column order_no set not null;
create unique index if not exists orders_order_no_unique on public.orders (order_no);

-- 同一用户仅一条未完结订单（draft 或 pending）
drop index if exists orders_one_pending_per_user;
create unique index if not exists orders_one_open_per_user
  on public.orders (user_id)
  where status in ('draft', 'pending');

comment on column public.orders.order_no is '对外订单号，用户支付宝备注与提交截图时使用';

-- 2) Storage：付款截图 bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'order-proofs',
  'order-proofs',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 用户仅能上传到自己的目录 {user_id}/{order_no}.*
drop policy if exists order_proofs_insert_own on storage.objects;
create policy order_proofs_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'order-proofs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists order_proofs_update_own on storage.objects;
create policy order_proofs_update_own on storage.objects
  for update to authenticated
  using (
    bucket_id = 'order-proofs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists order_proofs_select_own_or_admin on storage.objects;
create policy order_proofs_select_own_or_admin on storage.objects
  for select to authenticated
  using (
    bucket_id = 'order-proofs'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
    )
  );

-- draft 订单仅本人可更新（上传截图后改 pending）
drop policy if exists orders_update_own_draft on public.orders;
create policy orders_update_own_draft on public.orders
  for update using (
    auth.uid() = user_id and status = 'draft'
  )
  with check (
    auth.uid() = user_id and status in ('draft', 'pending')
  );
