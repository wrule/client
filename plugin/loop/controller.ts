/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { LoopControllerData } from '@plugin/loop/types/data';
import { LoopExtraResult, LoopResult, LoopDetailResult } from '@plugin/loop/types/result';
import { CONFIG } from '@engine/config';
import CombinationController, { ChildControllerConfig } from '@engine/core/combination';
import logger from '@engine/logger';
import { CombinationError, ExecuteError } from '@engine/core/error';
import { CONTROLLER_TYPE, CONTROLLER_STATUS } from '@engine/core/enum';
import { BaseResult } from '@engine/core/types/result';
import { Context, ControllerExtraConfig } from '@engine/core/execute';
import VariableManager, { REPLACE_MODE, VARIABLE_TYPE } from '@engine/variable';
import { isObject } from '@engine/utils/index';

interface Result {
  count: number;
  result: boolean[];
  data: any[];
}

interface ControllerLoopConfig {
  ignoreError: boolean;
  indexVar: string;
  async: boolean;
}

/**
 * 循环（Loop）
 * @author William Chan <root@williamchan.me>
 */
export default class LoopController extends CombinationController<LoopControllerData> {
  private result: Result = {
    count: -1,
    result: [],
    data: [],
  };

  private readonly config!: ControllerLoopConfig;

  /**
   * @inheritdoc
   */
  public constructor(data: LoopControllerData, context: Context, extra?: ControllerExtraConfig) {
    super(data, context, extra);
    const config = this.data.config || {};
    this.config = {
      ignoreError: config.ignoreError === undefined ? false : config.ignoreError,
      indexVar: config.indexVar ? config.indexVar : '_index',
      async: config.async === undefined ? false : config.async,
    };
  }

  /**
   * Create Internal Variable
   * @returns {VariableManager}
   */
  private createInternalVariable(): VariableManager {
    const internalVariable = new VariableManager(this.variable, [
      VARIABLE_TYPE.ENV,
      VARIABLE_TYPE.EXECUTE,
      VARIABLE_TYPE.CONTEXT,
    ]);
    return internalVariable;
  }

  /**
   * 步骤执行
   * @param group
   * @param async
   * @returns Promise<boolean>
   */
  private async exec(group: number, async?: boolean): Promise<boolean> {
    let success = true;
    let internalVariable;
    if (async === true) {
      internalVariable = this.createInternalVariable();
    }
    for (let index = 0; index < this.data.steps.length; index++) {
      const step = this.data.steps[index];
      // 如果有赋予循环数据 拆成变量丢给子步骤
      const data = this.result.data[group];
      const variable = data && isObject(data) ? data : {};
      const config: ChildControllerConfig = {
        config: { group, bypass: success === false },
        variable: { [this.config.indexVar]: group, ...variable },
      };
      if (internalVariable) {
        config.context = { variable: internalVariable };
      }
      const instance = await this.executeChildController(step, index, config);
      if (instance.hasError()) {
        success = false;
      }
    }
    return success;
  }

  /**
   * 异步执行
   */
  private async asyncExecute(): Promise<boolean[]> {
    const MAX_ASYNC_EXEC_GROUP = CONFIG.MAX_ASYNC_EXEC_GROUP;
    const result: boolean[] = [];
    for (let pg = 0; pg < Math.ceil(this.result.count / MAX_ASYNC_EXEC_GROUP); pg++) {
      const promise: Promise<boolean>[] = [];
      for (
        let group = pg * MAX_ASYNC_EXEC_GROUP;
        group < Math.min((pg + 1) * MAX_ASYNC_EXEC_GROUP, this.result.count);
        group++
      ) {
        promise.push(this.exec(group, true));
      }
      const res = await Promise.all(promise);
      result.push(...res);
    }
    return result;
  }

  /**
   * @inheritdoc
   */
  protected async execute(): Promise<boolean> {
    if (this.data.data?.length) {
      this.result.count = this.data.data.length;
      this.result.data = this.data.data;
    } else {
      const count = typeof this.data.count === 'string' ? this.variable.replace(this.data.count, REPLACE_MODE.AUTO) : this.data.count;

      if (Array.isArray(count)) {
        this.result.count = count.length;
        this.result.data = count;
      } else {
        if (count === '' || count === null) {
          throw new ExecuteError('loop count is not a number');
        }
        this.result.count = Number(count);
      }
    }
    if (Number.isNaN(this.result.count)) {
      throw new ExecuteError('loop count is not a number');
    }
    if (this.result.count < 0) {
      throw new ExecuteError('loop count Cannot be negative');
    }
    if (this.data.steps.length > 0 && this.result.count > 0) {
      if (this.config.async) {
        this.result.result = await this.asyncExecute();
      } else {
        /** @todo 次数限制 */
        // group = loop index, index = step index
        for (let group = 0; group < this.result.count; group++) {
          const success = await this.exec(group);
          this.result.result.push(success);
          // not create record
          if (!this.config.ignoreError && success === false) {
            break;
          }
        }
      }
      if (this.result.result.some((item) => item === false)) {
        const group: number[] = [];
        this.result.result.forEach((item, index) => {
          if (item === false) group.push(index + 1);
        });
        throw new CombinationError(group);
      }
    } else {
      this.setStatus(CONTROLLER_STATUS.SKIP);
      logger.warn('[LOOP] count or steps = 0, skip');
    }
    return true;
  }

  //  -------------------------------- 结果相关 --------------------------------

  /**
   * @inheritdoc
   */
  public async getDetailResult(): Promise<LoopDetailResult> {
    return {
      data: this.result.data,
    };
  }

  /**
   * @inheritdoc
   */
  public async getExtraResult(): Promise<LoopExtraResult> {
    return {
      // eslint-disable-next-line no-nested-ternary
      count: this.result.count !== -1 ? this.result.count : (this.data.count || 0),
      result: this.result.result,
      config: this.config,
    };
  }

  /**
   * 获取执行时间
   * @returns {number} totalTime
   */
  public calcTotalTime(): number {
    const result = this.getResult<LoopResult>();
    // if (this.config.async) {
    //   return result.steps.reduce((total, item) => {
    //     const num = item.reduce((n, s) => n + s.totalTime, 0);
    //     return Math.max(num, total);
    //   }, 0);
    // }
    if (this.config.async) {
      let total = 0;
      for (let group = 0; group < Math.ceil(result.steps.length / CONFIG.MAX_ASYNC_EXEC_GROUP); group++) {
        let ms = 0;
        for (let index = 0 * group; index < Math.min((group + 1 * CONFIG.MAX_ASYNC_EXEC_GROUP), result.steps.length); index++) {
          const num = result.steps[index].reduce((n, s) => n + s.totalTime, 0);
          ms = Math.max(ms, num);
        }
        total += ms;
      }
      return total;
    }
    return result.steps.reduce((total, item) => {
      const num = item.reduce((n, s) => n + s.totalTime, 0);
      return num + total;
    }, 0);
  }

  /**
   * Create Init Result
   * @param base
   * @param data
   * @param createResult
   * @returns {LoopResult}
   */
  public static createInitResult(base: BaseResult, data: LoopControllerData): LoopResult {
    const result: LoopResult = {
      ...base,
      type: CONTROLLER_TYPE.LOOP,
      extra: {
        count: data.data ? data.data.length : (data.count || 0),
        config: data.config,
        result: [],
      },
      steps: [],
    };
    return result;
  }
}
