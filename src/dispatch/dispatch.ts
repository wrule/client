/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 *
 * +--------------------------------------------------------------------------+
 * |                                                                          |
 * |                           +------------------+                           |
 * |                           | XEngine dispatch |                           |
 * |                           +------------------+                           |
 * |                                                                          |
 * |       +---------+  +---------+ +---------+ +---------+ +---------+       |
 * |       | execute |  | execute | | execute | | execute | | execute |       |
 * |       +---------+  +---------+ +---------+ +---------+ +---------+       |
 * |                                                                          |
 * |       +----------------------------------------------------------+       |
 * |       |        Context / VariableManager / CookieManager         |       |
 * |       +----------------------------------------------------------+       |
 * |                                                                          |
 * |       +----------------------------------------------------------+       |
 * |       |            SingleController / CombinationController      |       |
 * |       | ComponentController / LoopController / PollController ...|       |
 * |       | HTTPController / DubboController / MiddlewareController..|       |
 * |       +----------------------------------------------------------+       |
 * |                                                                          |
 * |       +----------------------------------------------------------+       |
 * |       |                      ResultManager                       |       |
 * |       +----------------------------------------------------------+       |
 * |                                                                          |
 * +--------------------------------------------------------------------------+
 */
import EventEmitter from 'node:events';
import { performance } from 'node:perf_hooks';
import { decodeWithOptionsAsObject } from '@/utils/zlib';
import workerPool, { ExecuteSetGlobalVariableMessage, ExecuteInteractAskMessage, debugWorkerPool } from '@/worker';
import { DispatchData, DispatchContext, DispatchStat, ExecuteTaskData } from '@/dispatch/types';
import { ExecuteMessageData, MessageEvent, ReplyMessage } from '@/server/types';
import { EXECUTE_STATUS } from '@/core/enum';
import Logger from '@/logger';
import { decodeContentType } from '@/utils/serialize/type';
import { CONFIG } from '@/config';
import { EXECUTE_MODE, EXECUTE_OPTIONS } from '@/dispatch/enum';

export type ExecuteStatusCollection = EXECUTE_STATUS[];
export { ExecuteInteractAskMessage } from '@/worker';

interface DispatchInstanceData {
  context: DispatchContext;
  queue: ExecuteTaskData[];
  requestId?: string;
}

/**
 * @param TAG 特殊标记(3) 1100 0110 1001 0110 0011 1111
 * @param ProtocolVersion 协议版本(1) 目前 = 1
 * @param Options 选项(4) options [or] 现在不用判断 固定都是 1 << 0
 *                1 << 0 是否压缩
 * @param ContextSize 执行上下文数据大小(4) Brotli之后的长度
 * @param Data ExecuteHeaders+Brotli(Context)+Brotli(Execute)+Brotli(Execute) ...
 * @notice 每个 ExecuteHeaders 由4+4字节组成，第一个4字节为步骤Brotli后的长度，第二个为选项
 * 选项目前氛围异步和同步
 * 1 << 0 = 同步执行
 * 1 << 1 = 异步执行
 *  0                   1                   2                   3
 *  0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * |                   TAG IGNORE                  |    Version    |
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * |                            Options                            |
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * |                         Context Size                          |
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 *        Brotli(Context)+ExecuteHeaders+Brotli(Execute)...        |
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 */

/**
 * 简易调度器
 * @author William Chan <root@williamchan.me>
 */
export default class Dispatch extends EventEmitter {
  private readonly context!: DispatchContext;
  /** 当前正在运行的 execute */
  private readonly workers: Record<string, EventEmitter> = {};
  /** 执行队列 */
  private readonly queue!: ExecuteTaskData[];
  /** 没什么用 标记日志用 */
  private readonly requestId?: string;
  /** 是否标记已取消 */
  private isCancel = false;
  private maxWorkerCount = CONFIG.WORKER_MAX_COUNT;
  // 运行中参数
  /** 执行结果集合  */
  private status: ExecuteStatusCollection = [];
  /** current running index  */
  private index = 0;
  /** running count  */
  private running = 0;
  /** 完成计数 */
  private completed = 0;
  /** 开始时间计数 */
  private start = -1;
  private useDebugPool = false;

