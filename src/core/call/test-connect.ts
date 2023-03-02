/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { DataSource } from '@/dispatch/types/data-source';
import { DATASOURCE_POOL } from '@/core/execute';

/**
 * 测试数据库链接 成功返回版本号
 * @param data
 * @returns version
 */
export const testConnect = async (data: DataSource): Promise<string | void> => {
  const getPool = DATASOURCE_POOL[data.type];
  if (getPool) {
    const pool = await getPool(data);
    return pool.version;
  }
  throw new Error(`Unknown data source type ${data.type}`);
};
