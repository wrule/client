/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { CombinationControllerData, ControllerData } from '@engine/core/types/data';
import { CONTROLLER_TYPE } from '@engine/core/enum';

// 元件步骤
export interface ComponentControllerParams {
  key: string;
  value: string;
}

export interface ComponentControllerReturns {
  /** internal variable name */
  key: string;
  /** public variable name */
  name: string;
}

export interface ComponentConfig {
}

export interface ComponentControllerData extends CombinationControllerData {
  type: CONTROLLER_TYPE.COMPONENT;
  steps: ControllerData[];
  params?: ComponentControllerParams[];
  returns?: ComponentControllerReturns[];
  config?: ComponentConfig;
}
