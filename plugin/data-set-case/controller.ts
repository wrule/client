/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { DataSetExtraResult, DataSetDetailResult, DataSetResult } from '@plugin/data-set-case/types/result';
import { DataSetControllerData } from '@plugin/data-set-case/types/data';
import { createRows, RowsData } from '@plugin/data-set-case/utils';
import CombinationController, { ChildControllerConfig } from '@engine/core/combination';
import logger from '@engine/logger';
import { CombinationError } from '@engine/core/error';
import { CONTROLLER_TYPE, CONTROLLER_STATUS } from '@engine/core/enum';
import { CONFIG } from '@engine/config';
import { BaseResult } from '@engine/core/types/result';
import { Context, ControllerExtraConfig } from '@engine/core/execute';
import VariableManager, { Variable, VARIABLE_TYPE } from '@engine/variable';

interface Result {
  result: (boolean | null)[];
  rows: unknown[][];
}

interface ControllerDataSetConfig {
  ignoreError: boolean;
  maxCount: number;
  indexVar: string;
  async: boolean;
}

/**
 * 数据集 循环（DataSet）
 * @author William Chan <root@williamchan.me>
 */
export default class DataSetController extends CombinationController<DataSetControllerData> {
  private readonly result: Result = {
    result: [],
    rows: [],
  };

  private readonly config!: ControllerDataSetConfig;

  /**
   * @inheritdoc
   */
  public constructor(data: DataSetControllerData, context: Context, extra?: ControllerExtraConfig) {
    super(data, context, extra);
    const config = this.data.config || {};
    this.config = {
      ignoreError: config.ignoreError === undefined ? false : config.ignoreError,
      indexVar: config.indexVar ? config.indexVar : '_index',
      async: config.async === undefined ? false : config.async,
      maxCount: config.maxCount !== undefined ? config.maxCount : CONFIG.DATASET_DEFAULT_MAX_COUNT,
    };
  }

