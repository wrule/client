/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */

import { CombinationControllerData, ControllerData } from '@engine/core/types/data';
import { CONTROLLER_TYPE } from '@engine/core/enum';

export interface ConditionControllerData extends CombinationControllerData {
  type: CONTROLLER_TYPE.CONDITION;
  condition: string;
  steps: ControllerData[][];
}
