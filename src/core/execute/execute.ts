/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import EventEmitter from 'node:events';
import crypto from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { CookieJar, MemoryCookieStore } from 'tough-cookie';
import { encodeDateTime } from '@/utils/format';
import Logger from '@/logger';
import type { ControllerData, Interact } from '@/core/types/data';
import type { ExecuteTaskData, ExecuteData } from '@/dispatch';
import VariableManager, { VARIABLE_TYPE, Variable } from '@/variable';
import ResultManager, { StatusCount } from '@/core/result';
import { EXECUTE_STATUS, EXECUTE_EVENTS, CONTROLLER_STATUS, CONTROLLER_TYPE } from '@/core/enum';
import type { Result, DetailResult } from '@/core/types/result';
import type { Context, CookieManager, InputInteract } from '@/core/execute/types';
import { execute, BEFORE_EXECUTE, BEFORE_DATASOURCE_EXECUTE } from '@/core/execute/utils';
import { isDeveloper, ENGINE_VERSION_UINT } from '@/utils';
import { CONFIG, opts } from '@/config';
import transform from '@/utils/serialize';
import { encodeBrotli, decodeWithOptionsAsObject } from '@/utils/zlib';
import type { ContentType } from '@/utils/serialize/type';
import { ExecuteDoneResult } from '@/server/types/message';
import flog from '@/utils/jmlog';

const stdoutWrite = process.stdout.write.bind(process.stdout);
const stderrWrite = process.stderr.write.bind(process.stderr);

export interface ExecuteStatus {
  /** 用例名称 引擎无用 原样返回 */
  name?: string;
  /** 用例ID 引擎无用 原样返回 */
  id?: string;
  /** 当前状态 */
  status: EXECUTE_STATUS;
  /** 执行进度 */
  progress: number;
  startTime: number;
  endTime: number;
  /** 总步骤数 */
  totalCount: number;
  /**
   * @notice 需要非常实时的颗粒度控制
   * 有些步骤执行次数是动态的 所以会影响执行百分比
   * 如果不做细颗粒度 可能出现 loop 0/1 的情况
   * @example 500/1000 50% .... 500/2000 25%
   */
  statusCount: StatusCount;
  /** 执行的环境名称 */
  env: string;
  /** 执行过程中外层遇到的致命错误 */
  error: string[];
  steps: Result[];
}

export interface ExecuteResult extends ExecuteStatus {
  /** 执行的变量与执行单元变量 */
  variable: {
    [VARIABLE_TYPE.ENV]?: Variable;
    [VARIABLE_TYPE.EXECUTE]?: Variable;
  };
}

export interface SetGlobalVariableData {
  key: string;
  value: ContentType;
}

export interface InteractAskData {
  stepId: string | number;
  interact: Interact[];
}

export interface ExecuteEvents {
  stdout: (e: string | Uint8Array) => void;
  stderr: (e: string | Uint8Array) => void;
  error: (e: Error) => void;
  exit: (e: number) => void;
  status: (e: EXECUTE_STATUS) => void;
  progress: (e: ExecuteStatus) => void;
  // done cancel 外部区分 实际一样
  done: (e: ExecuteDoneResult) => void;
  cancel: (e: ExecuteDoneResult) => void;
  close: () => void;
  ['set-global-variable']: (e: SetGlobalVariableData) => void;
  ['interact-ask']: (e: InteractAskData) => void;
}

declare interface Execute {
  on<U extends keyof ExecuteEvents>(
    event: U, listener: ExecuteEvents[U]
  ): this;
  emit<U extends keyof ExecuteEvents>(
    event: U, ...args: Parameters<ExecuteEvents[U]>
  ): boolean;
}

/**
 * 主执行类（单个用例）
 */
class Execute extends EventEmitter {
  private readonly data!: ExecuteData;
  private readonly libraryId!: string;
  private readonly context!: Context;
  private readonly result!: ResultManager;
  private readonly timeout!: number;
  /** 用例执行的ID 意义不大 解耦后无感知了 */
  private readonly id: number;
  private readonly error: string[] = [];
  private timer?: NodeJS.Timeout;
  /** calc step id auto_increment */
  private globalIndex = -1;

  private status = EXECUTE_STATUS.WAIT;
  private startTime = 0;
  private endTime = 0;

