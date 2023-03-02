/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { BaseResult } from '@engine/core/types/result';
import { SingleControllerDetailResult } from '@engine/core/types/result/single';
import { CONTROLLER_TYPE } from '@engine/core/enum';

export interface TZTExtraResult {
  serverId?: string;
  serverName?: string;
  host?: string;
  port?: string;
  config?: {
    timeout?: number;
  };
}

export interface TZTDetailResult extends SingleControllerDetailResult {
  result?: Record<string, string>;
  data: Record<string, string | Buffer> | string;
}

export interface TZTResult extends BaseResult<TZTExtraResult> {
  type: CONTROLLER_TYPE.TZT;
}
