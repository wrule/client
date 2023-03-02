/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */

import EventEmitter from 'node:events';

/**
 * 简易异步队列
 * @author William Chan <root@williamchan.me>
 */
export default class SystemEventQueue extends EventEmitter {
  private _errno = -1;
  private _queue: any[] = [];
  private _result: any[] = [];
  private _fn?: (params?: any) => Promise<any>;
  private _wakeUp: null | (() => void) = null;

  /**
   * 等待函数
   * @returns {Promise<void>}
   */
  private wait(): Promise<void> {
    return new Promise((resolve) => {
      this._wakeUp = () => {
        this._wakeUp = null;
        resolve();
      };
    });
  }

  /**
   * 处理任务
   * @returns {Promise<void>}
   */
  private async execute(): Promise<void> {
    if (this._queue.length === 0) {
      return;
    }
    if (this._fn) {
      const fn = this._fn;
      // 本轮事件循环加入到任务，下一轮事件循环再处理，防止其他任务没有机会处理
      const queue = this._queue;
      this._queue = [];
      while (queue.length) {
        const params = queue.shift();
        try {
          const result = await fn(...params);
          this._result.push(result);
          this.emit('result', result);
        } catch (e) {
          this._result.push(e);
          this.stop(2);
        }
      }
    }
  }

  /**
   * 添加任务
   * @param params
   */
  public push(...params: any[]): void {
    if (this._fn) {
      // const length = this.queue.length;
      this._queue.push(params);
      if (this._wakeUp) {
        this._wakeUp();
      }
    }
  }

  /**
   * 停止队列 0 = 正常 > 1 = 错误
   * @param errno
   */
  public stop(errno = 0): void {
    delete this._fn;
    this._errno = errno;
    this._queue = [];
    if (this._wakeUp) {
      this._wakeUp();
    }
  }

  /**
   * 启动
   */
  public async start<T = any>(fn: (...params: any) => Promise<any>): Promise<T[]> {
    this._fn = fn;
    this._errno = -1;
    while (true) {
      await this.execute();
      if (this._errno !== -1) {
        break;
      }
      if (this._queue.length === 0) {
        await this.wait();
      }
    }
    if (this._errno > 0) {
      return Promise.reject(this._result[this._result.length - 1]);
    }
    return this._result;
  }
}
