/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { LoopConfig } from '@plugin/loop/types/data';
import { Result, BaseResult, BaseDetailResult } from '@engine/core/types/result';
import { CONTROLLER_TYPE } from '@engine/core/enum';

export interface LoopExtraResult {
  count: string | number;
  result: boolean[];
  config?: LoopConfig;
}

export interface LoopDetailResult extends BaseDetailResult {
  // 如果循环变解析后是个数组，会原封不动给回来
  data: Record<string, unknown>[];
}

export interface LoopResult extends BaseResult<LoopExtraResult> {
  type: CONTROLLER_TYPE.LOOP;
  steps: Result[][];
}