  /**
   * 创建一个调度器
   * @param data
   * @param requestId
   * @returns {Promise<Dispatch>}
   */
  public static async create(data: DispatchData | Buffer | ArrayBuffer, requestId?: string): Promise<Dispatch> {
    if (data instanceof ArrayBuffer || Buffer.isBuffer(data)) {
      const buffer = Buffer.from(data);
      if (buffer.readUIntBE(0, 3) === 0xC6963F) {
        const opt = buffer.readUInt32BE(4);
        const contextSize = buffer.readUInt32BE(8);
        const contextData = await decodeWithOptionsAsObject<DispatchContext>(
          Buffer.from(buffer.buffer, buffer.byteOffset + 12, contextSize),
          opt,
        );
        const context: DispatchContext = {
          env: contextData.env || {},
          retry: contextData.retry || 0,
        };
        const queue: ExecuteTaskData[] = [];
        // create queue
        let offset = 12 + contextSize;
        let index = 0;

        while (offset !== buffer.byteLength) {
          const size = buffer.readUInt32BE(offset);
          const options = buffer.readUInt32BE(offset + 4);
          /**
           * 这里做一次内存 copy
           * 由于 nodejs 独有的多线程模型导致的
           * 如果不进行 copy 效率极其低下 因为传输的数据太大了
           * @fixme 换成ShareArrayBuffer会不会缓解?
           */
          const execute = Buffer.allocUnsafe(size);
          buffer.copy(execute, 0, offset + 8);
          queue.push({
            execute,
            context,
            option: opt,
            mode: (options & EXECUTE_OPTIONS.SYNC) !== 0 ? EXECUTE_MODE.SYNC : EXECUTE_MODE.ASYNC,
            id: index, // 严格按照给定的顺序
          });
          offset = offset + 8 + size;
          index++;
        }

        return new Dispatch({ queue, context, requestId });
      }
      throw new Error('Dispatch Protocol version not match');
    } else {
      const context: DispatchContext = {
        env: data.env || {},
        retry: data.retry || 0,
      };
      const queue: ExecuteTaskData[] = [];
      // create queue
      for (let index = 0; index < data.execute.length; index++) {
        const item = data.execute[index];
        queue.push({
          execute: item,
          context,
          mode: item.mode ?? EXECUTE_MODE.SYNC,
          id: index, // 严格按照给定的顺序
        });
      }
      return new Dispatch({ queue, context, requestId });
    }
  }

  /**
   * 构造函数
   * @param data
   * @param requestId 没什么用 标记日志用 可以不传
   */
  public constructor(data: DispatchInstanceData) {
    super();
    this.requestId = data.requestId;
    this.context = data.context;
    this.queue = data.queue;
  }

  /**
   * 分发用例队列
   * 不要重复调用 现在没这需求 后期改下很简单
   */
  public dispatch(useDebugPool = false): void {
    if (this.start === -1) {
      this.status = new Array(this.queue.length).fill(EXECUTE_STATUS.WAIT);
      this.start = performance.now();
      this.index = 0;
      this.isCancel = false;
      this.useDebugPool = useDebugPool;
      this.fire();
      this.emit('start', this.queue.length);
    } else {
      throw new Error('Dispatch is running');
    }
  }

  /**
   * running task
   */
  private fire(): void {
    const next = this.queue[this.index];
    if (!next && !this.running) {
      this.done();
    } else if (next && this.running < this.maxWorkerCount) {
      // calc next running count, dynamic queue size
      const count = Math.min(this.maxWorkerCount - this.running, this.queue.length - this.index);
      for (let idx = 0; idx < count; idx++) {
        const task = this.queue[this.index];
        // next task is async or sync and no running task
        if (task.mode === EXECUTE_MODE.ASYNC || (task.mode === EXECUTE_MODE.SYNC && this.running === 0)) {
          if (task.mode === EXECUTE_MODE.ASYNC && this.running) {
            const prev = this.queue[this.index - 1];
            if (prev && prev.mode === EXECUTE_MODE.SYNC) {
              break;
            }
          }
          this.running++;
          this.index++;
          this.run(task)
            // 不太可能出现错误
            .catch((e) => this.emit('error', e))
            // eslint-disable-next-line no-loop-func
            .finally(() => {
              this.running--;
              this.fire();
            });
        } else {
          break;
        }
      }
    }
  }

  /**
   * run a task and emit status support retry
   * @param {ExecuteTaskData} data
   */
  private async run(data: ExecuteTaskData): Promise<void> {
    const count = this.context.retry ? this.context.retry : 0;
    for (let retry = 0; retry <= count; retry++) {
      if (this.isCancel || data.isCancel) {
        this.status[data.id] = EXECUTE_STATUS.CANCEL;
        break;
      } else {
        if (retry >= 1) {
          this.log('info', `index ${data.id} retry ${retry}/${count}`);
        }
        const status = await this.execute(data, retry);
        if (
          status === EXECUTE_STATUS.DONE
          || status === EXECUTE_STATUS.SKIP
          || status === EXECUTE_STATUS.CANCEL
        ) {
          break;
        }
      }
    }
    const status = this.status[data.id] === EXECUTE_STATUS.CANCEL ? 'cancel' : 'completed';
    this.log('info', `${status} ${++this.completed}/${this.status.length}`);
  }

