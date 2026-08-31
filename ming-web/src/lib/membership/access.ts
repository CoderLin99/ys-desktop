import { query, withTransaction } from "@/lib/db";
import { isAdmin } from "@/lib/data/profiles";
import { getAiTrialLimit } from "./settings";

/** 会员行 */
export interface MembershipRow {
  user_id: string;
  plan: string;
  expire_at: Date | null;
  credits: number;
  updated_at: Date;
}

/** AI 试用行 */
export interface AiUsageRow {
  user_id: string;
  trial_used: number;
  updated_at: Date;
}

/** 会员 / 试用状态（供前端展示） */
export interface MembershipStatus {
  isMember: boolean;
  isAdmin: boolean;
  expireAt: string | null;
  trialUsed: number;
  trialLimit: number;
  trialRemaining: number;
  canUseAi: boolean;
}

/**
 * 确保 ai_usage 行存在。
 * @param userId 用户 ID
 */
export async function ensureAiUsage(userId: string): Promise<void> {
  await query(
    `insert into ai_usage (user_id, trial_used)
     values ($1, 0)
     on conflict (user_id) do nothing`,
    [userId],
  );
}

/**
 * 读取会员记录。
 * @param userId 用户 ID
 */
export async function getMembership(
  userId: string,
): Promise<MembershipRow | null> {
  const res = await query<MembershipRow>(
    `select user_id, plan, expire_at, credits, updated_at
     from memberships where user_id = $1`,
    [userId],
  );
  return res.rows[0] ?? null;
}

/**
 * 是否有效会员（未过期）。
 * @param userId 用户 ID
 */
export async function isActiveMember(userId: string): Promise<boolean> {
  const m = await getMembership(userId);
  if (!m?.expire_at) return false;
  return new Date(m.expire_at) > new Date();
}

/**
 * 获取 AI 权限快照（不消耗次数）。
 * @param userId 用户 ID
 */
export async function getMembershipStatus(
  userId: string,
): Promise<MembershipStatus> {
  await ensureAiUsage(userId);
  const admin = await isAdmin(userId);
  const member = admin || (await isActiveMember(userId));
  const usage = await query<AiUsageRow>(
    `select user_id, trial_used, updated_at from ai_usage where user_id = $1`,
    [userId],
  );
  const trialUsed = usage.rows[0]?.trial_used ?? 0;
  const membership = await getMembership(userId);
  const trialLimit = await getAiTrialLimit();

  const trialRemaining = Math.max(0, trialLimit - trialUsed);
  const canUseAi = admin || member || trialRemaining > 0;

  return {
    isMember: member,
    isAdmin: admin,
    expireAt: membership?.expire_at?.toISOString() ?? null,
    trialUsed,
    trialLimit,
    trialRemaining,
    canUseAi,
  };
}

/**
 * AI 调用前校验；非会员成功时消耗 1 次试用（事务内）。
 * @param userId 用户 ID
 * @throws Error 无权限时
 */
export async function assertAndConsumeAiAccess(userId: string): Promise<void> {
  if (await isAdmin(userId)) return;
  if (await isActiveMember(userId)) return;

  const trialLimit = await getAiTrialLimit();

  await withTransaction(async (client) => {
    await client.query(
      `insert into ai_usage (user_id, trial_used)
       values ($1, 0)
       on conflict (user_id) do nothing`,
      [userId],
    );

    const locked = await client.query<AiUsageRow>(
      `select user_id, trial_used, updated_at
       from ai_usage where user_id = $1 for update`,
      [userId],
    );
    const used = locked.rows[0]?.trial_used ?? 0;

    if (used >= trialLimit) {
      throw new Error(
        `AI 试用已用完（${trialLimit} 次），请开通会员后继续使用`,
      );
    }

    await client.query(
      `update ai_usage set trial_used = trial_used + 1, updated_at = now()
       where user_id = $1`,
      [userId],
    );
  });
}

/**
 * 延长或开通会员。
 * @param userId 用户 ID
 * @param days 延长天数
 */
export async function extendMembership(
  userId: string,
  days: number,
): Promise<MembershipRow> {
  const base = await getMembership(userId);
  const now = new Date();
  let start = now;
  if (base?.expire_at && new Date(base.expire_at) > now) {
    start = new Date(base.expire_at);
  }
  const expire = new Date(start);
  expire.setDate(expire.getDate() + days);

  const res = await query<MembershipRow>(
    `insert into memberships (user_id, plan, expire_at, credits)
     values ($1, 'monthly', $2, 0)
     on conflict (user_id) do update set
       expire_at = excluded.expire_at,
       plan = 'monthly',
       updated_at = now()
     returning user_id, plan, expire_at, credits, updated_at`,
    [userId, expire.toISOString()],
  );
  return res.rows[0]!;
}
