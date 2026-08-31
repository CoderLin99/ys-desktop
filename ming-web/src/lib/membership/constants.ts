/** 非会员 AI 试用上限（数据库无配置时的回退默认值） */
export const AI_TRIAL_LIMIT_DEFAULT = 3;

/** 审批通过后默认开通天数（数据库无配置时的回退默认值） */
export const MEMBERSHIP_APPROVE_DAYS_DEFAULT = 30;

/** site_settings 表配置键 */
export const SITE_SETTING_KEYS = {
  /** 非会员 AI 试用上限 */
  aiTrialLimit: "ai_trial_limit",
  /** 订单审批默认开通天数 */
  membershipApproveDays: "membership_approve_days",
} as const;

/** site_settings.key 联合类型 */
export type SiteSettingKey =
  (typeof SITE_SETTING_KEYS)[keyof typeof SITE_SETTING_KEYS];

/** 付款截图最大字节（5MB） */
export const MAX_PROOF_BYTES = 5 * 1024 * 1024;
