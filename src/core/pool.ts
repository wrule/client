/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import Logger from '@/logger';

export interface InstanceResult<T> {
  instance: T;
  version?: string;
  cache?: Record<string, any>;
}

interface Instance<T> {
  promise?: Promise<InstanceResult<T>>;
  lastUseTime: number;
  instance?: InstanceResult<T>;
}

const CHECK_INTERVAL = 20 * 1000;

/**
 * 简易资源复用池
 */
export default abstract class BasePool<T> {
  protected static MAX_SESSION = 300 * 1000; // 5分钟没用 销毁

  protected pool: Record<string, Instance<T>> = {};

  /**
   * constructor
   */
  public constructor() {
    this.createTimer();
  }

  public abstract getPool(...options: any): Promise<InstanceResult<T>>;
  protected abstract free(instance: InstanceResult<T>): void;
  protected abstract create(...options: any): Promise<InstanceResult<T>>;

  /**
   * 获取一个资源 没有就创建
   * @param key
   * @param options
   * @returns
   */
  protected async get(key: string, ...options: any): Promise<InstanceResult<T>> {
    const instance = this.pool[key];
    if (instance) {
      if (instance.promise) {
        const ret = await instance.promise;
        instance.lastUseTime = new Date().getTime();
        return ret;
      }
      if (instance.instance) {
        instance.lastUseTime = new Date().getTime();
        return instance.instance;
      }
    }
    const ret = this.create(...options);
    this.set(key, ret);

    ret.then((ins) => {
      this.set(key, ins);
      return ins;
    }).catch(() => {
      this.del(key);
    });
    // eslint-disable-next-line no-return-await
    return await ret;
  }

  /**
   * set
   * @param key
   * @param instance
   * @param version
   */
  protected set(key: string, instance: InstanceResult<T> | Promise<InstanceResult<T>>): void {
    const obj = {
      lastUseTime: new Date().getTime(),
    } as Instance<T>;
    if (instance instanceof Promise) {
      obj.promise = instance;
    } else {
      obj.instance = instance;
    }
    this.pool[key] = obj;
  }

  /**
   * del
   * @param key
   */
  protected del(key: string): void {
    delete this.pool[key];
  }

  /**
   * 超时资源释放
   */
  private createTimer(): void {
    setInterval(() => {
      try {
        const now = new Date().getTime();
        Object.keys(this.pool).forEach((key) => {
          const pool = this.pool[key];
          if (now - pool.lastUseTime > BasePool.MAX_SESSION) {
            if (pool.promise) {
              pool.promise.then((c) => this.free(c));
            } else if (pool.instance) {
              this.free(pool.instance);
            }
            this.del(key);
          }
        });
      } catch (e) {
        Logger.error(`[execute] ${e.message}`);
        Logger.debug(`[execute] ${e.stack}`);
      }
    }, CHECK_INTERVAL); // 20s检查一次
  }
}
