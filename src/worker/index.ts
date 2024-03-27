/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import chalk from 'chalk';
import EventEmitter from 'node:events';
import { Worker, MessagePort, MessageChannel, WorkerOptions, TransferListItem } from 'node:worker_threads';
import { isDeveloper } from '@/utils';
import Logger from '@/logger';
import { CallMessage, CallReplyMessage, ExecuteMessageData, QueryMessage, QueryReplyMessage, InteractMessage, ExecuteLogMessage } from '@/server/types';
import { ExecuteTaskData } from '@/dispatch/types';
import { CONFIG } from '@/config';
import { ExecuteSetGlobalVariableMessage, ExecuteInteractAskMessage } from '@/worker/listener';

export { ExecuteSetGlobalVariableMessage, ExecuteInteractAskMessage } from '@/worker/listener';

export enum WORKER_TASK_TYPE {
  EXECUTE = 1,
  QUERY = 2,
  CANCEL = 3,
  CALL = 4,
  INTERACT = 5,
}

export interface WorkerTask {
  readonly channel: MessagePort;
  readonly data: ExecuteTaskData;
  readonly task: WORKER_TASK_TYPE.EXECUTE;
}

export interface CancelTask {
  readonly cancel: 1;
  readonly task: WORKER_TASK_TYPE.CANCEL;
}

export type QueryTask = QueryMessage & {
  readonly task: WORKER_TASK_TYPE.QUERY;
}
export type InteractTask = InteractMessage & {
  readonly task: WORKER_TASK_TYPE.INTERACT;
}

export interface CallTask {
  readonly channel: MessagePort;
  readonly data: CallMessage;
  readonly task: WORKER_TASK_TYPE.CALL;
}

export type Task = WorkerTask | CancelTask | QueryTask | InteractTask | CallTask;

enum WORKER_STATUS {
  IDLE = 0,
  BUSY = 1,
  DIE = 2, // 死亡
}

const createWorker = (): Worker => {
  const options: WorkerOptions = {
    resourceLimits: {
      maxOldGenerationSizeMb: 4096,
      maxYoungGenerationSizeMb: 96,
      codeRangeSizeMb: 0,
      stackSizeMb: 4,
    },
    argv: process.argv,
  };
  if (isDeveloper) {
    const filename = JSON.stringify('@/worker/worker');
    return new Worker(`
require('ts-node').register();
require('tsconfig-paths').register();
require(${filename});`, {
      eval: true,
      ...options,
    });
  }
  return new Worker(`${__dirname}/worker.js`, options);
};

interface WorkerInstance {
  readonly instance: Worker;
  status: WORKER_STATUS;
  /** 状态切换时间 */
  stateTime: number;
  /** 最后响应时间 */
  lastPingTime: number;
  /** executeId */
  executeId: number;
  timeout: number;
  isInit: boolean;
  event?: EventEmitter;
  setStatus(status: WORKER_STATUS): void;
}

interface WorkerEventInstance extends WorkerInstance{
  event: EventEmitter;
}

/**
 * WorkerPool 简易线程池
 * @author William Chan <root@williamchan.me>
 */
class WorkerPool {
  private worker: WorkerInstance[] = [];
  private queue: ((wk: WorkerEventInstance) => void)[] = [];
  private debug!: boolean;

  /**
   * constructor
   */
  public constructor(debug = false) {
    setInterval(this.checkWorkerTimeout, 2000);
    this.debug = debug;
  }

  /**
   * Check the thread for execution timeout and idle timeout
   */
  private checkWorkerTimeout = async (): Promise<void> => {
    const now = new Date().getTime();
    this.worker.forEach(async (worker) => {
      const elapsedTime = now - worker.stateTime;
      // 在线程内部会设置超时，但是如果发现30秒还没有结束，外部强行结束
      if (worker.status === WORKER_STATUS.BUSY && elapsedTime > (worker.timeout + 30 * 1000)) {
        Logger.warn(
          '[worker pool] Worker stopped with execute timeout %dms, executeId = %d, threadId = %d',
          worker.timeout,
          worker.executeId,
          worker.instance.threadId,
        );
        worker.setStatus(WORKER_STATUS.DIE);
        await worker.instance.terminate();
      }
      // 空闲超时了
      if (worker.status === WORKER_STATUS.IDLE && elapsedTime > CONFIG.WORKER_IDLE_TIMEOUT) {
        Logger.info('[worker pool] Worker stopped with idle timeout %dms, threadId = %d', CONFIG.WORKER_IDLE_TIMEOUT, worker.instance.threadId);
        worker.setStatus(WORKER_STATUS.DIE);
        await worker.instance.terminate();
      }
      // 15秒内没有响应，强行结束掉，可能出现了死循环
      if (worker.isInit && now - worker.lastPingTime > 1000 * 60 * 30) {
        Logger.error('[worker pool] Worker unresponsive, killed, executeId = %d, threadId = %d', worker.executeId, worker.instance.threadId);
        // 最后活跃时间
        Logger.error('[worker pool] Worker last active time: %s, now: %s', worker.lastPingTime, now);
        if (worker.status === WORKER_STATUS.BUSY && worker.event) {
          Logger.info('JDBC-msg-3');
          worker.event.emit('message', {
            event: 'log',
            type: 'stderr',
            executeId: worker.executeId,
            data: chalk.red('!!! Execute unresponsive killed, please check last log !!!'),
          } as ExecuteLogMessage);
        }
        worker.setStatus(WORKER_STATUS.DIE);
        await worker.instance.terminate(); // 如果该worker实例60秒没有通信，则手动kill
      }
    });
  };

