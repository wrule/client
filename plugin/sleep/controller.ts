/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { performance } from 'node:perf_hooks';
import { SleepControllerData } from '@plugin/sleep/types/data';
import { SleepResult, SleepExtraResult } from '@plugin/sleep/types/result';
import SingleController from '@engine/core/single';
import { PreContext, PostContext } from '@engine/core/types/vm';
import { BaseResult } from '@engine/core/types/result';
import { CONTROLLER_TYPE } from '@engine/core/enum';
import { sleep } from '@engine/utils';
import { ExecuteError } from '@engine/core/error';

/**
 * Sleep 步骤
 * @author William Chan <root@williamchan.me>
 */
export default class SleepController extends SingleController<SleepControllerData> {
  private sleep!: number;

  /**
   * @inheritdoc
   */
  protected async beforeExecute(): Promise<boolean> {
    const sleepTime = this.variable.replace(this.data.sleep);
    if (!Number.isNaN(Number(sleepTime))) {
      this.sleep = Number(sleepTime);
    } else {
      throw new ExecuteError(`${sleepTime} not a number `);
    }
    return true;
  }

  /**
   * create pre script context & method
   */
  protected createPreVMContext(): PreContext {
    return { pre: {} };
  }

  /**
   * create post script context & method
   * @returns
   */
  protected createPostVMContext(): PostContext {
    return { post: {} };
  }

  /**
   * @inheritdoc
   */
  protected async execute(): Promise<boolean> {
    const now = performance.now();
    this.log('info', 'sleep %dms', this.sleep);
    while (performance.now() < now + this.sleep) {
      await sleep(100);
    }
    return true;
  }

  //  -------------------------------- 结果相关 --------------------------------

  /**
   * @inheritdoc
   */
  public async getExtraResult(): Promise<SleepExtraResult> {
    return {
      sleep: this.sleep,
    };
  }

  /**
   * Create Init Result
   * @param base
   * @param data
   * @returns {SleepResult}
   */
  public static createInitResult(base: BaseResult, data: SleepControllerData): SleepResult {
    const result: SleepResult = {
      ...base,
      type: CONTROLLER_TYPE.SLEEP,
      extra: {
        sleep: data.sleep,
      },
    };
    return result;
  }
}
