/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { BaseResult } from '@engine/core/types/result';
import { SingleControllerDetailResult } from '@engine/core/types/result/single';
import { CONTROLLER_TYPE } from '@engine/core/enum';
// import { SocketInfo } from '@engine/utils/socket';

export interface MongoDBExtraResult {
  user?: string;
  host?: string;
  port?: number;
  database?: string;
  // network?: SocketInfo;
  version?: string;
  serverName?: string;
  serverId: string;
}

export interface MongoDBDetailResult extends SingleControllerDetailResult {
  command: string;
  result?: any;
}

export interface MongoDBResult extends BaseResult<MongoDBExtraResult> {
  type: CONTROLLER_TYPE.MONGODB;
}