  /**
   * 创建执行器
   * @param data
   * @param listeners
   * @returns {Promise<Execute>}
   */
  public static async create(data: ExecuteTaskData, listeners?: ExecuteEvents): Promise<Execute> {
    let executeData!: ExecuteData;
    if (ArrayBuffer.isView(data.execute)) {
      executeData = await decodeWithOptionsAsObject(data.execute, data.option);
    } else {
      executeData = data.execute;
    }
    return new Execute({ ...data, execute: executeData }, listeners);
  }

  /**
   * 构造函数
   * @param {steps} steps
   */
  public constructor(data: ExecuteTaskData, listeners?: ExecuteEvents) {
    super();
    try {
      this.id = data.id;
      this.data = data.execute as ExecuteData;
      this.libraryId = (this.data as any).libraryId;
      this.timeout = data.timeout || CONFIG.WORKER_EXEC_TIMEOUT;

      // 这里还可有优化
      const variable = new VariableManager({
        [VARIABLE_TYPE.ENV]: data.context.env.variable?.[this.libraryId] ?? { } as any,
        [VARIABLE_TYPE.EXECUTE]: this.data.variable,
      });

      const cookieManager = this.createCookieManager();
      const traceState = this.data.traceState;
      this.result = new ResultManager(this.data.steps);
      this.context = {
        deepIndexs: [],
        usecase: this.data,
        requestId: data.requestId,
        dataSetCountValue: {
          isDataSet: false,
          isCaseDataSet: false,

          dataSetTotal: 0,
          dataSetSuccessCount: 0,
          dataSetFailCount: 0,
          dataSetSkipCount: 0,
          dataSetWaitCount: 0,

          caseDataSetTotal: 0,
          selectCaseDataSetTotal: 0,
          caseDataSetSuccessCount: 0,
          caseDataSetFailCount: 0,
          caseDataSetSkipCount: 0,
          caseDataSetWaitCount: 0,
        },
        getGlobalIndex: (): number => ++this.globalIndex,
        setGlobalVariable: (key: string, value: ContentType): void => {
          this.emit('set-global-variable', { key, value });
        },
        uuid: crypto.randomUUID(),
        event: new EventEmitter(),
        env: data.context.env,
        variable,
        cookie: cookieManager,
        result: this.result,
        browsers: this.data.browsers,
        files: {},
        traceState: traceState ? Object.keys(traceState).map((key) => `${key}=${traceState[key]}`).join(',') : undefined,
      };
      this.context.event.on('interact-ask', (event: InteractAskData) => {
        this.emit('interact-ask', event);
      });
      if (listeners) {
        (Object.keys(listeners) as unknown as (keyof ExecuteEvents)[]).forEach((key) => {
          this.on(key, listeners[key]);
        });
      }
      this.openListenEvent();
      Logger.info('----------- [%s] Initialization Success -----------', data.id);
    } catch (e) {
      Logger.info('----------- [%s] Initialization Fail -----------', data.id);
      // 初始化就失败了 这情况太少了 参数传错了应该是
      this.sendErrorMessage(e);
      this.sendExitMessage(9);
      this.closeListenEvent();
      throw e;
    }
  }

  /**
   * 取消执行 进程退出
   * @param status 设置的状态
   */
  public async cancel(status: EXECUTE_STATUS = EXECUTE_STATUS.CANCEL): Promise<void> {
    if (this.result.isStop() !== true) {
      this.setStatus(status);
      this.result.setStop(true);
      const message = `cancel execute, status = ${EXECUTE_STATUS[status]}`;
      this.error.push(message);
      Logger.warn(`[execute] ${message}`);
      await this.afterRun();
      // 等待一次 event loop 后退出
      setImmediate(() => process.exit(127));
    }
  }

  /**
   * 监听相关事件
   */
  private openListenEvent(): void {
    process.addListener('exit', this.onExit);
    this.timer = setTimeout(async () => {
      if (this.status !== EXECUTE_STATUS.DONE) {
        const message = `stopped with execute timeout ${this.timeout}ms`;
        this.error.push(message);
        Logger.warn(`[execute] ${message}`);
        await this.cancel(EXECUTE_STATUS.TIMEOUT);
      }
    }, this.timeout);
    const events = this.data.events !== undefined ? this.data.events : 0;
    if ((EXECUTE_EVENTS.PROGRESS & (events >>> 0)) !== 0) {
      this.result.on('update', this.onProgress);
    }
    // hook stdout/stderr
    const stdout = (EXECUTE_EVENTS.STDOUT & (events >>> 0)) !== 0;
    const printStdout = (EXECUTE_EVENTS.PRINT_STDOUT & (events >>> 0)) !== 0;
    process.stdout.write = (buffer: string | Uint8Array): boolean => {
      if (stdout) this.emit('stdout', buffer);
      if (isDeveloper || printStdout || opts.logLevel === 'debug') stdoutWrite(buffer);
      return true;
    };
    const stderr = (EXECUTE_EVENTS.STDERR & (events >>> 0)) !== 0;
    const printStderr = (EXECUTE_EVENTS.PRINT_STDERR & (events >>> 0)) !== 0;
    process.stderr.write = (buffer: string | Uint8Array): boolean => {
      if (stderr) this.emit('stderr', buffer);
      if (isDeveloper || printStderr || opts.logLevel === 'debug') stderrWrite(buffer);
      return true;
    };
  }

