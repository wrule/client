/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */

import { CONTROLLER_TYPE } from '@engine/core/enum';
import { CombinationControllerData, ControllerData } from '@engine/core/types/data';

export interface PollConfig {
  /** _index 变量更名 */
  indexVar?: string;
  /**
   * 遇到下列错误跳出轮询
   * 如果下层是组合步骤，会递归到底
   * @default SYSTEM_ERROR
   * PRE_ERROR = 1 << 1,
   * POST_ERROR = 1 << 2,
   * EXECUTE_ERROR = 1 << 3,
   * RESPONSE_ERROR = 1 << 4, // http 4xx dubbo exception 会用 ExecuteError 封装
   * ASSIGNMENT_ERROR = 1 << 5,
   * ASSERT_ERROR = 1 << 6,
   * SYSTEM_ERROR = 1 << 7,
   */
  breakError?: number;
}

export interface PollControllerData extends CombinationControllerData {
  type: CONTROLLER_TYPE.POLL;
  steps: ControllerData[];
  maxCount: string | number;
  interval: number;
  config?: PollConfig;
}
