/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import BasePool, { InstanceResult } from '@engine/core/pool';
import ConnectionPool, { PoolOptions } from '@plugin/tcp/connection';
import { CONFIG } from '@engine/config';
import { TCPConfig } from '@plugin/tcp/types/data';

interface Options {
  /** 作为KEY */
  session?: string;
  host?: string;
  port?: number | string;
  tls?: boolean;
  config?: TCPConfig;
}
export type ConnectionInstance = InstanceResult<ConnectionPool>;

/**
 * SocketPool
 */
class SocketPool extends BasePool<ConnectionPool> {
  /**
   *
   * @param host
   * @param port
   * @returns
   */
  public async getPool(options: Options): Promise<InstanceResult<ConnectionPool>> {
    const opt: PoolOptions = {
      host: options.host || 'localhost',
      port: Number(options.port) || 0,
      tls: options.tls || false,
      connectionTimeoutMillis: CONFIG.TCP_DEFAULT_CONNECT_TIMEOUT,
      max: 100,
      min: 0,
      rejectUnauthorized: options.config?.rejectUnauthorized !== undefined ? options.config?.rejectUnauthorized : true,
    };

    const key = `${opt.tls ? 'tls:' : ''}${opt.host}:${opt.port}:${options.session || 'session'}`;
    const client = await this.get(key, opt);
    return client;
  }

  /**
   * @inheritdoc
   */
  protected async create(options: PoolOptions): Promise<InstanceResult<ConnectionPool>> {
    const instance = new ConnectionPool(options);
    try {
      const conn = await instance.connect();
      conn.release();
    } finally {
      // conn.release();
    }
    return { instance };
  }

  /**
   * @inheritdoc
   */
  protected free(instance: InstanceResult<ConnectionPool>): void {
    instance.instance.close();
  }
}

const pool = new SocketPool();

export const getPool = pool.getPool.bind(pool);