  /**
   * 用例执行完释放监听
   */
  private closeListenEvent(): void {
    this.result.removeAllListeners();
    process.removeListener('exit', this.onExit);
    // process.stdout.write = () => true;
    // process.stderr.write = () => true;
    process.stdout.write = stdoutWrite;
    process.stderr.write = stderrWrite;
    if (this.timer) {
      clearTimeout(this.timer);
    }
  }

  /**
   * HOOK exit
   * @see https://nodejs.org/api/process.html#process_exit_codes
   */
  private onExit = (code: number): void => {
    this.setStatus(EXECUTE_STATUS.EXIT);
    this.sendExitMessage(code);
  };

  /**
   * 发送状态信息
   */
  private onProgress = (): void => {
    const data = this.getStatusResult();
    // Logger.debug('[execute] Current progress %d%', (data.progress * 100).toFixed(2));
    this.emit('progress', data);
  };

  /**
   * 发送错误信息
   * @param e
   */
  private sendErrorMessage(e: Error): void {
    this.emit('error', e);
    Logger.error(`[execute] ${e.message}`);
    Logger.debug(`[execute] ${e.stack}`);
  }

  /**
   * 发送错误信息
   * @param code
   */
  private sendExitMessage(code: number): void {
    this.emit('exit', code);
  }

  /**
   * Create Cookie Manage
   * @returns {CookieManager}
   */
  private createCookieManager(): CookieManager {
    const store = new MemoryCookieStore();
    const cookieJar = new CookieJar(store);
    const cookieManage: CookieManager = {
      store,
      cookieJar,
      getAllCookies: () => new Promise((resolve) => {
        this.context.cookie.store.getAllCookies((err, cookies) => {
          if (!err) {
            resolve(cookies.map((cookie) => cookie.toJSON()));
          } else {
            resolve([]);
          }
        });
      }),
    };
    return cookieManage;
  }

  /**
   * 获取当前全局步骤ID计数器
   * @returns globalStepId
   */
  public getGlobalIndex(): number {
    return this.globalIndex;
  }

  /**
   * 对交互用例的内容输入
   * @param {InputInteract} data
   */
  public interact(data: InputInteract): void {
    this.context.event.emit('interact', data);
  }

  /**
   * 设置状态
   * @param status
   */
  public setStatus(status: EXECUTE_STATUS, e?: Error): void {
    this.status = status;
    if (e) {
      this.error.push(e.message);
      this.sendErrorMessage(e);
    }
    this.emit('status', status);
  }

  /**
   * 获取状态
   * @returns {ExecuteStatus}
   */
  public getStatusResult(): ExecuteStatus {
    const result = this.result.getResult();
    const total = this.result.getSize();
    const statusCount = this.result.getStatusCount();

    const isDataSet = this.context.dataSetCountValue.isDataSet || this.context.dataSetCountValue.isCaseDataSet;
    const doneTotal = this.context.dataSetCountValue.dataSetSuccessCount + this.context.dataSetCountValue.caseDataSetSuccessCount;
    const errorTotal = this.context.dataSetCountValue.dataSetFailCount + this.context.dataSetCountValue.caseDataSetFailCount;
    const skipTotal = this.context.dataSetCountValue.dataSetSkipCount + this.context.dataSetCountValue.caseDataSetSkipCount;
    const allTotal = this.context.dataSetCountValue.dataSetTotal + this.context.dataSetCountValue.selectCaseDataSetTotal;
    if (isDataSet) {
      statusCount[CONTROLLER_STATUS.DONE] = doneTotal;
      statusCount[CONTROLLER_STATUS.ERROR] = errorTotal;
      statusCount[CONTROLLER_STATUS.SKIP] = skipTotal;
    }

    const ret: ExecuteStatus = {
      name: this.data.name,
      id: this.data.id,
      env: this.context.env.name,
      status: this.status,
      progress: isDataSet ? ((doneTotal + errorTotal + skipTotal) / allTotal) : (1 - (
        (
          statusCount[CONTROLLER_STATUS.WAIT]
          + statusCount[CONTROLLER_STATUS.INTERACT]
          + statusCount[CONTROLLER_STATUS.RUNNING]
        ) / total
      )),
      startTime: this.startTime,
      endTime: this.endTime,
      statusCount,
      totalCount: isDataSet ? allTotal : total,
      steps: result,
      error: this.error,
    };
    return ret;
  }

