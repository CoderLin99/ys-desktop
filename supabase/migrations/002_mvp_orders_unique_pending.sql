-- MVP：同一用户仅允许一条待审批订单（防重复提交）
create unique index if not exists orders_one_pending_per_user
  on public.orders (user_id)
  where status = 'pending';

-- 订单状态中文展示可在前端映射；此处加注释便于运维
comment on table public.orders is '会员开通申请（MVP 人工审批：pending → approved/rejected）';