  /**
   * execute one
   * @fixme 不够单一职责
   * @param data
   * @returns {Promise<void>}
   */
  private async execute(data: ExecuteTaskData, retry: number): Promise<EXECUTE_STATUS> {
    // 这里每次调度时，如果没有空闲worker，await后return逻辑不会走，因而调度过程相当于被挂起了
    const worker = this.useDebugPool ? await debugWorkerPool.runWithTask(data) : await workerPool.runWithTask(data);
    return new Promise((resolve) => {
      const complete = (status: EXECUTE_STATUS): void => {
        // worker.removeAllListeners();
        if (this.workers[data.id]) {
          delete this.workers[data.id];
        }
        resolve(status);
      };
      worker.on('message', (
        e: ExecuteMessageData | ReplyMessage |
        ExecuteInteractAskMessage | ExecuteSetGlobalVariableMessage,
      ) => {
        if (e.event === 'interact' || e.event === 'query') {
          this.emit('reply', e);
        } else if (e.event === 'set-global-variable') {
          if (!this.context.env.variable) this.context.env.variable = {};
          /** @fixme 这里 undefined 传递存在问题 */
          this.context.env.variable[e.data.key] = decodeContentType(e.data.value);
          this.log('debug', `execute thread set global variable "${e.data.key}" successfully.`);
        } else if (e.event === 'interact-ask') {
          this.emit('interact-ask', e);
        } else {
          e.retry = retry;
          Logger.info('JDBC-msg-1', e);
          this.emit('message', e);
          if (e.event === 'status') {
            this.status[data.id] = e.data;
          } else if (e.event === 'done' || e.event === 'exit') {
            // 外面收到的是 Uint8Array
            this.status[data.id] = e.event === 'exit' ? EXECUTE_STATUS.EXIT : Buffer.from(e.data).readUIntBE(8, 1);
            complete(this.status[data.id]);
          }
        }
      });
      // 取消成功
      worker.on('cancel-done', () => {
        this.status[data.id] = EXECUTE_STATUS.CANCEL;
        complete(this.status[data.id]);
      });
      // 触发兜底的意外关闭
      worker.on('close', () => {
        if (
          this.status[data.id] === undefined
          || this.status[data.id] === EXECUTE_STATUS.RUNNING
          || this.status[data.id] === EXECUTE_STATUS.WAIT
        ) {
          Logger.info('JDBC-msg-2');
          this.emit('message', {
            event: 'exit',
            executeId: data.id,
            /** exit code */
            code: 127,
            // data?: ExecuteResult;
            retry,
          });
          this.status[data.id] = EXECUTE_STATUS.EXIT;
        }
        complete(this.status[data.id]);
      });
      this.workers[data.id] = worker;
    });
  }

  /**
   * done dispatch
   */
  private done(): void {
    this.log('info', `dispatch cost ${(performance.now() - this.start).toFixed(2)}ms`);
    const stat = {} as Record<EXECUTE_STATUS, number>;
    this.status.forEach((status) => {
      if (!stat[status]) stat[status] = 0;
      stat[status]++;
    });
    this.log('info', `dispatch stat: ${JSON.stringify(stat)}`);
    // Object.keys(EXECUTE_STATUS).forEach((status) => {
    //   this.log('info', `stat ${EXECUTE_STATUS[status]}: ${stat[EXECUTE_STATUS[status]]}`);
    // });
    this.emit('done', this.status);
    this.start = -1;
  }

  /**
   * cancel running task
   * @param {number | number[]} executeId id or id array to cancel or all task if not set
   */
  public cancel(executeId?: number | number[]): void {
    if (executeId !== undefined) {
      this.log('warn', `cancel execution [${executeId}] ...`);
      const execute = typeof executeId === 'number' ? [executeId] : executeId;
      execute.forEach((id) => {
        const event = this.workers[id];
        if (event) {
          event.emit('cancel');
        } else {
          // 不再执行队列中的话，搜索所有队列
          for (let index = 0; index < this.queue.length; index++) {
            const queue = this.queue[index];
            if (queue.id === id) queue.isCancel = true;
          }
        }
      });
    } else if (!this.isCancel) {
      this.log('warn', 'cancel all execution...');
      // mark global cancel flag
      this.isCancel = true;
      // mark all queue cancel flag
      for (let index = 0; index < this.queue.length; index++) {
        const queue = this.queue[index];
        queue.isCancel = true;
      }
      // 对正在执行中的线程全部发送取消指令
      Object.keys(this.workers).forEach((key) => {
        const event = this.workers[key];
        if (event) event.emit('cancel');
      });
    }
  }

  /**
   * send message to execute thread
   * @param event
   * @param data
   */
  public sendEvent(event: string, data: MessageEvent): boolean | void {
    if (data.params) {
      if (data.params.executeId !== undefined) {
        const worker = this.workers[data.params.executeId];
        if (worker) {
          return worker.emit(event, data);
        }
      }
    } else {
      // @todo
      throw new Error('params not found.');
    }
    throw new Error('The execute run has ended or does not exist.');
  }

  /**
   * stat status
   */
  public stat(): DispatchStat {
    return {
      completed: this.completed,
      total: this.status.length,
    };
  }

  /**
   * print log
   * @param level
   * @param log
   * @param args
   */
  public log(level: 'info' |'warn' | 'error'| 'debug' | 'trace' | 'fatal' | 'mark', ...args: any[]): void {
    Logger[level](`[dispatch]${this.requestId ? `[${this.requestId}]` : ''} %s`, ...args);
  }
}
