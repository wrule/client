/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { SingleControllerDetailResult } from '@engine/core/types/result/single';
import { BaseResult } from '@engine/core/types/result';
import { CONTROLLER_TYPE } from '@engine/core/enum';
import { SocketInfo } from '@engine/utils/socket';

export interface RedisExtraResult {
  user?: string;
  host?: string;
  port?: number;
  database?: number;
  network?: SocketInfo;
  version?: string;
  serverName?: string;
  serverId: string;
}

export interface RedisDetailResult extends SingleControllerDetailResult {
  command: string;
  result?: any;
}

export interface RedisResult extends BaseResult<RedisExtraResult> {
  type: CONTROLLER_TYPE.REDIS;
}
