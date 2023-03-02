/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { PollControllerData } from '@plugin/poll/types/data';
import { PollExtraResult, PollResult } from '@plugin/poll/types/result';
import CombinationController from '@engine/core/combination';
import logger from '@engine/logger';
import { CONTROLLER_TYPE, CONTROLLER_STATUS, CONTROLLER_ERROR } from '@engine/core/enum';
import { sleep } from '@engine/utils';
import { BaseResult, Result } from '@engine/core/types/result';
import { ExecuteError } from '@engine/core/error';
import { Context, ControllerExtraConfig } from '@engine/core/execute';

interface ControllerPollConfig {
  indexVar: string;
  breakError: number;
}

/**
 * 轮询（Poll）
 * @author William Chan <root@williamchan.me>
 */
export default class PollController extends CombinationController<PollControllerData> {
  private pollCount = 0;
  private maxCount = 0;
  private pollResult: boolean[] = [];
  private interval!: number;

  private readonly config!: ControllerPollConfig;

  /**
   * @inheritdoc
   */
  public constructor(data: PollControllerData, context: Context, extra?: ControllerExtraConfig) {
    super(data, context, extra);
    const config = this.data.config || {};
    this.config = {
      indexVar: config.indexVar ? config.indexVar : '_index',
      breakError: config.breakError ? config.breakError : CONTROLLER_ERROR.SYSTEM_ERROR,
    };
  }

  /**
   * 递归查询错误
   * @param result
   * @returns {boolean}
   */
  private checkBreakError(result: Result): boolean {
    if ('steps' in result) {
      return result.steps.some((item) => {
        if (Array.isArray(item)) {
          return item.some((s) => this.checkBreakError(s));
        }
        return this.checkBreakError(item);
      });
    }
    if (result.status !== CONTROLLER_STATUS.SKIP && result.status !== CONTROLLER_STATUS.WAIT) {
      const errno = result.error.reduce((n, e) => n | e.error, 0);
      return (this.config.breakError & errno) !== 0;
    }
    return false;
  }

  /**
   * exec
   * @returns {Promise<boolean>}
   */
  protected async execute(): Promise<boolean> {
    this.maxCount = Number(this.variable.replace(this.data.maxCount));
    this.interval = Math.min(5000, this.data.interval);

    if (Number.isNaN(this.maxCount)) {
      throw new ExecuteError('poll count is not a number');
    }
    if (this.maxCount < 0) {
      throw new ExecuteError('poll count Cannot be negative');
    }

    if (this.data.steps.length > 0 && this.maxCount > 0) {
      /** @todo count limit */
      // group = loop index, index = step index
      for (let group = 0; group < this.maxCount; group++) {
        this.pollCount += 1;
        let success = true;
        for (let index = 0; index < this.data.steps.length; index++) {
          const step = this.data.steps[index];
          const instance = await this.executeChildController(step, index, {
            config: { group, bypass: success === false },
            variable: { [this.config.indexVar]: group },
          });
          if (instance.hasError()) {
            success = false;

            const breakError = instance instanceof CombinationController
              ? this.checkBreakError(instance.getResult())
              : (this.config.breakError & instance.errno) !== 0;

            if (breakError) {
              throw new ExecuteError('Polling stopped with an expected error.');
            }
          }
        }
        this.pollResult.push(success);
        if (success === true) {
          break;
        } else if (this.pollCount === this.maxCount) {
          throw new ExecuteError(`Polling exceeds the maximum limit [${this.maxCount}].`);
        } else {
          await sleep(this.interval);
        }
      }
    } else {
      this.setStatus(CONTROLLER_STATUS.SKIP);
      logger.warn('[POOL] count or steps = 0, skip');
    }
    return true;
  }

  //  -------------------------------- 结果相关 --------------------------------

  public async getExtraResult(): Promise<PollExtraResult> {
    return {
      maxCount: this.maxCount,
      count: this.pollCount,
      result: this.pollResult,
      interval: this.interval,
      config: this.config || this.data.config,
    };
  }

  /**
   * 获取执行时间
   * @returns {number} totalTime
   */
  public calcTotalTime(): number {
    const result = this.getResult<PollResult>();
    return result.steps.reduce((total, item) => {
      const num = item.reduce((n, s) => n + s.totalTime, 0);
      return num + total;
    }, 0) + (result.steps.length - 1) * this.data.interval;
  }

  /**
   * Create Init Result
   * @param base
   * @param data
   * @param createResult
   * @returns {PollResult}
   */
  public static createInitResult(base: BaseResult, data: PollControllerData): PollResult {
    const result: PollResult = {
      ...base,
      type: CONTROLLER_TYPE.POLL,
      extra: {
        maxCount: data.maxCount,
        interval: data.interval,
        result: [],
        config: data.config,
      },
      steps: [],
    };
    return result;
  }
}
