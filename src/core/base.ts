/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import chalk from 'chalk';
import { performance } from 'node:perf_hooks';
import crypto from 'node:crypto';
import Logger from '@/logger';
import { VariableManagerProxy } from '@/variable';
import { sleep } from '@/utils';
import { InputInteract } from '@/core/execute/types';
import * as ERROR from '@/core/error';
import { Context, ControllerExtraConfig, InteractAskData } from '@/core/execute';
import { Result, ErrorResult, BaseResult, ExtraResult, DetailResult } from '@/core/types/result';
import { BaseControllerData } from '@/core/types/data';
import { encodeContentType, decodeContentType } from '@/utils/serialize/type';
import { execute, exec } from '@/vm/execute';
import { SystemContext } from '@/core/types/vm';
import { CONTROLLER_STATUS, CONTROLLER_ERROR, CONTROLLER_TYPE, CONTROLLER_FLAG, INTERACT_TYPE } from '@/core/enum';

const CONTROLLER_STATUS_ICONS = {
  [CONTROLLER_STATUS.DONE]: '✅',
  [CONTROLLER_STATUS.INTERACT]: '✨',
  [CONTROLLER_STATUS.ERROR]: '❌',
  [CONTROLLER_STATUS.WAIT]: '⌛',
  [CONTROLLER_STATUS.RUNNING]: '🚀',
  [CONTROLLER_STATUS.SKIP]: '❔',
};

interface InteractWait {
  wait?: Promise<boolean>;
  resolve?: () => void;
  reject?: (e: Error) => void;
}

/**
 * 步骤基类 BaseController
 * @author William Chan <root@williamchan.me>
 */
export default abstract class BaseController<T extends BaseControllerData> {
  /** 全局顺序ID */
  public readonly globalIndex!: number;
  /** 每个步骤生成的索引ID 用于保存记录 不需要给前端 */
  public readonly id!: string;
  /** Parent index id */
  public readonly parentId?: string;
  /** deep */
  public readonly deep: number = 0;
  /** Execution group number */
  public readonly group: number = -1;

  protected readonly data: T;
  protected readonly context!: Context;
  protected subType?: string;

  private readonly error: ErrorResult[] = [];
  private localVariable?: VariableManagerProxy;
  private status: CONTROLLER_STATUS = CONTROLLER_STATUS.WAIT;
  private startTime = 0;
  private executeTime = 0;

  private interact?: InteractWait;

  /**
   * constructor
   * @param data
   * @param context
   * @param extra
   */
  public constructor(data: T, context: Context, config?: ControllerExtraConfig) {
    this.context = context;
    this.globalIndex = context.getGlobalIndex();
    this.data = data;
    if (config) {
      if (config.id !== undefined) this.id = config.id;
      if (config.parentId !== undefined) this.parentId = config.parentId;
      if (config.group !== undefined) this.group = config.group;
      if (config.deep !== undefined) this.deep = config.deep;
      // 这是当前步骤在组内的 index
      // if (config.index !== undefined) this.index = config.index;
    }
    if (this.id === undefined) {
      this.id = crypto.randomUUID();
    }
  }

  public getData(): T {
    return this.data;
  }

  /**
   * 控制器执行执行
   */
  public abstract action(): Promise<void>;

  /**
   * 跳过步骤的处理
   */
  public async skip(): Promise<boolean> {
    return true;
  }

  private runStartTime = 0;

  /**
   * run action
   */
  public async run(skip = false): Promise<void> {
    this.runStartTime = Date.now();
    if (((this.data.flag || 0) & CONTROLLER_FLAG.DISABLED) !== 0 || skip === true) {
      this.setStatus(CONTROLLER_STATUS.SKIP);
      await this.skip();
    } else if (this.getStatus() === CONTROLLER_STATUS.WAIT) {
      this.setStatus(CONTROLLER_STATUS.RUNNING);
      /** 交互式用例 注册监听 */
      if (this.isInteract) {
        this.registerInteract();
      }
      await this.action();
    }
    await this.complete();
  }

  /**
   * 步骤实现
   */
  protected abstract beforeExecute(): Promise<boolean>;
  protected abstract execute(): Promise<boolean>;
  protected abstract afterExecute(): Promise<boolean>;

  /**
   * 当前步骤独享的变量管理器（仅限步骤内使用）
   * @notice 设置变量不与全局共享 获取数据继承上下文变量 也可以使用特有的 setLocal 方法设置在当前步骤内
   */
  public get variable(): VariableManagerProxy {
    if (!this.localVariable) {
      this.localVariable = this.context.variable.createLocal();
    }
    return this.localVariable;
  }

