/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { CombinationControllerData, ControllerData } from '@engine/core/types/data';
import { CONTROLLER_TYPE } from '@engine/core/enum';

export interface LoopConfig {
  /** _index 变量更名 */
  indexVar?: string;
  /** 异步执行 单线程 暂不开放 */
  async?: boolean;
  /** 忽略错误 */
  ignoreError?: boolean;
}

export interface LoopControllerData extends CombinationControllerData {
  type: CONTROLLER_TYPE.LOOP;
  steps: ControllerData[];
  config?: LoopConfig;
  /** 循环次数 支持变量 如果是个列表，取列表长度，并将列表内的字段 附给 变量名 */
  count?: string | number;
  /** 测试用 如果给了 data 取 data 优先级最高，包括循环次数 */
  data?: Record<string, unknown>[];
}