  /**
   * @inheritdoc
   */
  protected async beforeExecute(): Promise<boolean> {
    return true;
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
   * @param group 第几组
   * @param cfg skip = 跳过执行 async = async exec
   */
  private async exec(group: number, cfg: { skip?: boolean; async?: boolean} = {}): Promise<boolean | null> {

    const setResult = async () => {
      try {
        const [extraResult, detailResult] = await Promise.all([
          this.getExtraResult(),
          this.getDetailResult(),
        ]);
        // 引用关系数据会刷新的
        detailResult.interact = this.data.interact;
        (detailResult as any).id = this.data.id;
        this.context.result.setResult(this, detailResult, extraResult);
      } catch (error) { }
    };

    if (group === 0)
      setResult();

    let success: null | boolean = true;
    let internalVariable;
    if (cfg.async === true) {
      internalVariable = this.createInternalVariable();
    }
    for (let index = 0; index < this.data.steps.length; index++) {
      const step = this.data.steps[index];
      const variable: Variable = {};
      this.data.fields.forEach((field, idx) => {
        variable[field.name] = this.result.rows[group][idx];
      });

      const config: ChildControllerConfig = {
        config: { group, bypass: success === false, skip: cfg.skip === true },
        variable: { [this.config.indexVar]: group, ...variable },
      };
      if (internalVariable) {
        config.context = { variable: internalVariable };
      }
      const instance = await this.executeChildController(step, index, config, this.data.type);
      if (cfg.skip) {
        success = null;
      } else if (instance.hasError()) {
        success = false;
      }
    }

    if (cfg.skip) {
      this.context.dataSetCountValue.caseDataSetSkipCount++;
    } else {
      if (success) {
        this.context.dataSetCountValue.caseDataSetSuccessCount++;
      } else {
        this.context.dataSetCountValue.caseDataSetFailCount++;
      }
    }
    this.context.dataSetCountValue.selectCaseDataSetTotalRows++;

    this.result.result[group] = success;

    return success;
  }

  /**
   * 异步执行
   */
  private async asyncExecute(data: RowsData): Promise<(boolean | null)[]> {
    const MAX_ASYNC_EXEC_GROUP = CONFIG.MAX_ASYNC_EXEC_GROUP;
    const result: (boolean | null)[] = [];
    for (let pg = 0; pg < Math.ceil(data.rows.length / MAX_ASYNC_EXEC_GROUP); pg++) {
      const promise: Promise<(boolean | null)>[] = [];
      for (
        let group = pg * MAX_ASYNC_EXEC_GROUP;
        group < Math.min((pg + 1) * MAX_ASYNC_EXEC_GROUP, data.rows.length);
        group++
      ) {
        promise.push(this.exec(group, { skip: data.skip[group], async: true }));
      }
      const res = await Promise.all(promise);
      result.push(...res);
    }
    return result;
  }

  private RowsData!: RowsData;
  private RowsCount = 0;
  private RowsCountTotal = 0;

  public async InitRowsData() {
    if (!this.RowsData) {
      this.RowsData = await createRows(this.data, this.context.env.dataSource, Infinity);
      this.RowsCountTotal = this.RowsData.rows.length;
      const data = this.RowsData;
      const dataAny: any = this.data;
      const selectIndexList: number[] = dataAny.isSelectAll ?
        data.rows.map((_, index) => index) :
        ((dataAny.selectIndexList ?? []) as any[]).filter((index) => index < data.rows.length);
      this.RowsCount = selectIndexList.length;
    }
    return [this.RowsCount, this.RowsCountTotal];
  }

  /**
   * @inheritdoc
   */
  protected async execute(): Promise<boolean> {
    await this.InitRowsData();
    const data = this.RowsData;
    const caseDataSetTotal = data.rows?.length ?? 0;
    const dataAny: any = this.data;
    const selectIndexList: number[] = dataAny.isSelectAll ?
      data.rows.map((_, index) => index) :
      ((dataAny.selectIndexList ?? []) as any[]).filter((index) => index < data.rows.length);
    data.rows = selectIndexList.map((index) => data.rows[index]);
    data.skip = selectIndexList.map((index) => data.skip[index]);
    const count = data.rows.length;
    this.result.rows = data.rows;

    this.context.dataSetCountValue.caseDataSetTotal += caseDataSetTotal;
    this.context.dataSetCountValue.selectCaseDataSetTotal += this.result.rows.length;

    if (this.data.steps.length > 0 && count > 0) {
      if (this.config.async) {
        this.result.result = await this.asyncExecute(data);
      } else {
        // group = DataSet index, index = step index
        for (let group = 0; group < count; group++) {
          const success = await this.exec(group, { skip: data.skip[group] });
          // this.result.result.push(success);
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
      this.context.dataSetCountValue.caseDataSetSkipCount += this.result.rows.length;
      this.setStatus(CONTROLLER_STATUS.SKIP);
      logger.warn('[DATASET] steps=%d, count=%d skip.', this.data.steps.length, count);
    }

    return true;
  }

  /**
   * Post-execution
   * @inheritdoc
   * @returns
   */
  protected async afterExecute(): Promise<boolean> {
    return true;
  }

  //  -------------------------------- 结果相关 --------------------------------

  /**
   * @inheritdoc
   */
  public async getExtraResult(): Promise<DataSetExtraResult> {
    return {
      config: this.config,
      result: this.result.result,
    };
  }

  /**
   * @inheritdoc
   */
  public async getDetailResult(): Promise<DataSetDetailResult> {
    return {
      fields: this.data.fields,
      selectIndexList: (this.data as any).selectIndexList,
      rows: this.result.rows,
    };
  }

  /**
   * @inheritdoc
   */
  public calcTotalTime(): number {
    const result = this.getResult<DataSetResult>();
    // if (this.config.async) {
    //   return result.steps.reduce((total, item) => {
    //     const num = item.reduce((n, s) => n + s.totalTime, 0);
    //     return Math.max(num, total);
    //   }, 0);
    // }
    // return super.getTotalTime();
    if (this.config.async) {
      let total = 0;
      for (let group = 0; group < Math.ceil(result.steps.length / CONFIG.MAX_ASYNC_EXEC_GROUP); group++) {
        let ms = 0;
        for (let index = 0 * group; index < Math.min((group + 1 * CONFIG.MAX_ASYNC_EXEC_GROUP), result.steps.length); index++) {
          const num = result.steps[index].reduce((n, s) => n + s.totalTime, 0);
          ms = Math.max(ms, num);
        }
        // console.log(ms);
        total += ms;
      }
      return total;
    }
    // return super.getTotalTime();
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
   * @returns {DataSetResult}
   */
  public static createInitResult(base: BaseResult, data: DataSetControllerData): DataSetResult {
    const result: DataSetResult = {
      ...base,
      type: CONTROLLER_TYPE.DATASET_CASE,
      extra: {
        config: data.config,
        result: [],
      },
      steps: [],
    };
    return result;
  }
}
