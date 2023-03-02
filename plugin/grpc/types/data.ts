/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */

import { CONTROLLER_TYPE } from '@engine/core/enum';
import { SingleControllerData } from '@engine/core/types/data';

export interface MetadataData {
  key: string;
  value: string;
}

export interface GRPCControllerData extends SingleControllerData {
  type: CONTROLLER_TYPE.GRPC;
  /** 一组KV数据 类似HTTP的头信息 选填 */
  metadata?: MetadataData[];
  /** 传输的数据 给string就行了 必须是JSON */
  message: string | any;
  /** proto 文件名必填 */
  proto: string;
  /** 选择一个服务器 必填 所有 proto 定义都绑在服务器上 */
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
}
