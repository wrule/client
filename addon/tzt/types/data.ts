/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */

import { CONTROLLER_TYPE } from '@engine/core/enum';
import { SingleControllerData } from '@engine/core/types/data';

export interface TZTControllerData extends SingleControllerData {
  type: CONTROLLER_TYPE.TZT;
  serverId?: string;
  host?: string;
  port?: string | number;
  config?: {
    timeout?: number;
  };
  data: Record<string, string | Buffer> | string;
}
