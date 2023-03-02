/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { MetadataValue } from '@grpc/grpc-js';
import { BaseResult } from '@engine/core/types/result';
import { SingleControllerDetailResult } from '@engine/core/types/result/single';
import { CONTROLLER_TYPE } from '@engine/core/enum';
import { SocketInfo } from '@engine/utils/socket';

export interface GRPCExtraResult {
  host?: string;
  port?: string | number;
  tls?: boolean;
  // 状态码
  code?: number;
  /** 服务器名称 */
  serverName?: string;
  /** proto 文件名必填 */
  proto: string;
  /** 服务器ID */
  serverId: string;
  /** 服务名 */
  service: string;
  /** 包名 可以忽略 */
  package?: string;
  /** 方法名 */
  method: string;
  config?: {
    timeout?: number;
  };
  network?: SocketInfo;
  trace?: string;
}

export interface GRPCDetailResult extends SingleControllerDetailResult {
  request: {
    /** 一组KV数据 类似HTTP的头信息 */
    metadata?: Record<string, MetadataValue[]>;
    /** 发送数据 */
    message?: any;
  };
  response?: {
    /** 结果数据 */
    message?: any;
    metadata?: Record<string, MetadataValue[]>;
  };
}

export interface GRPCResult extends BaseResult<GRPCExtraResult> {
  type: CONTROLLER_TYPE.GRPC;
}
