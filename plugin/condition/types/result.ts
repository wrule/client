/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { Result, BaseResult, BaseDetailResult } from '@engine/core/types/result';
import { CONTROLLER_TYPE } from '@engine/core/enum';

interface ConditionControllerChildren {
  steps: Result[][];
}

export interface ConditionExtraResult {
  condition: string;
  result: boolean[];
}

export interface ConditionDetailResult extends BaseDetailResult {

}

export interface ConditionResult extends BaseResult<ConditionExtraResult>, ConditionControllerChildren {
  type: CONTROLLER_TYPE.CONDITION;
}
