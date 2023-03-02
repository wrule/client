/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import CombinationController from '@engine/core/combination';
import { ComponentControllerData } from '@plugin/component/types/data';
import { ComponentExtraResult, ComponentResult, ComponentControllerResultParams, ComponentControllerResultReturns, ComponentDetailResult } from '@plugin/component/types/result';
import logger from '@engine/logger';
import { CombinationError } from '@engine/core/error';
import { CONTROLLER_TYPE, CONTROLLER_STATUS } from '@engine/core/enum';
import VariableManager, { VARIABLE_TYPE, REPLACE_MODE } from '@engine/variable';
import { BaseResult } from '@engine/core/types/result';
import { encodeContentType } from '@engine/utils/serialize/type';

interface Result {
  params?: ComponentControllerResultParams[];
  returns?: ComponentControllerResultReturns[];
}

/**
 * 元件步骤 Component Controller
 * @author William Chan <root@williamchan.me>
 */
export default class ComponentController extends CombinationController<ComponentControllerData> {
  private internalVariable!: VariableManager;
  /** @notice 结构适用于 ComponentExtraResult */

  private result: Result = {};

  /**
   * @inheritdoc
   */
  protected async beforeExecute(): Promise<boolean> {
    if (this.data.steps.length > 0) {
      /**
       * 开辟新变量寄存管理
       * @notice 元件内只共享 global execute 级别的变量，和现有逻辑不同
       */
      this.internalVariable = new VariableManager(this.context.variable, [
        VARIABLE_TYPE.ENV,
        VARIABLE_TYPE.EXECUTE,
      ]);
      // 根据入参，设置值
      const params = this.data.params;
      if (params) {
        const resultParams: ComponentControllerResultParams[] = [];
        params.forEach((item) => {
          const key = item.key;
          const value = this.variable.replace(item.value, REPLACE_MODE.AUTO);
          this.internalVariable.set(key, value);
          resultParams.push({ key, value });
        });
        this.result.params = resultParams;
      }
    }
    return true;
  }

  /**
   * @inheritdoc
   */
  protected async execute(): Promise<boolean> {
    if (this.data.steps.length > 0) {
      let error = -1;
      for (let index = 0; index < this.data.steps.length; index++) {
        const step = this.data.steps[index];
        const instance = await this.executeChildController(
          step,
          index,
          {
            context: { variable: this.internalVariable },
            config: { bypass: error !== -1 },
          },
        );
        if (instance.hasError()) {
          error = index;
        }
      }
      if (error !== -1) {
        throw new CombinationError(error + 1);
      }
    } else {
      this.setStatus(CONTROLLER_STATUS.SKIP);
      logger.warn('[COMPONENT] steps=0, skip');
    }
    return true;
  }

  /**
   * 标记所有步骤为跳过
   */
  public async skip(): Promise<boolean> {
    for (let index = 0; index < this.data.steps.length; index++) {
      const step = this.data.steps[index];
      await this.executeChildController(step, index, { config: { skip: true } });
    }
    return true;
  }

  /**
   * @inheritdoc
   */
  protected async afterExecute(): Promise<boolean> {
    // 将出参设置回去
    if (this.data.returns && this.data.steps.length > 0 && this.internalVariable) {
      const returns = this.data.returns;
      if (returns.length) {
        const resultReturns: ComponentControllerResultReturns[] = [];
        returns.forEach((item) => {
          /** @var key = internal variable name */
          const key = item.key;
          const value = this.internalVariable.get(key);
          /** @var name = public variable name */
          const name = item.name;
          // 明确设置回原有的上下文
          this.context.variable.set(name, value);
          resultReturns.push({
            key,
            value: encodeContentType(value),
            name,
          });
          this.result.returns = resultReturns;
        });
      }
    }
    return true;
  }

  //  -------------------------------- 结果相关 --------------------------------

  /**
   * @inheritdoc
   */
  public async getExtraResult(): Promise<ComponentExtraResult> {
    return {
      params: this.data.params,
      returns: this.data.returns,
    };
  }

  /**
   * @inheritdoc
   */
  public async getDetailResult(): Promise<ComponentDetailResult> {
    return {
      params: this.result.params,
      returns: this.result.returns,
    };
  }

  /**
   * 获取执行时间
   * @returns {number} totalTime
   */
  public calcTotalTime(): number {
    const result = this.getResult<ComponentResult>();
    return result.steps.reduce((total, item) => item.totalTime + total, 0);
  }

  /**
   * Create Init Result
   * @param base
   * @param data
   * @returns {ComponentResult}
   */
  public static createInitResult(base: BaseResult, data: ComponentControllerData): ComponentResult {
    const result: ComponentResult = {
      ...base,
      type: CONTROLLER_TYPE.COMPONENT,
      extra: {
        params: data.params,
        returns: data.returns,
        config: data.config,
      },
      steps: [],
    };
    return result;
  }
}
