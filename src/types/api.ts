/** 通用 API 错误响应体 */
export interface ApiErrorBody {
  error: string;
}

/** 健康检查响应 */
export interface HealthResponse {
  ok: boolean;
  service: string;
  timestamp: string;
}
