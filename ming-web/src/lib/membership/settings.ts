import { query } from "@/lib/db";
import {
  AI_TRIAL_LIMIT_DEFAULT,
  MEMBERSHIP_APPROVE_DAYS_DEFAULT,
  SITE_SETTING_KEYS,
  type SiteSettingKey,
} from "./constants";

/** 站点配置行 */
interface SiteSettingRow {
  key: string;
  value: string;
  updated_at: Date;
  updated_by: string | null;
}

/** 对外暴露的站点配置快照 */
export interface SiteSettingsSnapshot {
  /** 非会员 AI 试用上限 */
  aiTrialLimit: number;
  /** 订单审批通过后默认开通天数 */
  membershipApproveDays: number;
}

/** 内存缓存条目 */
interface CacheEntry {
  /** 解析后的配置快照 */
  snapshot: SiteSettingsSnapshot;
  /** 过期时间戳（毫秒） */
  expiresAt: number;
}

/** 配置缓存 TTL（毫秒），避免每次 AI 请求都查库 */
const CACHE_TTL_MS = 30_000;

/** 进程内配置缓存（单实例部署足够；多实例各节点独立缓存） */
let settingsCache: CacheEntry | null = null;

/**
 * 使站点配置缓存失效；管理端更新后调用。
 */
export function invalidateSiteSettingsCache(): void {
  settingsCache = null;
}

/**
 * 将字符串解析为整数，非法或越界时回退默认值。
 * @param raw 数据库原始值
 * @param fallback 解析失败时的默认值
 * @param min 允许的最小值（含）
 * @param max 允许的最大值（含）
 */
function parseBoundedInt(
  raw: string | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  const n = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(n) || n < min || n > max) return fallback;
  return n;
}

/**
 * 从数据库读取全部站点配置并组装快照。
 */
async function loadSiteSettingsFromDb(): Promise<SiteSettingsSnapshot> {
  const res = await query<SiteSettingRow>(
    `select key, value, updated_at, updated_by from site_settings`,
  );

  const map = new Map<string, string>();
  for (const row of res.rows) {
    map.set(row.key, row.value);
  }

  return {
    aiTrialLimit: parseBoundedInt(
      map.get(SITE_SETTING_KEYS.aiTrialLimit),
      AI_TRIAL_LIMIT_DEFAULT,
      0,
      100,
    ),
    membershipApproveDays: parseBoundedInt(
      map.get(SITE_SETTING_KEYS.membershipApproveDays),
      MEMBERSHIP_APPROVE_DAYS_DEFAULT,
      1,
      365,
    ),
  };
}

/**
 * 获取站点配置（带短 TTL 缓存）。
 */
export async function getSiteSettings(): Promise<SiteSettingsSnapshot> {
  const now = Date.now();
  if (settingsCache && settingsCache.expiresAt > now) {
    return settingsCache.snapshot;
  }

  const snapshot = await loadSiteSettingsFromDb();
  settingsCache = { snapshot, expiresAt: now + CACHE_TTL_MS };
  return snapshot;
}

/**
 * 获取非会员 AI 试用上限。
 */
export async function getAiTrialLimit(): Promise<number> {
  const settings = await getSiteSettings();
  return settings.aiTrialLimit;
}

/**
 * 获取订单审批默认开通天数。
 */
export async function getMembershipApproveDays(): Promise<number> {
  const settings = await getSiteSettings();
  return settings.membershipApproveDays;
}

/** 管理端可更新的配置项 */
export interface SiteSettingsUpdateInput {
  /** 非会员 AI 试用上限（0–100） */
  aiTrialLimit?: number;
  /** 审批默认开通天数（1–365） */
  membershipApproveDays?: number;
}

/**
 * 批量更新站点配置（仅管理员调用）。
 * @param input 待更新字段
 * @param adminUserId 操作者 user_id
 */
export async function updateSiteSettings(
  input: SiteSettingsUpdateInput,
  adminUserId: string,
): Promise<SiteSettingsSnapshot> {
  const updates: Array<{ key: SiteSettingKey; value: string }> = [];

  if (input.aiTrialLimit !== undefined) {
    const v = input.aiTrialLimit;
    if (!Number.isInteger(v) || v < 0 || v > 100) {
      throw new Error("AI 试用次数须在 0–100 之间");
    }
    updates.push({ key: SITE_SETTING_KEYS.aiTrialLimit, value: String(v) });
  }

  if (input.membershipApproveDays !== undefined) {
    const v = input.membershipApproveDays;
    if (!Number.isInteger(v) || v < 1 || v > 365) {
      throw new Error("开通天数须在 1–365 之间");
    }
    updates.push({
      key: SITE_SETTING_KEYS.membershipApproveDays,
      value: String(v),
    });
  }

  if (updates.length === 0) {
    throw new Error("未提供可更新的配置项");
  }

  for (const item of updates) {
    await query(
      `insert into site_settings (key, value, updated_by)
       values ($1, $2, $3)
       on conflict (key) do update set
         value = excluded.value,
         updated_at = now(),
         updated_by = excluded.updated_by`,
      [item.key, item.value, adminUserId],
    );
  }

  invalidateSiteSettingsCache();
  return getSiteSettings();
}