  /**
   * 获取最终结果
   * @returns {Promise<Buffer>}
   * @notice Protocol一共32字节长度(256) 如下组成 内容均为UTF-8
   * @param TAG 特殊标记(24) 1100 0110 1001 0110 0011 1111
   * @param ProtocolVersion 协议版本(8) 目前 = 1
   * @param EngineVersion 引擎版本(32) BuildId
   * @param Status 最终状态(8) EXECUTE_STATUS
   * @param Progress 进度(8) 这个值 / 0xff就是进度，精度不高，但够用
   * @param StartTime 开始时间(40) 5字节时间格式 需要算一下
   * @param EndTime 结束时间(40) 5字节时间格式 需要算一下
   * @param Options 选项(32) options [or] 现在不用判断 固定都是 1 << 0
   *                1 << 0 是否压缩
   * @param IDXSize 索引长度(32) 索引长度 Brotli之后的长度
   * @param HeaderSize 头部长度(32) 头部长度 / 4 就是步骤总数量
   * @param Data 数据Brotli(IDX)+Brotli(Header+Detail)
   * IDX就是前端那棵树，读出后自行JSON序列化即可
   * 1、由Protocol+IDXSize(Brotli)可算出Brotli(Header+Detail)数据偏移量
   * 2、由HeaderSize可算出Brotli(Header+Detail)中结果偏移量。
   * 3、每个Header块是4字节，内容为对应块的 步骤detail 长度，顺序排序。
   * 4、每个detail顺序排列，根据上面的Header给定长度来解析即可。
   * 5、detail的偏移量需要自己算。例如获取第5个步骤需要将1234步骤的长度相加作为偏移量在取到第5个步骤长度。
   *  0                   1                   2                   3
   *  0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
   * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
   * |                   TAG IGNORE                  |    Version    |
   * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
   * |                        Engine Version                         |
   * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
   * |     Status    |   Progress    |           StartTime           |
   * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
   * |                   StartTime                   |    EndTime    |
   * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
   * |                            EndTime                            |
   * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
   * |                            Options                            |
   * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
   * |                        IDXSize(Brotli)                        |
   * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
   * |                          Header Size                          |
   * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
   * |               Brotli(IDX)+Brotli(Header+Detail)               |
   * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
   */

