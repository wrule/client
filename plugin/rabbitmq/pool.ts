/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import amqp, { Options, Connection } from 'amqplib';

import { RabbitMQDataSource } from '@plugin/rabbitmq/types/data';
import BasePool, { InstanceResult } from '@engine/core/pool';
import { CONFIG } from '@engine/config';

/**
 * 获取配置信息
 * @param {MySQLConnection} connection
 * @returns {mysql.PoolOptions}
 */
const getOptions = (server: RabbitMQDataSource): Options.Connect => {
  const options: Options.Connect = {
    hostname: server.host,
    username: server.user,
    password: server.password,
    port: server.port || CONFIG.REDIS_DEFAULT_PORT,
    vhost: server.config?.vhost || '/',
  };
  return options;
};

/**
 * RabbitMQ 资源池
 */
class RabbitMQPool extends BasePool<Connection> {
  /**
   * 根据 server 获取资源
   * @param server
   * @returns {Promise<InstanceResult<RabbitMQ>>}
   */
  public async getPool(server: RabbitMQDataSource): Promise<InstanceResult<Connection>> {
    const options = getOptions(server);
    const key = `${options.username}:${options.password}@${options.hostname}:${options.port}${options.vhost ? `/${options.vhost}` : ''}`;
    // eslint-disable-next-line no-return-await
    return await this.get(key, options);
  }

  /**
   * @inheritdoc
   */
  protected async create(options: Options.Connect): Promise<InstanceResult<Connection>> {
    const instance = await amqp.connect(options);
    return { instance, version: instance.connection.serverProperties.version };
  }

  /**
   * @inheritdoc
   */
  protected free(instance: InstanceResult<Connection>): void {
    instance.instance.close();
  }
}

const pool = new RabbitMQPool();

export const getPool = pool.getPool.bind(pool);
