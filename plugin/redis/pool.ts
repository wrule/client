/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import IORedis, { Redis, RedisOptions, Cluster } from 'ioredis';
import { RedisDataSource } from '@plugin/redis/types/data';
import BasePool, { InstanceResult } from '@engine/core/pool';
import { CONFIG } from '@engine/config';

/**
 * 获取配置信
 * @param {MySQLConnection} connection
 * @returns {mysql.PoolOptions}
 */
const getOptions = (server: RedisDataSource): RedisOptions => {
  const options: RedisOptions = {
    stringNumbers: true,
    /** @user setting */
    username: server.user,
    password: server.password,
    // host: '10.10.31.32',
    // port: '7001',
    host: server.host,
    port: server.port || CONFIG.REDIS_DEFAULT_PORT,
    db: server.config?.database,
    /** @notice 链接超时和查询超时分开的 socket超时5秒不能再多 */
    connectTimeout: CONFIG.REDIS_DEFAULT_CONNECT_TIMEOUT,
  };
  if (server.config?.sentinelName && !server.config?.cluster) {
    options.name = server.config.sentinelName;
    options.sentinelUsername = server.config.sentinelUsername;
    options.sentinelPassword = server.config.sentinelPassword;
    options.sentinels = [
      { host: server.host, port: server.port || CONFIG.REDIS_DEFAULT_PORT },
    ];
  }

  return options;
};

type Instance = Redis | Cluster;

/**
 * Redis 资源池
 */
class RedisPool extends BasePool<Instance> {
  /**
   * 根据 server 获取资源
   * @param server
   * @returns {Promise<InstanceResult<Instance>>}
   */
  public async getPool(server: RedisDataSource): Promise<InstanceResult<Instance>> {
    const options = getOptions(server);
    const key = `${options.username}:${options.password}@${options.host}:${options.port}${options.db ? `/${options.db}` : ''}?${server.config?.cluster}`;
    // eslint-disable-next-line no-return-await
    return await this.get(key, server);
  }

  /**
   * @inheritdoc
   */
  protected async create(server: RedisDataSource): Promise<InstanceResult<Instance>> {
    const options = getOptions(server);

    return new Promise((resolve, reject) => {
      let instance: Instance;
      if (server.config?.cluster) {
        instance = new IORedis.Cluster([{ host: options.host, port: options.port }], { redisOptions: options });
      } else {
        instance = new IORedis(options);
      }
      instance.on('ready', async () => {
        try {
          await instance.ping();
          try {
            const info = await instance.info();
            const regret = info.match(/redis_version:(.+)\r\n/i);
            if (regret && regret[1]) {
              resolve({ instance, version: regret[1] });
            } else {
              resolve({ instance });
            }
          } catch (e) {
            resolve({ instance });
          }
        } catch (err) {
          reject(err);
        }
      });
      instance.on('error', (e) => {
        instance.disconnect();
        reject(e);
      });
    });
  }

  /**
   * @inheritdoc
   */
  protected free(instance: InstanceResult<Instance>): void {
    instance.instance.disconnect();
  }
}

const pool = new RedisPool();

export const getPool = pool.getPool.bind(pool);