  /**
   * create vm system method
   * @returns {SystemContext}
   */
  protected createGlobalVMContext(): SystemContext {
    const vmContext = Object.create(null) as SystemContext;
    vmContext.sys = Object.create(null);
    vmContext.sys.execute = execute;
    vmContext.sys.exec = exec;
    vmContext.sys.get = (key: string) => this.variable.get(key);
    // 用户设置变量会设置到上下文
    vmContext.sys.set = (key: string, value: any) => this.variable.set(key, value);
    vmContext.sys.del = (key: string) => this.variable.del(key);
    // 跨用例环境变量
    vmContext.sys.getEnvVariable = (key: string) => this.variable.getEnv(key);
    vmContext.sys.setEnvVariable = (key: string, value: any) => {
      // 这里这么做是为了让内容顺利在线程中传输
      const type = encodeContentType(value);
      const content = decodeContentType(type);
      this.context.setGlobalVariable(key, type);
      this.context.variable.setEnv(key, content);
    };
    vmContext.sys.log = (...args: any[]) => {
      const jsArgs = args.map((item) => {
        try {
          return JSON.parse(JSON.stringify(item));
        } catch (error) { }
        return item;
      });
      // console.log(...jsArgs);
    };
    vmContext.sys.sleep = sleep;
    /** @todo */
    // vmContext.sys.getGlobal = (key: string) => this.context.variable.getGlobal(key);
    // vmContext.sys.setGlobal = (key: string, value: any) => this.context.variable.setGlobal(key, value);
    return vmContext;
  }

  /**
   * 获取步骤中的一些扩展信息
   * 例如 HTTP MYSQL 请求命令 域名 网络详细延迟等等
   */
  public async getExtraResult(): Promise<ExtraResult | undefined> {
    return undefined;
  }

  /**
   * 获取详细的响应结果
   * @returns {DetailResult}
   */
  public async getDetailResult(): Promise<DetailResult> {
    return {
      interact: this.data.interact,
    };
  }

  /**
   * 设置步骤状态
   * @param status
   */
  public setStatus(status: CONTROLLER_STATUS): void {
    this.status = status;
    if (this.status === CONTROLLER_STATUS.RUNNING) {
      this.beginTimer();
    }
    this.context.result.setBaseResult(this);
  }

  /**
   * 获取步骤状态
   * @returns
   */
  public getStatus(): CONTROLLER_STATUS {
    return this.status;
  }

  /**
   * 获取执行时间
   */
  public get totalTime(): number {
    const time = this.executeTime ? this.executeTime : this.endTimer();
    return Number(time.toFixed(2));
  }

  /**
   * 设置执行时间
   */
  public set totalTime(time: number) {
    this.executeTime = time;
  }

  /**
   * 获取执行时间 允许覆盖
   * @returns
   */
  public calcTotalTime(): number {
    return this.totalTime;
  }

  /**
   * start calc timer
   */
  protected beginTimer(): void {
    this.startTime = performance.now();
  }

  /**
   * end calc timer
   */
  protected endTimer(): number {
    /* @notice -1 = never started */
    if (this.startTime === 0) {
      return 0;
    }
    const ns = performance.now() - this.startTime;
    return ns;
  }

  /**
   * 步骤ID 详情记录使用
   */
  public get stepId(): number {
    return this.globalIndex;
  }

  /**
   * get base result
   * @return {BaseResult}
   */
  public getBaseResult(): BaseResult {
    return {
      stepId: this.stepId,
      status: this.status,
      type: this.data.type,
      error: this.error,
      totalTime: this.totalTime,
    };
  }

  /**
   * 获取当前步骤的结果记录
   * @returns
   */
  public getResult<K extends Result>(): K {
    return this.context.result.getIndexById(this.id);
  }

  /**
   * set error
   * @param e
   * @param type
   */
  public setError(e: Error | ERROR.BaseError): void {
    let error: CONTROLLER_ERROR;
    let extra;
    if (e instanceof ERROR.BaseError) {
      error = e.code;
      extra = e.extra;
    } else {
      error = CONTROLLER_ERROR.UNKNOWN_ERROR;
      // Logger.error(`UnknownError: ${e.message}`);
      // if (e.stack) Logger.error(e.stack);
    }
    this.error.push({
      message: e.message,
      stack: e.stack,
      error,
      extra,
    });
    this.setStatus(CONTROLLER_STATUS.ERROR);
    this.log(
      'error',
      '%s\n%s %s',
      CONTROLLER_ERROR[error],
      e.message,
      e.stack ? `\n${e.stack}` : '',
    );
  }

  /**
   * errno
   * @return {number}
   */
  public get errno(): number {
    return this.error.reduce((no, item) => item.error | no, 0);
  }

  /**
   * 步骤是否错误
   * @returns {boolean}
   */
  public hasError(): boolean {
    return this.error.length > 0;
  }

