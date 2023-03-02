/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { ConditionControllerData } from '@plugin/condition/types/data';
import { ConditionExtraResult, ConditionResult } from '@plugin/condition/types/result';
import VM from '@engine/vm';
import CombinationController from '@engine/core/combination';
import { REPLACE_MODE } from '@engine/variable';
import { CombinationError, ExecuteError } from '@engine/core/error';
import { CONTROLLER_TYPE, CONTROLLER_STATUS } from '@engine/core/enum';
import { BaseResult } from '@engine/core/types/result';

/**
 * 条件（Condition）
 * @author William Chan <root@williamchan.me>
 * @notice 简化使用，仅支持IF和ELSE
 * @example [0] = if [1] = else
 */
export default class ConditionController extends CombinationController<ConditionControllerData> {
  private condition!: string;
  private result: boolean[] = [];

  /**
   * @inheritdoc
   */
  protected async execute(): Promise<boolean> {
    if (
      this.data.steps.length === 0
      || (this.data.steps.length === 1 && this.data.steps[0].length === 0)
      || (this.data.steps.length === 2 && this.data.steps[0].length === 0 && this.data.steps[1].length === 0)
    ) {
      this.setStatus(CONTROLLER_STATUS.SKIP);
      return true;
    }
    if (this.data.steps.length > 2) {
      throw new ExecuteError('Condition configuration error, please check.');
    }

    this.condition = this.variable.replace(this.data.condition, REPLACE_MODE.SYNTAX);
    let error = -1;
    let conditionResult;
    try {
      const data = await VM.spawn(this.condition, {
        context: this.createGlobalVMContext(),
      });
      conditionResult = !!data.return === true ? 0 : 1;
    } catch (e) {
      await this.skip();
      throw new ExecuteError(e);
    }

    for (let group = 0; group < this.data.steps.length; group++) {
      const steps = this.data.steps[group];
      this.result.push(conditionResult === group);
      if (steps && steps.length > 0) {
        for (let index = 0; index < steps.length; index++) {
          const step = steps[index];
          const instance = await this.executeChildController(
            step,
            index,
            {
              config: {
                group,
                skip: group !== conditionResult,
                bypass: group === conditionResult && error !== -1,
              },
            },
          );
          if (instance.hasError()) {
            error = index;
          }
        }
      }
    }
    if (error !== -1) {
      throw new CombinationError(error + 1);
    }
    return true;
  }

  /**
   * 标记所有步骤为跳过
   */
  public async skip(): Promise<boolean> {
    for (let group = 0; group < this.data.steps.length; group++) {
      const steps = this.data.steps[group];
      if (steps && steps.length > 0) {
        for (let index = 0; index < steps.length; index++) {
          const step = steps[index];
          await this.executeChildController(step, index, { config: { group, skip: true } });
        }
      }
    }
    return true;
  }

  //  -------------------------------- 结果相关 --------------------------------

  public async getExtraResult(): Promise<ConditionExtraResult> {
    return {
      condition: this.condition,
      result: this.result,
    };
  }

  /**
   * 获取执行时间
   * @returns {number} totalTime
   */
  public calcTotalTime(): number {
    const result = this.getResult<ConditionResult>();
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
   * @returns {ConditionResult}
   */
  public static createInitResult(base: BaseResult, data: ConditionControllerData): ConditionResult {
    const result: ConditionResult = {
      ...base,
      type: CONTROLLER_TYPE.CONDITION,
      extra: {
        condition: data.condition,
        result: [],
      },
      steps: [],
    };

    return result;
  }
}
