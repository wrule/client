/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { PollConfig } from '@plugin/poll/types/data';
import { Result, BaseResult, BaseDetailResult } from '@engine/core/types/result';
import { CONTROLLER_TYPE } from '@engine/core/enum';

export interface PollExtraResult {
  count?: number;
  maxCount: number | string;
  interval: number;
  result: boolean[];
  config?: PollConfig;
}

export interface PollDetailResult extends BaseDetailResult {

}

export interface PollResult extends BaseResult<PollExtraResult> {
  type: CONTROLLER_TYPE.POLL;
  steps: Result[][];
}
