/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { CombinationControllerData, ControllerData } from '@engine/core/types/data';
import { CONTROLLER_TYPE } from '@engine/core/enum';
import { DATASET_FIELDS_MODE } from '@engine/core/enum/data-set';
import { FileData } from '@engine/utils/file';

interface BaseFields {
  name: string;
  /** 字段获取方式 */
  mode: DATASET_FIELDS_MODE;
}

interface StaticFields extends BaseFields {
  mode: DATASET_FIELDS_MODE.STATIC;
  /** 当前字段的所有静态内容数组 */
  rows: string[];
}

interface CSVFields extends BaseFields {
  mode: DATASET_FIELDS_MODE.CSV;
  /** csv 中对应的字段的内容数组 */
  field: string;
}

interface DataSourceFields extends BaseFields {
  mode: DATASET_FIELDS_MODE.DATA_SOURCE;
  /** dataSource 中对应的字段 */
  field: string;
  required: boolean;
}

interface MockFields extends BaseFields {
  mode: DATASET_FIELDS_MODE.MOCK;
  /** mock 函数 */
  method: string;
}

export interface DataSetConfig {
  /** 忽略错误 */
  ignoreError?: boolean;
  /** 最大次数 */
  maxCount?: number;
  /** _index 变量更名 */
  indexVar?: string;
  /** 是否异步执行 会打乱顺序 因为单线程 */
  async?: boolean;
}

export type Fields = StaticFields | CSVFields | DataSourceFields | MockFields

export interface DataSourceConfig {
  command: string;
  serverId: string;
}

export interface DataSetControllerData extends CombinationControllerData {
  type: CONTROLLER_TYPE.DATASET_CASE;
  /** 数据源配置 */
  dataSource?: DataSourceConfig;
  csv?: FileData;
  steps: ControllerData[];
  /** 字段配置数组 */
  fields: Fields[];
  config?: DataSetConfig;
}
