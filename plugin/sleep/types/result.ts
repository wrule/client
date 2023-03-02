/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { BaseResult } from '@engine/core/types/result';
import { SingleControllerDetailResult } from '@engine/core/types/result/single';
import { CONTROLLER_TYPE } from '@engine/core/enum';

export interface SleepExtraResult {
  sleep: string | number;
}

export interface SleepDetailResult extends SingleControllerDetailResult {

}

export interface SleepResult extends BaseResult<SleepExtraResult> {
  type: CONTROLLER_TYPE.SLEEP;
}
