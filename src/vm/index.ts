/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import vm, { Context } from 'node:vm';
import EventEmitter from 'node:events';
import { performance } from 'node:perf_hooks';
import VMConsole, { ConsoleData } from '@/vm/console';
import VMTimer from '@/vm/timer';
import { VMError, TimeoutError } from '@/vm/error';
import VMRequire from '@/vm/require';
import { isDeveloper } from '@/utils';
import BaseError from '@/vm/error/base';
import { opts } from '@/config';

export { VMError } from '@/vm/error';

export interface VMResult {
  totalTime: number;
  logs: ConsoleData[];
  return?: any;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

interface VMOptions {
  context?: Record<string, any>;
  timeout?: number;
  debug?: boolean;
  async?: boolean;
}

export const VM_TAG = 'XEngine.<VM>';

function niceError(error: any) {
  let result = '未定位到脚本错误位置，请手动检查代码';
  const stacks: string[] = error.stack?.toString()?.split('\n')
    ?.filter((line: any) => line?.trim());
  const lineNumRegExp = /XEngine.<VM>:(\d+)/;
  const lineNumIndex = stacks.findIndex((item) => lineNumRegExp.test(item));
  const lineNumCode = stacks[lineNumIndex];
  const errLineCode = stacks[lineNumIndex + 1];
  const pointErrLineCode = stacks[lineNumIndex + 2];
  const lineNum = Number(lineNumCode?.match(lineNumRegExp)?.[1]);
  const charNum = pointErrLineCode.indexOf('^') + 1;
  if (lineNumCode && errLineCode && pointErrLineCode) {
    result = `
脚本执行出错！
${errLineCode}
${pointErrLineCode}
第 ${lineNum} 行，第 ${charNum} 个字符处发生错误，请检查脚本
    `.trim();
  }
  return result;
}

/**
 * VM Module
 * @author William Chan <root@williamchan.me>
 * @notice 现在有痛点，由于nodejs的VM模块的实现问题，阻塞会导致整个libuv线程阻塞
 * 如果使用我的 rust 实现可以避免此问题，但考虑到使用成本，暂使用此 lite 版本
 * @notice 也可以看看quickjsVM实现
 * @see https://github.com/justjake/quickjs-emscripten
 * @see https://git.williamchan.me:10443/root/rust-node-vm
 */
export default class VM extends EventEmitter {
  private context!: Context;
  private logs: ConsoleData[] = [];
  private console!: VMConsole | Console;
  private startTime = 0;
  private timeout = opts.vmTimeout;
  private timer!: VMTimer;
  private intervalTimer?: NodeJS.Timeout;
  private return!: any;
  // private async!: boolean;

  /**
   * 构造函数
   * @param context
   */
  public constructor(options: VMOptions = {}) {
    super();
    this.timeout = options.timeout || this.timeout;
    if (options.debug === undefined && isDeveloper) {
      this.console = new VMConsole(this.logs);
    } else {
      // this.console = options.debug ? console : console;
      this.console = options.debug ? new VMConsole(this.logs) : new VMConsole(this.logs);
    }
    // this.console = new VMConsole(this.logs);
    const onTimerEnd = (): void => {
      this.handleDone();
    };
    const onTimerError = (e: Error): void => {
      this.console.error(e);
    };
    this.timer = new VMTimer(onTimerError, onTimerEnd);
    const context = Object.freeze(Object.assign(
      Object.create(null),
      {
        require: VMRequire,
        Buffer,
        URL,
        console: this.console,
        JSON: JSON,
        ...this.timer.getTimer(),
        ...options.context,
      },
    ));
    // { microtaskMode: 'afterEvaluate' }
    this.context = vm.createContext(context);
  }

  /**
   * 执行脚本
   * @param code
   */
  private runScript(code: string): void {
    try {
      this.createTimer();
      this.return = vm.runInContext(code, this.context, {
        filename: VM_TAG,
        timeout: this.timeout,
        // displayErrors: false,
        // microtaskMode: 'afterEvaluate',
      });
      if (this.timer.getTimerCount() === 0) {
        this.handleDone();
      }
    } catch (e) {
      if (e.code === 'ERR_SCRIPT_EXECUTION_TIMEOUT') {
        this.handleError(new TimeoutError(this.timeout));
      } else {
        // const niceTip = niceError(e);
        // e.message = niceTip;
        // e.stack = niceTip;
        this.handleError(e);
      }
    }
  }

  /**
   * 执行脚本 异步
   * @param code
   */
  private async asyncRunScript(code: string): Promise<void> {
    try {
      this.createTimer();
      const script = `
        const AsyncVMEngine = Object.getPrototypeOf(async function(){}).constructor;
        new AsyncVMEngine(${JSON.stringify(code)});
      `;
      const fn = vm.runInContext(script, this.context, {
        filename: VM_TAG,
        timeout: this.timeout,
        // microtaskMode: 'afterEvaluate',
      });
      this.return = await fn.call(null);
      if (this.timer.getTimerCount() === 0) {
        this.handleDone();
      }
    } catch (e) {
      if (e.code === 'ERR_SCRIPT_EXECUTION_TIMEOUT') {
        this.handleError(new TimeoutError(this.timeout));
      } else {
        this.handleError(e, code);
      }
    }
  }

  private clearInterval(): void {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
    }
  }

  /**
   * 创建定时器，监听执行超时
   */
  private createTimer(): void {
    this.clearInterval();
    this.startTime = performance.now();
    this.intervalTimer = setInterval(() => {
      if (this.getRunningTime() > this.timeout) {
        this.handleError(new TimeoutError(this.timeout));
      }
    }, 200);
  }

  /**
   * 获取执行时间
   * @returns {number}
   */
  private getRunningTime(): number {
    if (this.startTime === 0) {
      return 0;
    }
    return performance.now() - this.startTime;
  }

  /**
   * 错误处理
   * @param e
   */
  private handleError(e: Error, code?: string): void {
    this.clearInterval();
    this.timer.clearAllTimer();
    // 内部错误无法判断 重定义

    const vmErr = new VMError({
      totalTime: this.getRunningTime(),
      logs: this.logs,
      error: {
        name: e.name,
        message: e.message,
        stack: e.stack,
      },
    }, code);

    if (e instanceof BaseError) {
      this.console.error(e);
    } else {
      const err = new Error(vmErr.message);
      delete err.stack;
      this.console.error(err);
    }
    this.emit('error', vmErr);
  }

  /**
   * 完成处理
   */
  private handleDone(): void {
    this.clearInterval();
    this.timer.clearAllTimer();
    this.emit('done', {
      totalTime: this.getRunningTime(),
      logs: this.logs,
      return: this.return,
    } as VMResult);
  }

  /**
   * 执行
   * @param code
   * @param options
   */
  public static async spawn(code: string, options: VMOptions = {}): Promise<VMResult> {
    return new Promise((resolve, reject) => {
      const instance = new VM(options);
      instance.once('done', (data: VMResult) => {
        resolve(data);
      });
      // 不能一直报告错误 外面没监听的话 就出错的
      instance.on('error', (err: VMError) => {
        reject(err);
      });
      if (options.async) {
        instance.asyncRunScript(code);
      } else {
        instance.runScript(code);
      }
    });
  }
}
