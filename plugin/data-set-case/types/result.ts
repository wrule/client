/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { Fields, DataSetConfig } from '@plugin/data-set/types/data';
import { Result, BaseResult, BaseDetailResult } from '@engine/core/types/result';
import { CONTROLLER_TYPE } from '@engine/core/enum';

export interface DataSetExtraResult {
  result: (boolean | null)[];
  config?: DataSetConfig;
}

export interface DataSetDetailResult extends BaseDetailResult {
  fields: Fields[];
  rows: unknown[][];
  selectIndexList?: number[];
}

export interface DataSetResult extends BaseResult<DataSetExtraResult> {
  type: CONTROLLER_TYPE.DATASET_CASE;
  steps: Result[][];
}
