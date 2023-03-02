/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { SingleControllerData } from '@engine/core/types/data';
import { CONTROLLER_TYPE } from '@engine/core/enum';

export interface BrowserControllerData extends SingleControllerData {
  readonly type: CONTROLLER_TYPE.BROWSER;
  readonly command: string;
  readonly config?: {
    /** 浏览器步骤比较消耗时间 超时间就默认1分钟 1000 * 60 */
    readonly timeout?: number;
  };
}
