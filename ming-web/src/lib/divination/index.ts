/**
 * 服务端排盘引擎入口：禁止被 Client Component 引用。
 * Next.js 会在误 import 时构建报错（配合 server-only）。
 */
import "server-only";

export { buildBaziChart, type BaziChartResult } from "./adapters/bazi";
