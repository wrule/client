/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 * @see https://nodejs.org/dist/latest-v16.x/docs/api/net.html#class-netsocket
 */

import { Socket } from 'node:net';
import EventEmitter from 'node:events';
import tls, { TLSSocket } from 'node:tls';

export interface ConnectionOptions {
  host: string;
  port: number;
  connectionTimeoutMillis: number;
  idleTimeoutMillis: number;
  keepAlive: boolean;
  tls: boolean;
  rejectUnauthorized: boolean;
}

interface ConnectionEvents {
  data: (data: Buffer) => void;
  close: () => void;
  free: () => void;
  retry: () => void;
  error: (err: Error) => void;
}

declare interface Connection {
  on<U extends keyof ConnectionEvents>(
    event: U, listener: ConnectionEvents[U]
  ): this;
  emit<U extends keyof ConnectionEvents>(
    event: U, ...args: Parameters<ConnectionEvents[U]>
  ): boolean;
}

/**
 * 简易 socket 复用
 */
class Connection extends EventEmitter {
  /**  原则上 不该对外 */
  public socket!: Socket | TLSSocket;

  private options!: ConnectionOptions;
  private connected = false;
  private buffer: (Uint8Array | string)[] = [];
  private ref = false;
  // 使用 500 次强制销毁
  private count = 0;
  private retryCount = 0;

  /**
   * 构造函数
   * @param {ConnectionOptions} options
   */
  public constructor(options: ConnectionOptions) {
    super();
    this.options = options;
    this.createSocket();
  }

  /**
   * Initiate a connection on a given socket.
   */
  public async connect(ref = true): Promise<this> {
    if (ref) {
      this.count++;
      this.ref = true;
    }
    return new Promise<this>((resolve, reject) => {
      // console.log('connect', this.connected);
      if (this.connected === false) {
        if (this.socket.destroyed) {
          this.createSocket();
        }
        this.socket.removeAllListeners();
        // this.conn.removeListener('close', this.onClose);
        const timeout = setTimeout(() => {
          reject(new Error(`Connect ${this.options.host}:${this.options.port} timed out after ${this.options.connectionTimeoutMillis}ms `));
          // 部分系统默认的 SYN_SENT 太久了 约定的超时时间强行销毁
          // 虽然有风险 但不影响
          this.socket.destroy();
          // this.createSocket();
        }, this.options.connectionTimeoutMillis);
        // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
        const onError = (err: Error) => {
          reject(err);
        };
        this.socket.once('error', onError);

        const onSuccess = (socket: Socket | TLSSocket): void => {
          this.connected = true;
          // console.log('The TLS socket has been connected.');
          if (timeout) clearTimeout(timeout);
          socket.removeListener('error', onError);
          socket.on('close', this.onClose);
          socket.on('data', this.onData);
          socket.on('timeout', () => {
            // console.log('timeout');
            socket.end();
          });

          socket.on('error', (err: Error) => {
            if (this.retryCount >= 5 && this.ref) {
              this.emit('error', err);
            }
          });
          // console.log(socket);
          resolve(this);
        };
        this.socket.connect(this.options.port, this.options.host, () => {
          // TCP over TLS
          if (this.options.tls) {
            this.socket = tls.connect({
              socket: this.socket,
              rejectUnauthorized: this.options.rejectUnauthorized,
              servername: this.options.host,
            }, () => {
              onSuccess(this.socket);
            });
            this.socket.once('error', onError);
          } else {
            onSuccess(this.socket);
          }
        });
      } else {
        resolve(this);
      }
    });
  }

  /**
   * 释放或者结束当前TCP链接
   * 如果设置了 keepAlive 不会发送 FIN 包
   * 会将此 socket 标记为空闲状态
   */
  public release(force = false): void {
    if (!this.options.keepAlive || force || this.count >= 500) {
      // fire FIN packet
      const socket = this.socket;
      socket.removeAllListeners();
      socket.on('error', () => {
        // do nothing
      });
      socket.end();
      this.createSocket();
      this.count = 0;
    }
    this.ref = false;
    this.buffer = [];
    this.retryCount = 0;
    this.emit('free');
    this.removeAllListeners();
  }

  /**
   * Sends data on the socket. The second parameter specifies the encoding in the
   * case of a string. It defaults to UTF8 encoding.
   *
   * Returns `true` if the entire data was flushed successfully to the kernel
   * buffer. Returns `false` if all or part of the data was queued in user memory.`'drain'` will be emitted when the buffer is again free.
   *
   * The optional `callback` parameter will be executed when the data is finally
   * written out, which may not be immediately.
   *
   * See `Writable` stream `write()` method for more
   * information.
   */
  public write(buffer: Uint8Array | string): boolean {
    this.buffer.push(buffer);
    return this.socket.write(buffer);
  }

  private onClose = (hasError: boolean): void => {
    this.connected = false;
    // console.log('onCloset', this.ref, this.retryCount, hasError);
    if (this.ref && this.retryCount < 5) {
      this.retryCount++;
      this.emit('retry');
      // this.createSocket();
      this.connect(false).then(() => {
        this.buffer.forEach((buf) => this.write(buf));
      }).catch(() => {
        console.log('debug: socket retry connect error');
        // this.createSocket();
      });
    } else if (this.ref && this.retryCount >= 5) {
      this.emit('error', new Error(`Connection closed by foreign host ${this.options.host}:${this.options.port}`));
      this.release();
    } else {
      this.release();
    }
  };

  private onData = (data: Buffer): void => {
    // console.log(data, 'data');
    this.emit('data', data);
  };

  private createSocket(): void {
    // const socket = this.options.tls ? new TLSSocket() : new Socket();
    const socket = new Socket();
    // if (this.options.keepAlive) socket.setKeepAlive(this.options.keepAlive, Math.max(10000, (this.options.idleTimeoutMillis / 2) >>> 0));
    socket.setKeepAlive(true);
    socket.setTimeout(this.options.idleTimeoutMillis);
    this.connected = false;
    this.socket = socket;

    // socket.on('lookup', (err: Error) => {
    //   console.log('lookup');
    //   // this.emit('error', err);
    // });
    // close
    // connect
    // data
    // drain
    // end
    // error
    // lookup
    // ready
    // timeout
  }
}

export default Connection;