  private changedVars: any = undefined;
  public async build(): Promise<Buffer> {
    const now = performance.now();
    try {
      // console.time('time');
      const result: ExecuteResult = {
        ...this.getStatusResult(),
        variable: {
          [VARIABLE_TYPE.ENV]: this.context.env.variable?.[this.libraryId] ?? { } as any,
          [VARIABLE_TYPE.EXECUTE]: this.context.variable.getVariables(VARIABLE_TYPE.EXECUTE),
        },
      };
      let varsObj: any = { };
      Object.entries(result.variable ?? { }).forEach(([key, value]) => {
        varsObj = { ...varsObj, ...value };
      });
      const oldVarsObj = Object.fromEntries((this.data.envVariableConfigs ?? []).map((item) => [item.varName, item.variableId]));
      let lastVarObj: any = { };
      Object.entries(varsObj).forEach(([key, value]) => {
        if (oldVarsObj[key]) {
          lastVarObj[oldVarsObj[key]] = value;
        }
      });
      // console.log(2222, varsObj, oldVarsObj, lastVarObj);
      // (result as any).envVariableValue = lastVarObj;

      const kUndefined = Symbol('kUndefined');
      Object.entries(lastVarObj).forEach(([key, value]) => {
        if (value === kUndefined) {
          lastVarObj[key] = undefined;
        }
      });
      lastVarObj = JSON.parse(JSON.stringify(lastVarObj));

      this.changedVars = Object.keys(lastVarObj).length > 0 ? lastVarObj : undefined;
      // console.log('VARS');
      // console.log('variable', this.context.env.variable);
      // console.log('libraryId', (this.data as any).libraryId);
      // console.log('envVariableConfigs', this.data.envVariableConfigs);
      // console.log('needUpdate', this.changedVars);
      const protocol = Buffer.allocUnsafe(4 * 8);
      const detail = this.result.getDetail();
      detail.forEach((item: any) => {
        if (item.fields) {
          const stepId = item.stepId;
          const target: any = result.steps.find((step) => step.stepId === stepId);
          if (target) {
            target.sourceDataResponse = item;
            target.fields = item.fields;
            target.rows = item.rows;
            target.selectIndexList = item.selectIndexList;
          }
        }
      });
      const idx = Buffer.from(JSON.stringify(result));
      protocol.writeUIntBE(0xC6963F, 0, 3); // 1100 0110 1001 0110 0011 1111
      protocol.writeUIntBE(1, 3, 1); // 协议版本
      protocol.writeUIntBE(ENGINE_VERSION_UINT, 4, 4); // 引擎版本
      protocol.writeUIntBE(result.status, 8, 1); // 状态
      protocol.writeUIntBE(result.progress * 0xff >>> 0, 9, 1); // 进度
      protocol.writeUIntBE(encodeDateTime(result.startTime), 10, 5); // 开始时间
      protocol.writeUIntBE(encodeDateTime(result.endTime), 15, 5); // 开始时间
      protocol.writeUIntBE(1 << 0, 20, 4); // 选项
      protocol.writeUIntBE(detail.length * 4, 28, 4); // 头部长度
      const headers = Buffer.allocUnsafe(detail.length * 4);
      const data: Buffer[] = [headers];
      // 其实都是CPU密集型 加不加 Promise all 区别不大
      for (let index = 0; index < detail.length; index++) {
        const content = detail[index];
        if (content) {
          try {
            const ret = await transform(content);
            // Buffer.from 其实很慢 没办法
            // 如果改用 Google protobufjs 会有性能大福提升
            const dat = Buffer.from(JSON.stringify(ret));
            data[index + 1] = dat;
            headers.writeUIntBE(dat.length, index * 4, 4);
          } catch (e) {
            const message = `record lost, over size 512MB or circular dependency. ${e.message}`;
            data[index + 1] = Buffer.from(message);
            headers.writeUIntBE(message.length, index * 4, 4);
            Logger.warn(`[execute] [${index}] ${message}'`);
            Logger.warn(`[execute] ${e.message}`);
            Logger.debug(`[execute] ${e.stack}`);
          }
        } else {
          data[index + 1] = Buffer.alloc(0);
          headers.writeUIntBE(0, index * 4, 4);
        }
      }

      const [brotliData, brotliIdx] = await Promise.all([
        encodeBrotli(Buffer.concat(data)),
        encodeBrotli(idx),
      ]);
      protocol.writeUIntBE(brotliIdx.length, 24, 4); // IDXSize(Brotli)

      const full = Buffer.concat([protocol, brotliIdx, brotliData]);

      // SharedArrayBuffer
      // const length = protocol.length + brotliIdx.length + brotliData.length;
      // const full = new Uint8Array(new SharedArrayBuffer(length));

      // full.set(protocol, 0);
      // full.set(brotliIdx, protocol.length);
      // full.set(brotliData, protocol.length + brotliIdx.length);
      // console.log(full.length);
      // require('fs').writeFileSync('test.txt', full);
      Logger.info(`[execute] build cost ${(performance.now() - now).toFixed(2)}ms, length = ${detail.length}, size = ${full.length}`);
      // console.log(full.toString('base64'));
      return full;
    } catch (e) {
      Logger.error(`[execute] ${e.message}`);
      Logger.debug(`[execute] ${e.stack}`);
      return Buffer.from(e.message);
    }
  }

  /**
   * 获取详细记录
   * @param id
   */
  public getDetailById<T extends DetailResult>(id: number): T {
    return this.result.getDetailById(id);
  }

  /**
   * 获取某条记录
   * @param id
   * @returns {T}
   */
  public getIndexById<T extends Result>(id: string | number): T {
    return this.result.getIndexById(id);
  }

