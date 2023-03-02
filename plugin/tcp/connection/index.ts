/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import Connection, { ConnectionOptions } from '@plugin/tcp/connection/connection';
import { CONFIG } from '@engine/config';

export interface PoolOptions extends Partial<ConnectionOptions> {
  host: string;
  port: number;
  tls?: boolean;
  max?: number;
  min?: number;
  rejectUnauthorized?: boolean;
}

interface ConnectionInstance {
  free: boolean;
  connection: Connection;
}

/**
 * 简易 Connection 复用池
 */
export default class ConnectionPool {
  private connection: ConnectionInstance[] = [];
  private queue: ((conn?: Connection) => void)[] = [];

  private options: Required<PoolOptions> = {
    host: 'localhost',
    port: 0,
    min: 0, // 暂时没用
    max: 100,
    idleTimeoutMillis: 1000 * 30,
    connectionTimeoutMillis: CONFIG.TCP_DEFAULT_CONNECT_TIMEOUT,
    keepAlive: true,
    tls: false,
    rejectUnauthorized: true,
  };

  public constructor(options: Partial<PoolOptions>) {
    this.options = { ...this.options, ...options };
  }

  private createConnection(): ConnectionInstance {
    const instance = {
      free: true,
    } as ConnectionInstance;
    instance.connection = new Connection(this.options as ConnectionOptions);
    this.connection.push(instance);
    return instance;
  }

  private getIdleConnection(): Connection | void {
    let instance!: ConnectionInstance | void;
    instance = this.connection.find((item) => item.free === true);

    if (!instance) {
      if (this.connection.length < this.options.max) {
        instance = this.createConnection();
      }
    }
    if (instance) {
      const ins = instance;
      instance.connection.once('free', () => {
        ins.free = true;
        // 新释放的，下一轮事件循环再处理，防止事件被取消
        process.nextTick(() => {
          this.next();
        });
      });
      instance.free = false;
      return instance.connection;
    }
  }

  /**
   * next connection
   */
  private next(): void {
    if (this.queue.length > 0) {
      const connection = this.getIdleConnection();
      if (connection) {
        const queue = this.queue.shift();
        if (queue) {
          queue(connection);
        }
      }
    }
  }

  private getConnection(): Promise<Connection> {
    return new Promise((resolve, reject) => {
      this.queue.push((conn?: Connection): void => {
        if (!conn) {
          reject(new Error('Connection is disconnected'));
        } else {
          resolve(conn);
        }
      });
      this.next();
    });
  }

  /**
   * 关闭所有池中的连接
   */
  public close(): void {
    if (this.queue.length) {
      this.queue.forEach((item) => {
        item();
      });
    }
    if (this.connection.length) {
      this.connection.forEach((connection) => {
        connection.connection.release(true);
      });
    }
  }

  /**
   * 获取一个链接 需要手动调用 free 释放
   * @returns {Promise<Connection>}
   */
  public async connect(): Promise<Connection> {
    const connection = await this.getConnection();
    await connection.connect();
    return connection;
  }
}
