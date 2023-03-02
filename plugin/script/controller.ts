/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { ScriptControllerData } from '@plugin/script/types/data';
import { ScriptDetailResult, ScriptResult } from '@plugin/script/types/result';
import { executeScript, ProcessScript } from '@engine/core/script';
import { ExecuteError } from '@engine/core/error';
import SingleController from '@engine/core/single';
import { PreContext, PostContext } from '@engine/core/types/vm';
import { BaseResult } from '@engine/core/types/result';
import { CONTROLLER_TYPE } from '@engine/core/enum';

/**
 * Script 步骤
 * @author William Chan <root@williamchan.me>
 */
export default class ScriptController extends SingleController<ScriptControllerData> {
  private result!: ScriptDetailResult;

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
    this.result = {
      script: this.data.script,
    };
    try {
      const processScript: ProcessScript = {
        type: -1,
        script: this.data.script,
        timeout: this.data.config?.timeout,
        include: this.data.include,
      };

      const result = (await executeScript([processScript], {
        commonScript: this.context.env.script,
        context: this.createGlobalVMContext(),
      }))[0];

      this.result.logs = result.logs;
      this.result.error = result.error;
      this.totalTime = result.totalTime;

      if (result.error) {
        throw new ExecuteError(result.error);
      }
    } catch (e) {
      if (e instanceof ExecuteError) {
        throw e;
      }
      throw new ExecuteError(e);
    }
    return true;
  }

  //  -------------------------------- 结果相关 --------------------------------

  /**
   * @inheritdoc
   */
  public async getDetailResult(): Promise<ScriptDetailResult> {
    const base = await super.getDetailResult();
    return {
      ...base,
      ...this.result,
    };
  }

  /**
   * Create Init Result
   * @param base
   * @param data
   * @returns {ScriptResult}
   */
  public static createInitResult(base: BaseResult, data: ScriptControllerData): ScriptResult {
    const result: ScriptResult = {
      ...base,
      type: CONTROLLER_TYPE.SCRIPT,
      extra: {},
    };
    return result;
  }
}