  /**
   * 下载需要的HTTP文件
   * @return {Promise<void>}
   */
  private async beforeRun(): Promise<void> {
    const now = performance.now();
    this.setStatus(EXECUTE_STATUS.RUNNING);
    this.startTime = new Date().getTime();
    /** manually trigger once */
    this.result.emitUpdate(true);
    try {
      if (this.context.env.dataSource) {
        for (let index = 0; index < this.context.env.dataSource.length; index++) {
          const item = this.context.env.dataSource[index];
          const func = BEFORE_DATASOURCE_EXECUTE[item.type];
          if (func) {
            await func.call(null, item);
          }
        }
      }
      const loop = async (steps: ControllerData[] | ControllerData[][]): Promise<void> => {
        for (let index = 0; index < steps.length; index++) {
          const step = steps[index];
          if (Array.isArray(step)) {
            await loop(step);
          } else {
            const func = BEFORE_EXECUTE[step.type];
            if (func) {
              await func.call(null, step, this.context);
            }
            if ('steps' in step) {
              await loop(step.steps);
            }
          }
        }
      };
      await loop(this.data.steps);
    } catch (e) {
      this.setStatus(EXECUTE_STATUS.ERROR, e);
    }
    Logger.info(`[execute] before run ${(performance.now() - now).toFixed(2)}ms`);
  }

  /**
   * 步骤执行 async
   * @return {Promise<void>}
   */
  public async run(): Promise<void> {
    await this.beforeRun();
    const now = performance.now();
    if (this.data.steps.length > 0) {
      const events = this.data.events || 0;
      const ignoreExecuteError = (EXECUTE_EVENTS.IGNORE_EXECUTE_ERROR & (events >>> 0)) !== 0;
      let bypass = this.error.length !== 0;
      let error = false;
      if (ignoreExecuteError) {
        Logger.warn('[execute] ignore execute error flag is true');
      }
      try {
        for (let index = 0; index < this.data.steps.length; index++) {
          this.context.isLast = (index === this.data.steps.length - 1);
          const step = this.data.steps[index];
          const instance = await execute(step, this.context, { index, bypass });
          if (instance.hasError()) {

            if (
              step.type !== CONTROLLER_TYPE.DATASET &&
              step.type !== CONTROLLER_TYPE.DATASET_CASE
            ) this.context.dataSetCountValue.currentHasError = true;

            error = true;
            if (!ignoreExecuteError) {
              bypass = true;
              if (index + 1 !== this.data.steps.length) {
                Logger.warn('[execute] bypass execute index %d..%d', index + 1, this.data.steps.length);
              }
            }
          }
        }
        this.setStatus(error ? EXECUTE_STATUS.ERROR : EXECUTE_STATUS.DONE);
      } catch (e) {
        this.setStatus(EXECUTE_STATUS.ERROR, e);
      }
    } else {
      this.setStatus(EXECUTE_STATUS.SKIP);
      Logger.warn('[execute] steps=0, skip');
    }
    Logger.info(`[execute] run cost ${(performance.now() - now).toFixed(2)}ms`);
    // // debug
    // console.log(this.result.getIndexById('0'));
    // console.log(this.result.getDetailById(0));
    // console.log(this.result);

    await this.afterRun();
  }

  private async afterRun(): Promise<void> {
    this.endTime = new Date().getTime();
    /** manually trigger once */
    this.result.emitUpdate(true);
    try {
      this.free();
      const result = await this.build();
      const statusResult = this.getStatusResult();
      Logger.info('----------- [%s] End -----------', this.id);
      if (this.result.isStop() === true) {
        this.emit('cancel', {
          result,
          startTime: statusResult.startTime,
          endTime: statusResult.endTime,
          dataSetCountValue: this.context.dataSetCountValue,
        });
      } else {
        this.emit('done', {
          result,
          startTime: statusResult.startTime,
          endTime: statusResult.endTime,
          envVariableValue: this.changedVars,
          dataSetCountValue: this.context.dataSetCountValue,
        } as any);
      }
    } catch (e) {
      Logger.error(`[execute] ${e.message}`);
      Logger.debug(`[execute] ${e.stack}`);
      this.setStatus(EXECUTE_STATUS.ERROR, e);
    }
    this.closeListenEvent();
    this.emit('close');
  }

  /**
   * free resource
   * @return {void}
   */
  private free(): void {
    try {
      Object.keys(this.context.files).forEach((key) => {
        delete this.context.files[key];
      });
      // 不在意同步 调用了即可
      this.context.cookie.cookieJar.removeAllCookies();
      // 释放浏览器会话
      if (this.context.browser) {
        if (this.context.browser instanceof Promise) {
          this.context.browser.then((browser) => {
            browser.deleteSession();
          });
        } else {
          this.context.browser.deleteSession();
        }
      }
    } catch (e) {
      Logger.error(`[execute] ${e.message}`);
      Logger.debug(`[execute] ${e.stack}`);
    }
  }
}

export default Execute;
