import { query } from "@/lib/db";

/** 用户业务档案行 */
export interface ProfileRow {
  user_id: string;
  display_name: string | null;
  role: "user" | "admin";
  created_at: Date;
  updated_at: Date;
}

/**
 * 确保用户存在业务 profiles 行（Better Auth 注册后调用）。
 * @param userId Better Auth user.id
 * @param email 用户邮箱，用于默认 display_name
 */
export async function ensureUserProfile(
  userId: string,
  email: string,
): Promise<ProfileRow> {
  const existing = await query<ProfileRow>(
    `select user_id, display_name, role, created_at, updated_at
     from profiles where user_id = $1`,
    [userId],
  );

  if (existing.rows[0]) {
    return existing.rows[0];
  }

  const inserted = await query<ProfileRow>(
    `insert into profiles (user_id, display_name, role)
     values ($1, $2, 'user')
     on conflict (user_id) do update set updated_at = now()
     returning user_id, display_name, role, created_at, updated_at`,
    [userId, email.split("@")[0] ?? email],
  );

  return inserted.rows[0]!;
}

/**
 * 按 user_id 读取 profile。
 * @param userId 用户 ID
 */
export async function getUserProfile(
  userId: string,
): Promise<ProfileRow | null> {
  const res = await query<ProfileRow>(
    `select user_id, display_name, role, created_at, updated_at
     from profiles where user_id = $1`,
    [userId],
  );
  return res.rows[0] ?? null;
}

/**
 * 判断用户是否为管理员（后续后台路由鉴权用）。
 * @param userId 用户 ID
 */
export async function isAdmin(userId: string): Promise<boolean> {
  const profile = await getUserProfile(userId);
  return profile?.role === "admin";
}
