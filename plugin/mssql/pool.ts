/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { ConnectionPool, config } from 'mssql';
import { MSSQLDataSource } from '@plugin/mssql/types/data';
import BasePool, { InstanceResult } from '@engine/core/pool';
import { CONFIG } from '@engine/config';

/**
 * 获取配置信息
 * @param {MySQLConnection} connection
 * @returns {mysql.PoolOptions}
 */
const getOptions = (server: MSSQLDataSource): config => {
  const options = {
    // driver?: string | undefined;
    user: server.user,
    password: server.password,
    server: server.host,
    port: server.port || CONFIG.MSSQL_DEFAULT_PORT,
    // domain?: string | undefined;
    database: server.config?.database,
    // requestTimeout: 5000,
    // stream: true,
    options: {
      // encrypt: true,
      trustServerCertificate: true,
    },
    pool: {
      max: 100,
      min: 0,
      idleTimeoutMillis: 30000,
    },
    /** @see https://github.com/tediousjs/node-mssql/issues/1292 */
    arrayRowMode: true,
    parseJSON: false,
    /** @notice 链接超时和查询超时分开的 socket超时5秒不能再多 */
    connectionTimeout: CONFIG.MSSQL_DEFAULT_CONNECT_TIMEOUT,
  };
  return options;
};

/**
 * MSSQL 资源池
 */
class MSSQLPool extends BasePool<ConnectionPool> {
  /**
   * 根据 server 获取资源
   * @param server
   * @returns {Promise<InstanceResult<MSSQL>>}
   */
  public async getPool(server: MSSQLDataSource): Promise<InstanceResult<ConnectionPool>> {
    const options = getOptions(server);
    const key = `${options.user}:${options.password}@${options.server}:${options.port}${options.database ? `/${options.database}` : ''}`;
    // eslint-disable-next-line no-return-await
    return await this.get(key, options);
  }

  /**
   * @inheritdoc
   */
  protected async create(options: config): Promise<InstanceResult<ConnectionPool>> {
    const conn = new ConnectionPool(options);
    const instance = await conn.connect();
    const version = await instance.query('SELECT @@VERSION;');
    return { instance, version: version.recordset[0][0] };
  }

  /**
   * @inheritdoc
   */
  protected free(instance: InstanceResult<ConnectionPool>): void {
    instance.instance.close();
  }
}

const pool = new MSSQLPool();

export const getPool = pool.getPool.bind(pool);