  /**
   * Create Thread
   * @param index
   */
  private createThread(): WorkerInstance {
    const instance = createWorker();
    const next = this.next.bind(this);
    Logger.debug(`[worker pool] create worker, threadId ${instance.threadId}`);
    const now = new Date().getTime();
    const worker: WorkerInstance = {
      instance,
      status: WORKER_STATUS.IDLE,
      stateTime: now + 5000,
      lastPingTime: now + 5000,
      executeId: -1,
      isInit: false,
      timeout: CONFIG.WORKER_EXEC_TIMEOUT,
      setStatus(status: WORKER_STATUS): void {
        if (this.status !== WORKER_STATUS.DIE) { // 标记为退出状态后 无论如何都不应该再被修改
          this.stateTime = new Date().getTime();
          this.status = status;
          if (status === WORKER_STATUS.IDLE) {
            Logger.debug(`[worker pool] free threadId ${worker.instance.threadId}`);
            this.executeId = -1;
            delete this.event;
          } else if (status === WORKER_STATUS.BUSY) {
            Logger.debug(`[worker pool] get threadId ${worker.instance.threadId}`);
          }
          if (status === WORKER_STATUS.IDLE) {
            next();
          }
        }
      },
    };
    instance.on('message', (data) => {
      // Logger.debug(data);
      worker.lastPingTime = new Date().getTime();
      // wait for init
      if (!worker.isInit) worker.isInit = true;
      if (typeof data === 'string') {
        Logger.info(`${data} threadId = %s`, worker.instance.threadId);
      }
    });
    // 线程退出
    instance.on('exit', (code) => {
      Logger.warn(`[worker pool] Worker stopped with exit code ${code}`);
      const event = worker.event;
      if (event) {
        event.emit('exit', code);
      }
      const index = this.worker.findIndex((item) => item === worker);
      if (index !== -1) this.worker.splice(index, 1); // 找到worker对象，从池子中移除
      // 创建线程时，就监听了exit事件，当该线程退出时（可能是由于执行事件过长，线程阻塞长时间没有和主线程通信），会调用一遍next，看一下队列中是否有等待执行的调度
      next();
    });
    this.worker.push(worker);
    return worker;
  }

  /**
   * get idle worker index
   * @returns {number}
   */
  private getIdleWorkerInstance(): WorkerEventInstance | undefined {
    let worker = this.worker.find((item) => item.status === WORKER_STATUS.IDLE);
    if (!worker) {
      if (this.worker.length < CONFIG.WORKER_MAX_COUNT || this.debug) {
        worker = this.createThread();
      }
    }
    if (worker) {
      const event = new EventEmitter();
      worker.setStatus(WORKER_STATUS.BUSY);
      worker.event = event;
    }
    return worker as WorkerEventInstance;
  }

  /**
   * 获取空闲的线程 FIFO
   * @description 尝试获取空闲worker，return一个promise，先把resolve返回worker的回调函数丢到队列中，然后立即执行一次next方法去遍历池子中是否存在空闲线程
   * @returns {Promise<WorkerTask>}
   */
  private getIdleWorker(): Promise<WorkerEventInstance> {
    return new Promise((resolve) => {
      this.queue.push((wk: WorkerEventInstance): void => {
        resolve(wk);
      });
      this.next();
    });
  }

  /**
   * next queue
   */
  private next(): void {
    if (this.queue.length > 0) {
      const worker = this.getIdleWorkerInstance();
      if (worker) {
        const queue = this.queue.shift();
        if (queue) {
          queue(worker);
          Logger.debug(`[worker pool] pop queue, length ${this.queue.length}`);
        }
      }
    }
  }

  /**
   * 获取空闲的 worker 数量
   * @returns {number}
   */
  public getIdleWorkerCount(): number {
    if (this.debug) {
      return Infinity;
    }
    return this.worker.reduce((total, worker) => {
      if (worker.status !== WORKER_STATUS.BUSY) {
        return total + 1;
      }
      return total;
    }, CONFIG.WORKER_MAX_COUNT - this.worker.length);
  }

  /**
   * 获取等待的队列长度
   * @returns {number}
   */
  public getQueueCount(): number {
    return this.queue.length;
  }

