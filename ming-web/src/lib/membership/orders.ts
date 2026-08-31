import { query } from "@/lib/db";
import { isAdmin } from "@/lib/data/profiles";
import { extendMembership } from "./access";
import { MAX_PROOF_BYTES } from "./constants";
import { generateOrderNo } from "./order-no";

/** 订单行 */
export interface OrderRow {
  id: string;
  user_id: string;
  email: string;
  order_no: string;
  status: "draft" | "pending" | "approved" | "rejected";
  note: string | null;
  proof_data: string | null;
  admin_note: string | null;
  created_at: Date;
  reviewed_at: Date | null;
}

/**
 * 创建 draft 订单。
 * @param userId 用户 ID
 * @param email 用户邮箱
 */
export async function createDraftOrder(
  userId: string,
  email: string,
): Promise<OrderRow> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const orderNo = generateOrderNo();
    try {
      const res = await query<OrderRow>(
        `insert into orders (user_id, email, order_no, status)
         values ($1, $2, $3, 'draft')
         returning id, user_id, email, order_no, status, note, proof_data,
                   admin_note, created_at, reviewed_at`,
        [userId, email, orderNo],
      );
      if (res.rows[0]) return res.rows[0];
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!/unique|duplicate/i.test(msg)) throw err;
    }
  }
  throw new Error("创建订单失败，请稍后重试");
}

/**
 * 读取用户当前未完结订单（draft 或 pending）。
 * @param userId 用户 ID
 */
export async function getOpenOrder(userId: string): Promise<OrderRow | null> {
  const res = await query<OrderRow>(
    `select id, user_id, email, order_no, status, note, proof_data,
            admin_note, created_at, reviewed_at
     from orders
     where user_id = $1 and status in ('draft', 'pending')
     order by created_at desc
     limit 1`,
    [userId],
  );
  return res.rows[0] ?? null;
}

/**
 * 将 File 转为 base64 data URL（存 PostgreSQL）。
 * @param file 图片文件
 */
export async function fileToProofDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("请上传图片格式的付款截图（JPG/PNG/WebP）");
  }
  if (file.size > MAX_PROOF_BYTES) {
    throw new Error("截图不能超过 5MB");
  }
  const buf = Buffer.from(await file.arrayBuffer());
  return `data:${file.type};base64,${buf.toString("base64")}`;
}

/**
 * 提交 draft 订单为 pending。
 * @param orderId 订单 UUID
 * @param userId 用户 ID（校验归属）
 * @param proofDataUrl base64 截图
 * @param note 用户备注
 */
export async function submitOrder(
  orderId: string,
  userId: string,
  proofDataUrl: string,
  note?: string,
): Promise<OrderRow> {
  const res = await query<OrderRow>(
    `update orders set
       status = 'pending',
       proof_data = $3,
       note = coalesce($4, note),
       reviewed_at = null
     where id = $1 and user_id = $2 and status = 'draft'
     returning id, user_id, email, order_no, status, note, proof_data,
               admin_note, created_at, reviewed_at`,
    [orderId, userId, proofDataUrl, note ?? null],
  );
  if (!res.rows[0]) {
    throw new Error("订单不存在或已提交，请刷新后重试");
  }
  return res.rows[0];
}

/**
 * 列出订单（管理员）。
 * @param status 可选状态筛选
 */
export async function listOrders(status?: string): Promise<OrderRow[]> {
  if (status) {
    const res = await query<OrderRow>(
      `select id, user_id, email, order_no, status, note, proof_data,
              admin_note, created_at, reviewed_at
       from orders where status = $1
       order by created_at desc
       limit 200`,
      [status],
    );
    return res.rows;
  }
  const res = await query<OrderRow>(
    `select id, user_id, email, order_no, status, note, proof_data,
            admin_note, created_at, reviewed_at
     from orders order by created_at desc limit 200`,
  );
  return res.rows;
}

/**
 * 审批通过：开通/续期会员。
 * @param orderId 订单 ID
 * @param days 开通天数
 */
export async function approveOrder(
  orderId: string,
  days: number,
): Promise<OrderRow> {
  const found = await query<OrderRow>(
    `select id, user_id, email, order_no, status, note, proof_data,
            admin_note, created_at, reviewed_at
     from orders where id = $1`,
    [orderId],
  );
  const order = found.rows[0];
  if (!order || order.status !== "pending") {
    throw new Error("订单不存在或不可审批");
  }

  await extendMembership(order.user_id, days);

  const res = await query<OrderRow>(
    `update orders set status = 'approved', reviewed_at = now()
     where id = $1
     returning id, user_id, email, order_no, status, note, proof_data,
               admin_note, created_at, reviewed_at`,
    [orderId],
  );
  return res.rows[0]!;
}

/**
 * 拒绝订单。
 * @param orderId 订单 ID
 * @param adminNote 拒绝原因
 */
export async function rejectOrder(
  orderId: string,
  adminNote?: string,
): Promise<OrderRow> {
  const res = await query<OrderRow>(
    `update orders set
       status = 'rejected',
       admin_note = $2,
       reviewed_at = now()
     where id = $1 and status = 'pending'
     returning id, user_id, email, order_no, status, note, proof_data,
               admin_note, created_at, reviewed_at`,
    [orderId, adminNote ?? null],
  );
  if (!res.rows[0]) throw new Error("订单不存在或不可拒绝");
  return res.rows[0]!;
}

/**
 * 用户最近一条订单（任意状态）。
 * @param userId 用户 ID
 */
export async function getLatestOrder(userId: string): Promise<OrderRow | null> {
  const res = await query<OrderRow>(
    `select id, user_id, email, order_no, status, note, proof_data,
            admin_note, created_at, reviewed_at
     from orders where user_id = $1
     order by created_at desc limit 1`,
    [userId],
  );
  return res.rows[0] ?? null;
}
