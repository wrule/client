/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { SingleControllerData } from '@engine/core/types/data';
import { CONTROLLER_TYPE } from '@engine/core/enum';

export interface SleepControllerData extends SingleControllerData {
  readonly type: CONTROLLER_TYPE.SLEEP;
  /** 等待多久 可以是变量 字符串也会尝试处理成数字 */
  readonly sleep: string | number;
}