  /**
   * 运行一些简易任务
   * @param data
   * @returns {Promise<EventEmitter>}
   */
  public async runWithCall(data: CallMessage): Promise<EventEmitter> {
    const worker = await this.getIdleWorker();
    const event = worker.event;
    const { port1, port2 } = new MessageChannel();
    // 端口关闭
    port1.once('close', () => {
      // Logger.debug('[worker pool] port close 1');
      worker.setStatus(WORKER_STATUS.IDLE);
      event.emit('close'); // 兜底
    });

    port1.on('message', (e: CallReplyMessage) => {
      // Logger.debug('[worker pool] port close 2');
      (e.data as any).rows = [['231']];
      Logger.info('JDBC-msg-4', JSON.stringify(e.data));
      event.emit('message', e);
      worker.setStatus(WORKER_STATUS.IDLE);
    });

    try {
      Logger.info('[JDBC-p2]', JSON.stringify(data));
    } catch (error) { console.log(error); }
    // send execute message
    worker.instance.postMessage({
      channel: port2,
      data,
      task: WORKER_TASK_TYPE.CALL,
    } as CallTask, [port2]);

    return event;
  }

  /**
   * 运行任务
   * @param data
   * @returns {Promise<EventEmitter>}
   */
  public async runWithTask(data: ExecuteTaskData): Promise<EventEmitter> {
    const worker = await this.getIdleWorker();
    const event = worker.event;
    if (data.isCancel) {
      process.nextTick(() => {
        // Logger.debug('[worker pool] port close 3');
        worker.setStatus(WORKER_STATUS.IDLE);
        event.emit('cancel-done');
      });
    } else {
      // 利用MessageChannel 实现主线程和worker的通信
      // worker本身只能监听一些exit等事件，无法实现业务上的事件通讯如：用例执行完毕worker空闲
      const { port1, port2 } = new MessageChannel();
      /** 监听上层来的 query 事件下发 */
      event.on('query', (e: QueryMessage) => {
        worker.instance.postMessage({ task: WORKER_TASK_TYPE.QUERY, ...e } as QueryTask);
      });
      /** 监听上层来的 interact 事件下发 */
      event.on('interact', (e: InteractMessage) => {
        worker.instance.postMessage({ task: WORKER_TASK_TYPE.INTERACT, ...e } as InteractTask);
      });
      /** 监听取消 */
      event.on('cancel', () => {
        worker.instance.postMessage({ task: WORKER_TASK_TYPE.CANCEL, cancel: 1 } as CancelTask);
      });
      // 端口关闭
      // 主线程端口监听事件，注册处理逻辑
      port1.once('close', () => {
        // Logger.debug('[worker pool] port close 4');
        worker.setStatus(WORKER_STATUS.IDLE);
        event.emit('close'); // 兜底
        // port1.removeAllListeners();
      });
      // Currently, this event is emitted when there is an error occurring while instantiating the posted JS object on the receiving end.
      // Such situations are rare, but can happen, for instance, when certain Node.js API objects are received in a vm.Context (where Node.js APIs are currently unavailable).
      // port1.on('messageerror', (e) => event.emit('error', e));
      // port1.on('messageerror', (e) => {
      //   Logger.debug('[worker pool] port close messageerror');
      //   console.log(e);
      // });

      // 线程异步事件
      port1.on('message', (e: ExecuteMessageData | QueryReplyMessage | ExecuteSetGlobalVariableMessage | ExecuteInteractAskMessage) => {
        Logger.debug('[worker pool] message', e.event);
        if (e.event === 'done' || e.event === 'exit') {
          /**
           * 进程退出状态 不要设置空闲
           * worker执行完毕用例，拿到done事件，进行线程池对该worker的状态重置为空闲
           */
          if (e.event === 'done' && e.cancel !== true) {
            // Logger.debug('[worker pool] port close 5');
            worker.setStatus(WORKER_STATUS.IDLE);
          } else if (e.event === 'exit' || e.cancel) {
            worker.setStatus(WORKER_STATUS.DIE);
          }
          // 删除 close 事件 提前释放线程
          port1.removeAllListeners();
          port1.close();
        }
        Logger.info('JDBC-msg-5', e);
        event.emit('message', e);
      });
      const transform: TransferListItem[] = [port2];
      // if (ArrayBuffer.isView(data.execute)) {
      //   transform.push(data.execute.buffer);
      // }
      Logger.debug('[worker pool] start execute id = %d, threadId = %d', data.id, worker.instance.threadId);
      worker.executeId = data.id;
      worker.timeout = data.timeout || CONFIG.WORKER_EXEC_TIMEOUT;
      // send execute message
      // console.log('send data', data);
      try {
        Logger.info('[JDBC-p3]', data);
      } catch (error) { console.log(error); }
      worker.instance.postMessage({
        channel: port2, // 将port2传入worker，实现和主线程通信
        data,
        task: WORKER_TASK_TYPE.EXECUTE,
      } as WorkerTask, transform);
    }
    return event;
  }
}
export default new WorkerPool();
export const debugWorkerPool = new WorkerPool(true);
