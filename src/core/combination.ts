/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */

import { CombinationControllerData, ControllerData } from '@/core/types/data';
import { execute, Context, ExecuteConfigData } from '@/core/execute';
import { Variable } from '@/variable';
import BaseController from '@/core//base';
import { SystemError } from '@/core/error';
import { ControllerInstance } from '@/core/execute/types';

interface ConfigPart {
  readonly group?: number;
  readonly skip?: boolean;
  readonly bypass?: boolean;
}

export interface ChildControllerConfig {
  /** @notice merge Space Variable */
  variable?: Variable;
  /** @notice merge Context */
  context?: {
    [P in keyof Context]?: Context[P];
  };
  /** @notice merge ExecuteConfigData */
  config?: ConfigPart;
}

/**
 * abstract combination step
 * @author William Chan <root@williamchan.me>
 */
export default abstract class CombinationController<T extends CombinationControllerData> extends BaseController<T> {
  public isCombination = true;

  /**
   * @inheritdoc
   */
  protected async beforeExecute(): Promise<boolean> {
    return true;
  }

  /**
   * @inheritdoc
   */
  protected async afterExecute(): Promise<boolean> {
    return true;
  }

  /**
   * combination step run
   * @process
   * before exec
   *  -> exec -> after exec
   */
  public async action(): Promise<void> {
    this.log('info', 'combination begin');
    // --------------- pre exec ---------------
    try {
      await this.beforeExecute();
    } catch (e) {
      this.setError(new SystemError(e));
    }
    // --------------- exec ---------------
    if (!this.hasError()) {
      try {
        await this.execute();
      } catch (e) {
        this.setError(e);
      }
    }
    // --------------- post exec ---------------
    try {
      await this.afterExecute();
    } catch (e) {
      this.setError(new SystemError(e));
    }
  }

  /**
   * Child Controller Execute
   * @param data
   * @param index
   * @param merge
   * @returns {Promise<BaseController<ControllerData>>}
   */
  protected async executeChildController(
    data: ControllerData,
    index: number,
    merge: ChildControllerConfig,
  ): Promise<ControllerInstance> {
    const localVariable = this.variable.local;
    // 子步骤独享变量
    const variable: Variable = merge.variable ? { ...localVariable, ...merge.variable } : localVariable;
    // 子步骤环境
    const context: Context = merge.context ? { ...this.context, ...merge.context } : this.context;
    // 子步骤配置
    const configPart: ConfigPart = merge.config ? merge.config : {};
    // be careful of the priority
    const config: ExecuteConfigData = {
      ...configPart,
      id: this.id,
      deep: this.deep + 1,
      index,
      variable,
    };
    const instance = await execute(data, context, config);
    return instance;
  }
}
