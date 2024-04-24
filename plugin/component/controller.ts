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
       * @description 只继承用例变量以及环境变量，不继承上下文变量，上下文变量由元件自己管理
       */
      this.internalVariable = new VariableManager(this.context.variable, [
        VARIABLE_TYPE.ENV,
        VARIABLE_TYPE.EXECUTE,
      ]);

      // // 元件步骤初始化时，从父级的变量管理器中继承的父步骤的local变量（包含父步骤的结果等，以及如果是数据集的话，包含数据集的数据）
      // const localVariable = this.variable.local;
      // // 将local中的变量设置到元件的内部变量管理器的上下文变量中去，该行为主要为了避免数据集数据在元件中优先级最高的问题
      // Object.keys(localVariable).forEach((key) => {
      //   this.internalVariable.set(key, localVariable[key]);
      // });

      // 将元件入参设置为元件上下文变量，这里若有和以上步骤中local重名的变量，将会覆盖它
      // 根据入参，设置值
      const params = this.data.params;

      if (params) {
        const resultParams: ComponentControllerResultParams[] = [];
        params.forEach((item) => {
          const key = item.key;
          const value = this.variable.replace(item.value, REPLACE_MODE.AUTO);
          // 设置元件上下文变量
          this.internalVariable.set(key, value);
          this.variable.set(key, value);
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
