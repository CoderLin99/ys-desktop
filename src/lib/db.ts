import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { getDatabaseUrl } from "@/lib/env";

/** 全局连接池单例 */
let pool: Pool | null = null;

/**
 * 获取 Postgres 连接池（懒加载，避免构建阶段连接数据库）。
 */
function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: getDatabaseUrl(),
    });
  }
  return pool;
}

/**
 * 执行参数化 SQL 查询。
 * @param sql SQL 语句
 * @param params 绑定参数
 */
export async function query<T extends QueryResultRow>(
  sql: string,
  params: unknown[] = [],
) {
  return getPool().query<T>(sql, params);
}

/**
 * 在事务中执行回调；失败自动 rollback。
 * @param callback 接收 PoolClient 的业务逻辑
 */
export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();

  try {
    await client.query("begin");
    const result = await callback(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
