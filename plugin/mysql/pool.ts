/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import mysql from 'mysql2/promise';
import { MySQLDataSource } from '@plugin/mysql/types/data';
import BasePool, { InstanceResult } from '@engine/core/pool';
import { CONFIG } from '@engine/config';

/**
 * 获取链接配置信息
 * @param {MySQLConnection} connection
 * @returns {mysql.PoolOptions}
 */
const getOptions = (server: MySQLDataSource): mysql.PoolOptions => {
  const options: mysql.PoolOptions = {
    supportBigNumbers: true,
    bigNumberStrings: true,
    dateStrings: true, // 不要修改 时区不用处理
    multipleStatements: false,
    rowsAsArray: true,
    connectionLimit: 100, // 如果是压测可能要调整
    compress: true,
    /** @notice 链接超时和查询超时分开的 socket超时5秒不能再多 */
    connectTimeout: CONFIG.MYSQL_DEFAULT_CONNECT_TIMEOUT,
    /**
     * @notice 时区根本不需要处理
     * timestamp int 4字节 根据服务端时区的设置会自动处理
     * DateTime 5-8字节 存储时是什么数据 取时就是什么数据 完全无需处理
     */
    timezone: CONFIG.MYSQL_DEFAULT_TIMEZONE,
    // user setting
    user: server.user,
    password: server.password,
    host: server.host,
    port: server.port || CONFIG.MYSQL_DEFAULT_PORT,
    database: server.config?.database,
    // 这个配置有些问题 需要确认 测试了不生效
    // charset: server.config?.charset || CONFIG.MYSQL_DEFAULT_CHARSET,
    // enableKeepAlive: true,
    // keepAliveInitialDelay: 100000,
    // connectionLimit: 1000,
    // debug: false,
    // trace: false
  };
  return options;
};

/**
 * MySQL 资源池
 */
class MySQLPool extends BasePool<mysql.Pool> {
  /**
   * 根据 server 获取资源
   * @param server
   * @returns {Promise<InstanceResult<mysql.Pool>>}
   */
  public async getPool(server: MySQLDataSource): Promise<InstanceResult<mysql.Pool>> {
    const options = getOptions(server);
    // user@host[:port[/database]]
    const key = `${options.user}:${options.password}@${options.host}:${options.port}${options.database ? `/${options.database}` : ''}`;
    const client = await this.get(key, options);
    return client;
  }

  /**
   * @inheritdoc
   */
  protected async create(options: mysql.PoolOptions): Promise<InstanceResult<mysql.Pool>> {
    const instance = mysql.createPool(options);
    const conn = await instance.getConnection();
    try {
      await conn.ping();
      const connection = (conn as any).connection;
      const version = connection?._handshakePacket?.serverVersion;
      return { instance, version };
    } finally {
      conn.release();
    }
  }

  /**
   * @inheritdoc
   */
  protected free(instance: InstanceResult<mysql.Pool>): void {
    instance.instance.end();
  }
}

const pool = new MySQLPool();

export const getPool = pool.getPool.bind(pool);
