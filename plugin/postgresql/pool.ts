/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import Pool from 'pg-pool';
import { Client } from 'pg';
import { PostgreSQLDataSource } from '@plugin/postgresql/types/data';
import BasePool, { InstanceResult } from '@engine/core/pool';
import { CONFIG } from '@engine/config';

export type PGPool = Pool<Client>

/**
 * 获取配置信息
 * @param {MySQLConnection} connection
 * @returns {mysql.PoolOptions}
 */
const getOptions = (server: PostgreSQLDataSource): Pool.Config<Client> => {
  const options: Pool.Config<Client> = {
    host: server.host,
    user: server.user,
    password: server.password,
    port: server.port || CONFIG.POSTGRESQL_DEFAULT_PORT,
    database: server.config?.database,
    // ssl: boolean;
    max: 100,
    min: 0,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: CONFIG.POSTGRESQL_DEFAULT_CONNECT_TIMEOUT,
  };
  return options;
};

/**
 * PostgreSQL 资源池
 */
class PostgreSQLPool extends BasePool<PGPool> {
  /**
   * 根据 server 获取资源
   * @param server
   * @returns {Promise<InstanceResult<PostgreSQL>>}
   */
  public async getPool(server: PostgreSQLDataSource): Promise<InstanceResult<PGPool>> {
    const options = getOptions(server);
    const key = `${options.user}:${options.password}@${options.host}:${options.port}${options.database ? `/${options.database}` : ''}`;
    // eslint-disable-next-line no-return-await
    return await this.get(key, options);
  }

  /**
   * @inheritdoc
   */
  protected async create(options: Pool.Config<Client>): Promise<InstanceResult<PGPool>> {
    const instance = new Pool(options);
    const conn = await instance.connect();
    try {
      const result = await conn.query({
        rowMode: 'array',
        text: 'show server_version_num',
      });
      return { instance, version: result.rows[0][0] };
    } finally {
      conn.release();
    }
  }

  /**
   * @inheritdoc
   */
  protected free(instance: InstanceResult<PGPool>): void {
    instance.instance.end();
  }
}

const pool = new PostgreSQLPool();

export const getPool = pool.getPool.bind(pool);
