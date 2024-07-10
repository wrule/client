/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import BaseController from '@/core/base';
import { ControllerData } from '@/core/types/data';
import UnknownController from '@/core/other/unknown';
import { CONTROLLER_STATUS, CONTROLLER_TYPE, DATA_SOURCE_TYPE } from '@/core/enum';
import {
  Context, ExecuteConfigData, ControllerExtraConfig,
  ControllerStatic,
  ControllerInstance,
  BeforeExecuteFunction,
  BeforeDataSourceExecuteFunction,
  DataSourceExecute,
  DataSourcePool,
} from '@/core/execute/types';
import { createRows } from '@plugin/data-set-case/utils';

export const CONTROLLER: Record<string, ControllerStatic> = {};
export const BEFORE_EXECUTE: Record<string, BeforeExecuteFunction> = {};
export const BEFORE_DATASOURCE_EXECUTE: Record<string, BeforeDataSourceExecuteFunction> = {};

interface RegisterControllerParams<T extends ControllerData> {
  controller: ControllerStatic<T>;
  beforeExecute?: BeforeExecuteFunction<T>;
}

/**
 * registerController
 * @param id
 * @param controller
 */
export const registerController = <T extends ControllerData >(
  id: string | CONTROLLER_TYPE,
  params: RegisterControllerParams<T>,
): void => {
  if (CONTROLLER[id]) {
    throw new Error(`'conflict controller ${id}`);
  }
  CONTROLLER[id] = params.controller;
  if (params.beforeExecute) {
    BEFORE_EXECUTE[id] = params.beforeExecute;
  }
};

export const DATASOURCE_EXECUTE: Record<string, DataSourceExecute> = {};
export const DATASOURCE_POOL: Record<string, DataSourcePool> = {};

interface RegisterDataSourceParams {
  beforeDataSourceExecute?: BeforeDataSourceExecuteFunction;
  dataSourceExecute?: DataSourceExecute;
  dataSourcePool?: DataSourcePool;
}

/**
 * registerDataSource
 * @param id
 * @param params
 */
export const registerDataSource = (
  id: string | DATA_SOURCE_TYPE,
  params: RegisterDataSourceParams,
): void => {
  if (DATASOURCE_EXECUTE[id] || DATASOURCE_POOL[id] || BEFORE_DATASOURCE_EXECUTE[id]) {
    throw new Error(`'conflict datasource ${id}`);
  }
  if (params.dataSourceExecute) {
    DATASOURCE_EXECUTE[id] = params.dataSourceExecute;
  }
  if (params.dataSourcePool) {
    DATASOURCE_POOL[id] = params.dataSourcePool;
  }
  if (params.beforeDataSourceExecute) {
    BEFORE_DATASOURCE_EXECUTE[id] = params.beforeDataSourceExecute;
  }
};

/**
 * execute
 * auto create id
 * @param {ControllerData} data
 * @param {Context} context
 * @param {ExecuteConfigData} config
 * @returns {Promise<BaseController>} base step instance
 */
export const execute = async <T extends ControllerData>(
  data: T,
  context: Context,
  config: ExecuteConfigData,
  parentType?: CONTROLLER_TYPE,
): Promise<ControllerInstance> => {

  const dataAny = data as any;

  // 数据集存在情况处理
  if (data.type === CONTROLLER_TYPE.DATASET) {
    context.dataSetCountValue.isDataSet = true;
  }
  if (data.type === CONTROLLER_TYPE.DATASET_CASE) {
    context.dataSetCountValue.isCaseDataSet = true;
  }

  const Controller = CONTROLLER[data.type] || UnknownController;
  const extra: ControllerExtraConfig = {
    id: `${config.id ? `${config.id}_` : ''}${config.group !== undefined ? `${config.group}_` : ''}${config.index}`,
    parentId: config.id,
    group: config.group,
    deep: config.deep,
    index: config.index,
  };

  const instance = new Controller(data, context, extra);
  // if (instance instanceof BaseController) {
  try {
    const variableData = config.variable;

    /** @notice 步骤中需要独享的变量 运行前设置 */
    if (variableData) {
      const variable = instance.variable;
      Object.keys(variableData).forEach((key) => {
        variable.setLocal(key, variableData[key]);
      });
    }

    if (config.bypass === true) {
      if (data.type === CONTROLLER_TYPE.DATASET) {
        const maxCount = (dataAny.config?.maxCount ?? 0);
        const data = await createRows(dataAny, context.env.dataSource, maxCount);
        context.dataSetCountValue.dataSetTotal += data.rows.length;
      }
      if (data.type === CONTROLLER_TYPE.DATASET_CASE) {
        const data = await createRows(dataAny, context.env.dataSource, Infinity);
        const caseDataSetTotal = data.rows?.length ?? 0;
        const selectIndexList: number[] = dataAny.isSelectAll ?
          data.rows.map((_, index) => index) :
          (dataAny.selectIndexList ?? []);
        context.dataSetCountValue.caseDataSetTotal += caseDataSetTotal;
        context.dataSetCountValue.selectCaseDataSetTotal += selectIndexList.length;
      }
      instance.setStatus(CONTROLLER_STATUS.WAIT);
    } else {
      await instance.run(config.skip);
    }
  } catch (e) {
    instance.setError(e);
  }

  // 数据集失败情况处理
  if (instance.hasError()) {

  }

  return instance;
  // }
  // throw Error('system error');
};
