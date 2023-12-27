/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { T3Body } from '@plugin/t3/types/data';
import { BaseResult } from '@engine/core/types/result';
import { T3Options } from '@engine/dispatch/types/server';
import { SingleControllerDetailResult } from '@engine/core/types/result/single';
import { CONTROLLER_TYPE } from '@engine/core/enum';
// import { SocketInfo } from '@engine/utils/socket';

export interface T3ExtraResult {
  functionNo: number;
  service: string;
  security: string;
  requestParams: string;
  shardingInfo: string;
  serverId: string;
  serverName?: string;
  options?: T3Options;
  config?: {
    timeout?: number;
  };
  // network?: SocketInfo;
}

export interface T3DetailResult extends SingleControllerDetailResult {
  result?: any;
  /** Error 只有 RESPONSE_ERROR 才有（服务端返回的业务或本身异常，不包含调用异常） */
  error?: {
    errcode: number;
    errmsg: string;
  };
  requestParams?: T3Body;
}

export interface T3Result extends BaseResult<T3ExtraResult> {
  type: CONTROLLER_TYPE.T3;
  data?: any;
}
