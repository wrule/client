/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { T2Body } from '@plugin/t2/types/data';
import { BaseResult } from '@engine/core/types/result';
import { T2Options } from '@engine/dispatch/types/server';
import { SingleControllerDetailResult } from '@engine/core/types/result/single';
import { CONTROLLER_TYPE } from '@engine/core/enum';
// import { SocketInfo } from '@engine/utils/socket';

export interface T2ExtraResult {
  functionNo: number;
  serverId: string;
  serverName?: string;
  options?: T2Options;
  config?: {
    timeout?: number;
  };
  // network?: SocketInfo;
}

export interface T2DetailResult extends SingleControllerDetailResult {
  result?: any;
  /** Error 只有 RESPONSE_ERROR 才有（服务端返回的业务或本身异常，不包含调用异常） */
  error?: {
    errcode: number;
    errmsg: string;
  };
  body?: T2Body;
}

export interface T2Result extends BaseResult<T2ExtraResult> {
  type: CONTROLLER_TYPE.T2;
  data?: any;
}
