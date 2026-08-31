/**
 * 默认系统 Prompt（占位：后续按业务门类扩展，不抄 zhaoming 文案）。
 */
export const DEFAULT_SYSTEM_PROMPT = `你是一位理性、克制的传统文化解读助手。
请基于用户提供的结构化数据作答，避免迷信恐吓，不做医疗/法律/投资建议。`;

/**
 * 构建聊天系统指令（可按场景扩展）。
 * @param extra 额外约束或上下文
 */
export function buildSystemPrompt(extra?: string): string {
  if (!extra) return DEFAULT_SYSTEM_PROMPT;
  return `${DEFAULT_SYSTEM_PROMPT}\n\n${extra}`;
}