  /**
   * print log
   * @param level
   * @param log
   * @param args
   */
  public log(level: 'info' |'warn' | 'error'| 'debug' | 'trace' | 'fatal' | 'mark', log: string, ...args: any[]): void {
    const status = this.getStatus();
    // eslint-disable-next-line no-nested-ternary
    const tag = CONTROLLER_TYPE[this.data.type]
      ? this.subType
        ? `${CONTROLLER_TYPE[this.data.type]}:${this.subType}`
        : CONTROLLER_TYPE[this.data.type]
      : 'unknown';
    // console.log(tag);
    Logger[level](
      `%s %s[%d] [%s]%s ${log}`,
      CONTROLLER_STATUS_ICONS[status],
      '|- '.repeat(this.deep),
      this.stepId,
      tag,
      this.data.remark ? ` ${this.data.remark}` : '',
      ...args,
    );
  }

  /**
   * complete
   */
  private async complete(): Promise<void> {
    const totalTime = this.calcTotalTime();
    // this.totalTime = totalTime;
    this.totalTime = Date.now() - this.runStartTime;
    // check isInteract
    if (this.status === CONTROLLER_STATUS.RUNNING) {
      if (this.isInteract) {
        this.setStatus(CONTROLLER_STATUS.INTERACT);
        const interact = this.data.interact || [];
        this.log('info', `interact mode, please input ${interact.length} answer`);
        this.data.interact?.forEach((item, idx) => {
          this.log('debug', chalk.yellow(`${idx + 1}: ${item.content}${item.type === INTERACT_TYPE.CONFIRM ? chalk.green(' [yes|no]') : ''}`));
        });
      } else {
        this.setStatus(CONTROLLER_STATUS.DONE);
        this.log('info', 'status = %s, time = %fms', CONTROLLER_STATUS[this.status], totalTime.toFixed(2));
      }
    }

    if (this.status !== CONTROLLER_STATUS.SKIP) {
      try {
        const [extraResult, detailResult] = await Promise.all([
          this.getExtraResult(),
          this.getDetailResult(),
        ]);
        // 引用关系数据会刷新的
        detailResult.interact = this.data.interact;
        this.context.result.setResult(this, detailResult, extraResult);
      } catch (e) {
        this.setError(new ERROR.SystemError(`record create failed, ${e.message}`));
        Logger.error(e.message);
        if (e.stack) Logger.error(e.stack);
      }
      // wait isInteract
      if (this.status === CONTROLLER_STATUS.INTERACT) {
        try {
          this.context.event.emit('interact-ask', {
            stepId: this.stepId,
            interact: this.data.interact,
          } as InteractAskData);
          await this.interact?.wait;
          this.setStatus(CONTROLLER_STATUS.DONE);
        } catch (e) {
          this.setError(e);
          this.setStatus(CONTROLLER_STATUS.ERROR);
        }
        this.log('info', 'interact mode status = %s', CONTROLLER_STATUS[this.status]);
      }
    }
  }

  /**
   * isInteract
   */
  private get isInteract(): boolean {
    return (this.data.interact && this.data.interact.length > 0) || false;
  }

  /**
   * Register Interact
   */
  private registerInteract(): void {
    const interact: InteractWait = {};
    interact.wait = new Promise<boolean>((resolve, reject) => {
      interact.resolve = (() => resolve(true));
      interact.reject = ((e) => reject(e));
    });
    this.interact = interact;
    this.context.event.on('interact', this.handlerInteract);
    this.data.interact?.forEach((item) => {
      // eslint-disable-next-line no-param-reassign
      item.content = this.variable.replace(item.content);
    });
  }

  /**
   * isInteract
   */
  private handlerInteract = (data: InputInteract): void => {
    const interact = this.data.interact || [];
    if (
      data.stepId === this.stepId
      && this.status === CONTROLLER_STATUS.INTERACT
      && data.input.length === interact.length
    ) {
      let result = true;
      interact.forEach((item, idx) => {
        const input = data.input[idx];
        let value;
        if (input !== undefined) {
          switch (item.type) {
            case INTERACT_TYPE.STRING:
              value = this.variable.replace(input);
              break;
            case INTERACT_TYPE.NUMBER:
              value = Number(this.variable.replace(input));
              break;
            case INTERACT_TYPE.CONFIRM:
              value = this.variable.replace(input);
              if (Number(value) !== 0 && value !== 'yes') {
                result = false;
              }
              break;
            default:
              value = this.variable.replace(input);
          }
          // eslint-disable-next-line no-param-reassign
          item.value = encodeContentType(value);
          if (item.var && item.type !== INTERACT_TYPE.CONFIRM) this.context.variable.set(item.var, value);
        }
      });
      this.context.event.removeListener('interact', this.handlerInteract);
      if (result === true) {
        if (this.interact?.resolve) this.interact.resolve();
      } else {
        if (this.interact?.reject) this.interact.reject(new ERROR.InteractError('interact failed'));
      }
    }
  };
}
